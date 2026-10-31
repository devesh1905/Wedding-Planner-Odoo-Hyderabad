import { ViewTransition } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/backend/db";
import { formatDateTime } from "@/shared/format";
import { SignForm } from "./sign-form";
import { WaxSeal } from "@/frontend/components/portal/wax-seal";

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
            <h1 className="text-4xl font-semibold text-balance break-words sm:text-5xl">
              {partner1} & {partner2}
            </h1>
            <div className="ornament mx-auto w-32" />
            <p className="text-muted-foreground">Please read your service agreement and sign below.</p>
          </header>

          {/* The full text opens in place (no scroll box inside the page): easier to read on a phone,
            and nothing hides behind the signature card. The "I have read and agree" box confirms it. */}
          <details className="squircle group rounded-2xl border bg-card shadow-sm">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-5 font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:px-8">
              <span className="flex flex-col">
                <span>Read the full agreement</span>
                <span className="text-sm font-normal text-muted-foreground">About 2 minutes · please read before signing</span>
              </span>
              <span aria-hidden className="text-muted-foreground transition-transform group-open:rotate-180">
                ⌄
              </span>
            </summary>
            <article
              aria-label="Service agreement"
              className="border-t px-5 pt-4 pb-6 font-sans text-sm leading-relaxed text-pretty whitespace-pre-wrap sm:px-8 sm:text-[0.9375rem]"
            >
              {agreement.body}
            </article>
          </details>

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
                  <img
                    src={agreement.signatureUrl}
                    alt={`Signature of ${agreement.signerName ?? partner1}`}
                    className="mx-auto mt-6 h-24 max-w-full rounded-lg border bg-white p-1"
                  />
                )}
                <a
                  href={`/api/public/agreements/${token}/pdf`}
                  download
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-cta px-6 text-sm font-medium text-cta-foreground transition-opacity hover:opacity-90"
                >
                  Download signed PDF
                </a>
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
