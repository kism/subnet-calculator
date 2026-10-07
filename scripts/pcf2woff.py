# /// script
# requires-python = ">=3.12"
# dependencies = ["fonttools", "brotli"]
# ///
"""Convert X11 PCF bitmap fonts (optionally .Z/.gz compressed) to WOFF2/WOFF with one square per pixel.

Usage: uv run pcf2woff.py OUT_DIR FONT.pcf[.Z] ...

Each font's em is its PIXEL_SIZE, so CSS font-size: <PIXEL_SIZE>px (or a whole multiple) lands every font pixel on
the screen's pixel grid. Characters above ASCII are mapped by glyph name (Adobe Glyph List), because the Solaris 2.6
24px fonts claim ISO8859-1 but use Adobe StandardEncoding in the upper half; that also picks up glyphs the encoding
never reached (curly quotes, dashes, bullet, ellipsis, fi/fl, OE...). Fonts without glyph names must be ISO8859-1.
"""

import struct
import subprocess
import sys
from pathlib import Path

from fontTools import agl
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen

UNITS_PER_PIXEL = 128

PROPERTIES, ACCELERATORS, METRICS, BITMAPS, ENCODINGS, GLYPH_NAMES, BDF_ACCELERATORS = 1, 2, 4, 8, 32, 128, 0x100
BYTE_MSB, BIT_MSB, COMPRESSED_METRICS = 4, 8, 0x100


def read(path: Path) -> bytes:
    data = path.read_bytes()
    if data[:2] in (b"\x1f\x9d", b"\x1f\x8b"):  # .Z (LZW) or .gz; Python's gzip only does the latter
        data = subprocess.run(["gzip", "-dc"], input=data, capture_output=True, check=True).stdout
    return data


def parse_pcf(data: bytes) -> dict:
    assert data[:4] == b"\x01fcp", "not a PCF font"
    (count,) = struct.unpack_from("<i", data, 4)
    tables = {}
    for i in range(count):
        kind, fmt, _size, offset = struct.unpack_from("<4i", data, 8 + 16 * i)
        tables[kind] = (fmt, offset)

    def table(kind):
        fmt, offset = tables[kind]
        (inner,) = struct.unpack_from("<i", data, offset)  # every table repeats its format, always LSB
        assert inner == fmt
        return fmt, ">" if fmt & BYTE_MSB else "<", offset + 4

    _, e, p = table(PROPERTIES)
    (n,) = struct.unpack_from(e + "i", data, p)
    raw = [struct.unpack_from(e + "ibi", data, p + 4 + 9 * i) for i in range(n)]
    p += 4 + 9 * n + ((4 - (n & 3)) & 3)
    (string_size,) = struct.unpack_from(e + "i", data, p)
    strings = data[p + 4 : p + 4 + string_size]

    def string(o):
        return strings[o : strings.index(b"\0", o)].decode("latin-1")

    props = {string(name): string(value) if is_str else value for name, is_str, value in raw}

    # Font ascent/descent (the line box), not always in the properties; X reads them from here
    _, e, p = table(BDF_ACCELERATORS if BDF_ACCELERATORS in tables else ACCELERATORS)
    font_ascent, font_descent = struct.unpack_from(e + "2i", data, p + 8)

    fmt, e, p = table(METRICS)
    metrics = []  # (left, right, width, ascent, descent)
    if fmt & COMPRESSED_METRICS:
        (n,) = struct.unpack_from(e + "h", data, p)
        for i in range(n):
            metrics.append(tuple(b - 0x80 for b in data[p + 2 + 5 * i : p + 7 + 5 * i]))
    else:
        (n,) = struct.unpack_from(e + "i", data, p)
        for i in range(n):
            metrics.append(struct.unpack_from(e + "5h", data, p + 4 + 12 * i))

    fmt, e, p = table(BITMAPS)
    assert (fmt >> 4) & 3 == 0, "only 1-byte scan units are handled"
    pad = 1 << (fmt & 3)
    (n,) = struct.unpack_from(e + "i", data, p)
    offsets = struct.unpack_from(e + f"{n}i", data, p + 4)
    bits_start = p + 4 + 4 * n + 16
    msb = bool(fmt & BIT_MSB)
    glyphs = []
    for (left, right, width, ascent, descent), off in zip(metrics, offsets, strict=True):
        w, h = right - left, ascent + descent
        stride = ((w + 7) // 8 + pad - 1) // pad * pad
        rows = []
        for r in range(h):
            row = data[bits_start + off + r * stride : bits_start + off + (r + 1) * stride]
            rows.append([bool(row[c >> 3] & ((0x80 >> (c & 7)) if msb else (1 << (c & 7)))) for c in range(w)])
        glyphs.append({"left": left, "width": width, "ascent": ascent, "rows": rows})

    _, e, p = table(ENCODINGS)
    min2, max2, min1, max1, _default = struct.unpack_from(e + "5h", data, p)
    assert min1 == max1 == 0, "only single-byte encodings are handled"
    encoding = {}
    for code in range(min2, max2 + 1):
        (index,) = struct.unpack_from(e + "H", data, p + 10 + 2 * (code - min2))
        if index != 0xFFFF:
            encoding[code] = index

    if GLYPH_NAMES not in tables:
        assert (props.get("CHARSET_REGISTRY"), props.get("CHARSET_ENCODING")) == ("ISO8859", "1"), "only ISO8859-1"
        cmap = encoding
    else:
        _, e, p = table(GLYPH_NAMES)
        (n,) = struct.unpack_from(e + "i", data, p)
        name_offsets = struct.unpack_from(e + f"{n}i", data, p + 4)
        p += 4 + 4 * n
        (string_size,) = struct.unpack_from(e + "i", data, p)
        strings = data[p + 4 : p + 4 + string_size]
        cmap = {}
        for index, o in enumerate(name_offsets):
            text = agl.toUnicode(string(o))
            if len(text) == 1:
                cmap.setdefault(ord(text), index)
        # ASCII keeps the X11 glyphs Solaris actually drew: ' and ` as curly quoteright/quoteleft. Not - though: X11
        # drew it as minus, which is as wide as its advance and runs into the next character ("crimson-4")
        cmap.update({code: index for code, index in encoding.items() if code < 0x80 and code != 0x2D})
    # The 10/12px hyphens end on their advance too, touching a following 4 or 7 (which start at column 0); give 1px
    if 0x2D in cmap and (hyphen := glyphs[cmap[0x2D]])["rows"]:
        hyphen["width"] = max(hyphen["width"], hyphen["left"] + len(hyphen["rows"][0]) + 1)
    return {"props": props, "ascent": font_ascent, "descent": font_descent, "glyphs": glyphs, "cmap": cmap}


def outline(pen: TTGlyphPen, glyph: dict) -> None:
    """Trace the union of the glyph's pixels into closed contours (clockwise outside, y up)."""
    rows, left, ascent = glyph["rows"], glyph["left"], glyph["ascent"]
    filled = {(c, r) for r, row in enumerate(rows) for c, on in enumerate(row) if on}
    edges = {}  # start vertex -> list of end vertices, in pixel coordinates with y down
    for c, r in filled:
        # Walk each pixel's border keeping the pixel on the right (y down), skipping edges shared with a neighbour
        for (dc, dr), a, b in (
            ((0, -1), (c, r), (c + 1, r)),
            ((1, 0), (c + 1, r), (c + 1, r + 1)),
            ((0, 1), (c + 1, r + 1), (c, r + 1)),
            ((-1, 0), (c, r + 1), (c, r)),
        ):
            if (c + dc, r + dr) not in filled:
                edges.setdefault(a, []).append(b)
    while edges:
        start = next(iter(edges))
        loop, point, direction = [start], start, None
        while True:
            options = edges[point]
            # Where two loops touch diagonally, turn right (y down) so they stay separate contours
            nxt = options.pop() if len(options) == 1 or direction is None else pick_right(point, direction, options)
            if not options:
                del edges[point]
            direction = (nxt[0] - point[0], nxt[1] - point[1])
            point = nxt
            if point == start:
                break
            loop.append(point)
        # Drop points in the middle of straight runs
        corners = [
            p
            for i, p in enumerate(loop)
            if (p[0] - loop[i - 1][0], p[1] - loop[i - 1][1]) != (loop[(i + 1) % len(loop)][0] - p[0], loop[(i + 1) % len(loop)][1] - p[1])
        ]
        for i, (c, r) in enumerate(corners):
            xy = ((left + c) * UNITS_PER_PIXEL, (ascent - r) * UNITS_PER_PIXEL)
            pen.moveTo(xy) if i == 0 else pen.lineTo(xy)
        pen.closePath()


def pick_right(point, direction, options):
    dx, dy = direction
    right = (point[0] - dy, point[1] + dx)  # y down: rotating (dx, dy) clockwise gives (-dy, dx)
    choice = right if right in options else options[0]
    options.remove(choice)
    return choice


def convert(path: Path, out_dir: Path) -> list[Path]:
    font = parse_pcf(read(path))
    props = font["props"]
    size = props["PIXEL_SIZE"]
    name = path.name.split(".")[0]
    family = f"{props['FAMILY_NAME']} {size}"
    weight = props["WEIGHT_NAME"]
    italic = props["SLANT"] in ("I", "O")
    style = " ".join(s for s in (weight if weight != "Medium" else "", "Italic" if italic else "") if s) or "Regular"

    order = [".notdef", *(f"g{i}" for i in range(len(font["glyphs"])))]
    fb = FontBuilder(size * UNITS_PER_PIXEL, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap({code: f"g{i}" for code, i in font["cmap"].items()})
    glyf, advances = {".notdef": TTGlyphPen(None).glyph()}, {".notdef": 0}
    for i, g in enumerate(font["glyphs"]):
        pen = TTGlyphPen(None)
        outline(pen, g)
        glyf[f"g{i}"] = pen.glyph()
        advances[f"g{i}"] = g["width"] * UNITS_PER_PIXEL
    fb.setupGlyf(glyf)
    table = fb.font["glyf"]
    for g in glyf.values():
        g.recalcBounds(table)
    fb.setupHorizontalMetrics({n: (adv, getattr(glyf[n], "xMin", 0)) for n, adv in advances.items()})
    ascent, descent = font["ascent"] * UNITS_PER_PIXEL, font["descent"] * UNITS_PER_PIXEL
    fb.setupHorizontalHeader(ascent=ascent, descent=-descent)
    fb.setupNameTable({"familyName": family, "styleName": style, "psName": f"{name}-{style.replace(' ', '')}"})
    fb.setupOS2(
        version=4,
        sTypoAscender=ascent,
        sTypoDescender=-descent,
        sTypoLineGap=0,
        usWinAscent=ascent,
        usWinDescent=descent,
        usWeightClass=700 if weight == "Bold" else 400,
        fsSelection=(0x01 if italic else 0) | (0x20 if weight == "Bold" else 0) | (0x40 if style == "Regular" else 0) | 0x80,
    )
    fb.setupPost(isFixedPitch=int(props.get("SPACING") in ("M", "C")))
    fb.font["head"].macStyle = (1 if weight == "Bold" else 0) | (2 if italic else 0)
    out = []
    for flavor in ("woff2", "woff"):
        fb.font.flavor = flavor
        target = out_dir / f"{name}.{flavor}"
        fb.save(target)
        out.append(target)
    return out


if __name__ == "__main__":
    out_dir = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    for arg in sys.argv[2:]:
        for target in convert(Path(arg), out_dir):
            print(target, target.stat().st_size)
