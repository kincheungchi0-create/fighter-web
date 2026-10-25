# Fighter Web — game structure

Browser 1v1 fighter based on [fiiight](https://github.com/mathmati/fiiight) (Ikemen GO WASM).

```
fighter-web/
├── content/                 ← YOUR GAME
│   ├── chars/<name>/        ← 6 OCs + Training
│   │   ├── <name>.def/.sff/.air/.cns/.cmd
│   │   ├── art/idle.png     ← Codex $imagegen master idle (transparent PNG)
│   │   ├── voice/*.mp3      ← Fish Audio Drama 3 lines
│   │   └── KIT.md           ← archetype + skill list
│   ├── data/select.def      ← roster
│   ├── data/ikemen1/        ← motif (Demo Mode enabled for auto CPU)
│   ├── sound/announcer/     ← VS / Ready / Go / KO
│   └── sound/VOICES.md
├── docs/CPU-VS-CPU.md       ← how to watch AI vs AI
├── web/                     ← static shell + ikemen.wasm + content.zip
├── build/wasm.sh
└── engine/                  ← vendored Ikemen GO (do not edit casually)
```

## Original roster (6 OCs)

| Folder | Display | Archetype | Distinct skills (documented) |
|--------|---------|-----------|------------------------------|
| sparkfox | Spark Fox | Rushdown / speed | Jab Flurry, Dash Punch, Lightning Kick, Volt Burst, Fox Flip |
| ironvow | Iron Vow | Heavy / armor | Shield Bash, Guard Crush, Greatslash, Oathquake, Armor Charge |
| neonpulse | Neon Pulse | Zoner / teleport | Pulse Beam, Drone Mine, Phase Step, Overclock, Circuit Jab |
| jadeember | Jade Ember | Fire martial | Ember Palm, Fireball, Rising Phoenix, Ash Sweep, Inferno Rush |
| galequill | Gale Quill | Midrange / wind | Quill Poke, Cyclone Spin, Sky Dive, Feather Barrage, Tempest Wall |
| duskshade | Dusk Shade | Mixup / trickster | Shade Kick, Fade Step, Twin Shadow, Haunt Grab, Midnight Veil |

**Mechanical gap:** Each OC is playable via an adapted Kung Fu Man 720 base (states/AI/SFF). Custom idle art + voices ship in `art/` and `voice/`; packing custom frames into `.sff` / wiring MP3 into `.snd` is the next art-pipeline step (needs Fighter Factory or equivalent). Walk/run speeds are already differentiated per kit.

## CPU vs CPU auto

See `docs/CPU-VS-CPU.md`. Short version: Title → **Watch Mode → CPU Match**, or wait ~3s on title for Demo Mode.

## Build / run

```bash
bash build/wasm.sh          # full engine + content.zip
bash build/wasm.sh --shell-only   # content only
node web/dev-server.mjs 8080
```

## Art / voice tools used

- Codex CLI `$imagegen` → `artgen/out/*_idle.png`
- Fish Audio `model: drama-3` → `content/chars/*/voice/` + `content/sound/announcer/`
