import { notFound } from 'next/navigation';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requirePageUser } from '@/lib/auth';
import { vendorCategories } from '@/components/vendors/schema';
import { PageHeader } from '@/components/common/page-header';
import { QuoteComparison, type ComparisonRequest } from '@/components/quotes/QuoteComparison';
export const metadata={title:'Compare vendor proposals'};
export default async function ComparisonPage({params}:{params:Promise<{id:string;category:string}>}) {
  await requirePageUser();const {id,category}=await params;if(!z.string().uuid().safeParse(id).success)notFound();
  const parsed=z.enum(vendorCategories).safeParse(category.toUpperCase());if(!parsed.success)notFound();
  const wedding=await db.wedding.findUnique({where:{id},select:{partner1:true,partner2:true,enquiry:{select:{agreement:{select:{status:true}}}}}});if(!wedding)notFound();
  if(wedding.enquiry && wedding.enquiry.agreement?.status!=='SIGNED')return <p className="rounded-xl border p-5">Sign the service agreement before comparing vendor proposals.</p>;
  const data=await db.quoteRequest.findMany({where:{weddingId:id,category:parsed.data},orderBy:{createdAt:'desc'},include:{quotes:{include:{vendor:{select:{id:true,name:true,phone:true}},lines:{orderBy:{sortOrder:'asc'}}},orderBy:{createdAt:'asc'}}}});
  const requests=data.map(request=>({...request,createdAt:request.createdAt.toISOString(),quotes:request.quotes.map(q=>({...q,submittedAt:q.submittedAt?.toISOString()??null,hasFile:!!q.fileUrl,fileUrl:undefined}))})) as ComparisonRequest[];
  return <><PageHeader title="Three proposals, one celebration" subtitle={`${wedding.partner1} & ${wedding.partner2} · ${parsed.data.replaceAll('_',' ')}`} back={{href:`/weddings/${id}/quotes`,label:'All quote requests'}}/><QuoteComparison requests={requests} weddingId={id}/></>;
}
