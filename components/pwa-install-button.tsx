"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () => setInstalled(standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); setShowHelp(false); };
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    updateInstalled();
    standalone.addEventListener("change", updateInstalled);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      standalone.removeEventListener("change", updateInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (!installPrompt) { setShowHelp(value => !value); return; }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
    } catch { setShowHelp(true); }
    setInstallPrompt(null);
  }

  return <div className="relative">
    <button type="button" onClick={install} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/10 px-3 text-xs text-white/65 transition hover:border-accent/40 hover:text-accent" aria-expanded={showHelp} aria-haspopup="dialog">
      <Download size={14} /> <span>Install</span>
    </button>
    {showHelp && <div role="dialog" aria-label="Install FrameVerse" className="absolute right-0 top-11 z-50 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-[#15171b] p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-white">Install FrameVerse</p><p className="mt-2 text-xs leading-5 text-white/55">{isIos ? "In Safari, tap Share, then choose Add to Home Screen." : "Open your browser menu and choose Install FrameVerse. In Safari on Mac, choose File → Add to Dock."}</p></div><button type="button" onClick={() => setShowHelp(false)} className="text-white/40 hover:text-white" aria-label="Close install instructions"><X size={16} /></button></div>
    </div>}
  </div>;
}
