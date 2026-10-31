import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Phone, Mail, CalendarDays } from "lucide-react";
import { db } from "@/lib/db";
import { requirePageUser } from "@/lib/auth";
import { formatDate, formatINR } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/empty-state";
export const metadata={title:'Vendor profile'};
export default async function VendorProfile({params}:{params:Promise<{id:string}>}) {
  await requirePageUser(); const {id}=await params; if(!z.string().uuid().safeParse(id).success) notFound();
  const vendor=await db.vendor.findUnique({where:{id},include:{backupVendor:{select:{id:true,name:true,phone:true}},bookings:{include:{wedding:{select:{id:true,partner1:true,partner2:true,startDate:true}}},orderBy:{createdAt:'desc'}}}});
  if(!vendor) notFound();
  return <><PageHeader title={vendor.name} subtitle={`${vendor.city} · ${vendor.contactName ?? 'Vendor profile'}`} back={{href:'/vendors',label:'Vendor directory'}} actions={<Badge variant="secondary">{vendor.category.replaceAll('_',' ')}</Badge>}/>
    <div className="grid gap-6 lg:grid-cols-3"><Card><CardHeader><CardTitle>Keep in touch</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><a href={`tel:+91${vendor.phone}`} className="flex items-center gap-2"><Phone className="size-4"/>{vendor.phone}</a>{vendor.email && <a className="flex items-center gap-2 break-all" href={`mailto:${vendor.email}`}><Mail className="size-4 shrink-0"/>{vendor.email}</a>}<div className="border-t pt-4"><p className="mb-1 text-muted-foreground">Backup vendor</p>{vendor.backupVendor ? <><Link href={`/vendors/${vendor.backupVendor.id}`} className="font-medium text-primary">{vendor.backupVendor.name}</Link><a className="mt-1 block" href={`tel:+91${vendor.backupVendor.phone}`}>{vendor.backupVendor.phone}</a></>:<p>No backup selected</p>}</div>{vendor.notes && <p className="whitespace-pre-wrap border-t pt-4">{vendor.notes}</p>}</CardContent></Card>
    <Card className="lg:col-span-2"><CardHeader><CardTitle>Booking history</CardTitle></CardHeader><CardContent>{!vendor.bookings.length ? <EmptyState icon={CalendarDays} title="A new relationship" hint="Award a quote to see this vendor’s weddings here."/>:<ul className="divide-y">{vendor.bookings.map(b=><li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><Link className="font-medium text-primary" href={`/weddings/${b.wedding.id}`}>{b.wedding.partner1} &amp; {b.wedding.partner2}</Link><p className="text-sm text-muted-foreground">{formatDate(b.wedding.startDate)}</p></div><span className="font-medium tabular-nums">{formatINR(b.agreedAmount)}</span></li>)}</ul>}</CardContent></Card></div>
    <Card className="mt-6"><CardHeader><CardTitle>Performance scorecard</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Punctuality and arrival trends will appear here once wedding-day check-ins are connected.</p></CardContent></Card>
  </>;
}
