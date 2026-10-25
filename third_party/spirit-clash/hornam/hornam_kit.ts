import { Frame, OUTLINE, type Drawer } from './core';
import { HC } from './howard_kit';
import { arc } from './round_kit';
import type { V2 } from './mario_kit';

/*
 * Hor Nam: another HKBUAS boy (same school uniform as Howard) who is always angry. Short black spiky
 * hair, a red flush, a pulsing anger mark and steam when he is mad; when he attacks his arms and legs
 * stretch and his head swells up, and in his ultimate it balloons while he screams (sound waves).
 */
export const HN = {
  ...HC,
  hair: 0x1c1c26, hairD: 0x0a0a10, hairL: 0x4c4c60,
  shoeB: 0xd83a3a, shoeBD: 0x941e1e,
  pack: 0x8a2626, packD: 0x5a1414, packL: 0xb84040,
  swirl: 0xff5a3a, swirlL: 0xffd0a0,
};

const RED = 0xe82a2a;

/** stretch a limb (shoulder / hip, joint, end) by k from its root */
export function stretch(root: V2, mid: V2, end: V2, k: number): [V2, V2] {
  const m: V2 = [root[0] + (mid[0] - root[0]) * k, root[1] + (mid[1] - root[1]) * k];
  return [m, [m[0] + (end[0] - mid[0]) * k, m[1] + (end[1] - mid[1]) * k]];
}

/** short black spiky crew cut (head frame) */
export function spikyHair(d: Drawer, hf: Frame) {
  d.poly(hf.pts([
    -14, 16, -20, 11, -23, 3, -24.5, -6, -22, -13, -24, -20, -16, -21, -15, -29, -8, -24, -3, -32, 2, -25, 8, -32, 11.5, -24,
    17.5, -30, 18.5, -21, 25, -24, 23.5, -15, 28, -12, 24, -8, 22, -5.5, 16, -8, 10, -5.5, 4, -8, -1, -5, -5, -6, -8, 0, -10, 8, -12, 14,
  ]), HN.hair);
  d.poly(hf.pts([-20, 11, -23, 3, -24, -6, -18, -4, -14, 6, -12.5, 14]), HN.hairD, { outline: false, alpha: 0.5 });
  d.stroke(hf.pts([-16, -16, -8, -21, 2, -22, 12, -19]), 2, HN.hairL, 0.7);
  d.stroke(hf.pts([-12, -12, -4, -16, 6, -16]), 1.1, HN.hairL, 0.45);
}

/** red flush over the face (drawn after the face, before the hair) */
export function flush(d: Drawer, hf: Frame, anger: number) {
  if (anger < 0.02) return;
  d.ellipse(...hf.p(12, 2), 15 * hf.k, 12 * hf.k, hf.a, 0xff2a2a, { outline: false, alpha: 0.12 + 0.3 * anger });
  for (const x of [8, 11, 14]) d.stroke(hf.pts([x, 8.5, x - 1.2, 11.5]), 1.1, RED, 0.5 * anger);
}

/** the pulsing anger mark and steam puffs (drawn over the hair) */
export function angerFx(d: Drawer, hf: Frame, anger: number, t: number) {
  if (anger < 0.05) return;
  const pulse = 1 + 0.18 * Math.sin(t * 14);
  const [cx, cy] = hf.p(22, -30);
  const s = 2.2 * hf.k * pulse * Math.min(1, anger * 1.6);
  for (let q = 0; q < 4; q++) {
    const a = hf.a + (q * Math.PI) / 2;
    const c = Math.cos(a), sn = Math.sin(a);
    const P = (x: number, y: number) => [cx + (x * c - y * sn) * s, cy + (x * sn + y * c) * s];
    const pts = [...P(0.8, 2.6), ...P(0.8, 0.8), ...P(2.6, 0.8)];
    d.stroke(pts, 3.6, OUTLINE, 0.8 * anger);
    d.stroke(pts, 2.2, RED, anger);
  }
  if (anger < 0.5) return;
  for (let i = 0; i < 3; i++) {
    const u = ((t * 1.6 + i / 3) % 1);
    const [sx, sy] = hf.p(-8 + i * 12 + Math.sin(t * 3 + i) * 3, -34 - u * 22);
    d.circle(sx, sy, (3 + u * 4) * hf.k, 0xffffff, { outline: false, alpha: (1 - u) * 0.7 * anger });
  }
}

/** wide-open screaming mouth (drawn over the face's own mouth) */
export function shoutMouth(d: Drawer, hf: Frame, amt: number) {
  if (amt < 0.3) return;
  d.poly(hf.pts([11, 9.5, 24.5, 8.5, 23.5, 19.5, 17.5, 24, 12, 19.5]), 0x6a1018, { lw: 1.5 });
  d.poly(hf.pts([11.6, 9.8, 24, 9, 23.6, 11.4, 12, 12]), 0xffffff, { outline: false });
  d.ellipse(...hf.p(18, 20.5), 4 * hf.k, 2 * hf.k, hf.a, 0xff7a8a, { outline: false });
}

/** sound waves blasting out of the mouth */
export function soundWaves(d: Drawer, hf: Frame, amt: number, t: number) {
  if (amt < 0.3) return;
  const [cx, cy] = hf.p(30, 14);
  const base = hf.a;
  for (let i = 0; i < 4; i++) {
    const u = ((t * 2.4 + i / 4) % 1);
    const r = (8 + u * 70) * hf.k;
    const pts = arc(cx, cy, r, base - 0.75, base + 0.75, 12);
    d.stroke(pts, (4.5 - u * 2.5) * hf.k, i % 2 ? 0xffffff : RED, (1 - u) * amt);
  }
}
