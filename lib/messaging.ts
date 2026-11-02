import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export async function getOrCreateConversation(currentUid: string, otherUid: string) {
  if (!firestore) throw new Error("Firebase is not configured.");
  if (currentUid === otherUid) throw new Error("You cannot start a conversation with yourself.");
  const participants = [currentUid, otherUid].sort();
  const conversationId = participants.join("_");
  const conversationRef = doc(firestore, "conversations", conversationId);
  const existing = await getDoc(conversationRef);
  if (!existing.exists()) await setDoc(conversationRef, { participants, createdBy: currentUid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastMessageText: "" });
  return conversationId;
}
