import { Skeleton } from '@/frontend/components/ui/skeleton';
export default function Loading(){return <div className="space-y-5"><Skeleton className="h-12 w-56"/><Skeleton className="h-24 w-full"/><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map(i=><Skeleton key={i} className="h-52"/>)}</div></div>;}
