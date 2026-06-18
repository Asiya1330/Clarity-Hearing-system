import {
  aidedThresholdAt,
  FREQUENCIES,
  PHONEMES,
  SEVERITY_BANDS,
  SPEECH_BANANA,
  thresholdAt,
  SeverityKey,
  Thresholds,
} from "@/lib/calculators/audiogram-conversation";

interface AudiogramChartProps {
  thresholds: Thresholds;
  aided: boolean;
  ariaLabel: string;
}

/** Functional palette — local to this chart, intentionally not in the theme. */
const ZONE_FILL: Record<SeverityKey, string> = {
  normal: "#DFF3E3",
  mild: "#FBF1CE",
  moderate: "#FBE3C6",
  modSevere: "#FAD3BB",
  severe: "#F8C7C7",
  profound: "#F0B5BF",
};

const ZONE_LABEL: Record<SeverityKey, string> = {
  normal: "#1B7A3D",
  mild: "#876400",
  moderate: "#9A4B00",
  modSevere: "#9A3412",
  severe: "#B42318",
  profound: "#8A1530",
};

const NAVY = "#002147";
const SIGNAL = "#008B8B";
const ALERT = "#C62828";

const VB_W = 780;
const VB_H = 470;
const X0 = 82;
const X1 = 624;
const Y0 = 58;
const Y1 = 388;
const F_MIN = Math.log2(250);
const F_MAX = Math.log2(8000);
const DB_MIN = -10;
const DB_MAX = 120;

const fx = (f: number): number =>
  X0 + ((Math.log2(f) - F_MIN) / (F_MAX - F_MIN)) * (X1 - X0);

const dy = (db: number): number =>
  Y0 + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * (Y1 - Y0);

const points = (fn: (f: number) => number): string =>
  FREQUENCIES.map((f) => `${fx(f)},${dy(fn(f))}`).join(" ");

const bananaPath = (): string => {
  const top = FREQUENCIES.map((f) => `${fx(f)},${dy(SPEECH_BANANA[f][0])}`);
  const bottom = [...FREQUENCIES]
    .reverse()
    .map((f) => `${fx(f)},${dy(SPEECH_BANANA[f][1])}`);
  return `M ${[...top, ...bottom].join(" L ")} Z`;
};

const DB_TICKS = [0, 20, 40, 60, 80, 100, 120];
const TITLE_FONT = "Montserrat";

export function AudiogramChart({
  thresholds,
  aided,
  ariaLabel,
}: AudiogramChartProps) {
  const midY = (Y0 + Y1) / 2;

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      className="h-auto w-full"
      role="img"
      aria-label={ariaLabel}
    >
      {/* 1 · Severity bands */}
      {SEVERITY_BANDS.map((band) => {
        const top = dy(band.topDb);
        const bottom = dy(band.bottomDb);
        const mid = (top + bottom) / 2;
        return (
          <g key={band.key}>
            <rect
              x={X0}
              y={top}
              width={X1 - X0}
              height={bottom - top}
              fill={ZONE_FILL[band.key]}
            />
            <text
              x={X1 + 12}
              y={mid + 5}
              fontSize={14}
              fontWeight={700}
              fill={ZONE_LABEL[band.key]}
            >
              {band.label}
            </text>
          </g>
        );
      })}

      {/* 2 · dB grid */}
      {DB_TICKS.map((db) => (
        <g key={`db-${db}`}>
          <line
            x1={X0}
            y1={dy(db)}
            x2={X1}
            y2={dy(db)}
            stroke="rgba(0,33,71,.10)"
          />
          <text
            x={X0 - 12}
            y={dy(db) + 5}
            textAnchor="end"
            fontSize={14}
            fontWeight={600}
            fill="#5A6B73"
          >
            {db}
          </text>
        </g>
      ))}

      {/* 3 · Frequency grid */}
      {FREQUENCIES.map((f) => (
        <g key={`f-${f}`}>
          <line
            x1={fx(f)}
            y1={Y0}
            x2={fx(f)}
            y2={Y1}
            stroke="rgba(0,33,71,.07)"
          />
          <text
            x={fx(f)}
            y={Y1 + 28}
            textAnchor="middle"
            fontSize={17}
            fontWeight={700}
            fill={NAVY}
          >
            {f >= 1000 ? `${f / 1000}k` : f}
          </text>
        </g>
      ))}

      {/* 4 · Frame */}
      <line x1={X0} y1={Y0} x2={X0} y2={Y1} stroke="#9FB0B5" strokeWidth={1.5} />
      <line x1={X0} y1={Y1} x2={X1} y2={Y1} stroke="#9FB0B5" strokeWidth={1.5} />

      {/* 5 · Axis titles */}
      <text
        x={X0}
        y={30}
        fontFamily={TITLE_FONT}
        fontSize={14}
        fontWeight={700}
        letterSpacing={1}
        fill="#3E4F57"
      >
        LOW → HIGH PITCH
      </text>
      <text
        x={26}
        y={midY}
        transform={`rotate(-90 26 ${midY})`}
        textAnchor="middle"
        fontFamily={TITLE_FONT}
        fontSize={14}
        fontWeight={700}
        letterSpacing={1}
        fill="#3E4F57"
      >
        SOFT → LOUD
      </text>
      <text
        x={X0 - 12}
        y={44}
        textAnchor="end"
        fontSize={12}
        fill="#7A8B92"
      >
        dB HL
      </text>

      {/* 6 · Speech-sounds zone */}
      <path
        d={bananaPath()}
        fill="rgba(0,139,139,.04)"
        stroke="rgba(0,115,111,.55)"
        strokeWidth={1.5}
        strokeDasharray="1 5"
        strokeLinejoin="round"
      />

      {/* 7 · Phonemes */}
      {PHONEMES.map((p) => {
        const threshold = aided
          ? aidedThresholdAt(thresholds, p.frequency)
          : thresholdAt(thresholds, p.frequency);
        const heard = p.level >= threshold;
        const isConsonant = p.group === "consonant";
        const colour = heard ? (isConsonant ? NAVY : "#37474F") : ALERT;
        const x = fx(p.frequency);
        const y = dy(p.level);
        return (
          <g key={`ph-${p.symbol}`}>
            <text
              x={x}
              y={y + 5}
              textAnchor="middle"
              fontSize={isConsonant ? 17 : 15}
              fontWeight={isConsonant ? 800 : 600}
              fill={colour}
            >
              {p.symbol}
            </text>
            {!heard && (
              <line
                x1={x - 11}
                y1={y - 5}
                x2={x + 11}
                y2={y + 5}
                stroke={ALERT}
                strokeWidth={2}
              />
            )}
          </g>
        );
      })}

      {/* 8 · Aided curve */}
      {aided && (
        <g>
          <polyline
            points={points((f) => aidedThresholdAt(thresholds, f))}
            stroke={SIGNAL}
            strokeWidth={4}
            strokeDasharray="2 7"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {FREQUENCIES.map((f) => (
            <circle
              key={`aided-${f}`}
              cx={fx(f)}
              cy={dy(aidedThresholdAt(thresholds, f))}
              r={5}
              fill="#fff"
              stroke={SIGNAL}
              strokeWidth={3}
            />
          ))}
        </g>
      )}

      {/* 9 · Patient curve */}
      <polyline
        points={points((f) => thresholds[f])}
        stroke="#fff"
        strokeWidth={8}
        strokeOpacity={0.85}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <polyline
        points={points((f) => thresholds[f])}
        stroke={NAVY}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {FREQUENCIES.map((f) => (
        <circle
          key={`pt-${f}`}
          cx={fx(f)}
          cy={dy(thresholds[f])}
          r={7.5}
          fill="#fff"
          stroke={NAVY}
          strokeWidth={3.5}
        />
      ))}
    </svg>
  );
}
