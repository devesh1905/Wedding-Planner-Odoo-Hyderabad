-- CreateEnum
CREATE TYPE "MessageAuthor" AS ENUM ('COUPLE', 'STAFF');

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "weddingId" UUID NOT NULL,
    "author" "MessageAuthor" NOT NULL,
    "authorName" TEXT NOT NULL,
    "userId" UUID,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Message_weddingId_createdAt_idx" ON "Message"("weddingId", "createdAt");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Same rule as every other table: RLS on, no policies, so the Supabase REST API sees nothing.
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
