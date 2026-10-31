import { ViewTransition } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { SignForm } from "./sign-form";

export const metadata: Metadata = { title: { absolute: "Your service agreement · The Royal Knot" }, robots: { index: false } };

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const agreement = await db.agreement.findUnique({
    where: { token },
    include: { enquiry: { select: { partner1: true, partner2: true } } },
  });
  if (!agreement || agreement.status === "DRAFT") notFound();
  const { partner1, partner2 } = agreement.enquiry;

  return (
    <ViewTransition enter="page-rise" exit="page-fade" default="none">
    <main className="min-h-svh bg-paper">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-14">
        <header className="mb-6 space-y-2 text-center">
          <p className="text-xs tracking-[0.25em] text-eyebrow uppercase">The Royal Knot</p>
          <h1 className="text-4xl font-semibold sm:text-5xl">
            {partner1} & {partner2}
          </h1>
          <div className="ornament mx-auto w-32" />
          <p className="text-muted-foreground">Please read your service agreement and sign below.</p>
        </header>

        <article className="max-h-[50svh] overflow-y-auto rounded-2xl border bg-card p-5 font-sans text-sm leading-relaxed whitespace-pre-wrap shadow-sm sm:p-8">
          {agreement.body}
        </article>

        <div className="mt-6">
          {agreement.status === "SIGNED" ? (
            <div className="rounded-2xl border bg-teal-soft/60 p-6 text-center">
              <p className="font-serif text-2xl font-semibold text-teal">Signed — thank you!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Signed by {agreement.signerName} on {agreement.signedAt && formatDateTime(agreement.signedAt)}
              </p>
              {agreement.signatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agreement.signatureUrl} alt="Signature" className="mx-auto mt-4 h-24 rounded-md border bg-white p-1" />
              )}
            </div>
          ) : (
            <SignForm token={token} defaultName={partner1} />
          )}
        </div>
      </div>
    </main>
    </ViewTransition>
  );
}
