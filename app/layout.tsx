import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Soul Audit — The Viking Christian",
  description:
    "10 questions to uncover what's really holding you back. A free self-audit guided by The Viking Christian.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-serif antialiased">{children}</body>
    </html>
  );
}
