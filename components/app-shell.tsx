"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Aperture, Compass, ImagePlus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOut } from "firebase/auth";
import { RealtimePresence } from "@/components/realtime-presence";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/lib/firebase";

const links: { label: string; href: string; Icon: LucideIcon }[] = [
  { label: "Home", href: "/", Icon: Aperture },
  { label: "Explore", href: "/explore", Icon: Compass },
  { label: "Upload photo", href: "/upload", Icon: ImagePlus },
];

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const { user } = useAuth();
  const pathname = usePathname();
  return <>
    {user && <RealtimePresence uid={user.uid} />}
    <main className="min-h-screen bg-ink pb-20 text-white lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-white/[.07] bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-accent text-ink"><Aperture size={20} strokeWidth={2.5} /></span><span className="text-lg font-semibold tracking-tight">frameverse<span className="text-accent">.</span></span></Link>
          <p className="hidden text-sm text-white/50 md:block">{title || "Every frame has a story."}</p>
          <div className="flex items-center gap-2">{user ? <><span className="hidden max-w-40 truncate text-xs text-white/55 sm:block">{user.displayName || user.email}</span><button onClick={() => auth && signOut(auth)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/65 transition hover:border-white/25 hover:text-white">Sign out</button></> : <><Link href="/login" className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/65 transition hover:border-white/25 hover:text-white">Sign in</Link><Link href="/register" className="rounded-full bg-accent px-3 py-2 text-xs font-semibold text-ink transition hover:bg-white">Join</Link></>}</div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_260px]">
        <aside className="hidden lg:block"><nav className="sticky top-24 space-y-1">{links.map(({ label, href, Icon }) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <Link href={href} key={href} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${active ? "bg-white/[.07] text-white" : "text-white/50 hover:bg-white/[.04] hover:text-white"}`}><Icon size={18} className={active ? "text-accent" : ""} />{label}</Link>; })}</nav></aside>
        <section className="min-w-0">{children}</section>
        <aside className="hidden xl:block"><div className="sticky top-24 space-y-4"><div className="rounded-2xl border border-white/[.07] bg-panel p-5"><p className="text-xs font-medium uppercase tracking-[.16em] text-accent">Open community</p><p className="mt-3 font-medium">Welcome to FrameVerse</p><p className="mt-2 text-sm leading-6 text-muted">Public photographs are available to everyone. {user ? "Your account can publish and take part." : "Sign in to publish and take part."}</p>{user ? <Link href="/upload" className="mt-4 inline-flex text-xs font-medium text-accent hover:text-white">Share a photograph →</Link> : <Link href="/register" className="mt-4 inline-flex text-xs font-medium text-accent hover:text-white">Create your account →</Link>}</div><div className="px-1 text-[11px] leading-5 text-white/30">FrameVerse · Every frame has a story.</div></div></aside>
      </div>
      <nav className="mobile-nav fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-white/[.08] bg-ink/95 px-2 pb-[max(env(safe-area-inset-bottom),10px)] pt-2 backdrop-blur-xl lg:hidden">{links.map(({ label, href, Icon }) => { const active = href === "/" ? pathname === "/" : pathname.startsWith(href); return <Link key={href} href={href} className={`flex min-w-12 flex-col items-center gap-1 px-1 text-[10px] ${active ? "text-accent" : "text-white/40"}`}><Icon size={19} />{label === "Upload photo" ? "Upload" : label}</Link>; })}</nav>
    </main>
  </>;
}
