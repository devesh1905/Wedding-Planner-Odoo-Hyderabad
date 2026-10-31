import { seedId, seedTimestamp, vendorCategories, type VendorSeed } from "./types";
const names = [
  ["Shahi Rasoi", "Marwar Feasts", "Royal Thaal", "Mewar Bhoj"],
  ["Rajwada Celebrations", "Gulabi Mandap", "Lake City Designs", "Rang Mahal Decor"],
  ["Phool Mahal", "Mogra Stories", "Gulab Bagh Florals", "Kesar Petals"],
  ["Beat Baraat", "Pink City Beats", "Lakewave Sound", "Sangeet Sutra"],
  ["Rajputana Dhol", "Jaipur Nagada", "Mewar Dhol Toli", "Shubh Baraat"],
  ["Aditi Bridal Studio", "Kavya Makeovers", "Naina Beauty Atelier", "Rhea Bridal Art"],
  ["Pehla Phera Films", "Gulabi Frames", "Lake Lens Weddings", "Saat Vachan Studios"],
  ["Amber Illumination", "Pink City Lights", "Mewar Glow", "Deepak Event Lighting"],
  ["Raj Tent House", "Sheesh Mahal Canopies", "Lakeview Shamiana", "Mewar Marquees"],
  ["Rajputana Rides", "Gulabi Safar", "Lake City Coaches", "Mewar Guest Transit"],
] as const;
export const vendors: VendorSeed[] = vendorCategories.flatMap((category, categoryIndex) =>
  names[categoryIndex]!.map((name, localIndex) => {
    const index = categoryIndex * 4 + localIndex;
    return {
      id: seedId(1, index + 1),
      name,
      category,
      phone: `9${String(810000000 + index).padStart(9, "0")}`,
      email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@example.com`,
      city: localIndex < 2 ? "Jaipur" : "Udaipur",
      backupVendorId: seedId(1, categoryIndex * 4 + (localIndex ^ 1) + 1),
      createdAt: seedTimestamp,
      updatedAt: seedTimestamp,
    };
  }),
);
