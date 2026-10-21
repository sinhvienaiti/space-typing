import * as THREE from "three";

/**
 * The Rift Defense camera (V4 §10): it orbits a point on the ground. Right
 * drag turns and tilts it, the wheel zooms, middle drag (or Shift + left
 * drag) moves the point; the page adds buttons and build-phase keys. It
 * eases toward what was asked, so every move is smooth, and never leaves
 * the island or goes under 30° or over 85°.
 */
export type CameraView = { target: readonly [number, number]; yaw: number; distance: number };

const MIN_PITCH = THREE.MathUtils.degToRad(30);
const MAX_PITCH = THREE.MathUtils.degToRad(85);
const DEFAULT_PITCH = THREE.MathUtils.degToRad(57);

export class DefenseCamera {
  /** What it eases toward. */
  yaw = 0;
  pitch = DEFAULT_PITCH;
  distance = 80;
  readonly target = new THREE.Vector3();
  /** Where it is now. */
  private yawNow = 0;
  private pitchNow = DEFAULT_PITCH;
  private distanceNow = 80;
  private readonly targetNow = new THREE.Vector3();
  private home: CameraView = { target: [0, 0], yaw: 0, distance: 80 };
  private drag: { mode: "turn" | "pan"; x: number; y: number; moved: number } | null = null;
  shake = 0;
  /** Pixels a press moved (a click below a few pixels is a pick, not a drag). */
  lastDrag = 0;
  minDistance = 24;
  maxDistance = 112;
  bound = 32;

  constructor(private readonly camera: THREE.PerspectiveCamera, private readonly element: HTMLElement) {
    element.addEventListener("contextmenu", (event) => event.preventDefault());
    element.addEventListener("pointerdown", (event) => {
      const pan = event.button === 1 || (event.button === 0 && event.shiftKey);
      const turn = event.button === 2;
      if (!pan && !turn) return;
      this.drag = { mode: pan ? "pan" : "turn", x: event.clientX, y: event.clientY, moved: 0 };
      element.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    element.addEventListener("pointermove", (event) => {
      const drag = this.drag;
      if (drag === null) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.mode === "turn") {
        this.yaw -= dx * 0.006;
        this.pitch = THREE.MathUtils.clamp(this.pitch + dy * 0.005, MIN_PITCH, MAX_PITCH);
      } else {
        // Move the ground point with the pointer, at a speed that suits the zoom.
        const scale = this.distance * 0.0016;
        this.pan(-dx * scale, -dy * scale);
      }
    });
    const end = (event: PointerEvent): void => {
      if (this.drag === null) return;
      this.lastDrag = this.drag.moved;
      this.drag = null;
      if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
    };
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
    element.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        this.zoom(Math.exp(event.deltaY * (event.ctrlKey ? 0.01 : 0.0012)));
      },
      { passive: false },
    );
    element.addEventListener("dblclick", (event) => {
      if (event.button === 1) this.reset();
    });
  }

  get dragging(): boolean {
    return this.drag !== null;
  }

  /** The map's default view; `snap` jumps there at once. */
  setHome(view: CameraView, snap: boolean): void {
    this.home = view;
    this.reset();
    if (snap) {
      this.yawNow = this.yaw;
      this.pitchNow = this.pitch;
      this.distanceNow = this.distance;
      this.targetNow.copy(this.target);
    }
  }

  reset(): void {
    this.yaw = this.home.yaw;
    this.pitch = DEFAULT_PITCH;
    this.distance = this.home.distance;
    this.target.set(this.home.target[0], 0, this.home.target[1]);
  }

  turn(radians: number): void {
    this.yaw += radians;
  }

  tilt(radians: number): void {
    this.pitch = THREE.MathUtils.clamp(this.pitch + radians, MIN_PITCH, MAX_PITCH);
  }

  zoom(factor: number): void {
    this.distance = THREE.MathUtils.clamp(this.distance * factor, this.minDistance, this.maxDistance);
  }

  /** Moves the ground point: `right` and `forward` in metres as seen from the camera. */
  pan(right: number, forward: number): void {
    const cos = Math.cos(this.yaw);
    const sin = Math.sin(this.yaw);
    this.target.x += right * cos + forward * sin;
    this.target.z += -right * sin + forward * cos;
    const length = Math.hypot(this.target.x, this.target.z);
    if (length > this.bound) this.target.multiplyScalar(this.bound / length);
  }

  /** The angle from the target to the camera on the ground (for things that face it). */
  get facing(): number {
    return this.yawNow;
  }

  update(dt: number): void {
    const k = 1 - Math.exp(-dt * 9);
    this.yawNow += (this.yaw - this.yawNow) * k;
    this.pitchNow += (this.pitch - this.pitchNow) * k;
    this.distanceNow += (this.distance - this.distanceNow) * k;
    this.targetNow.lerp(this.target, k);
    const flat = Math.cos(this.pitchNow) * this.distanceNow;
    this.camera.position.set(
      this.targetNow.x + Math.sin(this.yawNow) * flat,
      Math.sin(this.pitchNow) * this.distanceNow,
      this.targetNow.z + Math.cos(this.yawNow) * flat,
    );
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const amount = this.shake * this.shake * 0.9;
    if (amount > 0) this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount));
    this.camera.lookAt(this.targetNow.x, 0, this.targetNow.z);
  }
}
