import Link from "next/link";

export default function PrivacyPage() {
  return <main className="min-h-screen bg-ink px-6 py-12 text-white"><div className="mx-auto max-w-2xl"><Link href="/" className="text-sm text-accent">← FrameVerse</Link><h1 className="mt-10 text-4xl font-medium">Privacy Policy</h1><p className="mt-6 leading-7 text-white/60">FrameVerse uses Firebase Authentication for email and password accounts. Public photos, display names, captions, and optional city or country details are stored in Cloud Firestore and visible to everyone. Photo files are resized, re-encoded as WebP to remove embedded metadata, and stored as Base64 data in each photo document. Account email addresses are not included with public photos. This starter policy needs review and completion by the platform operator before public launch.</p></div></main>;
}
