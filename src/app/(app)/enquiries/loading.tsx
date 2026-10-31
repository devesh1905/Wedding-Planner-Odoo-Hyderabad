import { Skeleton } from "@/frontend/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading enquiries">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-80 w-72 shrink-0 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
