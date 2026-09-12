/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Language, SourceLang } from '../types';
import { toCroatian } from './croatian';

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
  exportSvg: string;
  saveJson: string;
  loadJson: string;
  authorCredit: string;

  // Header & View
  viewSplit: string;
  viewCanvasOnly: string;
  viewPseudoOnly: string;
  tutorBtn: string;
  shortcutsBtn: string;
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
  // Offline diagnostics
  diag: {
    tab: string;
    title: string;
    note: string;
    empty: string;
    clean: string;
    line: string;
  };
  // Handing work in
  predaja: {
    send: string;
    title: string;
    who: string;
    first: string;
    last: string;
    klasa: string;
    group: string;
    number: string;
    workTitle: string;
    workTitlePlaceholder: string;
    copyAndOpen: string;
    copyOnly: string;
    saveFile: string;
    copied: string;
    pasteThere: string;
    prefilled: string;
    noForm: string;
    needName: string;
    tooBig: string;
    configured: string;
    review: string;
    paste: string;
    pasteHint: string;
    found: string;
    correctN: string;
    none: string;
    earlier: string;
    broken: string;
    notIntact: string;
    open: string;
    noTask: string;
    form: string;
    formHow: string;
    formUrl: string;
    formOk: string;
    formBad: string;
    formNoFields: string;
    formNoPayload: string;
    classLink: string;
    classLinkHint: string;
    forget: string;
    sendNow: string;
    sending: string;
    sendHow: string;
    openForm: string;
    recorded: string;
    refused: string;
    failed: string;
    formReading: string;
    formLearned: string;
    formBlocking: string;
    formShortBox: string;
    formPlainNeedsDesktop: string;
    formAny: string;
    changeForm: string;
    pupilCode: string;
    pupilHint: string;
    clashCodes: string;
    clashNames: string;
    noCode: string;
  };
  // Exercises
  vjezbe: {
    title: string;
    /** Follows the chosen topic: "<title> — N tasks". */
    tasks: string;
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
    placeAll: string;
    hint: string;
    trace: string;
    traceStep: string;
    traceCond: string;
    traceCondHint: string;
    findMistake: string;
    wrongPick: string;
    findCodeMistake: string;
    wrongLine: string;
    shouldRead: string;
    /** Reads as one sentence: "<for> 12, 5 <prints> X <instead of> Y". */
    proofFor: string;
    proofPrints: string;
    proofShould: string;
    predict: string;
    write: string;
    writeNote: string;
    writeAll: string;
    writeTests: string;
    draw: string;
    drawNote: string;
    drawAll: string;
    inputLabel: string;
    outputLabel: string;
    noInput: string;
    types: Record<string, string>;
  };
  close: string;
}

const SOURCE: Record<SourceLang, Translations> = {
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
    exportSvg: 'Export as Vector (SVG)',
    saveJson: 'Save Project (.json)',
    loadJson: 'Load Project (.json)',
    authorCredit: 'Original concept: Dino Isanović',

    viewSplit: 'Split View',
    viewCanvasOnly: 'Canvas Only',
    viewPseudoOnly: 'Code Only',
    tutorBtn: '🎓 AI Tutor',
    shortcutsBtn: '⌨️ Shortcuts',
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
    diag: {
      tab: 'Check',
      title: 'Program check',
      note: 'Offline: the program is read line by line and then run on a few sample values.',
      empty: 'Write a program and it will be checked here.',
      clean: 'Nothing to report — the program was read and run on sample values.',
      line: 'line',
    },
    predaja: {
      send: 'Hand in',
      title: 'Handing in',
      who: 'Who is handing in',
      first: 'First name',
      last: 'Last name',
      klasa: 'Class',
      group: 'Group',
      number: 'No. in register',
      workTitle: 'What is this?',
      workTitlePlaceholder: 'e.g. Task 3 from the board',
      copyAndOpen: 'Copy and open the form',
      copyOnly: 'Copy only',
      saveFile: 'Save as a file',
      copied: 'The submission is on the clipboard.',
      pasteThere: 'In the form, paste it into the task box (Ctrl+V), then send.',
      prefilled: 'The answer is already filled in — check it and press Send.',
      noForm: 'No hand-in form is set up yet. Copy the text or save the file and hand it over the way your teacher asked.',
      needName: 'Write your first and last name.',
      tooBig: 'This submission is long for a form box — save it as a file instead.',
      configured: 'The hand-in form is set up.',
      review: 'Submissions',
      paste: 'Paste the submissions',
      pasteHint: 'Copy the column out of the spreadsheet — or the whole sheet — and paste it here. Everything else in the paste is passed over.',
      found: 'submissions',
      correctN: 'correct',
      none: 'No submission found in what was pasted.',
      earlier: 'earlier versions',
      broken: 'unreadable',
      notIntact: 'the text does not match its own check code — it may have been cut short',
      open: 'Open on the canvas',
      noTask: 'free work — not marked',
      form: 'Hand-in form',
      formHow: 'Make a form with boxes for first name, last name, class and the task, plus a long-answer box for the answer. Fill each box with the word for it — FIRST, LAST, CLASS, GROUP, NUMBER, TASK, CODE or PIN for each pupil\u2019s own code, and TASK CODE for the check code — then copy its pre-filled link and paste it below. The task box must be the long-answer kind: a short one is where an answer gets cut.',
      formUrl: 'Pre-filled link to the form',
      formOk: 'Form set up:',
      formBad: 'That is not a usable link.',
      formNoFields: 'No box in that link carries one of the words above.',
      formNoPayload: 'No box for the answer was recognised, so it will be pasted by hand.',
      classLink: 'Link for the class',
      classLinkHint: 'Give this to the students: opening it once sets the form up in their app.',
      forget: 'Forget this form',
      sendNow: 'Hand it in',
      sending: 'Sending…',
      sendHow: 'One press hands it in. The form\u2019s own answer appears below — read it before you leave.',
      openForm: 'Open the form',
      recorded: 'Recorded by the form.',
      refused: 'The form refused it. Not filled in:',
      failed: 'The form could not be reached — check the network.',
      formReading: 'Reading the form…',
      formLearned: 'Read from the form itself:',
      formBlocking: 'These questions are required and the app cannot fill them, so every submission would be refused:',
      formShortBox: 'The answer box is a short one — a submission would be cut. Make it a long-answer question.',
      formPlainNeedsDesktop: 'A plain form link can only be read by the desktop app. In a browser, paste the pre-filled link.',
      formAny: 'Link to the form',
      changeForm: 'another form',
      pupilCode: 'Your code',
      pupilHint: 'The code your teacher gave you. It is how they know the work is yours.',
      clashCodes: 'this name hands in under two different codes',
      clashNames: 'this code stands beside another name too',
      noCode: 'no code',
    },
    vjezbe: {
      title: 'Exercises',
      tasks: 'tasks',
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
      placeAll: 'place every tile first',
      hint: 'Help',
      trace: 'Follow the run and fill in the state table.',
      traceStep: 'step',
      traceCond: 'condition',
      traceCondHint: 'For every condition write yes or no — the branch the program took.',
      findMistake: 'One symbol in this diagram is wrong. Tap it.',
      wrongPick: 'that symbol is fine — look again',
      findCodeMistake: 'One line of this algorithm is wrong. Tap it.',
      wrongLine: 'that line is fine — look again',
      shouldRead: 'It should read:',
      proofFor: 'For',
      proofPrints: 'it prints',
      proofShould: 'instead of',
      predict: 'Read the algorithm and write what it prints.',
      write: 'Write the algorithm yourself, then check it.',
      writeNote: 'The wording is yours to choose — what is checked is what the program works out for each input.',
      writeAll: 'Write the algorithm first.',
      writeTests: 'Checked with:',
      draw: 'Draw the flowchart yourself, then check it.',
      drawNote: 'Add a symbol, drag it into place, then switch to Connect and tap two shapes to draw an arrow. Double click a shape to write in it.',
      drawAll: 'Draw the algorithm first.',
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
        nacrtaj: 'draw it yourself',
        'dijagram-greska': 'mistake in the diagram',
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
    exportSvg: 'Als Vektor exportieren (SVG)',
    saveJson: 'Projekt speichern (.json)',
    loadJson: 'Projekt laden (.json)',
    authorCredit: 'Ursprungskonzept: Dino Isanović',

    viewSplit: 'Geteilte Ansicht',
    viewCanvasOnly: 'Nur Diagramm',
    viewPseudoOnly: 'Nur Code',
    tutorBtn: '🎓 KI-Tutor',
    shortcutsBtn: '⌨️ Tastenkombinationen',
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
    diag: {
      tab: 'Prüfung',
      title: 'Programmprüfung',
      note: 'Ohne Internet: das Programm wird Zeile für Zeile gelesen und dann mit einigen Probewerten ausgeführt.',
      empty: 'Schreibe ein Programm, dann wird es hier geprüft.',
      clean: 'Nichts zu beanstanden — das Programm wurde gelesen und mit Probewerten ausgeführt.',
      line: 'Zeile',
    },
    predaja: {
      send: 'Abgeben',
      title: 'Abgabe',
      who: 'Wer gibt ab',
      first: 'Vorname',
      last: 'Nachname',
      klasa: 'Klasse',
      group: 'Gruppe',
      number: 'Nr. im Klassenbuch',
      workTitle: 'Worum geht es?',
      workTitlePlaceholder: 'z. B. Aufgabe 3 von der Tafel',
      copyAndOpen: 'Kopieren und Formular öffnen',
      copyOnly: 'Nur kopieren',
      saveFile: 'Als Datei speichern',
      copied: 'Die Abgabe liegt in der Zwischenablage.',
      pasteThere: 'Im Formular in das Aufgabenfeld einfügen (Strg+V) und absenden.',
      prefilled: 'Die Antwort steht schon im Formular — prüfen und absenden.',
      noForm: 'Es ist noch kein Abgabeformular eingerichtet. Kopiere den Text oder speichere die Datei und gib sie so ab, wie deine Lehrkraft es gesagt hat.',
      needName: 'Schreibe deinen Vor- und Nachnamen.',
      tooBig: 'Diese Abgabe ist lang für ein Formularfeld — speichere sie lieber als Datei.',
      configured: 'Das Abgabeformular ist eingerichtet.',
      review: 'Abgaben',
      paste: 'Abgaben einfügen',
      pasteHint: 'Kopiere die Spalte aus der Tabelle — oder das ganze Blatt — und füge sie hier ein. Alles andere darin wird übergangen.',
      found: 'Abgaben',
      correctN: 'richtig',
      none: 'Im eingefügten Text steht keine Abgabe.',
      earlier: 'frühere Fassungen',
      broken: 'unlesbar',
      notIntact: 'der Text passt nicht zu seinem Prüfcode — er wurde vielleicht abgeschnitten',
      open: 'Auf der Zeichenfläche öffnen',
      noTask: 'freie Arbeit — nicht bewertet',
      form: 'Abgabeformular',
      formHow: 'Lege ein Formular mit Feldern für Vorname, Nachname, Klasse und Aufgabe an, dazu ein Feld für eine lange Antwort. Trage in jedes Feld das Wort dafür ein — VORNAME, NACHNAME, KLASSE, GRUPPE, NUMMER, AUFGABE, CODE oder PIN für die eigene Kennung, und PRÜFCODE für den Prüfcode — kopiere dann den vorausgefüllten Link und füge ihn unten ein. Das Aufgabenfeld muss das lange sein: im kurzen wird eine Antwort abgeschnitten.',
      formUrl: 'Vorausgefüllter Link zum Formular',
      formOk: 'Formular eingerichtet:',
      formBad: 'Das ist kein brauchbarer Link.',
      formNoFields: 'Kein Feld in diesem Link trägt eines der Wörter oben.',
      formNoPayload: 'Für die Antwort wurde kein Feld erkannt, sie wird also von Hand eingefügt.',
      classLink: 'Link für die Klasse',
      classLinkHint: 'Gib diesen an die Klasse: einmal öffnen richtet das Formular in ihrer App ein.',
      forget: 'Formular vergessen',
      sendNow: 'Abgeben',
      sending: 'Wird gesendet…',
      sendHow: 'Ein Druck gibt ab. Die Antwort des Formulars erscheint unten — lies sie, bevor du weggehst.',
      openForm: 'Formular öffnen',
      recorded: 'Vom Formular aufgezeichnet.',
      refused: 'Das Formular hat abgelehnt. Nicht ausgefüllt:',
      failed: 'Das Formular war nicht erreichbar — prüfe die Verbindung.',
      formReading: 'Formular wird gelesen…',
      formLearned: 'Aus dem Formular selbst gelesen:',
      formBlocking: 'Diese Fragen sind Pflicht und die App kann sie nicht ausfüllen — jede Abgabe würde abgelehnt:',
      formShortBox: 'Das Antwortfeld ist ein kurzes — eine Abgabe würde abgeschnitten. Mach eine Frage mit langer Antwort daraus.',
      formPlainNeedsDesktop: 'Einen einfachen Formularlink kann nur die Desktop-App lesen. Im Browser den vorausgefüllten Link einfügen.',
      formAny: 'Link zum Formular',
      changeForm: 'anderes Formular',
      pupilCode: 'Deine Kennung',
      pupilHint: 'Die Kennung von deiner Lehrkraft. Daran erkennt sie, dass die Arbeit von dir ist.',
      clashCodes: 'dieser Name gibt unter zwei verschiedenen Kennungen ab',
      clashNames: 'diese Kennung steht auch neben einem anderen Namen',
      noCode: 'ohne Kennung',
    },
    vjezbe: {
      title: 'Übungen',
      tasks: 'Aufgaben',
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
      placeAll: 'lege zuerst alle Kärtchen ab',
      hint: 'Hilfe',
      trace: 'Verfolge den Ablauf und fülle die Wertetabelle aus.',
      traceStep: 'Schritt',
      traceCond: 'Bedingung',
      traceCondHint: 'Schreibe bei jeder Bedingung ja oder nein — den Zweig, den das Programm genommen hat.',
      findMistake: 'Ein Symbol in diesem Diagramm ist falsch. Tippe es an.',
      wrongPick: 'dieses Symbol ist in Ordnung — schau noch einmal',
      findCodeMistake: 'Eine Zeile dieses Algorithmus ist falsch. Tippe sie an.',
      wrongLine: 'diese Zeile ist in Ordnung — schau noch einmal',
      shouldRead: 'Richtig wäre:',
      proofFor: 'Für',
      proofPrints: 'gibt er aus',
      proofShould: 'statt',
      predict: 'Lies den Algorithmus und schreibe auf, was er ausgibt.',
      write: 'Schreibe den Algorithmus selbst und prüfe ihn dann.',
      writeNote: 'Die Formulierung wählst du selbst — geprüft wird, was das Programm für jede Eingabe herausbekommt.',
      writeAll: 'Schreibe zuerst den Algorithmus.',
      writeTests: 'Geprüft mit:',
      draw: 'Zeichne das Flussdiagramm selbst und prüfe es dann.',
      drawNote: 'Symbol hinzufügen, an seinen Platz ziehen, dann auf Verbinden umschalten und zwei Symbole antippen — das ergibt einen Pfeil. Doppelklick auf ein Symbol, um hineinzuschreiben.',
      drawAll: 'Zeichne zuerst den Algorithmus.',
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
        nacrtaj: 'selbst zeichnen',
        'dijagram-greska': 'Fehler im Diagramm',
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
    exportSvg: 'Izvezi kao vektor (SVG)',
    saveJson: 'Sačuvaj (.json)',
    loadJson: 'Učitaj (.json)',
    authorCredit: 'Autor: Dino Isanović',

    viewSplit: 'Podijeljen prikaz',
    viewCanvasOnly: 'Samo platno',
    viewPseudoOnly: 'Samo kod',
    tutorBtn: '🎓 AI Tutor',
    shortcutsBtn: '⌨️ Prečice',
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
    diag: {
      tab: 'Provjera',
      title: 'Provjera programa',
      note: 'Radi bez interneta: program se pročita red po red, pa pokrene na nekoliko probnih vrijednosti.',
      empty: 'Napiši program pa će ovdje biti provjeren.',
      clean: 'Nema primjedbi — program je pročitan i pokrenut na probnim vrijednostima.',
      line: 'red',
    },
    predaja: {
      send: 'Pošalji zadatak',
      title: 'Predaja zadatka',
      who: 'Ko predaje',
      first: 'Ime',
      last: 'Prezime',
      klasa: 'Odjeljenje',
      group: 'Grupa',
      number: 'Broj u dnevniku',
      workTitle: 'Šta je ovo?',
      workTitlePlaceholder: 'npr. Zadatak 3 s table',
      copyAndOpen: 'Kopiraj i otvori formu',
      copyOnly: 'Samo kopiraj',
      saveFile: 'Sačuvaj kao datoteku',
      copied: 'Predaja je u međuspremniku.',
      pasteThere: 'U formi zalijepi u polje za zadatak (Ctrl+V) pa pošalji.',
      prefilled: 'Odgovor je već upisan u formu — pogledaj i pošalji.',
      noForm: 'Forma za predaju još nije podešena. Kopiraj tekst ili sačuvaj datoteku pa predaj kako je nastavnik rekao.',
      needName: 'Upiši svoje ime i prezime.',
      tooBig: 'Ova predaja je dugačka za polje forme — radije je sačuvaj kao datoteku.',
      configured: 'Forma za predaju je podešena.',
      review: 'Pregled predaja',
      paste: 'Zalijepi predaje',
      pasteHint: 'Kopiraj kolonu iz tabele — ili cijeli list — i zalijepi ovdje. Sve ostalo iz tog teksta se preskače.',
      found: 'predaja',
      correctN: 'tačno',
      none: 'U zalijepljenom tekstu nema nijedne predaje.',
      earlier: 'ranijih verzija',
      broken: 'nečitljivih',
      notIntact: 'tekst se ne slaže sa svojim kontrolnim kodom — možda je odsječen',
      open: 'Otvori na platnu',
      noTask: 'slobodan rad — bez ocjene',
      form: 'Forma za predaju',
      formHow: 'Napravi formu s poljima za ime, prezime, odjeljenje i zadatak, uz jedno polje za dugi odgovor. U svako polje upiši riječ za njega — IME, PREZIME, ODJELJENJE, GRUPA, BROJ, ZADATAK, KOD ili ŠIFRA za šifru učenika, i KOD ZADATKA za kontrolni kod — pa kopiraj njenu „pre-filled" vezu i zalijepi je ispod. Polje za zadatak mora biti ono za dugi odgovor: u kratkom se odgovor odsiječe.',
      formUrl: 'Unaprijed popunjena veza do forme',
      formOk: 'Forma je podešena:',
      formBad: 'Ovo nije upotrebljiva veza.',
      formNoFields: 'Nijedno polje u toj vezi ne nosi neku od riječi iznad.',
      formNoPayload: 'Polje za odgovor nije prepoznato, pa će se lijepiti ručno.',
      classLink: 'Veza za razred',
      classLinkHint: 'Ovo daj učenicima: kad je jednom otvore, forma se podesi u njihovoj aplikaciji.',
      forget: 'Zaboravi ovu formu',
      sendNow: 'Pošalji',
      sending: 'Šaljem…',
      sendHow: 'Jedan pritisak i predaja je poslana. Odgovor same forme pojavi se ispod — pročitaj ga prije nego odeš.',
      openForm: 'Otvori formu',
      recorded: 'Forma je zabilježila predaju.',
      refused: 'Forma je odbila predaju. Nije popunjeno:',
      failed: 'Ne mogu doći do forme — provjeri vezu.',
      formReading: 'Čitam formu…',
      formLearned: 'Pročitano iz same forme:',
      formBlocking: 'Ova pitanja su obavezna, a aplikacija ih ne popunjava — svaka predaja bi bila odbijena:',
      formShortBox: 'Polje za zadatak je kratko — predaja bi bila odsječena. Napravi ga pitanjem s dugim odgovorom.',
      formPlainNeedsDesktop: 'Običnu vezu na formu može pročitati samo desktop verzija. U pregledniku zalijepi „pre-filled" vezu.',
      formAny: 'Veza na formu',
      changeForm: 'druga forma',
      pupilCode: 'Tvoja šifra',
      pupilHint: 'Šifru ti je dao nastavnik. Po njoj zna da je rad tvoj.',
      clashCodes: 'isto ime predaje pod dvije različite šifre',
      clashNames: 'ista šifra stoji i uz drugo ime',
      noCode: 'bez šifre',
    },
    vjezbe: {
      title: 'Vježbe',
      tasks: 'zadataka',
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
      placeAll: 'prvo postavi sve kockice',
      hint: 'Pomoć',
      trace: 'Prati izvršavanje i popuni tabelu stanja.',
      traceStep: 'korak',
      traceCond: 'uslov',
      traceCondHint: 'Za svaki uslov upiši DA ili NE — granu kojom je program prošao.',
      findMistake: 'Jedan simbol na ovom dijagramu nije u redu. Dodirni ga.',
      wrongPick: 'taj simbol je u redu — pogledaj ponovo',
      findCodeMistake: 'Jedna linija ovog algoritma nije u redu. Dodirni je.',
      wrongLine: 'ta linija je u redu — pogledaj ponovo',
      shouldRead: 'Treba pisati:',
      proofFor: 'Za',
      proofPrints: 'ispisuje',
      proofShould: 'umjesto',
      predict: 'Pročitaj algoritam i upiši šta ispisuje.',
      write: 'Napiši algoritam sam, pa ga provjeri.',
      writeNote: 'Riječi u ispisu biraš sam — provjerava se šta program izračuna za svaki ulaz.',
      writeAll: 'Prvo napiši algoritam.',
      writeTests: 'Provjerava se za:',
      draw: 'Nacrtaj dijagram toka sam, pa ga provjeri.',
      drawNote: 'Dodaj simbol, prevuci ga na mjesto, pa pređi na Povezivanje i dodirni dva bloka — to je strelica. Dvoklik na blok da upišeš tekst.',
      drawAll: 'Prvo nacrtaj algoritam.',
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
        nacrtaj: 'nacrtaj sam',
        'dijagram-greska': 'greška u dijagramu',
      },
    },
    close: 'Zatvori',
  },
};

/**
 * Every string of a translation, read the Croatian way. The table is nested a
 * few levels deep, so this walks it rather than listing the keys — a key added
 * to `Translations` is carried into Croatian without anyone remembering to.
 */
function croatianCopy<T>(value: T): T {
  if (typeof value === 'string') return toCroatian(value) as unknown as T;
  if (Array.isArray(value)) return value.map(croatianCopy) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = croatianCopy(v);
    return out as T;
  }
  return value;
}

export const translations: Record<Language, Translations> = {
  ...SOURCE,
  hr: { ...croatianCopy(SOURCE.bs), languageName: 'Hrvatski' },
};
