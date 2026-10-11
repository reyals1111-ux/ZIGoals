'use client';
import {createContext, useContext} from 'react';
import type {HabitExtrasState} from './use-habit-extras';
/** The page's habit extras (areas, quit costs, bells), provided once by the Habits page and Today's widget; a card reads it. */
export const HabitExtrasContext = createContext<HabitExtrasState | null>(null);
export const useHabitExtrasContext = () => useContext(HabitExtrasContext);
