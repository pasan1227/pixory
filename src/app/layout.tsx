import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { images } from "@/data/images";
import { BRAND_NAME } from "@/data/site";
import { en } from "@/i18n/en";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: en.meta.defaultTitle,
    template: `%s — ${BRAND_NAME}`,
  },
  description: en.meta.defaultDescription,
  openGraph: {
    siteName: BRAND_NAME,
    images: [images.og],
    type: "website",
    locale: "en_LK",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      {/* Zero-cost aliases so cover previews outside the editor (create,
          my-books) render the already-loaded fonts; Lora/Caveat still load
          only in the (editor) route group. */}
      <body
        className="flex min-h-full flex-col"
        style={{
          ["--font-book-fraunces" as string]: "var(--font-fraunces)",
          ["--font-book-inter" as string]: "var(--font-inter)",
        }}
      >
        {children}
      </body>
    </html>
  );
}
