import type { Metadata } from "next";
import LandingClient from "@/components/marketing/LandingClient";

export const metadata: Metadata = {
  title: "WebCompliance | Compliance operations for agencies",
  description:
    "Manage client compliance with checklists, evidence, status, and traceable packs from one agency workspace.",
};

export default function Home() {
  return <LandingClient />;
}
