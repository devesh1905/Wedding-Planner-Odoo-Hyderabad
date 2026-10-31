import { Skeleton } from "@/frontend/components/ui/skeleton";
export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <Skeleton className="h-12 w-52" />
      <Skeleton className="h-72" />
    </main>
  );
}
