const SEGMENT_POLYGONS = {
  "top-center": [
    "149.486,40 49.486,40 50.883,0 150.883,0",
    "149.486,40 150.883,0 170.184,20",
    "50.883,0 49.486,40 30.184,20",
  ],
  "top-right": [
    "146.959,141 186.959,141 190.451,41 150.451,41",
    "190.451,41 150.451,41 171.149,21",
    "146.959,141 186.959,141 166.26,161",
  ],
  "top-left": [
    "4.959,141 44.959,141 48.451,41 8.451,41",
    "48.451,41 8.451,41 29.149,21",
    "4.959,141 44.959,141 24.26,161",
  ],
  "mid-center": [
    "144.527,182 44.527,182 45.924,142 145.924,142",
    "144.527,182 145.924,142 165.226,162",
    "45.924,142 44.527,182 25.226,162",
  ],
  "bottom-right": [
    "142,283 182,283 185.492,183 145.492,183",
    "185.492,183 145.492,183 166.191,163",
    "142,283 182,283 161.302,303",
  ],
  "bottom-left": [
    "0,283 40,283 43.492,183 3.492,183",
    "43.492,183 3.492,183 24.191,163",
    "0,283 40,283 19.302,303",
  ],
  "bottom-center": [
    "139.568,324 140.965,284 160.267,304",
    "40.965,284 39.568,324 20.267,304",
    "139.568,324 39.568,324 40.965,284 140.965,284",
  ],
} as const;

const ACTIVE_SEGMENTS: Record<string, Array<keyof typeof SEGMENT_POLYGONS>> = {
  "0": ["top-center", "top-left", "top-right", "bottom-right", "bottom-left", "bottom-center"],
  "1": ["top-right", "bottom-right"],
  "2": ["top-center", "top-right", "mid-center", "bottom-left", "bottom-center"],
  "3": ["top-center", "top-right", "mid-center", "bottom-right", "bottom-center"],
  "4": ["top-left", "top-right", "mid-center", "bottom-right"],
  "5": ["top-center", "top-left", "mid-center", "bottom-right", "bottom-center"],
  "6": ["top-center", "top-left", "mid-center", "bottom-right", "bottom-left", "bottom-center"],
  "7": ["top-center", "top-right", "bottom-right"],
  "8": ["top-center", "top-left", "top-right", "mid-center", "bottom-right", "bottom-left", "bottom-center"],
  "9": ["top-center", "top-left", "top-right", "mid-center", "bottom-right", "bottom-center"],
};

type SegmentName = keyof typeof SEGMENT_POLYGONS;

function Segment({ name, active }: { name: SegmentName; active: boolean }) {
  return (
    <g className={`trmnl-lcd-segment ${active ? "trmnl-lcd-segment-active" : ""}`}>
      {SEGMENT_POLYGONS[name].map((points) => (
        <polygon key={points} points={points} />
      ))}
    </g>
  );
}

function Digit({ x, value }: { x: number; value: string }) {
  const activeSegments = new Set(ACTIVE_SEGMENTS[value] ?? []);

  return (
    <g transform={`translate(${x} 0)`}>
      {(Object.keys(SEGMENT_POLYGONS) as SegmentName[]).map((segment) => (
        <Segment key={segment} name={segment} active={activeSegments.has(segment)} />
      ))}
    </g>
  );
}

function Dots({ x }: { x: number }) {
  return (
    <g transform={`translate(${x} 0)`} className="trmnl-lcd-segment trmnl-lcd-segment-active">
      <path d="M33.657,121c-0.289,8.284-7.24,15-15.524,15s-14.765-6.716-14.476-15c0.29-8.284,7.24-15,15.524-15S33.947,112.716,33.657,121z" />
      <path d="M30.515,211c-0.29,8.284-7.24,15-15.524,15S0.225,219.284,0.515,211c0.289-8.284,7.239-15,15.523-15S30.804,202.716,30.515,211z" />
    </g>
  );
}

export default function StaticDigitalClock({ value }: { value: string }) {
  const [hours = "00", minutes = "00"] = value.split(":");
  const digits = `${hours.padStart(2, "0")}${minutes.padStart(2, "0")}`.slice(0, 4);

  return (
    <div className="trmnl-digital-clock" aria-label={value}>
      <svg viewBox="0 0 900 324" role="img">
        <Digit x={0} value={digits[0]} />
        <Digit x={212} value={digits[1]} />
        <Dots x={425} />
        <Digit x={487} value={digits[2]} />
        <Digit x={699} value={digits[3]} />
      </svg>
    </div>
  );
}
