import { Suspense } from "react";
import { HealthApp } from "../../../components/health/health-app";
import "../../../components/health/health.css";
import type {Metadata} from "next";
import {Skeleton} from "../../../components/ui/skeleton";
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: "Health"};

export default function HealthPage() { return <Suspense fallback={<Skeleton page label="Loading your private journal…"/>}><HealthApp /></Suspense>; }
