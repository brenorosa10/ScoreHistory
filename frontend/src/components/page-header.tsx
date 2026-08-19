import { ChevronLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

type PageHeaderProps = {
  title: string;
  description?: string;
  back?: boolean;
  action?: React.ReactNode;
};

export function PageHeader({ title, description, back, action }: PageHeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
      <div className="flex items-center gap-2 px-4 py-3">
        {back ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Voltar"
            className="-ml-2 shrink-0"
            onClick={() => router.history.back()}
          >
            <ChevronLeft />
          </Button>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    </header>
  );
}
