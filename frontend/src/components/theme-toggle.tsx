import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import type { ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export function ThemeToggle() {
  const { preference, setTheme } = useTheme();

  return (
    <section className="grid gap-3 rounded-2xl border bg-card p-4 shadow-xs">
      <div>
        <h2 className="text-sm font-semibold">Aparência</h2>
        <p className="text-xs text-muted-foreground">Escolha o tema do aplicativo.</p>
      </div>
      <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          const selected = preference === option.value;

          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={cn(
                "flex h-20 flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-medium transition-colors outline-none",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
