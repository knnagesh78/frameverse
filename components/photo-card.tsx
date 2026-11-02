"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { addDoc, collection, deleteDoc, doc, getDoc, limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc } from "firebase/firestore";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Share2, Star } from "lucide-react";
import { firestore } from "@/lib/firebase";
import { notifyUser } from "@/lib/notifications";
import { useAuth } from "@/components/auth-provider";

export type PhotoPost = {
  id: string; ownerId: string; username?: string; authorName?: string;
  image?: { data: string; contentType?: string; width?: number; height?: number }; imageUrl?: string;
  title?: string; caption?: string; category?: string; city?: string; country?: string; allowComments?: boolean;
};
type CommentItem = { id: string; authorName?: string; username?: string; body: string };

export function PhotoCard({ photo }: { photo: PhotoPost }) {
  const { user } = useAuth();
  const canInteract = Boolean(user);
  const [liked, setLiked] = useState(false); const [saved, setSaved] = useState(false); const [myRating, setMyRating] = useState(0);
  const [likeCount, setLikeCount] = useState(0); const [ratingCount, setRatingCount] = useState(0); const [ratingAverage, setRatingAverage] = useState(0); const [viewCount, setViewCount] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false); const [comments, setComments] = useState<CommentItem[]>([]); const [comment, setComment] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!firestore) return;
    const unsubLikes = onSnapshot(collection(firestore, "photos", photo.id, "likes"), snap => setLikeCount(snap.size));
    const unsubRatings = onSnapshot(collection(firestore, "photos", photo.id, "ratings"), snap => { setRatingCount(snap.size); setRatingAverage(snap.size ? snap.docs.reduce((total, item) => total + Number(item.data().value || 0), 0) / snap.size : 0); });
    const unsubViews = onSnapshot(collection(firestore, "photos", photo.id, "views"), snap => setViewCount(snap.size));
    if (!user) return () => { unsubLikes(); unsubRatings(); unsubViews(); };
    const unsubLike = onSnapshot(doc(firestore, "photos", photo.id, "likes", user.uid), snap => setLiked(snap.exists()));
    const unsubSave = onSnapshot(doc(firestore, "savedPhotos", `${user.uid}_${photo.id}`), snap => setSaved(snap.exists()));
    const unsubRating = onSnapshot(doc(firestore, "photos", photo.id, "ratings", user.uid), snap => setMyRating((snap.data()?.value as number) || 0));
    return () => { unsubLikes(); unsubRatings(); unsubViews(); unsubLike(); unsubSave(); unsubRating(); };
  }, [photo.id, user]);

  useEffect(() => {
    const database = firestore;
    const currentUser = user;
    const card = cardRef.current;
    if (!database || !currentUser || !card || !("IntersectionObserver" in window)) return;
    let recorded = false;
    const observer = new IntersectionObserver(entries => {
      if (recorded || !entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.65)) return;
      recorded = true;
      const viewRef = doc(database, "photos", photo.id, "views", currentUser.uid);
      void runTransaction(database, async transaction => {
        const existing = await transaction.get(viewRef);
        if (!existing.exists()) transaction.set(viewRef, { viewerId: currentUser.uid, createdAt: serverTimestamp() });
      }).catch(() => {});
    }, { threshold: [0.65] });
    observer.observe(card);
    return () => observer.disconnect();
  }, [photo.id, user]);

  useEffect(() => {
    if (!commentsOpen || !firestore) return;
    return onSnapshot(query(collection(firestore, "photos", photo.id, "comments"), orderBy("createdAt", "desc"), limit(40)), snap => setComments(snap.docs.map(item => ({ id: item.id, ...item.data() } as CommentItem))));
  }, [commentsOpen, photo.id]);

  async function toggleLike() {
    if (!canInteract || !user) return;
    if (!firestore) return;
    const likeRef = doc(firestore, "photos", photo.id, "likes", user.uid);
    try {
      if (liked) await deleteDoc(likeRef);
      else {
        await setDoc(likeRef, { userId: user.uid, createdAt: serverTimestamp() });
        try { await notifyUser(photo.ownerId, user.uid, user.displayName || "A FrameVerse member", { type: "photo_like", photoId: photo.id }); }
        catch { setError("Your like was saved, but the photographer couldn't be notified."); }
      }
    }
    catch { setError("Like couldn't be saved. Check your Firestore rules and try again."); }
  }
  async function toggleSave() {
    if (!canInteract || !user) return;
    if (!firestore) return;
    const saveRef = doc(firestore, "savedPhotos", `${user.uid}_${photo.id}`);
    try { if (saved) await deleteDoc(saveRef); else await setDoc(saveRef, { userId: user.uid, photoId: photo.id, ownerId: photo.ownerId, createdAt: serverTimestamp() }); }
    catch { setError("This photo couldn't be saved. Check your Firestore rules and try again."); }
  }
  async function rate(value: number) {
    if (!canInteract || !user) return;
    if (!firestore) return;
    try { await setDoc(doc(firestore, "photos", photo.id, "ratings", user.uid), { userId: user.uid, value, updatedAt: serverTimestamp() }); }
    catch { setError("Your rating couldn't be saved. Check your Firestore rules and try again."); }
  }
  async function sendComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!canInteract || !user || !firestore || !comment.trim()) return;
    setBusy(true); setError("");
    try {
      const profile = await getDoc(doc(firestore, "photographerProfiles", user.uid));
      const commentRef = await addDoc(collection(firestore, "photos", photo.id, "comments"), { userId: user.uid, authorName: user.displayName || "FrameVerse member", username: profile.data()?.username || "", body: comment.trim(), createdAt: serverTimestamp() });
      setComment("");
      try { await notifyUser(photo.ownerId, user.uid, user.displayName || "A FrameVerse member", { type: "photo_comment", photoId: photo.id, commentId: commentRef.id }); }
      catch { setError("Your comment was posted, but the photographer couldn't be notified."); }
    }
    catch { setError("Your comment couldn't be posted. Check your Firestore rules and try again."); }
    finally { setBusy(false); }
  }
  async function share() {
    const url = `${window.location.origin}/photo/${photo.id}`;
    try { if (navigator.share) await navigator.share({ title: photo.title || "FrameVerse photograph", url }); else { await navigator.clipboard.writeText(url); setError("Photo link copied to clipboard."); } }
    catch { /* The share sheet may be dismissed by the user. */ }
  }

  return <article ref={cardRef} className="overflow-hidden rounded-3xl border border-white/[.08] bg-panel">
    <div className="relative min-h-[480px] bg-black sm:min-h-[580px]">
      <img onDoubleClick={toggleLike} src={photo.image?.data || photo.imageUrl || ""} alt={photo.title || "Photograph shared on FrameVerse"} className="absolute inset-0 size-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/20" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4 sm:p-6">
        {photo.ownerId === "guest" ? <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/25 py-1.5 pl-1.5 pr-4 backdrop-blur-md"><span className="grid size-9 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent">{(photo.authorName || "G").slice(0, 1).toUpperCase()}</span><span><span className="block text-sm font-medium text-white">{photo.authorName || "Guest photographer"}</span><span className="block text-[11px] text-white/60">Guest photographer</span></span></div> : photo.username ? <Link href={`/photographer/${encodeURIComponent(photo.username)}`} className="flex items-center gap-3 rounded-full border border-white/15 bg-black/25 py-1.5 pl-1.5 pr-4 backdrop-blur-md"><span className="grid size-9 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent">{(photo.authorName || "P").slice(0, 1).toUpperCase()}</span><span><span className="block text-sm font-medium text-white">{photo.authorName || "Photographer"}</span><span className="block text-[11px] text-white/60">@{photo.username}</span></span></Link> : <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/25 py-1.5 pl-1.5 pr-4 backdrop-blur-md"><span className="grid size-9 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-accent">{(photo.authorName || "P").slice(0, 1).toUpperCase()}</span><span><span className="block text-sm font-medium text-white">{photo.authorName || "Photographer"}</span><span className="block text-[11px] text-white/60">FrameVerse member</span></span></div>}
        <span className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[11px] text-white/80 backdrop-blur-md">{photo.category || "Photography"}</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-4 p-5 sm:p-7">
        <div className="max-w-[80%]"><p className="text-2xl font-medium tracking-tight text-white">{photo.title || "Untitled frame"}</p>{photo.caption && <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/75">{photo.caption}</p>} {(photo.city || photo.country) && <p className="mt-3 text-xs text-white/60">{[photo.city, photo.country].filter(Boolean).join(", ")}</p>}</div>
        <div className="flex shrink-0 flex-col items-center gap-4">
          <button disabled={!canInteract} onClick={toggleLike} title={canInteract ? "Like photo" : "Sign in to like photos"} className={`flex flex-col items-center gap-1 text-xs ${liked ? "text-rose-400" : "text-white"} disabled:cursor-not-allowed disabled:opacity-55`} aria-label={liked ? "Unlike photo" : "Like photo"}><Heart size={23} fill={liked ? "currentColor" : "none"} />{likeCount}</button>
          <button onClick={() => setCommentsOpen(value => !value)} className="flex flex-col items-center gap-1 text-xs text-white" aria-label="Open comments"><MessageCircle size={22} />{comments.length || "Comment"}</button>
          <button disabled={!canInteract} onClick={toggleSave} title={canInteract ? "Save photo" : "Sign in to save photos"} className={`text-white disabled:cursor-not-allowed disabled:opacity-55 ${saved ? "text-accent" : ""}`} aria-label={saved ? "Remove saved photo" : "Save photo"}><Bookmark size={21} fill={saved ? "currentColor" : "none"} /></button>
          <button onClick={share} className="text-white" aria-label="Share photo"><Share2 size={20} /></button>
        </div>
      </div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[.07] px-5 py-4 sm:px-7">
      <div><p className="text-[11px] uppercase tracking-[.16em] text-white/40">Community photo rating</p><div className="mt-1 flex items-center gap-1">{[1,2,3,4,5].map(value => <button key={value} disabled={!canInteract} onClick={() => rate(value)} title={canInteract ? `Rate ${value} stars` : "Sign in to rate photos"} aria-label={`Rate ${value} stars`} className={`disabled:cursor-not-allowed disabled:opacity-55 ${value <= myRating ? "text-amber-300" : "text-white/25"}`}><Star size={15} fill={value <= myRating ? "currentColor" : "none"} /></button>)}<span className="ml-2 text-xs text-white/45">{ratingCount ? `${ratingAverage.toFixed(1)} · ${ratingCount} rating${ratingCount === 1 ? "" : "s"}` : "Be the first to rate"}{myRating ? ` · yours ${myRating}/5` : ""}</span></div></div>
      <span className="flex items-center gap-2 text-xs text-white/35"><MoreHorizontal size={15} /> {viewCount} views · Photo appreciation, not a service review</span>
    </div>
    {error && <p role="status" className="px-5 pb-3 text-xs text-amber-200">{error}</p>}
    {commentsOpen && <section className="border-t border-white/[.07] p-5 sm:px-7"><h3 className="text-sm font-medium">Conversation on this frame</h3>{photo.allowComments === false ? <p className="mt-3 text-sm text-muted">Comments are turned off for this photo.</p> : <>
      {canInteract ? <form onSubmit={sendComment} className="mt-4 flex gap-2"><input value={comment} onChange={event => setComment(event.target.value)} maxLength={1000} placeholder="Add a thoughtful comment…" className="field h-11" /><button disabled={busy || !comment.trim()} className="rounded-xl bg-accent px-4 text-sm font-semibold text-ink disabled:opacity-40">Post</button></form> : <p className="mt-3 text-xs text-muted">Sign in to comment.</p>}
      <div className="mt-4 max-h-72 space-y-4 overflow-y-auto">{comments.length ? comments.map(item => <div key={item.id}><p className="text-sm font-medium">{item.authorName || "FrameVerse member"}<span className="ml-2 text-xs font-normal text-white/35">@{item.username || "member"}</span></p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/70">{item.body}</p></div>) : <p className="text-sm text-muted">No comments yet. Start the conversation.</p>}</div>
    </>}</section>}
  </article>;
}
