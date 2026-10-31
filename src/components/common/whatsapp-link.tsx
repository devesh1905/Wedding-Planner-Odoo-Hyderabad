"use client";

import { cn } from "@/lib/utils";

/** WhatsApp glyph (brand mark), kept inline so it needs no icon package. */
function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z" />
    </svg>
  );
}

/**
 * Sends a link over WhatsApp — how couples and vendors in India actually get messages.
 * Opens wa.me with the message pre-typed; the link is built from the address the planner is on.
 */
export function WhatsAppLink({
  phone,
  path,
  message,
  label = "WhatsApp",
  compact,
  className,
}: {
  phone: string;
  path: string;
  /** the link is appended after this text */
  message: string;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  return (
    <button
      type="button"
      onClick={() => {
        const text = `${message} ${window.location.origin}${path}`;
        window.open(`https://wa.me/91${digits}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      }}
      aria-label={compact ? `${label} to +91 ${digits}` : undefined}
      title={`Send on WhatsApp to +91 ${digits}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border text-xs font-medium whitespace-nowrap text-[#1f8f4e] transition-colors hover:bg-[#25d366]/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:text-[#4ade80]",
        compact ? "size-7 justify-center" : "h-8 px-3",
        className,
      )}
    >
      <WaIcon className="size-3.5" />
      {!compact && label}
    </button>
  );
}
