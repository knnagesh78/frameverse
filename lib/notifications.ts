import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { firestore } from "@/lib/firebase";

type Activity =
  | { type: "photo_like"; photoId: string }
  | { type: "photo_comment"; photoId: string; commentId: string }
  | { type: "new_follower" }
  | { type: "new_message"; conversationId: string; messageId: string };

export async function notifyUser(recipientId: string, actorId: string, actorName: string, activity: Activity) {
  if (!firestore || recipientId === actorId) return;
  const id = activity.type === "photo_like" ? `like_${activity.photoId}_${actorId}`
    : activity.type === "photo_comment" ? `comment_${activity.commentId}`
      : activity.type === "new_follower" ? `follow_${actorId}_${recipientId}`
        : `message_${activity.messageId}`;
  await setDoc(doc(firestore, "users", recipientId, "notifications", id), {
    recipientId, actorId, actorName, ...activity, read: false, createdAt: serverTimestamp(),
  });
}
