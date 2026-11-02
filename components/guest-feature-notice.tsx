import Link from "next/link";
import { Aperture, Compass } from "lucide-react";
import { AppShell } from "@/components/app-shell";

export function GuestFeatureNotice({ title, description }: { title: string; description: string }) {
  return <AppShell title="FrameVerse community">
    <section className="mx-auto max-w-2xl rounded-3xl border border-white/[.08] bg-panel px-6 py-14 text-center sm:px-12">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-accent/20 bg-accent/[.08] text-accent"><Aperture size={24} /></span>
      <p className="mt-6 text-xs font-medium uppercase tracking-[.2em] text-accent">Coming soon</p>
      <h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{description}</p>
      <Link href="/explore" className="primary-button mt-7 px-5"><Compass size={16} /> Explore photographers</Link>
    </section>
  </AppShell>;
}
