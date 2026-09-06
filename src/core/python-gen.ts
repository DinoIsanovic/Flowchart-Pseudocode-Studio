/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, Statement } from '../types';
import { assignStepNumbers } from './flowchart-gen';
import { counterName, identifiersUsed } from './counters';

export interface PythonLine {
  /** Source text without indentation. */
  text: string;
  /** Indentation depth, four spaces per level when rendered. */
  depth: number;
  /**
   * Badge of the flowchart node this line came from. Structural lines that
   * draw no node of their own — `else:`, a `break` closing a bottom-checked
   * loop — carry no badge.
   */
  step?: number;
}

const INDENT = '    ';

/**
 * Pseudocode writes equality as a single `=`, which Python reads as
 * assignment. Only conditions go through here; assignments keep their `=`.
 */
export function conditionToPython(cond: string): string {
  return (cond || '').replace(/(^|[^=!<>])=(?!=)/g, '$1==').trim();
}

/** `unesi a, b` names two variables and needs one input() call per name. */
function inputTargets(text: string): string[] {
  return (text || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}


function actionLines(stmt: Statement, depth: number, step?: number): PythonLine[] {
  const text = (stmt.text ?? '').trim();

  if (stmt.kind === 'unesi') {
    const targets = inputTargets(text);
    if (!targets.length) return [{ text: 'value = int(input())', depth, step }];
    // Numbers cover nearly every school exercise; a student reading a name or
    // a decimal drops the int() themselves, which is a teachable moment.
    return targets.map((v) => ({ text: `${v} = int(input())`, depth, step }));
  }

  if (stmt.kind === 'ispisi') {
    return [{ text: `print(${text})`, depth, step }];
  }

  if (stmt.kind === 'postavi' || stmt.kind === 'racunaj') {
    return [{ text, depth, step }];
  }

  // A line the parser could not classify: keep it visible but inert, so the
  // generated file still runs.
  return [{ text: `# ${text}`, depth, step }];
}

function walk(
  stmts: Statement[],
  depth: number,
  stepOf: Map<Statement, number>,
  used: Set<string>,
  loopDepth = 0
): PythonLine[] {
  const out: PythonLine[] = [];

  stmts.forEach((stmt) => {
    const step = stepOf.get(stmt);

    if (stmt.type === 'action') {
      out.push(...actionLines(stmt, depth, step));
      return;
    }

    if (stmt.type === 'if') {
      out.push({ text: `if ${conditionToPython(stmt.cond ?? '')}:`, depth, step });
      const thenBlock = stmt.thenBlock ?? [];
      out.push(...(thenBlock.length ? walk(thenBlock, depth + 1, stepOf, used, loopDepth) : [{ text: 'pass', depth: depth + 1 }]));

      const elseBlock = stmt.elseBlock ?? [];
      if (!elseBlock.length) return;

      // ELSE IF parses as an else branch holding a single if, which Python
      // writes as elif rather than a nested block.
      const only = elseBlock.length === 1 ? elseBlock[0] : null;
      if (only && only.type === 'if') {
        const chained = walk(elseBlock, depth, stepOf, used, loopDepth);
        chained[0] = { ...chained[0], text: chained[0].text.replace(/^if /, 'elif ') };
        out.push(...chained);
        return;
      }

      out.push({ text: 'else:', depth });
      out.push(...walk(elseBlock, depth + 1, stepOf, used, loopDepth));
      return;
    }

    if (stmt.type === 'count_loop') {
      // The pseudocode keeps the counter implicit, but naming it in Python is
      // the point of showing Python at all: the student sees the variable that
      // was doing the counting, and that it advances by one each pass.
      const name = counterName(used, loopDepth);
      out.push({ text: `for ${name} in range(${stmt.times ?? '3'}):`, depth, step });
      const body = stmt.body ?? [];
      out.push(...(body.length
        ? walk(body, depth + 1, stepOf, used, loopDepth + 1)
        : [{ text: 'pass', depth: depth + 1 }]));
      return;
    }

    if (stmt.type === 'loop') {
      // The diagram always draws the test at the top of the loop and only
      // swaps the branch labels for the UNTIL form, so the code matches it by
      // negating the condition rather than by moving the test to the bottom.
      // A bare REPEAT with no closing WHILE/UNTIL line parses to an empty
      // condition without raising an error, which would emit `while :`.
      const cond = conditionToPython(stmt.cond ?? '');
      const header = !cond
        ? 'while True:  # TODO: condition missing in the pseudocode'
        : stmt.until
        ? `while not (${cond}):`
        : `while ${cond}:`;
      out.push({ text: header, depth, step });
      const body = stmt.body ?? [];
      out.push(...(body.length
        ? walk(body, depth + 1, stepOf, used, loopDepth)
        : [{ text: 'pass', depth: depth + 1 }]));
      return;
    }
  });

  return out;
}

/**
 * Generates Python equivalent to the parsed pseudocode. Every line carries the
 * badge of the flowchart node it belongs to, so the export can print the three
 * columns side by side without relying on them lining up geometrically.
 */
export function statementsToPython(statements: Statement[], _lang: Language = 'en'): PythonLine[] {
  const stepOf = assignStepNumbers(statements);
  const body = walk(statements, 0, stepOf, identifiersUsed(statements));
  return body.length ? body : [{ text: 'pass', depth: 0 }];
}

/** Flattens the generated lines into a Python source file. */
export function pythonSource(lines: PythonLine[]): string {
  return lines.map((l) => INDENT.repeat(l.depth) + l.text).join('\n');
}
