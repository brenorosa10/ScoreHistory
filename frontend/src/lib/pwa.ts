const DISMISSED_KEY = "scorehistory.install-dismissed";

export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as { standalone?: boolean }).standalone))
  );
}

export function isIosDevice(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export function wasInstallDismissed(): boolean {
  return localStorage.getItem(DISMISSED_KEY) === "1";
}

export function dismissInstallPrompt(): void {
  localStorage.setItem(DISMISSED_KEY, "1");
}
