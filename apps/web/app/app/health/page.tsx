import { Suspense } from "react";
import { HealthApp } from "../../../components/health/health-app";
import "../../../components/health/health.css";

export default function HealthPage() { return <Suspense fallback={<p role="status">Loading your private journal…</p>}><HealthApp /></Suspense>; }
