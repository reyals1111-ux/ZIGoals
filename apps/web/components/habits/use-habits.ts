"use client";
import { useEffect, useState } from "react";
import { usePrivateStore } from "../use-private-store";
import { createHabit, editHabit, emptyHabitData, habitDataSchema, HABITS_KEY, habitDay, logHabitCount, setHabitState, type HabitInput, type HabitState } from "../../lib/habits";
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
    edit: (id: string, input: HabitInput) => store.update((data) => editHabit(data, id, input)),
    setState: (id: string, state: HabitState) => store.update((data) => setHabitState(data, id, state)),
    setCount: (id: string, date: string, count: number, note: string) => store.update((data) => logHabitCount(data, id, date, count, note)),
    adjustCount: (id: string, date: string, delta: number) => store.update((data) => {
      const habit = data.habits.find((item) => item.id === id);
      if (!habit) throw new Error("Habit unavailable.");
      const day = habitDay(habit, date);
      return logHabitCount(data, id, date, Math.min(10000, Math.max(0, day.count + delta)), day.note);
    }),
    toggle: (id: string, date: string) => store.update((data) => {
      const habit = data.habits.find((item) => item.id === id);
      if (!habit) throw new Error("Habit unavailable.");
      const day = habitDay(habit, date);
      return logHabitCount(data, id, date, day.count >= day.target ? 0 : day.target, day.note);
    }),
  };
}
export type HabitsStore = ReturnType<typeof useHabits>;
