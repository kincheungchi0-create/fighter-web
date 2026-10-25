# Your game structure (based on fiiight)

Treat this repo as your game. Touch these layers only:

```
fiiight/
├── content/          ← YOUR GAME (chars, stages, roster, UI motif)
│   ├── chars/        ← one folder per character (<name>/<name>.def + assets)
│   ├── stages/       ← .def + .sff (+ optional music)
│   ├── data/
│   │   ├── select.def    ← roster (edit this to add/remove chars)
│   │   ├── fight.def     ← lifebar / fight HUD
│   │   └── ikemen1/      ← title / select screen motif (swap when you brand)
│   ├── font/ sound/ video/
│   └── MANIFEST.md   ← keep licenses for anything you ship
├── web/              ← browser shell (title, icons, touch, loader)
│   ├── index.html    ← page title / PWA name
│   ├── manifest.json
│   └── icons/
├── build/wasm.sh     ← packs content/ → web/content.zip + builds WASM
├── engine/           ← vendored Ikemen GO (leave alone unless porting engine)
└── port/             ← WASM port notes (upstreaming)
```

## Day-to-day workflow

1. Drop chars into `content/chars/<name>/`
2. List them in `content/data/select.def` under `[Characters]`
3. Add stages under `content/stages/` and `[ExtraStages]`
4. Rebuild: `bash build/wasm.sh` then `node web/dev-server.mjs 8080`
5. Open http://localhost:8080

Shell-only (content change, wasm already built): `bash build/wasm.sh --shell-only`

## Do not edit (unless you know why)

- `engine/src/` — fighting engine; update from upstream Ikemen GO / fiiight port
- Bundled KFM / Takezo / etc. — replace with your own IP when ready; keep licenses in MANIFEST.md

## Branding checklist

- [ ] `web/index.html` title + apple-mobile-web-app-title
- [ ] `web/manifest.json` name / short_name
- [ ] `web/icons/`
- [ ] Motif under `content/data/ikemen1/` (or new motif folder + point config at it)
