import { Grip, Hand, Waves, Wrench, type LucideIcon } from "lucide-react";
import type { RacketServiceKind, RacketServicePayload } from "@/lib/api";

type ServiceKindMeta = {
  icon: LucideIcon;
  bubble: string;
  label: string;
};

export const SERVICE_KIND_META: Record<RacketServiceKind, ServiceKindMeta> = {
  Corda: { icon: Waves, bubble: "bg-primary/12 text-primary", label: "Corda" },
  Overgrip: { icon: Grip, bubble: "bg-warning/15 text-warning", label: "Overgrip" },
  Grip: { icon: Hand, bubble: "bg-success/12 text-success", label: "Cushion grip" },
  Outro: { icon: Wrench, bubble: "bg-muted text-muted-foreground", label: "Outro" },
};

export const SERVICE_KIND_ORDER: RacketServiceKind[] = ["Corda", "Overgrip", "Grip", "Outro"];

export function servicesToPayload(services: RacketServicePayload[]): RacketServicePayload[] {
  return services.map((service) => ({
    id: service.id,
    kind: service.kind,
    changedAt: service.changedAt,
    detail: service.detail,
    tensionLb: service.tensionLb,
  }));
}
