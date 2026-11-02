"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Aperture, Check, LoaderCircle, UploadCloud } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { firestore } from "@/lib/firebase";

const categories = ["Nature", "Portraits", "Travel", "Street", "Wildlife", "Weddings", "Architecture", "Fashion", "Food", "Events", "Creative"];
const maxInlineImageBytes = 650 * 1024;

async function prepareImage(source: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(source);
  try {
    const maxSide = Math.max(bitmap.width, bitmap.height);
    const sizes = [1600, 1400, 1200, 1000, 800];
    const qualities = [0.84, 0.76, 0.68, 0.6, 0.52];
    for (const targetSide of sizes) {
      const scale = Math.min(1, targetSide / maxSide);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Image processing isn't available in this browser.");
      context.drawImage(bitmap, 0, 0, width, height);
      for (const quality of qualities) {
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", quality));
        if (blob?.type === "image/webp" && blob.size <= maxInlineImageBytes) return { blob, width, height };
      }
    }
    throw new Error("This photo is still too large after compression. Choose a smaller image and try again.");
  } finally { bitmap.close(); }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The photo couldn't be prepared for saving."));
    reader.onerror = () => reject(new Error("The photo couldn't be prepared for saving."));
    reader.readAsDataURL(blob);
  });
}

function UploadForm() {
  const { user } = useAuth();
  const [name, setName] = useState(""); const [username, setUsername] = useState(""); const [profileLoaded, setProfileLoaded] = useState(false); const [file, setFile] = useState<File | null>(null); const [preview, setPreview] = useState("");
  const [title, setTitle] = useState(""); const [caption, setCaption] = useState(""); const [category, setCategory] = useState(categories[0]); const [city, setCity] = useState(""); const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false); const [stage, setStage] = useState(""); const [error, setError] = useState(""); const [publishedId, setPublishedId] = useState("");

  useEffect(() => { if (user?.displayName) setName(user.displayName); }, [user]);
  useEffect(() => {
    if (!user || !firestore) { setProfileLoaded(true); return; }
    let active = true;
    setProfileLoaded(false);
    void getDoc(doc(firestore, "photographerProfiles", user.uid)).then(snapshot => {
      if (!active) return;
      if (snapshot.exists()) {
        const profile = snapshot.data();
        if (profile.username) setUsername(String(profile.username));
        if (profile.displayName) setName(String(profile.displayName));
        if (profile.city) setCity(String(profile.city));
        if (profile.country) setCountry(String(profile.country));
      }
      setProfileLoaded(true);
    }).catch(() => { if (active) setProfileLoaded(true); });
    return () => { active = false; };
  }, [user?.uid]);
  useEffect(() => { if (!file) { setPreview(""); return; } const url = URL.createObjectURL(file); setPreview(url); return () => URL.revokeObjectURL(url); }, [file]);

  function acceptFile(selected: File | undefined) {
    setError("");
    if (!selected) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(selected.type)) { setFile(null); setError("Choose a JPG, PNG, or WebP image."); return; }
    if (selected.size > 15 * 1024 * 1024) { setFile(null); setError("The original image must be 15 MB or smaller."); return; }
    setFile(selected);
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) { acceptFile(event.target.files?.[0]); }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (!user) { setError("Sign in to publish a photo."); return; }
    if (!name.trim()) { setError("Add the public name you want shown with your photo."); return; }
    if (!file || !firestore) { setError("Choose a photo and make sure Firebase is configured."); return; }
    setBusy(true); setStage("Preparing your photo…");
    const photoRef = doc(collection(firestore, "photos"));
    try {
      const prepared = await prepareImage(file);
      const imageData = await blobToDataUrl(prepared.blob);
      setStage("Saving the photo to FrameVerse…");
      await setDoc(photoRef, {
        ownerId: user.uid, username, authorName: name.trim(),
        image: { data: imageData, contentType: prepared.blob.type, width: prepared.width, height: prepared.height },
        title: title.trim(), caption: caption.trim(), category, city: city.trim(), country: country.trim(),
        allowComments: true, visibility: "public", createdAt: serverTimestamp(),
      });
      setPublishedId(photoRef.id);
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      setError(code === "permission-denied"
        ? "Firebase rejected this photo. Confirm that email/password sign-in is enabled and the updated Firestore rules are deployed."
        : cause instanceof Error ? cause.message : "Your photo couldn't be published. Check Firebase setup and try again.");
    } finally { setBusy(false); setStage(""); }
  }

  if (publishedId) return <AppShell title="Your photo is live"><div className="mx-auto max-w-2xl rounded-3xl border border-white/[.08] bg-panel px-6 py-14 text-center sm:px-12"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-ink"><Check size={25} /></span><p className="mt-6 text-xs font-medium uppercase tracking-[.2em] text-accent">Published publicly</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">Your photo is in the feed.</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">Your compressed image and photo details are saved together in Firestore. Everyone can view your public photo.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link href={`/photo/${publishedId}`} className="primary-button px-5">View photo</Link><Link href="/" className="inline-flex min-h-12 items-center rounded-xl border border-white/10 px-5 text-sm text-white/75 hover:bg-white/[.04]">Open feed</Link></div></div></AppShell>;

  return <AppShell title="Share a frame with the community"><div className="mx-auto max-w-3xl">
    <p className="text-xs font-medium uppercase tracking-[.2em] text-accent">Photo studio</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">Publish a photograph</h1><p className="mt-3 text-sm leading-6 text-muted">Your photo is re-encoded to remove embedded metadata and stored with its details as JSON in Firestore. It is public to everyone. Images are resized and compressed to fit Firestore’s document limit.</p>{profileLoaded && !username && <p className="mt-4 rounded-xl border border-accent/15 bg-accent/[.05] px-4 py-3 text-sm text-white/65">Create your profile first to link this photo to your public profile. <Link href="/profile" className="font-medium text-accent hover:text-white">Set up profile →</Link></p>}
    <form onSubmit={publish} className="mt-7 grid gap-6 rounded-3xl border border-white/[.08] bg-panel p-5 sm:p-8">
      <label onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); acceptFile(event.dataTransfer.files?.[0]); }} className="group relative grid min-h-64 cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-white/15 bg-black/20 text-center hover:border-accent/45">{preview ? <><img src={preview} alt="Selected photo preview" className="absolute inset-0 size-full object-contain" /><span className="absolute bottom-3 rounded-full bg-black/70 px-4 py-2 text-xs text-white">Choose a different photo</span></> : <span className="px-5"><span className="mx-auto grid size-12 place-items-center rounded-2xl border border-accent/20 bg-accent/[.08] text-accent"><UploadCloud size={22} /></span><span className="mt-4 block text-sm font-medium">Drop a photo here or browse</span><span className="mt-2 block text-xs text-white/40">JPG, PNG, or WebP · original up to 15 MB</span></span>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Choose a photo" /></label>
      <p className="-mt-3 text-xs leading-5 text-white/35">The stored WebP image is kept below 650 KB so the photo document stays below Firestore’s 1 MiB limit. Large originals are resized and compressed automatically.</p>
      <label className="text-sm text-white/75">Public display name<input required maxLength={80} value={name} onChange={event => setName(event.target.value)} className="field mt-2" placeholder="Name shown with your photo" /></label>
      <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm text-white/75">Title<input required maxLength={140} value={title} onChange={event => setTitle(event.target.value)} className="field mt-2" placeholder="Give this frame a name" /></label><label className="text-sm text-white/75">Category<select value={category} onChange={event => setCategory(event.target.value)} className="field mt-2">{categories.map(item => <option key={item}>{item}</option>)}</select></label></div>
      <label className="text-sm text-white/75">Caption<textarea maxLength={1500} value={caption} onChange={event => setCaption(event.target.value)} className="field mt-2 h-28 resize-y py-3" placeholder="Share the story or details behind the shot…" /></label>
      <div className="grid gap-5 sm:grid-cols-2"><label className="text-sm text-white/75">City (optional)<input maxLength={80} value={city} onChange={event => setCity(event.target.value)} className="field mt-2" /></label><label className="text-sm text-white/75">Country (optional)<input maxLength={80} value={country} onChange={event => setCountry(event.target.value)} className="field mt-2" /></label></div>
      {busy && <p role="status" className="text-sm text-white/55">{stage}</p>}
      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
      <button disabled={busy || !file} className="primary-button w-full">{busy ? <><LoaderCircle size={18} className="animate-spin" /> Saving…</> : <><Aperture size={17} /> Publish publicly</>}</button>
    </form>
  </div></AppShell>;
}

export default function UploadPage() {
  return <AuthGuard><UploadForm /></AuthGuard>;
}
