const DISMISSED_KEY = "scorehistory.install-dismissed";

export function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator && Boolean((window.navigator as { standalone?: boolean }).standalone))
  );
}

export function isIosDevice(): boolean {
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) {
    return true;
  }

  // iPadOS 13+ reports as Macintosh in Safari.
  return window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
}

export function wasInstallDismissed(): boolean {
  return localStorage.getItem(DISMISSED_KEY) === "1";
}

export function dismissInstallPrompt(): void {
  localStorage.setItem(DISMISSED_KEY, "1");
}
