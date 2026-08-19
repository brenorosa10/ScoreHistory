import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

export function InstallAppButton() {
  const { isInstalled, install } = usePwaInstall();

  if (isInstalled) {
    return null;
  }

  return (
    <Button size="lg" variant="outline" onClick={() => void install()}>
      <Download />
      Instalar aplicativo
    </Button>
  );
}
