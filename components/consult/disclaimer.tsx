export function Disclaimer({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={`rounded-xl border border-brand-line bg-brand-mist p-4 text-base leading-relaxed text-brand-muted ${
        className ?? ""
      }`}
    >
      Educational projection based on published evidence and today&apos;s
      hearing results. Not a diagnosis, guarantee, or substitute for clinician
      judgment.
    </div>
  );
}
