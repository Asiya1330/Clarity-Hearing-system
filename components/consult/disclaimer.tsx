export function Disclaimer({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={`rounded-md border border-brand-slate/30 bg-brand-white p-4 text-sm leading-relaxed text-brand-slate ${
        className ?? ""
      }`}
    >
      Educational projection based on published evidence and today&apos;s
      hearing results. Not a diagnosis, guarantee, or substitute for clinician
      judgment.
    </div>
  );
}
