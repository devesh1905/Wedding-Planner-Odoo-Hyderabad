import { z } from "zod";
import type { issueSeverities, scheduleStatuses } from "@/shared/schemas/live";

/** ~4 MB of base64 (about 3 MB of audio) stays under the host's request body limit. */
export const VOICE_NOTE_MAX_BASE64 = 4_000_000;
export const VOICE_NOTE_MAX_SECONDS = 60;

export const voiceNoteRequestSchema = z.object({
  // Browsers send e.g. "audio/webm;codecs=opus"; only the container matters here.
  mimeType: z.string().trim().toLowerCase().transform((v) => v.split(";")[0]).pipe(z.enum(["audio/webm", "audio/mp4", "audio/wav", "audio/x-wav", "audio/ogg", "audio/mpeg"])),
  data: z.string().min(100, "The recording was empty").max(VOICE_NOTE_MAX_BASE64, "The recording is too long").regex(/^[A-Za-z0-9+/]+={0,2}$/, "The recording is not valid"),
}).strict();

/** What the planner sees and ticks. `payload` is exactly what the existing offline queue accepts. */
export type VoiceProposal =
  | { key: string; kind: "issue"; summary: string; payload: { description: string; severity: (typeof issueSeverities)[number] } }
  | { key: string; kind: "schedule"; summary: string; payload: { itemId: string; status: (typeof scheduleStatuses)[number]; actualAt: string | null } };
export type VoiceNoteResult = { transcript: string; actions: VoiceProposal[] };
