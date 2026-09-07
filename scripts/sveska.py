#!/usr/bin/env python3
"""Builds the printable A4 workbook from the JSON that sveska-data.ts writes.

A .docx is a zip of XML parts, so this needs nothing outside the standard
library — no python-docx, no LibreOffice. Writing the XML directly is also the
only way to pin the page and the shapes exactly, which is the whole point.

Two things drive the layout. Tasks are packed two or three to a sheet by a
height budget rather than one per page, so a class works through a topic
without turning the page every minute. And wherever the student is asked for
an algorithm, the space is not blank: the START block and the first arrow are
already drawn, because a beginner staring at an empty box usually starts by
drawing the wrong thing.

    python3 scripts/sveska.py <podaci.json> <izlaz.docx>
"""

import json
import random
import sys
import zipfile
from xml.sax.saxutils import escape

# A4 in twentieths of a point: 210 mm x 297 mm.
PAGE_W, PAGE_H = 11906, 16838
MARGIN_X, MARGIN_Y = 851, 794            # 15 mm / 14 mm
CONTENT_W = PAGE_W - 2 * MARGIN_X        # 10204 twips of usable width

# How much of a page the cards may fill before the next one waits its turn.
# Measured, not guessed: the estimates below are compared against the rendered
# pages, and this is the value at which nothing spills.
PAGE_BUDGET = 14200
MAX_PER_PAGE = 3

INK = '18303A'
MUTED = '64748B'
FAINT = '94A3B8'
ACCENT = '0E7490'          # strokes, headings
ACCENT_FILL = '06B6D4'     # the band a card wears
SOFT = 'ECFEFF'            # hint and code backgrounds
PAPER = 'F1F5F9'           # boxes the student writes into
WARM = 'B45309'            # the "think about it" note
RULE = 'CBD5E1'

NS = ('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
      'xmlns:v="urn:schemas-microsoft-com:vml" '
      'xmlns:o="urn:schemas-microsoft-com:office:office" '
      'xmlns:w10="urn:schemas-microsoft-com:office:word"')


def run(t, *, bold=False, italic=False, size=22, mono=False, color=INK, spacing=0, caps=False):
    """One text run. `size` is in half-points, so 22 is 11 pt."""
    props = []
    if mono:
        props.append('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>')
    if bold:
        props.append('<w:b/>')
    if italic:
        props.append('<w:i/>')
    if caps:
        props.append('<w:caps/>')
    if color:
        props.append(f'<w:color w:val="{color}"/>')
    if spacing:
        # Letter-spacing: the one typographic trick that makes a small
        # uppercase label read as a label rather than as shouting.
        props.append(f'<w:spacing w:val="{spacing}"/>')
    props.append(f'<w:sz w:val="{size}"/>')
    rpr = f'<w:rPr>{"".join(props)}</w:rPr>'
    # xml:space keeps the leading spaces that indent a pseudocode line.
    return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(t)}</w:t></w:r>'


def para(runs='', *, align=None, before=0, after=60, ind=0, shade=None,
         rule=None, box=None, line=None):
    pr = ['<w:spacing w:before="%d" w:after="%d"%s/>'
          % (before, after, f' w:line="{line}" w:lineRule="auto"' if line else '')]
    if align:
        pr.append(f'<w:jc w:val="{align}"/>')
    if ind:
        pr.append(f'<w:ind w:left="{ind}"/>')
    if box:
        pr.append('<w:pBdr>' + ''.join(
            f'<w:{side} w:val="single" w:sz="6" w:space="6" w:color="{box}"/>'
            for side in ('top', 'left', 'bottom', 'right')) + '</w:pBdr>')
    elif rule:
        pr.append(f'<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="{rule}"/></w:pBdr>')
    if shade:
        pr.append(f'<w:shd w:val="clear" w:fill="{shade}"/>')
    return f'<w:p><w:pPr>{"".join(pr)}</w:pPr>{runs}</w:p>'


def page_break():
    # The paragraph carrying the break is squeezed to nothing: at full height it
    # is itself a line of content, and on a page that is already full it spills
    # over and leaves a blank sheet behind it.
    return ('<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>'
            '</w:pPr><w:r><w:br w:type="page"/></w:r></w:p>')


def table(rows, widths, *, borders=RULE, row_height=None, shades=None, valign='center'):
    """rows: list of lists of already-built paragraph XML.

    `shades` gives a fill per column, so a header badge and the cell beside it
    can differ without nesting a table inside a table cell.
    """
    edge = 'single' if borders else 'nil'
    color = borders or 'auto'
    bd = ''.join(f'<w:{s} w:val="{edge}" w:sz="4" w:color="{color}"/>'
                 for s in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'))
    grid = ''.join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    out = [f'<w:tbl><w:tblPr><w:tblW w:w="{sum(widths)}" w:type="dxa"/>'
           f'<w:tblBorders>{bd}</w:tblBorders>'
           '<w:tblCellMar><w:top w:w="70" w:type="dxa"/><w:left w:w="110" w:type="dxa"/>'
           '<w:bottom w:w="70" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tblCellMar>'
           f'</w:tblPr><w:tblGrid>{grid}</w:tblGrid>']
    for cells in rows:
        # cantSplit: a drawing area or a listing cut in half by a page break is
        # useless, and every row here is one thing the student reads as a unit.
        trh = f'<w:trHeight w:val="{row_height}"/>' if row_height else ''
        h = f'<w:trPr><w:cantSplit/>{trh}</w:trPr>'
        tcs = []
        for i, cell in enumerate(cells):
            fill = (shades[i] if shades and i < len(shades) else None)
            shd = f'<w:shd w:val="clear" w:fill="{fill}"/>' if fill else ''
            tcs.append(f'<w:tc><w:tcPr><w:tcW w:w="{widths[i]}" w:type="dxa"/>{shd}'
                       f'<w:vAlign w:val="{valign}"/></w:tcPr>'
                       f'{cell or para(after=0)}</w:tc>')
        out.append(f'<w:tr>{h}{"".join(tcs)}</w:tr>')
    out.append('</w:tbl>')
    # A table must be followed by a paragraph or the next one merges into it.
    out.append(para(after=0))
    return ''.join(out)


def label(text):
    """The small uppercase caption that names a part of a task."""
    return para(run(text, bold=True, size=15, color=ACCENT, spacing=30, caps=True), after=50)


def code_block(lines, *, shade=SOFT):
    """Pseudocode in a tinted box, one paragraph per line so it never reflows."""
    body = ''.join(
        para(run(line if line.strip() else ' ', mono=True, size=20), after=0, ind=60)
        for line in lines)
    return table([[body]], [CONTENT_W], borders=None, shades=[shade])


def blank_lines(n=1, width=64):
    return ''.join(para(run(' ' * width, color='FFFFFF'), after=40) for _ in range(n))


# --- the drawn start of an algorithm ----------------------------------------

# The group's own coordinates, at 0.05 pt each. The whole diagram is turned a
# quarter turn: it runs from the left margin to the right one, not from the top
# of the sheet to the bottom, so every shape in it stands on its end and the
# page gives the algorithm its width instead of its depth.
OVAL_W, OVAL_H = 1400, 470        # before the turn; on the page these swap
ARROW = 405                       # a quarter shorter than the first version
FOOT_W, FOOT_H = OVAL_H, OVAL_W   # what the turned ellipse actually occupies
# Counter-clockwise, so the caption reads bottom to top: the page is turned
# clockwise to read it, which is the way vertical labels run on a drawing.
# At +90 the letters run the other way and read upside down.
TURN = -90
GROUP_W = FOOT_W + ARROW
PT_PER_UNIT = 0.05


def start_block(caption):
    """The POČETAK ellipse and the first arrow, drawn rather than described.

    VML rather than DrawingML: it is a quarter of the XML for the same picture
    and both Word and LibreOffice render it, which is all this needs to do.
    """
    # VML turns a shape about its own centre, so the unturned box is placed by
    # its centre rather than its corner. Turning the shape — rather than only
    # the text inside it — is what keeps the caption centred in the ellipse.
    cx, cy = FOOT_W // 2, FOOT_H // 2
    left, top = cx - OVAL_W // 2, cy - OVAL_H // 2
    return (
        '<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:before="0" w:after="0"/></w:pPr>'
        '<w:r><w:pict>'
        f'<v:group style="width:{GROUP_W * PT_PER_UNIT:.2f}pt;'
        f'height:{FOOT_H * PT_PER_UNIT:.2f}pt" coordsize="{GROUP_W},{FOOT_H}">'
        f'<v:oval style="position:absolute;left:{left};top:{top};'
        f'width:{OVAL_W};height:{OVAL_H};rotation:{TURN}" '
        f'fillcolor="#{SOFT}" strokecolor="#{ACCENT}" strokeweight="1.5pt">'
        '<v:textbox inset="0,0,0,0"><w:txbxContent>'
        '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>'
        f'<w:r><w:rPr><w:b/><w:sz w:val="17"/><w:color w:val="{ACCENT}"/></w:rPr>'
        f'<w:t>{escape(caption)}</w:t></w:r></w:p>'
        '</w:txbxContent></v:textbox></v:oval>'
        f'<v:line from="{FOOT_W},{cy}" to="{GROUP_W},{cy}" '
        f'strokecolor="#{ACCENT}" strokeweight="1.5pt">'
        '<v:stroke endarrow="block"/></v:line>'
        '</v:group></w:pict></w:r></w:p>')


def algorithm_space(height):
    """Space for an algorithm that already knows how it begins.

    Only the block goes inside. The instruction sits above the frame: the
    diagram runs from this block straight across to the right margin, and a
    line of text in there would be standing in the middle of it.
    """
    return table([[start_block('POČETAK')]], [CONTENT_W], borders=RULE,
                 row_height=height, shades=[None], valign='center')


# --- pieces of the front matter ---------------------------------------------

LEGEND = [
    ('Elipsa', 'početak i kraj algoritma'),
    ('Paralelogram', 'unos podataka i ispis rezultata'),
    ('Pravougaonik', 'obrada — računanje i dodjela vrijednosti'),
    ('Romb', 'uslov, iz njega izlaze grane DA i NE'),
    ('Strelica', 'redoslijed izvršavanja koraka'),
]

HOW_TO = [
    ('1', 'Pročitaj zadatak do kraja prije nego išta napišeš.'),
    ('2', 'Riješi vježbu koja je uz zadatak — kockice, praznine, ispis ili tabelu.'),
    ('3', 'U okvir nacrtaj dijagram toka. POČETAK i prva strelica su već tu.'),
    ('4', 'Provjeri rješenje tako što ga „izvršiš" korak po korak na primjeru.'),
]


def cover(topic, count):
    out = [para(after=900)]
    out.append(para(run('RADNA SVESKA', bold=True, size=56, color=ACCENT, spacing=60),
                    align='center', after=100))
    out.append(para(run('Algoritmi i dijagrami toka', size=30, color=INK),
                    align='center', after=60))
    out.append(para(run(topic, italic=True, size=25, color=MUTED),
                    align='center', after=140))
    out.append(para(run(f'{count} zadataka  ·  6. razred', size=19, color=FAINT),
                    align='center', after=800))

    # Label and rule in their own columns: written as one run the rules start
    # wherever the label happens to end, and three ragged lines is the first
    # thing anyone sees.
    rows = [[para(run(f'{name}', size=23, color=MUTED), after=0),
             para(run(' ' * 44, size=23), after=0, rule=RULE)]
            for name in ('Ime i prezime', 'Razred', 'Datum')]
    out.append(table(rows, [2600, CONTENT_W - 2600], borders=None, row_height=560))
    out.append(para(after=500))

    out.append(label('Kako radiš u ovoj svesci'))
    rows = [[para(run(n, bold=True, size=22, color='FFFFFF'), align='center', after=0),
             para(run(t, size=21), after=0)]
            for n, t in HOW_TO]
    out.append(table(rows, [520, CONTENT_W - 520], borders=None,
                     shades=[ACCENT_FILL, PAPER], row_height=420))
    out.append(para(after=360))

    out.append(label('Simboli koje koristimo'))
    rows = [[para(run(name, bold=True, size=20, color=ACCENT), after=0),
             para(run(meaning, size=20), after=0)]
            for name, meaning in LEGEND]
    out.append(table(rows, [2500, CONTENT_W - 2500], borders=RULE))
    out.append(page_break())
    return ''.join(out)


def back_page(tasks):
    out = [page_break()]
    out.append(para(run('Šta sam naučio', bold=True, size=36, color=ACCENT), after=60))
    out.append(para(run('Označi ono što ti sada ide samo od sebe. Ono što nije označeno '
                        'nije propušteno — to je ono što vježbaš sljedeće.',
                        size=21, color=MUTED), after=260))

    can = [
        'Znam pročitati dijagram toka i reći šta ispisuje.',
        'Znam poredati korake algoritma ispravnim redoslijedom.',
        'Znam nacrtati dijagram toka za zadatak opisan riječima.',
        'Znam popuniti tabelu stanja i pratiti vrijednosti varijabli.',
        'Znam prepoznati grešku u tuđem dijagramu i objasniti je.',
        'Znam napisati algoritam koji rješava svoj zadatak od početka.',
    ]
    rows = [[para(after=0), para(run(t, size=21), after=0)] for t in can]
    out.append(table(rows, [460, CONTENT_W - 460], borders=RULE, row_height=460))
    out.append(para(after=400))

    out.append(label('Zadaci koje sam uradio'))
    ticks = [f'{t["level"]}. {t["title"]}' for t in tasks]
    # Three columns, filled down, so a long list stays on one page.
    per = (len(ticks) + 2) // 3
    cols = [ticks[i * per:(i + 1) * per] for i in range(3)]
    depth = max(len(c) for c in cols)
    rows = []
    for r in range(depth):
        rows.append([para(run('☐  ' + c[r] if r < len(c) else '', size=18), after=0)
                     for c in cols])
    out.append(table(rows, [CONTENT_W // 3] * 3, borders=None, row_height=330))
    out.append(para(after=500))

    out.append(label('Moje bilješke'))
    notes = blank_lines(6)
    out.append(table([[notes]], [CONTENT_W], borders=RULE))
    out.append(para(after=400))

    out.append(para(run('Radna sveska je napravljena u aplikaciji '
                        'Flowchart & Pseudocode Studio.', size=18, color=FAINT),
                    align='center', after=40, rule=None))
    return ''.join(out)


# --- exercises --------------------------------------------------------------

def exercise_kockice(task, rng):
    tiles = [t['text'] if isinstance(t, dict) else t for t in task['tiles']]
    levels = [t.get('level', 0) if isinstance(t, dict) else 0 for t in task['tiles']]
    letters = [chr(65 + i) for i in range(len(tiles))]
    order = list(range(len(tiles)))
    rng.shuffle(order)
    out = [para(run('Kockice su pomiješane. Upiši njihova slova ispravnim redoslijedom '
                    'u polja ispod.', italic=True, size=19, color=MUTED), after=120)]
    # Two columns: the bank reads the same either way, and half the rows is
    # half the height on a page that has to hold more than one task.
    half = CONTENT_W // 2
    cell = lambda i: (
        [para(run(letters[i], bold=True, size=19, color=ACCENT), align='center', after=0),
         para(run(tiles[order[i]], mono=True, size=19), after=0)]
        if i < len(tiles) else [para(after=0), para(after=0)])
    split = (len(tiles) + 1) // 2
    rows = [cell(i) + cell(i + split) for i in range(split)]
    out.append(table(rows, [460, half - 460, 460, half - 460], borders=RULE))
    out.append(para(after=40))
    # Numbered boxes: "in the right order" means nothing to a beginner until
    # the order is on the page to write into.
    n = len(tiles)
    numbers = [para(run(str(i + 1), size=15, color=FAINT), align='center', after=0)
               for i in range(n)]
    boxes = [para(after=0)] * n
    out.append(table([numbers, boxes], [(CONTENT_W - 600) // n] * n,
                     borders=RULE, shades=[PAPER] * n))
    if any(levels):
        out.append(para(run('Pazi na uvlačenje: koraci unutar grane pišu se uvučeno udesno.',
                            italic=True, size=17, color=WARM), after=60))
    if task['interchangeable']:
        pairs = ', '.join(' i '.join(str(i) for i in g) for g in task['interchangeable'])
        out.append(para(run(f'Koraci {pairs} mogu zamijeniti mjesta — oba rasporeda su tačna.',
                            italic=True, size=17, color=MUTED), after=60))
    return ''.join(out)


def exercise_dopuni(task):
    out = [para(run('Nedostaju dijelovi algoritma. Upiši ih na crte.',
                    italic=True, size=19, color=MUTED), after=120)]
    out.append(code_block(task['blanked'].split('\n')))
    return ''.join(out)


def exercise_prepoznaj(task):
    out = [para(run('Pročitaj algoritam i upiši šta ispisuje za svaki ulaz. '
                    'Ne moraš ga pokretati — dovoljno je da ga pratiš korak po korak.',
                    italic=True, size=19, color=MUTED), after=120)]
    out.append(code_block(task['solution'].split('\n')))
    rows = [[para(run('Ulaz', bold=True, size=18, color=ACCENT, caps=True, spacing=20), after=0),
             para(run('Ispis', bold=True, size=18, color=ACCENT, caps=True, spacing=20), after=0)]]
    for case in task['results']:
        ulaz = ', '.join(case['inputs']) if case['inputs'] else '—'
        rows.append([para(run(ulaz, mono=True, size=19), after=0), para(after=0)])
    out.append(table(rows, [2200, CONTENT_W - 2200], borders=RULE, row_height=430,
                     shades=[None, PAPER]))
    return ''.join(out)


def exercise_tabela(task):
    cols = ['korak'] + task['vars']
    width = CONTENT_W // len(cols)
    # Naming the values the trace starts from; a state table without them is
    # a table of anything.
    first = task['results'][0]['inputs'] if task['results'] else []
    pairs = ', '.join(f'{name} = {value}'
                      for name, value in zip(task['inputVars'], first))
    uputa = ('Prati izvršavanje korak po korak i popuni tabelu stanja.'
             if not pairs else
             f'Prati izvršavanje za {pairs} i popuni tabelu stanja. '
             'U svaki red upiši vrijednosti nakon tog koraka.')
    out = [para(run(uputa, italic=True, size=19, color=MUTED), after=120)]
    rows = [[para(run(c, bold=True, size=18, color=ACCENT), align='center', after=0) for c in cols]]
    rows += [[para(after=0) for _ in cols] for _ in range(6)]
    out.append(table(rows, [width] * len(cols), borders=RULE, row_height=350,
                     shades=[PAPER] * len(cols)))
    return ''.join(out)


EXERCISES = {
    'kockice': lambda task, rng: exercise_kockice(task, rng),
    'dopuni': lambda task, rng: exercise_dopuni(task),
    'prepoznaj': lambda task, rng: exercise_prepoznaj(task),
    'tabela': lambda task, rng: exercise_tabela(task),
}

# What the student is told to do in the drawing box, per exercise. The note is
# the difference between "here is a box" and "here is what to put in it".
DRAW_NOTE = {
    'kockice': 'Nacrtaj dijagram toka po redoslijedu koji si složio.',
    'dopuni': 'Nacrtaj dijagram toka dopunjenog algoritma.',
    'prepoznaj': 'Nacrtaj dijagram toka ovog algoritma.',
    'tabela': 'Nacrtaj dijagram toka i označi korake brojevima iz tabele.',
    'samostalno': 'Nacrtaj svoj dijagram toka, korak po korak, do bloka KRAJ.',
}


def primary_type(task):
    """The first type an author listed is the one the task was built for."""
    for kind in task['types']:
        if kind in EXERCISES:
            return kind
    return 'samostalno'


# Where the algorithm is already printed on the page — a fill-in, a predict-
# the-output — drawing it again is a second copy of the same thing, and it is
# what used to eat half the sheet. The drawing space goes to the tasks that
# actually ask for an algorithm, and there it is big enough to draw one in.
DRAWS = {'kockice', 'tabela', 'samostalno'}


def draw_height(kind):
    """Room for a diagram, or none when the task is not asking for one."""
    if kind not in DRAWS:
        return 0
    return 4600 if kind == 'samostalno' else 4000


def estimate(task):
    """Roughly how tall the card will be, for packing pages.

    Deliberately generous: a card that overflows costs a broken page, a card
    estimated too tall costs a little white space.
    """
    kind = primary_type(task)
    h = 520                                            # header band
    h += 300 * (1 + len(task['prompt']) // 95)         # prompt
    if task.get('hint'):
        h += 460
    if kind == 'kockice':
        n = (len(task['tiles']) + 1) // 2          # the bank is two columns wide
        h += 320 + n * 330 + 560
    elif kind == 'dopuni':
        h += 320 + len(task['blanked'].split('\n')) * 250 + 200
    elif kind == 'prepoznaj':
        h += 360 + len(task['solution'].split('\n')) * 250 + 200
        h += (len(task['results']) + 1) * 440
    elif kind == 'tabela':
        h += 320 + 7 * 360
    else:
        h += 300
    height = draw_height(kind)
    if height:
        # The frame, its label, and the line of instruction above it — that
        # line lives outside the frame now, so it has to be counted here.
        h += height + 600
    if task['discussion']:
        h += 340 * (1 + len(task['discussion']) // 95)
    h += 320                                           # breathing room after
    # Tables and borders cost more than the sum of their rows; measured against
    # the rendered pages, the parts above come out about a third light.
    return round(h * 1.35)


def card(task, rng):
    kind = primary_type(task)
    head = [[para(run(str(task['level']), bold=True, size=26, color='FFFFFF'),
                  align='center', after=0),
             para(run(task['title'], bold=True, size=25, color=INK), after=0)]]
    out = [table(head, [620, CONTENT_W - 620], borders=None,
                 shades=[ACCENT_FILL, SOFT], row_height=520)]
    out.append(para(run(task['prompt'], size=21), after=140, ind=60))

    if task.get('hint'):
        out.append(para(run('Pomoć:  ', bold=True, size=19, color=ACCENT) +
                        run(task['hint'], size=19),
                        after=160, box=RULE, shade=SOFT))

    out.append(EXERCISES.get(kind, lambda t, r: para(
        run('Napiši algoritam sam, pa ga nacrtaj u okviru ispod.',
            italic=True, size=19, color=MUTED), after=120))(task, rng))

    height = draw_height(kind)
    if height:
        out.append(label('Prostor za algoritam'))
        out.append(para(run(DRAW_NOTE.get(kind, DRAW_NOTE['samostalno']) +
                            '  Crtaj slijeva nadesno, od bloka POČETAK do bloka KRAJ.',
                            italic=True, size=17, color=MUTED), after=80))
        out.append(algorithm_space(height))

    if task['discussion']:
        out.append(para(run('Za razmišljanje:  ', bold=True, size=19, color=WARM) +
                        run(task['discussion'], size=19, color=MUTED),
                        after=120, before=60))

    out.append(para(after=200, rule=RULE))
    return ''.join(out)


def pack(tasks):
    """Two or three cards to a sheet, whichever the page can actually hold."""
    pages, current, used = [], [], 0
    for task in tasks:
        h = estimate(task)
        if current and (used + h > PAGE_BUDGET or len(current) >= MAX_PER_PAGE):
            pages.append(current)
            current, used = [], 0
        current.append(task)
        used += h
    if current:
        pages.append(current)
    return pages


def answers(tasks):
    out = [page_break()]
    out.append(para(run('Rješenja', bold=True, size=36, color=ACCENT), after=60))
    out.append(para(run('Za nastavnika — ove stranice se ne moraju štampati.',
                        italic=True, size=19, color=MUTED), after=240))
    for task in tasks:
        out.append(para(run(f'{task["level"]}. {task["title"]}', bold=True, size=21,
                            color=INK), after=60))
        out.append(code_block(task['solution'].split('\n')))
        for case in task['results']:
            ulaz = ', '.join(case['inputs']) if case['inputs'] else '—'
            ispis = ' / '.join(case['output']) if case['output'] else '—'
            out.append(para(run(f'{ulaz}  →  {ispis}', mono=True, size=18, color=MUTED),
                            ind=200, after=40))
        out.append(para(after=140))
    return ''.join(out)


# --- the package ------------------------------------------------------------

FOOTER = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
          f'<w:ftr {NS}><w:p><w:pPr><w:jc w:val="center"/>'
          f'<w:pBdr><w:top w:val="single" w:sz="4" w:space="6" w:color="{RULE}"/></w:pBdr>'
          '<w:spacing w:before="60" w:after="0"/></w:pPr>'
          f'<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="{FAINT}"/></w:rPr>'
          '<w:t xml:space="preserve">Radna sveska  ·  </w:t></w:r>'
          '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
          '<w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
          '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
          f'<w:r><w:rPr><w:sz w:val="16"/><w:color w:val="{FAINT}"/></w:rPr><w:t>1</w:t></w:r>'
          '<w:r><w:fldChar w:fldCharType="end"/></w:r>'
          '</w:p></w:ftr>')


def build(data, path):
    rng = random.Random(20260906)
    body = [cover(data['topic'], len(data['tasks']))]

    pages = pack(data['tasks'])
    for i, page in enumerate(pages):
        for task in page:
            body.append(card(task, rng))
        if i < len(pages) - 1:
            body.append(page_break())

    body.append(back_page(data['tasks']))
    body.append(answers(data['tasks']))

    sect = (f'<w:sectPr><w:footerReference w:type="default" r:id="rId2"/>'
            f'<w:pgSz w:w="{PAGE_W}" w:h="{PAGE_H}"/>'
            f'<w:pgMar w:top="{MARGIN_Y}" w:right="{MARGIN_X}" w:bottom="{MARGIN_Y}" '
            f'w:left="{MARGIN_X}" w:header="567" w:footer="454" w:gutter="0"/></w:sectPr>')
    document = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                f'<w:document {NS}><w:body>{"".join(body)}{sect}</w:body></w:document>')

    styles = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
              f'<w:styles {NS}><w:docDefaults><w:rPrDefault><w:rPr>'
              '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>'
              f'<w:sz w:val="22"/><w:szCs w:val="22"/><w:color w:val="{INK}"/>'
              '<w:lang w:val="bs-BA"/>'
              '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>'
              '<w:spacing w:after="60" w:line="264" w:lineRule="auto"/>'
              '</w:pPr></w:pPrDefault></w:docDefaults>'
              '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
              '<w:name w:val="Normal"/></w:style></w:styles>')

    content_types = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                     '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                     '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                     '<Default Extension="xml" ContentType="application/xml"/>'
                     '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                     '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
                     '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
                     '</Types>')

    rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            '</Relationships>')

    doc_rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
                '</Relationships>')

    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types)
        z.writestr('_rels/.rels', rels)
        z.writestr('word/document.xml', document)
        z.writestr('word/styles.xml', styles)
        z.writestr('word/footer1.xml', FOOTER)
        z.writestr('word/_rels/document.xml.rels', doc_rels)

    return len(pages)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    with open(sys.argv[1]) as f:
        data = json.load(f)
    sheets = build(data, sys.argv[2])
    print(f'sveska: {sys.argv[2]} — {len(data["tasks"])} zadataka na {sheets} listova')
