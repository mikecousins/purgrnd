/**
 * The paper theme's backdrop: cut-paper clouds along the top, soft bands across the sky, and
 * snow-capped mountains and rolling hills along the bottom, each layer casting a shadow on the
 * one behind it.
 */
export function PaperScenery({ landscape = true }: { landscape?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <Sky />
      <Birds />
      <Clouds />
      {landscape && <Landscape />}
    </div>
  );
}

const SHADOW = "#5a1914";

/** A drop shadow for a paper layer; `dy` < 0 casts it upward, onto the layer behind. */
function PaperShadow({
  id,
  dy,
  blur = 6,
  opacity = 0.3,
}: {
  id: string;
  dy: number;
  blur?: number;
  opacity?: number;
}) {
  return (
    <filter id={id} x="-10%" y="-50%" width="120%" height="200%">
      <feDropShadow dx="0" dy={dy} stdDeviation={blur} floodColor={SHADOW} floodOpacity={opacity} />
    </filter>
  );
}

function Sky() {
  return (
    <svg viewBox="0 0 1600 1000" preserveAspectRatio="none" className="absolute inset-0 size-full">
      <defs>
        <PaperShadow id="sky-shadow" dy={-3} blur={10} opacity={0.18} />
      </defs>
      <g filter="url(#sky-shadow)">
        <path d="M0 330 C 300 230 650 250 950 360 S 1400 470 1600 400 V1000 H0 Z" fill="#ffa08b" />
        <path d="M0 520 C 350 440 700 470 1000 560 S 1400 620 1600 560 V1000 H0 Z" fill="#fd8e79" />
      </g>
    </svg>
  );
}

function Birds() {
  return (
    <svg
      viewBox="0 0 220 120"
      className="absolute top-[17%] right-[6%] w-[clamp(90px,14vw,220px)] opacity-90"
      fill="none"
      stroke="#fff6ee"
      strokeWidth="5"
      strokeLinecap="round"
    >
      <path d="M10 30 Q 40 18 58 44 Q 80 22 112 30" />
      <path d="M150 70 Q 168 62 180 80 Q 194 64 212 66" strokeWidth="4" />
      <path d="M60 104 Q 72 98 80 110 Q 90 98 104 100" strokeWidth="3.5" />
    </svg>
  );
}

// Each cloud bank is a row of overlapping circles hanging from the top edge. The SVG is anchored at
// its bottom, so on a wide screen it's the solid top that gets cropped, never the scalloped edge.
const BACK_CLOUDS: [number, number, number][] = [
  [40, 60, 85],
  [170, 80, 75],
  [300, 50, 90],
  [430, 85, 75],
  [560, 60, 85],
  [690, 90, 72],
  [820, 55, 90],
  [950, 82, 75],
  [1080, 60, 85],
  [1210, 88, 74],
  [1340, 55, 88],
  [1470, 82, 76],
  [1590, 60, 85],
];
const FRONT_CLOUDS: [number, number, number][] = [
  [-10, 40, 70],
  [100, 55, 60],
  [210, 30, 70],
  [330, 60, 62],
  [450, 35, 70],
  [575, 58, 60],
  [700, 30, 72],
  [830, 55, 60],
  [950, 38, 70],
  [1070, 60, 62],
  [1190, 32, 70],
  [1310, 56, 60],
  [1430, 36, 70],
  [1550, 55, 62],
  [1640, 35, 70],
];

function Clouds() {
  return (
    <svg
      viewBox="0 0 1600 200"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 top-0 h-[clamp(64px,13vh,140px)] w-full"
    >
      <defs>
        <PaperShadow id="cloud-shadow" dy={6} blur={7} opacity={0.3} />
      </defs>
      <g filter="url(#cloud-shadow)" fill="#e9e3e1">
        {BACK_CLOUDS.map(([cx, cy, r]) => (
          <circle key={cx} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <g filter="url(#cloud-shadow)" fill="#f8f5f3">
        <rect width="1600" height="100" />
        {FRONT_CLOUDS.map(([cx, cy, r]) => (
          <circle key={cx} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}

// [x, peak, half-width, snow depth]. The art is extra wide so a wide, short screen crops its sides
// rather than the mountain tops.
type Peak = [number, number, number, number?];
const FAR_PEAKS: Peak[] = [
  [150, 110, 200],
  [630, 40, 210, 70],
  [960, 95, 190, 55],
  [1340, 150, 230],
  [1730, 60, 230, 65],
  [1960, 130, 170],
  [2250, 70, 220, 60],
];
const NEAR_PEAKS: Peak[] = [
  [300, 180, 180],
  [460, 170, 170],
  [1180, 150, 180, 40],
  [1530, 185, 200],
  [2100, 175, 190],
];

function Landscape() {
  return (
    <svg
      viewBox="0 0 2400 420"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 bottom-0 h-[clamp(150px,34vh,400px)] w-full max-sm:h-[46vh]"
    >
      <defs>
        <PaperShadow id="land-shadow" dy={-4} blur={7} opacity={0.3} />
      </defs>

      <g filter="url(#land-shadow)">
        {FAR_PEAKS.map(([x, peak, width, snow]) => (
          <Mountain
            key={x}
            x={x}
            peak={peak}
            base={330}
            width={width}
            snow={snow}
            fill="#0c3c58"
            shade="#082f47"
          />
        ))}
      </g>

      <g filter="url(#land-shadow)">
        {NEAR_PEAKS.map(([x, peak, width, snow]) => (
          <Mountain
            key={x}
            x={x}
            peak={peak}
            base={340}
            width={width}
            snow={snow}
            fill="#0f5573"
            shade="#0b4660"
          />
        ))}
      </g>

      <g filter="url(#land-shadow)" fill="#0f7476">
        <path d="M0 300 C 250 270 480 285 700 300 S 1150 270 1400 285 S 1850 300 2100 285 S 2350 290 2400 295 V420 H0 Z" />
        <Pine x={240} base={296} height={110} />
        <Pine x={780} base={300} height={150} />
        <Pine x={1585} base={290} height={95} />
        <Pine x={1640} base={292} height={120} />
        <House x={1780} base={292} />
        <Poplar x={1900} base={295} height={120} />
        <Poplar x={1945} base={298} height={90} />
        <Pine x={2230} base={288} height={130} />
      </g>

      <g filter="url(#land-shadow)">
        <path
          d="M0 340 C 300 315 600 318 900 335 S 1450 320 1700 330 S 2200 345 2400 335 V420 H0 Z"
          fill="#17b7a6"
        />
      </g>

      <g filter="url(#land-shadow)">
        <path
          d="M0 375 C 350 355 750 365 1100 380 S 1800 360 2100 372 S 2350 378 2400 374 V420 H0 Z"
          fill="#1ed3bf"
        />
      </g>
    </svg>
  );
}

/** A mountain with a darker right face and, optionally, a jagged snow cap `snow` units deep. */
function Mountain({
  x,
  peak,
  base,
  width,
  fill,
  shade,
  snow,
}: {
  x: number;
  peak: number;
  base: number;
  width: number;
  fill: string;
  shade: string;
  snow?: number;
}) {
  const left = x - width;
  const right = x + width;
  // Where the snow line meets each side.
  const half = snow ? (width * snow) / (base - peak) : 0;
  const snowLine = peak + (snow ?? 0);
  const cap = [
    [x, peak],
    [x - half, snowLine],
    [x - half / 2, snowLine - (snow ?? 0) * 0.25],
    [x - half / 6, snowLine + (snow ?? 0) * 0.15],
    [x + half / 4, snowLine - (snow ?? 0) * 0.2],
    [x + half / 1.7, snowLine + (snow ?? 0) * 0.1],
    [x + half, snowLine],
  ];

  return (
    <g>
      <polygon points={`${x},${peak} ${right},${base} ${left},${base}`} fill={fill} />
      <polygon points={`${x},${peak} ${right},${base} ${x + width * 0.15},${base}`} fill={shade} />
      {snow && <polygon points={cap.map((p) => p.join(",")).join(" ")} fill="#f8f5f3" />}
    </g>
  );
}

/** A pine tree: three stacked tiers on a trunk. */
function Pine({ x, base, height }: { x: number; base: number; height: number }) {
  const w = height * 0.32;
  const tier = (top: number, bottom: number, spread: number) =>
    `${x},${base - height * top} ${x + w * spread},${base - height * bottom} ${x - w * spread},${base - height * bottom}`;
  return (
    <g>
      <rect x={x - w * 0.1} y={base - height * 0.15} width={w * 0.2} height={height * 0.15} />
      <polygon points={tier(0.55, 0.12, 1)} />
      <polygon points={tier(0.8, 0.35, 0.8)} />
      <polygon points={tier(1, 0.6, 0.6)} />
    </g>
  );
}

/** A tall, rounded poplar on a thin trunk. */
function Poplar({ x, base, height }: { x: number; base: number; height: number }) {
  const w = height * 0.3;
  return (
    <g fill="#0c3c58">
      <rect x={x - 3} y={base - height * 0.25} width={6} height={height * 0.25} />
      <rect x={x - w / 2} y={base - height} width={w} height={height * 0.8} rx={w / 2} />
    </g>
  );
}

/** A little barn with a round window and a door. */
function House({ x, base }: { x: number; base: number }) {
  return (
    <g>
      <polygon
        points={`${x - 50},${base - 50} ${x},${base - 88} ${x + 70},${base - 88} ${x + 95},${base - 50} ${x + 95},${base} ${x - 50},${base}`}
        fill="#0c3c58"
      />
      <polygon
        points={`${x - 50},${base - 50} ${x},${base - 88} ${x + 50},${base - 50} ${x + 50},${base} ${x - 50},${base}`}
        fill="#0f5573"
      />
      <circle cx={x} cy={base - 55} r={7} fill="#fb7d68" />
      <rect x={x - 10} y={base - 30} width={20} height={30} fill="#fb7d68" />
    </g>
  );
}
