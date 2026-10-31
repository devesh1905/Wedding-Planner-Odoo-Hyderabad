import { Skeleton } from "@/frontend/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading vendor">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56 max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
      </div>
    </div>
  );
}
