# CPU vs CPU (auto watch)

Fighter Web is 1v1 Ikemen GO. Auto spectating works two ways:

## 1. Watch Mode (manual, recommended)

1. Boot the game to the **title screen**
2. Open the menu → **WATCH MODE** → **CPU MATCH**
3. Pick two characters (or leave random) — both sides are AI
4. Sit back; no input needed during the fight

## 2. Demo Mode (attract / idle auto)

Demo Mode is **enabled** in `content/data/ikemen1/system.def`:

- After ~3 seconds idle on the title screen (`title.waittime = 180`), the engine starts a CPU vs CPU demo fight
- Press any key to return to the title screen

## Tip

For longer auto viewing, stay in **Watch Mode → CPU Match** rather than Demo Mode (demo returns to title after `fight.endtime`).
