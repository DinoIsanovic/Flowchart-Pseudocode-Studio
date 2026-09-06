/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Statement } from '../types';

/**
 * Naming for the counter a count loop keeps implicit.
 *
 * Shared by the Python generator and the interpreter on purpose: the variable
 * the student sees stepping through the table has to be the same one the
 * generated `for` line names, or the two views would disagree about what is
 * counting.
 */

/** Names a count loop can use, in the order they are handed out. */
const COUNTER_NAMES = ['i', 'j', 'k', 'l', 'm', 'n', 'p', 'q'];

/**
 * Every identifier the student wrote anywhere in the program. A loop counter
 * must not reuse one of these, or `PONOVI 3 PUTA` would quietly overwrite a
 * variable the algorithm depends on.
 */
export function identifiersUsed(stmts: Statement[], out = new Set<string>()): Set<string> {
  const scan = (text?: string) => {
    (text ?? '').match(/[A-Za-z_À-ɏ][A-Za-z0-9_À-ɏ]*/g)?.forEach((w) => out.add(w));
  };
  stmts.forEach((stmt) => {
    scan(stmt.text);
    scan(stmt.cond);
    if (stmt.type === 'if') {
      identifiersUsed(stmt.thenBlock ?? [], out);
      identifiersUsed(stmt.elseBlock ?? [], out);
    } else if (stmt.body) {
      identifiersUsed(stmt.body, out);
    }
  });
  return out;
}

/** Picks the nth free counter name, so nested loops never share one. */
export function counterName(used: Set<string>, depth: number): string {
  const free = COUNTER_NAMES.filter((n) => !used.has(n));
  return free[depth] ?? `i${depth + 1}`;
}
