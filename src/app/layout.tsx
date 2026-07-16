import type { Metadata } from "next";
import { Archivo, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const serif = DM_Serif_Display({
  variable: "--font-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Breezy Cuts | Fresh Cuts. Easy Booking.", template: "%s | Breezy Cuts" },
  description: "Fresh, professional barber services with easy online booking.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Breezy Cuts", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }, { url: "/icons/icon-512.png", sizes: "512x512" }], apple: "/icons/apple-touch-icon.png" },
};

export const viewport = { themeColor: "#0B1F33", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${serif.variable}`}
    >
      <body><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}
