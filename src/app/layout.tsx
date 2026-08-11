import type { Metadata } from "next";
import { Geist, Geist_Mono, Manrope, Plus_Jakarta_Sans } from "next/font/google";
import "../styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AtomicMotion UI",
  description: "Premium copy-paste micro-interactions for React interfaces.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--jitter-bg)] text-[var(--jitter-ink)]">
        {children}
      </body>
    </html>
  );
}
