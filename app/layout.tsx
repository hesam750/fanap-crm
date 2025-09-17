import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./provider";
import { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

const BYekan = localFont({
  src: "../fonts/BYekan.ttf",
  variable: "--font-b-yekan",
  display: "swap",
  weight: "400",
  style: "normal",
});

export const metadata: Metadata = {
  title: "سیستم مدیریت مخازن",
  description: "سیستم مدیریت و نظارت بر مخازن سوخت و آب",
  generator: 'fanap.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className={`${BYekan.variable}`}>
      <body
        className="bg-background text-foreground antialiased"
        style={{ fontFamily: 'var(--font-b-yekan), sans-serif' }}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <Providers>
            {children}
          </Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}