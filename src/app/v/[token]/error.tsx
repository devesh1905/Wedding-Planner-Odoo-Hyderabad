"use client";
import { Button } from '@/frontend/components/ui/button';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="mx-auto max-w-xl space-y-4 px-4 py-12" role="alert"><h1 className="font-serif text-3xl">Proposal unavailable</h1><p>We could not open this request. Try again or contact your planner for a new link.</p><Button onClick={reset}>Try again</Button></main>;}
