import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoClip — AI short-form clipping",
  description: "Turn long videos into ranked short clips with AI-assisted moment detection, titles, captions, and vertical exports.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
