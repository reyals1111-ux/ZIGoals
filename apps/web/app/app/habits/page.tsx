import { Suspense } from "react";
import { HabitsWorkspace } from "../../../components/habits/habits-workspace";
import "../../../components/habits/habits.css";
import type {Metadata} from "next";
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: "Habits"};

export default function HabitsPage() { return <Suspense fallback={<p role="status">Loading your private journal…</p>}><HabitsWorkspace /></Suspense>; }
