# Flowchart & Pseudocode Studio

Bi-directional flowchart and pseudocode editor for teaching algorithms. Write
pseudocode and get a laid-out flowchart, or draw the flowchart and get the
pseudocode back — in English, German, Bosnian, or Croatian.

It is a teaching tool rather than a diagram editor: it runs the algorithm a
step at a time, sets thirty-five graded exercises across three topics, and
prints them as worksheets.

Built as an offline-capable PWA: one visit fills the cache and it keeps working
without a network connection, on a phone or a school laptop. The browser's own
menu installs it as an app for anyone who wants the icon. Windows and Linux
builds are on the [releases page](https://github.com/DinoIsanovic/Flowchart-Pseudocode-Studio/releases/latest).

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
student to point at it, and an eighth hands over a canvas and asks for the
flowchart itself. A drawing is marked as a drawing first — a missing arrow is
something the student can see and fix — and then by running it: the shapes and
arrows are read back into pseudocode and put through the same tests as a
written answer, so a correct algorithm drawn a different way is still correct.

The planted mistakes are worked out rather than authored. In a diagram the
mistake is one a drawing can have and a program cannot, so the pseudocode
behind it still runs and only the picture gives it away. In the pseudocode it
is the opposite: the algorithm still parses and still runs, and what gives it
away is the wrong answer it now prints. A mutation — a comparison loosened, an
operator swapped, the wrong variable used, a number changed — is only used
once it has been run against the task's own test inputs and caught printing
something the correct solution does not. That test case is the proof the
student is shown when they find it, and a mistake that makes no difference to
any of them is never set.

Nothing stores an answer key. An attempt is marked by running it and comparing
what it prints, so `a + a + a + a` is accepted for `4 * a`, and two steps whose
order does not matter are right either way. Progress is kept in `localStorage`,
and solving a task loads the finished program into the editor.

**Simulator.** Run, pause and single-step the pseudocode. Variables and their
values are listed as they change, the output builds up beside them, the node
being executed is highlighted on the canvas, and a program that reads stops and
asks. It is the same interpreter that marks the exercises, so the screen and
the marker cannot disagree about what an algorithm does.

**Offline check.** A `Check` tab beside the pseudocode editor answers "why
doesn't my program work?" without a key, an account or a network — which is the
only way a class of thirty can use it at once. It reads the program and then
runs it. Reading it finds a name used before anything gives it a value, a name
misspelt one letter away from one that exists, a value worked out and never
used, a program that computes and never prints, a condition with no variable in
it, a rung of an `IF` ladder no value can reach — `bodovi >= 50` written above
`bodovi >= 85` — and a loop whose condition the body never touches. Running it
tries the program on a handful of sample values and reports what happened: a
run that never stops, an error that happens whatever is typed, and one that
happens only for a particular value, which is usually the case the student
never thought about. Each finding says what is wrong and what to do about it,
in the student's own language, and clicking it selects the line it means.

A loop steered by a value typed inside it is not judged by the sample values —
answering `5` for ever to `INPUT` says nothing about a program waiting for `0`
— and a program the parser refused is reported as those errors alone. The
guard that matters is the other way round: `npm run check:diagnose` puts every
authored solution in the exercise bank, in all four languages, through the same
pass and fails if any of them is flagged. A check that cries wolf on the app's
own exercises would teach students to ignore it.

**Handing work in.** `Hand in` turns one piece of work — an exercise attempt or
anything drawn on the canvas — into a single line of text and opens the form
the teacher made. There is no server of ours anywhere in it: the app copies the
submission, the student presses Send in the form, and the answers land in the
teacher's own spreadsheet. Where there is no network, the same text saves as a
file.

The teacher makes one form for the whole class and all year — first name, last
name, class, and a long-answer box — fills each box with the word for it
(`IME`/`FIRST`, `PREZIME`/`LAST`, `ODJELJENJE`/`CLASS`, `ZADATAK`/`TASK`),
copies its own pre-filled link and pastes it into the app once. The app reads
which box is which from the values standing in them rather than from field
names, so it works with Google Forms and with anything else that prefills from
a query string. It then hands back a link to give the class: opening it once
sets the form up in their app, and from then on a student's name, class and
register number are filled in for them. The answer itself travels in the link
only while it is short; beyond that it is pasted, because a form service may
cut a long query value without saying so.

One line of text carries which task, which kind of exercise, which language,
and the answer in whatever shape that exercise produces one — a program, a
drawing, the values of a state table, the line a student pointed at. It also
carries four characters of checksum, which is not a signature and cannot be
one: it catches a paste that lost its tail, the failure that otherwise reads as
a wrong answer.

`Submissions` is the other half. The teacher copies the column out of the
spreadsheet — or the whole sheet, timestamps and all — pastes it in, and gets
one line per student, marked. Nothing in the submission is taken as a verdict:
the task is solved again from the bank and the student's answer put through the
same tests the app itself uses, so an answer edited on the way loses only its
own credibility. Clicking a row opens that student's work on the canvas, in the
language they wrote it in.

**AI Tutor (optional).** A side panel that sends the current diagram and
pseudocode to the Gemini API along with a Socratic teaching prompt — it asks a
guiding question before handing over a solution. It can point at a specific node
and the canvas highlights it. Requires your own API key (see below).

**Python alongside the diagram.** A `Python` tab beside the pseudocode editor
generates equivalent Python — `if/elif/else`, `while`, `for i in range(n)` —
with real indentation rather than a flattened transcript. Nothing is printed
above the first step: a value the program computes with is read as
`int(input())` and one it only ever prints, is compared with a written string
or is measured with `len` stays `input()`, so the file begins with the block
the diagram begins with. Nothing in `UNESI a` says whether `a` is 2 or 2.5, so
the simulator settles it: run the program once and each reading line is
rewritten as `int(input())`, `float(input())` or `input()` for what was
actually typed, with a line above the code saying so. The words the pseudocode spells its own
way are translated by parsing, not by replacing text, so `i` is `and` in
`a > 1 i b < 2` and stays the counter in `i <= 10`. The
counter a count loop keeps implicit is given a name in the Python, since seeing
the variable that does the counting is most of the reason to show the code;
nested loops take `i`, `j`, `k` in turn, and the name is plain: where the
program already uses it, the loop takes it over, exactly as `for i in range(n)`
does in Python.

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

**Mobile and PWA.** Touch gestures (pinch-zoom, one-finger pan, drag shapes), a
mobile nav bar, and a service worker that caches the app on first visit.

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
npm run check:mutate       # every planted mistake is real, findable and provable
npm run check:roundtrip    # a diagram read back into pseudocode is still the same algorithm,
                           #   including one drawn by hand rather than generated
npm run check:croatian     # the Croatian variant covers every Bosnian word
npm run check:layout       # a generated diagram never draws one block on top of another,
                           #   and no connector runs through a block it does not touch
npm run check:python       # python3 runs every generated program and prints what the simulator does
npm run check:diagnose     # every beginner mistake the offline check names, and silence
                           #   on every authored solution in all four languages
npm run check:submission   # a submission survives a spreadsheet, and every task in the bank
                           #   is marked again from what was handed in
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
scripts/                  the self-checks
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
    diagnose.ts           the offline check: reads the program, then runs it on
                          sample values, and words what it found
    submission.ts         what a student hands in, as one line of text, and how
                          to find those lines again in a pasted spreadsheet
    form-link.ts          the teacher's own form, learnt from a prefilled link
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
    plant.ts              plants the mistake the diagram find-it exercise hides
    mutate.ts             plants the mistake in the pseudocode, and proves it
                          changes what the algorithm prints
    trace.ts              the state table a task is set and printed with
    grade.ts              marks an attempt by running it
    packs.ts              the task bank in teaching order, and finding one by id
    regrade.ts            marks a submission by doing the work again — never by
                          believing what it says about itself
  components/             Canvas, DrawingBoard, Toolbar, Header, PseudocodePanel,
                          SimulatorPanel, DiagnosticsPanel, ExercisesPanel,
                          SubmitDialog, SubmissionsPanel, AITutorPanel,
                          MiniDiagram, modals, toasts, mobile nav
  i18n/
    keywords.ts           per-language keywords, templates, tutor prompts
    translations.ts       UI strings (en / de / bs)
    croatian.ts           the Bosnian-to-Croatian word map every string with
                          prose in it is read through
```

## Tech stack

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · vite-plugin-pwa · lucide-react · Tauri 2 (desktop)

## License

[Apache-2.0](LICENSE) — Copyright 2026 Dino Isanović.
