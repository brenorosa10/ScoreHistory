import { Check } from "lucide-react";
import { COLOR_SLOTS, SLOT_SWATCHES, slotHint, slotLabel, swatchMatches, type ColorSlot } from "@/lib/racket-colors";
import { racketHasStrings } from "@/lib/racket-sport";
import { cn } from "@/lib/utils";

export const DEFAULT_FRAME_COLOR = "#1f2937";
export const DEFAULT_STRING_COLOR = "#e5e7eb";
export const DEFAULT_GRIP_COLOR = "#44403c";

type RacketPreviewProps = {
  name: string;
  sport?: string;
  stringName: string;
  tensionLb: string;
  grip: string;
  frameColor: string;
  stringColor: string;
  gripColor: string;
  onFrameColorChange: (color: string) => void;
  onStringColorChange: (color: string) => void;
  onGripColorChange: (color: string) => void;
};

export function RacketPreview({
  name,
  sport,
  stringName,
  tensionLb,
  grip,
  frameColor,
  stringColor,
  gripColor,
  onFrameColorChange,
  onStringColorChange,
  onGripColorChange,
}: RacketPreviewProps) {
  const racket = name.trim() || "Sua raquete";
  const hasStrings = racketHasStrings(sport);
  const colors: Record<ColorSlot, { value: string; onChange: (color: string) => void }> = {
    frame: { value: frameColor, onChange: onFrameColorChange },
    detail: { value: stringColor, onChange: onStringColorChange },
    grip: { value: gripColor, onChange: onGripColorChange },
  };

  return (
    <section className="grid min-w-0 gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">Cores</h2>
        <p className="text-xs text-muted-foreground">A prévia atualiza na hora.</p>
      </div>

      <div className="grid items-center gap-3 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
        <div className="relative grid justify-items-center overflow-hidden rounded-2xl bg-gradient-to-b from-accent/70 to-muted/40 px-3 py-3">
          <RacketIllustration
            sport={sport}
            frameColor={frameColor}
            detailColor={stringColor}
            gripColor={gripColor}
            className="h-40"
          />
          <p className="relative mt-1 max-w-full truncate text-center text-xs font-semibold">{racket}</p>
        </div>

        <div className="grid gap-2.5">
          {COLOR_SLOTS.map((slot) => (
            <ColorSlotPicker
              key={slot}
              slot={slot}
              sport={sport}
              value={colors[slot].value}
              onChange={colors[slot].onChange}
            />
          ))}
        </div>
      </div>

      <dl className={cn("grid min-w-0 gap-2", hasStrings ? "grid-cols-3" : "grid-cols-2")}>
        {hasStrings ? <Spec label="Corda" value={stringName.trim() || "—"} /> : null}
        {hasStrings ? <Spec label="Tensão" value={tensionLb.trim() ? `${tensionLb.trim()} lb` : "—"} /> : null}
        <Spec label="Grip" value={grip.trim() || "—"} />
        {!hasStrings ? <Spec label="Esporte" value={sport?.trim() || "Padel"} /> : null}
      </dl>
    </section>
  );
}

export function RacketIllustration({
  sport,
  frameColor,
  detailColor,
  gripColor,
  className,
}: {
  sport?: string;
  frameColor: string;
  detailColor: string;
  gripColor: string;
  className?: string;
}) {
  const normalized = sport === "Padel" || sport === "Beach tennis" ? sport : "Tênis";
  return (
    <svg viewBox="0 0 160 250" className={cn("max-w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.22)]", className)} aria-hidden>
      {normalized === "Padel" ? (
        <PadelShape frameColor={frameColor} detailColor={detailColor} gripColor={gripColor} />
      ) : normalized === "Beach tennis" ? (
        <BeachShape frameColor={frameColor} detailColor={detailColor} gripColor={gripColor} />
      ) : (
        <TennisShape frameColor={frameColor} detailColor={detailColor} gripColor={gripColor} />
      )}
    </svg>
  );
}

function TennisShape({
  frameColor,
  detailColor,
  gripColor,
}: {
  frameColor: string;
  detailColor: string;
  gripColor: string;
}) {
  return (
    <>
      <ellipse cx="80" cy="72" rx="50" ry="62" fill="none" stroke={frameColor} strokeWidth="8" />
      <ellipse cx="80" cy="72" rx="40" ry="52" fill={detailColor} opacity="0.45" />
      {Array.from({ length: 7 }, (_, index) => {
        const x = 52 + index * 9.5;
        return <line key={`v-${index}`} x1={x} y1={28} x2={x} y2={116} stroke={detailColor} strokeWidth="1.2" />;
      })}
      {Array.from({ length: 8 }, (_, index) => {
        const y = 32 + index * 11;
        return <line key={`h-${index}`} x1={44} y1={y} x2={116} y2={y} stroke={detailColor} strokeWidth="1.2" opacity="0.85" />;
      })}
      <path d="M66 130 C66 146 72 156 80 160 C88 156 94 146 94 130" fill="none" stroke={frameColor} strokeWidth="7" strokeLinecap="round" />
      <rect x="73" y="158" width="14" height="70" rx="7" fill={frameColor} />
      <rect x="70" y="164" width="20" height="52" rx="8" fill={gripColor} />
    </>
  );
}

function PadelShape({
  frameColor,
  detailColor,
  gripColor,
}: {
  frameColor: string;
  detailColor: string;
  gripColor: string;
}) {
  return (
    <>
      <path
        d="M80 16 C118 16 132 48 132 86 C132 128 112 150 80 156 C48 150 28 128 28 86 C28 48 42 16 80 16 Z"
        fill={detailColor}
        stroke={frameColor}
        strokeWidth="8"
      />
      {holeGrid(48, 40, 5, 6, 16, 14, frameColor)}
      <rect x="73" y="154" width="14" height="72" rx="7" fill={frameColor} />
      <rect x="69" y="162" width="22" height="50" rx="8" fill={gripColor} />
    </>
  );
}

function BeachShape({
  frameColor,
  detailColor,
  gripColor,
}: {
  frameColor: string;
  detailColor: string;
  gripColor: string;
}) {
  return (
    <>
      <circle cx="80" cy="78" r="62" fill={detailColor} stroke={frameColor} strokeWidth="8" />
      {holeGrid(44, 42, 5, 5, 18, 16, frameColor)}
      <rect x="73" y="138" width="14" height="78" rx="7" fill={frameColor} />
      <rect x="69" y="150" width="22" height="52" rx="8" fill={gripColor} />
    </>
  );
}

function holeGrid(x0: number, y0: number, cols: number, rows: number, gapX: number, gapY: number, color: string) {
  const holes = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      holes.push(
        <circle key={`${row}-${col}`} cx={x0 + col * gapX} cy={y0 + row * gapY} r="2.3" fill={color} opacity="0.55" />,
      );
    }
  }
  return holes;
}

function ColorSlotPicker({
  slot,
  sport,
  value,
  onChange,
}: {
  slot: ColorSlot;
  sport?: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const inputId = `racket-color-${slot}`;
  const custom = !SLOT_SWATCHES[slot].some((swatch) => swatchMatches(swatch, value));

  return (
    <fieldset className="min-w-0 rounded-xl border bg-background/60 px-2.5 py-2 dark:bg-background/40">
      <legend className="px-1 text-xs font-semibold">
        {slotLabel(slot)}
        <span className="ml-1.5 font-normal text-muted-foreground">{slotHint(slot, sport)}</span>
      </legend>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={slotLabel(slot)}>
        {SLOT_SWATCHES[slot].map((swatch) => {
          const selected = swatchMatches(swatch, value);
          return (
            <button
              key={swatch}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${slotLabel(slot)} ${swatch}`}
              className={cn(
                "grid size-8 place-items-center rounded-full border shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
                selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "border-border",
              )}
              style={{ backgroundColor: swatch }}
              onClick={() => onChange(swatch)}
            >
              {selected ? <Check className="size-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.7)]" /> : null}
            </button>
          );
        })}
        <label
          htmlFor={inputId}
          className={cn(
            "relative grid size-8 cursor-pointer place-items-center rounded-full border border-dashed text-[0.6rem] font-semibold text-muted-foreground outline-none focus-within:ring-[3px] focus-within:ring-ring/60",
            custom && "ring-2 ring-primary ring-offset-2 ring-offset-background",
          )}
          style={custom ? { backgroundColor: value } : undefined}
          title="Cor personalizada"
        >
          <span className={cn(custom ? "sr-only" : "")}>+</span>
          <input
            id={inputId}
            type="color"
            value={toInputColor(value)}
            aria-label={`Cor personalizada de ${slotLabel(slot).toLowerCase()}`}
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(event) => onChange(event.target.value)}
          />
        </label>
      </div>
    </fieldset>
  );
}

function toInputColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-0.5 rounded-xl bg-muted/70 px-2 py-1.5 text-center">
      <dt className="text-[0.65rem] break-words text-muted-foreground">{label}</dt>
      <dd className="text-xs font-semibold break-words tabular-nums">{value}</dd>
    </div>
  );
}
