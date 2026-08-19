import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="grid justify-items-center gap-3 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-6" />
      </span>
      <div className="grid gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-balance text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
