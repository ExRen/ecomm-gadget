import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "GadgetPasaria - Destinasi Gadget Terlengkap & Terpercaya",
  description: "Pusat belanja smartphone, laptop, dan aksesoris gadget original dengan jaminan garansi resmi dan pembayaran aman melalui Midtrans.",
  keywords: "gadget, smartphone, laptop, apple, samsung, belanja online, GadgetPasaria, midtrans",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
        <Script
          src="https://app.midtrans.com/snap/snap.js"
          data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
