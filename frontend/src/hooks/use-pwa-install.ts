import { createContext, useContext } from "react";

export type PwaInstallContextValue = {
  canInstall: boolean;
  isInstalled: boolean;
  isIos: boolean;
  install: () => Promise<boolean>;
};

export const PwaInstallContext = createContext<PwaInstallContextValue | null>(null);

export function usePwaInstall() {
  const context = useContext(PwaInstallContext);
  if (!context) {
    throw new Error("usePwaInstall must be used within PwaProvider");
  }
  return context;
}
