import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type ResourceMissingProps = {
  title: string;
  description: string;
  actionTo: "/" | "/historico" | "/adversarios" | "/perfil" | "/login";
  actionLabel: string;
};

export function ResourceMissing({ title, description, actionTo, actionLabel }: ResourceMissingProps) {
  return (
    <div className="grid justify-items-center gap-3 px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-balance text-muted-foreground">{description}</p>
      <Button asChild className="mt-1">
        <Link to={actionTo}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
