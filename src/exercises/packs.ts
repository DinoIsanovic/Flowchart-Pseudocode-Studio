/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Task, TaskPack } from './types';
import linijska from './linijska.json';
import grananje from './grananje.json';
import petlje from './petlje.json';

/**
 * The task bank, in teaching order.
 *
 * Kept here rather than in the panel that shows it: marking a submission has
 * to find the task it belongs to, and a second list of the packs would be a
 * second place to forget a topic.
 */
export const PACKS: TaskPack[] = [linijska as TaskPack, grananje as TaskPack, petlje as TaskPack];

export function findTask(id: string | null | undefined): Task | null {
  if (!id) return null;
  for (const pack of PACKS) {
    const found = pack.tasks.find((task) => task.id === id);
    if (found) return found;
  }
  return null;
}
