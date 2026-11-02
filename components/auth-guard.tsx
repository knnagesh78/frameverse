"use client";

import Link from "next/link";
import { Aperture } from "lucide-react";
import { AuthFrame } from "@/components/auth-frame";
import { useAuth } from "@/components/auth-provider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <main className="grid min-h-screen place-items-center bg-ink text-white"><span className="flex items-center gap-3 text-sm text-white/55"><Aperture className="animate-pulse text-accent" size={22} /> Checking your account…</span></main>;
  if (!user) return <AuthFrame eyebrow="Share your photography with the world"><section className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-ink"><Aperture size={25} /></span><h1 className="mt-6 text-3xl font-medium tracking-[-.04em]">Sign in to continue.</h1><p className="mt-3 text-sm leading-6 text-muted">Create a free account or sign in with your email and password. Public photos can be viewed by everyone.</p><div className="mt-7 grid gap-3"><Link href="/login" className="primary-button w-full">Sign in</Link><Link href="/register" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/10 px-5 text-sm text-white/75 hover:bg-white/[.04]">Create account</Link></div><Link href="/" className="mt-6 inline-block text-xs text-white/45 hover:text-white">Back to the public feed</Link></section></AuthFrame>;

  return children;
}
