# FrameVerse

FrameVerse is a photography community built with Next.js and Firebase. Anyone can browse public photos; members use email and password accounts to publish.

## Run locally

1. Install Node.js 20.9 or newer.
2. Run `npm install`.
3. The Firebase web configuration is in `.env.local`. This file is ignored by Git. Copy `.env.example` to `.env.local` only if you need to recreate it.
4. Start the app with `npm run dev` and open `http://localhost:3000`.

## Firebase setup

In Firebase Console for project `myself-ec948`:

1. Under **Authentication → Sign-in method**, enable **Email/Password**.
2. Confirm that Cloud Firestore and Realtime Database are enabled. `.env.local` already contains the web app settings and Realtime Database URL.
3. Sign in to Firebase CLI, select the configured project, and deploy the rules and indexes:

   ```text
   npx firebase-tools login
   npx firebase-tools use myself-ec948
   npx firebase-tools deploy --only firestore:rules,firestore:indexes,database,storage
   ```

The Firebase CLI must be signed in with an account that can deploy to this project. Public users can read public photos. Signed-in members can publish photos and change their own content; email verification is not required. Storage writes are disabled for new photos; each photo image is stored inline in Firestore as a JSON map.

## Photos and privacy

- `photos/{photoId}` stores the public photo details and an `image` map containing a Base64 WebP data URL, content type, and dimensions.
- Uploads are re-encoded to remove embedded metadata, resized to at most 1600 × 1600, and compressed below 650 KB so the full Firestore document stays under Firestore's 1 MiB document limit.
- The `image` map is excluded from Firestore indexes because it is not used for queries.
- Public photo details and images can be viewed by anyone. A signed-in account is required to publish; its email address is not included in the public photo document.
- Existing public photo documents with Firebase Storage URLs remain readable. New photo uploads no longer write files to Firebase Storage.
- `users/{uid}` and `photographerProfiles/{uid}` are for private account data and public profile data respectively.
- `likes`, `comments`, `ratings`, and `views` are stored in photo subcollections. `follows`, `savedPhotos`, `conversations`, and notifications are also governed by `firestore.rules`.
- `database.rules.json` limits Realtime Database presence to the signed-in member's own record.

The rules are in `firestore.rules`, `storage.rules`, and `database.rules.json`; index definitions are in `firestore.indexes.json`.

## Web app

FrameVerse runs as a responsive web app on desktop and mobile browsers. It includes the public feed, Explore, email/password registration and sign-in, password reset, and authenticated photo publishing. Members can sign in immediately without email verification.

The Firebase browser configuration is intended to be public. Do not add Firebase service-account files, admin credentials, or private keys to this project.

## Deploy the web app

For Vercel, import this project, set the `NEXT_PUBLIC_FIREBASE_*` variables from `.env.local` in the Vercel project settings, and deploy the default Next.js build. Add the deployed Vercel domain to Firebase Authentication's authorized domains. Firebase rules and indexes are deployed separately with the CLI command above.
