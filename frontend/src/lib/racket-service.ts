import { Grip, Hand, Waves, Wrench, type LucideIcon } from "lucide-react";
import type { RacketServiceKind } from "@/lib/api";

type ServiceKindMeta = {
  icon: LucideIcon;
  bubble: string;
};

export const SERVICE_KIND_META: Record<RacketServiceKind, ServiceKindMeta> = {
  Corda: { icon: Waves, bubble: "bg-primary/12 text-primary" },
  Overgrip: { icon: Grip, bubble: "bg-warning/15 text-warning" },
  Grip: { icon: Hand, bubble: "bg-success/12 text-success" },
  Outro: { icon: Wrench, bubble: "bg-muted text-muted-foreground" },
};

export const SERVICE_KIND_ORDER: RacketServiceKind[] = ["Corda", "Overgrip", "Grip", "Outro"];
