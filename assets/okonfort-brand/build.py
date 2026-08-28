#!/usr/bin/env python3
"""Generate ОконФорт brand kit from variant 7 reference — true SVG + PNG exports."""
from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).resolve().parent
FONTS = ROOT / "fonts"
SVG_DIR = ROOT / "svg"
PNG_DIR = ROOT / "png"
REF = ROOT.parent / "logo" / "variants" / "okonfort-variant-7-site-style.png"

INK = "#0f1b2d"
RF = "#38bdf8"
NAVY = "#132238"
WHITE = "#ffffff"

FONT_UNBOUNDED = FONTS / "Unbounded-Bold.ttf"
FONT_MANROPE = FONTS / "Manrope-Medium.ttf"
FONT_MANROPE_SB = FONTS / "Manrope-SemiBold.ttf"

# Variant 7 window mark — perspective open sash, vector paths only
MARK = """
<g id="okonfort-mark">
  <rect x="8" y="6" width="56" height="64" rx="1.5" stroke="{ink}" stroke-width="3.5" fill="{fill}"/>
  <path d="M8 6 L8 70 L23 61 L23 15 Z" stroke="{ink}" stroke-width="3" fill="{fill}" stroke-linejoin="round"/>
  <line x1="8" y1="38" x2="23" y2="38" stroke="{ink}" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="36" y1="6" x2="36" y2="70" stroke="{ink}" stroke-width="3" stroke-linecap="round"/>
  <line x1="36" y1="38" x2="64" y2="38" stroke="{ink}" stroke-width="2.8" stroke-linecap="round"/>
  <rect x="13.5" y="33" width="3.2" height="11" rx="1.2" fill="{ink}"/>
  <line x1="11" y1="17" x2="18" y2="25" stroke="{rf}" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="11" y1="47" x2="18" y2="55" stroke="{rf}" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="42" y1="17" x2="53" y2="27" stroke="{rf}" stroke-width="2.2" stroke-linecap="round"/>
  <line x1="47" y1="47" x2="58" y2="57" stroke="{rf}" stroke-width="2.2" stroke-linecap="round"/>
</g>
"""

FONT_FACE = """
<style type="text/css">
  @font-face {
    font-family: 'UnboundedBrand';
    src: url('../fonts/Unbounded-Bold.ttf') format('truetype');
    font-weight: 700;
  }
  @font-face {
    font-family: 'ManropeBrand';
    src: url('../fonts/Manrope-Medium.ttf') format('truetype');
    font-weight: 500;
  }
  @font-face {
    font-family: 'ManropeBrand';
    src: url('../fonts/Manrope-SemiBold.ttf') format('truetype');
    font-weight: 600;
  }
</style>
"""

MANIFEST: list[dict] = []


def mark(fill: str = WHITE, ink: str = INK, rf: str = RF) -> str:
    return MARK.format(fill=fill, ink=ink, rf=rf)


def svg_wrap(content: str, w: int | float, h: int | float, label: str = "") -> str:
    aria = f' aria-label="{label}"' if label else ""
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" fill="none"{aria}>\n'
        f"{FONT_FACE}\n{content}\n</svg>"
    )


def logo_horizontal_svg(*, white: bool = False, mono: bool = False, for_png: bool = False) -> str:
    text = WHITE if white else INK
    rf = RF if not mono else text
    tag = WHITE if white else INK
    fill = NAVY if white else WHITE
    bg = NAVY if white else (WHITE if for_png else "none")
    m = mark(fill=fill if not white else NAVY, ink=text if not white else WHITE, rf=rf if not mono else text)
    bg_rect = f'<rect width="480" height="96" fill="{bg}"/>' if bg != "none" else ""
    return svg_wrap(
        f"""{bg_rect}
  <g transform="translate(4,8) scale(1)">{m}</g>
  <text x="92" y="46" font-family="UnboundedBrand,sans-serif" font-size="32" font-weight="700">
    <tspan fill="{text}">ОконФорт</tspan><tspan fill="{rf}">.рф</tspan>
  </text>
  <text x="92" y="72" font-family="ManropeBrand,sans-serif" font-size="13" font-weight="500" fill="{tag}" letter-spacing="3.2">окна ПВХ в Иванове</text>""",
        480,
        96,
        "ОконФорт.рф — окна ПВХ в Иванове",
    )


def logo_stacked_svg(*, for_png: bool = False) -> str:
    m = mark()
    bg = f'<rect width="400" height="220" fill="{WHITE}"/>' if for_png else ""
    return svg_wrap(
        f"""{bg}
  <g transform="translate(164,16)">{m}</g>
  <text x="200" y="128" text-anchor="middle" font-family="UnboundedBrand,sans-serif" font-size="24" font-weight="700">
    <tspan fill="{INK}">ОконФорт</tspan><tspan fill="{RF}">.рф</tspan>
  </text>
  <text x="200" y="156" text-anchor="middle" font-family="ManropeBrand,sans-serif" font-size="12" font-weight="500" fill="{INK}" letter-spacing="2.8">окна ПВХ в Иванове</text>""",
        400,
        220,
        "ОконФорт.рф",
    )


def logo_icon_svg(*, bg: str | None = None, pad: float = 16) -> str:
    size = 80 + pad * 2
    bg_rect = f'<rect width="{size}" height="{size}" rx="{size * 0.18:.1f}" fill="{bg}"/>' if bg else ""
    return svg_wrap(
        f"""{bg_rect}
  <g transform="translate({pad},{pad})">{mark(fill=WHITE if bg else WHITE, ink=WHITE if bg else INK, rf=RF)}</g>""",
        size,
        size,
        "ОконФорт",
    )


def avatar_svg() -> str:
    m = mark(fill=NAVY, ink=WHITE, rf=RF)
    return svg_wrap(
        f"""<rect width="512" height="512" rx="112" fill="{NAVY}"/>
  <g transform="translate(216,108) scale(1.05)">{m}</g>
  <text x="256" y="352" text-anchor="middle" font-family="UnboundedBrand,sans-serif" font-size="38" font-weight="700">
    <tspan fill="{WHITE}">ОконФорт</tspan><tspan fill="{RF}">.рф</tspan>
  </text>""",
        512,
        512,
        "ОконФорт.рф",
    )


def favicon_svg() -> str:
    m = mark(fill=NAVY, ink=WHITE, rf=RF)
    return svg_wrap(
        f"""<rect width="64" height="64" rx="8" fill="{NAVY}"/>
  <g transform="translate(8,6) scale(0.62)">{m}</g>""",
        64,
        64,
        "ОконФорт",
    )


def logo_mono_svg() -> str:
    return logo_horizontal_svg(mono=True)


def render_svg(svg_path: Path, png_path: Path, width: int, height: int | None = None) -> None:
    png_path.parent.mkdir(parents=True, exist_ok=True)
    kwargs = {"url": str(svg_path), "write_to": str(png_path), "output_width": width}
    if height:
        kwargs["output_height"] = height
    cairosvg.svg2png(**kwargs)


def render_svg_square(svg_path: Path, png_path: Path, size: int) -> None:
    render_svg(svg_path, png_path, size, size)


def png_size(path: Path) -> tuple[int, int]:
    with Image.open(path) as im:
        return im.size


def write_ico(png_paths: list[tuple[int, Path]], ico_path: Path) -> None:
    images = [Image.open(p).convert("RGBA") for _, p in png_paths]
    sizes = [(im.size[0], im.size[1]) for im in images]
    ico_path.parent.mkdir(parents=True, exist_ok=True)
    images[0].save(ico_path, format="ICO", sizes=sizes, append_images=images[1:])


def add(path: Path, kind: str, size: str, note: str) -> None:
    MANIFEST.append({"file": str(path.relative_to(ROOT)), "type": kind, "size": size, "note": note})


def main() -> None:
    assert REF.exists(), f"Reference variant 7 not found: {REF}"

    SVG_DIR.mkdir(parents=True, exist_ok=True)
    PNG_DIR.mkdir(parents=True, exist_ok=True)

    svgs = {
        "logo-horizontal.svg": logo_horizontal_svg(),
        "logo-horizontal-white.svg": logo_horizontal_svg(white=True),
        "logo-horizontal-mono.svg": logo_mono_svg(),
        "logo-stacked.svg": logo_stacked_svg(),
        "logo-icon.svg": logo_icon_svg(),
        "logo-icon-on-navy.svg": logo_icon_svg(bg=NAVY, pad=20),
        "avatar.svg": avatar_svg(),
        "favicon.svg": favicon_svg(),
    }

    # PNG-specific SVGs with solid backgrounds where needed
    png_svgs = {
        "logo-horizontal.png": ("_export-horizontal.svg", logo_horizontal_svg(for_png=True)),
        "logo-horizontal@2x.png": ("_export-horizontal.svg", logo_horizontal_svg(for_png=True)),
        "logo-horizontal-sm.png": ("_export-horizontal.svg", logo_horizontal_svg(for_png=True)),
        "logo-horizontal-mono.png": ("_export-horizontal-mono.svg", logo_horizontal_svg(mono=True, for_png=True)),
        "logo-stacked.png": ("_export-stacked.svg", logo_stacked_svg(for_png=True)),
    }

    for name, content in svgs.items():
        p = SVG_DIR / name
        p.write_text(content, encoding="utf-8")
        add(p, "SVG", "вектор", name)

    exports = [
        ("logo-horizontal.svg", "_export-horizontal.svg", "logo-horizontal.png", 960, None),
        ("logo-horizontal.svg", "_export-horizontal.svg", "logo-horizontal@2x.png", 1920, None),
        ("logo-horizontal.svg", "_export-horizontal.svg", "logo-horizontal-sm.png", 480, None),
        ("logo-horizontal-white.svg", "logo-horizontal-white.svg", "logo-horizontal-white.png", 960, None),
        ("logo-horizontal-mono.svg", "_export-horizontal-mono.svg", "logo-horizontal-mono.png", 960, None),
        ("logo-stacked.svg", "_export-stacked.svg", "logo-stacked.png", 720, None),
        ("logo-icon.svg", "logo-icon.svg", "logo-icon-512.png", 512, 512),
        ("logo-icon.svg", "logo-icon.svg", "logo-icon-256.png", 256, 256),
        ("logo-icon.svg", "logo-icon.svg", "logo-icon-128.png", 128, 128),
        ("logo-icon-on-navy.svg", "logo-icon-on-navy.svg", "logo-icon-on-navy-512.png", 512, 512),
        ("avatar.svg", "avatar.svg", "avatar-512.png", 512, 512),
        ("avatar.svg", "avatar.svg", "avatar-256.png", 256, 256),
        ("avatar.svg", "avatar.svg", "avatar-128.png", 128, 128),
        ("favicon.svg", "favicon.svg", "favicon-32.png", 32, 32),
        ("favicon.svg", "favicon.svg", "favicon-16.png", 16, 16),
        ("favicon.svg", "favicon.svg", "apple-touch-icon.png", 180, 180),
        ("favicon.svg", "favicon.svg", "icon-192.png", 192, 192),
        ("favicon.svg", "favicon.svg", "icon-512.png", 512, 512),
    ]

    for _, export_name, png_name, w, h in exports:
        if export_name.startswith("_"):
            content = png_svgs[png_name][1]
            sp = SVG_DIR / export_name
            sp.write_text(content, encoding="utf-8")
        else:
            sp = SVG_DIR / export_name
        pp = PNG_DIR / png_name
        render_svg(sp, pp, w, h)
        actual = png_size(pp)
        add(pp, "PNG", f"{actual[0]}×{actual[1]}", png_name)

    write_ico(
        [(16, PNG_DIR / "favicon-16.png"), (32, PNG_DIR / "favicon-32.png"), (48, PNG_DIR / "favicon-32.png")],
        PNG_DIR / "favicon.ico",
    )
    add(PNG_DIR / "favicon.ico", "ICO", "16/32/48", "favicon для сайта")

    # Verify no embedded rasters in SVG
    for sp in SVG_DIR.glob("*.svg"):
        text = sp.read_text(encoding="utf-8")
        assert "<image" not in text, f"Raster embedded in {sp.name}"
        assert "data:image" not in text, f"Base64 raster in {sp.name}"

    (ROOT / "manifest.json").write_text(json.dumps(MANIFEST, ensure_ascii=False, indent=2), encoding="utf-8")

    readme = ROOT / "README.txt"
    readme.write_text(
        "\n".join(
            [
                "ОконФорт — фирменные логотипы и аватарки",
                "Референс: assets/logo/variants/okonfort-variant-7-site-style.png (вариант 7)",
                "",
                "SVG — векторные файлы (svg/), PNG — экспорт (png/)",
                "Шрифты: Unbounded Bold + Manrope (fonts/)",
                "",
                "Цвета варианта 7:",
                f"  Текст/рамка: {INK}",
                f"  .рф / блики: {RF}",
                f"  Фон аватарок: {NAVY}",
                "",
                "Файлы:",
                *[f"  {m['file']} — {m['size']} — {m['note']}" for m in MANIFEST],
            ]
        ),
        encoding="utf-8",
    )

    print(f"Created {len(MANIFEST)} files in {ROOT}")
    for m in MANIFEST:
        if m["type"] == "PNG":
            p = ROOT / m["file"]
            w, h = png_size(p)
            print(f"  OK {m['file']} {w}x{h}")


if __name__ == "__main__":
    main()
