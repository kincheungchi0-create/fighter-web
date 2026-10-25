# Source: spirit-clash

Fighter-web is an **Ikemen GO / WASM 1v1 port shell** of the Howard-family cast from:

https://github.com/kincheungchi0-create/spirit-clash

## Roster (exactly 6)

| Char | Kit | Paint | Voice |
|------|-----|-------|-------|
| Howard | `src/game/rig/howard_kit.ts` | `public/assets/paint/howard/` | `public/assets/voice/howard/` |
| ChiiHoward | `chiihoward_kit.ts` | `paint/chiihoward/` | `voice/chiihoward/` |
| HorNam | `hornam_kit.ts` | `paint/hornam/` | `voice/hornam/` |
| Percy | `percy_kit.ts` | `paint/percy/` | `voice/percy/` |
| Tyrus | `tyrus_kit.ts` | `paint/tyrus/` | `voice/tyrus/` |
| Daddy | `daddy_kit.ts` | `paint/daddy/` | `voice/daddy/` |

Masters / pose prompts: `artgen/master_*.txt`, `artgen/pose_*`. Local mirrors: `third_party/spirit-clash/<char>/`.

## Art pipeline (fight sprites)

- **Codex CLI `$imagegen` (required for hero looks):** regenerated full-body `idle.png` for Howard, ChiiHoward, HorNam, Percy, Tyrus via `artgen/gen_one.sh` + spirit-clash paint refs. Daddy idle fell back to spirit-clash paint after Codex 429 rate-limit (retry logged).
- **Portraits:** spirit-clash `portrait.webp` → `art/portrait.png` (select group 9000).
- **Combat / walk / hurt / etc.:** complementary frames converted from spirit-clash `public/assets/paint/<char>/*.webp` into `content/chars/<char>/art/`.
- **SFF pack:** `tools/pack_sff_v2.py` writes unique Elecbyte SFF v2 (PNG RGBA format 12) per character. Maps OC art into KFM720-compatible sprite groups so existing `.air/.cmd/.cns` still run. **In-match sprites are OCs, not Kung Fu Man.**
- **Voices:** unchanged Fish copies from spirit-clash.
- **Modes:** CPU VS CPU / VERSUS / EXIT only (`docs/MODES.md`). Boot logo + char intro/ending storyboards disabled.

## Residual limitations

- Many attack / special AIR frames reuse a single strike / kick / hurt pose (linked SFF sprites) rather than full frame-by-frame anims.
- Clsn boxes still from KFM720 — hitboxes may not perfectly hug chibi silhouettes.
- Daddy idle not Codex-regenerated this pass (rate limit); still OC paint, not KFM.
