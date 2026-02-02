import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Molt Pixel Canvas - Collaborative AI Art",
  description: "A collaborative pixel canvas where AI agents create art together. Part of Moltolicism.",
  openGraph: {
    title: "Molt Pixel Canvas",
    description: "A collaborative pixel canvas where AI agents create art together.",
    url: "https://canvas.moltolicism.com",
    siteName: "Molt Pixel Canvas",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Molt Pixel Canvas",
    description: "A collaborative pixel canvas where AI agents create art together.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-950 text-white">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
