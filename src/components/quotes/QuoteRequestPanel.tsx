"use client";
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Copy, FileText, Plus } from 'lucide-react';
import { WhatsAppLink } from '@/components/common/whatsapp-link';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/common/empty-state';
import { StagePill } from '@/components/common/stage-pill';
import { vendorCategories } from '@/components/vendors/schema';
import type { VendorSummary } from '@/components/vendors/types';
import { categoryLabel } from '@/components/vendors/VendorForm';
import { quoteRequestSchema } from './schema';
import type { QuoteRequestView } from './types';

type Values=z.input<typeof quoteRequestSchema>;
export function QuoteRequestPanel({weddingId,guestCount}:{weddingId:string;guestCount?:number}) {
  const [requests,setRequests]=useState<QuoteRequestView[]>([]);
  const [vendors,setVendors]=useState<VendorSummary[]>([]);
  const [loading,setLoading]=useState(true); const [loadError,setLoadError]=useState(''); const [saveError,setSaveError]=useState('');
  const [showForm,setShowForm]=useState(false);
  const {register,handleSubmit,control,setValue,setError,reset,formState:{errors,isSubmitting}}=useForm<Values,unknown,z.output<typeof quoteRequestSchema>>({resolver:zodResolver(quoteRequestSchema),defaultValues:{weddingId,category:'CATERER',title:'Regional catering',requirements:'',guestCount,vendorIds:[]}});
  const category=useWatch({control,name:'category'});
  const getData=useCallback(()=>Promise.all([api<{requests:QuoteRequestView[]}>(`/api/quote-requests?weddingId=${weddingId}`),api<{vendors:VendorSummary[]}>('/api/vendors')]),[weddingId]);
  useEffect(()=>{let active=true;void getData().then(([r,v])=>{if(active){setRequests(r.requests);setVendors(v.vendors);}}).catch(e=>{if(active)setLoadError(e instanceof Error?e.message:'Unable to load requests');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[getData]);
  const reload=async()=>{setLoading(true);setLoadError('');try{const [r,v]=await getData();setRequests(r.requests);setVendors(v.vendors);}catch(e){setLoadError(e instanceof Error?e.message:'Unable to load requests');}finally{setLoading(false);}};
  const submit=handleSubmit(async values=>{setSaveError('');try{await api('/api/quote-requests',{method:'POST',body:values});toast.success('Quote request created');setShowForm(false);reset({...values,vendorIds:[]});await reload();}catch(e){setSaveError(e instanceof Error?e.message:'Unable to create request');if(e instanceof ApiError) for(const [key,message]of Object.entries(e.fields??{}))setError(key as keyof Values,{message});}});
  const candidates=vendors.filter(v=>v.category===category);
  return <section className="space-y-5" aria-label="Wedding vendor quotes">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl font-semibold">Find the right partners</h2><p className="text-sm text-muted-foreground">Invite vendors, collect proposals, then compare every inclusion.</p></div><Button onClick={()=>setShowForm(!showForm)} disabled={loading || !!loadError}><Plus className="size-4"/>Request quotes</Button></div>
    {showForm && <Card><CardHeader><CardTitle>New quote request</CardTitle></CardHeader><CardContent><form className="space-y-4" noValidate onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="request-title">Request title</Label><Input id="request-title" {...register('title')}/>{errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}</div><div className="space-y-2"><Label htmlFor="request-category">Category</Label><select id="request-category" className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...register('category',{onChange:()=>setValue('vendorIds',[])})}>{vendorCategories.map(c=><option key={c} value={c}>{categoryLabel(c)}</option>)}</select></div></div>
      <div className="space-y-2"><Label htmlFor="request-guests">Guest count</Label><Input id="request-guests" type="number" min={1} max={5000} {...register('guestCount',{valueAsNumber:true})}/>{errors.guestCount && <p className="text-sm text-destructive">{String(errors.guestCount.message)}</p>}</div>
      <div className="space-y-2"><Label htmlFor="request-requirements">Menu and requirements</Label><Textarea id="request-requirements" rows={3} placeholder="Regional menu, live counters, dietary requests…" {...register('requirements')}/>{errors.requirements && <p className="text-sm text-destructive">{errors.requirements.message}</p>}</div>
      <fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Invite vendors</legend>{!candidates.length ? <p className="text-sm text-muted-foreground">No vendors in this category. <Link href="/vendors" className="text-primary underline">Add a vendor</Link> first.</p>:<div className="grid gap-2 sm:grid-cols-2">{candidates.map(v=><label key={v.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border p-3"><input type="checkbox" value={v.id} {...register('vendorIds')} className="size-4 accent-primary"/><span className="min-w-0 text-sm"><span className="block font-medium">{v.name}</span><span className="text-muted-foreground">{v.city}</span></span></label>)}</div>}{errors.vendorIds && <p className="text-sm text-destructive">{errors.vendorIds.message}</p>}</fieldset>
      {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={isSubmitting} onClick={()=>setShowForm(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting || !candidates.length}>{isSubmitting?'Creating…':'Create invitation links'}</Button></div>
    </form></CardContent></Card>}
    {loading ? <Skeleton className="h-56 w-full rounded-xl"/>:loadError ? <div role="alert" className="rounded-xl border p-5"><p className="text-destructive">{loadError}</p><Button variant="outline" className="mt-3" onClick={()=>void reload()}>Try again</Button></div>:!requests.length ? <EmptyState icon={FileText} title="Every great celebration starts with a proposal" hint="Request quotes from your vendor circle to compare menus, inclusions and prices."/>:requests.map(request=><Card key={request.id}><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>{request.title}</CardTitle><p className="mt-1 text-sm text-muted-foreground">{categoryLabel(request.category)} · {request.guestCount ?? '—'} guests</p></div><StagePill status={request.status}/></div></CardHeader><CardContent className="space-y-4">{request.requirements && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{request.requirements}</p>}<ul className="divide-y">{request.quotes.map(quote=><li key={quote.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{quote.vendor.name}</p><StagePill status={quote.status}/></div><div className="flex gap-2"><Button variant="outline" size="sm" asChild><Link href={`/v/${quote.token}`} target="_blank" rel="noreferrer">Vendor link</Link></Button><Button variant="ghost" size="icon" aria-label={`Copy link for ${quote.vendor.name}`} onClick={()=>{void navigator.clipboard.writeText(new URL(`/v/${quote.token}`,window.location.origin).toString()).then(()=>toast.success('Invitation link copied')).catch(()=>toast.error('Copy unavailable. Open the vendor link instead.'));}}><Copy className="size-4"/></Button>{quote.vendor.phone && <WhatsAppLink compact className="size-9" phone={quote.vendor.phone} path={`/v/${quote.token}`} message={`Namaste ${quote.vendor.name}! The Royal Knot would love your proposal for "${request.title}". Share your quote or upload a PDF here:`} label={`Send invite to ${quote.vendor.name}`}/>}</div></li>)}</ul><Button variant="outline" asChild><Link href={`/weddings/${weddingId}/quotes/${request.category}`}>Compare proposals</Link></Button></CardContent></Card>)}
  </section>;
}
export default QuoteRequestPanel;
