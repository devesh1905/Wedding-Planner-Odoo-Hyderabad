"use client";
import { Button } from '@/frontend/components/ui/button';
export default function ErrorPage({reset}:{reset:()=>void}){return <div role="alert" className="space-y-3 rounded-xl border p-6"><h2 className="font-serif text-2xl">Could not open the control room</h2><p className="text-muted-foreground">Check your connection and try again.</p><Button onClick={reset}>Try again</Button></div>;}
