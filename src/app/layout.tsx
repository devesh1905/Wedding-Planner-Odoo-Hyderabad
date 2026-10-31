import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
// Fonts are bundled locally so the app looks right offline (venue Wi-Fi is unreliable).
import "@fontsource-variable/inter";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "KnotOS · The Royal Knot", template: "%s · KnotOS" },
  description: "Wedding operations for The Royal Knot — enquiries, vendors, plans, the big day and settlement in one place.",
};

export const viewport: Viewport = {
  themeColor: "#5c1a24",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
