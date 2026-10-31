-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FOUNDER', 'PLANNER');

-- CreateEnum
CREATE TYPE "EnquirySource" AS ENUM ('WEB_FORM', 'PHONE', 'INSTAGRAM', 'WHATSAPP', 'REFERRAL', 'WALK_IN');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'MEETING_BOOKED', 'AGREEMENT_SENT', 'SIGNED', 'LOST');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED');

-- CreateEnum
CREATE TYPE "PackageKind" AS ENUM ('FULL_SERVICE', 'PARTIAL');

-- CreateEnum
CREATE TYPE "WeddingStage" AS ENUM ('BOOKED', 'PLANNING', 'VENDORS', 'BIG_DAY', 'SETTLEMENT', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStage" AS ENUM ('TO_PLAN', 'IN_PROGRESS', 'WAITING', 'DONE');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('BOOKING', 'ADVANCE', 'FINAL', 'ADDON');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('DUE', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorCategory" AS ENUM ('CATERER', 'DECORATOR', 'FLORIST', 'DJ', 'DHOL', 'MAKEUP', 'PHOTOGRAPHER', 'LIGHTING', 'TENT', 'TRANSPORT', 'VENUE', 'OTHER');

-- CreateEnum
CREATE TYPE "QuoteRequestStatus" AS ENUM ('OPEN', 'AWARDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "VendorQuoteStatus" AS ENUM ('INVITED', 'SUBMITTED', 'WON', 'NOT_SELECTED');

-- CreateEnum
CREATE TYPE "QuoteLineCategory" AS ENUM ('MAIN', 'STARTER', 'DESSERT', 'BEVERAGE', 'LIVE_COUNTER', 'SERVICE', 'TAX', 'OTHER');

-- CreateEnum
CREATE TYPE "ScheduleStatus" AS ENUM ('UPCOMING', 'LIVE', 'DONE', 'DELAYED');

-- CreateEnum
CREATE TYPE "CheckinMethod" AS ENUM ('QR', 'MANUAL');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BillMatch" AS ENUM ('PENDING', 'MATCHED', 'OVER_BILLED', 'UNDER_BILLED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'PLANNER',
    "hourlyCost" INTEGER NOT NULL DEFAULT 0,
    "avatarColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" UUID NOT NULL,
    "partner1" TEXT NOT NULL,
    "partner2" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" "EnquirySource" NOT NULL DEFAULT 'WEB_FORM',
    "roughDate" DATE,
    "guestCount" INTEGER,
    "theme" TEXT,
    "maxBudget" INTEGER,
    "city" TEXT,
    "notes" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "lostReason" TEXT,
    "nextFollowUp" TIMESTAMP(3),
    "assignedToId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" UUID NOT NULL,
    "enquiryId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" UUID NOT NULL,
    "enquiryId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "signerName" TEXT,
    "signatureUrl" TEXT,
    "pdfUrl" TEXT,
    "signerIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" UUID NOT NULL,
    "kind" "PackageKind" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "basePrice" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskTemplate" (
    "id" UUID NOT NULL,
    "packageId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "offsetDays" INTEGER NOT NULL,
    "defaultRole" "Role" NOT NULL DEFAULT 'PLANNER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wedding" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "enquiryId" UUID,
    "packageId" UUID NOT NULL,
    "leadPlannerId" UUID,
    "partner1" TEXT NOT NULL,
    "partner2" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "city" TEXT NOT NULL,
    "venue" TEXT,
    "guestCount" INTEGER NOT NULL,
    "theme" TEXT,
    "contractValue" INTEGER NOT NULL,
    "stage" "WeddingStage" NOT NULL DEFAULT 'BOOKED',
    "portalToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeddingEvent" (
    "id" UUID NOT NULL,
    "weddingId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeddingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" UUID NOT NULL,
    "weddingId" UUID NOT NULL,
    "templateId" UUID,
    "ownerId" UUID,
    "title" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "stage" "TaskStage" NOT NULL DEFAULT 'TO_PLAN',
    "dueDate" DATE,
    "doneAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMilestone" (
    "id" UUID NOT NULL,
    "weddingId" UUID NOT NULL,
    "type" "MilestoneType" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'DUE',
    "paidAt" TIMESTAMP(3),
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "contactName" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "notes" TEXT,
    "backupVendorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRequest" (
    "id" UUID NOT NULL,
    "weddingId" UUID NOT NULL,
    "category" "VendorCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "requirements" TEXT,
    "guestCount" INTEGER,
    "status" "QuoteRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorQuote" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "vendorId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "status" "VendorQuoteStatus" NOT NULL DEFAULT 'INVITED',
    "fileUrl" TEXT,
    "perPlate" INTEGER,
    "extraHourRate" INTEGER,
    "total" INTEGER,
    "notes" TEXT,
    "aiExtracted" BOOLEAN NOT NULL DEFAULT false,
    "aiReviewed" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLine" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "item" TEXT NOT NULL,
    "category" "QuoteLineCategory" NOT NULL DEFAULT 'OTHER',
    "qty" DOUBLE PRECISION,
    "unit" TEXT,
    "unitPrice" INTEGER,
    "included" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "weddingId" UUID NOT NULL,
    "vendorId" UUID NOT NULL,
    "quoteId" UUID,
    "category" "VendorCategory" NOT NULL,
    "agreedAmount" INTEGER NOT NULL,
    "perPlate" INTEGER,
    "agreedGuests" INTEGER,
    "agreedHours" INTEGER,
    "hourlyRate" INTEGER,
    "expectedArrival" TIMESTAMP(3),
    "checkinToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleItem" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "responsibleId" UUID,
    "bookingId" UUID,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 15,
    "title" TEXT NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'UPCOMING',
    "actualAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkin" (
    "id" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "bookingId" UUID NOT NULL,
    "expectedAt" TIMESTAMP(3),
    "arrivedAt" TIMESTAMP(3) NOT NULL,
    "method" "CheckinMethod" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" UUID NOT NULL,
    "clientId" TEXT,
    "weddingId" UUID NOT NULL,
    "ownerId" UUID,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MEDIUM',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Extra" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "clientUnitPrice" INTEGER,
    "billableToClient" BOOLEAN NOT NULL DEFAULT true,
    "clientApproved" BOOLEAN NOT NULL DEFAULT false,
    "milestoneId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Extra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBill" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "billNo" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "fileUrl" TEXT,
    "match" "BillMatch" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayment" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT NOT NULL,
    "isAdvance" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeLog" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "weddingId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Enquiry_status_idx" ON "Enquiry"("status");

-- CreateIndex
CREATE INDEX "Enquiry_phone_idx" ON "Enquiry"("phone");

-- CreateIndex
CREATE INDEX "Meeting_enquiryId_idx" ON "Meeting"("enquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_enquiryId_key" ON "Agreement"("enquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_token_key" ON "Agreement"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Package_kind_key" ON "Package"("kind");

-- CreateIndex
CREATE INDEX "TaskTemplate_packageId_idx" ON "TaskTemplate"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_code_key" ON "Wedding"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_enquiryId_key" ON "Wedding"("enquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_portalToken_key" ON "Wedding"("portalToken");

-- CreateIndex
CREATE INDEX "Wedding_stage_idx" ON "Wedding"("stage");

-- CreateIndex
CREATE INDEX "Wedding_startDate_idx" ON "Wedding"("startDate");

-- CreateIndex
CREATE INDEX "WeddingEvent_weddingId_idx" ON "WeddingEvent"("weddingId");

-- CreateIndex
CREATE INDEX "Task_weddingId_stage_idx" ON "Task"("weddingId", "stage");

-- CreateIndex
CREATE INDEX "Task_ownerId_idx" ON "Task"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMilestone_reference_key" ON "PaymentMilestone"("reference");

-- CreateIndex
CREATE INDEX "PaymentMilestone_weddingId_idx" ON "PaymentMilestone"("weddingId");

-- CreateIndex
CREATE INDEX "PaymentMilestone_status_dueDate_idx" ON "PaymentMilestone"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Vendor_category_city_idx" ON "Vendor"("category", "city");

-- CreateIndex
CREATE INDEX "QuoteRequest_weddingId_idx" ON "QuoteRequest"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorQuote_token_key" ON "VendorQuote"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VendorQuote_requestId_vendorId_key" ON "VendorQuote"("requestId", "vendorId");

-- CreateIndex
CREATE INDEX "QuoteLine_quoteId_idx" ON "QuoteLine"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_quoteId_key" ON "Booking"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_checkinToken_key" ON "Booking"("checkinToken");

-- CreateIndex
CREATE INDEX "Booking_weddingId_idx" ON "Booking"("weddingId");

-- CreateIndex
CREATE INDEX "Booking_vendorId_idx" ON "Booking"("vendorId");

-- CreateIndex
CREATE INDEX "ScheduleItem_eventId_startsAt_idx" ON "ScheduleItem"("eventId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "Checkin_clientId_key" ON "Checkin"("clientId");

-- CreateIndex
CREATE INDEX "Checkin_bookingId_idx" ON "Checkin"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_clientId_key" ON "Issue"("clientId");

-- CreateIndex
CREATE INDEX "Issue_weddingId_status_idx" ON "Issue"("weddingId", "status");

-- CreateIndex
CREATE INDEX "Extra_bookingId_idx" ON "Extra"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBill_bookingId_billNo_key" ON "VendorBill"("bookingId", "billNo");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPayment_reference_key" ON "VendorPayment"("reference");

-- CreateIndex
CREATE INDEX "VendorPayment_bookingId_idx" ON "VendorPayment"("bookingId");

-- CreateIndex
CREATE INDEX "TimeLog_weddingId_idx" ON "TimeLog"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- CreateIndex
CREATE INDEX "ActivityLog_entity_entityId_idx" ON "ActivityLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskTemplate" ADD CONSTRAINT "TaskTemplate_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wedding" ADD CONSTRAINT "Wedding_leadPlannerId_fkey" FOREIGN KEY ("leadPlannerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeddingEvent" ADD CONSTRAINT "WeddingEvent_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TaskTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMilestone" ADD CONSTRAINT "PaymentMilestone_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vendor" ADD CONSTRAINT "Vendor_backupVendorId_fkey" FOREIGN KEY ("backupVendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuote" ADD CONSTRAINT "VendorQuote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorQuote" ADD CONSTRAINT "VendorQuote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLine" ADD CONSTRAINT "QuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "VendorQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "VendorQuote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WeddingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkin" ADD CONSTRAINT "Checkin_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Extra" ADD CONSTRAINT "Extra_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Extra" ADD CONSTRAINT "Extra_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "PaymentMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBill" ADD CONSTRAINT "VendorBill_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayment" ADD CONSTRAINT "VendorPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
