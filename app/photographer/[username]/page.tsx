"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { collection, deleteDoc, doc, getDoc, limit, onSnapshot, orderBy, query, setDoc, where, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Camera, Check, LoaderCircle, MapPin, MessageCircle, Share2, UserPlus } from "lucide-react";
import { PhotoCard, type PhotoPost } from "@/components/photo-card";
import { useAuth } from "@/components/auth-provider";
import { firestore } from "@/lib/firebase";
import { getOrCreateConversation } from "@/lib/messaging";
import { notifyUser } from "@/lib/notifications";

type Profile = { uid: string; username?: string; displayName?: string; bio?: string; city?: string; country?: string; interests?: string[]; role?: string };

export default function PhotographerProfilePage() {
  const params = useParams<{ username: string }>(); const requested = decodeURIComponent(params.username || ""); const handle = requested.toLowerCase();
  const { user } = useAuth(); const canInteract = Boolean(user); const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null); const [photos, setPhotos] = useState<PhotoPost[]>([]); const [followerCount, setFollowerCount] = useState(0); const [followingCount, setFollowingCount] = useState(0); const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");

  useEffect(() => {
    if (!firestore || !handle) return;
    let stopPhotos: (() => void) | undefined;
    let stopFollowers: (() => void) | undefined;
    let stopFollowing: (() => void) | undefined;
    let stopRelationship: (() => void) | undefined;
    let canceled = false;
    async function load() {
      try {
        const named = await getDoc(doc(firestore!, "usernames", handle));
        const uid = named.exists() ? named.data().uid as string : requested;
        const person = await getDoc(doc(firestore!, "photographerProfiles", uid));
        if (canceled || !person.exists()) { if (!canceled) { setError("This photographer profile could not be found."); setLoading(false); } return; }
        const data = { uid, ...person.data() } as Profile; setProfile(data);
        stopPhotos = onSnapshot(query(collection(firestore!, "photos"), where("ownerId", "==", uid), where("visibility", "==", "public"), orderBy("createdAt", "desc"), limit(60)), snap => { setPhotos(snap.docs.map(item => ({ id: item.id, ...item.data() } as PhotoPost))); setLoading(false); }, () => { setError("The portfolio couldn't load. Check Firestore access."); setLoading(false); });
        stopFollowers = onSnapshot(query(collection(firestore!, "follows"), where("followingId", "==", uid)), snap => setFollowerCount(snap.size));
        stopFollowing = onSnapshot(query(collection(firestore!, "follows"), where("followerId", "==", uid)), snap => setFollowingCount(snap.size));
        if (user && user.uid !== uid) stopRelationship = onSnapshot(doc(firestore!, "follows", `${user.uid}_${uid}`), snap => setIsFollowing(snap.exists()));
      } catch { if (!canceled) { setError("This photographer profile couldn't be opened."); setLoading(false); } }
    }
    void load();
    return () => { canceled = true; stopPhotos?.(); stopFollowers?.(); stopFollowing?.(); stopRelationship?.(); };
  }, [handle, user]);

  async function follow() {
    if (!profile || !firestore) return;
    if (!user) { setError("Sign in to follow photographers."); return; }
    if (user.uid === profile.uid) return;
    setBusy(true); setError(""); const followRef = doc(firestore, "follows", `${user.uid}_${profile.uid}`);
    try {
      if (isFollowing) await deleteDoc(followRef);
      else {
        await setDoc(followRef, { followerId: user.uid, followingId: profile.uid, createdAt: serverTimestamp() });
        try { await notifyUser(profile.uid, user.uid, user.displayName || "A FrameVerse member", { type: "new_follower" }); }
        catch { setError("Follow saved, but the photographer couldn't be notified."); }
      }
    }
    catch { setError("Follow couldn't be updated. Check Firestore rules and try again."); }
    finally { setBusy(false); }
  }
  async function message() {
    if (!profile) return;
    if (!user) { setError("Sign in to message photographers."); return; }
    try { const conversationId = await getOrCreateConversation(user.uid, profile.uid); router.push(`/messages/${conversationId}`); }
    catch { setError("A conversation couldn't be started. Check your Firestore rules."); }
  }
  async function share() {
    const url = window.location.href;
    try { if (navigator.share) await navigator.share({ title: profile?.displayName || "FrameVerse photographer", url }); else { await navigator.clipboard.writeText(url); setError("Profile link copied to clipboard."); } } catch { /* Share panel dismissed. */ }
  }

  return <main className="min-h-screen bg-ink text-white">
    <header className="mx-auto flex h-[68px] max-w-[1200px] items-center justify-between px-5 sm:px-8"><Link href="/explore" className="flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft size={17} /> Explore</Link><span className="text-sm font-semibold tracking-tight">frameverse<span className="text-accent">.</span></span><button onClick={share} className="icon-button" aria-label="Share profile"><Share2 size={17} /></button></header>
    <div className="mx-auto max-w-[1200px] px-5 pb-16 sm:px-8">
      {loading && !profile ? <div className="grid min-h-80 place-items-center"><LoaderCircle className="animate-spin text-accent" /></div> : error && !profile ? <div className="mt-12 rounded-2xl border border-white/[.08] p-8 text-center text-muted">{error}</div> : profile && <>
        <section className="relative mt-3 overflow-hidden rounded-3xl border border-white/[.08] bg-panel"><div className="h-48 bg-[radial-gradient(ellipse_at_75%_30%,rgba(184,255,103,.18),transparent_35%),linear-gradient(115deg,#17191e,#24262d_60%,#121318)] sm:h-64" /><div className="px-5 pb-6 sm:px-9 sm:pb-9"><div className="-mt-12 flex flex-col gap-5 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between"><div className="flex items-end gap-4"><span className="grid size-24 place-items-center rounded-3xl border-4 border-panel bg-accent/10 text-3xl font-semibold text-accent sm:size-28">{(profile.displayName || "P").slice(0,1).toUpperCase()}</span><div className="pb-1"><p className="text-2xl font-medium tracking-tight sm:text-3xl">{profile.displayName || "Photographer"}</p><p className="mt-1 text-sm text-white/45">@{profile.username || handle}</p></div></div><div className="flex gap-2 sm:pb-1">{canInteract ? <><button onClick={message} className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-white/80 hover:bg-white/[.04]"><MessageCircle size={16} /> Message</button>{user && user.uid !== profile.uid && <button disabled={busy} onClick={follow} className={`inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ${isFollowing ? "border border-white/10 text-white/80" : "bg-accent text-ink"}`}>{isFollowing ? <Check size={16} /> : <UserPlus size={16} />}{isFollowing ? "Following" : "Follow"}</button>}</> : <Link href="/login" className="self-center text-xs text-accent hover:text-white">Sign in to follow or message.</Link>}</div></div>
          <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-white/70">{profile.bio || "A photographer sharing their perspective with the FrameVerse community."}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/45"><span className="flex items-center gap-1.5"><MapPin size={14} />{[profile.city, profile.country].filter(Boolean).join(", ") || "Location not shared"}</span><span><b className="text-white">{followerCount}</b> followers</span><span><b className="text-white">{followingCount}</b> following</span><span><b className="text-white">{photos.length}</b> photos</span></div>
          {profile.interests?.length ? <div className="mt-5 flex flex-wrap gap-2">{profile.interests.map(item => <span key={item} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55">{item}</span>)}</div> : null}
        </div></section>
        {error && <p role="status" className="mt-4 text-sm text-amber-200">{error}</p>}
        <div className="mb-5 mt-10 flex items-center justify-between"><h2 className="flex items-center gap-2 text-xl font-medium"><Camera size={19} className="text-accent" /> Portfolio</h2><span className="text-xs text-white/40">{photos.length} photographs</span></div>
        {photos.length ? <div className="grid gap-6">{photos.map(photo => <PhotoCard key={photo.id} photo={photo} />)}</div> : <div className="rounded-2xl border border-white/[.08] px-6 py-12 text-center"><Camera size={23} className="mx-auto text-white/35" /><p className="mt-4 text-sm text-white/65">No public photographs yet.</p></div>}
      </>}
    </div>
  </main>;
}
