#!/usr/bin/env python3
"""Pack RGBA PNGs into Elecbyte SFF v2 (format 12) for Ikemen GO.

Scale policy (Howard / OC fight sprites):
  - Match KFM720 standing sprite height (~420px feet-to-head in 1280x720 localcoord).
  - Each fight frame scales to a pose target (stand=KFM_STAND_H, crouch~62%)
    so inconsistent Codex source sizes do not make attacks jump big/small.
  - Feet on a shared baseline; axis at feet center.

Usage:
  python3 tools/pack_sff_v2.py --char howard
  python3 tools/pack_sff_v2.py --all
"""
from __future__ import annotations

import argparse
import io
import re
import struct
from pathlib import Path

from PIL import Image

ROOT = Path("/workspace/fiiight")
CHARS = ["howard", "chiihoward", "hornam", "percy", "tyrus", "daddy"]

# KFM720 idle group 0 heights are 420–424px (axis near feet). Match that.
KFM_STAND_H = 420
# Extra canvas pad so limbs in attack frames are not clipped after uniform scale.
CANVAS_PAD_X = 80
CANVAS_PAD_TOP = 40
CANVAS_PAD_BOTTOM = 4

FRAME_RE = re.compile(r"^([a-z_]+?)_(\d+)$")


def load_art(char: str) -> dict[str, Path]:
    """Load art/*.png plus art/frames/*.png. Frame keys keep numeric suffix."""
    out: dict[str, Path] = {}
    base = ROOT / "content" / "chars" / char / "art"
    frames = base / "frames"
    if base.is_dir():
        for p in base.glob("*.png"):
            out[p.stem] = p
    if frames.is_dir():
        for p in sorted(frames.glob("*.png")):
            out[p.stem] = p  # frames override same-named top-level if any
    if "idle" not in out and "idle_00" in out:
        out["idle"] = out["idle_00"]
    if "idle" not in out and "idle_paint" in out:
        out["idle"] = out["idle_paint"]
    if "portrait" not in out and "portrait_paint" in out:
        out["portrait"] = out["portrait_paint"]
    return out


def list_frames(art: dict[str, Path], prefix: str) -> list[str]:
    """Return sorted pose keys like idle_00.. for a prefix, else []."""
    keys = []
    for k in art:
        m = FRAME_RE.match(k)
        if m and m.group(1) == prefix:
            keys.append(k)
    keys.sort(key=lambda k: int(FRAME_RE.match(k).group(2)))
    return keys


def alpha_bbox(im: Image.Image, thr: int = 8):
    a = im.split()[-1]
    return a.point(lambda v: 255 if v > thr else 0).getbbox()


def trim_rgba(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    bbox = alpha_bbox(im)
    if bbox:
        im = im.crop(bbox)
    return im


def measure_body_h(path: Path) -> int:
    im = trim_rgba(path)
    return max(1, im.size[1])


def build_group_plan(art: dict[str, Path]) -> list[tuple[int, int, str]]:
    """(group, index, pose_key) — prefer numbered frames; fall back to single poses."""

    def pick(*names: str) -> str:
        for n in names:
            if n in art:
                return n
        return "idle"

    def cycle(keys: list[str], fallbacks: tuple[str, ...], n: int) -> list[str]:
        if not keys:
            keys = [pick(*fallbacks)]
        return [keys[i % len(keys)] for i in range(n)]

    plan: list[tuple[int, int, str]] = []

    idle_f = list_frames(art, "idle")
    if not idle_f:
        idle_f = [pick("idle", "idle_2", "idle_3")]
        for alt in ("idle_2", "idle_3"):
            if alt in art and alt not in idle_f:
                idle_f.append(alt)
    for i, p in enumerate(cycle(idle_f, ("idle",), 6)):
        plan.append((0, i, p))

    walk_f = list_frames(art, "walk")
    if not walk_f:
        # legacy run_1..4 + walk
        walk_f = [pick(f"run_{i}", "walk", "idle") for i in range(1, 5)]
        if "walk" in art:
            walk_f.append("walk")
    for i, p in enumerate(cycle(walk_f, ("walk", "idle"), 16)):
        plan.append((20, i, p))
        plan.append((21, i, walk_f[(i + 2) % len(walk_f)] if walk_f else p))

    crouch_f = list_frames(art, "crouch") or [pick("crouch", "idle")]
    for i in range(3):
        plan.append((11, i, crouch_f[min(i, len(crouch_f) - 1)]))
    plan.append((5, 0, idle_f[0]))
    plan.append((6, 0, idle_f[0]))

    jump_f = list_frames(art, "jump") or [pick("jump", "idle")]
    fall_f = list_frames(art, "fall") or [pick("fall", "jump", "idle")]
    for i in range(9):
        plan.append((41, i, jump_f[i % len(jump_f)] if i < 5 else fall_f[i % len(fall_f)]))
    for i in (0, 1, 3, 4, 5):
        plan.append((42, i, fall_f[i % len(fall_f)]))
    plan.append((43, 0, jump_f[0]))
    plan.append((43, 1, fall_f[0]))

    punch_f = list_frames(art, "punch") or [pick("punch", "strike_up", "ready_f", "idle")]
    kick_f = list_frames(art, "kick") or [pick("kick", "strike_down", "punch", "idle")]
    ready = pick("ready_f", "idle")

    def map_seq(group: int, nmax: int, seq: list[str]):
        for i in range(nmax):
            plan.append((group, i, seq[i % len(seq)]))

    map_seq(200, 3, punch_f)
    map_seq(210, 6, punch_f)
    map_seq(230, 3, kick_f)
    map_seq(240, 6, kick_f)
    map_seq(100, 6, [ready] if ready in art else punch_f)
    map_seq(181, 7, punch_f)
    map_seq(191, 4, punch_f)
    map_seq(192, 2, punch_f)
    map_seq(400, 2, kick_f)
    map_seq(410, 5, kick_f)
    map_seq(430, 4, kick_f)
    map_seq(440, 7, kick_f)
    map_seq(600, 2, kick_f)
    map_seq(610, 4, kick_f)
    map_seq(640, 3, kick_f)
    plan.append((630, 1, kick_f[min(1, len(kick_f) - 1)]))
    plan.append((630, 2, kick_f[min(2, len(kick_f) - 1)]))

    hurt_f = list_frames(art, "hurt") or [pick("hurt", "idle")]
    ko_f = list_frames(art, "ko") or [pick("ko", "hurt", "idle")]
    for g, idxs, use_ko in [
        (5000, (0, 10, 11, 20, 21), False),
        (5010, (0, 10, 20, 21), False),
        (5011, (0,), False),
        (5020, (0, 10, 20), False),
        (5030, (0, 10, 30, 31, 40, 50), False),
        (5031, (0,), False),
        (5040, (0, 1, 10, 11, 20), False),
        (5060, (0, 1, 10), True),
        (5061, (0,), True),
        (5071, (0, 10, 20), True),
        (5300, (0, 1, 2, 3), False),
    ]:
        seq = ko_f if use_ko else hurt_f
        for i, idx in enumerate(idxs):
            plan.append((g, idx, seq[i % len(seq)]))

    block = pick("block", "idle")
    for i in range(3):
        plan.append((120, i, block))
    plan.append((121, 0, block))
    plan.append((122, 0, block))

    victory_f = list_frames(art, "victory") or ([pick("victory")] if "victory" in art else [])
    # specials — keep legacy single-pose maps for non-Howard art still present
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
        # If we have punch/kick frame sets, prefer them over stale single specials for attack-like groups
        seq = None
        if g in (1000, 1050, 1052, 1055) and len(punch_f) > 1:
            seq = punch_f
        elif g in (1100,) and len(kick_f) > 1:
            seq = kick_f
        elif g in (1300, 1320, 1340) and len(jump_f) > 1:
            seq = jump_f
        for i in range(n):
            plan.append((g, i, seq[i % len(seq)] if seq else pose))

    if victory_f:
        plan.append((181, 6, victory_f[0]))  # soft overlap ok; dedupe keeps first

    plan.append((9000, 0, pick("portrait", "portrait_paint", "idle")))
    plan.append((9000, 1, pick("portrait", "portrait_paint", "idle")))
    return plan


def pose_target_h(pose: str) -> int:
    """Target body height after normalize. Standing poses → KFM; crouch shorter.

    Codex/OC frames are often drawn at inconsistent source pixel scales
    (idle ~1400px, punch/walk ~1050px). Scaling everything by idle-only
    scale makes attacks tiny. Per-pose target keeps on-screen size stable.
    """
    m = FRAME_RE.match(pose)
    prefix = m.group(1) if m else pose.split("_")[0]
    if prefix == "crouch" or pose.startswith("crouch"):
        return max(1, int(round(KFM_STAND_H * 0.62)))
    return KFM_STAND_H


def normalize_to_kfm(
    path: Path,
    scale: float,
    *,
    portrait: bool = False,
    portrait_h: int = 200,
) -> tuple[Image.Image, int, int]:
    """Scale by `scale`, pad to shared feet baseline."""
    im = Image.open(path).convert("RGBA")
    bbox = alpha_bbox(im)
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    if portrait:
        s = portrait_h / max(h, 1)
        nw, nh = max(1, int(w * s)), max(1, int(h * s))
        im = im.resize((nw, nh), Image.Resampling.LANCZOS)
        return im, 0, 0

    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)

    # Canvas: room for attack limbs; feet on shared baseline.
    canvas_h = max(nh + CANVAS_PAD_TOP + CANVAS_PAD_BOTTOM, KFM_STAND_H + CANVAS_PAD_TOP + CANVAS_PAD_BOTTOM)
    canvas_w = max(nw + 2 * CANVAS_PAD_X, int(KFM_STAND_H * 0.6) + 2 * CANVAS_PAD_X)
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    x = (canvas_w - nw) // 2
    y = canvas_h - CANVAS_PAD_BOTTOM - nh  # feet on baseline
    canvas.paste(im, (x, y), im)
    ax = canvas_w // 2
    ay = canvas_h - CANVAS_PAD_BOTTOM
    return canvas, ax, ay


def png_blob(im: Image.Image) -> bytes:
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    png = buf.getvalue()
    uncomp = im.size[0] * im.size[1] * 4
    return struct.pack("<I", uncomp) + png


def pack_char(char: str, out_path: Path | None = None) -> Path:
    art = load_art(char)
    if "idle" not in art and "idle_00" not in art and "idle_paint" not in art:
        raise SystemExit(f"{char}: no idle art")
    if "idle" not in art:
        art["idle"] = art.get("idle_00") or art["idle_paint"]

    # Uniform scale from idle body height → KFM standing height
    idle_path = art.get("idle_00") or art["idle"]
    idle_body_h = measure_body_h(idle_path)
    scale = KFM_STAND_H / idle_body_h
    print(f"{char}: idle body_h={idle_body_h}px → scale={scale:.4f} (KFM_STAND_H={KFM_STAND_H})")

    plan = build_group_plan(art)
    seen: set[tuple[int, int]] = set()
    unique_plan: list[tuple[int, int, str]] = []
    for g, i, pose in plan:
        if (g, i) in seen:
            continue
        seen.add((g, i))
        unique_plan.append((g, i, pose))

    img_cache: dict[str, tuple[bytes, int, int, int, int, int]] = {}
    # cache value includes body_h after scale (nh) for verify

    def get_sprite(pose: str, group: int, index: int):
        if group == 9000 and index == 0:
            cache_key = pose + "#p0"
        elif group == 9000 and index == 1:
            cache_key = pose + "#p1"
        else:
            cache_key = pose
        if cache_key in img_cache:
            return img_cache[cache_key]
        path = art.get(pose) or art["idle"]
        if group == 9000:
            im, ax, ay = normalize_to_kfm(path, scale, portrait=True, portrait_h=200 if index == 0 else 560)
            body_h = im.size[1]
        else:
            # Per-frame scale → pose target (fixes Codex source size mismatch)
            src_h = measure_body_h(path)
            pose_scale = pose_target_h(pose) / max(src_h, 1)
            im, ax, ay = normalize_to_kfm(path, pose_scale)
            bb = alpha_bbox(im)
            body_h = (bb[3] - bb[1]) if bb else im.size[1]
        blob = png_blob(im)
        img_cache[cache_key] = (blob, im.size[0], im.size[1], ax, ay, body_h)
        return img_cache[cache_key]

    sprites = []
    blob_to_first: dict[bytes, int] = {}
    ldata = bytearray()
    body_heights: dict[str, int] = {}

    for g, i, pose in unique_plan:
        blob, w, h, ax, ay, body_h = get_sprite(pose, g, i)
        body_heights[pose] = body_h
        if blob in blob_to_first:
            link = blob_to_first[blob]
            sprites.append(
                dict(group=g, number=i, w=w, h=h, ax=ax, ay=ay, link=link, fmt=12, depth=32, dofs=0, dlen=0, pal=0, flags=0)
            )
        else:
            dofs = len(ldata)
            ldata += blob
            blob_to_first[blob] = len(sprites)
            sprites.append(
                dict(group=g, number=i, w=w, h=h, ax=ax, ay=ay, link=0, fmt=12, depth=32, dofs=dofs, dlen=len(blob), pal=0, flags=0)
            )

    # Verify scale consistency on core fight poses
    core = [k for k in body_heights if k.startswith(("idle", "walk", "punch", "kick", "hurt", "jump", "fall", "crouch"))]
    if core:
        vals = [body_heights[k] for k in core]
        print(f"{char}: scaled body_h range among fight frames: {min(vals)}–{max(vals)} (idle target {KFM_STAND_H})")
        for k in sorted(core):
            print(f"  {k}: body_h={body_heights[k]}")

    pal_data = bytearray()
    for i in range(256):
        pal_data += bytes((0, 0, 0, 0) if i == 0 else (i, i, i, 255))

    HEADER = 512
    num_pal = 1
    num_spr = len(sprites)
    pal_node_off = HEADER
    spr_node_off = pal_node_off + num_pal * 16
    sprite_blobs = bytes(ldata)
    ldata2 = bytearray(pal_data)
    pal_len = len(pal_data)
    for s in sprites:
        if s["dlen"]:
            s["dofs"] = pal_len + s["dofs"]
    ldata2 += sprite_blobs
    lofs = spr_node_off + num_spr * 28
    tofs = lofs + len(ldata2)

    out = bytearray()
    out += b"ElecbyteSpr\x00"
    out += bytes((0, 1, 0, 2))
    out += struct.pack("<I", 0)
    out += struct.pack("<IIII", 0, 0, 0, 0)
    out += struct.pack("<I", spr_node_off)
    out += struct.pack("<I", num_spr)
    out += struct.pack("<I", pal_node_off)
    out += struct.pack("<I", num_pal)
    out += struct.pack("<I", lofs)
    out += struct.pack("<I", len(ldata2))
    out += struct.pack("<I", tofs)
    if len(out) < HEADER:
        out += bytes(HEADER - len(out))

    out += struct.pack("<HHHHII", 1, 1, 256, 0, 0, pal_len)
    for s in sprites:
        out += struct.pack(
            "<HHHH hh HBB II HH",
            s["group"], s["number"], s["w"], s["h"], s["ax"], s["ay"],
            s["link"], s["fmt"], s["depth"], s["dofs"], s["dlen"], s["pal"], s["flags"],
        )
    out += ldata2

    if out_path is None:
        out_path = ROOT / "content" / "chars" / char / f"{char}.sff"
    out_path.write_bytes(out)
    n_unique = sum(1 for s in sprites if s["dlen"])
    print(f"wrote {out_path} ({len(out)} bytes, {num_spr} sprites, {n_unique} unique images, scale={scale:.4f})")
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
