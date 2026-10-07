# /// script
# requires-python = ">=3.12"
# dependencies = ["fonttools"]
# ///
"""Turn X11 PCF bitmap fonts into a glyph atlas (a strip PNG, white pixels on transparent) plus JSON metrics, for
src/bitmapText.ts to draw text from.

Usage: uv run scripts/pcf2atlas.py OUT_DIR FONT.pcf[.Z] ...

JSON: {"ascent", "descent", "glyphs": {"<code point>": [x, width, height, left, ascent, advance]}}, in font pixels.
A glyph's bitmap is atlas columns x..x+width, rows 0..height; its top-left sits at (pen + left, baseline - ascent).
"""

import json
import struct
import sys
import zlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from pcf2woff import parse_pcf, read  # noqa: E402


def png(width: int, height: int, rows: list[bytes]) -> bytes:
    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    raw = b"".join(b"\0" + row for row in rows)
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


def convert(path: Path, out_dir: Path) -> None:
    font = parse_pcf(read(path))
    glyphs = font["glyphs"]
    used = sorted(set(font["cmap"].values()))
    x, placed = 0, {}
    for index in used:
        placed[index] = x
        x += max(1, len(glyphs[index]["rows"][0]) if glyphs[index]["rows"] else 1) + 1  # 1px gap between glyphs
    width, height = x, max(len(g["rows"]) for g in glyphs)
    pixels = [bytearray(width * 4) for _ in range(height)]
    for index, gx in placed.items():
        for r, row in enumerate(glyphs[index]["rows"]):
            for c, on in enumerate(row):
                if on:
                    pixels[r][(gx + c) * 4 : (gx + c) * 4 + 4] = b"\xff\xff\xff\xff"
    name = path.name.split(".")[0]
    (out_dir / f"{name}.png").write_bytes(png(width, height, [bytes(r) for r in pixels]))
    metrics = {
        str(code): [
            placed[i],
            len(glyphs[i]["rows"][0]) if glyphs[i]["rows"] else 0,
            len(glyphs[i]["rows"]),
            glyphs[i]["left"],
            glyphs[i]["ascent"],
            glyphs[i]["width"],
        ]
        for code, i in sorted(font["cmap"].items())
    }
    data = {"ascent": font["ascent"], "descent": font["descent"], "glyphs": metrics}
    (out_dir / f"{name}.json").write_text(json.dumps(data, separators=(",", ":")))
    print(out_dir / f"{name}.png", f"{width}x{height}", len(metrics), "glyphs")


if __name__ == "__main__":
    out_dir = Path(sys.argv[1])
    out_dir.mkdir(parents=True, exist_ok=True)
    for arg in sys.argv[2:]:
        convert(Path(arg), out_dir)
