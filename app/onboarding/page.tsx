import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export default function OnboardingPage() {
  return <AppShell title="Set up your profile"><section className="mx-auto max-w-2xl rounded-3xl border border-white/[.08] bg-panel px-6 py-12 text-center sm:px-12"><p className="text-xs font-medium uppercase tracking-[.2em] text-accent">Make it yours</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">Set up your profile.</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">Add a name, username, bio, and location so the community can discover you and your photographs.</p><Link href="/profile" className="primary-button mt-7 px-5">Open my profile</Link></section></AppShell>;
}
