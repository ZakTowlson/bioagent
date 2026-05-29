import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "10 Questions — The Viking Christian",
  description:
    "Ten questions to reveal something about yourself you may not even know. A reflection guided by The Viking Christian.",
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
