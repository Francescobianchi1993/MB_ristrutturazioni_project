import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vendi casa in fretta a Roma — senza agenzia, senza commissioni",
  description:
    "Acquistiamo noi il tuo immobile a Roma, direttamente. Offerta chiara, tempi rapidi, zero costi a tuo carico. Ricevi una valutazione indicativa in pochi minuti.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Vendi casa in fretta a Roma — senza agenzia",
    description:
      "Compriamo noi la tua casa. Offerta chiara, tempi rapidi, zero commissioni.",
    type: "website",
    locale: "it_IT",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a9054",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
