"use client";
import { Button } from '@/frontend/components/ui/button';
export default function ErrorPage({reset}:{reset:()=>void}){return <div role="alert" className="rounded-xl border p-6"><h2 className="font-serif text-2xl">Could not load proposals</h2><p className="my-3 text-sm text-muted-foreground">Check your connection and try again.</p><Button onClick={reset}>Try again</Button></div>;}
