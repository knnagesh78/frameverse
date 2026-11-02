"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Bookmark, LoaderCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/components/auth-provider";
import { PhotoCard, type PhotoPost } from "@/components/photo-card";
import { firestore } from "@/lib/firebase";

function SavedPhotos() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<PhotoPost[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");

  useEffect(() => {
    const database = firestore;
    if (!database || !user) { setLoading(false); return; }
    let active = true;
    const stop = onSnapshot(query(collection(database, "savedPhotos"), where("userId", "==", user.uid), orderBy("createdAt", "desc"), limit(40)), async snapshot => {
      try {
        const saved = await Promise.all(snapshot.docs.map(async item => {
          const photoSnapshot = await getDoc(doc(database, "photos", item.data().photoId as string));
          return photoSnapshot.exists() && photoSnapshot.data().visibility === "public"
            ? { id: photoSnapshot.id, ...photoSnapshot.data() } as PhotoPost
            : null;
        }));
        if (active) { setPhotos(saved.filter((photo): photo is PhotoPost => photo !== null)); setError(""); setLoading(false); }
      } catch { if (active) { setError("Your saved photos couldn't load. Check your Firestore rules."); setLoading(false); } }
    }, () => { if (active) { setError("Your saved photos couldn't load. Check your Firestore rules."); setLoading(false); } });
    return () => { active = false; stop(); };
  }, [user]);

  return <AppShell title="Your saved photographs"><div className="mx-auto max-w-[760px]"><p className="text-xs font-medium uppercase tracking-[.2em] text-accent">Your collection</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">Saved photographs.</h1><p className="mt-3 text-sm leading-6 text-muted">Photos you bookmark are collected here.</p>{error && <p role="alert" className="mt-5 text-sm text-red-200">{error}</p>}{loading ? <div className="grid min-h-64 place-items-center text-muted"><LoaderCircle className="animate-spin text-accent" /></div> : photos.length ? <div className="mt-7 space-y-6">{photos.map(photo => <PhotoCard key={photo.id} photo={photo} />)}</div> : <div className="mt-7 rounded-3xl border border-white/[.08] bg-panel px-6 py-14 text-center"><Bookmark size={24} className="mx-auto text-accent" /><h2 className="mt-4 text-xl font-medium">Nothing saved yet.</h2><p className="mt-2 text-sm text-muted">Browse the public feed and bookmark photographs you want to revisit.</p><Link href="/explore" className="primary-button mt-6 px-5">Explore photos</Link></div>}</div></AppShell>;
}

export default function SavedPage() {
  return <AuthGuard><SavedPhotos /></AuthGuard>;
}
