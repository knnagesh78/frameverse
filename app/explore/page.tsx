"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Camera, Compass, LoaderCircle, Search, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PhotoCard, type PhotoPost } from "@/components/photo-card";
import { firestore } from "@/lib/firebase";

type Photographer = { uid: string; username?: string; displayName?: string; bio?: string; city?: string; country?: string; interests?: string[] };
const categories = ["All work", "Nature", "Portraits", "Travel", "Street", "Wildlife", "Weddings", "Architecture", "Fashion", "Food", "Events"];

export default function ExplorePage() {
  const [search, setSearch] = useState(""); const [category, setCategory] = useState("All work"); const [photographers, setPhotographers] = useState<Photographer[]>([]); const [photos, setPhotos] = useState<PhotoPost[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    if (!firestore) return;
    const stopUsers = onSnapshot(query(collection(firestore, "photographerProfiles"), where("role", "==", "photographer"), limit(100)), snap => setPhotographers(snap.docs.map(item => ({ uid: item.id, ...item.data() } as Photographer))), () => setError("Photographer discovery couldn't load. Check Firestore access."));
    const stopPhotos = onSnapshot(query(collection(firestore, "photos"), where("visibility", "==", "public"), orderBy("createdAt", "desc"), limit(40)), snap => { setPhotos(snap.docs.map(item => ({ id: item.id, ...item.data() } as PhotoPost))); setLoading(false); }, () => { setError("Recent photographs couldn't load. Check Firestore access."); setLoading(false); });
    return () => { stopUsers(); stopPhotos(); };
  }, []);

  const q = search.trim().toLowerCase();
  const filteredPhotographers = useMemo(() => photographers.filter(person => (!q || [person.displayName, person.username, person.bio, person.city, person.country, ...(person.interests || [])].some(value => value?.toLowerCase().includes(q)))), [photographers, q]);
  const filteredPhotos = useMemo(() => photos.filter(photo => (category === "All work" || photo.category?.toLowerCase() === category.toLowerCase()) && (!q || [photo.title, photo.caption, photo.category, photo.city, photo.country, photo.authorName, photo.username].some(value => value?.toLowerCase().includes(q)))), [photos, category, q]);

  return <AppShell title="Explore photographers and their work"><div className="mx-auto max-w-[1000px]">
    <div className="mb-7"><p className="text-xs font-medium uppercase tracking-[.2em] text-accent">Talent without borders</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">Explore the work.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Find photographers through the photographs and styles they share.</p></div>
    <label className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-panel px-4 text-white/45"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Photographer, username, place, or style" className="size-full bg-transparent text-sm text-white outline-none placeholder:text-white/30" /></label>
    <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-medium"><Users size={18} className="text-accent" /> Photographers</h2><span className="text-xs text-white/40">{filteredPhotographers.length} profiles</span></div>
      {filteredPhotographers.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filteredPhotographers.map(person => <Link key={person.uid} href={`/photographer/${encodeURIComponent(person.username || person.uid)}`} className="rounded-2xl border border-white/[.08] bg-panel p-5 transition hover:border-accent/30"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-accent/10 font-semibold text-accent">{(person.displayName || "P").slice(0,1).toUpperCase()}</span><span className="min-w-0"><span className="block truncate font-medium">{person.displayName || "Photographer"}</span><span className="block truncate text-xs text-white/45">@{person.username || "creator"}</span></span></div><p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-muted">{person.bio || "A FrameVerse photographer sharing their perspective."}</p><p className="mt-4 text-xs text-white/40">{[person.city, person.country].filter(Boolean).join(", ") || "Location not shared"}</p></Link>)}</div> : <p className="rounded-2xl border border-white/[.07] p-6 text-sm text-muted">{q ? "No photographer profiles matched your search." : "New photographer profiles will appear here."}</p>}
    </section>
    <section className="mt-10"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-medium"><Camera size={18} className="text-accent" /> Recent photographs</h2><span className="text-xs text-white/40">{filteredPhotos.length} frames</span></div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">{categories.map(item => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full border px-3 py-2 text-xs ${category === item ? "border-accent/40 bg-accent/10 text-accent" : "border-white/10 text-white/50 hover:text-white"}`}>{item}</button>)}</div>
      {error && <p role="alert" className="mb-4 text-sm text-red-200">{error}</p>}
      {loading ? <div className="grid min-h-56 place-items-center text-muted"><LoaderCircle className="animate-spin text-accent" /></div> : filteredPhotos.length ? <div className="space-y-6">{filteredPhotos.map(photo => <PhotoCard key={photo.id} photo={photo} />)}</div> : <div className="rounded-2xl border border-white/[.07] p-8 text-center"><Compass size={24} className="mx-auto text-accent" /><p className="mt-3 text-sm text-white/65">No photos match those filters yet.</p><p className="mt-1 text-xs text-white/35">Try a different category or search term.</p></div>}
    </section>
  </div></AppShell>;
}
