/**
 * The paper theme's backdrop: a sunset sky with soft bands and gulls, and along the bottom a
 * tropical beach (a setting sun, layered sea, foam, sand and palms), each layer casting a shadow
 * on the one behind it.
 */
export function PaperScenery({ beach = true }: { beach?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <Sky />
      <Birds />
      {beach && <Beach />}
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

// The art is extra wide so a wide, short screen crops its sides rather than the sun and the sails.
function Beach() {
  return (
    <svg
      viewBox="0 0 2400 420"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-x-0 bottom-0 h-[clamp(150px,34vh,400px)] w-full max-sm:h-[46vh]"
    >
      <defs>
        <PaperShadow id="beach-shadow" dy={-4} blur={7} opacity={0.3} />
      </defs>

      {/* The sun, setting behind the sea. */}
      <g filter="url(#beach-shadow)">
        <circle cx={1750} cy={125} r={120} fill="#ffb497" />
        <circle cx={1750} cy={125} r={92} fill="#ffc99f" />
        <circle cx={1750} cy={125} r={66} fill="#ffe4b0" />
      </g>

      <g filter="url(#beach-shadow)">
        <rect y={120} width={2400} height={300} fill="#0d6f86" />
        <Sailboat x={1150} y={124} />
      </g>
      <Layer
        d="M0 165 C 300 150 600 175 900 162 S 1500 150 1800 165 S 2250 172 2400 160"
        fill="#148fa3"
      />
      <Layer
        d="M0 215 C 350 198 700 222 1050 208 S 1700 198 2000 214 S 2300 220 2400 206"
        fill="#22b5bd"
      />
      <Layer d="M0 262 C 400 245 800 268 1200 252 S 1900 245 2400 258" fill="#4fd1c5" />
      {/* Foam: a white band that the sand covers all but the edge of. */}
      <Layer d="M0 285 C 400 270 800 292 1200 278 S 1900 270 2400 282" fill="#fff6ee" />
      <Layer d="M0 300 C 400 288 800 306 1200 294 S 1900 288 2400 298" fill="#f2c98a" />

      <g filter="url(#beach-shadow)">
        <Palm x={330} base={350} height={260} lean={70} />
        <Palm x={540} base={362} height={190} lean={-45} />
        <Palm x={2060} base={352} height={250} lean={-75} />
        <Palm x={2230} base={345} height={185} lean={40} />
      </g>

      <Layer
        d="M0 360 C 300 340 700 352 1000 366 S 1700 345 2000 358 S 2300 366 2400 355"
        fill="#f8dcab"
      />
      <g filter="url(#beach-shadow)">
        <Starfish x={760} y={392} />
        <Shell x={1700} y={395} />
      </g>
    </svg>
  );
}

/** A band of sea or sand: the wavy top edge `d`, filled down to the bottom of the scene. */
function Layer({ d, fill }: { d: string; fill: string }) {
  return <path d={`${d} V420 H0 Z`} fill={fill} filter="url(#beach-shadow)" />;
}

function Sailboat({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <polygon points={`${x},${y - 66} ${x},${y - 4} ${x + 44},${y - 4}`} fill="#fff6ee" />
      <polygon points={`${x - 5},${y - 52} ${x - 5},${y - 4} ${x - 34},${y - 4}`} fill="#ffd9b0" />
      <polygon
        points={`${x - 42},${y} ${x + 50},${y} ${x + 38},${y + 16} ${x - 30},${y + 16}`}
        fill="#123a52"
      />
    </g>
  );
}

// Fronds as [dx, dy] from the crown to the leaf tip, before scaling.
const FRONDS: [number, number][] = [
  [-150, 45],
  [-125, -25],
  [-55, -72],
  [35, -78],
  [115, -35],
  [150, 40],
  [-85, 85],
  [80, 88],
];

/** A palm: a curved, banded trunk and a crown of arching fronds. */
function Palm({
  x,
  base,
  height,
  lean,
}: {
  x: number;
  base: number;
  height: number;
  lean: number;
}) {
  const crownX = x + lean;
  const crownY = base - height;
  const trunk = `M${x} ${base} Q ${x + lean * 0.1} ${base - height * 0.55} ${crownX} ${crownY}`;
  const scale = height / 250;

  return (
    <g>
      <path d={trunk} fill="none" stroke="#8a5a36" strokeWidth={16 * scale} strokeLinecap="round" />
      <path
        d={trunk}
        fill="none"
        stroke="#6d4527"
        strokeWidth={16 * scale}
        strokeDasharray={`${4 * scale} ${14 * scale}`}
      />
      {FRONDS.map(([dx, dy], i) => (
        <path
          key={i}
          d={frond(crownX, crownY, dx * scale, dy * scale, 34 * scale, 24 * scale)}
          fill={i % 2 ? "#0f6b5c" : "#13896d"}
        />
      ))}
      <circle cx={crownX - 6 * scale} cy={crownY + 8 * scale} r={8 * scale} fill="#5b3a22" />
      <circle cx={crownX + 8 * scale} cy={crownY + 10 * scale} r={8 * scale} fill="#5b3a22" />
    </g>
  );
}

/** A crescent leaf from (x, y) to (x + dx, y + dy), arching upward by `bend` and `width` thick. */
function frond(x: number, y: number, dx: number, dy: number, bend: number, width: number) {
  const length = Math.hypot(dx, dy);
  // The unit normal that points up the screen, so every frond arches before it droops.
  let nx = -dy / length;
  let ny = dx / length;
  if (ny > 0) [nx, ny] = [-nx, -ny];
  const mx = x + dx / 2;
  const my = y + dy / 2;
  const outer = `${mx + nx * bend} ${my + ny * bend}`;
  const inner = `${mx + nx * (bend - width)} ${my + ny * (bend - width)}`;
  return `M${x} ${y} Q ${outer} ${x + dx} ${y + dy} Q ${inner} ${x} ${y} Z`;
}

function Starfish({ x, y }: { x: number; y: number }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? 7 : 18;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    return `${x + r * Math.cos(a)},${y + r * Math.sin(a)}`;
  });
  return <polygon points={points.join(" ")} fill="#f2826b" />;
}

function Shell({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 16} ${y + 6} A 16 16 0 0 1 ${x + 16} ${y + 6} Z`} fill="#fff6ee" />
      <path
        d={`M${x} ${y + 6} L${x} ${y - 9} M${x} ${y + 6} L${x - 9} ${y - 5} M${x} ${y + 6} L${x + 9} ${y - 5}`}
        stroke="#e9b98a"
        strokeWidth={2}
      />
    </g>
  );
}
