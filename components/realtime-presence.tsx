"use client";

import { useEffect } from "react";
import { onDisconnect, onValue, ref, serverTimestamp, set } from "firebase/database";
import { realtimeDatabase } from "@/lib/firebase";

export function RealtimePresence({ uid }: { uid: string }) {
  useEffect(() => {
    if (!realtimeDatabase) return;
    const connectionRef = ref(realtimeDatabase, ".info/connected");
    const statusRef = ref(realtimeDatabase, `status/${uid}`);
    const unsubscribe = onValue(connectionRef, async (snapshot) => {
      if (snapshot.val() !== true) return;
      try {
        await onDisconnect(statusRef).set({ state: "offline", lastChanged: serverTimestamp() });
        await set(statusRef, { state: "online", lastChanged: serverTimestamp() });
      } catch {
        // Realtime Database rules or connectivity may not be ready yet.
      }
    });
    return unsubscribe;
  }, [uid]);

  return null;
}
