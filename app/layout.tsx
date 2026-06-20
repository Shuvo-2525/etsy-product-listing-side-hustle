import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Etsy Listing Health Check",
  description:
    "Paste an Etsy listing and instantly get a Visibility score, a Conversion score, and a plain-English verdict on which problem to fix first.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
