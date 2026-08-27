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
  const usesManualInstall = isIos || (!deferredPrompt && showManualHelp);

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

  const showIosHelp = isIos && !deferredPrompt;

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      <Dialog
        open={dialogOpen && !isInstalled}
        title="Instalar o ScoreHistory"
        description={
          showIosHelp
            ? "No Safari, o app é adicionado pela tela de compartilhar."
            : "Abra o app direto da tela inicial, sem precisar do navegador."
        }
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

          {showIosHelp ? (
            <IosInstallSteps />
          ) : usesManualInstall ? (
            <p className="text-sm text-muted-foreground">
              No menu do navegador, escolha <strong>Instalar aplicativo</strong> ou{" "}
              <strong>Adicionar à tela inicial</strong>.
            </p>
          ) : null}

          <div className="grid gap-2">
            {showIosHelp ? (
              <Button size="lg" onClick={closeDialog}>
                Entendi
              </Button>
            ) : (
              <>
                <Button size="lg" onClick={() => void install()}>
                  <Download />
                  Instalar
                </Button>
                <Button variant="outline" size="lg" onClick={closeDialog}>
                  Agora não
                </Button>
              </>
            )}
          </div>
        </div>
      </Dialog>
    </PwaInstallContext.Provider>
  );
}

function IosShareIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function IosInstallSteps() {
  return (
    <ol className="grid gap-3 text-sm">
      <li className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
          1
        </span>
        <p className="pt-0.5 text-muted-foreground">
          Toque em{" "}
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            Compartilhar
            <IosShareIcon className="size-4" />
          </span>{" "}
          na barra do Safari.
        </p>
      </li>
      <li className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
          2
        </span>
        <p className="pt-0.5 text-muted-foreground">
          Role e toque em <strong className="text-foreground">Adicionar à Tela de Início</strong>.
        </p>
      </li>
      <li className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">
          3
        </span>
        <p className="pt-0.5 text-muted-foreground">
          Confirme em <strong className="text-foreground">Adicionar</strong>.
        </p>
      </li>
    </ol>
  );
}
