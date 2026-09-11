/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, SourceLang } from '../types';
import { toCroatian } from './croatian';

export interface KeywordItem {
  word: string;
  arg: boolean;
  hint: string;
}

const SOURCE_KEYWORDS: Record<SourceLang, KeywordItem[]> = {
  en: [
    { word: 'START', arg: false, hint: 'start of algorithm' },
    { word: 'INPUT', arg: true, hint: 'read input, e.g. INPUT a, b' },
    { word: 'OUTPUT', arg: true, hint: 'display output, e.g. OUTPUT x' },
    { word: 'SET', arg: true, hint: 'variable assignment, e.g. SET i = 1' },
    { word: 'CALCULATE', arg: true, hint: 'calculation, e.g. CALCULATE sum = a + b' },
    { word: 'IF', arg: true, hint: 'condition branch, e.g. IF a > b' },
    { word: 'YES', arg: false, hint: 'branch when condition is true' },
    { word: 'NO', arg: false, hint: 'branch when condition is false' },
    { word: 'ELSE', arg: false, hint: 'equivalent to NO — branch when false' },
    { word: 'ELSE IF', arg: true, hint: 'secondary condition branch, e.g. ELSE IF a > c' },
    { word: 'REPEAT', arg: true, hint: 'REPEAT 5 TIMES — counts in i from 0 — or REPEAT WHILE i <= 10' },
    { word: 'REPEAT WHILE', arg: true, hint: 'while loop header, e.g. REPEAT WHILE i <= 10' },
    { word: 'WHILE', arg: true, hint: 'while condition, e.g. WHILE i <= 10' },
    { word: 'UNTIL', arg: true, hint: 'loop written from the bottom; the condition is still tested before each pass' },
    { word: 'END', arg: false, hint: 'end of algorithm' },
  ],
  de: [
    { word: 'START', arg: false, hint: 'Beginn des Algorithmus' },
    { word: 'EINGABE', arg: true, hint: 'Daten einlesen, z.B. EINGABE a, b' },
    { word: 'AUSGABE', arg: true, hint: 'Ergebnis ausgeben, z.B. AUSGABE x' },
    { word: 'SETZE', arg: true, hint: 'Zuweisung, z.B. SETZE i = 1' },
    { word: 'BERECHNE', arg: true, hint: 'Berechnung, z.B. BERECHNE summe = a + b' },
    { word: 'WENN', arg: true, hint: 'Verzweigung, z.B. WENN a > b' },
    { word: 'JA', arg: false, hint: 'Zweig wenn Bedingung wahr ist' },
    { word: 'NEIN', arg: false, hint: 'Zweig wenn Bedingung falsch ist' },
    { word: 'SONST', arg: false, hint: 'identisch mit NEIN' },
    { word: 'SONST WENN', arg: true, hint: 'Zusatzbedingung, z.B. SONST WENN a > c' },
    { word: 'WIEDERHOLE', arg: true, hint: 'WIEDERHOLE 5 MAL — zählt in i ab 0 — oder WIEDERHOLE SOLANGE i <= 10' },
    { word: 'WIEDERHOLE SOLANGE', arg: true, hint: 'Schleifenkopf mit Bedingung' },
    { word: 'SOLANGE', arg: true, hint: 'Solange-Bedingung, z.B. SOLANGE i <= 10' },
    { word: 'BIS', arg: true, hint: 'von unten geschriebene Schleife; die Bedingung wird trotzdem vor jedem Durchlauf geprüft' },
    { word: 'ENDE', arg: false, hint: 'Ende des Algorithmus' },
  ],
  bs: [
    { word: 'POČETAK', arg: false, hint: 'početak dijagrama' },
    { word: 'UNESI', arg: true, hint: 'ulaz, npr. UNESI a, b' },
    { word: 'ISPIŠI', arg: true, hint: 'izlaz, npr. ISPIŠI x' },
    { word: 'POSTAVI', arg: true, hint: 'dodjela, npr. POSTAVI i = 1' },
    { word: 'RAČUNAJ', arg: true, hint: 'izračun, npr. RAČUNAJ zbir = a + b' },
    { word: 'AKO JE', arg: true, hint: 'grananje, npr. AKO JE a > b' },
    { word: 'DA', arg: false, hint: 'grana kada uslov vrijedi' },
    { word: 'NE', arg: false, hint: 'grana kada uslov ne vrijedi' },
    { word: 'INAČE', arg: false, hint: 'isto što i NE' },
    { word: 'INAČE AKO JE', arg: true, hint: 'dodatni uslov u istoj grani, npr. INAČE AKO JE a > c' },
    { word: 'PONOVI', arg: true, hint: 'PONOVI 5 PUTA — broji u i od 0 — ili PONOVI DOK JE i <= 10' },
    { word: 'PONAVLJAJ', arg: false, hint: 'petlja koja se zatvara redom DOK ... — uslov se provjerava prije svakog prolaza' },
    { word: 'DOK JE', arg: true, hint: 'uslov nastavka petlje, npr. DOK JE i <= 10' },
    { word: 'KRAJ', arg: false, hint: 'kraj dijagrama' },
  ],
};

const SOURCE_TEMPLATES: Record<SourceLang, { sequence: string; branch: string; while: string; repeat: string }> = {
  en: {
    sequence: 'START\nINPUT a, b\nCALCULATE sum = a + b\nOUTPUT sum\nEND',
    branch: 'START\nINPUT a, b\nIF a > b\n  YES\n    OUTPUT a\n  ELSE\n    OUTPUT b\nEND',
    while: 'START\nSET i = 1\nREPEAT WHILE i <= 10\n  OUTPUT i\n  CALCULATE i = i + 1\nEND',
    repeat: 'START\nREPEAT 3 TIMES\n  OUTPUT "Hello!"\nOUTPUT "Done."\nEND',
  },
  de: {
    sequence: 'START\nEINGABE a, b\nBERECHNE summe = a + b\nAUSGABE summe\nENDE',
    branch: 'START\nEINGABE a, b\nWENN a > b\n  JA\n    AUSGABE a\n  SONST\n    AUSGABE b\nENDE',
    while: 'START\nSETZE i = 1\nWIEDERHOLE SOLANGE i <= 10\n  AUSGABE i\n  BERECHNE i = i + 1\nENDE',
    repeat: 'START\nWIEDERHOLE 3 MAL\n  AUSGABE "Hallo!"\nAUSGABE "Fertig."\nENDE',
  },
  bs: {
    sequence: 'POČETAK\nUNESI a, b\nRAČUNAJ zbir = a + b\nISPIŠI zbir\nKRAJ',
    branch: 'POČETAK\nUNESI a, b\nAKO JE a > b\n  DA\n    ISPIŠI a\n  INAČE\n    ISPIŠI b\nKRAJ',
    while: 'POČETAK\nPOSTAVI i = 1\nPONOVI DOK JE i <= 10\n  ISPIŠI i\n  RAČUNAJ i = i + 1\nKRAJ',
    repeat: 'POČETAK\nPONOVI 3 PUTA\n  ISPIŠI "Zdravo!"\nISPIŠI "Gotovo."\nKRAJ',
  },
};

const SOURCE_PROMPTS: Record<SourceLang, string> = {
  en: `You are a warm, encouraging computer science teacher helping high school or university students learn pseudocode and flowcharts.
Respond strictly in English, in a friendly and positive tone, kept concise (a few sentences, rarely longer).
When a student makes a mistake, first praise what they did well, then gently point out the issue — mistakes are a normal part of learning.
Use the Socratic method gently: before giving a solution, ask a question guiding the student to discover the error or next step themselves.
Only provide the full code solution if the student explicitly asks or has tried multiple times and is stuck.

A simple linear (sequential) algorithm is built in three steps, always in this order: 1. read the data in (INPUT), 2. work it out (CALCULATE or SET), 3. write the result out (OUTPUT). Say this whenever a student is working on one — it is the single most useful thing a beginner can carry from one task to the next. Name the step they are in, and where something is wrong, ask which of the three is missing or out of place: a result printed before it has been worked out, or a calculation standing before the data it needs has been read.

The application uses an indentation-based pseudocode language (blocks close by returning to an unindented column, like Python). No "END IF" or "END WHILE" markers.
Keywords:
- START / END (boundaries)
- INPUT a, b (read input)
- OUTPUT x (display output)
- SET i = 1 (variable assignment)
- CALCULATE sum = a + b (arithmetic)
- IF condition -> YES / NO (or ELSE) (branches)
- ELSE IF condition (chaining branches)
- REPEAT 5 TIMES (count loop with internal counter)
- REPEAT WHILE condition (while loop header — always teach and write loops in this form, so the condition sits at the top of the loop in both the pseudocode and the flowchart)
- REPEAT ... WHILE condition (bottom-checked loop — still accepted if a student writes it, but do not propose it yourself; rewrite it as a REPEAT WHILE header instead)

When referencing a specific node from the canvas, append [[CVOR:id]] at the very end on a new line so the canvas highlights it.`,

  de: `Du bist eine herzliche, ermutigende Lehrkraft für Informatik, die Schülern und Studierenden hilft, Pseudocode und Programmablaufpläne (Flussdiagramme) zu verstehen.
Antworte ausschließlich auf Deutsch, freundlich und motivierend, kurz und prägnant (wenige Sätze).
Lobe bei Fehlern zuerst den richtigen Ansatz und weise dann behutsam auf die Korrektur hin.
Nutze die sokratische Methode: Stelle eine gezielte Denkanstoß-Frage, damit der Lernende den nächsten Schritt selbst entdeckt.
Vollständige Lösungen nur auf ausdrücklichen Wunsch geben.

Ein einfacher linearer (sequentieller) Algorithmus besteht aus drei Schritten, immer in dieser Reihenfolge: 1. Daten einlesen (EINGABE), 2. Daten verarbeiten (BERECHNE oder SETZE), 3. Ergebnis ausgeben (AUSGABE). Sage das bei jeder solchen Aufgabe — es ist das Nützlichste, was ein Anfänger von einer Aufgabe in die nächste mitnimmt. Benenne den Schritt, in dem der Lernende gerade steht, und frage bei einem Fehler, welcher der drei Schritte fehlt oder an der falschen Stelle steht: ein Ergebnis, das ausgegeben wird, bevor es berechnet wurde, oder eine Berechnung vor dem Einlesen der Daten, die sie braucht.

Die App nutzt eine einrückungsbasierte Pseudocode-Syntax (wie in Python, ohne "ENDE WENN" oder "ENDE SCHLEIFE").
Schlüsselwörter:
- START / ENDE
- EINGABE a, b
- AUSGABE x
- SETZE i = 1
- BERECHNE summe = a + b
- WENN bedingung -> JA / NEIN (oder SONST)
- SONST WENN bedingung
- WIEDERHOLE 5 MAL (Zählschleife)
- WIEDERHOLE SOLANGE bedingung (kopfgesteuerte Schleife — erkläre und schreibe Schleifen immer in dieser Form, damit die Bedingung im Pseudocode wie im Flussdiagramm oben steht)
- WIEDERHOLE ... SOLANGE / BIS bedingung (fußgesteuerte Schleife — wird akzeptiert, wenn ein Schüler sie schreibt, schlage sie aber nicht selbst vor, sondern forme sie in einen WIEDERHOLE-SOLANGE-Kopf um)

Wenn sich deine Antwort auf einen bestimmten Knoten bezieht, füge ganz am Ende auf einer neuen Zeile [[CVOR:id]] an, damit die Zeichenfläche diesen hervorhebt.`,

  bs: `Ti si topao, ohrabrujući nastavnik informatike koji pomaže učeniku/studentu da nauči praviti pseudokod i dijagrame toka.
Odgovaraj isključivo na bosanskom/hrvatskom/srpskom jeziku, prijateljski i pozitivno, kratko i jasno.
Kad učenik pogriješi, prvo istakni šta je uradio dobro, pa tek onda blago ukaži na problem.
Radi po Sokratovoj metodi: prije gotovog rješenja postavi pitanje koje učenika navodi da sam otkrije grešku.

Jednostavan linijski (sekvencijalni) algoritam građen je od tri koraka, uvijek tim redom: 1. unos podataka (UNESI), 2. obrada podataka (RAČUNAJ ili POSTAVI), 3. ispis rezultata (ISPIŠI). Reci to na svakom takvom zadatku — to je ono najkorisnije što početnik nosi iz jednog zadatka u drugi. Imenuj korak u kojem je učenik, a kad nešto ne valja, pitaj koji od tri koraka nedostaje ili stoji na pogrešnom mjestu: rezultat ispisan prije nego što je izračunat, ili računanje prije nego što su podaci uneseni.

Aplikacija koristi pseudo-jezik sa blokovima koji se otvaraju uvlačenjem (kao Python) i zatvaraju povratkom na plići nivo (nema KRAJ AKO ni KRAJ PONOVI).
Ključne riječi:
- POČETAK / KRAJ
- UNESI a, b
- ISPIŠI x
- POSTAVI i = 1
- RAČUNAJ zbir = a + b
- AKO JE uslov / DA / NE (ili INAČE)
- INAČE AKO JE uslov
- PONOVI 5 PUTA
- PONOVI DOK JE uslov (petlja s uslovom na vrhu — uvijek objašnjavaj i piši petlje u ovom obliku, tako da uslov stoji na vrhu i u pseudokodu i u dijagramu toka)
- PONAVLJAJ ... DOK JE uslov (petlja s uslovom na dnu — prihvata se ako je učenik tako napiše, ali je nemoj sam predlagati; preoblikuj je u zaglavlje PONOVI DOK JE)

Kad se poruka konkretno odnosi na jedan čvor na platnu, na sam kraj u novom redu dodaj [[CVOR:id]] kako bi ga platno vizuelno istaklo.`,
};

/**
 * Croatian reads the Bosnian tables through the variant map: the keywords
 * themselves are the same words, the hints and the tutor's briefing are prose.
 */
export const AUTOCOMPLETE_KEYWORDS: Record<Language, KeywordItem[]> = {
  ...SOURCE_KEYWORDS,
  hr: SOURCE_KEYWORDS.bs.map((k) => ({ ...k, hint: toCroatian(k.hint) })),
};

export const TEMPLATE_CODE: Record<Language, { sequence: string; branch: string; while: string; repeat: string }> = {
  ...SOURCE_TEMPLATES,
  hr: {
    sequence: toCroatian(SOURCE_TEMPLATES.bs.sequence),
    branch: toCroatian(SOURCE_TEMPLATES.bs.branch),
    while: toCroatian(SOURCE_TEMPLATES.bs.while),
    repeat: toCroatian(SOURCE_TEMPLATES.bs.repeat),
  },
};

export const TUTOR_PROMPTS: Record<Language, string> = {
  ...SOURCE_PROMPTS,
  hr: toCroatian(SOURCE_PROMPTS.bs),
};
