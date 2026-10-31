# Seed import contract

All records are seed inputs for database insertion, never runtime application data. IDs are stable UUIDs and money is integer paise.
Insert vendors without backupVendorId first, then update their backup references after all vendors exist.
Resolve packageName and leadPlannerRole to the integrator's package and user IDs when importing weddings. Map WeddingStage to the final schema enum.
Insert weddingEvents, schedule, historicalBookings and checkins in that order; role fields are import hints to resolve real responsible user IDs.
Historical bookings explicitly link settled weddings and vendor IDs so check-ins have valid booking parents. Beat Baraat is late exactly three times.
Use weddingFinance to create payments, bills and time logs through the seed script, preserving revenue minus costs minus hours times hourly cost. Include both profitable and loss-making weddings.
The demo couple has 400 contracted guests for quote comparison. The later overage can be demonstrated as an extra rather than changing their original contract.
Run `npx tsx prisma/seed-data/seeds.test.ts` and strict typechecking before importing.
