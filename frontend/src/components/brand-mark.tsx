import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/tennis-ball.svg"
      alt=""
      aria-hidden
      className={cn("size-12 shrink-0", className)}
    />
  );
}
