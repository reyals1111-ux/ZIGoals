"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePrivateStore } from "../use-private-store";
import { habitCalendarDay,createHabit, emptyHabitData, habitDataSchema, HABITS_KEY, habitDay, habitRuleOn, logHabitValue, setHabitEntryStatus, smartDoneValue, type HabitData, type HabitInput, type HabitState } from "../../lib/habits";
import { shareHabitData } from "../../lib/habit-sharing";
import {scheduleHabitEdit,scheduleHabitState,earliestHabitChange} from "../../lib/habit-actions";
import { localDate } from "../../lib/local-date";

/** The previous read's unchanged habit objects are kept (lib/habit-sharing.ts), so memoized cards and caches hold. */
function useSharedHabitData(next: HabitData): HabitData {
  const previous = useRef(next);
  const shared = useMemo(() => shareHabitData(previous.current, next), [next]);
  previous.current = shared;
  return shared;
}

type Mood = "energized" | "good" | "neutral" | "difficult" | "calm";
/**
 * The pure changes behind a check-in. A card applies one to its own habit to paint the result first (Session I,
 * Part 9), then saves the same change through the store; the store's validation and write are unchanged.
 */
export const habitCheckIn = {
  setValue: (id: string, date: string, value: number, note?: string, mood?: Mood) => (data: HabitData) => logHabitValue(data, id, date, value, { note, mood }),
  addValue: (id: string, date: string, value: number) => (data: HabitData) => logHabitValue(data, id, date, value, { mode: "add" }),
  adjustCount: (id: string, date: string, delta: number) => (data: HabitData) => {
    const habit = data.habits.find((item) => item.id === id);
    if (!habit) throw new Error("Habit unavailable.");
    const day = habitDay(habit, date,habitCalendarDay(data));
    return logHabitValue(data, id, date, Math.min(1_000_000_000, Math.max(0, day.count + delta)), { note: day.note });
  },
  smartDone: (id: string, date: string) => (data: HabitData) => {
    const habit = data.habits.find((item) => item.id === id);
    if (!habit) throw new Error("Habit unavailable.");
    const rule = habitRuleOn(habit, date);
    if (!rule) throw new Error("Habit is not active on this date.");
    return logHabitValue(data, id, date, smartDoneValue(rule));
  },
};

export function useHabits() {
  const store = usePrivateStore(HABITS_KEY, habitDataSchema, emptyHabitData);
  const data = useSharedHabitData(store.data);
  const [today, setToday] = useState(localDate);
  const timeZone=data.timeZone;
  useEffect(() => {
    const refreshDate = () => setToday(habitCalendarDay({timeZone}));
    refreshDate();
    const timer = window.setInterval(refreshDate, 30000);
    window.addEventListener("focus", refreshDate);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refreshDate); };
  }, [timeZone]);
  // Actions depend only on the store's update, so their identity is stable once the store has loaded.
  const update = store.update;
  const actions = useMemo(() => ({
    create: (input: HabitInput, id?: string) => update((data) => createHabit(data, input, new Date(), id)),
    edit: (id: string, input: HabitInput, from?:string, expected?:string) => update((data) => scheduleHabitEdit(data, id, input, from??earliestHabitChange(data.habits.find(h=>h.id===id)!,habitCalendarDay(data)),new Date(),expected)),
    setState: (id: string, state: HabitState,from?:string,expected?:string) => update((data) => scheduleHabitState(data, id, state,from??earliestHabitChange(data.habits.find(h=>h.id===id)!,habitCalendarDay(data)),new Date(),expected)),
    setCount: (id: string, date: string, count: number, note: string, mood?: "energized" | "good" | "neutral" | "difficult" | "calm") => update((data) => logHabitValue(data, id, date, count, { note, mood })),
    setValue: (id: string, date: string, value: number, note?: string, mood?: Mood) => update(habitCheckIn.setValue(id, date, value, note, mood)),
    addValue: (id: string, date: string, value: number) => update(habitCheckIn.addValue(id, date, value)),
    markDay: (id: string, date: string, status: "skipped" | "failed", note = "") => update((data) => setHabitEntryStatus(data, id, date, status, note)),
    adjustCount: (id: string, date: string, delta: number) => update(habitCheckIn.adjustCount(id, date, delta)),
    smartDone: (id: string, date: string) => update(habitCheckIn.smartDone(id, date)),
    toggle: (id: string, date: string) => update((data) => {
      const habit = data.habits.find((item) => item.id === id);
      if (!habit) throw new Error("Habit unavailable.");
      const day = habitDay(habit, date,habitCalendarDay(data));
      return logHabitValue(data, id, date, day.status === "complete" ? 0 : smartDoneValue(habitRuleOn(habit, date)!), { note: day.note });
    }),
  }), [update]);
  // What a habit card needs, stable across check-ins on other habits (Session G, Part 2).
  const card = useMemo(() => ({ today, update, data: { timeZone }, ...actions }), [today, update, timeZone, actions]);
  return { ...store, data, today, ...actions, card };
}
export type HabitsStore = ReturnType<typeof useHabits>;
/** The part of the Habits store a card and its children use. A full HabitsStore also satisfies it. */
export type HabitCardStore = Pick<HabitsStore, "today" | "update" | "setValue" | "addValue" | "smartDone" | "adjustCount" | "setCount" | "markDay" | "setState"> & { data: Pick<HabitData, "timeZone"> };
