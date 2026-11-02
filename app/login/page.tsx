"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Mail, LockKeyhole } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { AuthFrame } from "@/components/auth-frame";
import { useAuth } from "@/components/auth-provider";
import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");

  useEffect(() => { if (user) router.replace("/"); }, [user, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    if (!auth) { setError("Firebase is not configured. Check the app's Firebase settings."); setBusy(false); return; }
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/");
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      setError(code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password"
        ? "That email and password combination wasn't recognized."
        : code === "auth/operation-not-allowed" || code === "auth/admin-restricted-operation" ? "Email/password sign-in is not enabled in Firebase Authentication yet."
        : code === "auth/too-many-requests" ? "Too many attempts. Wait a little, then try again."
        : "We couldn't sign you in. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  return <AuthFrame eyebrow="Welcome back to FrameVerse"><div>
    <p className="text-xs font-medium uppercase tracking-[.2em] text-accent">Your photography community</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">Sign in.</h1><p className="mt-3 text-sm leading-6 text-muted">Sign in with your registered email and password.</p>
    <form onSubmit={submit} className="mt-7 grid gap-5">
      <label className="text-sm text-white/75">Email address<span className="relative mt-2 block"><Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" /><input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="field pl-11" placeholder="you@example.com" /></span></label>
      <label className="text-sm text-white/75">Password<span className="relative mt-2 block"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" /><input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} className="field pl-11" placeholder="Your password" /></span></label>
      <div className="-mt-2 text-right"><Link href="/reset-password" className="text-xs text-accent hover:text-white">Forgot password?</Link></div>
      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <button disabled={busy} className="primary-button w-full">{busy && <LoaderCircle size={17} className="animate-spin" />}{busy ? "Signing in…" : "Sign in"}</button>
    </form>
    <p className="mt-6 text-sm text-white/50">New to FrameVerse? <Link href="/register" className="font-medium text-accent hover:text-white">Create an account</Link></p>
    <Link href="/" className="mt-5 inline-block text-xs text-white/35 hover:text-white">Browse public photos</Link>
  </div></AuthFrame>;
}
