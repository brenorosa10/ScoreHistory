import { Palette } from "lucide-react";

export const DEFAULT_FRAME_COLOR = "#1f2937";
export const DEFAULT_STRING_COLOR = "#e5e7eb";
export const DEFAULT_GRIP_COLOR = "#44403c";

type RacketPreviewProps = {
  name: string;
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
  const strings = stringName.trim() || "—";
  const tension = tensionLb.trim() ? `${tensionLb.trim()} lb` : "—";
  const handle = grip.trim() || "—";

  return (
    <section className="grid min-w-0 gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">Visualização</h2>
        <p className="text-xs text-muted-foreground">Toque nas cores para personalizar.</p>
      </div>

      <div className="relative grid justify-items-center overflow-hidden rounded-2xl bg-gradient-to-b from-accent/60 to-muted/30 px-4 py-5">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 size-48 rounded-full bg-background/50 blur-2xl"
        />
        <svg
          viewBox="0 0 160 280"
          className="relative h-52 max-w-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.18)]"
          aria-hidden
        >
          <ellipse cx="80" cy="78" rx="52" ry="68" fill="none" stroke={frameColor} strokeWidth="7" />
          <ellipse cx="80" cy="78" rx="42" ry="58" fill={stringColor} opacity="0.35" />
          {Array.from({ length: 7 }, (_, index) => {
            const x = 50 + index * 10;
            return (
              <line
                key={`v-${index}`}
                x1={x}
                y1={28}
                x2={x}
                y2={128}
                stroke={stringColor}
                strokeWidth="1.2"
                opacity="0.9"
              />
            );
          })}
          {Array.from({ length: 9 }, (_, index) => {
            const y = 32 + index * 11;
            return (
              <line
                key={`h-${index}`}
                x1={42}
                y1={y}
                x2={118}
                y2={y}
                stroke={stringColor}
                strokeWidth="1.2"
                opacity="0.75"
              />
            );
          })}
          <path
            d="M64 142 C64 158 70 168 80 172 C90 168 96 158 96 142"
            fill="none"
            stroke={frameColor}
            strokeWidth="6"
            strokeLinecap="round"
          />
          <rect x="72" y="170" width="16" height="78" rx="7" fill={frameColor} />
          <rect x="70" y="176" width="20" height="58" rx="8" fill={gripColor} />
          {Array.from({ length: 6 }, (_, index) => (
            <line
              key={`g-${index}`}
              x1="72"
              y1={184 + index * 8}
              x2="88"
              y2={188 + index * 8}
              stroke={frameColor}
              strokeWidth="1.4"
              opacity="0.35"
            />
          ))}
        </svg>

        <p className="relative mt-1 max-w-full truncate text-center text-sm font-semibold">{racket}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ColorButton label="Raquete" value={frameColor} onChange={onFrameColorChange} />
        <ColorButton label="Corda" value={stringColor} onChange={onStringColorChange} />
        <ColorButton label="Grip" value={gripColor} onChange={onGripColorChange} />
      </div>

      <dl className="grid min-w-0 grid-cols-3 gap-2">
        <Spec label="Corda" value={strings} />
        <Spec label="Tensão" value={tension} />
        <Spec label="Grip" value={handle} />
      </dl>
    </section>
  );
}

function ColorButton({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <label className="grid min-w-0 cursor-pointer justify-items-center gap-1.5 rounded-xl border bg-background px-2 py-2.5 transition-colors hover:bg-accent/50">
      <span
        className="relative grid size-9 place-items-center rounded-full border shadow-xs"
        style={{ backgroundColor: value }}
      >
        <Palette className="size-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.65)]" />
        <input
          type="color"
          value={toInputColor(value)}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`Cor da ${label.toLowerCase()}`}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </span>
      <span className="truncate text-[0.7rem] font-medium text-muted-foreground">{label}</span>
    </label>
  );
}

function toInputColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid min-w-0 gap-0.5 rounded-xl bg-muted/70 px-3 py-2 text-center">
      <dt className="truncate text-[0.7rem] text-muted-foreground">{label}</dt>
      <dd className="truncate text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
