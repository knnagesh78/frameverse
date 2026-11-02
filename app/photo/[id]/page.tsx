"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { PhotoCard, type PhotoPost } from "@/components/photo-card";
import { firestore } from "@/lib/firebase";

export default function PhotoDetailPage() {
  const params = useParams<{ id: string }>(); const id = params.id;
  const [photo, setPhoto] = useState<PhotoPost | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    if (!firestore || !id) return;
    getDoc(doc(firestore, "photos", id)).then(snapshot => { if (snapshot.exists()) setPhoto({ id: snapshot.id, ...snapshot.data() } as PhotoPost); else setError("This photograph isn't available."); }).catch(() => setError("This photograph couldn't be loaded.")).finally(() => setLoading(false));
  }, [id]);
  return <main className="min-h-screen bg-ink px-4 pb-14 text-white sm:px-8"><div className="mx-auto max-w-[780px]"><header className="flex h-[68px] items-center"><Link href="/explore" className="flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft size={17} /> Back to explore</Link></header>{loading ? <div className="grid min-h-80 place-items-center"><LoaderCircle className="animate-spin text-accent" /></div> : photo ? <PhotoCard photo={photo} /> : <div className="mt-12 rounded-2xl border border-white/[.08] p-8 text-center text-muted">{error}</div>}</div></main>;
}
