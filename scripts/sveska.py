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


def code_cell(lines, *, size=18):
    """The same listing as `code_block`, but as bare paragraphs, so two of them
    can stand side by side in one table row — the algorithm and the program."""
    return ''.join(
        para(run(line if line.strip() else ' ', mono=True, size=size), after=0, ind=20)
        for line in lines)


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


# --- drawing a whole flowchart ----------------------------------------------

# VML paths in the 21600-square every path shape is drawn in.
NODE_PATHS = {
    'io': 'm5400,0l21600,0,16200,21600,0,21600xe',
    'decision': 'm10800,0l21600,10800,10800,21600,0,10800xe',
}

# The parser lowercases a node's text; the workbook prints the keyword the way
# the student writes it, and only when the first word really is one.
KEYWORDS_IN_NODES = {
    'početak', 'kraj', 'unesi', 'ispiši', 'postavi', 'računaj',
    'ako', 'inače', 'dok', 'ponovi', 'da', 'ne',
}


def node_caption(text):
    parts = (text or '').split(' ', 1)
    if parts and parts[0].lower() in KEYWORDS_IN_NODES:
        parts[0] = parts[0].upper()
    return ' '.join(parts)


# --- how a printed block is sized -------------------------------------------

CM = 567                     # twips in a centimetre
BLOCK_W = int(3.5 * CM)      # an ordinary block, across
DECISION_W = int(4.2 * CM)   # a diamond holds the same words in less room
LINK = CM                    # a straight connector is exactly one centimetre
CAPTION = 28                 # half-points, so 14 pt
LINE_H = 1.28                # of the font size
MIN_H = int(0.85 * CM)
PAD = int(0.16 * CM)

# How much of each shape its caption may use: a diamond gives away most of its
# box to the corners, a rectangle almost none of it.
TEXT_BOX = {
    'start_end': (0.70, 0.62),
    'io': (0.66, 0.76),
    # A diamond is cut away at every corner: it needs half again the height of
    # the words it holds, or the caption stands outside the shape.
    'decision': (0.56, 0.36),
    'process': (0.88, 0.78),
}


def wrap_to(text, width_pt, size=CAPTION):
    """Break a caption to a width, without shrinking the type.

    The old drawing shrank the letters until a line fitted and came out at four
    points. On paper the block grows instead: its width is fixed and its height
    follows the text.
    """
    words = (text or '').split()
    if not words:
        return ['']
    per_line = max(5, int(width_pt / (size / 2 * 0.55)))
    lines, line = [], ''
    for word in words:
        nxt = f'{line} {word}'.strip()
        if len(nxt) <= per_line or not line:
            line = nxt
        else:
            lines.append(line)
            line = word
    lines.append(line)
    return lines


def block_size(kind, text, size=CAPTION):
    """Width from the kind of block, height from how much text it holds."""
    w = DECISION_W if kind == 'decision' else BLOCK_W
    fw, fh = TEXT_BOX.get(kind, TEXT_BOX['process'])
    lines = wrap_to(node_caption(text), w * fw / 20, size)
    text_h = len(lines) * size / 2 * LINE_H * 20
    return w, max(MIN_H, int(text_h / fh) + PAD), lines


def vml_node(kind, cx, cy, w, h, lines, size=CAPTION, turned=False):
    """One shape of a flowchart, caption and all.

    A v:shape with a path turns its own text upside down where an oval or a
    rect turns it correctly, so the polygons get their caption from a second,
    invisible rect laid over them.
    """
    # v-text-anchor: a VML textbox starts its text at the top of the box, which
    # in a tall diamond puts the caption outside the shape.
    st = (f'position:absolute;left:{cx - w // 2};top:{cy - h // 2};'
          f'width:{w};height:{h};v-text-anchor:middle'
          + (f';rotation:{TURN}' if turned else ''))
    skin = f'fillcolor="#{SOFT}" strokecolor="#{ACCENT}" strokeweight="1.25pt"'
    if isinstance(lines, str):
        lines = wrap_to(node_caption(lines), w * TEXT_BOX.get(kind, TEXT_BOX['process'])[0] / 20, size)
    caption = ('<v:textbox inset="2pt,1pt,2pt,1pt"><w:txbxContent>' + ''.join(
        '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0" '
        'w:line="240" w:lineRule="auto"/></w:pPr>'
        f'<w:r><w:rPr><w:sz w:val="{size}"/><w:color w:val="{ACCENT}"/></w:rPr>'
        f'<w:t>{escape(line)}</w:t></w:r></w:p>' for line in lines) +
        '</w:txbxContent></v:textbox>')
    if kind == 'start_end':
        return f'<v:oval style="{st}" {skin}>{caption}</v:oval>'
    if kind in NODE_PATHS:
        return (f'<v:shape style="{st}" coordsize="21600,21600" '
                f'path="{NODE_PATHS[kind]}" {skin}/>'
                f'<v:rect style="{st}" filled="f" stroked="f">{caption}</v:rect>')
    return f'<v:rect style="{st}" {skin}>{caption}</v:rect>'


# --- drawing a whole flowchart ----------------------------------------------

def arrange(dia, size=CAPTION):
    """Re-spaces the app's layout for paper.

    The app's own coordinates are made for a canvas that can be scrolled: the
    blocks sit far apart and the arrows between them are long, which on a sheet
    of paper reads as a diagram of mostly empty space. The rows and columns it
    worked out are kept — they are the shape of the algorithm — and everything
    else is measured again here: a block is 3.5 cm across, as tall as its own
    text needs, and one centimetre from the next.
    """
    nodes = {n['id']: dict(n) for n in dia['nodes']}
    if not nodes:
        return {}, 0, 0
    for n in nodes.values():
        n['w'], n['h'], n['lines'] = block_size(n['type'], n['text'], size)

    # Two blocks the app placed on the same spot — it happens where a branch
    # inside a branch closes — would be drawn one on top of the other, and one
    # of them would simply be missing from the picture. Nudging the second one
    # gives it a column of its own.
    taken = set()
    for n in sorted(nodes.values(), key=lambda n: (n['y'], n['x'])):
        while (n['y'], n['x']) in taken:
            n['x'] += 1
        taken.add((n['y'], n['x']))

    cols = sorted({n['x'] for n in nodes.values()})
    rows = sorted({n['y'] for n in nodes.values()})
    col_of = {x: i for i, x in enumerate(cols)}
    row_of = {y: i for i, y in enumerate(rows)}

    x, col_cx = 0, []
    for c in range(len(cols)):
        w = max(n['w'] for n in nodes.values() if col_of[n['x']] == c)
        col_cx.append(x + w // 2)
        x += w + LINK
    x -= LINK

    y, row_cy = 0, []
    for r in range(len(rows)):
        h = max(n['h'] for n in nodes.values() if row_of[n['y']] == r)
        row_cy.append(y + h // 2)
        y += h + LINK
    y -= LINK

    for n in nodes.values():
        n['cx'] = col_cx[col_of[n['x']]]
        n['cy'] = row_cy[row_of[n['y']]]
    return nodes, x, y


def route(a, b, side_x):
    """The corners one connector turns, from the block it leaves to the one it
    enters. A step to the block straight below it is a single centimetre; only
    a branch or a merge turns corners, and those are the ones allowed to run.
    """
    top = lambda n: n['cy'] - n['h'] // 2
    bottom = lambda n: n['cy'] + n['h'] // 2
    if a['cx'] == b['cx'] and b['cy'] > a['cy']:
        return [(a['cx'], bottom(a)), (b['cx'], top(b))]
    if b['cy'] <= a['cy']:
        # Back up to a loop's test: out to the side, up, and in from the left.
        return [(a['cx'], bottom(a)), (side_x, bottom(a)), (side_x, b['cy']),
                (b['cx'] + b['w'] // 2, b['cy'])]
    if a['type'] == 'decision':
        # A branch leaves its diamond sideways, then drops into its own column.
        edge = a['cx'] + (a['w'] // 2 if b['cx'] > a['cx'] else -a['w'] // 2)
        return [(edge, a['cy']), (b['cx'], a['cy']), (b['cx'], top(b))]
    mid = (bottom(a) + top(b)) // 2
    return [(a['cx'], bottom(a)), (a['cx'], mid), (b['cx'], mid), (b['cx'], top(b))]


def drawing_height(dia, size=CAPTION):
    """How tall the finished drawing prints, in twips — what the solutions
    section needs to know before it decides where the page turns."""
    _, _, gh = arrange(dia, size)
    return gh


def flowchart(dia, width=CONTENT_W, size=CAPTION, turned=False):
    """A laid-out diagram, drawn the way the app exports it.

    Upright by default — top to bottom, the picture the student gets out of the
    program. `turned` gives the quarter turn the workbook asks for when the
    algorithm is to be drawn by hand along the page instead.
    """
    nodes, gw, gh = arrange(dia, size)
    if not nodes:
        return para()
    pad = int(0.15 * CM)
    side_x = gw + pad + LINK // 2
    if any(nodes[e['to']]['cy'] <= nodes[e['from']]['cy']
           for e in dia['edges'] if e['from'] in nodes and e['to'] in nodes):
        gw = side_x + pad
    gw += 2 * pad
    gh += 2 * pad

    # Turning the picture swaps the axes; everything below is worked out
    # upright and mapped on the way out.
    def at(x, y):
        x, y = x + pad, y + pad
        return (y, x) if turned else (x, y)

    box = (gh, gw) if turned else (gw, gh)
    # A VML group scales its shapes but not the type inside them: the letters
    # come out at their absolute size and spill out of a drawing that had to be
    # shrunk. The caption is scaled by hand to match, and the wrapping stays as
    # it was worked out — the same words on the same lines, smaller.
    ratio = min(1.0, width / box[0])
    caption_size = max(12, int(round(size * ratio)))
    label_size = max(10, int(round(20 * ratio)))

    def path(points):
        head, *rest = [at(*p) for p in points]
        d = f'm{head[0]},{head[1]} l' + ','.join(f'{x},{y}' for x, y in rest) + ' e'
        return (f'<v:shape style="position:absolute;left:0;top:0;width:{box[0]};height:{box[1]}" '
                f'coordsize="{box[0]},{box[1]}" path="{d}" filled="f" strokecolor="#{ACCENT}" '
                'strokeweight="1.25pt"><v:stroke endarrow="block"/></v:shape>')

    def branch_label(text, x, y):
        # DA and NE stay upright even where the diagram is turned: two letters
        # read fine either way, and an upright label is easier to place.
        w, h = int(0.9 * CM), int(0.42 * CM)
        px, py = at(x, y)
        return (f'<v:rect style="position:absolute;left:{px - w // 2};top:{py - h // 2};'
                f'width:{w};height:{h}" filled="f" stroked="f">'
                '<v:textbox inset="0,0,0,0"><w:txbxContent>'
                '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="0"/></w:pPr>'
                f'<w:r><w:rPr><w:b/><w:sz w:val="{label_size}"/><w:color w:val="{ACCENT}"/></w:rPr>'
                f'<w:t>{escape(text)}</w:t></w:r></w:p>'
                '</w:txbxContent></v:textbox></v:rect>')

    parts = []
    for e in dia['edges']:
        a, b = nodes.get(e['from']), nodes.get(e['to'])
        if not a or not b:
            continue
        points = route(a, b, side_x)
        parts.append(path(points))
        label = (e.get('label') or '').split(' ')[0].upper()
        if label:
            # Beside the first corner the line turns, which is where the
            # branch actually parts from the block it left.
            (x1, y1), (x2, y2) = points[0], points[1]
            if y1 == y2:
                parts.append(branch_label(label, (x1 + x2) // 2, y1 - int(0.28 * CM)))
            else:
                parts.append(branch_label(label, x1 + int(0.55 * CM), (y1 + y2) // 2))

    for n in nodes.values():
        px, py = at(n['cx'], n['cy'])
        parts.append(vml_node(n['type'], px, py, n['w'], n['h'], n['lines'],
                              caption_size, turned))

    # Twips to points, shrunk only if the drawing is wider than the column.
    k = ratio * 0.05
    return ('<w:p><w:pPr><w:jc w:val="center"/>'
            '<w:spacing w:before="60" w:after="120"/></w:pPr><w:r><w:pict>'
            f'<v:group style="width:{box[0] * k:.1f}pt;height:{box[1] * k:.1f}pt" '
            f'coordsize="{box[0]},{box[1]}">' + ''.join(parts) + '</v:group></w:pict></w:r></w:p>')


# --- pieces of the front matter ---------------------------------------------

LEGEND = [
    ('start_end', 'Elipsa', 'početak i kraj algoritma — svaki dijagram ima tačno jedan od svakog'),
    ('io', 'Paralelogram', 'unos podataka (UNESI) i ispis rezultata (ISPIŠI)'),
    ('process', 'Pravougaonik', 'obrada — računanje i dodjela vrijednosti'),
    ('decision', 'Romb', 'uslov; iz njega izlaze dvije grane, DA i NE'),
]

HOW_TO = [
    ('1', 'Pročitaj zadatak do kraja prije nego išta napišeš. Pitaj se: šta se '
          'unosi, šta se računa, šta se ispisuje?'),
    ('2', 'Riješi vježbu koja je uz zadatak. Uz svaku vježbu piše kako se radi.'),
    ('3', 'U okvir nacrtaj dijagram toka. POČETAK i prva strelica su već tu — '
          'nastavi udesno, do bloka KRAJ.'),
    ('4', 'Provjeri se. Uzmi brojeve iz zadatka i prođi kroz svoj algoritam '
          'korak po korak, kao da si ti računar.'),
    ('5', 'Ako zapne, pogledaj rješenja na kraju — ali tek pošto si pokušao.'),
]

# What each exercise asks for, said in a way a student can follow with nobody
# beside them. This is the difference between a workbook and a page of tasks.
HOW_TO_SOLVE = {
    'prepoznaj': (
        'Šta ispisuje?',
        'Dobiješ gotov algoritam i nekoliko ulaza. Za svaki ulaz upiši šta '
        'algoritam ispiše.',
        ['Idi red po red, ne preskači.',
         'Sa strane zapiši šta koja varijabla drži i mijenjaj to kad se '
         'vrijednost promijeni.',
         'Kad dođeš do reda ISPIŠI, ono što tu izađe upiši u tabelu.'],
    ),
    'dopuni': (
        'Dopuni algoritam',
        'Iz algoritma su izvađeni dijelovi i zamijenjeni crtama. Vrati ih.',
        ['Prvo pročitaj cijeli algoritam, pa tek onda popunjavaj.',
         'Red ispod često kaže šta je gore trebalo stajati — ako se varijabla '
         'negdje ispisuje, gore je morala biti izračunata.',
         'Kad popuniš, pročitaj sve ponovo od početka i vidi ima li smisla.'],
    ),
    'kockice': (
        'Složi kockice',
        'Koraci algoritma su pomiješani. Vrati ih u redoslijed koji ima smisla.',
        ['POČETAK ide prvi, KRAJ zadnji — to su dvije kockice manje.',
         'Pitaj se šta mora biti poznato prije nekog koraka: unos ide prije '
         'računanja, računanje prije ispisa.',
         'Neki koraci smiju zamijeniti mjesta. Ako ti se čini da su dva '
         'nezavisna, vjerovatno jesu.'],
    ),
    'tabela': (
        'Tabela stanja',
        'Prati algoritam korak po korak i zapisuj vrijednosti varijabli.',
        ['Jedan red tabele je stanje poslije jednog koraka.',
         'Ako se varijabla u tom koraku nije promijenila, prepiši njenu staru '
         'vrijednost — ne ostavljaj prazno polje.',
         'Varijabla koja još nije unesena ni izračunata nema vrijednost; tu '
         'stavi crticu.'],
    ),
    'samostalno': (
        'Napiši sam',
        'Nema gotovog algoritma — pišeš ga od nule.',
        ['Odgovori sebi na tri pitanja: šta se unosi, šta se računa, šta se '
         'ispisuje.',
         'Napiši te korake redom, jedan po red.',
         'Provjeri ga na brojevima iz zadatka prije nego ga nacrtaš.'],
    ),
}


def legend_symbol(kind):
    """The symbol itself, drawn the way it will be drawn on the page."""
    w, h = 116, 42
    return ('<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="0"/></w:pPr>'
            '<w:r><w:pict>'
            f'<v:group style="width:{h * 0.42:.1f}pt;height:{w * 0.42:.1f}pt" '
            f'coordsize="{h},{w}">'
            + vml_node(kind, h // 2, w // 2, w, h, [''], 12, True) +
            '</v:group></w:pict></w:r></w:p>')


def cover(topic, count):
    out = [para(after=620)]
    out.append(para(run('RADNA SVESKA', bold=True, size=56, color=ACCENT, spacing=60),
                    align='center', after=100))
    out.append(para(run('Algoritmi i dijagrami toka', size=30, color=INK),
                    align='center', after=60))
    out.append(para(run(topic, italic=True, size=25, color=MUTED),
                    align='center', after=140))
    out.append(para(run(f'{count} zadataka  ·  6. razred', size=19, color=FAINT),
                    align='center', after=520))

    # Label and rule in their own columns: written as one run the rules start
    # wherever the label happens to end, and three ragged lines is the first
    # thing anyone sees.
    rows = [[para(run(f'{name}', size=23, color=MUTED), after=0),
             para(run(' ' * 44, size=23), after=0, rule=RULE)]
            for name in ('Ime i prezime', 'Razred', 'Datum')]
    out.append(table(rows, [2600, CONTENT_W - 2600], borders=None, row_height=500))
    out.append(para(after=340))

    out.append(label('Kako radiš u ovoj svesci'))
    rows = [[para(run(n, bold=True, size=22, color='FFFFFF'), align='center', after=0),
             para(run(t, size=21), after=0)]
            for n, t in HOW_TO]
    out.append(table(rows, [520, CONTENT_W - 520], borders=None,
                     shades=[ACCENT_FILL, PAPER], row_height=400))
    out.append(para(after=240))

    out.append(page_break())
    return ''.join(out)


def guide(example):
    """One task solved from end to end, and what each exercise is asking for.

    A workbook a child opens alone has to answer "what am I supposed to do
    here?" before it asks anything. That is what this page is for.
    """
    out = [para(run('Kako se rješava zadatak', bold=True, size=36, color=ACCENT), after=60)]
    out.append(para(run('Prvo simboli od kojih se dijagram sastoji, pa četiri vrste '
                        'vježbi koje se u svesci smjenjuju.', size=21, color=MUTED),
                    after=200))

    out.append(label('Simboli koje koristimo'))
    out.append(para(run('Ovako izgledaju kad se dijagram crta slijeva nadesno, kako '
                        'se crta u ovoj svesci.', size=18, color=MUTED), after=100))
    rows = [[legend_symbol(kind),
             para(run(name, bold=True, size=20, color=ACCENT), after=0),
             para(run(meaning, size=19), after=0)]
            for kind, name, meaning in LEGEND]
    out.append(table(rows, [800, 2100, CONTENT_W - 2900], borders=RULE, row_height=520))
    out.append(para(after=300))

    out.append(label('Vrste vježbi'))

    for kind in ('kockice', 'dopuni', 'prepoznaj', 'tabela'):
        title, what, steps = HOW_TO_SOLVE[kind]
        out.append(para(run(title, bold=True, size=23, color=INK), after=40))
        out.append(para(run(what, size=20, color=MUTED), after=60, ind=60))
        for step in steps:
            out.append(para(run('•   ', color=ACCENT, size=20) + run(step, size=19),
                            after=30, ind=60))
        out.append(para(after=140))

    # No forced break here: the section above already fills its page, and a
    # break landing on a full page is what leaves a blank sheet behind it.
    out.append(para(run('Jedan zadatak, riješen do kraja', bold=True, size=32,
                        color=ACCENT), after=60, before=200))
    out.append(para(run('Ovaj zadatak nije za tebe — riješen je da vidiš šta se '
                        'od tebe traži u ostalima.', size=20, color=MUTED), after=200))

    out.append(label('Zadatak'))
    out.append(para(run(example['prompt'], size=21), after=160, ind=60))

    out.append(label('1. Šta treba unijeti, izračunati i ispisati'))
    out.append(para(run('Unosimo dva broja. Računamo njihov zbir i njihovu razliku. '
                        'Ispisujemo oba rezultata. Tri pitanja, tri odgovora — i '
                        'algoritam je već skoro napisan.', size=20), after=160, ind=60))

    out.append(label('2. Algoritam'))
    out.append(code_block(example['solution'].split('\n')))

    out.append(label('3. Provjera na brojevima'))
    first = example['results'][0]
    pairs = ', '.join(f'{n} = {v}' for n, v in zip(example['inputVars'], first['inputs']))
    out.append(para(run(f'Za {pairs} algoritam ispisuje:  ', size=20) +
                    run(' / '.join(first['output']), mono=True, size=20, color=ACCENT),
                    after=60, ind=60))
    out.append(para(run('Provjeri i sam: prođi kroz korake s tim brojevima i vidi '
                        'dobiješ li isto.', italic=True, size=19, color=MUTED),
                    after=160, ind=60))

    out.append(label('4. Dijagram toka'))
    out.append(para(run('Isti algoritam kao slika. Počinje uz lijevu marginu i ide '
                        'udesno, a svaki blok ima svoj oblik iz tabele simbola.',
                        size=20, color=MUTED), after=60, ind=60))
    # Turned, like the space the student draws in: this page is about
    # drawing the algorithm by hand, across the sheet.
    out.append(flowchart(example['diagram'], turned=True))
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

def trace_rows(task):
    """How many rows the trace actually has.

    Six blank rows for every task was a guess, and a wrong one: a student who
    cannot tell whether a row is meant to stay empty learns nothing from the
    table. The count comes from a real run, so a branch that is not taken
    brings no row with it.
    """
    return max(task['trace']['rows'], 2)


def tabela_height(task):
    """How tall the state-table exercise prints: the line naming the inputs, the
    header and one row per step, plus the DA / NE note where the program
    branches. A table that is estimated short breaks across two sheets.
    """
    return 320 + (trace_rows(task) + 1) * 360 + (260 if task['trace']['hasCondition'] else 0)


def how_to(kind, tip=0):
    """The two lines that tell a student working alone what to actually do."""
    title, what, steps = HOW_TO_SOLVE[kind]
    return (para(run(what, size=19, color=MUTED), after=30) +
            para(run('Savjet:  ', bold=True, size=18, color=ACCENT) +
                 run(steps[tip], size=18, color=MUTED), after=120))


def self_check(task):
    """"Did I get it right?" answered from the task's own first test case.

    Left off a predict-the-output task, where the same numbers are the
    question and printing the answer beside it would end the exercise.
    """
    if not task['results'] or not task['results'][0]['output']:
        return ''
    first = task['results'][0]
    pairs = ', '.join(f'{n} = {v}' for n, v in zip(task['inputVars'], first['inputs']))
    lead = f'Provjera:  za {pairs} mora ispisati  ' if pairs else 'Provjera:  mora ispisati  '
    return para(run(lead, bold=True, size=18, color=ACCENT) +
                run(' / '.join(first['output']), mono=True, size=18),
                after=120, box=RULE, shade=SOFT)


def exercise_kockice(task, rng):
    tiles = [t['text'] if isinstance(t, dict) else t for t in task['tiles']]
    levels = [t.get('level', 0) if isinstance(t, dict) else 0 for t in task['tiles']]
    letters = [chr(65 + i) for i in range(len(tiles))]
    order = list(range(len(tiles)))
    rng.shuffle(order)
    out = [how_to('kockice')]
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
    out = [how_to('dopuni', 1)]
    out.append(code_block(task['blanked'].split('\n')))
    return ''.join(out)


def exercise_prepoznaj(task):
    out = [how_to('prepoznaj', 1)]
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
    # The condition gets a column of its own where the program branches: the
    # branch taken is the whole point of tracing an AKO, and without it the
    # table shows values that appear from nowhere.
    cols = ['korak'] + (['uslov'] if task['trace']['hasCondition'] else []) + task['trace']['columns']
    width = CONTENT_W // len(cols)
    # Naming the values the trace starts from; a state table without them is
    # a table of anything.
    first = task['results'][0]['inputs'] if task['results'] else []
    pairs = ', '.join(f'{name} = {value}'
                      for name, value in zip(task['inputVars'], first))
    out = [how_to('tabela')]
    if pairs:
        out.append(para(run(f'Prati izvršavanje za {pairs}.', size=19), after=100))
    if task['trace']['hasCondition']:
        out.append(para(run('U kolonu uslov upiši DA ili NE — granu kojom je program prošao.',
                            italic=True, size=17, color=WARM), after=60))
    rows = [[para(run(c, bold=True, size=18, color=ACCENT), align='center', after=0) for c in cols]]
    rows += [[para(after=0) for _ in cols] for _ in range(trace_rows(task))]
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
        h += tabela_height(task)
    else:
        h += 300
    if kind != 'tabela' and 'tabela' in task['types'] and not draw_height(kind):
        h += 250 + tabela_height(task)  # the second exercise
    if kind not in ('prepoznaj', 'kockice'):
        h += 400                                       # the self-check box
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

    out.append(EXERCISES.get(kind, lambda t, r: how_to('samostalno'))(task, rng))

    # A task declares several exercise types; the sheet used to show one and
    # throw the rest away. The state table is the one that adds a different
    # kind of thinking rather than a second helping of the same.
    if kind != 'tabela' and 'tabela' in task['types'] and not draw_height(kind):
        out.append(label('Još jedna vježba'))
        out.append(exercise_tabela(task))

    # Not on the two exercises whose answer this would be: a predict-the-output
    # task asks for exactly this, and on a tile task the printed lines come out
    # in solution order, which is the ordering the student is meant to find.
    if kind not in ('prepoznaj', 'kockice'):
        out.append(self_check(task))

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


def python_body(code):
    """The program without the input helper.

    Every program that reads anything carries the same six lines of helper at
    the top. Printed ten times over they are noise, so the solutions print them
    once, at the front of the section.
    """
    lines = code.split('\n')
    for i, line in enumerate(lines):
        if line.strip() == 'return tekst':
            return '\n'.join(lines[i + 1:]).strip('\n')
    return code


def python_helper(tasks):
    """The helper itself, taken from the first solution that has one."""
    for task in tasks:
        lines = task.get('python', '').split('\n')
        for i, line in enumerate(lines):
            if line.strip() == 'return tekst':
                return lines[:i + 1]
    return []


def explain_line(text):
    """One sentence for one line of the algorithm.

    A student who has drawn the diagram and cannot see why it works needs the
    line said back to them in words. Structural lines — DA, INAČE — carry no
    sentence of their own; the branch they open is explained where the
    condition is.
    """
    text = (text or '').strip()
    if not text:
        return None
    head = text.split(' ', 1)
    word = head[0].upper().rstrip(':')
    rest = head[1].strip() if len(head) > 1 else ''

    if word == 'POČETAK':
        return 'Odavde program kreće.'
    if word == 'KRAJ':
        return 'Ovdje se program zaustavlja. Sve što je trebalo ispisati, ispisano je prije ovog bloka.'
    if word in ('DA', 'NE', 'INAČE') and not rest:
        return None
    if word == 'UNESI':
        names = [v.strip() for v in rest.split(',') if v.strip()]
        if len(names) == 1:
            return (f'Program staje i čeka da se ukuca jedna vrijednost. Ono što se ukuca '
                    f'pamti se pod imenom {names[0]} i odatle se dalje čita.')
        imena = ', '.join(names)
        koliko = {2: 'dvije', 3: 'tri', 4: 'četiri', 5: 'pet'}.get(len(names), str(len(names)))
        return (f'Traže se {koliko} vrijednosti, jedna po jedna, i pamte se redom pod imenima '
                f'{imena} — prva ukucana ide u {names[0]}.')
    if word == 'ISPIŠI':
        return ('Na ekran izlazi: ' + rest + '. Ono pod navodnicima ispisuje se doslovno, '
                'a ono bez njih je vrijednost varijable u tom trenutku.')
    if word in ('POSTAVI', 'RAČUNAJ') and '=' in rest:
        target, expr = rest.split('=', 1)
        target, expr = target.strip(), expr.strip()
        kako = 'Izračuna se' if word == 'RAČUNAJ' else 'Uzme se'
        return (f'{kako} {expr}, i rezultat se upisuje u {target}. Stara vrijednost '
                f'varijable {target} se time gubi.')
    if word == 'AKO' or (word == 'INAČE' and rest.upper().startswith('AKO')):
        cond = rest
        for prefix in ('AKO JE ', 'AKO ', 'JE '):
            if cond.upper().startswith(prefix):
                cond = cond[len(prefix):]
        prvi = 'Provjerava se' if word == 'AKO' else 'Ako prethodni uslov nije vrijedio, provjerava se'
        return (f'{prvi} uslov {cond}. Kad vrijedi, izvršavaju se koraci uvučeni ispod DA; '
                f'kad ne vrijedi, oni ispod INAČE. Prolazi se samo jednom granom.')
    if word == 'PONOVI' and rest.upper().endswith(('PUTA', 'PUTA:')):
        koliko = rest.rsplit(' ', 1)[0].strip()
        return (f'Koraci uvučeni ispod ovog bloka ponavljaju se {koliko} puta. Brojač se zove i '
                f'i ide od 0 naviše, pa je u prvom prolazu i = 0.')
    if word == 'PONOVI' or word == 'PONAVLJAJ' or word == 'DOK':
        cond = rest
        for prefix in ('DOK JE ', 'DOK ', 'JE '):
            if cond.upper().startswith(prefix):
                cond = cond[len(prefix):]
        if not cond:
            return 'Odavde počinju koraci koji se ponavljaju; uslov stoji u redu ispod njih.'
        return (f'Dok god vrijedi {cond}, ponavljaju se koraci uvučeni ispod. Uslov se provjerava '
                f'prije svakog prolaza, pa se može desiti da se ne izvrši nijednom.')
    return None


def explanation(task):
    """The whole algorithm said in words, line by line."""
    rows = []
    for line in task['solution'].split('\n'):
        sentence = explain_line(line)
        if sentence:
            rows.append((line.strip(), sentence))
    return rows


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
    """The back of the book: every task solved the way the app would show it.

    A drawing to compare against, the program that drawing stands for, and the
    algorithm said back line by line — a student working alone has no teacher
    to ask why a step is there.
    """
    out = [page_break()]
    out.append(para(run('Rješenja', bold=True, size=36, color=ACCENT), after=60))
    out.append(para(run('Pogledaj tek kad si pokušao sam. Uz svaki zadatak stoji dijagram '
                        'toka onakav kakav ga aplikacija nacrta, isti algoritam napisan kao '
                        'Python program, i objašnjenje svakog koraka. Ako se tvoj crtež '
                        'razlikuje, ne mora značiti da je pogrešan — provjeri ispisuje li '
                        'isto za iste ulaze.', size=20, color=MUTED), after=140))

    helper = python_helper(tasks)
    if helper:
        out.append(para(run('Programi koji nešto unose počinju ovim pomoćnikom. On pročita '
                            'ukucani red i pretvori ga u broj kad je broj, a inače ga ostavi '
                            'kao tekst. Ispod je napisan jednom, a podrazumijeva se u svakom '
                            'rješenju.', size=19, color=MUTED), after=80))
        out.append(code_block(helper))
        out.append(para(after=200))

    half = CONTENT_W // 2
    for i, task in enumerate(tasks):
        # A sheet each: the drawing is one picture and cannot be split, so
        # letting these flow leaves a third of a page empty before every one.
        if i:
            out.append(page_break())
        out.append(para(run(f'{task["level"]}. {task["title"]}', bold=True, size=26,
                            color=ACCENT), after=50, rule=RULE))
        out.append(para(run(task['prompt'], size=19, color=MUTED), after=120, ind=60))

        body = python_body(task.get('python', ''))
        out.append(table([[para(run('ALGORITAM', bold=True, size=15, color=ACCENT,
                                    spacing=30), after=40) + code_cell(task['solution'].split('\n')),
                           para(run('PYTHON', bold=True, size=15, color=ACCENT,
                                    spacing=30), after=40) + code_cell(body.split('\n'))]],
                         [half, CONTENT_W - half], borders=None,
                         shades=[SOFT, PAPER], valign='top'))
        out.append(para(after=120))

        # A drawing this tall cannot share a sheet with the words about it:
        # it goes on its own page, after them, rather than pushing half the
        # explanation onto a third sheet.
        tall = drawing_height(task['diagram']) > 7000
        if not tall:
            out.append(flowchart(task['diagram']))

        rows = [[para(run(line, mono=True, size=17), after=0),
                 para(run(sentence, size=17, color=MUTED), after=0)]
                for line, sentence in explanation(task)]
        if rows:
            out.append(label('Šta radi koji korak'))
            out.append(table(rows, [3400, CONTENT_W - 3400], borders=RULE, valign='top'))
            out.append(para(after=100))

        out.append(label('Provjera na brojevima'))
        for case in task['results']:
            ulaz = ', '.join(case['inputs']) if case['inputs'] else '—'
            ispis = ' / '.join(case['output']) if case['output'] else '—'
            out.append(para(run(f'{ulaz}  →  {ispis}', mono=True, size=18, color=MUTED),
                            ind=200, after=40))
        if tall:
            out.append(page_break())
            out.append(label('Dijagram toka'))
            out.append(para(run('Ovako ga aplikacija nacrta. Tvoj crtež ide slijeva nadesno, '
                                'ali su blokovi i strelice isti.', size=18, color=MUTED),
                            after=60))
            out.append(flowchart(task['diagram']))
        else:
            # Only when something follows on the same sheet: after a drawing
            # that filled its own page this empty line starts a blank one.
            out.append(para(after=160))
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
    # The worked example is the first computational task: everyday tasks have
    # no numbers to check against, which is half of what the example shows.
    example = next((t for t in data['tasks'] if t['kind'] == 'racunski'), data['tasks'][0])
    body = [cover(data['topic'], len(data['tasks'])), guide(example)]

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
