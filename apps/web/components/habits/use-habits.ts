"use client";
import { useEffect, useState } from "react";
import { usePrivateStore } from "../use-private-store";
import { createHabit, emptyHabitData, habitDataSchema, HABITS_KEY, habitDay, habitRuleOn, logHabitValue, setHabitEntryStatus, smartDoneValue, type HabitInput, type HabitState } from "../../lib/habits";
import {scheduleHabitEdit,scheduleHabitState,earliestHabitChange} from "../../lib/habit-actions";
import { localDate } from "../../lib/local-date";

export function useHabits() {
  const store = usePrivateStore(HABITS_KEY, habitDataSchema, emptyHabitData);
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    const refreshDate = () => setToday(localDate());
    const timer = window.setInterval(refreshDate, 30000);
    window.addEventListener("focus", refreshDate);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshDate); };
  }, []);
  return {
    ...store, today,
    create: (input: HabitInput) => store.update((data) => createHabit(data, input)),
    edit: (id: string, input: HabitInput, from?:string, expected?:string) => store.update((data) => scheduleHabitEdit(data, id, input, from??earliestHabitChange(data.habits.find(h=>h.id===id)!),new Date(),expected)),
    setState: (id: string, state: HabitState,from?:string,expected?:string) => store.update((data) => scheduleHabitState(data, id, state,from??earliestHabitChange(data.habits.find(h=>h.id===id)!),new Date(),expected)),
    setCount: (id: string, date: string, count: number, note: string, mood?: "energized" | "good" | "neutral" | "difficult" | "calm") => store.update((data) => logHabitValue(data, id, date, count, { note, mood })),
    setValue: (id: string, date: string, value: number, note?: string, mood?: "energized" | "good" | "neutral" | "difficult" | "calm") => store.update((data) => logHabitValue(data, id, date, value, { note, mood })),
    addValue: (id: string, date: string, value: number) => store.update((data) => logHabitValue(data, id, date, value, { mode: "add" })),
    markDay: (id: string, date: string, status: "skipped" | "failed", note = "") => store.update((data) => setHabitEntryStatus(data, id, date, status, note)),
    adjustCount: (id: string, date: string, delta: number) => store.update((data) => {
      const habit = data.habits.find((item) => item.id === id);
      if (!habit) throw new Error("Habit unavailable.");
      const day = habitDay(habit, date);
      return logHabitValue(data, id, date, Math.min(1_000_000_000, Math.max(0, day.count + delta)), { note: day.note });
    }),
    smartDone: (id: string, date: string) => store.update((data) => {
      const habit = data.habits.find((item) => item.id === id);
      if (!habit) throw new Error("Habit unavailable.");
      const rule = habitRuleOn(habit, date);
      if (!rule) throw new Error("Habit is not active on this date.");
      return logHabitValue(data, id, date, smartDoneValue(rule));
    }),
    toggle: (id: string, date: string) => store.update((data) => {
      const habit = data.habits.find((item) => item.id === id);
      if (!habit) throw new Error("Habit unavailable.");
      const day = habitDay(habit, date);
      return logHabitValue(data, id, date, day.status === "complete" ? 0 : smartDoneValue(habitRuleOn(habit, date)!), { note: day.note });
    }),
  };
}
export type HabitsStore = ReturnType<typeof useHabits>;
