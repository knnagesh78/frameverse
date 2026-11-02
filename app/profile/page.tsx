"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, where, writeBatch } from "firebase/firestore";
import { ArrowUpRight, Camera, Check, Eye, Heart, ImagePlus, LoaderCircle, MapPin, MessageCircle, Pencil, Save, Trash2, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AuthGuard } from "@/components/auth-guard";
import { PhotoCard, type PhotoInteractionStats, type PhotoPost } from "@/components/photo-card";
import { useAuth } from "@/components/auth-provider";
import { firestore } from "@/lib/firebase";

type ProfileDraft = {
  displayName: string;
  username: string;
  bio: string;
  city: string;
  country: string;
  role: "photographer" | "viewer";
  interests: string[];
  photoURL: string;
};

const suggestedUsername = (name: string, email: string | null, uid: string) => {
  const base = (name || email?.split("@")[0] || "frameverse")
    .toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 17) || "frameverse";
  return `${base}_${uid.slice(0, 5).toLowerCase()}`.slice(0, 24);
};

async function compressProfilePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const left = (bitmap.width - side) / 2;
    const top = (bitmap.height - side) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Profile photo editing isn't available in this browser.");
    context.drawImage(bitmap, left, top, side, side, 0, 0, canvas.width, canvas.height);

    let compressed: Blob | null = null;
    for (const quality of [0.82, 0.72, 0.62, 0.52]) {
      compressed = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/webp", quality));
      if (compressed?.type === "image/webp" && compressed.size <= 100 * 1024) break;
    }
    if (!compressed || compressed.type !== "image/webp" || compressed.size > 100 * 1024) {
      throw new Error("This profile photo is too large after compression. Choose another image and try again.");
    }

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("The profile photo couldn't be prepared."));
      reader.onerror = () => reject(new Error("The profile photo couldn't be prepared."));
      reader.readAsDataURL(compressed);
    });
  } finally { bitmap.close(); }
}

function ProfileDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileDraft | null>(null);
  const [persistedUsername, setPersistedUsername] = useState("");
  const [interestText, setInterestText] = useState("");
  const [profileReady, setProfileReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [photos, setPhotos] = useState<PhotoPost[]>([]);
  const [photoStats, setPhotoStats] = useState<Record<string, PhotoInteractionStats>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const database = firestore;
    if (!user || !database) {
      setProfileLoading(false);
      setPhotosLoading(false);
      if (user && !database) setError("Your profile couldn't connect to FrameVerse. Check your connection and try again.");
      return;
    }

    let active = true;
    const loadProfile = async () => {
      try {
        const [accountSnapshot, publicSnapshot] = await Promise.all([
          getDoc(doc(database, "users", user.uid)),
          getDoc(doc(database, "photographerProfiles", user.uid)),
        ]);
        if (!active) return;
        const account = accountSnapshot.data() || {};
        const publicProfile = publicSnapshot.data() || {};
        const combined = { ...account, ...publicProfile };
        const nextProfile: ProfileDraft = {
          displayName: String(combined.displayName || user.displayName || user.email?.split("@")[0] || "FrameVerse member"),
          username: String(combined.username || suggestedUsername(user.displayName || "", user.email, user.uid)),
          bio: String(combined.bio || ""),
          city: String(combined.city || ""),
          country: String(combined.country || ""),
          role: combined.role === "viewer" ? "viewer" : "photographer",
          interests: Array.isArray(combined.interests) ? combined.interests.filter((item: unknown): item is string => typeof item === "string") : [],
          photoURL: String(combined.photoURL || user.photoURL || ""),
        };
        setProfile(nextProfile);
        setPersistedUsername(String(combined.username || ""));
        setInterestText(nextProfile.interests.join(", "));
        setProfileReady(accountSnapshot.exists() && publicSnapshot.exists() && Boolean(combined.username));
        setEditing(!(accountSnapshot.exists() && publicSnapshot.exists() && Boolean(combined.username)));
        setProfileLoading(false);
      } catch {
        if (active) {
          setError("Your profile details couldn't load. Check your Firestore access and try again.");
          setProfileLoading(false);
        }
      }
    };
    void loadProfile();

    const stopPhotos = onSnapshot(
      query(collection(database, "photos"), where("ownerId", "==", user.uid), where("visibility", "==", "public"), orderBy("createdAt", "desc"), limit(12)),
      snapshot => {
        if (!active) return;
        setPhotos(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PhotoPost)));
        setPhotoStats({});
        setPhotosLoading(false);
      },
      () => {
        if (active) {
          setError("Your public photographs couldn't load. Check Firestore access and try again.");
          setPhotosLoading(false);
        }
      },
    );

    return () => { active = false; stopPhotos(); };
  }, [user?.uid]);

  const updatePhotoStats = useCallback((photoId: string, stats: PhotoInteractionStats) => {
    setPhotoStats(current => ({ ...current, [photoId]: stats }));
  }, []);

  const totals = useMemo(() => Object.values(photoStats).reduce((sum, item) => ({
    likes: sum.likes + item.likes,
    views: sum.views + item.views,
    comments: sum.comments + item.comments,
  }), { likes: 0, views: 0, comments: 0 }), [photoStats]);

  function updateProfile<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setProfile(current => current ? { ...current, [key]: value } : current);
  }

  async function chooseProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !profile) return;
    setError("");
    if (!file.type.startsWith("image/")) { setError("Choose an image file for your profile photo."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("Choose a profile photo smaller than 10 MB."); return; }
    setAvatarBusy(true);
    try {
      updateProfile("photoURL", await compressProfilePhoto(file));
      setNotice("Profile photo ready. Save your profile to publish it.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The profile photo couldn't be prepared.");
    } finally { setAvatarBusy(false); }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const database = firestore;
    if (!user || !database || !profile) return;
    const displayName = profile.displayName.trim();
    const username = profile.username.trim().toLowerCase();
    const interests = [...new Set(interestText.split(",").map(item => item.trim()).filter(Boolean))].slice(0, 10);
    if (!displayName || displayName.length > 80) { setError("Enter a display name with 1–80 characters."); return; }
    if (!/^[a-z0-9_]{3,24}$/.test(username)) { setError("Your username must be 3–24 characters and use only letters, numbers, or underscores."); return; }
    if (profile.bio.length > 500 || profile.city.length > 80 || profile.country.length > 80) { setError("Please shorten your bio or location details before saving."); return; }
    if (!user.email) { setError("This account needs an email address before its profile can be saved."); return; }

    setSaving(true); setError(""); setNotice("");
    try {
      const usernameRef = doc(database, "usernames", username);
      const existingUsername = await getDoc(usernameRef);
      if (existingUsername.exists() && existingUsername.data().uid !== user.uid) {
        setError("That username is already taken. Choose another one.");
        setSaving(false);
        return;
      }

      const accountRef = doc(database, "users", user.uid);
      const publicProfileRef = doc(database, "photographerProfiles", user.uid);
      const batch = writeBatch(database);
      const updatedAt = serverTimestamp();
      const profileData = {
        uid: user.uid,
        displayName,
        username,
        country: profile.country.trim(),
        city: profile.city.trim(),
        bio: profile.bio.trim(),
        role: profile.role,
        interests,
        photoURL: profile.photoURL,
        updatedAt,
      };
      batch.set(accountRef, { ...profileData, email: user.email }, { merge: true });
      batch.set(publicProfileRef, profileData, { merge: true });
      batch.set(usernameRef, { uid: user.uid, username, updatedAt }, { merge: true });

      const oldUsername = persistedUsername.trim().toLowerCase();
      if (oldUsername && oldUsername !== username) {
        const oldUsernameRef = doc(database, "usernames", oldUsername);
        const oldUsernameSnapshot = await getDoc(oldUsernameRef);
        if (oldUsernameSnapshot.exists() && oldUsernameSnapshot.data().uid === user.uid) batch.delete(oldUsernameRef);
      }

      await batch.commit();
      try { await updateAuthProfile(user, { displayName }); } catch { /* The Firestore profile is saved even if the auth display name sync is delayed. */ }
      const savedProfile = { ...profile, displayName, username, interests };
      setProfile(savedProfile);
      setPersistedUsername(username);
      setInterestText(interests.join(", "));
      setProfileReady(true);
      setEditing(false);
      setNotice("Your profile is saved and ready to share.");
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      setError(code === "permission-denied"
        ? "Firebase blocked this profile update. Confirm your Firestore rules allow signed-in members to manage their own profile and username."
        : "Your profile couldn't be saved. Check your connection and try again.");
    } finally { setSaving(false); }
  }

  const initials = (profile?.displayName || "F").trim().slice(0, 1).toUpperCase();

  return <AppShell title="Your FrameVerse profile">
      <div className="mx-auto max-w-[980px]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-medium uppercase tracking-[.2em] text-accent">Your space in the community</p><h1 className="mt-2 text-3xl font-medium tracking-[-.04em]">My profile.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Manage your details and see how the community is responding to your recent photographs.</p></div>
          {profileReady && profile?.username && <Link href={`/photographer/${encodeURIComponent(profile.username)}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-white/70 hover:border-accent/30 hover:text-accent"><ArrowUpRight size={15} /> Public profile</Link>}
        </div>

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-xl border border-accent/20 bg-accent/[.07] px-4 py-3 text-sm text-accent">{notice}</p>}

        {profileLoading ? <div className="grid min-h-64 place-items-center"><LoaderCircle className="animate-spin text-accent" /></div> : profile && <>
          <section className="overflow-hidden rounded-3xl border border-white/[.08] bg-panel">
            <div className="h-32 bg-[radial-gradient(ellipse_at_75%_30%,rgba(184,255,103,.20),transparent_35%),linear-gradient(115deg,#17191e,#24262d_60%,#121318)] sm:h-40" />
            <div className="px-5 pb-6 sm:px-8 sm:pb-8">
              <div className="-mt-10 flex flex-wrap items-end justify-between gap-4 sm:-mt-12">
                <div className="flex min-w-0 items-end gap-4">
                  {profile.photoURL ? <img src={profile.photoURL} alt="Your profile" className="size-20 rounded-3xl border-4 border-panel bg-ink object-cover sm:size-24" /> : <span className="grid size-20 shrink-0 place-items-center rounded-3xl border-4 border-panel bg-accent/10 text-3xl font-semibold text-accent sm:size-24">{initials}</span>}
                  <div className="min-w-0 pb-1"><p className="truncate text-2xl font-medium tracking-tight sm:text-3xl">{profile.displayName}</p><p className="mt-1 truncate text-sm text-white/45">@{profile.username}</p></div>
                </div>
                {!editing && <button onClick={() => { setError(""); setNotice(""); setEditing(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm text-white/70 hover:border-accent/30 hover:text-accent"><Pencil size={15} /> Edit profile</button>}
              </div>
              {!editing && <>
                <p className="mt-6 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-white/70">{profile.bio || "Add a short introduction so visitors can learn more about you."}</p>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/45"><span className="flex items-center gap-1.5"><MapPin size={14} />{[profile.city, profile.country].filter(Boolean).join(", ") || "Location not shared"}</span><span className="rounded-full border border-white/10 px-2.5 py-1 capitalize">{profile.role === "photographer" ? "Photographer" : "Photo enthusiast"}</span></div>
                {profile.interests.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{profile.interests.map(item => <span key={item} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/55">{item}</span>)}</div>}
                <div className="mt-6 flex flex-wrap gap-2 border-t border-white/[.07] pt-5 text-xs text-white/45"><span className="rounded-xl bg-white/[.04] px-3 py-2"><UserRound size={13} className="mr-1.5 inline text-accent" />{user?.email || "Email unavailable"}</span><span className="rounded-xl bg-white/[.04] px-3 py-2">Account details are private; your bio, username, location, and interests are public.</span></div>
              </>}
            </div>
          </section>

          {editing && <form onSubmit={saveProfile} className="mt-5 rounded-3xl border border-white/[.08] bg-panel p-5 sm:p-7">
            <div><h2 className="text-lg font-medium">Profile details</h2><p className="mt-1 text-sm text-muted">Your name, username, bio, location, interests, and profile photo appear on your public profile.</p></div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-4 rounded-2xl border border-white/[.08] bg-white/[.02] p-4 sm:col-span-2">
                {profile.photoURL ? <img src={profile.photoURL} alt="Profile photo preview" className="size-16 shrink-0 rounded-2xl border border-white/10 object-cover" /> : <span className="grid size-16 shrink-0 place-items-center rounded-2xl border border-white/10 bg-accent/10 text-xl font-semibold text-accent">{initials}</span>}
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><label className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/10 px-3 text-sm text-white/75 hover:border-accent/30 hover:text-accent ${avatarBusy ? "pointer-events-none opacity-50" : ""}`}><ImagePlus size={15} />{avatarBusy ? "Preparing…" : profile.photoURL ? "Change photo" : "Add profile photo"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseProfilePhoto} disabled={avatarBusy} className="sr-only" /></label>{profile.photoURL && <button type="button" onClick={() => { updateProfile("photoURL", ""); setNotice("Profile photo removed. Save your profile to publish the change."); }} disabled={avatarBusy} className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm text-white/45 hover:text-white disabled:opacity-50"><Trash2 size={14} />Remove</button>}</div><p className="mt-2 text-xs leading-5 text-white/40">Square-cropped and compressed before saving. Your profile photo is public.</p></div>
              </div>
              <label className="text-sm text-white/70">Display name<input required maxLength={80} autoComplete="name" value={profile.displayName} onChange={event => updateProfile("displayName", event.target.value)} className="field mt-2" placeholder="Your name" /></label>
              <label className="text-sm text-white/70">Username<span className="relative mt-2 block"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35">@</span><input required minLength={3} maxLength={24} autoComplete="username" value={profile.username} onChange={event => updateProfile("username", event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className="field pl-9" placeholder="yourname" /></span></label>
              <label className="text-sm text-white/70">City<input maxLength={80} autoComplete="address-level2" value={profile.city} onChange={event => updateProfile("city", event.target.value)} className="field mt-2" placeholder="Your city" /></label>
              <label className="text-sm text-white/70">Country<input maxLength={80} autoComplete="country-name" value={profile.country} onChange={event => updateProfile("country", event.target.value)} className="field mt-2" placeholder="Your country" /></label>
              <label className="text-sm text-white/70 sm:col-span-2">About you<textarea maxLength={500} rows={4} value={profile.bio} onChange={event => updateProfile("bio", event.target.value)} className="field mt-2 h-auto min-h-28 resize-y py-3 leading-6" placeholder="Tell the community what you love to photograph." /></label>
              <label className="text-sm text-white/70">I am a<select value={profile.role} onChange={event => updateProfile("role", event.target.value as ProfileDraft["role"])} className="field mt-2"><option value="photographer">Photographer</option><option value="viewer">Photo enthusiast</option></select></label>
              <label className="text-sm text-white/70">Photography interests<input value={interestText} onChange={event => setInterestText(event.target.value)} className="field mt-2" placeholder="Nature, street, portraits" /><span className="mt-1 block text-xs text-white/35">Separate interests with commas; up to 10.</span></label>
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={saving || avatarBusy} onClick={() => { setEditing(false); setError(""); }} className="h-11 rounded-xl border border-white/10 px-4 text-sm text-white/70 disabled:opacity-50">Cancel</button><button disabled={saving || avatarBusy} className="primary-button h-11 px-5">{saving ? <LoaderCircle size={16} className="animate-spin" /> : profileReady ? <Save size={16} /> : <Check size={16} />}{saving ? "Saving…" : profileReady ? "Save changes" : "Create profile"}</button></div>
          </form>}

          <section className="mt-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[.18em] text-accent">Recent activity</p><h2 className="mt-1 text-xl font-medium">Your photographs.</h2></div><span className="text-xs text-white/40">Stats across your latest {photos.length || 12} public {photos.length === 1 ? "photo" : "photos"}</span></div>
            <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
              {[{ label: "Photos", value: photos.length, Icon: Camera }, { label: "Likes", value: totals.likes, Icon: Heart }, { label: "Views", value: totals.views, Icon: Eye }].map(({ label, value, Icon }) => <div key={label} className="rounded-2xl border border-white/[.08] bg-panel p-3 sm:p-4"><p className="flex items-center gap-1.5 text-[11px] text-white/45 sm:text-xs"><Icon size={14} className="text-accent" />{label}</p><p className="mt-2 text-xl font-medium sm:text-2xl">{photosLoading ? "—" : value.toLocaleString()}</p></div>)}
            </div>
            <div className="mb-5 flex items-center gap-2 rounded-2xl border border-white/[.07] bg-panel px-4 py-3 text-xs text-white/50"><MessageCircle size={15} className="shrink-0 text-accent" />{totals.comments.toLocaleString()} comments across the recent photos shown below. Open a photo to read the conversation.</div>
            {photosLoading ? <div className="grid min-h-56 place-items-center"><LoaderCircle className="animate-spin text-accent" /></div> : photos.length ? <div className="space-y-6">{photos.map(photo => <PhotoCard key={photo.id} photo={photo} onStatsChange={updatePhotoStats} />)}</div> : <div className="rounded-3xl border border-white/[.08] bg-panel px-6 py-12 text-center"><Camera size={24} className="mx-auto text-accent" /><h3 className="mt-4 text-lg font-medium">Your portfolio starts here.</h3><p className="mt-2 text-sm text-muted">Publish a photo to see its likes, views, and comments on your profile.</p><Link href="/upload" className="primary-button mt-5 px-5">Upload a photograph</Link></div>}
          </section>
        </>}
      </div>
    </AppShell>;
}

export default function ProfilePage() {
  const { user } = useAuth();
  return <AuthGuard><ProfileDashboard key={user?.uid || "signed-out"} /></AuthGuard>;
}
