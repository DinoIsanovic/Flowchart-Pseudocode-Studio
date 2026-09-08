/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Naming for the counter a count loop keeps implicit.
 *
 * Shared by the Python generator and the interpreter on purpose: the variable
 * the student sees stepping through the table has to be the same one the
 * generated `for` line names, or the two views would disagree about what is
 * counting.
 *
 * The name follows the depth of the loop and nothing else — `i`, then `j` in a
 * loop inside it — so a student can write `ISPIŠI i` and have it mean what it
 * says. It is a plain variable: where the program already uses that name, the
 * loop takes it over, exactly as `for i in range(n)` does in Python.
 */

/** Names a count loop uses, one per level of nesting. */
const COUNTER_NAMES = ['i', 'j', 'k', 'l', 'm', 'n', 'p', 'q'];

/** The counter of a loop at this depth; deeper nests than names fall back. */
export function counterName(depth: number): string {
  return COUNTER_NAMES[depth] ?? `i${depth + 1}`;
}
