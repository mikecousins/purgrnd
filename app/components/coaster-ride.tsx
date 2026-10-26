import { useEffect, useRef } from "react";

/**
 * The rollercoaster theme's backdrop: a first-person ride along a track that climbs and crashes
 * like a volatile stock chart, under a dusk sky with a candlestick chart for a skyline. The rails
 * glow green on the way up and red on the way down. It's drawn on a canvas, frame by frame; with
 * reduced motion on, it shows a single still frame instead.
 *
 * The world is in metres: z runs forward along the track, y up from the ground, x sideways.
 */
export function CoasterRide() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const ride = new Ride();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      // Capped so a big retina screen doesn't spend its frames on pixels nobody can see in motion.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      ride.draw(ctx, canvas.width, canvas.height);
    };

    const tick = (now: number) => {
      // Capped so coming back to a background tab doesn't teleport the car.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      ride.step(dt);
      ride.draw(ctx, canvas.width, canvas.height);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (reducedMotion.matches) {
        ride.draw(ctx, canvas.width, canvas.height);
      } else {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    start();
    reducedMotion.addEventListener("change", start);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      reducedMotion.removeEventListener("change", start);
    };
  }, []);

  return (
    <div aria-hidden="true" className="coaster-sky pointer-events-none absolute inset-0">
      <canvas ref={canvasRef} className="size-full" />
      {/* Darkens the middle of the ride, so the numbers on top stay readable. */}
      <div className="coaster-vignette absolute inset-0" />
    </div>
  );
}

const UP = [52, 245, 160] as const;
const DOWN = [255, 84, 112] as const;
const HORIZON = [255, 138, 91] as const;

const GAUGE = 1.4; // between the rails
const EYE = 1.5; // the rider's eye, above the track
const NEAR = 0.6; // anything closer than this to the eye is clipped
const FAR = 320; // how far ahead the track is drawn
const SPACING = 34; // between the track's control points
const TIE_SPACING = 1.6;
const SUPPORT_SPACING = 14;
const GRID = 24; // the ground grid's squares

const G = 9.8;
const LIFT_SPEED = 9; // the chain lift pulls the car up every climb at this speed
const DRAG = 0.0035; // air and wheels, against the square of the speed

type Rgb = readonly [number, number, number];

class Ride {
  /** The track's height at every SPACING metres: a mean-reverting random walk with crashes and rallies. */
  private heights: number[] = [22, 18, 26];
  /** A candlestick chart for the skyline: [open, close, low, high], as heights above the horizon. */
  private candles = makeCandles(90);
  /** How far along the track the car is. */
  private s = SPACING;
  private speed = LIFT_SPEED;
  private pitch = 0;
  private roll = 0;
  private time = 0;

  step(dt: number) {
    this.time += dt;
    const slope = this.slope(this.s);
    // Gravity along the track, less drag; the chain lift keeps the car moving uphill.
    this.speed += (-G * Math.sin(Math.atan(slope)) - DRAG * this.speed * this.speed) * dt;
    this.speed = Math.max(this.speed, LIFT_SPEED);
    this.s += this.speed * dt;

    // The view follows the track a little ahead and eases into it, rather than snapping.
    const ease = 1 - Math.exp(-dt * 6);
    this.pitch += (Math.atan(this.slope(this.s + 4)) - this.pitch) * ease;
    // Bank into the turns, harder the faster the car goes.
    const bank = clamp((-this.curvature(this.s + 4) * this.speed * this.speed) / G, -0.4, 0.4);
    this.roll += (bank - this.roll) * ease;
  }

  draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (!w || !h) return;
    const f = Math.max(w, h) * 0.62; // focal length, in pixels
    // A rumble that grows with speed.
    const shake = Math.min(this.speed / 40, 1) * h * 0.0025;
    const camera: Camera = {
      x: this.x(this.s),
      y: this.height(this.s) + EYE + Math.sin(this.time * 37) * 0.02,
      z: this.s,
      yaw: Math.atan(this.dx(this.s + 6)),
      pitch: this.pitch,
      f,
    };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2 + Math.sin(this.time * 29) * shake);
    ctx.rotate(this.roll);

    const span = Math.hypot(w, h); // anything this big covers the screen at any roll
    const horizon = f * Math.tan(camera.pitch);
    this.drawSky(ctx, span, horizon, h);
    this.drawSkyline(ctx, camera, w);
    this.drawGround(ctx, camera, span, horizon);
    this.drawTrack(ctx, camera);
  }

  private drawSky(ctx: CanvasRenderingContext2D, span: number, horizon: number, h: number) {
    const sky = ctx.createLinearGradient(0, horizon - h * 1.1, 0, horizon);
    sky.addColorStop(0, "#090b22");
    sky.addColorStop(0.55, "#2a1650");
    sky.addColorStop(0.85, "#7a2c62");
    sky.addColorStop(1, rgb(HORIZON));
    ctx.fillStyle = sky;
    ctx.fillRect(-span, -span, span * 2, horizon + span);

    // A low sun, sinking into the horizon.
    const sun = ctx.createRadialGradient(0, horizon, 0, 0, horizon, h * 0.45);
    sun.addColorStop(0, "rgb(255 200 120 / 0.55)");
    sun.addColorStop(1, "rgb(255 138 91 / 0)");
    ctx.fillStyle = sun;
    ctx.fillRect(-span, horizon - h * 0.45, span * 2, h * 0.45);
  }

  /** The skyline: a translucent candlestick chart standing on the horizon, as far off as the sun. */
  private drawSkyline(ctx: CanvasRenderingContext2D, camera: Camera, w: number) {
    const { f, yaw, pitch } = camera;
    const step = 0.026; // radians between candles
    const start = -(this.candles.length * step) / 2;
    const width = Math.max(2, f * step * 0.55);
    for (let i = 0; i < this.candles.length; i++) {
      const angle = start + i * step - yaw;
      if (Math.abs(angle) > 1.2) continue;
      const x = f * Math.tan(angle);
      if (Math.abs(x) > w) continue;
      const [open, close, low, high] = this.candles[i];
      const y = (elevation: number) => -f * Math.tan(elevation - pitch);
      const color = close >= open ? UP : DOWN;
      ctx.fillStyle = rgb(color, 0.22);
      ctx.fillRect(x - 0.6, y(high), 1.2, y(low) - y(high));
      ctx.fillStyle = rgb(color, 0.32);
      const top = y(Math.max(open, close));
      ctx.fillRect(x - width / 2, top, width, Math.max(1, y(Math.min(open, close)) - top));
    }
  }

  private drawGround(ctx: CanvasRenderingContext2D, camera: Camera, span: number, horizon: number) {
    const ground = ctx.createLinearGradient(0, horizon, 0, horizon + span * 0.5);
    ground.addColorStop(0, "#2a1530");
    ground.addColorStop(0.08, "#100b1f");
    ground.addColorStop(1, "#05060e");
    ctx.fillStyle = ground;
    ctx.fillRect(-span, horizon, span * 2, span * 2);

    // A chart's grid, laid flat on the ground.
    ctx.lineWidth = 1;
    const z0 = Math.floor(camera.z / GRID) * GRID;
    const x0 = Math.round(camera.x / GRID) * GRID;
    const reach = FAR * 1.2;
    for (let z = z0 + GRID; z < camera.z + reach; z += GRID) {
      ctx.strokeStyle = rgb([120, 90, 220], 0.28 * fog(z - camera.z, reach));
      line(ctx, camera, [x0 - reach, 0, z], [x0 + reach, 0, z]);
    }
    for (let x = x0 - reach; x <= x0 + reach; x += GRID) {
      ctx.strokeStyle = rgb([120, 90, 220], 0.16);
      line(ctx, camera, [x, 0, camera.z], [x, 0, camera.z + reach]);
    }
    // Haze where the ground meets the sky.
    const haze = ctx.createLinearGradient(0, horizon - 2, 0, horizon + 40);
    haze.addColorStop(0, rgb(HORIZON, 0.5));
    haze.addColorStop(1, rgb(HORIZON, 0));
    ctx.fillStyle = haze;
    ctx.fillRect(-span, horizon - 2, span * 2, 42);
  }

  /** The track ahead, drawn back to front so the near parts cover the far ones. */
  private drawTrack(ctx: CanvasRenderingContext2D, camera: Camera) {
    // Any closer and the track is under the rider's seat, off the bottom of the screen.
    const start = camera.z + 2;
    // Samples get further apart in the distance, where they're smaller on screen.
    const zs: number[] = [];
    for (let z = start; z < camera.z + FAR; z += Math.max(0.8, (z - camera.z) * 0.035)) zs.push(z);

    // Butt ends, so the see-through glow doesn't double up where segments meet.
    ctx.lineCap = "butt";
    for (let i = zs.length - 1; i > 0; i--) {
      const za = zs[i - 1];
      const zb = zs[i];
      const distance = za - camera.z;
      const alpha = fog(distance, FAR);

      // Supports, down to the ground: a pair of legs, splayed out, with a brace across them.
      for (let z = Math.ceil(za / SUPPORT_SPACING) * SUPPORT_SPACING; z < zb; z += SUPPORT_SPACING) {
        const y = this.height(z);
        // Close up, a leg would fill the screen; the track's too low here to need one.
        if (y < 1 || z - camera.z < 8) continue;
        const x = this.x(z);
        const spread = GAUGE / 2 + y * 0.12;
        ctx.strokeStyle = rgb([70, 80, 130], 0.85 * alpha);
        ctx.lineWidth = Math.max(1, (0.25 * camera.f) / distance);
        line(ctx, camera, [x - GAUGE / 2, y, z], [x - spread, 0, z]);
        line(ctx, camera, [x + GAUGE / 2, y, z], [x + spread, 0, z]);
        const brace = y * 0.45;
        const braceSpread = GAUGE / 2 + (y - brace) * 0.12;
        line(ctx, camera, [x - braceSpread, brace, z], [x + braceSpread, brace, z]);
      }

      // Ties across the rails, close up only: further off they'd blur into a solid band.
      if (distance < 90) {
        for (let z = Math.ceil(za / TIE_SPACING) * TIE_SPACING; z < zb; z += TIE_SPACING) {
          const y = this.height(z) - 0.12;
          const x = this.x(z);
          ctx.strokeStyle = rgb([95, 90, 150], 0.8 * alpha);
          ctx.lineWidth = Math.max(1, (0.1 * camera.f) / (z - camera.z));
          line(ctx, camera, [x - GAUGE * 0.7, y, z], [x + GAUGE * 0.7, y, z]);
        }
      }

      // The rails, coloured by which way the market's heading.
      const ya = this.height(za);
      const yb = this.height(zb);
      const xa = this.x(za);
      const xb = this.x(zb);
      const trend = clamp(((yb - ya) / (zb - za)) * 4, -1, 1);
      const color = mix([255, 214, 120], trend > 0 ? UP : DOWN, Math.abs(trend));
      // Capped, so the rails right under the car don't swell into great slabs.
      const width = Math.min((0.08 * camera.f) / distance, 14);
      for (const side of [-1, 1]) {
        const a: Vec = [xa + (side * GAUGE) / 2, ya, za];
        const b: Vec = [xb + (side * GAUGE) / 2, yb, zb];
        // A soft glow, then the bright rail on top.
        ctx.strokeStyle = rgb(color, 0.2 * alpha);
        ctx.lineWidth = Math.max(3, width * 2.5);
        line(ctx, camera, a, b);
        ctx.strokeStyle = rgb(color, alpha);
        ctx.lineWidth = Math.max(1.2, width);
        line(ctx, camera, a, b);
      }
    }
  }

  /** The track's height at z. */
  height(z: number) {
    const t = z / SPACING;
    const i = Math.floor(t);
    while (this.heights.length < i + 4) this.heights.push(nextHeight(this.heights.at(-1)!));
    const [p0, p1, p2, p3] = [i - 1, i, i + 1, i + 2].map((j) => this.heights[Math.max(j, 0)]);
    const u = t - i;
    // Catmull-Rom: a smooth curve through the points, so the slope never jumps.
    const height =
      0.5 *
      (2 * p1 +
        (-p0 + p2) * u +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u +
        (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
    return Math.max(height, 0.4);
  }

  private slope(z: number) {
    return this.height(z + 0.5) - this.height(z - 0.5);
  }

  /** The track winds gently from side to side. */
  private x(z: number) {
    return Math.sin(z / 190) * 30 + Math.sin(z / 83 + 2) * 12;
  }

  private dx(z: number) {
    return this.x(z + 0.5) - this.x(z - 0.5);
  }

  private curvature(z: number) {
    return this.x(z + 1) - 2 * this.x(z) + this.x(z - 1);
  }
}

/** The next control point: mostly drift, sometimes a crash or a rally, always pulled back to the middle. */
function nextHeight(previous: number) {
  const roll = Math.random();
  let change = (Math.random() - 0.5) * 18;
  if (roll < 0.14) change = -(18 + Math.random() * 24);
  else if (roll < 0.26) change = 14 + Math.random() * 18;
  change += (30 - previous) * 0.25;
  return clamp(previous + change, 3, 62);
}

/** A random walk of candles, as elevations (radians) above the horizon. */
function makeCandles(count: number) {
  const candles: [number, number, number, number][] = [];
  let price = 0.12;
  for (let i = 0; i < count; i++) {
    const open = price;
    price = clamp(price + (Math.random() - 0.48) * 0.04 + (0.12 - price) * 0.05, 0.02, 0.26);
    const close = price;
    const low = Math.max(0.005, Math.min(open, close) - Math.random() * 0.02);
    const high = Math.max(open, close) + Math.random() * 0.02;
    candles.push([open, close, low, high]);
  }
  return candles;
}

type Vec = [number, number, number];

type Camera = { x: number; y: number; z: number; yaw: number; pitch: number; f: number };

/** Draws a straight line in the world, clipped to what's in front of the eye. */
function line(ctx: CanvasRenderingContext2D, camera: Camera, a: Vec, b: Vec) {
  let p = toView(camera, a);
  let q = toView(camera, b);
  if (p[2] < NEAR && q[2] < NEAR) return;
  if (p[2] < NEAR) p = clipToNear(q, p);
  else if (q[2] < NEAR) q = clipToNear(p, q);
  ctx.beginPath();
  ctx.moveTo((p[0] / p[2]) * camera.f, (-p[1] / p[2]) * camera.f);
  ctx.lineTo((q[0] / q[2]) * camera.f, (-q[1] / q[2]) * camera.f);
  ctx.stroke();
}

/** A world point in the rider's view: x right, y up, z straight ahead. */
function toView(camera: Camera, [x, y, z]: Vec): Vec {
  const dx = x - camera.x;
  const dy = y - camera.y;
  const dz = z - camera.z;
  const cosYaw = Math.cos(camera.yaw);
  const sinYaw = Math.sin(camera.yaw);
  const x1 = dx * cosYaw - dz * sinYaw;
  const z1 = dx * sinYaw + dz * cosYaw;
  const cosPitch = Math.cos(camera.pitch);
  const sinPitch = Math.sin(camera.pitch);
  return [x1, dy * cosPitch - z1 * sinPitch, dy * sinPitch + z1 * cosPitch];
}

/** The point where the line from `inside` to `outside` crosses the near plane. */
function clipToNear(inside: Vec, outside: Vec): Vec {
  const t = (inside[2] - NEAR) / (inside[2] - outside[2]);
  return [
    inside[0] + (outside[0] - inside[0]) * t,
    inside[1] + (outside[1] - inside[1]) * t,
    NEAR,
  ];
}

/** Fades things out into the haze as they get further away. */
function fog(distance: number, far: number) {
  return clamp(1 - distance / far, 0, 1) ** 0.7;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function rgb([r, g, b]: Rgb, alpha = 1) {
  return `rgb(${r | 0} ${g | 0} ${b | 0} / ${alpha})`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
