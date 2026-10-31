import assert from "node:assert/strict";
import { CameraLifecycle, ScanDelivery, type CameraPhase } from "@/frontend/components/live/scanner-lifecycle";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const permission = deferred();
const phases: CameraPhase[] = [];
const camera = {
  isScanning: true,
  stops: 0,
  async stop() {
    this.stops++;
    this.isScanning = false;
  },
};
const lifecycle = new CameraLifecycle((phase) => phases.push(phase));
let starts = 0;
const create = async () => {
  starts++;
  await permission.promise;
  return camera;
};
const starting = lifecycle.start(create);
assert.equal(await lifecycle.start(create), false);
assert.equal(starts, 1);
const stopping = lifecycle.stop();
assert.equal(lifecycle.stop(), stopping);
permission.resolve();
assert.equal(await starting, false);
await stopping;
assert.equal(camera.stops, 1);
assert.equal(phases.includes("active"), false);

const unmountPermission = deferred();
const unmountedPhases: CameraPhase[] = [];
const unmountCamera = {
  isScanning: true,
  stops: 0,
  async stop() {
    this.stops++;
    this.isScanning = false;
  },
};
const unmounted = new CameraLifecycle((phase) => unmountedPhases.push(phase));
const unfinished = unmounted.start(async () => {
  await unmountPermission.promise;
  return unmountCamera;
});
unmounted.dispose();
unmountPermission.resolve();
await unfinished;
await unmounted.stop();
assert.equal(unmountCamera.stops, 1);
assert.deepEqual(unmountedPhases, ["starting"]);
assert.equal(await unmounted.start(create), false);

let fails = true;
const retryCamera = {
  isScanning: true,
  async stop() {
    if (fails) throw new Error("Busy");
    this.isScanning = false;
  },
};
const retryLifecycle = new CameraLifecycle(() => {});
await retryLifecycle.start(async () => retryCamera);
await assert.rejects(retryLifecycle.stop());
assert.equal(await retryLifecycle.start(create), false);
fails = false;
await retryLifecycle.stop();

const delivery = new ScanDelivery();
let submitted = 0;
const submit = () => {
  submitted++;
};
assert.equal(delivery.deliver("first", submit), true);
assert.equal(delivery.deliver("first", submit), false);
assert.equal(delivery.deliver("second", submit), true);
assert.equal(submitted, 2);
assert.throws(() =>
  delivery.deliver("retry", () => {
    throw new Error("Failed");
  }),
);
assert.equal(delivery.deliver("retry", submit), true);
console.log("Scanner lifecycle: double start, stop during permission, unmount and duplicate manual delivery passed");
