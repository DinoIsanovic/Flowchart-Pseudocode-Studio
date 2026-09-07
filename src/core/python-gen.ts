/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, SourceLang, Statement } from '../types';
import { sourceLang } from '../i18n/croatian';
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

/**
 * The name of the input helper, spelled the way the student's own pseudocode
 * spells the keyword — all three are words `parsePseudocode` already accepts.
 */
const READ_FN: Record<SourceLang, string> = { bs: 'unesi', en: 'read', de: 'lies' };

/**
 * `int(input())` is wrong for any exercise whose test values have a decimal
 * point, and `float(input())` is wrong for any count a loop later feeds to
 * `range()`. This helper does what the simulator's `readValue` does: a whole
 * number stays whole, a decimal stays decimal, and anything else stays text.
 * It is emitted only when the program actually reads something.
 */
function readHelper(lang: Language): PythonLine[] {
  const fn = READ_FN[lang];
  const note: Record<SourceLang, string> = {
    bs: '# Pročita jednu vrijednost: cijeli broj, decimalni broj ili tekst.',
    en: '# Reads one value: a whole number, a decimal number, or text.',
    de: '# Liest einen Wert: ganze Zahl, Dezimalzahl oder Text.',
  };
  const v: Record<SourceLang, string> = { bs: 'tekst', en: 'text', de: 'text' };
  const t = v[lang];
  return [
    { text: note[lang], depth: 0 },
    { text: `def ${fn}():`, depth: 0 },
    { text: `${t} = input().strip()`, depth: 1 },
    { text: `if ${t}.lstrip("+-").replace(".", "", 1).isdigit():`, depth: 1 },
    { text: `return float(${t}) if "." in ${t} else int(${t})`, depth: 2 },
    { text: `return ${t}`, depth: 1 },
    { text: '', depth: 0 },
  ];
}

/** `unesi a, b` names two variables and needs one input() call per name. */
function inputTargets(text: string): string[] {
  return (text || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}


function actionLines(stmt: Statement, depth: number, lang: Language, step?: number): PythonLine[] {
  const text = (stmt.text ?? '').trim();

  if (stmt.kind === 'unesi') {
    const fn = READ_FN[lang];
    const targets = inputTargets(text);
    if (!targets.length) return [{ text: `value = ${fn}()`, depth, step }];
    return targets.map((v) => ({ text: `${v} = ${fn}()`, depth, step }));
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
  lang: Language,
  loopDepth = 0
): PythonLine[] {
  const out: PythonLine[] = [];

  stmts.forEach((stmt) => {
    const step = stepOf.get(stmt);

    if (stmt.type === 'action') {
      out.push(...actionLines(stmt, depth, lang, step));
      return;
    }

    if (stmt.type === 'if') {
      out.push({ text: `if ${conditionToPython(stmt.cond ?? '')}:`, depth, step });
      const thenBlock = stmt.thenBlock ?? [];
      out.push(...(thenBlock.length ? walk(thenBlock, depth + 1, stepOf, used, lang, loopDepth) : [{ text: 'pass', depth: depth + 1 }]));

      const elseBlock = stmt.elseBlock ?? [];
      if (!elseBlock.length) return;

      // ELSE IF parses as an else branch holding a single if, which Python
      // writes as elif rather than a nested block.
      const only = elseBlock.length === 1 ? elseBlock[0] : null;
      if (only && only.type === 'if') {
        const chained = walk(elseBlock, depth, stepOf, used, lang, loopDepth);
        chained[0] = { ...chained[0], text: chained[0].text.replace(/^if /, 'elif ') };
        out.push(...chained);
        return;
      }

      out.push({ text: 'else:', depth });
      out.push(...walk(elseBlock, depth + 1, stepOf, used, lang, loopDepth));
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
        ? walk(body, depth + 1, stepOf, used, lang, loopDepth + 1)
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
        ? walk(body, depth + 1, stepOf, used, lang, loopDepth)
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
export function statementsToPython(statements: Statement[], lang: Language = 'en'): PythonLine[] {
  const stepOf = assignStepNumbers(statements);
  const body = walk(statements, 0, stepOf, identifiersUsed(statements), lang);
  if (!body.length) return [{ text: 'pass', depth: 0 }];
  const reads = body.some((l) => l.text.endsWith(`= ${READ_FN[lang]}()`));
  return reads ? [...readHelper(lang), ...body] : body;
}

/** Flattens the generated lines into a Python source file. */
export function pythonSource(lines: PythonLine[]): string {
  return lines.map((l) => INDENT.repeat(l.depth) + l.text).join('\n');
}
