import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdSell Outreach",
  description: "AdSell Outreach web app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-fg font-sans">
        {children}
      </body>
    </html>
  );
}
