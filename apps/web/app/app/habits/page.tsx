import { Suspense } from "react";
import { HabitsWorkspace } from "../../../components/habits/habits-workspace";
import "../../../components/habits/habits.css";

export default function HabitsPage() { return <Suspense fallback={<p role="status">Loading your private journal…</p>}><HabitsWorkspace /></Suspense>; }
