import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requirePageUser } from '@/backend/auth';
import { db } from '@/backend/db';
import { PageHeader } from '@/frontend/components/common/page-header';
import { LiveControlRoom } from '@/frontend/components/live/LiveControlRoom';
export const metadata={title:'Wedding-day control room'};
export default async function LivePage({params}:{params:Promise<{id:string}>}) {
  await requirePageUser();const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
  const wedding=await db.wedding.findUnique({where:{id},select:{partner1:true,partner2:true,city:true}});if(!wedding)notFound();
  return <><PageHeader title="The day, in good hands" subtitle={`${wedding.partner1} & ${wedding.partner2} · ${wedding.city}`} back={{href:`/weddings/${id}`,label:'Wedding overview'}}/><LiveControlRoom key={id} weddingId={id}/></>;
}
