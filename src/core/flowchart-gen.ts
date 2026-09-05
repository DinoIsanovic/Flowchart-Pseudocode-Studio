/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlowEdge, FlowNode, Language, ParseError, Statement, ViewBox, Waypoint } from '../types';

export function stripDiacritics(s: string): string {
  return String(s || '')
    .replace(/[čć]/gi, 'c')
    .replace(/š/gi, 's')
    .replace(/ž/gi, 'z')
    .replace(/đ/gi, 'd')
    .replace(/ä/gi, 'ae')
    .replace(/ö/gi, 'oe')
    .replace(/ü/gi, 'ue')
    .replace(/ß/gi, 'ss');
}

export function normWord(w: string): string {
  return stripDiacritics(w || '').toUpperCase().replace(/:$/, '');
}

const TAB_WIDTH = 4;
const ABANDONED_CLOSERS = [
  'KRAJ AKO', 'KRAJ PONOVI', 'END IF', 'END WHILE', 'END REPEAT', 'ENDE WENN', 'ENDE SCHLEIFE'
];

export function indentWidth(raw: string): number {
  let col = 0;
  for (let k = 0; k < raw.length; k++) {
    const ch = raw.charAt(k);
    if (ch === ' ') col++;
    else if (ch === '\t') col += TAB_WIDTH - (col % TAB_WIDTH);
    else break;
  }
  return col;
}

interface PreparedLine {
  line: number;
  indent: number;
  text: string;
}

function prepareLines(text: string, errors: ParseError[], lang: Language): PreparedLine[] {
  const out: PreparedLine[] = [];
  const lines = String(text ?? '').split(/\r?\n/);
  lines.forEach((raw, k) => {
    const trimmed = raw.trim();
    if (!trimmed.length) return;
    const lead = /^[ \t]*/.exec(raw)?.[0] ?? '';
    if (lead.includes(' ') && lead.includes('\t')) {
      const msg = lang === 'de'
        ? 'Einrückung mischt Leerzeichen und Tabs — bitte nur eines verwenden'
        : lang === 'en'
        ? 'Indentation mixes spaces and tabs — use either spaces or tabs'
        : 'u uvlačenju su pomiješani razmaci i tabovi — koristi ili samo razmake ili samo tabove';
      errors.push({ line: k + 1, message: msg });
    }
    out.push({ line: k + 1, indent: indentWidth(raw), text: trimmed });
  });
  return out;
}

function splitWords(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

// Multilingual keyword sets
const KEYWORDS_START = ['POCETAK', 'START', 'BEGIN', 'BEGINN'];
const KEYWORDS_END = ['KRAJ', 'END', 'ENDE'];
const KEYWORDS_INPUT = ['UNESI', 'INPUT', 'READ', 'EINGABE', 'LIES'];
const KEYWORDS_OUTPUT = ['ISPISI', 'OUTPUT', 'PRINT', 'WRITE', 'AUSGABE', 'SCHREIBE', 'ZEIGE'];
const KEYWORDS_SET = ['POSTAVI', 'SET', 'LET', 'SETZE'];
const KEYWORDS_CALC = ['RACUNAJ', 'CALCULATE', 'COMPUTE', 'BERECHNE'];
const KEYWORDS_IF = ['AKO', 'IF', 'WENN'];
const KEYWORDS_YES = ['DA', 'YES', 'TRUE', 'THEN', 'JA', 'WAHR', 'DANN'];
const KEYWORDS_NO = ['NE', 'NO', 'FALSE', 'NEIN', 'FALSCH'];
const KEYWORDS_ELSE = ['INACE', 'ELSE', 'SONST'];
const KEYWORDS_REPEAT = ['PONOVI', 'REPEAT', 'WIEDERHOLE'];
const KEYWORDS_WHILE_LOOP = ['PONAVLJAJ', 'LOOP'];
const KEYWORDS_WHILE_COND = ['DOK', 'WHILE', 'SOLANGE'];
const KEYWORDS_UNTIL = ['UNTIL', 'BIS'];

function isElseWord(w: string): boolean {
  const nw = normWord(w);
  return KEYWORDS_NO.includes(nw) || KEYWORDS_ELSE.includes(nw);
}

const ALL_KEYWORDS = new Set<string>([
  ...KEYWORDS_START, ...KEYWORDS_END, ...KEYWORDS_INPUT, ...KEYWORDS_OUTPUT,
  ...KEYWORDS_SET, ...KEYWORDS_CALC, ...KEYWORDS_IF, ...KEYWORDS_YES,
  ...KEYWORDS_NO, ...KEYWORDS_ELSE, ...KEYWORDS_REPEAT, ...KEYWORDS_WHILE_LOOP,
  ...KEYWORDS_WHILE_COND, ...KEYWORDS_UNTIL,
]);

// Offered back to the student in their own language, so the hint matches the
// cheatsheet and the templates rather than the normalised internal spelling.
// Bottom-tested loop words (UNTIL / BIS / PONAVLJAJ) are deliberately absent:
// they still parse, but a hint should point at the pre-test form we teach.
const KEYWORD_SUGGESTIONS: Record<Language, string[]> = {
  en: ['START', 'END', 'INPUT', 'READ', 'OUTPUT', 'PRINT', 'WRITE', 'SET', 'LET', 'CALCULATE', 'COMPUTE', 'IF', 'YES', 'THEN', 'NO', 'ELSE', 'REPEAT', 'WHILE'],
  de: ['START', 'BEGINN', 'ENDE', 'EINGABE', 'LIES', 'AUSGABE', 'SCHREIBE', 'ZEIGE', 'SETZE', 'BERECHNE', 'WENN', 'JA', 'DANN', 'NEIN', 'SONST', 'WIEDERHOLE', 'SOLANGE'],
  bs: ['POČETAK', 'KRAJ', 'UNESI', 'ISPIŠI', 'POSTAVI', 'RAČUNAJ', 'AKO JE', 'DA', 'NE', 'INAČE', 'PONOVI', 'DOK JE'],
};

// Connectives that open prose, never a command. Several sit one letter from a
// real keyword ("AND"/"END", "JE"/"NE"), so without this an all-caps free-text
// step would be nagged about a keyword the student never reached for.
const CONNECTIVES = new Set<string>([
  'AND', 'OR', 'NOT', 'THE', 'TO', 'OF', 'IN', 'ON', 'AT', 'BY', 'IS', 'ARE', 'FOR', 'WITH',
  'UND', 'ODER', 'NICHT', 'ZU', 'DER', 'DIE', 'DAS', 'MIT', 'VON', 'IST', 'FUER',
  'ILI', 'NIJE', 'NA', 'SA', 'ZA', 'OD', 'DO', 'JE', 'SU', 'TE', 'PA', 'ALI',
]);

function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[n];
}

// A near-miss keyword, or null when the word is too far off to guess at. Guessing
// wildly would be worse than staying quiet: it sends the student chasing a
// keyword they never meant to type.
function suggestKeyword(word: string, lang: Language): string | null {
  const limit = word.length <= 4 ? 1 : 2;
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const candidate of KEYWORD_SUGGESTIONS[lang]) {
    const distance = editDistance(word, normWord(candidate.split(' ')[0]));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return bestDistance <= limit ? best : null;
}

// Only speaks up for a near-miss: a capitalised word, unknown in every language,
// that is one or two letters away from a real keyword. Anything further off is
// taken at face value as a free-text process box ("SWAP A AND B"), which is a
// legitimate step and is what the reverse generator emits for one. Bare
// assignments stay silent too.
function unknownKeywordWarning(text: string, lang: Language): string | null {
  const words = splitWords(text);
  const first = words[0] || '';
  // An assignment whose target happens to be capitalised ("SUM = A + B") is a
  // process box, not a mistyped command. Only the "=" directly after the first
  // word means that; a later one still leaves room for a command in front.
  if (first.includes('=') || (words[1] || '').startsWith('=')) return null;
  if (first.length < 2 || first !== first.toUpperCase() || !/^[\p{L}]+$/u.test(first)) return null;
  const normalised = normWord(first);
  if (ALL_KEYWORDS.has(normalised) || CONNECTIVES.has(normalised)) return null;

  const hint = suggestKeyword(normalised, lang);
  if (!hint) return null;

  if (lang === 'de') return `"${first}" ist kein bekanntes Schlüsselwort — meintest du "${hint}"?`;
  if (lang === 'en') return `"${first}" is not a known keyword — did you mean "${hint}"?`;
  return `"${first}" nije poznata ključna riječ — jesi li mislio/la "${hint}"?`;
}

export function parsePseudocode(text: string, lang: Language = 'en'): { statements: Statement[]; errors: ParseError[] } {
  const errors: ParseError[] = [];
  const lines = prepareLines(text, errors, lang);
  let i = 0;

  const abandonedMap: Record<number, boolean> = {};
  lines.forEach((ln) => {
    const w = splitWords(ln.text);
    const two = normWord(w[0]) + ' ' + normWord(w[1]);
    if (ABANDONED_CLOSERS.includes(two)) {
      abandonedMap[ln.line] = true;
      const msg = lang === 'de'
        ? `"${two}" wird nicht mehr geschrieben — Blöcke schließen automatisch durch Rück-Einrückung.`
        : lang === 'en'
        ? `"${two}" is no longer written — blocks close by unindenting back to the previous column.`
        : `"${two}" se više ne piše — blok se zatvara uvlačenjem (povratkom ulijevo).`;
      errors.push({ line: ln.line, message: msg });
    }
  });

  function peek(): PreparedLine | null {
    return i < lines.length ? lines[i] : null;
  }

  function err(line: number, message: string) {
    errors.push({ line, message });
  }

  function firstWords(ln: PreparedLine) {
    const w = splitWords(ln.text);
    return {
      w0: normWord(w[0]),
      w1: w.length > 1 ? normWord(w[1]) : '',
      w2: w.length > 2 ? normWord(w[2]) : '',
    };
  }

  function mkAction(kind: 'unesi' | 'ispisi' | 'postavi' | 'racunaj', ln: PreparedLine): Statement {
    return { type: 'action', kind, text: splitWords(ln.text).slice(1).join(' '), line: ln.line };
  }

  function parseBody(level: number, requiredFor: PreparedLine | null): Statement[] {
    const ln = peek();
    if (ln && ln.indent > level) {
      return parseBlock(ln.indent, []);
    }
    if (requiredFor) {
      const msg = lang === 'de'
        ? `Nach "${requiredFor.text}" fehlt ein eingerückter Schritt-Block`
        : lang === 'en'
        ? `Missing indented block after "${requiredFor.text}"`
        : `poslije "${requiredFor.text}" nedostaje uvučen blok koraka`;
      err(requiredFor.line, msg);
    }
    return [];
  }

  function labelAt(level: number, exact = false): { kind: 'yes' | 'no' | 'elif'; level: number; word?: string; ln: PreparedLine } | null {
    const ln = peek();
    if (!ln) return null;
    if (exact ? ln.indent !== level : ln.indent <= level) return null;
    const fw = firstWords(ln);

    // YES / DA / JA
    if (KEYWORDS_YES.includes(fw.w0)) {
      return { kind: 'yes', level: ln.indent, ln };
    }

    // ELSE IF / INACE AKO JE / SONST WENN
    const isElif =
      (fw.w0 === 'ELSE' && fw.w1 === 'IF') ||
      (fw.w0 === 'SONST' && fw.w1 === 'WENN') ||
      (fw.w0 === 'INACE' && fw.w1 === 'AKO' && fw.w2 === 'JE') ||
      (fw.w0 === 'INACE' && fw.w1 === 'AKO');
    if (isElif) {
      return { kind: 'elif', level: ln.indent, ln };
    }

    // NO / ELSE / NE / INACE / NEIN / SONST
    if (isElseWord(fw.w0)) {
      return { kind: 'no', level: ln.indent, word: fw.w0, ln };
    }

    return null;
  }

  function parseIfBody(ifLine: PreparedLine, level: number, cond: string): Statement {
    let thenBlock: Statement[] = [];
    let elseBlock: Statement[] = [];
    let elseWord = 'no';
    let usedLabels = false;

    let lab = labelAt(level);
    if (lab && lab.kind === 'yes') {
      const labelLevel = lab.level;
      i++;
      usedLabels = true;
      thenBlock = parseBody(labelLevel, null);
      lab = labelAt(labelLevel, true);
    }

    if (lab && lab.kind === 'elif') {
      const w = splitWords(lab.ln.text);
      const skip = (normWord(w[0]) === 'INACE' && normWord(w[1]) === 'AKO' && normWord(w[2]) === 'JE') ? 3 : 2;
      const elifCond = w.slice(skip).join(' ');
      const elifLevel = lab.level;
      i++;
      usedLabels = true;
      elseBlock = [parseIfBody(lab.ln, elifLevel, elifCond)];
      elseWord = 'elif';
    } else if (lab && lab.kind === 'no') {
      elseWord = lab.word ? lab.word.toLowerCase() : 'no';
      i++;
      usedLabels = true;
      elseBlock = parseBody(lab.level, null);
    }

    if (!usedLabels) {
      thenBlock = parseBody(level, ifLine);
    }

    return {
      line: ifLine.line,
      type: 'if',
      cond,
      thenBlock,
      elseBlock,
      elseWord,
    };
  }

  function parseBlock(level: number, stopSet: string[] = []): Statement[] {
    let stmts: Statement[] = [];
    while (i < lines.length) {
      const ln = lines[i];
      if (ln.indent < level) break;
      if (ln.indent > level) {
        const msg = lang === 'de'
          ? 'Einrückung stimmt mit keiner übergeordneten Ebene überein'
          : lang === 'en'
          ? 'Indentation does not match any outer level — align with previous code'
          : 'uvlačenje ne odgovara nijednom nivou iznad — poravnaj ovaj red sa nekim od redova iznad';
        err(ln.line, msg);
        i++;
        continue;
      }

      const fw = firstWords(ln);
      if (abandonedMap[ln.line]) {
        i++;
        continue;
      }
      if (stopSet.includes(fw.w0) || stopSet.includes(`${fw.w0} ${fw.w1}`)) break;

      // INPUT
      if (KEYWORDS_INPUT.includes(fw.w0)) {
        stmts.push(mkAction('unesi', ln));
        i++;
        continue;
      }

      // OUTPUT
      if (KEYWORDS_OUTPUT.includes(fw.w0)) {
        stmts.push(mkAction('ispisi', ln));
        i++;
        continue;
      }

      // SET
      if (KEYWORDS_SET.includes(fw.w0)) {
        stmts.push(mkAction('postavi', ln));
        i++;
        continue;
      }

      // CALCULATE
      if (KEYWORDS_CALC.includes(fw.w0)) {
        stmts.push(mkAction('racunaj', ln));
        i++;
        continue;
      }

      // IF / AKO JE / WENN
      const isIf =
        (fw.w0 === 'IF') ||
        (fw.w0 === 'WENN') ||
        (fw.w0 === 'AKO' && fw.w1 === 'JE') ||
        (fw.w0 === 'AKO');
      if (isIf) {
        const ifLine = ln;
        const w = splitWords(ln.text);
        const skip = (fw.w0 === 'AKO' && fw.w1 === 'JE') ? 2 : 1;
        const cond = w.slice(skip).join(' ');
        i++;
        stmts.push(parseIfBody(ifLine, level, cond));
        continue;
      }

      // LOOP / REPEAT WHILE / PONAVLJAJ
      if (KEYWORDS_WHILE_LOOP.includes(fw.w0)) {
        const repLine = ln;
        i++;
        const pbody = parseBody(level, repLine);
        let pcond = '';
        let until = false;
        let tail: Statement[] | null = null;
        const dokLine = peek();

        if (dokLine && dokLine.indent === level) {
          const dfw = firstWords(dokLine);
          const isWhileTail = KEYWORDS_WHILE_COND.includes(dfw.w0) || KEYWORDS_UNTIL.includes(dfw.w0);
          if (isWhileTail) {
            until = KEYWORDS_UNTIL.includes(dfw.w0);
            let dw = splitWords(dokLine.text).slice(1);
            if (dw.length && normWord(dw[0]) === 'JE') dw = dw.slice(1);
            pcond = dw.join(' ');
            i++;
            const daLine = peek();
            if (until && daLine && daLine.indent === level && KEYWORDS_YES.includes(firstWords(daLine).w0)) {
              i++;
              tail = parseBody(level, null);
            }
          } else {
            const msg = lang === 'de'
              ? 'Schleife fehlt die abschließende Zeile "SOLANGE ..."'
              : lang === 'en'
              ? 'Loop is missing closing "WHILE ..." line'
              : 'petlja nema završni red "DOK ..."';
            err(repLine.line, msg);
          }
        }
        stmts.push({ type: 'loop', cond: pcond, body: pbody, until, line: repLine.line });
        if (tail && tail.length) stmts = stmts.concat(tail);
        continue;
      }

      // REPEAT / PONOVI / WIEDERHOLE
      if (KEYWORDS_REPEAT.includes(fw.w0)) {
        const repeatLine = ln;
        const rw = splitWords(ln.text).slice(1);

        // Count loop: REPEAT 5 TIMES / PONOVI 5 PUTA / WIEDERHOLE 5 MAL
        const isCount =
          (rw.length === 2 && /^\d+$/.test(rw[0]) && ['PUTA', 'TIMES', 'MAL'].includes(normWord(rw[1])));
        if (isCount) {
          i++;
          stmts.push({ type: 'count_loop', times: rw[0], body: parseBody(level, repeatLine), line: repeatLine.line });
          continue;
        }

        // While loop: REPEAT WHILE / PONOVI DOK JE / WIEDERHOLE SOLANGE
        let condWords = rw;
        if (condWords.length && (KEYWORDS_WHILE_COND.includes(normWord(condWords[0])) || normWord(condWords[0]) === 'WHILE')) {
          condWords = condWords.slice(1);
        }
        if (condWords.length && normWord(condWords[0]) === 'JE') {
          condWords = condWords.slice(1);
        }
        const lcond = condWords.join(' ');
        i++;
        const body = parseBody(level, repeatLine);
        stmts.push({ type: 'loop', cond: lcond, body, line: repeatLine.line });
        continue;
      }

      // Generic action
      const unknown = unknownKeywordWarning(ln.text, lang);
      if (unknown) errors.push({ line: ln.line, message: unknown, severity: 'warning' });
      stmts.push({ type: 'action', kind: 'generic', text: ln.text, line: ln.line });
      i++;
    }
    return stmts;
  }

  const head = peek();
  if (head && KEYWORDS_START.includes(firstWords(head).w0)) {
    i++;
  }

  const first = peek();
  const statements = first ? parseBlock(first.indent, KEYWORDS_END) : [];

  let tailLine = peek();
  if (tailLine && KEYWORDS_END.includes(firstWords(tailLine).w0)) {
    i++;
    tailLine = peek();
  }
  if (tailLine) {
    const msg = lang === 'de'
      ? 'Einrückung stimmt mit keiner Ebene überein'
      : lang === 'en'
      ? 'Indentation does not match any previous level'
      : 'uvlačenje ne odgovara nijednom nivou iznad';
    err(tailLine.line, msg);
  }

  return { statements, errors };
}

// ---------------- Layout & Flowchart Construction ----------------

const GAP = 52;
const NODE_W = 190, NODE_H = 74;
const START_W = 170, START_H = 74;
const DECISION_W = 210, DECISION_H = 120;
const COUNT_W = 230, COUNT_H = 92;
const BRANCH_GAP_X = 260;
const LOOP_LANE_GAP = 62;
const LOOP_TAIL = 36;

export const COMMENT_TYPE = 'comment';

export function isFlowNode(n: FlowNode | null | undefined): boolean {
  return !!n && n.type !== COMMENT_TYPE;
}

function getLocalizedEdgeElse(lang: Language): string {
  if (lang === 'de') return 'NEIN (SONST)';
  if (lang === 'en') return 'NO (ELSE)';
  return 'NE (INAČE)';
}

function getLocalizedYes(lang: Language): string {
  if (lang === 'de') return 'ja';
  if (lang === 'en') return 'yes';
  return 'da';
}

function getLocalizedNo(lang: Language): string {
  if (lang === 'de') return 'nein';
  if (lang === 'en') return 'no';
  return 'ne';
}

function formatActionLabel(stmt: Statement, lang: Language): string {
  const txt = stmt.text ?? '';
  if (stmt.kind === 'unesi') {
    return lang === 'de' ? `eingabe ${txt}` : lang === 'en' ? `input ${txt}` : `unesi ${txt}`;
  }
  if (stmt.kind === 'ispisi') {
    return lang === 'de' ? `ausgabe ${txt}` : lang === 'en' ? `output ${txt}` : `ispiši ${txt}`;
  }
  return txt;
}

interface LayoutResult {
  nodes: FlowNode[];
  edges: FlowEdge[];
  entryId: string | null;
  exits: { id: string; label?: string; elseWord?: string; waypoints?: Waypoint[] }[];
  height: number;
  minX: number;
  maxX: number;
}

/**
 * Numbers the statements in the order buildFlowchart creates their nodes:
 * pre-order, a statement before the blocks nested inside it. The start node
 * takes 1, so statements begin at 2 and the end node takes the last number.
 * The flowchart, the pseudocode gutter and the Python gutter all read these
 * numbers, so they must come from here and nowhere else.
 */
export function assignStepNumbers(statements: Statement[]): Map<Statement, number> {
  const map = new Map<Statement, number>();
  let n = 2;
  const walk = (stmts: Statement[]) => {
    stmts.forEach((stmt) => {
      map.set(stmt, n++);
      if (stmt.type === 'if') {
        walk(stmt.thenBlock ?? []);
        walk(stmt.elseBlock ?? []);
      } else if (stmt.body) {
        walk(stmt.body);
      }
    });
  };
  walk(statements);
  return map;
}

/**
 * Maps each pseudocode line to the step badge of the node it produces, so the
 * exported image can print the badge beside the source line. Lines that draw
 * no node of their own — YES, ELSE, blanks — are absent from the map.
 */
export function stepsByPseudocodeLine(code: string, lang: Language = 'en'): Map<number, number> {
  const { statements } = parsePseudocode(code, lang);
  const stepOf = assignStepNumbers(statements);
  const byLine = new Map<number, number>();

  const walk = (stmts: Statement[]) => {
    stmts.forEach((stmt) => {
      const step = stepOf.get(stmt);
      if (stmt.line !== undefined && step !== undefined) byLine.set(stmt.line, step);
      if (stmt.type === 'if') {
        walk(stmt.thenBlock ?? []);
        walk(stmt.elseBlock ?? []);
      } else if (stmt.body) {
        walk(stmt.body);
      }
    });
  };
  walk(statements);

  // START and END are consumed by the parser rather than becoming statements,
  // but they do draw the first and last node.
  code.split(/\r?\n/).forEach((raw, idx) => {
    const w0 = normWord(splitWords(raw.trim())[0] ?? '');
    if (KEYWORDS_START.includes(w0)) byLine.set(idx + 1, 1);
    else if (KEYWORDS_END.includes(w0)) byLine.set(idx + 1, stepOf.size + 2);
  });

  return byLine;
}

export function buildFlowchart(statements: Statement[], lang: Language = 'en'): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  let counter = 0;
  let counterSeq = 0;
  const stepOf = assignStepNumbers(statements);

  const newId = () => `n${++counter}`;
  const newEdgeId = () => `e${++counter}`;

  const elseLabel = getLocalizedEdgeElse(lang);
  const yesLabel = getLocalizedYes(lang);

  function exitEdge(
    ex: { id: string; label?: string; elseWord?: string; waypoints?: Waypoint[] },
    toId: string,
    extraWps?: Waypoint[]
  ): FlowEdge {
    const e: FlowEdge = {
      id: newEdgeId(),
      from: ex.id,
      to: toId,
      label: ex.label ?? '',
    };
    if (ex.elseWord) e.elseWord = ex.elseWord;
    const wps = (ex.waypoints ?? []).concat(extraWps ?? []);
    if (wps.length) {
      e.waypoints = wps;
      e.baseWaypoints = wps.slice();
    }
    return e;
  }

  function layoutLoopFrame(
    head: FlowNode,
    bodyStmts: Statement[] | undefined,
    cx: number,
    y: number,
    bodyLabel: string,
    exitLabel: string
  ): LayoutResult {
    const bodyY = y + head.h + GAP;
    const bodyR = bodyStmts && bodyStmts.length ? layoutSequence(bodyStmts, cx, bodyY) : null;

    let innerMinX = cx - head.w / 2;
    let innerMaxX = cx + head.w / 2;
    if (bodyR) {
      innerMinX = Math.min(innerMinX, bodyR.minX);
      innerMaxX = Math.max(innerMaxX, bodyR.maxX);
    }
    const backLane = innerMinX - LOOP_LANE_GAP;
    const exitLane = innerMaxX + LOOP_LANE_GAP;

    const bodyHeight = bodyR ? bodyR.height : 0;
    const totalHeight = head.h + (bodyHeight > 0 ? GAP + bodyHeight + LOOP_TAIL : 0);
    const exitY = y + totalHeight - LOOP_TAIL / 2;

    let loopNodes = [head];
    let loopEdges: FlowEdge[] = [];
    const loopExits: { id: string; label?: string; elseWord?: string; waypoints?: Waypoint[] }[] = [
      { id: head.id, label: exitLabel || '' },
    ];

    if (bodyR) {
      loopExits[0] = {
        id: head.id,
        label: exitLabel || '',
        waypoints: [
          { axis: 'x', v: exitLane },
          { axis: 'y', v: exitY },
          { axis: 'x', v: cx },
        ],
      };
      loopNodes = loopNodes.concat(bodyR.nodes);
      loopEdges = loopEdges.concat(bodyR.edges);
      loopEdges.push({
        id: newEdgeId(),
        from: head.id,
        to: bodyR.entryId!,
        label: bodyLabel || '',
      });
      bodyR.exits.forEach((ex) => {
        loopEdges.push(
          exitEdge(ex, head.id, [
            { axis: 'x', v: backLane },
            { axis: 'y', v: head.y },
          ])
        );
      });
    }

    return {
      nodes: loopNodes,
      edges: loopEdges,
      entryId: head.id,
      exits: loopExits,
      height: totalHeight,
      minX: bodyR ? backLane : cx - head.w / 2,
      maxX: bodyR ? exitLane : cx + head.w / 2,
    };
  }

  function layoutStatement(stmt: Statement, cx: number, y: number): LayoutResult {
    if (stmt.type === 'action') {
      const type = (stmt.kind === 'unesi' || stmt.kind === 'ispisi') ? 'io' : 'process';
      const node: FlowNode = {
        id: newId(),
        type,
        x: cx,
        y: y + NODE_H / 2,
        w: NODE_W,
        h: NODE_H,
        text: formatActionLabel(stmt, lang),
        step: stepOf.get(stmt),
      };
      return {
        nodes: [node],
        edges: [],
        entryId: node.id,
        exits: [{ id: node.id, label: '' }],
        height: NODE_H,
        minX: cx - NODE_W / 2,
        maxX: cx + NODE_W / 2,
      };
    }

    if (stmt.type === 'if') {
      const decision: FlowNode = {
        id: newId(),
        type: 'decision',
        x: cx,
        y: y + DECISION_H / 2,
        w: DECISION_W,
        h: DECISION_H,
        text: `${stmt.cond || (lang === 'de' ? 'bedingung' : lang === 'en' ? 'condition' : 'uslov')} ?`,
        step: stepOf.get(stmt),
      };
      const branchY = y + DECISION_H + GAP;
      const thenX = cx - BRANCH_GAP_X;
      const elseX = cx + BRANCH_GAP_X;
      const thenR = stmt.thenBlock && stmt.thenBlock.length ? layoutSequence(stmt.thenBlock, thenX, branchY) : null;
      const elseR = stmt.elseBlock && stmt.elseBlock.length ? layoutSequence(stmt.elseBlock, elseX, branchY) : null;

      const elseWord = stmt.elseWord ?? 'no';
      let allNodes = [decision];
      let allEdges: FlowEdge[] = [];
      let exits: { id: string; label?: string; elseWord?: string; waypoints?: Waypoint[] }[] = [];

      if (thenR) {
        allNodes = allNodes.concat(thenR.nodes);
        allEdges = allEdges.concat(thenR.edges);
        allEdges.push({ id: newEdgeId(), from: decision.id, to: thenR.entryId!, label: yesLabel });
        exits = exits.concat(thenR.exits);
      } else {
        exits.push({ id: decision.id, label: yesLabel });
      }

      if (elseR) {
        allNodes = allNodes.concat(elseR.nodes);
        allEdges = allEdges.concat(elseR.edges);
        allEdges.push({ id: newEdgeId(), from: decision.id, to: elseR.entryId!, label: elseLabel, elseWord });
        exits = exits.concat(elseR.exits);
      } else {
        exits.push({ id: decision.id, label: elseLabel, elseWord });
      }

      const branchHeight = Math.max(thenR ? thenR.height : 0, elseR ? elseR.height : 0);
      const totalHeight = DECISION_H + (branchHeight > 0 ? GAP + branchHeight : 0);
      let ifMinX = cx - DECISION_W / 2;
      let ifMaxX = cx + DECISION_W / 2;
      [thenR, elseR].forEach((r) => {
        if (!r) return;
        ifMinX = Math.min(ifMinX, r.minX);
        ifMaxX = Math.max(ifMaxX, r.maxX);
      });

      return {
        nodes: allNodes,
        edges: allEdges,
        entryId: decision.id,
        exits,
        height: totalHeight,
        minX: ifMinX,
        maxX: ifMaxX,
      };
    }

    if (stmt.type === 'loop') {
      const dec: FlowNode = {
        id: newId(),
        type: 'decision',
        x: cx,
        y: y + DECISION_H / 2,
        w: DECISION_W,
        h: DECISION_H,
        text: `${stmt.cond || (lang === 'de' ? 'bedingung' : lang === 'en' ? 'condition' : 'uslov')} ?`,
        step: stepOf.get(stmt),
      };
      const noLbl = getLocalizedNo(lang);
      return layoutLoopFrame(
        dec,
        stmt.body,
        cx,
        y,
        stmt.until ? noLbl : yesLabel,
        stmt.until ? yesLabel : noLbl
      );
    }

    if (stmt.type === 'count_loop') {
      const times = stmt.times ?? '3';
      const countText = lang === 'de'
        ? `wiederhole ${times} mal`
        : lang === 'en'
        ? `repeat ${times} times`
        : `ponovi ${times} puta`;
      const head: FlowNode = {
        id: newId(),
        type: 'loop',
        x: cx,
        y: y + COUNT_H / 2,
        w: COUNT_W,
        h: COUNT_H,
        text: countText,
        counter: `_counter_${++counterSeq}`,
        step: stepOf.get(stmt),
      };
      return layoutLoopFrame(head, stmt.body, cx, y, '', '');
    }

    // Fallback
    const fnode: FlowNode = {
      id: newId(),
      type: 'process',
      x: cx,
      y: y + NODE_H / 2,
      w: NODE_W,
      h: NODE_H,
      text: '?',
    };
    return {
      nodes: [fnode],
      edges: [],
      entryId: fnode.id,
      exits: [{ id: fnode.id, label: '' }],
      height: NODE_H,
      minX: cx - NODE_W / 2,
      maxX: cx + NODE_W / 2,
    };
  }

  function layoutSequence(stmts: Statement[], cx: number, startY: number): LayoutResult {
    let y = startY;
    let allNodes: FlowNode[] = [];
    let allEdges: FlowEdge[] = [];
    let entryId: string | null = null;
    let prevExits: { id: string; label?: string; elseWord?: string; waypoints?: Waypoint[] }[] | null = null;
    let minX = cx - NODE_W / 2;
    let maxX = cx + NODE_W / 2;

    stmts.forEach((stmt) => {
      const r = layoutStatement(stmt, cx, y);
      allNodes = allNodes.concat(r.nodes);
      allEdges = allEdges.concat(r.edges);
      minX = Math.min(minX, r.minX);
      maxX = Math.max(maxX, r.maxX);
      if (entryId === null) entryId = r.entryId;
      if (prevExits) {
        prevExits.forEach((pe) => {
          allEdges.push(exitEdge(pe, r.entryId!));
        });
      }
      prevExits = r.exits;
      y += r.height + GAP;
    });

    return {
      nodes: allNodes,
      edges: allEdges,
      entryId,
      exits: prevExits || [],
      height: stmts.length ? y - startY - GAP : 0,
      minX,
      maxX,
    };
  }

  const cx = 600;
  const startText = lang === 'de' ? 'start' : lang === 'en' ? 'start' : 'početak';
  const endText = lang === 'de' ? 'ende' : lang === 'en' ? 'end' : 'kraj';

  const startNode: FlowNode = {
    id: newId(),
    type: 'start_end',
    x: cx,
    y: GAP + START_H / 2,
    w: START_W,
    h: START_H,
    text: startText,
    step: 1,
  };
  nodes.push(startNode);

  const seq = layoutSequence(statements, cx, GAP + START_H + GAP);
  nodes.push(...seq.nodes);
  edges.push(...seq.edges);

  if (seq.entryId) {
    edges.push({ id: newEdgeId(), from: startNode.id, to: seq.entryId, label: '' });
  }

  const endY = GAP + START_H + GAP + seq.height + GAP;
  const endNode: FlowNode = {
    id: newId(),
    type: 'start_end',
    x: cx,
    y: endY + START_H / 2,
    w: START_W,
    h: START_H,
    text: endText,
    step: stepOf.size + 2,
  };
  nodes.push(endNode);

  const exits = seq.entryId ? seq.exits : [{ id: startNode.id, label: '' }];
  exits.forEach((ex) => {
    edges.push(exitEdge(ex, endNode.id));
  });

  return { nodes, edges };
}

// ---------------- Reverse Generator: Diagram -> Pseudocode ----------------

export function normLabel(label: string): string {
  const n = stripDiacritics(label || '').toUpperCase().trim();
  const base = n.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (['NE', 'INACE', 'NO', 'ELSE', 'NEIN', 'SONST'].includes(base)) return 'NO';
  if (['DA', 'YES', 'JA', 'TRUE', 'WAHR'].includes(base)) return 'YES';
  return n;
}

export function autoLabelDecisionEdges(nodes: FlowNode[], edges: FlowEdge[], lang: Language = 'en'): FlowEdge[] {
  const byFrom: Record<string, FlowEdge[]> = {};
  edges.forEach((e) => {
    (byFrom[e.from] = byFrom[e.from] || []).push(e);
  });

  const byId: Record<string, FlowNode> = {};
  nodes.forEach((n) => { byId[n.id] = n; });

  const yesStr = getLocalizedYes(lang);
  const elseStr = getLocalizedEdgeElse(lang);

  nodes.forEach((n) => {
    if (!n || n.type !== 'decision') return;
    const outs = byFrom[n.id] || [];
    if (!outs.length) return;

    let daEdge: FlowEdge | null = null;
    let neEdge: FlowEdge | null = null;
    outs.forEach((e) => {
      const l = normLabel(e.label);
      if (l === 'YES' && !daEdge) daEdge = e;
      else if (l === 'NO' && !neEdge) neEdge = e;
    });

    const free = outs.filter((e) => {
      const l = normLabel(e.label);
      return e !== daEdge && e !== neEdge && l !== 'YES' && l !== 'NO';
    });

    if (!daEdge && !neEdge && free.length >= 2) {
      const t1 = byId[free[0].to];
      const t2 = byId[free[1].to];
      const leftFirst = t1 && t2 && t1.x < t2.x;
      const pair = leftFirst ? { da: free[0], ne: free[1] } : { da: free[1], ne: free[0] };
      pair.da.label = yesStr;
      pair.ne.label = elseStr;
    } else if (daEdge && !neEdge && free.length) {
      free[0].label = elseStr;
    } else if (!daEdge && neEdge && free.length) {
      free[0].label = yesStr;
    } else if (!daEdge && !neEdge && free.length === 1) {
      free[0].label = yesStr;
    }
  });

  return edges;
}

export function pickDecisionBranches(outs: FlowEdge[]): { da: FlowEdge | null; ne: FlowEdge | null } {
  let da: FlowEdge | null = null;
  let ne: FlowEdge | null = null;
  for (let i = 0; i < outs.length; i++) {
    const l = normLabel(outs[i].label);
    if (l === 'YES' && !da) da = outs[i];
    else if (l === 'NO' && !ne) ne = outs[i];
  }
  for (let i = 0; i < outs.length && (!da || !ne); i++) {
    if (outs[i] === da || outs[i] === ne) continue;
    const l = normLabel(outs[i].label);
    if (l === 'YES' || l === 'NO') continue;
    if (!da) da = outs[i];
    else ne = outs[i];
  }
  if (da && ne && da.to === ne.to) ne = null;
  return { da, ne };
}

// Flips a single comparison so a loop whose NO branch is the body can still be
// written with its condition on the header. Anything with more than one
// comparison is wrapped instead of rewritten — inverting those correctly needs
// De Morgan, and a wrong flip would silently teach the wrong algorithm.
export function negateCondition(cond: string, lang: Language = 'en'): string {
  const text = String(cond || '').trim();
  const flips: [RegExp, string][] = [
    [/<=|≤/, '>'],
    [/>=|≥/, '<'],
    [/<>|!=|≠/, '='],
    [/==/, '!='],
    [/</, '>='],
    [/>/, '<='],
    [/=/, '≠'],
  ];
  for (const [re, flipped] of flips) {
    const m = re.exec(text);
    if (!m) continue;
    const rest = text.slice(0, m.index) + text.slice(m.index + m[0].length);
    if (!/[<>=≤≥≠]/.test(rest)) {
      return text.slice(0, m.index) + flipped + text.slice(m.index + m[0].length);
    }
    break;
  }
  const notWord = lang === 'de' ? 'NICHT' : lang === 'en' ? 'NOT' : 'NIJE';
  return `${notWord} (${text})`;
}

export function diagramToPseudocode(nodes: FlowNode[], edges: FlowEdge[], lang: Language = 'en'): string {
  autoLabelDecisionEdges(nodes, edges, lang);

  const flowNodes = nodes.filter(isFlowNode);
  const flowIds: Record<string, boolean> = {};
  flowNodes.forEach((n) => { flowIds[n.id] = true; });
  const flowEdges = edges.filter((e) => e && flowIds[e.from] && flowIds[e.to]);

  const byId: Record<string, FlowNode> = {};
  flowNodes.forEach((n) => { byId[n.id] = n; });

  const outMap: Record<string, { to: string; label: string; elseWord?: string }[]> = {};
  const inMap: Record<string, string[]> = {};
  const inCount: Record<string, number> = {};

  flowNodes.forEach((n) => {
    outMap[n.id] = [];
    inMap[n.id] = [];
    inCount[n.id] = 0;
  });

  flowEdges.forEach((e) => {
    if (!outMap[e.from] || !(e.to in byId)) return;
    outMap[e.from].push({ to: e.to, label: e.label || '', elseWord: e.elseWord });
    inMap[e.to].push(e.from);
    inCount[e.to] = (inCount[e.to] || 0) + 1;
  });

  const startNode =
    flowNodes.find((n) => n.type === 'start_end' && (inCount[n.id] || 0) === 0) ||
    flowNodes.find((n) => (inCount[n.id] || 0) === 0) ||
    flowNodes[0];

  function bfsDistances(fromId: string | null): Record<string, number> {
    const dist: Record<string, number> = {};
    if (!fromId) return dist;
    dist[fromId] = 0;
    const queue = [fromId];
    while (queue.length) {
      const cur = queue.shift()!;
      (outMap[cur] || []).forEach((edge) => {
        if (!(edge.to in dist)) {
          dist[edge.to] = dist[cur] + 1;
          queue.push(edge.to);
        }
      });
    }
    return dist;
  }

  function findMergePoint(aId: string | null, bId: string | null): string | null {
    if (!aId || !bId) return null;
    const da = bfsDistances(aId);
    const db = bfsDistances(bId);
    let best: string | null = null;
    let bestScore = Infinity;
    Object.keys(da).forEach((nodeId) => {
      if (nodeId in db) {
        const score = da[nodeId] + db[nodeId];
        if (score < bestScore) {
          bestScore = score;
          best = nodeId;
        }
      }
    });
    return best;
  }

  function reachesBack(startId: string, backId: string, chain: Record<string, boolean>, stopAt: string | null): boolean {
    if (!startId || !backId) return false;
    const seen: Record<string, boolean> = {};
    const stack = [startId];
    while (stack.length) {
      const cur = stack.pop()!;
      if (cur === backId) return true;
      if (seen[cur]) continue;
      seen[cur] = true;
      if ((chain && chain[cur]) || cur === stopAt) continue;
      (outMap[cur] || []).forEach((edge) => {
        if (!seen[edge.to]) stack.push(edge.to);
      });
    }
    return false;
  }

  const loopNote = lang === 'de'
    ? '* (Schleife setzt sich im Diagramm fort) *'
    : lang === 'en'
    ? '* (loop continues in diagram) *'
    : '* (nastavlja se u petlji dijagrama - provjeri veze) *';

  function condText(node: FlowNode): string {
    return String(node.text || '').replace(/\s*\?\s*$/, '').trim();
  }

  function countTimes(node: FlowNode): string | null {
    const m = /\d+/.exec(String(node.text || ''));
    return m ? m[0] : null;
  }

  function actionLine(node: FlowNode): string {
    const text = String(node.text || '').trim();
    if (node.type === 'io') {
      const lower = text.toLowerCase();
      if (/^(unesi|input|read|eingabe|lies)\s*/i.test(lower)) {
        const payload = text.replace(/^(unesi|input|read|eingabe|lies)\s*/i, '');
        return lang === 'de' ? `EINGABE ${payload}` : lang === 'en' ? `INPUT ${payload}` : `UNESI ${payload}`;
      }
      if (/^(ispi[sš]i|output|print|write|ausgabe|schreibe)\s*/i.test(lower)) {
        const payload = text.replace(/^(ispi[sš]i|output|print|write|ausgabe|schreibe)\s*/i, '');
        return lang === 'de' ? `AUSGABE ${payload}` : lang === 'en' ? `OUTPUT ${payload}` : `ISPIŠI ${payload}`;
      }
      return lang === 'de' ? `AUSGABE ${text}` : lang === 'en' ? `OUTPUT ${text}` : `ISPIŠI ${text}`;
    }
    if (node.type === 'process') {
      const eq = text.indexOf('=');
      if (eq !== -1) {
        const rhs = text.slice(eq + 1).trim();
        const simple = /^[\w.]+$/.test(rhs);
        if (simple) {
          return lang === 'de' ? `SETZE ${text}` : lang === 'en' ? `SET ${text}` : `POSTAVI ${text}`;
        }
        return lang === 'de' ? `BERECHNE ${text}` : lang === 'en' ? `CALCULATE ${text}` : `RAČUNAJ ${text}`;
      }
      return text;
    }
    return text;
  }

  function indentLines(arr: string[], level: number): string[] {
    const pad = '  '.repeat(level);
    return arr.map((l) => pad + l);
  }

  function walk(nodeId: string | null, stopAt: string | null, guardCount: number, chain: Record<string, boolean>): string[] {
    const lines: string[] = [];
    let current = nodeId;
    let guard = 0;
    chain = { ...chain };

    while (current && current !== stopAt && guard++ < (guardCount || 1000)) {
      const node = byId[current];
      if (!node) break;

      // Count loop
      if (node.type === 'loop' && countTimes(node)) {
        if (chain[current]) {
          lines.push(loopNote);
          break;
        }
        let backCnt: { to: string } | null = null;
        let exitCnt: { to: string } | null = null;
        (outMap[current] || []).forEach((e) => {
          if (!backCnt && reachesBack(e.to, current, chain, stopAt)) backCnt = e;
          else if (!exitCnt) exitCnt = e;
        });

        if (backCnt) {
          chain[current] = true;
          const bodyCnt = walk(backCnt.to, current, guardCount, { ...chain, [current]: true });
          const times = countTimes(node)!;
          const headStr = lang === 'de'
            ? `WIEDERHOLE ${times} MAL`
            : lang === 'en'
            ? `REPEAT ${times} TIMES`
            : `PONOVI ${times} PUTA`;
          lines.push(headStr);
          lines.push(...indentLines(bodyCnt, 1));
          current = exitCnt ? exitCnt.to : null;
          continue;
        }
      }

      if (node.type === 'start_end') {
        const outsSE = outMap[current] || [];
        if (outsSE.length === 0) break;
        current = outsSE[0].to;
        continue;
      }

      if (node.type === 'decision') {
        if (chain[current]) {
          lines.push(loopNote);
          break;
        }
        chain[current] = true;

        const fakeEdgeList: FlowEdge[] = (outMap[current] || []).map((o, idx) => ({
          id: `e_${idx}`,
          from: current!,
          to: o.to,
          label: o.label,
        }));
        const branches = pickDecisionBranches(fakeEdgeList);
        const daEdge = branches.da;
        const neEdge = branches.ne;

        // While loop
        const daBack = daEdge ? reachesBack(daEdge.to, current, chain, stopAt) : false;
        const neBack = neEdge ? reachesBack(neEdge.to, current, chain, stopAt) : false;
        if (daBack !== neBack) {
          const bodyEdge = daBack ? daEdge : neEdge;
          const outEdge = daBack ? neEdge : daEdge;
          const bodyLines = walk(bodyEdge!.to, current, guardCount, { ...chain, [node.id]: true });
          // The condition goes on the header, matching where the decision sits in
          // the diagram. When the NO branch is the body the loop runs while the
          // condition does not hold, so the header carries the negated form.
          const cond = daBack ? condText(node) : negateCondition(condText(node), lang);
          const loopHead = lang === 'de'
            ? `WIEDERHOLE SOLANGE ${cond}`
            : lang === 'en'
            ? `REPEAT WHILE ${cond}`
            : `PONOVI DOK JE ${cond}`;
          lines.push(loopHead);
          lines.push(...indentLines(bodyLines, 1));
          current = outEdge ? outEdge.to : null;
          continue;
        }

        const merge = findMergePoint(daEdge ? daEdge.to : null, neEdge ? neEdge.to : null);
        const ifWord = lang === 'de' ? `WENN ${condText(node)}` : lang === 'en' ? `IF ${condText(node)}` : `AKO JE ${condText(node)}`;
        lines.push(ifWord);

        if (daEdge) {
          const daLabel = lang === 'de' ? 'JA' : lang === 'en' ? 'YES' : 'DA';
          lines.push(...indentLines([daLabel], 1));
          lines.push(...indentLines(walk(daEdge.to, merge, guardCount, { ...chain, [current]: true }), 2));
        }

        if (neEdge) {
          const neLabel = lang === 'de' ? 'SONST' : lang === 'en' ? 'ELSE' : 'NE';
          lines.push(...indentLines([neLabel], 1));
          lines.push(...indentLines(walk(neEdge.to, merge, guardCount, { ...chain, [current]: true }), 2));
        }

        current = merge;
        continue;
      }

      const l = actionLine(node);
      if (l) lines.push(l);
      const outs = outMap[current] || [];
      current = outs.length ? outs[0].to : null;
    }
    return lines;
  }

  const startWord = lang === 'de' ? 'START' : lang === 'en' ? 'START' : 'POČETAK';
  const endWord = lang === 'de' ? 'ENDE' : lang === 'en' ? 'END' : 'KRAJ';
  const body = startNode ? walk(startNode.id, null, flowNodes.length * 4 + 20, {}) : [];
  return [startWord, ...body, endWord].join('\n');
}

// ---------------- Orthogonal Routing ----------------

const ORT_EPS = 0.5;

export type Side = 'left' | 'right' | 'top' | 'bottom';

export function pickSide(node: FlowNode, toward: { x: number; y: number }): Side {
  const dx = toward.x - node.x;
  const dy = toward.y - node.y;
  if ((node.type === 'decision' || node.type === 'loop') && Math.abs(dx) > node.w * 0.35) {
    return dx > 0 ? 'right' : 'left';
  }
  if (Math.abs(dx) * node.h > Math.abs(dy) * node.w) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

export function sideAxis(side: Side): 'v' | 'h' {
  return side === 'top' || side === 'bottom' ? 'v' : 'h';
}

export function oppositeSide(side: Side): Side {
  if (side === 'left') return 'right';
  if (side === 'right') return 'left';
  if (side === 'top') return 'bottom';
  return 'top';
}

export function defaultSidePoint(node: FlowNode, side: Side): { x: number; y: number } {
  const hw = node.w / 2;
  const hh = node.h / 2;
  if (side === 'left') return { x: node.x - hw, y: node.y };
  if (side === 'right') return { x: node.x + hw, y: node.y };
  if (side === 'top') return { x: node.x, y: node.y - hh };
  return { x: node.x, y: node.y + hh };
}

export interface RoutePoint {
  x: number;
  y: number;
  ci?: number;
}

export function cleanRoute(pts: RoutePoint[]): RoutePoint[] {
  const out: RoutePoint[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < ORT_EPS && Math.abs(last.y - p.y) < ORT_EPS) {
      if ((p.ci ?? -1) > (last.ci ?? -1)) last.ci = p.ci;
      continue;
    }
    out.push({ x: p.x, y: p.y, ci: p.ci });
  }
  if (out.length < 3) return out;
  const res: RoutePoint[] = [out[0]];
  for (let j = 1; j < out.length - 1; j++) {
    const prev = res[res.length - 1];
    const cur = out[j];
    const next = out[j + 1];
    const sameX = Math.abs(prev.x - cur.x) < ORT_EPS && Math.abs(cur.x - next.x) < ORT_EPS;
    const sameY = Math.abs(prev.y - cur.y) < ORT_EPS && Math.abs(cur.y - next.y) < ORT_EPS;
    if (!(sameX || sameY)) res.push(cur);
  }
  res.push(out[out.length - 1]);
  return res;
}

export function orthogonalRoute(
  a: FlowNode,
  b: FlowNode,
  waypoints?: Waypoint[],
  sidePointFn?: (node: FlowNode, side: Side) => { x: number; y: number }
): RoutePoint[] {
  const sp = sidePointFn || defaultSidePoint;
  const wps = (waypoints || []).filter((c) => c && (c.axis === 'x' || c.axis === 'y') && typeof c.v === 'number');

  if (a.id === b.id) {
    const r = sp(a, 'right');
    const t = sp(a, 'top');
    const lx = a.x + a.w / 2 + 44;
    const ly = a.y - a.h / 2 - 44;
    return cleanRoute([r, { x: lx, y: r.y }, { x: lx, y: ly }, { x: t.x, y: ly }, t]);
  }

  if (!wps.length) {
    const below = b.y - b.h / 2 - (a.y + a.h / 2) > -1;
    const above = a.y - a.h / 2 - (b.y + b.h / 2) > -1;

    if (below) {
      let sideA = pickSide(a, b);
      if (sideA === 'top') sideA = 'bottom';
      const top = sp(b, 'top');
      if (sideA !== 'bottom') {
        const sidePt = sp(a, sideA);
        return cleanRoute([sidePt, { x: top.x, y: sidePt.y }, top]);
      }
      const bot = sp(a, 'bottom');
      if (Math.abs(bot.x - top.x) < ORT_EPS) return [bot, top];
      const midY = (bot.y + top.y) / 2;
      return cleanRoute([bot, { x: bot.x, y: midY }, { x: top.x, y: midY }, top]);
    }

    if (above) {
      const aL = a.x - a.w / 2, aR = a.x + a.w / 2;
      const bL = b.x - b.w / 2, bR = b.x + b.w / 2;
      let fromSide: Side, toSide: Side, lane: number;
      if (bL - aR > 24) {
        fromSide = 'right'; toSide = 'left'; lane = (aR + bL) / 2;
      } else if (aL - bR > 24) {
        fromSide = 'left'; toSide = 'right'; lane = (aL + bR) / 2;
      } else {
        fromSide = toSide = b.x - a.x > 1 ? 'right' : 'left';
        lane = fromSide === 'left' ? Math.min(aL, bL) - 48 : Math.max(aR, bR) + 48;
      }
      const bs = sp(a, fromSide);
      const be = sp(b, toSide);
      return cleanRoute([bs, { x: lane, y: bs.y }, { x: lane, y: be.y }, be]);
    }

    const hSide: Side = b.x >= a.x ? 'right' : 'left';
    const hs = sp(a, hSide);
    const he = sp(b, oppositeSide(hSide));
    if (Math.abs(hs.y - he.y) < ORT_EPS) return [hs, he];
    const midX = (hs.x + he.x) / 2;
    return cleanRoute([hs, { x: midX, y: hs.y }, { x: midX, y: he.y }, he]);
  }

  const c0 = wps[0];
  const sideA: Side = c0.axis === 'y'
    ? (c0.v > a.y ? 'bottom' : 'top')
    : (c0.v > a.x ? 'right' : 'left');
  const start = sp(a, sideA);
  const pts: RoutePoint[] = [{ x: start.x, y: start.y, ci: -1 }];
  let dir = sideAxis(sideA);

  for (let k = 0; k < wps.length; k++) {
    const prev = pts[pts.length - 1];
    if (wps[k].axis === 'y') {
      pts.push({ x: prev.x, y: wps[k].v, ci: k });
      dir = 'v';
    } else {
      pts.push({ x: wps[k].v, y: prev.y, ci: k });
      dir = 'h';
    }
  }

  const tail = wps.length - 1;
  const last = pts[pts.length - 1];
  const sideB = pickSide(b, last);
  const target = sp(b, sideB);
  const arrive = sideAxis(sideB);

  if (arrive === 'v') {
    if (Math.abs(last.x - target.x) > ORT_EPS) {
      if (dir === 'v') {
        pts.push({ x: target.x, y: last.y, ci: tail });
      } else {
        const midY = (last.y + target.y) / 2;
        pts.push({ x: last.x, y: midY, ci: tail });
        pts.push({ x: target.x, y: midY, ci: tail });
      }
    }
  } else {
    if (Math.abs(last.y - target.y) > ORT_EPS) {
      if (dir === 'h') {
        pts.push({ x: last.x, y: target.y, ci: tail });
      } else {
        const midX = (last.x + target.x) / 2;
        pts.push({ x: midX, y: last.y, ci: tail });
        pts.push({ x: midX, y: target.y, ci: tail });
      }
    }
  }
  pts.push({ x: target.x, y: target.y, ci: tail });
  return cleanRoute(pts);
}

export interface SegmentHandle {
  x: number;
  y: number;
  axis: 'x' | 'y';
  seg: number;
}

export function segmentHandles(pts: RoutePoint[]): SegmentHandle[] {
  const out: SegmentHandle[] = [];
  if (!pts || pts.length < 2) return out;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i], q = pts[i + 1];
    const vertical = Math.abs(p.x - q.x) < ORT_EPS;
    const len = vertical ? Math.abs(q.y - p.y) : Math.abs(q.x - p.x);
    if (len < 32) continue;
    out.push({
      x: (p.x + q.x) / 2,
      y: (p.y + q.y) / 2,
      axis: vertical ? 'x' : 'y',
      seg: i,
    });
  }
  return out;
}

export interface LabelBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function edgeLabelBox(pts: RoutePoint[], sourceNode: FlowNode | null, label: string): LabelBox | null {
  if (!pts || pts.length < 2) return null;
  const w = Math.max(26, String(label || '').length * 8 + 12);
  const h = 20;
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  const bigSource = sourceNode && (sourceNode.type === 'decision' || sourceNode.type === 'loop');
  const dist = Math.min(bigSource ? 38 : 26, total * 0.4);

  let remaining = dist;
  let seg = 0;
  let t = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    seg = i;
    if (remaining <= len || i === pts.length - 2) {
      t = len ? Math.min(remaining, len) / len : 0;
      break;
    }
    remaining -= len;
  }

  const p = pts[seg], q = pts[seg + 1];
  let x = p.x + (q.x - p.x) * t;
  let y = p.y + (q.y - p.y) * t;
  const vertical = Math.abs(q.x - p.x) < Math.abs(q.y - p.y);
  if (vertical) x += w / 2 + 5;
  else y -= h / 2 + 5;

  return { x, y, w, h };
}

export function zoomViewBox(vb: ViewBox, factor: number, center?: { x: number; y: number } | null): ViewBox {
  const ZOOM_MIN_W = 300, ZOOM_MAX_W = 6000;
  const newW = Math.max(ZOOM_MIN_W, Math.min(ZOOM_MAX_W, vb.w / factor));
  const actual = vb.w / newW;
  const newH = vb.h / actual;
  const cx = center?.x ?? vb.x + vb.w / 2;
  const cy = center?.y ?? vb.y + vb.h / 2;
  return { x: cx - newW / 2, y: cy - newH / 2, w: newW, h: newH };
}
