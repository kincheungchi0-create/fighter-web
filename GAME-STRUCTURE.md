# Fighter Web — game structure

Browser 1v1 fighter based on [fiiight](https://github.com/mathmati/fiiight) (Ikemen GO WASM).

```
fighter-web/
├── content/                 ← YOUR GAME
│   ├── chars/<name>/        ← 6 Howard-family OCs + Training
│   │   ├── <name>.def/.sff/.air/.cns/.cmd
│   │   ├── art/idle.png     ← idle master (Codex / spirit-clash paint)
│   │   ├── voice/*.mp3      ← Fish Audio Drama 3
│   │   └── KIT.md           ← archetype + skills (from spirit-clash kits)
│   ├── data/select.def      ← roster
│   ├── data/ikemen1/        ← motif (minimal title + Demo Mode)
│   ├── sound/announcer/     ← VS / Ready / Go / KO
│   └── sound/VOICES.md
├── docs/CPU-VS-CPU.md
├── docs/MODES.md            ← short mode list
├── web/                     ← static shell + ikemen.wasm + content.zip
├── build/wasm.sh
└── engine/                  ← vendored Ikemen GO
```

## Roster (6 OCs from spirit-clash)

| Folder | Display | Kit (borrowed) |
|--------|---------|----------------|
| howard | Howard | Stationery — pencil / pen / book / ruler / homework storm |
| chiihoward | ChiiHoward | Cute plush kit (generic bear print; no trademarked face) |
| hornam | HorNam | Angry stretch / swell / scream |
| percy | Percy | Tall classmate + Percci Bear partner |
| tyrus | Tyrus | Tennis — racket + balls |
| daddy | Daddy | Food dad — chopsticks / fork / knife / bao / belly |

Invented Spark Fox / Iron Vow / Neon Pulse / Jade Ember / Gale Quill / Dusk Shade roster removed.

**Mechanical gap:** Playable via adapted Kung Fu Man 720 base. Custom idle + voices ship in `art/` / `voice/`; packing into `.sff` / `.snd` is next.

## Modes

See `docs/MODES.md`. Title: **CPU VS CPU** / **VERSUS** / **EXIT**. Auto watch: Watch item or Demo Mode (~3s title idle).

## Build / run

```bash
bash build/wasm.sh --shell-only   # content-only refresh
node web/dev-server.mjs 8080
```
