import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "なおかとおしゃべり",
  description: "ツンデレなAIの女の子「なおか」とおしゃべりするチャットアプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // ブラウザ拡張機能（Dark Reader 等）が html/body に属性を付与し、ハイドレーション警告になるため抑制する
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
