# Flowchart & Pseudocode Studio

Bi-directional flowchart and pseudocode editor for teaching algorithms. Write
pseudocode and get a laid-out flowchart, or draw the flowchart and get the
pseudocode back — in English, German, Bosnian, or Croatian.

It is a teaching tool rather than a diagram editor: it runs the algorithm a
step at a time, sets thirty-five graded exercises across three topics, prints
worksheets, and writes the lot out as a workbook.

Built as an offline-capable PWA, so it installs on a phone or a school laptop
and keeps working without a network connection. Windows and Linux builds are on
the [releases page](https://github.com/DinoIsanovic/Flowchart-Pseudocode-Studio/releases/latest).

> Original concept: Dino Isanović

## Features

**Bi-directional generation.** `Generate diagram` parses the pseudocode into
statements and builds a laid-out flowchart; `Generate pseudocode` walks the
node/edge graph back into text. Both directions understand sequences,
`IF / ELSE IF / ELSE` branches, count loops, and top- and bottom-checked
while loops.

**Four languages, four keyword sets.** The pseudocode keywords are localized,
not just the UI. The same algorithm reads as `IF a > b` / `WENN a > b` /
`AKO JE a > b`, and the parser accepts the set matching the selected language.
Diacritics are normalized, so `ISPISI` parses the same as `ISPIŠI`.

Croatian is written as a variant of Bosnian rather than as a fourth set of
strings. In this app's vocabulary the two differ in a countable number of words
— `uslov`/`uvjet`, `tabela`/`tablica`, `ugao`/`kut` — and the keywords
themselves are identical, so a word map converts the prose and a new exercise
cannot be left behind in one language. `npm run check:croatian` fails when a
word from the Bosnian side of the map turns up in a form the map does not
cover.

**Canvas editing.** Seven shape types (start/end, I/O, process, decision, loop,
subprocess, comment), drag-to-move with snap-to-grid and alignment guides, a
connect mode for drawing edges, orthogonal edge routing with draggable bend
handles, editable edge labels, auto-layout, and undo/redo.

**Forgiving parser.** Parse problems are split into errors and warnings.
Warnings describe a diagram that was still drawn; only real errors withhold it.

**Exercises.** Thirty-five tasks across three topics — sequences, branching,
loops — in the order they are taught. The author writes one correct solution
and a few test inputs, and the app derives six kinds of exercise from it:
predict the output, assemble the program from shuffled tiles, fill the blanks,
find the planted mistake, complete the state table, and write it from scratch.
A seventh plants a wrong shape or a missing arrow in a diagram and asks the
student to point at it.

Nothing stores an answer key. An attempt is marked by running it and comparing
what it prints, so `a + a + a + a` is accepted for `4 * a`, and two steps whose
order does not matter are right either way. Progress is kept in `localStorage`,
and solving a task loads the finished program into the editor.

**Simulator.** Run, pause and single-step the pseudocode. Variables and their
values are listed as they change, the output builds up beside them, the node
being executed is highlighted on the canvas, and a program that reads stops and
asks. It is the same interpreter that marks the exercises, so the screen and
the marker cannot disagree about what an algorithm does.

**AI Tutor (optional).** A side panel that sends the current diagram and
pseudocode to the Gemini API along with a Socratic teaching prompt — it asks a
guiding question before handing over a solution. It can point at a specific node
and the canvas highlights it. Requires your own API key (see below).

**Python alongside the diagram.** A `Python` tab beside the pseudocode editor
generates equivalent Python — `if/elif/else`, `while`, `for i in range(n)` —
with real indentation rather than a flattened transcript. A program that reads
gets a small `unesi()` / `read()` / `lies()` helper, spelled the way the
student's own pseudocode spells the keyword, which returns a whole number, a
decimal or text as the input warrants: `int(input())` is wrong for a price and
`float(input())` is wrong for a count that later feeds `range()`. The
counter a count loop keeps implicit is given a name in the Python, since seeing
the variable that does the counting is most of the reason to show the code;
nested loops take `i`, `j`, `k` in turn, and a name the student already used is
skipped so the loop cannot overwrite their own variable.

**Step badges.** Every flowchart node carries a number, and the same number
marks the line that produced it in the pseudocode and in the Python. Branches
put two nodes on one row and Python's indentation carries meaning, so the three
views are tied together by these badges rather than by lining up geometrically.

**Print-ready export, PNG or SVG.** Both put the pseudocode in a left column
and the Python in a right column beside the diagram, each line badged with its
step and separated by ruled dividers. The sheet is a fixed 210 x 99 mm — one
third of an A4 page — and the columns spread outwards to fill the band, so
three worked examples stack on one printed page.

The PNG is 300 dpi with the resolution written into the file, so a word
processor places it at that size. The SVG carries the sheet in millimetres and
keeps every word as real text — selectable, searchable and correctable, with
the font on the elements themselves rather than in an embedded stylesheet,
which is what several drawing programs need before they will restyle it. Office
suites insert an SVG as a picture; one Convert to Shape (Word) or Break
(LibreOffice Draw) makes the text editable there too.

The sheet is repainted for paper — ink on white, each shape keeping its hue as
a light tint — rather than exporting the app's dark theme, which drains a
cartridge and photocopies to mud.

Plus JSON project save/load, and debounced autosave to `localStorage` so a
refresh doesn't lose work.

**Workbook.** `npm run sveska` writes `radna-sveska.docx`: one book with a part
for each topic, a divider that names each part, every task with the exercise it
carries and room to draw, and the solutions at the back with the diagram and
the Python side by side. The script writes the document XML itself — no Word,
no LibreOffice, no `python-docx`.

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
| `LOOP ... UNTIL cond` | `LOOP ... BIS cond` | `PONAVLJAJ ... DOK JE cond` |

Croatian uses the Bosnian keywords — they are the same words in both — and
differs only in the prose around them.

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
npm run sveska     # write radna-sveska.docx from the exercise bank
```

The self-checks are scripts rather than a test framework: each one exercises a
module and prints what it found, so a failure reads as a sentence about the
algorithm rather than as an assertion.

```bash
npm run check:expr         # expression parser and evaluator
npm run check:interpreter  # running pseudocode, and the state table
npm run check:diagram      # what the diagram checker names in a bad drawing
npm run check:exercises    # every task in the bank parses, solves and grades
npm run check:grade        # right, wrong and equivalent-but-different attempts
npm run check:croatian     # the Croatian variant covers every Bosnian word
```

No environment variables are needed to run the app. `.env.example` is a
leftover from AI Studio hosting; the app itself reads no `GEMINI_API_KEY` at
build or run time.

## Desktop builds (Windows, Linux)

The desktop app is a [Tauri](https://tauri.app) shell around the same frontend,
so it ships a native window instead of a browser tab and needs no runtime
install. Set the version in `package.json`, `src-tauri/Cargo.toml` and
`src-tauri/tauri.conf.json`, then push a `v*` tag: `.github/workflows/release.yml`
builds every target and publishes them as a GitHub Release named after the tag.

| Platform | Artifact |
| --- | --- |
| Windows | `.exe` (NSIS installer, per-user — no admin rights needed) |
| Linux | `.AppImage` (portable, run it directly) |
| Linux | `.deb` (Debian/Ubuntu; depends on `libwebkit2gtk-4.1-0` and `libgtk-3-0`) |

### Building locally

**Prerequisites:** Rust (stable) plus the platform webview libraries —
`webkit2gtk-4.1` and `gtk3` on Linux, WebView2 on Windows (preinstalled on
Windows 10/11).

```bash
npm run tauri build                     # bundles for the current platform
npm run tauri build -- --bundles deb    # or a single target
npm run tauri dev                       # desktop window with hot reload
```

Windows binaries cannot be produced from Linux — use the workflow, which builds
them on a real Windows runner.

> **Arch / CachyOS:** AppImage bundling fails with
> `failed to run linuxdeploy`. `linuxdeploy` carries its own outdated `strip`,
> which does not understand the `.relr.dyn` section emitted by current Arch
> toolchains. Prefix the build with `NO_STRIP=true`. The CI workflow builds on
> Ubuntu 22.04 and is unaffected — and building there is deliberate, since an
> AppImage links against the glibc of the machine that built it.

The release workflow strips the bundled `libwayland-*` out of the AppImage
before uploading it. `linuxdeploy` copies the build host's copies in, and on a
host running newer wayland (Arch, Fedora rawhide) the system Mesa EGL then
loads beside Ubuntu's older `libwayland-client` and dies with
`Could not create default EGL display: EGL_BAD_PARAMETER` before the window
appears. Graphics-stack libraries have to come from the host, never the bundle.

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
src-tauri/                desktop shell (Tauri, Rust) — window config,
                          bundle targets, CSP, icons
.github/workflows/        release workflow: Windows .exe, Linux AppImage + deb
scripts/                  the self-checks, and sveska.py — the workbook writer
src/
  App.tsx                 state, history, autosave, import/export, shortcuts
  types.ts                FlowNode, FlowEdge, Statement, AppState
  core/
    flowchart-gen.ts      pseudocode parser, diagram builder, reverse
                          generator, orthogonal edge routing, step numbering
    python-gen.ts         Python generator over the same statement tree
    interpreter.ts        runs the statement tree — the simulator and the
                          exercise marker are the same interpreter
    expr.ts               expression parser, evaluator, and what to say when
                          one cannot be read
    diagram-check.ts      checks a flowchart as a drawing rather than as a
                          program: wrong symbol, missing arrow, no start
    auto-layout.ts        automatic node placement and canvas centering
    counters.ts           the name a count loop's counter is given
    shapes.ts             each symbol's outline, shared by the canvas and the
    node-text.ts          exercises so a label breaks in the same places
  exercises/
    *.json                the task bank, one file per topic
    types.ts              what an authored task holds
    render.ts             an authored solution as the student reads it —
                          keywords in their language, tiles, blanks
    plant.ts              plants the mistake the find-it exercises hide
    trace.ts              the state table a task is set and printed with
    grade.ts              marks an attempt by running it
  components/             Canvas, Toolbar, Header, PseudocodePanel,
                          SimulatorPanel, ExercisesPanel, AITutorPanel,
                          MiniDiagram, modals, toasts, mobile nav
  i18n/
    keywords.ts           per-language keywords, templates, tutor prompts
    translations.ts       UI strings (en / de / bs)
    croatian.ts           the Bosnian-to-Croatian word map every string with
                          prose in it is read through
  hooks/usePWAInstall.ts  beforeinstallprompt handling
```

## Tech stack

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · vite-plugin-pwa · lucide-react · Tauri 2 (desktop)

## License

[Apache-2.0](LICENSE) — Copyright 2026 Dino Isanović.
