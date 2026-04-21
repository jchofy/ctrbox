import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import { Sidebar } from "@/components/layout/sidebar";
import { Providers } from "@/components/layout/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CTRBox",
  description: "Click-through rate optimization platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>
          <Sidebar />
          <main className="ml-56 min-h-screen">
            <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
