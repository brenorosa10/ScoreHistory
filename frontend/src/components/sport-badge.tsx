import { Badge } from "@/components/ui/badge";
import { sportLabel } from "@/lib/racket-sport";
import { cn } from "@/lib/utils";

export function SportBadge({ sport, className }: { sport: string; className?: string }) {
  return (
    <Badge variant="brand" className={cn("px-2 py-0.5 text-[0.65rem]", className)}>
      {sportLabel(sport)}
    </Badge>
  );
}

export function SportBadges({ sports, className }: { sports: readonly string[] | null | undefined; className?: string }) {
  if (!sports || sports.length === 0) {
    return null;
  }

  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {sports.map((sport) => (
        <SportBadge key={sport} sport={sport} />
      ))}
    </span>
  );
}
