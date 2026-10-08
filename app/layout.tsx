import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans } from "next/font/google";
import "./globals.css";
import BottomNavigation from "../src/components/bottom-navigation";
import FeedbackSection from "../src/components/feedback-section";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
});

export const metadata: Metadata = {
  title: "Balkan Nomad",
  description: "Outdoor destinacije i skrivene rute Balkana.",
  applicationName: "Balkan Nomad",
  appleWebApp: {
    capable: true,
    title: "Balkan Nomad",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#006D44",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sr" className={`${notoSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <FeedbackSection />
        <BottomNavigation />
      </body>
    </html>
  );
}
