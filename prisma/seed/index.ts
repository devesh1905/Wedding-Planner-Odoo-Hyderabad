import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PACKAGES } from "./templates";

const db = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash("knot@2026", 10);
  const users = [
    { name: "Rajveer Singh", email: "founder@royalknot.in", role: "FOUNDER" as const, hourlyCost: 2500_00, avatarColor: "maroon" },
    { name: "Ananya Mehta", email: "ananya@royalknot.in", role: "PLANNER" as const, hourlyCost: 900_00, avatarColor: "marigold" },
    { name: "Kabir Rathore", email: "kabir@royalknot.in", role: "PLANNER" as const, hourlyCost: 800_00, avatarColor: "teal" },
    { name: "Ishita Sharma", email: "ishita@royalknot.in", role: "PLANNER" as const, hourlyCost: 750_00, avatarColor: "rose" },
  ];
  for (const u of users) {
    await db.user.upsert({ where: { email: u.email }, update: {}, create: { ...u, passwordHash: hash } });
  }

  for (const p of PACKAGES) {
    const pkg = await db.package.upsert({
      where: { kind: p.kind },
      update: { name: p.name, description: p.description, basePrice: p.basePrice },
      create: { kind: p.kind, name: p.name, description: p.description, basePrice: p.basePrice },
    });
    await db.taskTemplate.deleteMany({ where: { packageId: pkg.id } });
    await db.taskTemplate.createMany({
      data: p.templates.map((t, i) => ({
        packageId: pkg.id,
        title: t.title,
        event: t.event,
        offsetDays: t.offsetDays,
        defaultRole: t.role ?? "PLANNER",
        sortOrder: i,
      })),
    });
  }

  console.log(`Seeded ${users.length} users, ${PACKAGES.length} packages`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
