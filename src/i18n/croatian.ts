/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, SourceLang } from '../types';

/**
 * Croatian is written as a variant of the Bosnian text rather than as a fourth
 * set of strings.
 *
 * In this app's vocabulary the two differ in a countable number of words —
 * `uslov`/`uvjet`, `tabela`/`tablica`, `ugao`/`kut` — and everything else is
 * identical to the letter. A separate translation would therefore be a copy
 * that drifts: every new exercise would need a fourth version of its title,
 * prompt, hint and solution, and the day one of them is forgotten a Croatian
 * student reads Bosnian without either of us noticing.
 *
 * Whole words only, and only the forms that actually occur. Substituting on
 * stems looks tempting and is wrong: `ugl` would turn `uglavnom` into
 * `kutavnom`, and `cifar` would give `znamenkara` where `znamenaka` belongs.
 * `scripts/croatian-check.ts` fails when a word from the Bosnian side of this
 * map appears in a form the map does not cover.
 */
const WORDS: Record<string, string> = {
  // condition — the app's most common noun
  uslov: 'uvjet',
  uslova: 'uvjeta',
  uslovi: 'uvjeti',
  uslove: 'uvjete',
  uslovom: 'uvjetom',
  uslovu: 'uvjetu',

  // table
  tabela: 'tablica',
  tabele: 'tablice',
  tabeli: 'tablici',
  tabelom: 'tablicom',
  tabelu: 'tablicu',

  // geometry
  ugao: 'kut',
  ugla: 'kuta',
  uglu: 'kutu',
  uglovi: 'kutovi',
  uglova: 'kutova',
  uglovima: 'kutovima',
  obim: 'opseg',
  obima: 'opsega',
  obimu: 'opsegu',
  trougao: 'trokut',
  trougla: 'trokuta',
  trouglu: 'trokutu',
  pravougaonik: 'pravokutnik',
  pravougaonika: 'pravokutnika',
  pravougaoniku: 'pravokutniku',

  // arithmetic
  zbir: 'zbroj',
  zbira: 'zbroja',
  zbiru: 'zbroju',
  cifra: 'znamenka',
  cifre: 'znamenke',
  cifara: 'znamenaka',
  cifru: 'znamenku',
  dvocifreni: 'dvoznamenkasti',
  dvocifrenog: 'dvoznamenkastog',
  jednačina: 'jednadžba',
  jednačine: 'jednadžbe',
  jednačinu: 'jednadžbu',

  // correctness
  tačno: 'točno',
  tačna: 'točna',
  tačan: 'točan',
  tačne: 'točne',
  tačni: 'točni',
  netačno: 'netočno',

  // everyday words the exercises use
  sedmica: 'tjedan',
  sedmice: 'tjedna',
  sedmicu: 'tjedan',
  // a variable name in a task, without its diacritics as identifiers are
  sedmicno: 'tjedno',
  prodavnica: 'trgovina',
  prodavnici: 'trgovini',
  prodavnice: 'trgovine',
  tečno: 'tekuće',
  tečnom: 'tekućem',
  dugme: 'gumb',
  dugmad: 'gumbi',
  dugmetom: 'gumbom',
  tastaturne: 'tipkovničke',
  prečica: 'prečac',
  prečice: 'prečaci',
  prečicu: 'prečac',
  prečicama: 'prečacima',

  // degrees
  stepen: 'stupanj',
  stepena: 'stupnja',
  stepeni: 'stupnjevi',
  stepenima: 'stupnjevima',
};

/** Words with a Croatian form, longest first so no prefix shadows a longer word. */
const PATTERN = new RegExp(
  `(?<![\\p{L}])(${Object.keys(WORDS)
    .sort((a, b) => b.length - a.length)
    .join('|')})(?![\\p{L}])`,
  'giu'
);

/** The Bosnian words this map knows how to convert, for the check script. */
export const CROATIAN_WORDS = WORDS;

/**
 * Forms that must not survive into Croatian. The map above covers the words
 * that occur today; these patterns catch the day a new exercise brings an
 * inflection it does not know, which is the failure this whole arrangement
 * exists to make loud. `uglavnom` is not a case of `ugao` and is spared.
 */
export const BOSNIAN_ONLY: RegExp[] = [
  /\buslov\p{L}*/giu,
  /\btabel\p{L}*/giu,
  /\bugao\b/giu,
  /\bugl(?!avnom)\p{L}*/giu,
  /\bobim\p{L}*/giu,
  /\btroug\p{L}*/giu,
  /\bne?tačn\p{L}*/giu,
  /\bsedmic\p{L}*/giu,
  /\bcifr\p{L}*/giu,
  /\bdvocifr\p{L}*/giu,
  /\bdugm\p{L}*/giu,
  /\bpravougaon\p{L}*/giu,
  /\bjednačin\p{L}*/giu,
  /\bprodavnic\p{L}*/giu,
  /\btečn\p{L}*/giu,
  /\bzbir\p{L}*/giu,
  /\btastatur\p{L}*/giu,
  /\bprečic\p{L}*/giu,
  /\bstepen\p{L}*/giu,
];

/** Keeps the shape of the original: ALL CAPS, Capitalised, or lower case. */
function matchCase(source: string, replacement: string): string {
  if (source === source.toUpperCase() && source !== source.toLowerCase()) {
    return replacement.toUpperCase();
  }
  if (source[0] === source[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/** The Croatian reading of a Bosnian string. */
export function toCroatian(text: string): string {
  return text.replace(PATTERN, (word) => matchCase(word, WORDS[word.toLowerCase()] ?? word));
}

/**
 * The language a given language's text is written in. Croatian has no strings
 * of its own; it reads the Bosnian ones through `toCroatian`.
 */
export function sourceLang(lang: Language): SourceLang {
  return lang === 'hr' ? 'bs' : lang;
}

/** `text` as `lang` reads it, converting only where the language asks for it. */
export function localize(lang: Language, text: string): string {
  return lang === 'hr' ? toCroatian(text) : text;
}
