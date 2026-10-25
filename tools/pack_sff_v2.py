#!/usr/bin/env python3
"""Pack RGBA PNGs into Elecbyte SFF v2 (format 12) for Ikemen GO.

Usage:
  python3 tools/pack_sff_v2.py --char howard
  python3 tools/pack_sff_v2.py --all
"""
from __future__ import annotations

import argparse
import io
import struct
from pathlib import Path

from PIL import Image, ImageEnhance

ROOT = Path("/workspace/fiiight")
CHARS = ["howard", "chiihoward", "hornam", "percy", "tyrus", "daddy"]

# Target fight sprite height roughly matching KFM720 idle (~420px)
TARGET_H = 360

# Map art pose name -> list of (group, index) to emit.
# We fill every group/index the KFM .air references so missing-sprite
# fallbacks don't flash blank. Same pose is linked (size=0) after first write.
POSE_TO_GROUPS: dict[str, list[tuple[int, int]]] = {
    # Idle breathing: slight variants if we have idle_2/3 else same
    "idle": [(0, i) for i in range(6)],
    "walk": [(20, i) for i in range(16)] + [(21, i) for i in range(16)],
    "crouch": [(11, 0), (11, 1), (11, 2), (5, 0), (6, 0)],
    "jump": (
        [(41, i) for i in range(9)]
        + [(42, i) for i in (0, 1, 3, 4, 5)]
        + [(43, 0), (43, 1)]
    ),
    "punch": (
        [(200, i) for i in range(3)]
        + [(210, i) for i in range(6)]
        + [(100, i) for i in range(6)]
        + [(181, i) for i in range(7)]
        + [(191, i) for i in range(4)]
        + [(192, i) for i in range(2)]
    ),
    "kick": (
        [(230, i) for i in range(3)]
        + [(240, i) for i in range(6)]
        + [(400, i) for i in range(2)]
        + [(410, i) for i in range(5)]
        + [(430, i) for i in range(4)]
        + [(440, i) for i in range(7)]
        + [(600, i) for i in range(2)]
        + [(610, i) for i in range(4)]
        + [(630, 1), (630, 2)]
        + [(640, i) for i in range(3)]
    ),
    "hurt": (
        [(5000, i) for i in (0, 10, 11, 20, 21)]
        + [(5010, i) for i in (0, 10, 20, 21)]
        + [(5011, 0)]
        + [(5020, i) for i in (0, 10, 20)]
        + [(5030, i) for i in (0, 10, 30, 31, 40, 50)]
        + [(5031, 0)]
        + [(5040, i) for i in (0, 1, 10, 11, 20)]
        + [(5060, i) for i in (0, 1, 10)]
        + [(5061, 0)]
        + [(5071, i) for i in (0, 10, 20)]
        + [(5300, i) for i in range(4)]
    ),
    "ko": [(120, i) for i in range(3)] + [(121, 0), (122, 0)],
    "victory": [(180, 0)] if False else [],  # filled below via specials
    "portrait": [(9000, 0), (9000, 1)],
    # specials / extras mapped onto remaining KFM groups
    "block": [(120, 0)],  # overwritten by richer map below
    "ready_f": [(1000, i) for i in range(8)],
    "strike_up": [(1050, i) for i in range(8)] + [(1052, i) for i in range(4)] + [(1055, i) for i in range(8)],
    "strike_down": [(1100, i) for i in range(10)],
    "spin": [(1210, i) for i in range(7)],
    "air_fwd": [(1300, i) for i in range(3)] + [(1320, i) for i in range(3)] + [(1340, i) for i in range(2)],
    "cast": [(1400, i) for i in range(8)],
    "charge": [(800, i) for i in range(13)],
    "ultimate": [(1400, i) for i in range(8)],
    "dash": [(100, i) for i in range(6)],
    "fall": [(42, i) for i in (0, 1, 3, 4, 5)],
}

# Cleaner explicit group coverage built at runtime
def build_group_plan(art: dict[str, Path]) -> list[tuple[int, int, str]]:
    """Return list of (group, index, pose_key) covering AIR-needed slots."""
    def pick(*names: str) -> str:
        for n in names:
            if n in art:
                return n
        return "idle"

    plan: list[tuple[int, int, str]] = []

    idle = pick("idle", "idle_2", "idle_3")
    idle2 = pick("idle_2", "idle", "idle_3")
    idle3 = pick("idle_3", "idle_2", "idle")
    for i, p in enumerate([idle, idle2, idle3, idle2, idle, idle]):
        plan.append((0, i, p))

    walk = pick("walk", "run_1", "idle")
    runs = [pick(f"run_{i}", "walk", "idle") for i in range(1, 5)]
    walk_cycle = (runs + [walk]) * 3 + runs[:1]  # 16
    for i in range(16):
        plan.append((20, i, walk_cycle[i % len(walk_cycle)]))
        plan.append((21, i, walk_cycle[(i + 2) % len(walk_cycle)]))

    crouch = pick("crouch", "idle")
    for i in range(3):
        plan.append((11, i, crouch))
    plan.append((5, 0, idle))
    plan.append((6, 0, idle))

    jump = pick("jump", "idle")
    fall = pick("fall", "jump", "idle")
    for i in range(9):
        plan.append((41, i, jump if i < 5 else fall))
    for i in (0, 1, 3, 4, 5):
        plan.append((42, i, fall))
    plan.append((43, 0, jump))
    plan.append((43, 1, fall))

    punch = pick("punch", "strike_up", "ready_f", "idle")
    kick = pick("kick", "strike_down", "punch", "idle")
    ready = pick("ready_f", "idle")
    for g, nmax, pose in [
        (200, 3, punch),
        (210, 6, punch),
        (230, 3, kick),
        (240, 6, kick),
        (100, 6, ready),
        (181, 7, punch),
        (191, 4, punch),
        (192, 2, punch),
        (400, 2, kick),
        (410, 5, kick),
        (430, 4, kick),
        (440, 7, kick),
        (600, 2, kick),
        (610, 4, kick),
        (640, 3, kick),
    ]:
        for i in range(nmax):
            plan.append((g, i, pose))
    plan.append((630, 1, kick))
    plan.append((630, 2, kick))

    hurt = pick("hurt", "idle")
    ko = pick("ko", "hurt", "idle")
    for g, idxs in [
        (5000, (0, 10, 11, 20, 21)),
        (5010, (0, 10, 20, 21)),
        (5011, (0,)),
        (5020, (0, 10, 20)),
        (5030, (0, 10, 30, 31, 40, 50)),
        (5031, (0,)),
        (5040, (0, 1, 10, 11, 20)),
        (5060, (0, 1, 10)),
        (5061, (0,)),
        (5071, (0, 10, 20)),
        (5300, (0, 1, 2, 3)),
    ]:
        for i in idxs:
            plan.append((g, i, hurt if g < 5030 or g == 5300 else ko if g >= 5060 else hurt))

    for i in range(3):
        plan.append((120, i, pick("block", "idle")))
    plan.append((121, 0, pick("block", "idle")))
    plan.append((122, 0, pick("block", "idle")))

    # specials
    for g, n, pose in [
        (800, 13, pick("charge", "idle")),
        (1000, 8, pick("ready_f", "punch", "idle")),
        (1050, 8, pick("strike_up", "punch", "idle")),
        (1052, 4, pick("strike_up", "punch", "idle")),
        (1055, 8, pick("strike_up", "punch", "idle")),
        (1100, 10, pick("strike_down", "kick", "idle")),
        (1210, 7, pick("spin", "punch", "idle")),
        (1300, 3, pick("air_fwd", "jump", "idle")),
        (1320, 3, pick("air_fwd", "jump", "idle")),
        (1340, 2, pick("air_fwd", "jump", "idle")),
        (1400, 8, pick("ultimate", "cast", "punch", "idle")),
    ]:
        for i in range(n):
            plan.append((g, i, pose))

    # portraits
    plan.append((9000, 0, pick("portrait", "portrait_paint", "idle")))
    plan.append((9000, 1, pick("portrait", "portrait_paint", "idle")))

    # blank / -1 used in some intros — tiny transparent
    plan.append((65535, 0, idle))  # placeholder unused; -1 handled separately
    return plan


def load_art(char: str) -> dict[str, Path]:
    d = ROOT / "content" / "chars" / char / "art"
    out: dict[str, Path] = {}
    if not d.is_dir():
        return out
    for p in d.glob("*.png"):
        out[p.stem] = p
    # Prefer Codex idle over idle_paint
    return out


def prepare_rgba(path: Path, target_h: int, portrait: bool = False) -> tuple[Image.Image, int, int]:
    im = Image.open(path).convert("RGBA")
    # Trim near-transparent borders
    bbox = im.split()[-1].point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    if portrait:
        # select portrait: keep reasonably large; motif scales .25
        # Make ~400px square-ish bust for 9000,0 and larger for 9000,1 handled by caller
        scale = 400 / max(h, 1)
    else:
        scale = target_h / max(h, 1)
    nw, nh = max(1, int(w * scale)), max(1, int(h * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    # Axis: feet center
    ax = nw // 2
    ay = nh - 2
    return im, ax, ay


def png_blob(im: Image.Image) -> bytes:
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    png = buf.getvalue()
    # 4-byte uncompressed size prefix (RGBA bytes) + PNG, as used by Ikemen format 12
    uncomp = im.size[0] * im.size[1] * 4
    return struct.pack("<I", uncomp) + png


def pack_char(char: str, out_path: Path | None = None) -> Path:
    art = load_art(char)
    if "idle" not in art and "idle_paint" not in art:
        raise SystemExit(f"{char}: no idle art")
    # normalize aliases
    if "idle" not in art and "idle_paint" in art:
        art["idle"] = art["idle_paint"]
    if "portrait" not in art and "portrait_paint" in art:
        art["portrait"] = art["portrait_paint"]

    plan = build_group_plan(art)
    # Deduplicate (group,index) keeping first
    seen: set[tuple[int, int]] = set()
    unique_plan: list[tuple[int, int, str]] = []
    for g, i, pose in plan:
        if g == 65535:
            continue
        key = (g, i)
        if key in seen:
            continue
        seen.add(key)
        unique_plan.append((g, i, pose))

    # Prepare image cache keyed by pose (+ portrait size variant)
    img_cache: dict[str, tuple[bytes, int, int, int, int]] = {}

    def get_sprite(pose: str, group: int, index: int):
        cache_key = pose
        if group == 9000 and index == 0:
            cache_key = pose + "#small"
        elif group == 9000 and index == 1:
            cache_key = pose + "#big"
        if cache_key in img_cache:
            return img_cache[cache_key]
        path = art.get(pose) or art["idle"]
        if group == 9000:
            im0 = Image.open(path).convert("RGBA")
            bbox = im0.split()[-1].point(lambda a: 255 if a > 8 else 0).getbbox()
            if bbox:
                im0 = im0.crop(bbox)
            if index == 0:
                # small select icon ~200
                th = 200
            else:
                th = 560
            scale = th / max(im0.size[1], 1)
            nw, nh = max(1, int(im0.size[0] * scale)), max(1, int(im0.size[1] * scale))
            im = im0.resize((nw, nh), Image.Resampling.LANCZOS)
            ax, ay = 0, 0  # portraits typically top-left axis
        else:
            im, ax, ay = prepare_rgba(path, TARGET_H)
            # tiny idle breathing: nudge scale for idle_2/3 variety already from different files
        blob = png_blob(im)
        img_cache[cache_key] = (blob, im.size[0], im.size[1], ax, ay)
        return img_cache[cache_key]

    # Build sprite list with linking for identical blobs
    sprites = []  # dicts
    blob_to_first: dict[bytes, int] = {}
    ldata = bytearray()

    for g, i, pose in unique_plan:
        blob, w, h, ax, ay = get_sprite(pose, g, i)
        if blob in blob_to_first:
            link = blob_to_first[blob]
            sprites.append(
                dict(group=g, number=i, w=w, h=h, ax=ax, ay=ay, link=link, fmt=12, depth=32, dofs=0, dlen=0, pal=0, flags=0, blob=None)
            )
        else:
            dofs = len(ldata)
            ldata += blob
            idx = len(sprites)
            blob_to_first[blob] = idx
            sprites.append(
                dict(group=g, number=i, w=w, h=h, ax=ax, ay=ay, link=0, fmt=12, depth=32, dofs=dofs, dlen=len(blob), pal=0, flags=0, blob=blob)
            )

    # One dummy RGBA palette (1024 bytes) for compatibility
    pal_data = bytearray()
    for i in range(256):
        if i == 0:
            pal_data += bytes((0, 0, 0, 0))
        else:
            pal_data += bytes((i, i, i, 255))

    # Layout: header 512 | pal nodes | sprite nodes | ldata (pal pixels + sprite pngs)
    HEADER = 512
    num_pal = 1
    num_spr = len(sprites)
    pal_node_off = HEADER
    spr_node_off = pal_node_off + num_pal * 16
    # put palette pixel data at start of ldata, then sprite blobs (already in ldata) need shift
    # Rebuild: pal first, then sprites
    sprite_blobs = bytes(ldata)
    ldata2 = bytearray(pal_data)
    # rewrite sprite dofs relative to new ldata (after palette)
    pal_len = len(pal_data)
    for s in sprites:
        if s["dlen"]:
            s["dofs"] = pal_len + s["dofs"]
    ldata2 += sprite_blobs

    lofs = spr_node_off + num_spr * 28
    tofs = lofs + len(ldata2)  # unused

    out = bytearray()
    # SFF v2 header (matches Ikemen image.go SffHeader.Read)
    # sig[12] + verlo3,verlo2,verlo1,verhi + dummy + 4*dummy + sprite/pal/lofs/dummy/tofs
    out += b"ElecbyteSpr\x00"
    out += bytes((0, 1, 0, 2))  # v2.01
    out += struct.pack("<I", 0)  # reserved @16
    out += struct.pack("<IIII", 0, 0, 0, 0)  # 4 dummies @20..32
    assert len(out) == 36
    out += struct.pack("<I", spr_node_off)
    out += struct.pack("<I", num_spr)
    out += struct.pack("<I", pal_node_off)
    out += struct.pack("<I", num_pal)
    out += struct.pack("<I", lofs)
    out += struct.pack("<I", len(ldata2))  # Go reads as dummy
    out += struct.pack("<I", tofs)
    if len(out) < HEADER:
        out += bytes(HEADER - len(out))
    assert len(out) == HEADER

    # Palette node (16 bytes): group, item, numcols, index, data_offset, data_length
    # data_offset relative to lofs
    out += struct.pack("<HHHHII", 1, 1, 256, 0, 0, pal_len)

    # Sprite nodes
    for s in sprites:
        out += struct.pack(
            "<HHHH hh HBB II HH",
            s["group"],
            s["number"],
            s["w"],
            s["h"],
            s["ax"],
            s["ay"],
            s["link"],
            s["fmt"],
            s["depth"],
            s["dofs"],
            s["dlen"],
            s["pal"],
            s["flags"],
        )
    assert len(out) == lofs
    out += ldata2

    if out_path is None:
        out_path = ROOT / "content" / "chars" / char / f"{char}.sff"
    out_path.write_bytes(out)
    print(f"wrote {out_path} ({len(out)} bytes, {num_spr} sprites, {len(img_cache)} unique images)")
    return out_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--char")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    targets = CHARS if args.all else [args.char]
    if not targets or targets == [None]:
        ap.error("need --char or --all")
    for c in targets:
        pack_char(c)


if __name__ == "__main__":
    main()
