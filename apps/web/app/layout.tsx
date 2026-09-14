import { connection } from "next/server";
import { headers } from "next/headers";
import type { Metadata } from "next";
import "./globals.css";
import "./visual-theme.css";
export async function generateMetadata(): Promise<Metadata> {
  // Middleware overwrites this header from the URL being served, never a supplied header.
  const origin = (await headers()).get("x-zigoals-origin");
  return {
    metadataBase: origin ? new URL(origin) : undefined,
    // Use the public entry for every Alpha screen, excluding private goal IDs and queries.
    alternates: origin ? { canonical: new URL("/app", origin).href } : undefined,
    icons: { icon: { url: "/icon.svg", type: "image/svg+xml", sizes: "any" } },
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      title: "ZIGoals Alpha",
      description: "Local simulation and connection-only testnet preview. No financial actions.",
      ...(origin ? { images: [{ url: "/social-card.png", width: 1200, height: 630 }] } : {}),
    },
    title: "ZIGoals Alpha — Your goals. Onchain.",
    description:
      "Plan, fund and track goals in a clearly labelled local demo or ZIGChain Testnet. Independent, unaudited alpha.",
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
