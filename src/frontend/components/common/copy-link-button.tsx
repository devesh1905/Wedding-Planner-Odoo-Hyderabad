"use client";

import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/frontend/components/ui/button";

export function CopyLinkButton({ path, label }: { path: string; label: string }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => {
        navigator.clipboard.writeText(`${window.location.origin}${path}`);
        toast.success(`${label} copied`);
      }}
    >
      <Link2 /> {label}
    </Button>
  );
}
