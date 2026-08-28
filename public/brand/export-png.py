#!/usr/bin/env python3
"""Fix SVG aria-labels and regenerate PNG exports."""
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parent

MARK = """
<g transform="translate({tx},{ty}) scale({scale})">
  <rect x="8" y="6" width="56" height="64" rx="1.5" stroke="#0f1b2d" stroke-width="3.5" fill="#ffffff"/>
  <path d="M8 6 L8 70 L23 61 L23 15 Z" stroke="#0f1b2d" stroke-width="3" fill="#ffffff" stroke-linejoin="round"/>
  <line x1="8" y1="38" x2="23" y2="38" stroke="#0f1b2d" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="36" y1="6" x2="36" y2="70" stroke="#0f1b2d" stroke-width="3" stroke-linecap="round"/>
  <line x1="36" y1="38" x2="64" y2="38" stroke="#0f1b2d" stroke-width="2.8" stroke-linecap="round"/>
  <rect x="13.5" y="33" width="3.2" height="11" rx="1.2" fill="#0f1b2d"/>
  <line x1="11" y1="17" x2="18" y2="25" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="11" y1="47" x2="18" y2="55" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="42" y1="17" x2="53" y2="27" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="47" y1="47" x2="58" y2="57" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
</g>"""

FONT_STYLE = """
<style>
  @font-face {
    font-family: 'UnboundedBrand';
    src: url('fonts/Unbounded-Bold.ttf') format('truetype');
    font-weight: 700;
  }
  @font-face {
    font-family: 'ManropeBrand';
    src: url('fonts/Manrope-Medium.ttf') format('truetype');
    font-weight: 500;
  }
</style>"""

MARK_INNER = """
    <rect x="8" y="6" width="56" height="64" rx="1.5" stroke="#0f1b2d" stroke-width="3.5" fill="#ffffff"/>
    <path d="M8 6 L8 70 L23 61 L23 15 Z" stroke="#0f1b2d" stroke-width="3" fill="#ffffff" stroke-linejoin="round"/>
    <line x1="8" y1="38" x2="23" y2="38" stroke="#0f1b2d" stroke-width="2.8" stroke-linecap="round"/>
    <line x1="36" y1="6" x2="36" y2="70" stroke="#0f1b2d" stroke-width="3" stroke-linecap="round"/>
    <line x1="36" y1="38" x2="64" y2="38" stroke="#0f1b2d" stroke-width="2.8" stroke-linecap="round"/>
    <rect x="13.5" y="33" width="3.2" height="11" rx="1.2" fill="#0f1b2d"/>
    <line x1="11" y1="17" x2="18" y2="25" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="11" y1="47" x2="18" y2="55" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="42" y1="17" x2="53" y2="27" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="47" y1="47" x2="58" y2="57" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>"""


def write_svgs() -> None:
    (ROOT / "logo-main.svg").write_text(
        f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 100" fill="none" aria-label="OkonFort">
  <defs>{FONT_STYLE}</defs>
  <g id="brand-main">
    <rect width="520" height="100" fill="#ffffff"/>
    <g id="okonfort-mark" transform="translate(0,10)">{MARK_INNER}
    </g>
    <text x="88" y="48" font-family="UnboundedBrand,sans-serif" font-size="32" font-weight="700">
      <tspan fill="#0f1b2d">\u041e\u043a\u043e\u043d\u0424\u043e\u0440\u0442</tspan><tspan fill="#38bdf8">.\u0440\u0444</tspan>
    </text>
    <text x="88" y="74" font-family="ManropeBrand,sans-serif" font-size="12" font-weight="500" fill="#0f1b2d" letter-spacing="4.2">\u041e\u041a\u041d\u0410 \u041f\u0412\u0425 \u0412 \u0418\u0412\u0410\u041d\u041e\u0412\u0415</text>
  </g>
</svg>''',
        encoding="utf-8",
    )

    (ROOT / "logo-short.svg").write_text(
        f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 76" fill="none" aria-label="OkonFort short">
  <defs>{FONT_STYLE}</defs>
  <rect width="420" height="76" fill="#ffffff"/>
  <g id="okonfort-mark">{MARK_INNER}
  </g>
  <text x="88" y="48" font-family="UnboundedBrand,sans-serif" font-size="32" font-weight="700">
    <tspan fill="#0f1b2d">\u041e\u043a\u043e\u043d\u0424\u043e\u0440\u0442</tspan><tspan fill="#38bdf8">.\u0440\u0444</tspan>
  </text>
</svg>''',
        encoding="utf-8",
    )

    (ROOT / "logo-icon.svg").write_text(
        f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 80" fill="none" aria-label="OkonFort icon">
  <g id="okonfort-mark">{MARK_INNER}
  </g>
</svg>''',
        encoding="utf-8",
    )

    (ROOT / "logo-white.svg").write_text(
        f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 100" fill="none" aria-label="OkonFort white">
  <defs>{FONT_STYLE}</defs>
  <g id="brand-white">
    <g id="okonfort-mark" transform="translate(0,10)">
      <rect x="8" y="6" width="56" height="64" rx="1.5" stroke="#ffffff" stroke-width="3.5" fill="none"/>
      <path d="M8 6 L8 70 L23 61 L23 15 Z" stroke="#ffffff" stroke-width="3" fill="none" stroke-linejoin="round"/>
      <line x1="8" y1="38" x2="23" y2="38" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round"/>
      <line x1="36" y1="6" x2="36" y2="70" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
      <line x1="36" y1="38" x2="64" y2="38" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round"/>
      <rect x="13.5" y="33" width="3.2" height="11" rx="1.2" fill="#ffffff"/>
      <line x1="11" y1="17" x2="18" y2="25" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="11" y1="47" x2="18" y2="55" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="42" y1="17" x2="53" y2="27" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="47" y1="47" x2="58" y2="57" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    <text x="88" y="48" font-family="UnboundedBrand,sans-serif" font-size="32" font-weight="700">
      <tspan fill="#ffffff">\u041e\u043a\u043e\u043d\u0424\u043e\u0440\u0442</tspan><tspan fill="#38bdf8">.\u0440\u0444</tspan>
    </text>
    <text x="88" y="74" font-family="ManropeBrand,sans-serif" font-size="12" font-weight="500" fill="#ffffff" letter-spacing="4.2">\u041e\u041a\u041d\u0410 \u041f\u0412\u0425 \u0412 \u0418\u0412\u0410\u041d\u041e\u0412\u0415</text>
  </g>
</svg>''',
        encoding="utf-8",
    )

    (ROOT / "favicon.svg").write_text(
        f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" aria-label="OkonFort favicon">
  <g id="okonfort-mark" transform="translate(2,3) scale(0.36)">
    <rect x="8" y="6" width="56" height="64" rx="1.5" stroke="#0f1b2d" stroke-width="4" fill="#ffffff"/>
    <path d="M8 6 L8 70 L23 61 L23 15 Z" stroke="#0f1b2d" stroke-width="3.5" fill="#ffffff" stroke-linejoin="round"/>
    <line x1="8" y1="38" x2="23" y2="38" stroke="#0f1b2d" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="36" y1="6" x2="36" y2="70" stroke="#0f1b2d" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="36" y1="38" x2="64" y2="38" stroke="#0f1b2d" stroke-width="3.2" stroke-linecap="round"/>
    <rect x="13.5" y="33" width="3.2" height="11" rx="1.2" fill="#0f1b2d"/>
    <line x1="11" y1="17" x2="18" y2="25" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="11" y1="47" x2="18" y2="55" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="42" y1="17" x2="53" y2="27" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="47" y1="47" x2="58" y2="57" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
  </g>
</svg>''',
        encoding="utf-8",
    )


def png(svg: str, path: Path, w: int, h: int) -> None:
    path.write_bytes(cairosvg.svg2png(bytestring=svg.encode("utf-8"), output_width=w, output_height=h))


def avatar(path: Path, size: int) -> None:
    scale = (size * 0.28) / 72
    tx = (size - 72 * scale) / 2
    ty = (size - 80 * scale) / 2
    png(
        f'<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}"><rect width="{size}" height="{size}" fill="#ffffff"/>{MARK.format(tx=tx, ty=ty, scale=scale)}</svg>',
        path,
        size,
        size,
    )


def og(path: Path) -> None:
    inner = (ROOT / "logo-main.svg").read_text(encoding="utf-8")
    start = inner.index('<g id="brand-main">')
    end = inner.rindex("</g>") + 5
    block = inner[start:end]
    png(
        f'<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#ffffff"/><svg x="340" y="165" width="520" height="300" viewBox="0 0 520 100">{block}</svg></svg>',
        path,
        1200,
        630,
    )


def main() -> None:
    write_svgs()
    cairosvg.svg2png(url=str(ROOT / "favicon.svg"), write_to=str(ROOT / "favicon-32.png"), output_width=32, output_height=32)
    avatar(ROOT / "avatar-1024.png", 1024)
    avatar(ROOT / "avatar-512.png", 512)
    scale = (180 * 0.55) / 72
    tx = (180 - 72 * scale) / 2
    ty = (180 - 80 * scale) / 2
    png(
        f'<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><rect width="180" height="180" fill="#ffffff"/>{MARK.format(tx=tx, ty=ty, scale=scale)}</svg>',
        ROOT / "apple-touch-icon.png",
        180,
        180,
    )
    og(ROOT / "og-image.png")

    checks = [
        ("logo-main.svg", None),
        ("logo-short.svg", None),
        ("logo-icon.svg", None),
        ("logo-white.svg", None),
        ("favicon.svg", None),
        ("avatar-1024.png", (1024, 1024)),
        ("avatar-512.png", (512, 512)),
        ("favicon-32.png", (32, 32)),
        ("apple-touch-icon.png", (180, 180)),
        ("og-image.png", (1200, 630)),
    ]
    for name, size in checks:
        p = ROOT / name
        assert p.exists()
        if size:
            with Image.open(p) as im:
                assert im.size == size
        if p.suffix == ".svg":
            t = p.read_text(encoding="utf-8")
            assert "<image" not in t
    print("OK", len(checks), "files")


if __name__ == "__main__":
    main()
