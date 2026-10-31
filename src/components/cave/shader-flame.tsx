"use client";

import { useEffect, useRef, useState } from "react";

/** Shared with the cave loop: how far the flame leans (-1 … 1) while the diya is carried. */
export const flameState = { lean: 0 };

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

// Procedural candle/diya flame: a teardrop silhouette distorted by rising fractal noise.
// Colour runs white-yellow core → orange body → deep red edge, with a faint blue at the base.
const FRAG = `
precision mediump float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_lean;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / u_res;          // (0,0) bottom-left
  vec2 p = vec2(uv.x - 0.5, uv.y - 0.04);      // base of the flame near the bottom
  float t = u_time;

  // lean: the top bends more than the base (like a flame dragged through air)
  p.x -= u_lean * p.y * p.y * 0.9;
  // rising turbulence — stronger towards the tip
  float n = fbm(vec2(p.x * 5.0, p.y * 3.2 - t * 2.6));
  p.x += (n - 0.5) * 0.16 * smoothstep(0.0, 0.8, p.y);
  float h = p.y / 0.9;                          // 0 at base, 1 at tip

  // teardrop width profile: round belly, narrow licking tip
  // round belly low down (sqrt of a short ramp), long taper to the tip
  float w = 0.44 * sqrt(smoothstep(-0.16, 0.16, h)) * pow(clamp(1.0 - h, 0.0, 1.0), 1.25) + 0.01;
  float d = abs(p.x) / w;
  // rounded bottom: fade the base out with a soft curve instead of a hard cut
  float body = smoothstep(1.0, 0.0, d) * smoothstep(-0.07, 0.03, h - 0.12 * d * d);
  // break up the tip with noise so it flickers and licks
  float tip = smoothstep(0.0, 0.25, 1.0 - h + (fbm(vec2(p.x * 6.0, h * 4.0 - t * 3.4)) - 0.5) * 0.3);
  float I = pow(clamp(body * tip, 0.0, 1.0), 0.7);

  vec3 col = mix(vec3(0.70, 0.12, 0.02), vec3(1.0, 0.52, 0.10), smoothstep(0.05, 0.45, I));
  col = mix(col, vec3(1.0, 0.86, 0.45), smoothstep(0.45, 0.8, I));
  col = mix(col, vec3(1.0, 0.98, 0.92), smoothstep(0.8, 1.0, I) * smoothstep(0.75, 0.2, h));
  // faint blue where the flame meets the wick
  col = mix(col, vec3(0.35, 0.45, 1.0), smoothstep(0.16, 0.0, h) * smoothstep(0.2, 0.9, d) * 0.6);

  // faint outer glow hugging the flame
  float glow = 0.22 * exp(-d * 1.6) * smoothstep(1.0, 0.1, h) * step(-0.05, h);
  // fade everything out near the canvas edges so the glow never shows a box
  float edge = smoothstep(0.0, 0.08, uv.y) * smoothstep(0.0, 0.12, uv.x) * smoothstep(0.0, 0.12, 1.0 - uv.x) * smoothstep(0.0, 0.05, 1.0 - uv.y);
  glow *= edge;
  float a = clamp(I * 1.4 * edge + glow, 0.0, 1.0);
  col = mix(vec3(1.0, 0.55, 0.15), col, clamp(I * 1.4 * edge, 0.0, 1.0) / max(a, 0.001));
  gl_FragColor = vec4(col * a, a);              // premultiplied alpha
}`;

/** Live WebGL flame. Renders nothing (returns false via onFail) if WebGL isn't available. */
export function ShaderFlame({ className, fallback }: { className?: string; fallback: React.ReactNode }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = ref.current!;
    const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) return setFailed(true);

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      return s;
    };
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
    } catch {
      return setFailed(true);
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uLean = gl.getUniformLocation(prog, "u_lean");

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    gl.clearColor(0, 0, 0, 0);

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let lean = 0;
    const start = performance.now();
    const frame = (now: number) => {
      lean += (flameState.lean - lean) * 0.15; // smooth so the flame sways rather than snaps
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, reduce ? 1.0 : (now - start) / 1000);
      gl.uniform1f(uLean, lean);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    // No loseContext() here: dev mode re-runs effects on the same canvas, and the context is
    // released with the canvas when the diya unmounts.
    return () => cancelAnimationFrame(raf);
  }, []);

  if (failed) return <>{fallback}</>;
  return <canvas ref={ref} className={className} aria-hidden />;
}
