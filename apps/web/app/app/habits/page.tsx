import { Suspense } from "react";
import { HabitsWorkspace } from "../../../components/habits/habits-workspace";
import "../../../components/habits/habits.css";
import type {Metadata} from "next";
import {Skeleton} from "../../../components/ui/skeleton";
// Session X Part 12 (WCAG 2.4.2): each page has its own title, "<page> · ZIGoals Alpha" (app/layout.tsx).
export const metadata: Metadata = {title: "Habits"};

export default function HabitsPage() { return <Suspense fallback={<Skeleton page label="Loading your private journal…"/>}><HabitsWorkspace /></Suspense>; }
