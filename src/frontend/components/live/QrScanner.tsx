"use client";
import { useEffect, useId, useRef, useState } from "react";
import { tokenFromScan } from "../../lib/qr";
import type { Html5Qrcode } from "html5-qrcode";
import { CameraLifecycle, ScanDelivery } from "./scanner-lifecycle";

type Camera = { id: string; label: string };
export type QrScannerProps = { onScan: (bookingToken: string) => void; onError?: (message: string) => void };
export function QrScanner({ onScan, onError }: QrScannerProps) {
  const id = `qr-${useId().replace(/:/g, "")}`;
  const scanner = useRef<Html5Qrcode | null>(null);
  const delivery = useRef(new ScanDelivery());
  const callbacks = useRef({ onScan, onError });
  useEffect(() => { callbacks.current = { onScan, onError }; }, [onScan, onError]);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [starting, setStarting] = useState(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const mounted = useRef(true);
  const lifecycle = useRef<CameraLifecycle | null>(null);
  const getLifecycle = (): CameraLifecycle => {
    if (!lifecycle.current || lifecycle.current.disposed) lifecycle.current = new CameraLifecycle((phase) => {
      if (!mounted.current) return;
      setStarting(phase === "starting" || phase === "stopping"); setActive(phase === "active");
    });
    return lifecycle.current;
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; lifecycle.current?.dispose(); };
  }, []);
  const report = (message: string): void => { if (!mounted.current) return; setError(message); callbacks.current.onError?.(message); };
  const accept = (value: string): void => {
    if (!mounted.current) return;
    try {
      const token = tokenFromScan(value);
      if (!delivery.current.deliver(token, callbacks.current.onScan)) return;
      void lifecycle.current?.stop().catch(() => report("Unable to stop the camera. Close this scanner to release it."));
      setError(""); setManual("");
    } catch (problem) { report(problem instanceof Error ? problem.message : "Invalid booking code"); }
  };
  const start = async (): Promise<void> => {
    const session = getLifecycle();
    setError("");
    try {
      await session.start(async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      const devices = await Html5Qrcode.getCameras();
      if (!mounted.current || session.disposed) throw new Error("Scanner closed");
      setCameras(devices);
      const selected = cameraId || devices.find((camera) => /back|rear|environment/i.test(camera.label))?.id || devices[0]?.id;
      if (!selected) throw new Error("No camera found. Enter the booking code below.");
      setCameraId(selected);
      const current = scanner.current ??= new Html5Qrcode(id);
      await current.start(selected, { fps: 10, qrbox: { width: 220, height: 220 } }, accept, () => {});
      return current;
      });
    } catch { report("Camera unavailable or permission denied. Allow camera access or enter the booking code below."); }
  };
  const stop = async (): Promise<void> => {
    await lifecycle.current?.stop().catch(() => report("Unable to stop the camera. Close this scanner to release it."));
  };
  return <section className="space-y-4 rounded-lg border bg-background p-4 text-foreground" aria-label="Vendor check-in scanner">
    <h2 className="font-serif text-xl">Scan vendor check-in</h2>
    <div id={id} className="min-h-16 overflow-hidden rounded-md" />
    {cameras.length > 0 && <label className="block space-y-2">Camera<select className="min-h-11 w-full rounded-md border bg-background px-3" value={cameraId} disabled={active || starting} onChange={(event) => setCameraId(event.target.value)}>{cameras.map((camera, index) => <option key={camera.id} value={camera.id}>{camera.label || `Camera ${index + 1}`}</option>)}</select></label>}
    <button type="button" className="min-h-11 w-full rounded-md bg-primary px-4 text-primary-foreground disabled:opacity-50" disabled={starting} onClick={() => { void (active ? stop() : start()); }}>{starting ? "Starting camera..." : active ? "Stop camera" : "Start camera"}</button>
    <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); accept(manual); }}>
      <label htmlFor={`${id}-manual`} className="block">Or enter the booking code</label>
      <input id={`${id}-manual`} value={manual} onChange={(event) => setManual(event.target.value)} className="min-h-11 w-full rounded-md border bg-background px-3" autoComplete="off" required />
      <button type="submit" className="min-h-11 w-full rounded-md border px-4">Check in vendor</button>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>;
}
export default QrScanner;
