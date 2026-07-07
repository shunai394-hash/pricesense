import type { Metadata } from "next";
import Script from "next/script";
import { Cormorant_Garamond, Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  weight: ["300", "400", "500", "700"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PriceSense — 単価診断",
  description:
    "職種と単価を入力するだけ。市場との比較を無料診断。あなたの取り逃し年間機会損失を可視化します。",
  openGraph: {
    title: "PriceSense — 単価診断",
    description: "職種と単価を入力するだけ。市場との比較を無料診断。",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-5WC4G8MNQ8"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5WC4G8MNQ8');
          `}
        </Script>
      </head>

      <body
        className={`${notoSansJP.variable} ${cormorant.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}