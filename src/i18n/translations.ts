/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language } from '../types';

export interface Translations {
  appName: string;
  appSubtitle: string;
  languageName: string;
  
  // Toolbar
  addSymbol: string;
  shapes: {
    start_end: string;
    start_end_desc: string;
    io: string;
    io_desc: string;
    process: string;
    process_desc: string;
    decision: string;
    decision_desc: string;
    loop: string;
    loop_desc: string;
    subprocess: string;
    subprocess_desc: string;
    comment: string;
    comment_desc: string;
  };
  shapeDefaults: {
    start_end_start: string;
    start_end_end: string;
    io: string;
    process: string;
    decision: string;
    loop: string;
    subprocess: string;
    comment: string;
  };
  mode: string;
  modeMove: string;
  modeConnect: string;
  zoom: string;
  zoomIn: string;
  zoomOut: string;
  resetView: string;
  autoLayout: string;
  autoLayoutTooltip: string;
  centerNodes: string;
  centerNodesTooltip: string;
  edit: string;
  undo: string;
  redo: string;
  straightenEdge: string;
  straightenEdgeTooltip: string;
  deleteSelected: string;
  clearAll: string;
  textSize: string;
  examples: string;
  templates: {
    sequence: string;
    branch: string;
    while: string;
    repeat: string;
  };
  file: string;
  exportPng: string;
  saveJson: string;
  loadJson: string;
  androidPrep: string;
  authorCredit: string;

  // Header & View
  viewSplit: string;
  viewCanvasOnly: string;
  viewPseudoOnly: string;
  tutorBtn: string;
  shortcutsBtn: string;
  installBtn: string;
  fullscreen: string;

  // Pseudocode Panel
  pseudocodeHeader: string;
  keywordsToggle: string;
  keywordsLegend: {
    input: string;
    output: string;
    assign: string;
    calc: string;
    ifThen: string;
    ifElse: string;
    elseIf: string;
    repeatCount: string;
    whileLoop: string;
    repeatUntil: string;
    startEnd: string;
    indentNotice: string;
    tipTab: string;
  };
  pseudoPlaceholder: string;
  generateDiagram: string;
  generatePseudo: string;
  errorHeader: string;
  warningHeader: string;
  autocompleteTip: string;

  // Hints
  hintMove: string;
  hintConnect: string;
  hintCommentBlocked: string;

  // Edge label prompts
  edgeLabelPrompt: string;
  yesLabel: string;
  noLabel: string;
  elseLabelFull: string;

  // Confirmations
  confirmGenerate: string;
  confirmReverse: string;
  confirmClear: string;
  confirmTemplate: string;
  emptyCanvasAlert: string;
  invalidJsonAlert: string;

  // AI Tutor
  tutorTitle: string;
  tutorNewChat: string;
  tutorApiKeyLabel: string;
  tutorApiKeyPlaceholder: string;
  tutorKeyHint: string;
  tutorModelLabel: string;
  tutorPlaceholder: string;
  tutorSend: string;
  tutorThinking: string;
  tutorNeedKey: string;
  tutorError: string;
  tutorEmptyReply: string;

  // Android Modal
  androidModalTitle: string;
  androidSubtitle: string;
  androidPwaTitle: string;
  androidPwaDesc: string;
  androidPwaStep1: string;
  androidPwaStep2: string;
  androidTwaTitle: string;
  androidTwaDesc: string;
  androidCapacitorTitle: string;
  androidCapacitorDesc: string;
  androidCopyCmd: string;
  copied: string;
  // Simulator
  sim: {
    title: string;
    run: string;
    pause: string;
    step: string;
    reset: string;
    panel: string;
    stepLabel: string;
    ready: string;
    done: string;
    noVars: string;
    noOutput: string;
    inputFor: string;
  };
  // Exercises
  vjezbe: {
    title: string;
    intro: string;
    progress: string;
    back: string;
    check: string;
    solved: string;
    reward: string;
    reset: string;
    pool: string;
    answer: string;
    poolEmpty: string;
    answerEmpty: string;
    fill: string;
    fillAll: string;
    predict: string;
    inputLabel: string;
    outputLabel: string;
    noInput: string;
    types: Record<string, string>;
  };
  close: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    appName: 'Flowchart & Pseudocode Studio',
    appSubtitle: 'Bi-directional Flowchart & Pseudocode Converter',
    languageName: 'English',

    addSymbol: 'ADD SYMBOL',
    shapes: {
      start_end: 'Start / End',
      start_end_desc: 'Start or endpoint of the flowchart',
      io: 'Input / Output',
      io_desc: 'Read data (input) or display result (output)',
      process: 'Process',
      process_desc: 'Calculation, assignment, or statement',
      decision: 'Condition (Decision)',
      decision_desc: 'Branching condition (YES / NO)',
      loop: 'Repeat N Times',
      loop_desc: 'Fixed count loop with internal counter',
      subprocess: 'Subroutine',
      subprocess_desc: 'Predefined procedure or function call',
      comment: 'Comment Note',
      comment_desc: 'Explanatory annotation (not part of flow)',
    },
    shapeDefaults: {
      start_end_start: 'start',
      start_end_end: 'end',
      io: 'input / output',
      process: 'action',
      decision: 'condition ?',
      loop: 'repeat 3 times',
      subprocess: 'subprocedure',
      comment: 'note',
    },
    mode: 'OPERATION MODE',
    modeMove: '↕ Move & Edit',
    modeConnect: '→ Connect',
    zoom: 'ZOOM & PAN',
    zoomIn: '+',
    zoomOut: '–',
    resetView: 'Reset View',
    autoLayout: 'Auto-Layout',
    autoLayoutTooltip: 'Automatically arrange and align all nodes neatly into a clean flowchart',
    centerNodes: 'Center Nodes',
    centerNodesTooltip: 'Center all nodes on the canvas while preserving layout',
    edit: 'EDIT',
    undo: '↶ Undo',
    redo: '↷ Redo',
    straightenEdge: 'Straighten Edge',
    straightenEdgeTooltip: 'Restores automatic right-angle routing',
    deleteSelected: 'Delete Selected',
    clearAll: 'Clear Canvas',
    textSize: 'FONT SIZE',
    examples: 'EXAMPLES',
    templates: {
      sequence: 'Sequential Flow',
      branch: 'Branching (If/Else)',
      while: 'While Loop',
      repeat: 'Count Loop (N Times)',
    },
    file: 'FILE & EXPORT',
    exportPng: 'Export as Image (PNG)',
    saveJson: 'Save Project (.json)',
    loadJson: 'Load Project (.json)',
    androidPrep: '📱 Android App Setup',
    authorCredit: 'Original concept: Dino Isanović',

    viewSplit: 'Split View',
    viewCanvasOnly: 'Canvas Only',
    viewPseudoOnly: 'Code Only',
    tutorBtn: '🎓 AI Tutor',
    shortcutsBtn: '⌨️ Shortcuts',
    installBtn: '📲 Install App',
    fullscreen: '⛶ Fullscreen',

    pseudocodeHeader: 'Pseudocode',
    keywordsToggle: 'Keyword Cheatsheet',
    keywordsLegend: {
      input: 'INPUT a, b — read data',
      output: 'OUTPUT x — print result',
      assign: 'SET i = 1 — variable assignment',
      calc: 'CALCULATE sum = a + b — math computation',
      ifThen: 'IF condition -> YES -> actions when true',
      ifElse: 'NO (or ELSE) -> actions when false',
      elseIf: 'ELSE IF condition — additional branch check',
      repeatCount: 'REPEAT 5 TIMES — loop with hidden counter',
      whileLoop: 'REPEAT WHILE condition (or WHILE) — loop header',
      repeatUntil: 'REPEAT ... UNTIL condition (loop with check at end)',
      startEnd: 'START / END — optional algorithm boundaries',
      indentNotice: 'Blocks close automatically by unindenting (like Python).',
      tipTab: 'Type initial letters and press Tab for autocomplete.',
    },
    pseudoPlaceholder: 'e.g.\nINPUT a, b\nIF a > b\n  YES\n    OUTPUT a\n  NO\n    OUTPUT b',
    generateDiagram: 'Generate Flowchart',
    generatePseudo: 'Generate Pseudocode from Diagram',
    errorHeader: 'Pseudocode could not be parsed; flowchart unchanged:',
    warningHeader: 'Flowchart drawn, but check this:',
    autocompleteTip: 'Tab — complete • ↑ ↓ then Enter — select • Esc — close',

    hintMove: 'Mode: Move — drag symbol, double-click for text; click edge then drag box to reroute line',
    hintConnect: 'Mode: Connect — click source symbol, then destination symbol to create an arrow',
    hintCommentBlocked: 'Comments are notes outside the execution flow and cannot be linked with arrows.',

    edgeLabelPrompt: 'Arrow label (e.g., yes / no):',
    yesLabel: 'yes',
    noLabel: 'no',
    elseLabelFull: 'NO (ELSE)',

    confirmGenerate: 'This will replace the current flowchart with one generated from the pseudocode. Continue?',
    confirmReverse: 'This will replace the text in the pseudocode panel with code generated from the flowchart. Continue?',
    confirmClear: 'Clear all shapes and edges from the canvas?',
    confirmTemplate: 'This will replace the current flowchart with the selected example. Continue?',
    emptyCanvasAlert: 'The canvas is empty — there is no flowchart to convert to pseudocode.',
    invalidJsonAlert: 'Could not load project file: ',

    tutorTitle: '🎓 AI Programming Tutor',
    tutorNewChat: 'New Chat',
    tutorApiKeyLabel: 'Gemini API Key (free at aistudio.google.com):',
    tutorApiKeyPlaceholder: 'Paste your API key here',
    tutorKeyHint: 'Key is stored in this browser session only and sent directly to Google.',
    tutorModelLabel: 'Model',
    tutorPlaceholder: 'Ask a question about your pseudocode or flowchart...',
    tutorSend: 'Send',
    tutorThinking: 'Tutor is thinking...',
    tutorNeedKey: 'Please enter your Gemini API key above (get a free key at aistudio.google.com).',
    tutorError: 'Error from Gemini API: ',
    tutorEmptyReply: 'Empty response from tutor. Please try again or rephrase your question.',

    androidModalTitle: 'Android Application Readiness',
    androidSubtitle: 'Build and deploy this project as a native Android App (.apk / .aab) or PWA',
    androidPwaTitle: '1. Progressive Web App (PWA) / Instant Mobile App',
    androidPwaDesc: 'This application is 100% PWA compliant with offline service workers, web app manifest, and mobile touch gestures.',
    androidPwaStep1: 'Open this URL in Google Chrome on your Android phone or tablet.',
    androidPwaStep2: 'Tap "Install App" in the top bar or Chrome menu "Add to Home screen". The app will install with a native app icon and run full-screen offline without browser chrome.',
    androidTwaTitle: '2. Google Play Store APK / AAB (Bubblewrap / TWA)',
    androidTwaDesc: 'Package this app directly into an Android Studio APK / AAB for distribution on the Google Play Store using Google’s official CLI:',
    androidCapacitorTitle: '3. Full Native Android Project (Capacitor / Kotlin)',
    androidCapacitorDesc: 'Convert into an Android Studio Gradle project with native Android SDK access:',
    androidCopyCmd: 'Copy commands',
    copied: 'Copied to clipboard!',
    sim: {
      title: 'Simulation',
      run: 'Run',
      pause: 'Pause',
      step: 'Step',
      reset: 'Reset',
      panel: 'Variables and console',
      stepLabel: 'step',
      ready: 'ready',
      done: 'finished',
      noVars: 'no variables yet',
      noOutput: 'nothing printed yet',
      inputFor: 'value for',
    },
    vjezbe: {
      title: 'Exercises',
      intro: 'Linear structure — 15 tasks',
      progress: 'solved',
      back: 'Back',
      check: 'Check',
      solved: 'solved',
      reward: 'See the flowchart',
      reset: 'Start over',
      pool: 'Tiles',
      answer: 'Your algorithm',
      poolEmpty: 'every tile is placed',
      answerEmpty: 'tap a tile to place it here',
      fill: 'Fill in what is missing.',
      fillAll: 'fill in every blank first',
      predict: 'Read the algorithm and write what it prints.',
      inputLabel: 'Input',
      outputLabel: 'Output',
      noInput: 'no input',
      types: {
        kockice: 'put in order',
        dopuni: 'fill in',
        prepoznaj: 'predict the output',
        greska: 'find the mistake',
        tabela: 'state table',
        samostalno: 'write it yourself',
      },
    },
    close: 'Close',
  },

  de: {
    appName: 'Programmablaufplan & Pseudocode Studio',
    appSubtitle: 'Bidirektionaler Flussdiagramm- & Pseudocode-Editor',
    languageName: 'Deutsch',

    addSymbol: 'SYMBOL HINZUFÜGEN',
    shapes: {
      start_end: 'Start / Ende',
      start_end_desc: 'Anfangs- oder Endpunkt des Ablaufplans',
      io: 'Ein- / Ausgabe',
      io_desc: 'Daten einlesen (Eingabe) oder anzeigen (Ausgabe)',
      process: 'Prozess (Operation)',
      process_desc: 'Berechnung, Zuweisung oder Anweisung',
      decision: 'Bedingung (Verzweigung)',
      decision_desc: 'Entscheidungsraute (JA / NEIN)',
      loop: 'N-mal Wiederholen',
      loop_desc: 'Zählschleife mit verdecktem internen Zähler',
      subprocess: 'Unterprogramm',
      subprocess_desc: 'Vordefinierte Funktion oder Prozedur',
      comment: 'Kommentar (Notiz)',
      comment_desc: 'Erläuterung am Rand (nicht Teil des Kontrollflusses)',
    },
    shapeDefaults: {
      start_end_start: 'start',
      start_end_end: 'ende',
      io: 'eingabe / ausgabe',
      process: 'aktion',
      decision: 'bedingung ?',
      loop: 'wiederhole 3 mal',
      subprocess: 'unterprogramm',
      comment: 'notiz',
    },
    mode: 'BETRIEBSMODUS',
    modeMove: '↕ Verschieben & Text',
    modeConnect: '→ Verbinden',
    zoom: 'ZOOM & ANSICHT',
    zoomIn: '+',
    zoomOut: '–',
    resetView: 'Ansicht zurücksetzen',
    autoLayout: 'Auto-Layout',
    autoLayoutTooltip: 'Ablaufplan automatisch ordnen und sauber ausrichten',
    centerNodes: 'Knoten zentrieren',
    centerNodesTooltip: 'Alle Symbole auf der Arbeitsfläche zentrieren',
    edit: 'BEARBEITEN',
    undo: '↶ Rückgängig',
    redo: '↷ Wiederholen',
    straightenEdge: 'Verbindung begradigen',
    straightenEdgeTooltip: 'Stellt die rechtwinklige Linienführung wieder her',
    deleteSelected: 'Auswahl löschen',
    clearAll: 'Alles löschen',
    textSize: 'TEXTGRÖSSE',
    examples: 'BEISPIELE',
    templates: {
      sequence: 'Lineare Sequenz',
      branch: 'Verzweigung (Wenn/Sonst)',
      while: 'Solange-Schleife',
      repeat: 'Zählschleife (N-mal)',
    },
    file: 'DATEI & EXPORT',
    exportPng: 'Als Bild exportieren (PNG)',
    saveJson: 'Projekt speichern (.json)',
    loadJson: 'Projekt laden (.json)',
    androidPrep: '📱 Android App Setup',
    authorCredit: 'Ursprungskonzept: Dino Isanović',

    viewSplit: 'Geteilte Ansicht',
    viewCanvasOnly: 'Nur Diagramm',
    viewPseudoOnly: 'Nur Code',
    tutorBtn: '🎓 KI-Tutor',
    shortcutsBtn: '⌨️ Tastenkombinationen',
    installBtn: '📲 App installieren',
    fullscreen: '⛶ Vollbild',

    pseudocodeHeader: 'Pseudocode',
    keywordsToggle: 'Schlüsselwörter-Übersicht',
    keywordsLegend: {
      input: 'EINGABE a, b — Daten einlesen',
      output: 'AUSGABE x — Ergebnis anzeigen',
      assign: 'SETZE i = 1 — Variablenzuweisung',
      calc: 'BERECHNE summe = a + b — Mathematische Berechnung',
      ifThen: 'WENN bedingung -> JA -> Schritte falls wahr',
      ifElse: 'NEIN (oder SONST) -> Schritte falls falsch',
      elseIf: 'SONST WENN bedingung — weiterer Prüfschritt',
      repeatCount: 'WIEDERHOLE 5 MAL — Schleife mit Zähler',
      whileLoop: 'WIEDERHOLE SOLANGE bedingung (oder SOLANGE)',
      repeatUntil: 'WIEDERHOLE ... BIS bedingung (fußgesteuert)',
      startEnd: 'START / ENDE — optionaler Algorithmusrahmen',
      indentNotice: 'Blöcke werden durch Einrückung geschlossen (wie in Python).',
      tipTab: 'Tippe Anfangsbuchstaben und drücke Tab zur Vervollständigung.',
    },
    pseudoPlaceholder: 'z.B.\nEINGABE a, b\nWENN a > b\n  JA\n    AUSGABE a\n  NEIN\n    AUSGABE b',
    generateDiagram: 'Diagramm generieren',
    generatePseudo: 'Pseudocode aus Diagramm generieren',
    errorHeader: 'Pseudocode fehlerhaft; Diagramm wurde nicht verändert:',
    warningHeader: 'Diagramm gezeichnet, aber sieh dir das an:',
    autocompleteTip: 'Tab — Übernehmen • ↑ ↓ dann Enter — Wählen • Esc — Schließen',

    hintMove: 'Modus: Verschieben — Symbol ziehen, Doppelklick für Text; Kante wählen und Griff ziehen für Winkel',
    hintConnect: 'Modus: Verbinden — Erstes und dann zweites Symbol anklicken, um Pfeil zu ziehen',
    hintCommentBlocked: 'Kommentare sind reine Randnotizen und können nicht mit Pfeilen verbunden werden.',

    edgeLabelPrompt: 'Pfeilbeschriftung (z.B. ja / nein):',
    yesLabel: 'ja',
    noLabel: 'nein',
    elseLabelFull: 'NEIN (SONST)',

    confirmGenerate: 'Dadurch wird das aktuelle Diagramm durch den Pseudocode ersetzt. Fortfahren?',
    confirmReverse: 'Dadurch wird der Pseudocode durch das aktuelle Diagramm ersetzt. Fortfahren?',
    confirmClear: 'Alle Symbole und Verbindungen vom Zeichenblatt löschen?',
    confirmTemplate: 'Dadurch wird das aktuelle Diagramm durch das ausgewählte Beispiel ersetzt. Fortfahren?',
    emptyCanvasAlert: 'Das Zeichenblatt ist leer — es gibt kein Diagramm zum Umwandeln.',
    invalidJsonAlert: 'Projektdatei konnte nicht geladen werden: ',

    tutorTitle: '🎓 KI-Informatik-Tutor',
    tutorNewChat: 'Neues Gespräch',
    tutorApiKeyLabel: 'Gemini API-Schlüssel (kostenlos auf aistudio.google.com):',
    tutorApiKeyPlaceholder: 'API-Schlüssel hier einfügen',
    tutorKeyHint: 'Der Schlüssel bleibt nur in dieser Sitzung und geht direkt an Google.',
    tutorModelLabel: 'Modell',
    tutorPlaceholder: 'Stelle eine Frage zu deinem Diagramm oder Pseudocode...',
    tutorSend: 'Senden',
    tutorThinking: 'Tutor denkt nach...',
    tutorNeedKey: 'Bitte gib zuerst deinen Gemini API-Schlüssel oben ein (kostenlos auf aistudio.google.com).',
    tutorError: 'Fehler von der Gemini API: ',
    tutorEmptyReply: 'Leere Antwort vom Tutor. Bitte versuche es erneut.',

    androidModalTitle: 'Android App Bereitstellung',
    androidSubtitle: 'Erstelle eine vollwertige Android-App (.apk / .aab) oder installiere die PWA',
    androidPwaTitle: '1. Progressive Web App (PWA) / Sofortige Mobile Installation',
    androidPwaDesc: 'Die App ist vollständig PWA-optimiert mit Offline-Service-Worker, Web-App-Manifest und Touch-Gesten.',
    androidPwaStep1: 'Öffne diese Web-URL in Google Chrome auf deinem Android-Smartphone oder Tablet.',
    androidPwaStep2: 'Tippe in der oberen Leiste auf "App installieren" oder im Chrome-Menü auf "Zum Startbildschirm hinzufügen". Die App startet nativ im Vollbildmodus und funktioniert offline.',
    androidTwaTitle: '2. Google Play Store APK / AAB (Bubblewrap TWA)',
    androidTwaDesc: 'Paketiere die Web-App über das offizielle Google Bubblewrap-Tool in ein Android-Projekt für den Play Store:',
    androidCapacitorTitle: '3. Vollständiges natives Android-Studio-Projekt (Capacitor)',
    androidCapacitorDesc: 'In ein natives Android-Studio Gradle-Projekt umwandeln:',
    androidCopyCmd: 'Befehle kopieren',
    copied: 'In die Zwischenablage kopiert!',
    sim: {
      title: 'Simulation',
      run: 'Start',
      pause: 'Pause',
      step: 'Schritt',
      reset: 'Zurücksetzen',
      panel: 'Variablen und Konsole',
      stepLabel: 'Schritt',
      ready: 'bereit',
      done: 'fertig',
      noVars: 'noch keine Variablen',
      noOutput: 'noch keine Ausgabe',
      inputFor: 'Wert für',
    },
    vjezbe: {
      title: 'Übungen',
      intro: 'Lineare Struktur — 15 Aufgaben',
      progress: 'gelöst',
      back: 'Zurück',
      check: 'Prüfen',
      solved: 'gelöst',
      reward: 'Diagramm ansehen',
      reset: 'Von vorn',
      pool: 'Bausteine',
      answer: 'Dein Algorithmus',
      poolEmpty: 'alle Bausteine sind gesetzt',
      answerEmpty: 'tippe einen Baustein an, um ihn hier abzulegen',
      fill: 'Ergänze, was fehlt.',
      fillAll: 'fülle zuerst alle Lücken aus',
      predict: 'Lies den Algorithmus und schreibe auf, was er ausgibt.',
      inputLabel: 'Eingabe',
      outputLabel: 'Ausgabe',
      noInput: 'keine Eingabe',
      types: {
        kockice: 'ordnen',
        dopuni: 'ergänzen',
        prepoznaj: 'Ausgabe vorhersagen',
        greska: 'Fehler finden',
        tabela: 'Wertetabelle',
        samostalno: 'selbst schreiben',
      },
    },
    close: 'Schließen',
  },

  bs: {
    appName: 'Pseudokod i dijagram toka',
    appSubtitle: 'Dvosmjerni generator dijagrama toka i pseudokoda',
    languageName: 'Bosanski',

    addSymbol: 'DODAJ SIMBOL',
    shapes: {
      start_end: 'Početak / kraj',
      start_end_desc: 'Početak ili kraj algoritma (elipsa)',
      io: 'Ulaz / izlaz',
      io_desc: 'Unos podataka ili ispis rezultata (paralelogram)',
      process: 'Proces',
      process_desc: 'Dodjela vrijednosti ili računanje (pravougaonik)',
      decision: 'Uslov (grananje)',
      decision_desc: 'Ispitivanje uslova (romb sa granama DA / NE)',
      loop: 'Ponovi N puta',
      loop_desc: 'Petlja sa skrivenim brojačem (šesterougao)',
      subprocess: 'Potprocedura',
      subprocess_desc: 'Poziv unaprijed definisane potprocedure',
      comment: 'Komentar',
      comment_desc: 'Tekstualna napomena pored dijagrama (nije dio toka)',
    },
    shapeDefaults: {
      start_end_start: 'početak',
      start_end_end: 'kraj',
      io: 'ulaz / izlaz',
      process: 'radnja',
      decision: 'uslov ?',
      loop: 'ponovi 3 puta',
      subprocess: 'potprocedura',
      comment: 'napomena',
    },
    mode: 'NAČIN RADA',
    modeMove: '↕ Pomjeranje',
    modeConnect: '→ Povezivanje',
    zoom: 'ZUM',
    zoomIn: '+',
    zoomOut: '–',
    resetView: 'Resetuj prikaz',
    autoLayout: 'Auto-raspored',
    autoLayoutTooltip: 'Automatski uredno posloži i poravnaj sve blokove dijagrama',
    centerNodes: 'Centriraj blokove',
    centerNodesTooltip: 'Centriraj sve blokove na radnoj površini uz očuvanje rasporeda',
    edit: 'UREDI',
    undo: '↶ Poništi',
    redo: '↷ Vrati',
    straightenEdge: 'Ispravi vezu',
    straightenEdgeTooltip: 'Vraća automatsku putanju pod pravim uglovima',
    deleteSelected: 'Obriši odabrano',
    clearAll: 'Očisti sve',
    textSize: 'VELIČINA TEKSTA',
    examples: 'PRIMJERI',
    templates: {
      sequence: 'Redoslijed',
      branch: 'Grananje (ako/inače)',
      while: 'Petlja (dok)',
      repeat: 'Ponavljanje (N puta)',
    },
    file: 'FAJL I IZVOZ',
    exportPng: 'Izvezi kao sliku (PNG)',
    saveJson: 'Sačuvaj (.json)',
    loadJson: 'Učitaj (.json)',
    androidPrep: '📱 Android priprema',
    authorCredit: 'Autor: Dino Isanović',

    viewSplit: 'Podijeljen prikaz',
    viewCanvasOnly: 'Samo platno',
    viewPseudoOnly: 'Samo kod',
    tutorBtn: '🎓 AI Tutor',
    shortcutsBtn: '⌨️ Prečice',
    installBtn: '📲 Instaliraj aplikaciju',
    fullscreen: '⛶ Preko cijelog ekrana',

    pseudocodeHeader: 'Pseudokod',
    keywordsToggle: 'Ključne riječi',
    keywordsLegend: {
      input: 'UNESI a, b — ulaz',
      output: 'ISPIŠI x — izlaz',
      assign: 'POSTAVI i = 1 — dodjela',
      calc: 'RAČUNAJ zbir = a + b — izračun',
      ifThen: 'AKO JE uslov -> DA -> koraci kad uslov vrijedi',
      ifElse: 'NE (ili INAČE) -> koraci kad ne vrijedi',
      elseIf: 'INAČE AKO JE uslov — dodatni uslov umjesto NE',
      repeatCount: 'PONOVI 5 PUTA — ponavlja tačno toliko puta',
      whileLoop: 'PONOVI DOK JE uslov — ponavlja dok uslov vrijedi',
      repeatUntil: 'PONAVLJAJ ... DOK JE uslov (ispituje na dnu)',
      startEnd: 'POČETAK / KRAJ — opciono na početku/kraju',
      indentNotice: 'Blok se zatvara uvlačenjem (vraćanjem ulijevo, kao u Pythonu).',
      tipTab: 'Otkucaj prvo slovo pa Tab za automatsku dopunu.',
    },
    pseudoPlaceholder: 'npr.\nUNESI a, b\nAKO JE a > b\n  DA\n    ISPIŠI a\n  NE\n    ISPIŠI b',
    generateDiagram: 'Generiši dijagram',
    generatePseudo: 'Generiši pseudokod od dijagrama',
    errorHeader: 'Pseudokod nije razumljiv, dijagram nije promijenjen:',
    warningHeader: 'Dijagram je nacrtan, ali provjeri ovo:',
    autocompleteTip: 'Tab — dopuni • ↑ ↓ pa Enter — izaberi • Esc — sakrij',

    hintMove: 'Način: pomjeranje — prevuci simbol, dvoklik za tekst; klikni vezu pa prevuci kvadratić da pomjeriš liniju',
    hintConnect: 'Način: povezivanje — klikni prvi pa drugi simbol da nacrtaš strelicu',
    hintCommentBlocked: 'Komentar nije dio toka - na njega se ne crtaju strelice.',

    edgeLabelPrompt: 'Natpis na strelici (npr. da / ne):',
    yesLabel: 'da',
    noLabel: 'ne',
    elseLabelFull: 'NE (INAČE)',

    confirmGenerate: 'Ovo će zamijeniti trenutni dijagram dijagramom generisanim iz pseudokoda. Nastaviti?',
    confirmReverse: 'Ovo će zamijeniti tekst u polju za pseudokod. Nastaviti?',
    confirmClear: 'Obrisati sav sadržaj dijagrama?',
    confirmTemplate: 'Ovo će zamijeniti trenutni dijagram primjerom. Nastaviti?',
    emptyCanvasAlert: 'Platno je prazno - nema šta da se pretvori u pseudokod.',
    invalidJsonAlert: 'Fajl nije moguće učitati: ',

    tutorTitle: '🎓 AI Tutor',
    tutorNewChat: 'Novi razgovor',
    tutorApiKeyLabel: 'Gemini API ključ (besplatan na aistudio.google.com):',
    tutorApiKeyPlaceholder: 'Zalijepi svoj ključ ovdje',
    tutorKeyHint: 'Ključ se čuva samo dok je stranica otvorena - odlazi direktno Google-u.',
    tutorModelLabel: 'Model',
    tutorPlaceholder: 'Pitaj nešto o svom dijagramu ili pseudokodu...',
    tutorSend: 'Pošalji',
    tutorThinking: 'Tutor razmišlja …',
    tutorNeedKey: 'Prvo unesi svoj Gemini API ključ iznad (besplatan na aistudio.google.com).',
    tutorError: 'Greška od Gemini API-ja: ',
    tutorEmptyReply: 'Prazan odgovor od tutora. Pokušaj ponovo.',

    androidModalTitle: 'Priprema za Android aplikaciju',
    androidSubtitle: 'Izgradi pravu Android aplikaciju (.apk / .aab) ili instaliraj PWA',
    androidPwaTitle: '1. PWA instalacija na Android uređaj (brzo i bez kompajliranja)',
    androidPwaDesc: 'Aplikacija u potpunosti podržava PWA standard: offline rad preko service workera, web app manifest, dodir i pune ekranske dimenzije.',
    androidPwaStep1: 'Otvori aplikaciju u Google Chrome pregledniku na svom Android telefonu ili tabletu.',
    androidPwaStep2: 'Klikni dugme "Instaliraj aplikaciju" u gornjoj traci ili u meniju Chrome-a izaberi "Dodaj na početni ekran" (Add to Home screen). Aplikacija se instalira kao prava nativna aplikacija sa ikonicom i radi offline.',
    androidTwaTitle: '2. Google Play Store APK / AAB paket (Bubblewrap / TWA)',
    androidTwaDesc: 'Zapakuj aplikaciju u standardni Android APK ili Google Play AAB paket preko zvaničnog Google Bubblewrap alata:',
    androidCapacitorTitle: '3. Nativni Android Studio projekat (Capacitor)',
    androidCapacitorDesc: 'Pretvori u puni Android Studio projekat sa Gradle konfiguracijom:',
    androidCopyCmd: 'Kopiraj komande',
    copied: 'Kopirano u međuspremnik!',
    sim: {
      title: 'Simulacija',
      run: 'Pokreni',
      pause: 'Pauza',
      step: 'Korak',
      reset: 'Ispočetka',
      panel: 'Varijable i konzola',
      stepLabel: 'korak',
      ready: 'spremno',
      done: 'gotovo',
      noVars: 'još nema varijabli',
      noOutput: 'još nema ispisa',
      inputFor: 'vrijednost za',
    },
    vjezbe: {
      title: 'Vježbe',
      intro: 'Linijska struktura — 15 zadataka',
      progress: 'riješeno',
      back: 'Nazad',
      check: 'Provjeri',
      solved: 'riješeno',
      reward: 'Pogledaj dijagram',
      reset: 'Ispočetka',
      pool: 'Kockice',
      answer: 'Tvoj algoritam',
      poolEmpty: 'sve kockice su postavljene',
      answerEmpty: 'dodirni kockicu da je postaviš ovdje',
      fill: 'Upiši ono što nedostaje.',
      fillAll: 'prvo popuni sve praznine',
      predict: 'Pročitaj algoritam i upiši šta ispisuje.',
      inputLabel: 'Ulaz',
      outputLabel: 'Ispis',
      noInput: 'bez unosa',
      types: {
        kockice: 'složi kockice',
        dopuni: 'dopuni',
        prepoznaj: 'predvidi ispis',
        greska: 'pronađi grešku',
        tabela: 'tabela stanja',
        samostalno: 'napiši sam',
      },
    },
    close: 'Zatvori',
  },
};
