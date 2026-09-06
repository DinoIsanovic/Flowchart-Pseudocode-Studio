#!/usr/bin/env python3
"""Builds the printable B5 workbook from the JSON that sveska-data.ts writes.

A .docx is a zip of XML parts, so this needs nothing outside the standard
library — no python-docx, no LibreOffice. Writing the XML directly is also the
only way to pin the page to B5 exactly (176 x 250 mm), which is the whole point
of the exercise.

    python3 scripts/sveska.py <podaci.json> <izlaz.docx>
"""

import json
import random
import sys
import zipfile
from xml.sax.saxutils import escape

# B5 in twentieths of a point: 176 mm x 250 mm.
PAGE_W, PAGE_H = 9978, 14173
MARGIN_X, MARGIN_Y = 1021, 1134          # 18 mm / 20 mm
CONTENT_W = PAGE_W - 2 * MARGIN_X        # 7936 twips of usable width

NS = ('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"')


def run(t, *, bold=False, italic=False, size=21, mono=False, color=None):
    """One text run. `size` is in half-points, so 21 is 10.5 pt."""
    props = []
    if mono:
        props.append('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/>')
    if bold:
        props.append('<w:b/>')
    if italic:
        props.append('<w:i/>')
    if color:
        props.append(f'<w:color w:val="{color}"/>')
    props.append(f'<w:sz w:val="{size}"/>')
    rpr = f'<w:rPr>{"".join(props)}</w:rPr>'
    # xml:space keeps the leading spaces that indent a pseudocode line.
    return f'<w:r>{rpr}<w:t xml:space="preserve">{escape(t)}</w:t></w:r>'


def para(runs='', *, align=None, before=0, after=60, ind=0, border=False, shade=None):
    pr = ['<w:spacing w:before="%d" w:after="%d"/>' % (before, after)]
    if align:
        pr.append(f'<w:jc w:val="{align}"/>')
    if ind:
        pr.append(f'<w:ind w:left="{ind}"/>')
    if border:
        pr.append('<w:pBdr><w:top w:val="single" w:sz="4" w:color="BBBBBB"/>'
                  '<w:left w:val="single" w:sz="4" w:color="BBBBBB"/>'
                  '<w:bottom w:val="single" w:sz="4" w:color="BBBBBB"/>'
                  '<w:right w:val="single" w:sz="4" w:color="BBBBBB"/></w:pBdr>')
    if shade:
        pr.append(f'<w:shd w:val="clear" w:fill="{shade}"/>')
    return f'<w:p><w:pPr>{"".join(pr)}</w:pPr>{runs}</w:p>'


def page_break():
    return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'


def table(rows, widths, *, borders=True, row_height=None):
    """rows: list of lists of already-built paragraph XML."""
    edge = 'single' if borders else 'nil'
    bd = ''.join(f'<w:{s} w:val="{edge}" w:sz="4" w:color="AAAAAA"/>'
                 for s in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'))
    grid = ''.join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    out = [f'<w:tbl><w:tblPr><w:tblW w:w="{sum(widths)}" w:type="dxa"/>'
           f'<w:tblBorders>{bd}</w:tblBorders>'
           '<w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="90" w:type="dxa"/>'
           '<w:bottom w:w="60" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar>'
           f'</w:tblPr><w:tblGrid>{grid}</w:tblGrid>']
    for cells in rows:
        h = f'<w:trPr><w:trHeight w:val="{row_height}"/></w:trPr>' if row_height else ''
        tcs = ''.join(
            f'<w:tc><w:tcPr><w:tcW w:w="{widths[i]}" w:type="dxa"/></w:tcPr>{cell or para()}</w:tc>'
            for i, cell in enumerate(cells))
        out.append(f'<w:tr>{h}{tcs}</w:tr>')
    out.append('</w:tbl>')
    # A table must be followed by a paragraph or the next one merges into it.
    out.append(para(after=0))
    return ''.join(out)


def code_block(lines):
    """Pseudocode in a light box, one paragraph per line so it never reflows."""
    body = ''.join(
        para(run(line if line.strip() else ' ', mono=True, size=19), after=0, ind=90)
        for line in lines)
    return table([[body]], [CONTENT_W], row_height=None)


def blank_line(n=1):
    return ''.join(para(run(' ' * 60, color="FFFFFF"), after=40) for _ in range(n))


def drawing_box(height=3000, label='Prostor za dijagram toka'):
    inner = para(run(label, italic=True, size=17, color='999999'), after=0)
    return table([[inner]], [CONTENT_W], row_height=height)


LEGEND = [
    ('Elipsa', 'početak i kraj algoritma'),
    ('Paralelogram', 'unos podataka i ispis rezultata'),
    ('Pravougaonik', 'obrada — računanje i dodjela vrijednosti'),
    ('Romb', 'uslov, iz njega izlaze grane DA i NE'),
    ('Strelica', 'redoslijed izvršavanja koraka'),
]


def cover(topic):
    out = [para(after=1200)]
    out.append(para(run('RADNA SVESKA', bold=True, size=44), align='center', after=120))
    out.append(para(run('Algoritmi i dijagrami toka', size=28), align='center', after=60))
    out.append(para(run(topic, italic=True, size=24, color='555555'), align='center', after=1000))
    for label in ('Ime i prezime', 'Razred', 'Datum'):
        out.append(para(run(f'{label}: ', size=22) + run('_' * 34, color='888888', size=22), after=200))
    out.append(para(after=600))
    out.append(para(run('Simboli koje koristimo', bold=True, size=22), after=120))
    rows = [[para(run(name, bold=True, size=19), after=0), para(run(meaning, size=19), after=0)]
            for name, meaning in LEGEND]
    out.append(table(rows, [2200, CONTENT_W - 2200]))
    out.append(page_break())
    return ''.join(out)


def exercise_kockice(task, rng):
    tiles = list(task['tiles'])
    letters = [chr(65 + i) for i in range(len(tiles))]
    order = list(range(len(tiles)))
    rng.shuffle(order)
    out = [para(run('Upiši slova kockica ispravnim redoslijedom u polja ispod.',
                    italic=True, size=19), after=120)]
    rows = [[para(run(letters[i], bold=True, size=19), align='center', after=0),
             para(run(tiles[order[i]], mono=True, size=19), after=0)]
            for i in range(len(tiles))]
    out.append(table(rows, [560, CONTENT_W - 560]))
    out.append(para(after=60))
    boxes = [[para(after=0)] * len(tiles)]
    out.append(table(boxes, [(CONTENT_W - 900) // len(tiles)] * len(tiles), row_height=460))
    if task['interchangeable']:
        pairs = ', '.join(' i '.join(str(i) for i in g) for g in task['interchangeable'])
        out.append(para(run(f'Napomena: koraci {pairs} mogu zamijeniti mjesta — oba rasporeda su tačna.',
                            italic=True, size=17, color='777777'), after=60))
    return ''.join(out)


def exercise_dopuni(task):
    out = [para(run('Upiši ono što nedostaje na crte.', italic=True, size=19), after=120)]
    out.append(code_block(task['blanked'].split('\n')))
    return ''.join(out)


def exercise_prepoznaj(task):
    out = [para(run('Pročitaj algoritam i upiši šta ispisuje za date ulaze.', italic=True, size=19),
                after=120)]
    out.append(code_block(task['solution'].split('\n')))
    header = [para(run('Ulaz', bold=True, size=19), after=0), para(run('Ispis', bold=True, size=19), after=0)]
    rows = [header]
    for case in task['results']:
        ulaz = ', '.join(case['inputs']) if case['inputs'] else '—'
        rows.append([para(run(ulaz, mono=True, size=19), after=0), para(after=0)])
    out.append(table(rows, [2000, CONTENT_W - 2000], row_height=420))
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
             f'Prati izvršavanje za {pairs} i popuni tabelu stanja.')
    out = [para(run(uputa, italic=True, size=19), after=120)]
    rows = [[para(run(c, bold=True, size=18), align='center', after=0) for c in cols]]
    rows += [[para(after=0) for _ in cols] for _ in range(6)]
    out.append(table(rows, [width] * len(cols), row_height=340))
    return ''.join(out)


def task_page(task, rng):
    out = [para(run(f'{task["level"]}. {task["title"]}', bold=True, size=26), after=80)]
    out.append(para(run(task['prompt'], size=21), after=160))

    types = task['types']
    # The first type an author listed is the one the task was built for.
    primary = types[0] if types else 'samostalno'
    if primary == 'kockice':
        out.append(exercise_kockice(task, rng))
    elif primary == 'dopuni':
        out.append(exercise_dopuni(task))
    elif primary == 'prepoznaj':
        out.append(exercise_prepoznaj(task))
    elif primary == 'tabela':
        out.append(exercise_tabela(task))
    else:
        out.append(para(run('Napiši algoritam sam.', italic=True, size=19), after=120))
        out.append(blank_line(6))

    if task['discussion']:
        out.append(para(run('Za razmišljanje: ', bold=True, size=19) + run(task['discussion'], size=19),
                        after=120, before=120))

    out.append(para(after=60))
    # Tracing beats an empty box on a task built for it; everyone else draws.
    out.append(exercise_tabela(task) if 'tabela' in types and primary != 'tabela'
               else drawing_box())
    out.append(page_break())
    return ''.join(out)


def answers(tasks):
    out = [para(run('Rješenja', bold=True, size=32), after=60),
           para(run('Za nastavnika — ove stranice se ne moraju štampati.', italic=True,
                    size=19, color='777777'), after=200)]
    for task in tasks:
        out.append(para(run(f'{task["level"]}. {task["title"]}', bold=True, size=21), after=60))
        out.append(code_block(task['solution'].split('\n')))
        for case in task['results']:
            ulaz = ', '.join(case['inputs']) if case['inputs'] else '—'
            ispis = ' / '.join(case['output']) if case['output'] else '—'
            out.append(para(run(f'{ulaz}  →  {ispis}', mono=True, size=18), ind=180, after=40))
        out.append(para(after=120))
    return ''.join(out)


def build(data, path):
    rng = random.Random(20260906)
    body = [cover(data['topic'])]
    for task in data['tasks']:
        body.append(task_page(task, rng))
    body.append(answers(data['tasks']))
    sect = (f'<w:sectPr><w:pgSz w:w="{PAGE_W}" w:h="{PAGE_H}"/>'
            f'<w:pgMar w:top="{MARGIN_Y}" w:right="{MARGIN_X}" w:bottom="{MARGIN_Y}" '
            f'w:left="{MARGIN_X}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>')
    document = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                f'<w:document {NS}><w:body>{"".join(body)}{sect}</w:body></w:document>')

    styles = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
              f'<w:styles {NS}><w:docDefaults><w:rPrDefault><w:rPr>'
              '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>'
              '<w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="bs-BA"/>'
              '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>'
              '<w:spacing w:after="60" w:line="240" w:lineRule="auto"/>'
              '</w:pPr></w:pPrDefault></w:docDefaults>'
              '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
              '<w:name w:val="Normal"/></w:style></w:styles>')

    content_types = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                     '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                     '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                     '<Default Extension="xml" ContentType="application/xml"/>'
                     '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                     '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
                     '</Types>')

    rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            '</Relationships>')

    doc_rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                '</Relationships>')

    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', content_types)
        z.writestr('_rels/.rels', rels)
        z.writestr('word/document.xml', document)
        z.writestr('word/styles.xml', styles)
        z.writestr('word/_rels/document.xml.rels', doc_rels)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    with open(sys.argv[1]) as f:
        build(json.load(f), sys.argv[2])
    print(f'sveska: {sys.argv[2]}')
