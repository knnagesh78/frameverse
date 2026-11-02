import Link from "next/link";
import { Aperture, ArrowUpRight, Camera, Globe2, Sparkles } from "lucide-react";
import { PwaInstallButton } from "@/components/pwa-install-button";

export function Brand() {
  return (
    <Link href="/login" className="flex w-fit items-center gap-3" aria-label="FrameVerse sign in">
      <span className="grid size-10 place-items-center rounded-2xl bg-accent text-ink"><Aperture size={22} strokeWidth={2.5} /></span>
      <span className="font-semibold tracking-tight text-white">frameverse<span className="text-accent">.</span></span>
    </Link>
  );
}

export function AuthFrame({ children, eyebrow = "A home for every frame" }: { children: React.ReactNode; eyebrow?: string }) {
  return (
    <main className="auth-page min-h-screen bg-ink text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_74%_12%,rgba(184,255,103,.09),transparent_34%),radial-gradient(ellipse_at_15%_86%,rgba(119,95,255,.08),transparent_35%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1fr_1fr]">
        <section className="flex flex-col px-6 py-7 sm:px-10 lg:px-16 lg:py-10">
          <div className="flex items-center justify-between"><Brand /><PwaInstallButton /></div>
          <div className="my-auto w-full max-w-[450px] py-12 lg:py-20">{children}</div>
          <div className="flex items-center gap-2 text-xs text-white/35"><Globe2 size={14} /> A global community for photography</div>
        </section>
        <aside className="relative hidden overflow-hidden border-l border-white/[.07] lg:block">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,10,13,.02)_10%,rgba(9,10,13,.88)_100%),url('https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1800&q=90')] bg-cover bg-center" />
          <div className="absolute inset-x-0 bottom-0 p-12 xl:p-16">
            <div className="mb-7 flex items-center gap-2 text-xs font-medium uppercase tracking-[.2em] text-accent"><Sparkles size={14} /> {eyebrow}</div>
            <h2 className="max-w-xl text-5xl font-medium leading-[1.08] tracking-[-.045em] xl:text-6xl">Every frame has a story.<br /><span className="text-white/55">Let yours be seen.</span></h2>
            <p className="mt-6 max-w-md text-sm leading-7 text-white/60">Discover photographers through the moments they capture, and give your work a place to travel.</p>
            <div className="mt-10 flex items-center gap-3 text-sm text-white/75"><span className="grid size-9 place-items-center rounded-full border border-white/20"><Camera size={16} /></span> Photography, with the world in frame <ArrowUpRight size={15} className="text-accent" /></div>
          </div>
          <div className="absolute right-10 top-10 rounded-full border border-white/15 bg-black/20 px-4 py-2 text-xs text-white/70 backdrop-blur">FRAMEVERSE · 01</div>
        </aside>
      </div>
    </main>
  );
}
