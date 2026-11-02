"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { LoaderCircle, Mail } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { AuthFrame } from "@/components/auth-frame";
import { auth } from "@/lib/firebase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    if (!auth) { setError("Firebase is not configured. Check the app's Firebase settings."); setBusy(false); return; }
    try { await sendPasswordResetEmail(auth, email.trim()); setSent(true); }
    catch {
      setError("We couldn't send a reset email. Check the address and try again.");
    } finally { setBusy(false); }
  }

  return <AuthFrame eyebrow="Get back to your FrameVerse account"><div>
    <p className="text-xs font-medium uppercase tracking-[.2em] text-accent">Password help</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">Reset your password.</h1><p className="mt-3 text-sm leading-6 text-muted">Enter your account email and we’ll send you a reset link.</p>
    {sent ? <p role="status" className="mt-7 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100">If an account uses {email}, a password reset email is on its way. Check your inbox and spam folder.</p> : <form onSubmit={submit} className="mt-7 grid gap-5"><label className="text-sm text-white/75">Email address<span className="relative mt-2 block"><Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" /><input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="field pl-11" placeholder="you@example.com" /></span></label>{error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}<button disabled={busy} className="primary-button w-full">{busy && <LoaderCircle size={17} className="animate-spin" />}{busy ? "Sending…" : "Send reset link"}</button></form>}
    <p className="mt-6 text-sm text-white/50"><Link href="/login" className="font-medium text-accent hover:text-white">Back to sign in</Link></p>
  </div></AuthFrame>;
}
