/**
 * The edge of a stack of plywood sheets, drawn to scale: each sheet's height is its
 * real thickness, and it is built from alternating veneer plies. The thicknesses are the
 * same ones the material catalogue will offer.
 */
const SHEETS = [
  { mm: 6, plies: 3 },
  { mm: 9, plies: 5 },
  { mm: 12, plies: 7 },
  { mm: 16, plies: 9 },
  { mm: 18, plies: 11 },
];
const PX_PER_MM = 5;

export function PlyStack({ className }: { className?: string }) {
  return (
    <figure className={className} aria-label="A stack of plywood sheets in cross-section: 6, 9, 12, 16 and 18 millimetres">
      <div className="flex flex-col gap-1.5">
        {SHEETS.map((s) => (
          <div key={s.mm} className="flex items-center gap-4">
            <div
              className="flex w-full max-w-[22rem] flex-col overflow-hidden rounded-[2px] shadow-[0_1px_0_rgba(0,0,0,0.25)]"
              style={{ height: s.mm * PX_PER_MM }}
            >
              {Array.from({ length: s.plies }, (_, i) => (
                <div
                  key={i}
                  className={i % 2 === 0 ? "bg-birch" : "bg-birch-deep"}
                  style={{ flex: 1, opacity: i % 2 === 0 ? 1 : 0.85 }}
                />
              ))}
            </div>
            <figcaption className="w-12 shrink-0 text-sm tabular-nums text-white/80">{s.mm} mm</figcaption>
          </div>
        ))}
      </div>
    </figure>
  );
}
