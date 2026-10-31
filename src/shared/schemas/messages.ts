import { z } from "zod";

// Used by the thread composer on both sides and by the API handlers.
export const messageInput = z.object({
  body: z.string().trim().min(1, "Write a message").max(1000, "Keep it under 1000 characters"),
});

// The couple has no login, so they also say which partner is writing.
export const coupleMessageInput = messageInput.extend({
  name: z.string().trim().min(1).max(60).optional(),
});

export type MessageRow = {
  id: string;
  author: "COUPLE" | "STAFF";
  authorName: string;
  body: string;
  createdAt: string;
};
