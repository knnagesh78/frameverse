"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoaderCircle, Mail, LockKeyhole, UserRound } from "lucide-react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { AuthFrame } from "@/components/auth-frame";
import { auth } from "@/lib/firebase";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!auth) { setError("Firebase is not configured. Check the app's Firebase settings."); return; }
    if (password.length < 8) { setError("Choose a password with at least 8 characters."); return; }
    if (password !== confirm) { setError("The passwords don't match."); return; }
    setBusy(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      try { await updateProfile(credential.user, { displayName: name.trim() }); } catch { /* The signed-in member can still continue if the display name update is delayed. */ }
      router.replace("/");
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      setError(code === "auth/operation-not-allowed" || code === "auth/admin-restricted-operation" ? "Email/password sign-in is not enabled in Firebase Authentication yet."
        : code === "auth/email-already-in-use" ? "An account with this email already exists. Sign in instead."
        : code === "auth/weak-password" ? "That password is too easy to guess. Choose a stronger one."
        : code === "auth/invalid-email" ? "Enter a valid email address."
        : "We couldn't create your account. Check your connection and try again.");
    } finally { setBusy(false); }
  }

  return <AuthFrame eyebrow="A home for every frame"><div>
    <p className="text-xs font-medium uppercase tracking-[.2em] text-accent">Join the community</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">Create your account.</h1><p className="mt-3 text-sm leading-6 text-muted">Create an account and start sharing photographs with everyone.</p>
    <form onSubmit={submit} className="mt-7 grid gap-4">
      <label className="text-sm text-white/75">Name shown on your photos<span className="relative mt-2 block"><UserRound size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" /><input required maxLength={80} autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="field pl-11" placeholder="Your name" /></span></label>
      <label className="text-sm text-white/75">Email address<span className="relative mt-2 block"><Mail size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" /><input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="field pl-11" placeholder="you@example.com" /></span></label>
      <label className="text-sm text-white/75">Password<span className="relative mt-2 block"><LockKeyhole size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35" /><input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="field pl-11" placeholder="At least 8 characters" /></span></label>
      <label className="text-sm text-white/75">Confirm password<input required minLength={8} type="password" autoComplete="new-password" value={confirm} onChange={event => setConfirm(event.target.value)} className="field mt-2" placeholder="Enter your password again" /></label>
      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <button disabled={busy} className="primary-button mt-1 w-full">{busy && <LoaderCircle size={17} className="animate-spin" />}{busy ? "Creating account…" : "Create account"}</button>
    </form>
    <p className="mt-6 text-sm text-white/50">Already have an account? <Link href="/login" className="font-medium text-accent hover:text-white">Sign in</Link></p>
  </div></AuthFrame>;
}
