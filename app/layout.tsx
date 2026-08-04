import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import Header from "@/components/header";
import Footer from "@/components/footer";
import ChromaticWaves from "@/components/chromatic-waves";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Scentury21 — Luxury Perfumes, Delivered Worldwide",
    template: "%s · Scentury21",
  },
  description:
    "Scentury21 is a premium perfume house. Discover extrait and eau de parfum crafted from rare ingredients, delivered to over 40 countries with precise GPS delivery.",
  keywords: ["perfume", "luxury fragrance", "oud", "extrait de parfum", "Scentury21", "Nigerian perfume"],
};

export const viewport: Viewport = {
  themeColor: "#08070f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <CartProvider>
          <ChromaticWaves
            className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.16]"
            intensity={0.35}
          />
          <Header />
          <main className="relative z-10 flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
