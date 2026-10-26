'use client';
import {useDeviceRecord} from '../../ai/use-device-record';
import {WORKOUTS} from '../../../lib/workouts/schema';

/** The workout log on this device (Session AH Part 6, DE8). */
export const useWorkouts = () => useDeviceRecord(WORKOUTS);
