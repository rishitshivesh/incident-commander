import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Incident Commander",
  description: "AI-assisted incident investigation powered by Cloudflare Agents"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
