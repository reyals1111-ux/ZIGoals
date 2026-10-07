import { trustedOrigin } from "../lib/trusted-origin";
import { connection } from "next/server";
import { headers } from "next/headers";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./visual-theme.css";
import "./product-v2.css";
import "./visual-v21.css";
import "./product-beta.css";
import "../components/motion.css";
import "../components/design-system.css";
/**
 * Phones draw edge to edge and pad with safe-area insets (Session E); the browser chrome takes the cosmic background colour
 * on phones only. Nothing here changes how a desktop or tablet browser renders the page.
 */
export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(max-width: 767.98px)", color: "#020918" },
    { media: "(pointer: coarse) and (max-height: 500px)", color: "#020918" },
  ],
};
export async function generateMetadata(): Promise<Metadata> {
  // Middleware overwrites this header from the URL being served; on the paths it skips, a client could send it, so only
  // the public Alpha's and loopback origins are used (lib/trusted-origin.ts, Session U Part 6, FIX_PLAN D2).
  const origin = trustedOrigin((await headers()).get("x-zigoals-origin"));
  return {
    metadataBase: origin ? new URL(origin) : undefined,
    // Use the public entry for every Alpha screen, excluding private goal IDs and queries.
    alternates: origin ? { canonical: new URL("/app", origin).href } : undefined,
    icons: { icon: { url: "/icon.svg", type: "image/svg+xml", sizes: "any" }, apple: { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" } },
    // The name under the Home Screen icon (otherwise the page title); title only, no capability meta (Session L).
    appleWebApp: { title: "ZIGoals", capable: false },
    // The installed app's manifest (Session L) is a static file since Session X Part 5a, public/manifest.webmanifest, at
    // the same address with byte-identical JSON (name, icons, colours, id, start page, scope, standalone display; no
    // service worker or offline cache), so the asset layer answers it without a Worker call and saved Home Screen apps
    // keep their identity. The icons are the origami Z on the deep-navy background (--cosmic-dark); Safari asks for an
    // opaque full-bleed maskable icon at 1024 px (Safari 17.2 release notes); the iPhone uses /apple-touch-icon.png.
    manifest: "/manifest.webmanifest",
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
