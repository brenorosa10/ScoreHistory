import { Download } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { PwaInstallContext } from "@/hooks/use-pwa-install";
import {
  dismissInstallPrompt,
  isIosDevice,
  isStandaloneDisplay,
  wasInstallDismissed,
} from "@/lib/pwa";

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(() =>
    typeof window === "undefined" ? false : isStandaloneDisplay(),
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showManualHelp, setShowManualHelp] = useState(false);
  const isIos = typeof window === "undefined" ? false : isIosDevice();

  useEffect(() => {
    function onBeforeInstall(event: BeforeInstallPromptEvent) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    function onInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setDialogOpen(false);
      dismissInstallPrompt();
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (isInstalled || wasInstallDismissed()) {
      return;
    }

    const timer = window.setTimeout(() => setDialogOpen(true), 500);
    return () => window.clearTimeout(timer);
  }, [isInstalled]);

  const install = useCallback(async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        dismissInstallPrompt();
        setDialogOpen(false);
        return true;
      }
      return false;
    }

    setShowManualHelp(true);
    setDialogOpen(true);
    return false;
  }, [deferredPrompt]);

  function closeDialog() {
    setDialogOpen(false);
    setShowManualHelp(false);
    dismissInstallPrompt();
  }

  const value = useMemo(
    () => ({
      canInstall: Boolean(deferredPrompt) || isIos,
      isInstalled,
      isIos,
      install,
    }),
    [deferredPrompt, install, isInstalled, isIos],
  );

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      <Dialog
        open={dialogOpen && !isInstalled}
        title="Instalar o ScoreHistory"
        description="Abra o app direto da tela inicial, sem precisar do navegador."
        onClose={closeDialog}
      >
        <div className="grid gap-4">
          <div className="flex items-center gap-3 rounded-xl bg-muted px-3 py-3">
            <BrandMark className="size-12" />
            <div>
              <p className="font-medium">ScoreHistory</p>
              <p className="text-sm text-muted-foreground">Acompanhe suas partidas no celular.</p>
            </div>
          </div>

          {showManualHelp || (isIos && !deferredPrompt) ? (
            <p className="text-sm text-muted-foreground">
              {isIos ? (
                <>
                  Toque em <strong>Compartilhar</strong> e depois em{" "}
                  <strong>Adicionar à Tela de Início</strong>.
                </>
              ) : (
                <>
                  No menu do navegador, escolha <strong>Instalar aplicativo</strong> ou{" "}
                  <strong>Adicionar à tela inicial</strong>.
                </>
              )}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Button size="lg" onClick={() => void install()}>
              <Download />
              Instalar
            </Button>
            <Button variant="outline" size="lg" onClick={closeDialog}>
              Agora não
            </Button>
          </div>
        </div>
      </Dialog>
    </PwaInstallContext.Provider>
  );
}
