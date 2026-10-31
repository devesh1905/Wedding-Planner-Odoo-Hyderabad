"use client";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api, ApiError } from "@/frontend/lib/api-client";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/frontend/components/ui/dialog";
import { vendorSchema, vendorCategories } from "@/shared/schemas/vendors";
import type { VendorSummary } from "./types";

export const categoryLabel = (value: string) => value.toLowerCase().replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
type InputValues = z.input<typeof vendorSchema>;
export function VendorForm({vendor,vendors,open,onOpenChange,onSaved}:{vendor?:VendorSummary;vendors:VendorSummary[];open:boolean;onOpenChange:(open:boolean)=>void;onSaved:()=>void}) {
  const [error,setError]=useState('');
  const {register,handleSubmit,control,setValue,setError:fieldError,formState:{errors,isSubmitting}}=useForm<InputValues,unknown,z.output<typeof vendorSchema>>({resolver:zodResolver(vendorSchema),defaultValues:{name:vendor?.name ?? '',category:vendor?.category ?? 'CATERER',contactName:vendor?.contactName ?? '',phone:vendor?.phone ?? '',email:vendor?.email ?? '',city:vendor?.city ?? 'Udaipur',notes:vendor?.notes ?? '',backupVendorId:vendor?.backupVendorId ?? ''}});
  const category=useWatch({control,name:'category'});
  const save=handleSubmit(async values=>{
    setError('');
    try { await api(vendor ? `/api/vendors/${vendor.id}` : '/api/vendors',{method:vendor ? 'PATCH':'POST',body:values}); toast.success(vendor ? 'Vendor updated':'Vendor added'); onSaved(); onOpenChange(false); }
    catch(problem) { const message=problem instanceof Error ? problem.message:'Unable to save vendor'; setError(message); if(problem instanceof ApiError) for(const [key,value] of Object.entries(problem.fields ?? {})) fieldError(key as keyof InputValues,{message:value}); }
  });
  const field=(key:keyof InputValues,label:string,type='text',required=false)=><div className="space-y-1.5"><Label htmlFor={`vendor-${key}`}>{label}{required ? ' *':''}</Label><Input id={`vendor-${key}`} type={type} {...register(key)} aria-invalid={!!errors[key]} />{errors[key] && <p className="text-sm text-destructive">{String(errors[key]?.message)}</p>}</div>;
  return <Dialog open={open} onOpenChange={next=>{if(!isSubmitting) onOpenChange(next);}}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{vendor ? 'Edit vendor':'Add a vendor'}</DialogTitle><DialogDescription>Keep the contact details and a backup ready for the big day.</DialogDescription></DialogHeader>
    <form onSubmit={save} noValidate className="space-y-4">
      {field('name','Business name','text',true)}
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="vendor-category">Category *</Label><select id="vendor-category" {...register('category',{onChange:()=>setValue('backupVendorId','')})} className="h-10 w-full rounded-md border bg-background px-3 text-sm">{vendorCategories.map(value=><option key={value} value={value}>{categoryLabel(value)}</option>)}</select>{errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}</div>{field('city','City','text',true)}</div>
      <div className="grid gap-4 sm:grid-cols-2">{field('contactName','Contact person')}{field('phone','Mobile number','tel',true)}</div>
      {field('email','Email','email')}
      <div className="space-y-1.5"><Label htmlFor="vendor-backup">Backup vendor</Label><select id="vendor-backup" {...register('backupVendorId')} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="">No backup selected</option>{vendors.filter(item=>item.id!==vendor?.id && item.category===category).map(item=><option key={item.id} value={item.id}>{item.name} · {item.city}</option>)}</select>{errors.backupVendorId && <p className="text-sm text-destructive">{errors.backupVendorId.message}</p>}<p className="text-xs text-muted-foreground">Choose another vendor in the same category.</p></div>
      <div className="space-y-1.5"><Label htmlFor="vendor-notes">Notes</Label><Textarea id="vendor-notes" {...register('notes')} rows={3} />{errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}</div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>onOpenChange(false)} disabled={isSubmitting}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…':'Save vendor'}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
