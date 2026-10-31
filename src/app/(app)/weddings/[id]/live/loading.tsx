import { Skeleton } from "@/frontend/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-12 w-60" />
      <Skeleton className="h-20" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}
