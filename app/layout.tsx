import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrepesALatte — Service Studio",
  description: "Configure and manage deal services for CrepesALatte.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
