/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, SourceLang, Statement } from '../types';
import { localize, sourceLang } from '../i18n/croatian';
import { assignStepNumbers } from './flowchart-gen';
import { counterName } from './counters';

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

/** Stands in for the loop's test when the pseudocode never wrote one. */
const MISSING_COND: Record<SourceLang, string> = {
  bs: 'TODO: uslov petlje nedostaje u pseudokodu',
  en: 'TODO: condition missing in the pseudocode',
  de: 'TODO: Bedingung fehlt im Pseudocode',
};

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
  const base = sourceLang(lang);
  const fn = READ_FN[base];
  const note: Record<SourceLang, string> = {
    bs: '# Pročita jednu vrijednost: cijeli broj, decimalni broj ili tekst.',
    en: '# Reads one value: a whole number, a decimal number, or text.',
    de: '# Liest einen Wert: ganze Zahl, Dezimalzahl oder Text.',
  };
  const v: Record<SourceLang, string> = { bs: 'tekst', en: 'text', de: 'text' };
  const t = v[base];
  return [
    { text: localize(lang, note[base]), depth: 0 },
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


function actionLines(stmt: Statement, depth: number, lang: SourceLang, step?: number): PythonLine[] {
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
  lang: Language,
  loopDepth = 0
): PythonLine[] {
  const out: PythonLine[] = [];

  stmts.forEach((stmt) => {
    const step = stepOf.get(stmt);

    if (stmt.type === 'action') {
      out.push(...actionLines(stmt, depth, sourceLang(lang), step));
      return;
    }

    if (stmt.type === 'if') {
      out.push({ text: `if ${conditionToPython(stmt.cond ?? '')}:`, depth, step });
      const thenBlock = stmt.thenBlock ?? [];
      out.push(...(thenBlock.length ? walk(thenBlock, depth + 1, stepOf, lang, loopDepth) : [{ text: 'pass', depth: depth + 1 }]));

      const elseBlock = stmt.elseBlock ?? [];
      if (!elseBlock.length) return;

      // ELSE IF parses as an else branch holding a single if, which Python
      // writes as elif rather than a nested block.
      const only = elseBlock.length === 1 ? elseBlock[0] : null;
      if (only && only.type === 'if') {
        const chained = walk(elseBlock, depth, stepOf, lang, loopDepth);
        chained[0] = { ...chained[0], text: chained[0].text.replace(/^if /, 'elif ') };
        out.push(...chained);
        return;
      }

      out.push({ text: 'else:', depth });
      out.push(...walk(elseBlock, depth + 1, stepOf, lang, loopDepth));
      return;
    }

    if (stmt.type === 'count_loop') {
      // The counter is named by the depth of the loop — `i`, then `j` — and
      // the pseudocode may read it: `PONOVI 3 PUTA` with `ISPIŠI i` inside is
      // the same variable here and in the simulator.
      const name = counterName(loopDepth);
      out.push({ text: `for ${name} in range(${stmt.times ?? '3'}):`, depth, step });
      const body = stmt.body ?? [];
      out.push(...(body.length
        ? walk(body, depth + 1, stepOf, lang, loopDepth + 1)
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
        ? `while True:  # ${localize(lang, MISSING_COND[sourceLang(lang)])}`
        : stmt.until
        ? `while not (${cond}):`
        : `while ${cond}:`;
      out.push({ text: header, depth, step });
      const body = stmt.body ?? [];
      out.push(...(body.length
        ? walk(body, depth + 1, stepOf, lang, loopDepth)
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
 *
 * `helper: false` leaves the input helper out. The tab in the editor is code to
 * copy and run, so it needs the definition; a printed sheet is a comparison
 * between the drawing and the program, and there the six lines are the only
 * thing on it that answers to no block of the diagram — they carry no badge,
 * and they push the program the student is meant to read off the top of the
 * column. The workbook leaves them out of every solution for the same reason.
 */
export function statementsToPython(
  statements: Statement[],
  lang: Language = 'en',
  { helper = true }: { helper?: boolean } = {}
): PythonLine[] {
  const stepOf = assignStepNumbers(statements);
  const body = walk(statements, 0, stepOf, lang);
  if (!body.length) return [{ text: 'pass', depth: 0 }];
  const reads = helper && body.some((l) => l.text.endsWith(`= ${READ_FN[sourceLang(lang)]}()`));
  return reads ? [...readHelper(lang), ...body] : body;
}

/** Flattens the generated lines into a Python source file. */
export function pythonSource(lines: PythonLine[]): string {
  return lines.map((l) => INDENT.repeat(l.depth) + l.text).join('\n');
}
