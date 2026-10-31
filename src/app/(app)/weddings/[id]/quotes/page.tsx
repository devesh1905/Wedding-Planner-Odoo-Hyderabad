import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requirePageUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageHeader } from '@/components/common/page-header';
import { QuoteRequestPanel } from '@/components/quotes/QuoteRequestPanel';
export const metadata={title:'Wedding quotes'};
export default async function QuotesPage({params}:{params:Promise<{id:string}>}) {
  await requirePageUser();const {id}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
  const wedding=await db.wedding.findUnique({where:{id},select:{partner1:true,partner2:true,guestCount:true,enquiry:{select:{agreement:{select:{status:true}}}}}});
  if(!wedding)notFound();
  return <><PageHeader title={`${wedding.partner1} & ${wedding.partner2}`} subtitle="Vendor proposals" back={{href:`/weddings/${id}`,label:'Wedding overview'}}/>{wedding.enquiry && wedding.enquiry.agreement?.status!=='SIGNED' ? <p className="rounded-xl border p-5 text-muted-foreground">The service agreement must be signed before vendor proposals can be shared.</p>:<QuoteRequestPanel weddingId={id} guestCount={wedding.guestCount}/>}</>;
}
