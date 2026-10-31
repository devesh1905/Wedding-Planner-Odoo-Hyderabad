"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";

/** Catch-all for the staff app: a failed query shows a friendly card instead of a blank screen. */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center rounded-2xl border bg-card px-6 py-14 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-marigold-soft text-maroon">
        <AlertTriangle className="size-6" />
      </div>
      <h2 className="font-serif text-xl font-semibold">Something went wrong</h2>
      <p className="mt-1 text-sm text-muted-foreground">We couldn&apos;t load this page. Check your connection and try again.</p>
      <Button className="mt-5" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
