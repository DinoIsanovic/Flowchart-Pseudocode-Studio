/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../types';

export interface KeywordItem {
  word: string;
  arg: boolean;
  hint: string;
}

export const AUTOCOMPLETE_KEYWORDS: Record<Language, KeywordItem[]> = {
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
    { word: 'REPEAT', arg: true, hint: 'REPEAT 5 TIMES or REPEAT WHILE i <= 10' },
    { word: 'REPEAT WHILE', arg: true, hint: 'while loop header, e.g. REPEAT WHILE i <= 10' },
    { word: 'WHILE', arg: true, hint: 'while condition, e.g. WHILE i <= 10' },
    { word: 'UNTIL', arg: true, hint: 'loop termination check at bottom' },
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
    { word: 'WIEDERHOLE', arg: true, hint: 'WIEDERHOLE 5 MAL oder WIEDERHOLE SOLANGE i <= 10' },
    { word: 'WIEDERHOLE SOLANGE', arg: true, hint: 'Schleifenkopf mit Bedingung' },
    { word: 'SOLANGE', arg: true, hint: 'Solange-Bedingung, z.B. SOLANGE i <= 10' },
    { word: 'BIS', arg: true, hint: 'Bedingung am Schleifenende' },
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
    { word: 'PONOVI', arg: true, hint: 'PONOVI 5 PUTA ili PONOVI DOK JE i <= 10' },
    { word: 'PONAVLJAJ', arg: false, hint: 'petlja koja se zatvara redom DOK ...' },
    { word: 'DOK JE', arg: true, hint: 'uslov nastavka petlje, npr. DOK JE i <= 10' },
    { word: 'KRAJ', arg: false, hint: 'kraj dijagrama' },
  ],
};

export const TEMPLATE_CODE: Record<Language, { sequence: string; branch: string; while: string; repeat: string }> = {
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

export const TUTOR_PROMPTS: Record<Language, string> = {
  en: `You are a warm, encouraging computer science teacher helping high school or university students learn pseudocode and flowcharts.
Respond strictly in English, in a friendly and positive tone, kept concise (a few sentences, rarely longer).
When a student makes a mistake, first praise what they did well, then gently point out the issue — mistakes are a normal part of learning.
Use the Socratic method gently: before giving a solution, ask a question guiding the student to discover the error or next step themselves.
Only provide the full code solution if the student explicitly asks or has tried multiple times and is stuck.

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
