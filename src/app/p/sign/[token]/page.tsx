import { ViewTransition } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { SignForm } from "./sign-form";
import { WaxSeal } from "@/components/portal/wax-seal";

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
      <div className="mx-auto max-w-2xl px-6 pt-10 pb-16 sm:pt-14">
        <header className="mb-8 space-y-4 text-center">
          <p className="text-xs tracking-[0.25em] text-eyebrow uppercase">The Royal Knot</p>
          <h1 className="text-4xl font-semibold text-balance break-words sm:text-5xl">
            {partner1} & {partner2}
          </h1>
          <div className="ornament mx-auto w-32" />
          <p className="text-muted-foreground">Please read your service agreement and sign below.</p>
        </header>

        <article tabIndex={0} aria-label="Service agreement" className="squircle max-h-[50svh] overflow-y-auto rounded-2xl border bg-card p-5 font-sans text-sm leading-relaxed text-pretty whitespace-pre-wrap shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-8 sm:text-[0.9375rem]">
          {agreement.body}
        </article>

        <div className={agreement.status === "SIGNED" ? "mt-16" : "mt-8"}>
          {agreement.status === "SIGNED" ? (
            <div role="status" className="squircle relative rounded-2xl border bg-teal-soft/60 px-6 pt-14 pb-8 text-center">
              <WaxSeal className="absolute -top-10 left-1/2 size-20 -translate-x-1/2" />
              <h2 className="text-3xl font-semibold text-teal">Signed — thank you!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Signed by {agreement.signerName} on {agreement.signedAt && formatDateTime(agreement.signedAt)}
              </p>
              {agreement.signatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agreement.signatureUrl} alt={`Signature of ${agreement.signerName ?? partner1}`} className="mx-auto mt-6 h-24 max-w-full rounded-lg border bg-white p-1" />
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
