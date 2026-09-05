# Flowchart & Pseudocode Studio

Bi-directional flowchart and pseudocode editor for teaching algorithms. Write
pseudocode and get a laid-out flowchart, or draw the flowchart and get the
pseudocode back — in English, German, or Bosnian.

Built as an offline-capable PWA, so it installs on a phone or a school laptop
and keeps working without a network connection.

> Original concept: Dino Isanović

## Features

**Bi-directional generation.** `Generate diagram` parses the pseudocode into
statements and builds a laid-out flowchart; `Generate pseudocode` walks the
node/edge graph back into text. Both directions understand sequences,
`IF / ELSE IF / ELSE` branches, count loops, and top- and bottom-checked
while loops.

**Three languages, three keyword sets.** The pseudocode keywords are localized,
not just the UI. The same algorithm reads as `IF a > b` / `WENN a > b` /
`AKO JE a > b`, and the parser accepts the set matching the selected language.
Diacritics are normalized, so `ISPISI` parses the same as `ISPIŠI`.

**Canvas editing.** Seven shape types (start/end, I/O, process, decision, loop,
subprocess, comment), drag-to-move with snap-to-grid and alignment guides, a
connect mode for drawing edges, orthogonal edge routing with draggable bend
handles, editable edge labels, auto-layout, and undo/redo.

**Forgiving parser.** Parse problems are split into errors and warnings.
Warnings describe a diagram that was still drawn; only real errors withhold it.

**AI Tutor (optional).** A side panel that sends the current diagram and
pseudocode to the Gemini API along with a Socratic teaching prompt — it asks a
guiding question before handing over a solution. It can point at a specific node
and the canvas highlights it. Requires your own API key (see below).

**Export and persistence.** PNG export (SVG fallback), JSON project save/load,
and debounced autosave to `localStorage` so a refresh doesn't lose work.

**Mobile and PWA.** Touch gestures (pinch-zoom, one-finger pan, drag shapes), a
mobile nav bar, an install prompt, and a built-in guide for packaging the PWA as
an Android app via Bubblewrap (TWA) or Capacitor.

## Pseudocode language

Blocks open by indentation and close by returning to a shallower column, like
Python — there is no `END IF` or `END WHILE`.

| English | German | Bosnian |
| --- | --- | --- |
| `START` / `END` | `START` / `ENDE` | `POČETAK` / `KRAJ` |
| `INPUT a, b` | `EINGABE a, b` | `UNESI a, b` |
| `OUTPUT x` | `AUSGABE x` | `ISPIŠI x` |
| `SET i = 1` | `SETZE i = 1` | `POSTAVI i = 1` |
| `CALCULATE sum = a + b` | `BERECHNE summe = a + b` | `RAČUNAJ zbir = a + b` |
| `IF cond` → `YES` / `NO` / `ELSE` | `WENN` → `JA` / `NEIN` / `SONST` | `AKO JE` → `DA` / `NE` / `INAČE` |
| `ELSE IF cond` | `SONST WENN cond` | `INAČE AKO JE cond` |
| `REPEAT 5 TIMES` | `WIEDERHOLE 5 MAL` | `PONOVI 5 PUTA` |
| `REPEAT WHILE cond` | `WIEDERHOLE SOLANGE cond` | `PONOVI DOK JE cond` |
| `REPEAT ... UNTIL cond` | `WIEDERHOLE ... BIS cond` | `PONAVLJAJ ... DOK JE cond` |

Example:

```
START
INPUT a, b
IF a > b
  YES
    OUTPUT a
  ELSE
    OUTPUT b
END
```

An `ELSE IF` opens a branch of its own, so it takes its own `YES` / `ELSE`
block one level deeper:

```
START
INPUT a
IF a > 0
  YES
    OUTPUT "pos"
  ELSE IF a < 0
    YES
      OUTPUT "neg"
    ELSE
      OUTPUT "zero"
END
```

Four starter templates (sequence, branch, while loop, count loop) ship in each
language and are available from the toolbar.

## Run locally

**Prerequisites:** Node.js 20+ (or Bun).

```bash
npm install
npm run dev        # http://localhost:3000
```

Other scripts:

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run lint       # tsc --noEmit, type-check only
```

No environment variables are needed to run the app. `.env.example` is a
leftover from AI Studio hosting; the app itself reads no `GEMINI_API_KEY` at
build or run time.

## Using the AI Tutor

The tutor calls the Gemini REST API **from the browser** with a key you paste
into the panel. The key lives in React state for that session only — it is never
written to `localStorage` and never leaves the browser except in the request to
`generativelanguage.googleapis.com`.

1. Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Open the tutor panel and paste it into the API key field.
3. Optionally change the model (default: `gemini-2.5-flash`).

Because the key is used client-side, use a personal key with a spending cap —
don't ship a shared or unrestricted key to a classroom deployment.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `G` | Toggle snap-to-grid and alignment guides |
| `Ctrl + Z` / `Ctrl + Y` | Undo / redo |
| `Delete` / `Backspace` | Delete selected shape or edge |
| `Tab` | Accept keyword suggestion in the editor |
| Double click | Edit shape text or edge label |
| `Escape` | Cancel editing, close dialog |

## Project layout

```
src/
  App.tsx                 state, history, autosave, import/export, shortcuts
  types.ts                FlowNode, FlowEdge, Statement, AppState
  core/
    flowchart-gen.ts      pseudocode parser, diagram builder, reverse
                          generator, orthogonal edge routing
    auto-layout.ts        automatic node placement and canvas centering
  components/             Canvas, Toolbar, Header, PseudocodePanel,
                          AITutorPanel, modals, toasts, mobile nav
  i18n/
    keywords.ts           per-language keywords, templates, tutor prompts
    translations.ts       UI strings (en / de / bs)
  hooks/usePWAInstall.ts  beforeinstallprompt handling
```

## Tech stack

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · vite-plugin-pwa · lucide-react

## License

Apache-2.0, per the SPDX headers on the source files.
