import type { Metadata, Viewport } from "next";
import { Toaster } from "@/frontend/components/ui/sonner";
// Fonts are bundled locally so the app looks right offline (venue Wi-Fi is unreliable).
import "@fontsource-variable/inter";
import "@fontsource-variable/geist";
import "@fontsource/yeseva-one/400.css";
import "./globals.css";
import { SPLASH_PREFLIGHT } from "@/frontend/components/home/splash-preflight";

export const metadata: Metadata = {
  title: { default: "KnotOS · The Royal Knot", template: "%s · KnotOS" },
  description: "Wedding operations for The Royal Knot — enquiries, vendors, plans, the big day and settlement in one place.",
};

export const viewport: Viewport = {
  themeColor: "#5c1a24",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_PREFLIGHT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
