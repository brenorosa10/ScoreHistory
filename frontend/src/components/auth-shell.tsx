import { BrandMark } from "@/components/brand-mark";

type AuthShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="flex min-h-svh flex-col justify-center bg-background px-5 py-10">
      <div className="mx-auto w-full max-w-md animate-rise">
        <div className="mb-7 grid gap-3">
          <BrandMark />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm">{children}</div>

        <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
      </div>
    </main>
  );
}
