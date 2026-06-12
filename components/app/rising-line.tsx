/**
 * The brand signature, reduced to a thin accent for in-app surfaces:
 * a flat soundwave on the left resolving into a climbing line on the right.
 * Decorative only.
 */
export function RisingLine({
  className,
  stroke = "#008B8B",
}: {
  className?: string;
  stroke?: string;
}) {
  return (
    <svg
      viewBox="0 0 320 40"
      aria-hidden="true"
      preserveAspectRatio="none"
      className={className}
    >
      <path
        d="M0,30 L18,30 L27,18 L36,34 L45,12 L54,34 L63,24 L82,24 C140,24 180,18 230,12 C270,8 300,6 320,4"
        fill="none"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
