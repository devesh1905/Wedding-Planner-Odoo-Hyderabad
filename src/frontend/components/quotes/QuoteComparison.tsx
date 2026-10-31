"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, FileText, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/frontend/lib/api-client';
import { formatINR } from '@/shared/format';
import { Button } from '@/frontend/components/ui/button';
import { Badge } from '@/frontend/components/ui/badge';
import { Card, CardContent } from '@/frontend/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/frontend/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/frontend/components/ui/dialog';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { StagePill } from '@/frontend/components/common/stage-pill';
import { EmptyState } from '@/frontend/components/common/empty-state';
import { quoteLineCategories } from '@/shared/schemas/quotes';
import type { QuoteRequestView } from '@/shared/schemas/quotes-types';
import { QuoteReviewDialog } from './QuoteReviewDialog';

export type ComparisonRequest=QuoteRequestView;
type Offer=ComparisonRequest['quotes'][number] & {requestId:string;requestStatus:ComparisonRequest['status'];guestCount:number|null};
export function QuoteComparison({requests,weddingId}:{requests:ComparisonRequest[];weddingId:string}) {
  const router=useRouter();const [selected,setSelected]=useState<Offer>();const [review,setReview]=useState<Offer>();const [saving,setSaving]=useState(false);const [error,setError]=useState('');const [arrival,setArrival]=useState('');const [hours,setHours]=useState('');
  const offers:Offer[]=requests.flatMap(r=>r.quotes.map(q=>({...q,requestId:r.id,requestStatus:r.status,guestCount:r.guestCount})));
  const submitted=offers.filter(q=>q.status==='SUBMITTED'||q.status==='WON');
  const equalGuests=new Set(submitted.map(q=>q.guestCount)).size<=1;
  const cheapest=(field:'total'|'perPlate'|'extraHourRate')=>equalGuests ? submitted.filter(q=>q[field]!==null).reduce<Offer|undefined>((best,q)=>!best || q[field]!<best[field]! ? q:best,undefined)?.id : undefined;
  const award=async()=>{
    if(!selected || saving)return;setSaving(true);setError('');
    try{const expectedArrival=arrival ? `${arrival}:00+05:30`:undefined;await api(`/api/quote-requests/${selected.requestId}/award`,{method:'POST',body:{quoteId:selected.id,...(selected.updatedAt?{expectedUpdatedAt:selected.updatedAt}:{}),...(expectedArrival?{expectedArrival}:{}),...(hours?{agreedHours:Number(hours)}:{})}});toast.success(`${selected.vendor.name} booked. Other proposals are closed.`);setSelected(undefined);router.refresh();}
    catch(problem){setError(problem instanceof Error?problem.message:'Unable to award this proposal');}finally{setSaving(false);}
  };
  if(!offers.length)return <EmptyState icon={FileText} title="No proposals to compare yet" hint="Create a request and invite vendors to get started." action={<Button asChild><Link href={`/weddings/${weddingId}/quotes`}>Request quotes</Link></Button>}/>;
  const moneyRow=(label:string,field:'perPlate'|'extraHourRate'|'total')=><TableRow key={field} className={field==='total'?'bg-muted/40 font-semibold':''}><TableHead className="whitespace-normal">{label}</TableHead>{offers.map(q=><TableCell key={q.id} className={q.id===cheapest(field)?'bg-marigold-soft':''}><span className="tabular-nums">{formatINR(q[field])}</span>{q.id===cheapest(field)&&<span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-3"/>Lowest</span>}</TableCell>)}</TableRow>;
  return <div className="space-y-5">
    <Card><CardContent className="pt-5 text-sm text-muted-foreground">Compare the final quoted total alongside inclusions. Missing items may change the real cost; confirm those details before choosing a vendor.{!equalGuests && <p className="mt-2 text-rose">Guest counts differ across these requests. Lowest-price highlighting is paused until the scope matches.</p>}{offers.some(q=>q.hasFile && q.lines.length===0) && <p className="mt-2">Some PDFs have not been transcribed yet. Review their documents before awarding.</p>}</CardContent></Card>
    <div className="max-w-full overflow-x-auto rounded-xl border bg-card"><Table className="min-w-[650px]"><TableHeader><TableRow><TableHead className="min-w-40">Proposal details</TableHead>{offers.map(q=><TableHead key={q.id} className="min-w-64 align-top"><div className="space-y-2 py-3"><p className="font-serif text-xl font-semibold text-foreground">{q.vendor.name}</p><StagePill status={q.status}/><p className="text-xs">{q.guestCount ?? '—'} guests</p>{q.aiExtracted && <Badge variant="outline">{q.aiReviewed?'AI-read · reviewed':'AI-read · please review'}</Badge>}{q.hasFile && <a className="block text-xs text-primary underline" href={`/api/quotes/${q.token}/file`} target="_blank" rel="noreferrer">View original PDF</a>}</div></TableHead>)}</TableRow></TableHeader><TableBody>
      {moneyRow('Price per plate','perPlate')}{moneyRow('Extra hour','extraHourRate')}
      {quoteLineCategories.map(category=><TableRow key={category}><TableHead className="whitespace-normal">{category.replaceAll('_',' ')}</TableHead>{offers.map(q=>{const lines=q.lines.filter(l=>l.category===category);const present=lines.some(l=>l.included);return <TableCell key={q.id} className="align-top whitespace-normal">{q.status==='INVITED'?<span className="text-muted-foreground">Awaiting proposal</span>:!lines.length?<span className={q.hasFile&&!q.lines.length?'text-muted-foreground':'text-rose'}>{q.hasFile&&!q.lines.length?'Review PDF':'Not included'}</span>:<div className="space-y-2">{!present && <Badge variant="outline" className="text-rose">Not included</Badge>}{lines.map((line,i)=><div key={line.id??i} className={`text-sm ${!line.included?'text-muted-foreground':''}`}><p>{line.item}{!line.included?' · excluded':''}</p>{line.unitPrice!==null && <p className="text-xs text-muted-foreground">{line.qty!==null?`${line.qty} ${line.unit??'units'} × `:''}{formatINR(line.unitPrice)}</p>}</div>)}</div>}</TableCell>;})}</TableRow>)}
      {moneyRow('Grand total · quoted scope','total')}
      <TableRow><TableHead>Conditions</TableHead>{offers.map(q=><TableCell key={q.id} className="max-w-80 align-top whitespace-pre-wrap text-sm text-muted-foreground">{q.notes||'No additional conditions provided'}</TableCell>)}</TableRow>
      <TableRow><TableHead>Decision</TableHead>{offers.map(q=><TableCell key={q.id}>{q.status==='WON'?<Badge className="bg-teal-soft text-teal"><Trophy className="mr-1 size-3"/>Selected</Badge>:q.status==='SUBMITTED'&&q.requestStatus==='OPEN'?<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={()=>setReview(q)}>{q.hasFile&&!q.aiExtracted?'Read PDF':'Review proposal'}</Button><Button size="sm" disabled={q.total===null || q.total<=0 || (q.aiExtracted&&!q.aiReviewed)} onClick={()=>{setSelected(q);setError('');setArrival('');setHours('');}}>Choose vendor</Button>{q.aiExtracted&&!q.aiReviewed&&<p className="w-full text-xs text-muted-foreground">Confirm the extracted details before choosing.</p>}</div>:<span className="text-sm text-muted-foreground">{q.status==='INVITED'?'Awaiting submission':'Request closed'}</span>}</TableCell>)}</TableRow>
    </TableBody></Table></div>
    <Dialog open={!!selected} onOpenChange={open=>{if(!open&&!saving)setSelected(undefined);}}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Confirm {selected?.vendor.name}?</DialogTitle><DialogDescription>This books the vendor for {formatINR(selected?.total)} and closes the other proposals in this category. Confirm the menu, taxes and exclusions with the couple first.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="award-arrival">Expected arrival (IST, optional)</Label><Input id="award-arrival" type="datetime-local" value={arrival} onChange={e=>setArrival(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="award-hours">Agreed hours (optional)</Label><Input id="award-hours" type="number" min={1} max={168} step={1} value={hours} onChange={e=>setHours(e.target.value)}/></div>{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={saving} onClick={()=>setSelected(undefined)}>Keep comparing</Button><Button disabled={saving} onClick={()=>void award()}>{saving?'Booking…':'Confirm vendor'}</Button></div></div></DialogContent></Dialog>
    {review&&<QuoteReviewDialog key={review.id} quote={review} extractOnOpen={review.hasFile&&!review.aiExtracted} onClose={()=>{setReview(undefined);router.refresh();}} onSaved={()=>router.refresh()}/>}
  </div>;
}
