import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import Header from "@/components/header";
import Footer from "@/components/footer";
import ChromaticWaves from "@/components/chromatic-waves";
import ToastHost from "@/components/toast";

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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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
      suppressHydrationWarning
      className={`${cormorant.variable} ${manrope.variable} h-full antialiased`}
    >
      <head>
        {/*
          Apply the saved/system theme before first paint to avoid a flash of
          the wrong theme. Kept tiny and dependency-free.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem("scentury-theme");var d=s? s==="dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);var m=document.querySelector("meta[name=theme-color]");var c=d?"#08070f":"#faf6ef";if(m){m.setAttribute("content",c);}else{m=document.createElement("meta");m.setAttribute("name","theme-color");m.setAttribute("content",c);document.head.appendChild(m);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <CartProvider>
          <ChromaticWaves
            className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-[0.16]"
            intensity={0.35}
          />
          <Header />
          <main className="relative z-10 flex-1">{children}</main>
          <Footer />
          <ToastHost />
        </CartProvider>
      </body>
    </html>
  );
}
