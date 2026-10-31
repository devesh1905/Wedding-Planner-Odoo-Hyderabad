import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requirePageUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/common/page-header';
import { LiveControlRoom } from '@/components/live/LiveControlRoom';
export const metadata={title:'Wedding-day control room'};
export default async function LivePage({params}:{params:Promise<{id:string}>}) {
  await requirePageUser();const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
  const wedding=await db.wedding.findUnique({where:{id},select:{partner1:true,partner2:true,city:true}});if(!wedding)notFound();
  return <><PageHeader title="The day, in good hands" subtitle={`${wedding.partner1} & ${wedding.partner2} · ${wedding.city}`} back={{href:`/weddings/${id}`,label:'Wedding overview'}}/><LiveControlRoom key={id} weddingId={id}/></>;
}
