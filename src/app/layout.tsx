import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DisasterLens — AI Disaster Intelligence | KIT Tiptur",
  description: "AI-Powered Disaster Intelligence System connecting victims and rescue teams. Built by students of Kalpataru Institute of Technology, Tiptur.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet"/>
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>{children}</body>
    </html>
  );
}
