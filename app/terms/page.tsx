import Link from "next/link";

export default function TermsPage() {
  return <main className="min-h-screen bg-ink px-6 py-12 text-white"><div className="mx-auto max-w-2xl"><Link href="/" className="text-sm text-accent">← FrameVerse</Link><h1 className="mt-10 text-4xl font-medium">Terms of Service</h1><p className="mt-6 leading-7 text-white/60">Only publish photographs you own or have permission to share. Public photos, display names, captions, and optional location details can be seen by everyone. Images are compressed and stored with their photo details in Firestore. Be respectful of other people and do not use the service to harass, impersonate, or infringe on others' rights. This starter app is under development; contact the platform operator for content requests.</p></div></main>;
}
