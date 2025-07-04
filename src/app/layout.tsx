import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import LayoutWithNav from "@/components/layout/LayoutWithNav";

const gontserrat = localFont({
  src: [
    {
      path: '../fonts/gontserrat/Gontserrat-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/gontserrat/Gontserrat-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../fonts/gontserrat/Gontserrat-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: "--font-gontserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "X Akademi - Koçluk Platformu",
  description: "Öğrenci ve koçlar için gelişmiş koçluk platformu",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${gontserrat.variable} antialiased bg-black`}
      >
        <LayoutWithNav>{children}</LayoutWithNav>
      </body>
    </html>
  );
}
