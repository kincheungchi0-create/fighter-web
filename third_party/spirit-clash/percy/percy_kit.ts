import { Frame, type Drawer } from './core';
import { HC } from './howard_kit';

/*
 * Percy: Howard's tall classmate (same HKBUAS uniform, neat side-parted hair) and his partner Percci Bear,
 * the school mascot: a light-blue bear with blue plaid patches on the ears and paw pads, a white muzzle,
 * a brown nose and green backpack straps. Percci is drawn by Percy's rig beside him (rig space, feet on
 * the ground line) so it moves with him; pose keys send it rushing, hopping or growing giant.
 */
export const PC = { ...HC, hair: 0x3a2418, hairD: 0x1e120c, hairL: 0x6a4a34 };

const BLUE = 0x8ccaee;
const BLUE_D = 0x5a9ccc;
const BELLY = 0xdcf2fc;
const PLAID = 0x2f5fc0;
const STRAP = 0x3a8a3a;
const NOSE = 0x9a5a3a;
const INK = 0x1c1216;

/** neat short hair with a side part (head frame) */
export function neatHair(d: Drawer, hf: Frame) {
  d.poly(hf.pts([
    -14, 16, -20, 10, -23.5, 2, -24.5, -8, -21.5, -17, -14, -24.5, -4, -28.5, 8, -28.5, 18, -24.5, 25, -16.5, 27.5, -8,
    24, -4.5, 18, -9, 12, -6.5, 6, -10.5, 0, -7.5, -4, -9.5, -7, -2, -10, 8, -12, 14,
  ]), PC.hair);
  d.poly(hf.pts([-20, 10, -23.5, 2, -24, -8, -18, -6, -14, 6, -12.5, 14]), PC.hairD, { outline: false, alpha: 0.5 });
  d.stroke(hf.pts([-2, -28, 2, -20, 4, -10]), 1.3, PC.hairD, 0.8);
  d.stroke(hf.pts([-14, -18, -8, -24, 0, -26]), 2.2, PC.hairL, 0.7);
  d.stroke(hf.pts([6, -25, 14, -23, 21, -17]), 1.8, PC.hairL, 0.6);
}

/** a round patch with a blue plaid pattern */
function plaid(d: Drawer, f: Frame, x: number, y: number, r: number) {
  const [cx, cy] = f.p(x, y);
  const R = r * f.k;
  d.circle(cx, cy, R, PLAID, { lw: 1.2 });
  for (const o of [-0.45, 0, 0.45]) {
    const w = Math.sqrt(Math.max(0, 1 - o * o)) * R;
    d.stroke([cx - w, cy + o * R, cx + w, cy + o * R], 0.8 * f.k, 0xffffff, 0.75);
    d.stroke([cx + o * R, cy - w, cx + o * R, cy + w], 0.8 * f.k, 0xffffff, 0.75);
  }
  d.stroke([cx - R * 0.8, cy + R * 0.2, cx + R * 0.8, cy + R * 0.2], 0.6 * f.k, 0xe04040, 0.7);
}

/**
 * Percci Bear standing at (x, y) (feet), scale s (1 = about 64 rig units tall).
 * atk 0..1 swings the front paw forward, wave 0..1 raises it to wave, t animates the bob.
 */
export function percci(d: Drawer, x: number, y: number, s: number, atk: number, wave: number, t: number) {
  if (s < 0.05) return;
  const f = new Frame(x, y - Math.abs(Math.sin(t * 3)) * 1.2 * s, 0, s);
  const E = (lx: number, ly: number, rx: number, ry: number, col: number, o: { outline?: boolean; alpha?: number; lw?: number } = {}, rot = 0) =>
    d.ellipse(...f.p(lx, ly), rx * s, ry * s, rot, col, o);
  // back arm, legs
  E(-15, -26, 6, 9, BLUE_D, { lw: 1.6 }, 0.3);
  E(-8, -6, 8, 7, BLUE, { lw: 1.6 });
  E(9, -6, 8, 7, BLUE, { lw: 1.6 });
  plaid(d, f, 12, -4, 3.6);
  // body, belly, backpack straps
  E(0, -23, 17, 18, BLUE, { lw: 1.8 });
  E(-6, -22, 9, 14, BLUE_D, { outline: false, alpha: 0.35 });
  E(3, -20, 10, 11, BELLY, { outline: false, alpha: 0.9 });
  d.stroke(f.pts([-10, -36, -12, -24, -9, -12]), 3.4 * s, STRAP, 1);
  d.stroke(f.pts([12, -36, 13, -24, 10, -12]), 3.4 * s, STRAP, 1);
  // head + ears
  for (const ex of [-12, 13]) {
    E(ex, -62, 6.5, 6.5, BLUE, { lw: 1.6 });
    plaid(d, f, ex, -62, 3.6);
  }
  E(1, -49, 17, 15.5, BLUE, { lw: 1.8 });
  E(4, -44, 8.5, 6.5, 0xffffff, { outline: false, alpha: 0.95 });
  E(4, -47.5, 3.2, 2.3, NOSE, { lw: 1 });
  d.stroke(f.pts([1.5, -43, 4, -41.5, 6.5, -43]), 1.1 * s, INK, 1);
  for (const ex of [-4.5, 10.5]) {
    E(ex, -52, 2.1, 2.4, INK, { outline: false });
    E(ex - 0.6, -52.8, 0.7, 0.7, 0xffffff, { outline: false });
  }
  E(-8, -45, 2.6, 1.5, 0xff9ab0, { outline: false, alpha: 0.5 });
  E(15, -45, 2.6, 1.5, 0xff9ab0, { outline: false, alpha: 0.5 });
  // front paw: forward swipe (atk) or raised wave
  const px = 16 + 10 * atk - 2 * wave, py = -26 - 6 * atk - 22 * wave;
  E(px, py, 6.5, 8.5, BLUE, { lw: 1.6 }, 0.3 - 0.6 * atk);
  plaid(d, f, px + 1, py + 1, 3.6);
}
