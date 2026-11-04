'use client';
import {useEffect} from 'react';
import {registerTimelineSource} from '../../lib/timeline/sources';

/**
 * Session AL (PR-103, P-PR-41): puts tasks on the Day Timeline (and Today's timeline card). Renders nothing; the source's
 * code loads only when a timeline reads it. Registering twice is harmless (one source per id).
 */
export function TasksTimelineSource() {
  useEffect(() => registerTimelineSource('tasks', () => import('../../lib/tasks/timeline-source').then(m => m.tasksTimelineSource)), []);
  return null;
}
export default TasksTimelineSource;
