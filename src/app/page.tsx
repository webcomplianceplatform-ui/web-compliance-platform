import type { Metadata } from "next";
import LandingClient from "@/components/marketing/LandingClient";

export const metadata: Metadata = {
  title: "WebCompliance · Control legal, operativo y seguridad visible (sin rehacer tu web)",
  description:
    "Legal versionado, tickets, monitoring, auditoría, Security Alerts y evidencias exportables. Web opcional. Control obligatorio.",
};

export default function Home() {
  return <LandingClient />;
}
