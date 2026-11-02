"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Camera, Compass, LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PhotoCard, type PhotoPost } from "@/components/photo-card";
import { firestore } from "@/lib/firebase";

function Feed() {
  const [photos, setPhotos] = useState<PhotoPost[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");

  useEffect(() => {
    if (!firestore) { setError("Firebase isn't configured yet. Add the web app settings to .env.local."); setLoading(false); return; }
    return onSnapshot(query(collection(firestore, "photos"), where("visibility", "==", "public"), orderBy("createdAt", "desc"), limit(30)), snapshot => {
      setPhotos(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PhotoPost))); setLoading(false); setError("");
    }, () => { setError("The photo feed couldn't load. Check your Firestore rules and connection."); setLoading(false); });
  }, []);

  return <AppShell title="A global home for photography">
    <div className="mx-auto max-w-[760px]">
      <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[.2em] text-accent">The community feed</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">A little more perspective.</h1></div><Link href="/explore" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs text-white/65 hover:border-accent/40 hover:text-white"><Compass size={15} /> Explore</Link></div>
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/[.06] p-4 text-sm text-red-100">{error}</p>}
      {loading ? <div className="grid min-h-80 place-items-center text-sm text-muted"><span className="flex items-center gap-3"><LoaderCircle size={18} className="animate-spin text-accent" /> Loading the latest frames…</span></div> : photos.length ? <div className="space-y-6">{photos.map(photo => <PhotoCard key={photo.id} photo={photo} />)}</div> : <div className="rounded-3xl border border-white/[.08] bg-[linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.012))] px-6 py-16 text-center sm:px-14"><div className="mx-auto grid size-14 place-items-center rounded-2xl border border-accent/20 bg-accent/[.08] text-accent"><Camera size={23} /></div><h2 className="mt-6 text-2xl font-medium tracking-tight">A fresh canvas.</h2><p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted">There are no public photos yet. Share your first frame or explore photographer profiles.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/upload" className="primary-button px-5"><Camera size={16} /> Publish a photo</Link><Link href="/explore" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/10 px-5 text-sm text-white/75 hover:bg-white/[.04]"><Compass size={16} /> Explore</Link></div></div>}
    </div>
  </AppShell>;
}

export default function HomePage() { return <Feed />; }
