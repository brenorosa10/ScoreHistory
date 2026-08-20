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
  const strings = stringName.trim() || "Corda";
  const tension = tensionLb.trim() ? `${tensionLb.trim()} lb` : "lb";
  const handle = grip.trim() || "Grip";

  return (
    <section className="grid min-w-0 gap-3 overflow-hidden rounded-2xl border bg-card p-4 shadow-xs">
      <div>
        <h2 className="text-sm font-semibold">Visualização</h2>
        <p className="text-xs text-muted-foreground">Toque nos ícones para mudar as cores.</p>
      </div>
      <div className="grid min-w-0 justify-items-center gap-4">
        <svg viewBox="0 0 160 280" className="h-48 max-w-full" aria-hidden>
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

        <div className="grid w-full grid-cols-3 gap-2">
          <ColorButton label="Raquete" value={frameColor} onChange={onFrameColorChange} />
          <ColorButton label="Corda" value={stringColor} onChange={onStringColorChange} />
          <ColorButton label="Grip" value={gripColor} onChange={onGripColorChange} />
        </div>

        <dl className="grid w-full min-w-0 gap-2 text-sm">
          <Row label="Raquete" value={racket} />
          <Row label="Corda" value={`${strings}${tensionLb.trim() ? ` · ${tension}` : ""}`} />
          <Row label="Grip" value={handle} />
        </dl>
      </div>
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
    <label className="grid min-w-0 justify-items-center gap-1">
      <span
        className="relative grid size-10 cursor-pointer place-items-center rounded-full border shadow-xs"
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
      <span className="truncate text-[0.65rem] text-muted-foreground">{label}</span>
    </label>
  );
}

function toInputColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 rounded-xl bg-muted/70 px-3 py-2">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{value}</dd>
    </div>
  );
}
