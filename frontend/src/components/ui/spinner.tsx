import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}

export function LoadingHint({ label = "Carregando..." }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
    >
      <Spinner className="size-5" />
      <span>{label}</span>
    </div>
  );
}
