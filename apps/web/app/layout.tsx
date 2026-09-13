import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ZIGoals Alpha — Your goals. Onchain.",
  description:
    "Plan, fund and track goals in a clearly labelled local demo or ZIGChain Testnet. Independent, unaudited alpha.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
