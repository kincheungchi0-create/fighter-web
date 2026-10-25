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

Masters / pose prompts: `artgen/master_*.txt`, `artgen/pose_*`. Local mirrors of kits/masters/scripts: `third_party/spirit-clash/<char>/`.

## What was copied vs regenerated

- **Copied (not regenerated):** paint idle + portrait (webp→png), core voice lines (`atk1`→attack, `hurt1`→hurt, `ko`, `select`→name, `win1`→victory), announcer name takes → `content/sound/announcer/`, kit/master/pose/script text into `third_party/`.
- **Not regenerated this pass:** no new Codex `$imagegen`, no new Fish TTS.
- **Engine-only (Ikemen):** KFM720 `.air/.cmd/.cns/.sff/.snd` mechanical base + slim title menu (CPU VS CPU / VERSUS / EXIT). Not inventing new modes or a new cast.

## Modes

See `docs/MODES.md`. Match spirit-clash intent: primary **CPU vs CPU watch**, plus simple Versus.
