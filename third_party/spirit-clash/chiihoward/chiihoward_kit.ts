import { Frame, TAU, dir, ellipsePts, type Drawer } from './core';
import { HC } from './howard_kit';
import { arc } from './round_kit';
import type { V2 } from './mario_kit';

/*
 * Chiikawa Howard's look (no school things): a pink T-shirt with a little Chiikawa face print, light-blue
 * shorts, white wristbands, pink-trimmed sneakers and a white Chiikawa-ear beanie. His weapons are plush
 * dolls (Chiikawa, Hachiware, Usagi) instead of stationery, and hearts replace the flying letters.
 */
export const CC = {
  ...HC,
  shirt: 0xffd6e2, shirtD: 0xeba4ba, trimB: 0xff8aa8, trimY: 0xffffff,
  shorts: 0x92c2f0, shortsD: 0x6a9cd8, shortsL: 0xbcdcff,
  shoeB: 0xff8aa8, shoeBD: 0xd8607e, band: 0xffffff, bandL: 0xffe0ea,
  swirl: 0xff9ab8, swirlL: 0xffe4ec, glow: 0xffe0ea,
};

const INK = 0x3a2a28;
const WHITE = 0xfffdfb;
const HAT_D = 0xe4e0ea;
const BLUSH = 0xff9ab0;
const USAGI = 0xfbe8a8;
const HACHI = 0x5a8ad8;
const EAR_PINK = 0xffb6c8;

/** a round T-shirt neckline (drawn over the neck instead of the polo collar) */
export function neckline(d: Drawer, tf: Frame) {
  const Y1 = -32;
  d.stroke([...tf.p(-6.5, Y1 - 1.5), ...tf.p(-3, Y1 + 1.6), ...tf.p(1.5, Y1 + 2.4), ...tf.p(6, Y1 + 1.2), ...tf.p(8.5, Y1 - 1.6)], 2.2, CC.trimB, 1);
}

/** the little Chiikawa face printed on the shirt front */
export function shirtPrint(d: Drawer, tf: Frame) {
  const [x, y] = tf.p(2, -21);
  d.poly(ellipsePts(x, y, 5.6, 5, tf.a - Math.PI / 2, 18), WHITE, { lw: 1.1 });
  const f = new Frame(x, y, tf.a - Math.PI / 2);
  for (const ex of [-1.9, 1.9]) d.circle(...f.p(ex, -0.4), 0.8, INK, { outline: false });
  for (const ex of [-3.4, 3.4]) d.poly(ellipsePts(...f.p(ex, 1.2), 1.2, 0.7, f.a, 10), BLUSH, { outline: false });
}

/** white beanie with round Chiikawa ears, pulled over the hair (head frame) */
export function earHat(d: Drawer, hf: Frame) {
  for (const [ex, ey] of [[-13, -27], [15, -28]]) {
    d.circle(...hf.p(ex, ey), 6.2, WHITE, { lw: 1.8 });
    d.circle(...hf.p(ex, ey + 0.8), 3, EAR_PINK, { outline: false, alpha: 0.8 });
  }
  const dome = [...arc(1, -8, 25, Math.PI * 1.02, Math.PI * 1.98, 14)];
  for (let i = 0; i < dome.length; i += 2) dome[i + 1] = -8 + (dome[i + 1] + 8) * 0.88;
  d.poly(hf.pts([...dome, 25.5, -4, -23.5, -4]), WHITE, { lw: 1.8 });
  d.poly(hf.pts([-23, -8, 25, -8, 25.5, -4, -23.5, -4]), HAT_D, { outline: false, alpha: 0.7 });
  d.stroke(hf.pts([-22, -8.2, 24.5, -8.2]), 1, HAT_D, 1);
  d.stroke(hf.pts([-12, -22, -4, -26, 6, -26]), 1.6, 0xffffff, 0.9);
}

export type PlushKind = 'chiikawa' | 'hachiware' | 'usagi';

/** A plush doll held at grip g, sitting out along the arm direction a (s = scale). Returns its far edge. */
export function plush(d: Drawer, kind: PlushKind, g: V2, a: number, s: number): V2 {
  const [ux, uy] = dir(a);
  const r = (kind === 'usagi' ? 12.5 : 10.5) * s;
  const cx = g[0] + ux * r * 0.9, cy = g[1] + uy * r * 0.9 - r * 0.15;
  const f = new Frame(cx, cy, 0, s);
  const body = kind === 'usagi' ? USAGI : WHITE;
  // ears
  if (kind === 'chiikawa') for (const ex of [-6.5, 6.5]) d.circle(...f.p(ex, -8.5), 3 * s, body, { lw: 1.4 });
  if (kind === 'hachiware') for (const ex of [-7, 7]) d.poly(f.pts([ex - 3.5, -6, ex + ex * 0.15, -13, ex + 3.5, -6]), WHITE, { lw: 1.4 });
  if (kind === 'usagi') {
    for (const [ex, rot] of [[-3.5, -0.2], [4, 0.15]]) {
      d.poly(ellipsePts(...f.p(ex, -15), 3 * s, 8.5 * s, rot, 16), body, { lw: 1.4 });
      d.poly(ellipsePts(...f.p(ex, -14), 1.4 * s, 5.5 * s, rot, 12), EAR_PINK, { outline: false });
    }
  }
  // body
  const k = kind === 'usagi' ? 1.18 : 1;
  d.poly(ellipsePts(cx, cy, 10.5 * s * k, 9.5 * s * k, 0, 22), body, { lw: 1.5 });
  if (kind === 'hachiware') {
    d.poly(f.pts([-9.6, -2.5, -8, -7, -3, -9.4, 0, -9.6, 3, -9.4, 8, -7, 9.6, -2.5, 5, -4, 0, -7.5, -5, -4]), HACHI, { outline: false });
  }
  // face
  const ey = kind === 'usagi' ? -1.2 : -0.5;
  for (const ex of [-3.4, 3.4]) {
    d.circle(...f.p(ex, ey), 1.35 * s, INK, { outline: false });
    d.circle(...f.p(ex - 0.45, ey - 0.5), 0.45 * s, 0xffffff, { outline: false });
  }
  for (const ex of [-6.2, 6.2]) d.poly(ellipsePts(...f.p(ex, 2.4), 1.8 * s, 1 * s, 0, 10), BLUSH, { outline: false });
  if (kind === 'usagi') d.poly(ellipsePts(...f.p(0, 3), 1.5 * s, 1.9 * s, 0, 12), 0xd0485a, { lw: 0.9 });
  else d.stroke(f.pts([-1.6, 2.2, -0.8, 3.2, 0, 2.4, 0.8, 3.2, 1.6, 2.2]), 0.9, INK, 1);
  return [g[0] + ux * r * 2, g[1] + uy * r * 2];
}

/** hearts and sparkles circling (wave 0) or streaming forward (wave 1): replaces the flying letters */
export function hearts(d: Drawer, cx: number, cy: number, amt: number, mode: number, t: number) {
  if (amt < 0.03) return;
  const heart = (x: number, y: number, r: number, col: number, al: number) => {
    const pts: number[] = [];
    for (let i = 0; i < 20; i++) {
      const u = (i / 20) * TAU;
      pts.push(x + r * 0.06 * 16 * Math.sin(u) ** 3, y - r * 0.06 * (13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u)));
    }
    d.poly(pts, col, { lw: 1.2, alpha: al });
  };
  const cols = [0xff8aa8, 0xffffff, USAGI, 0x9cc8f0];
  for (let i = 0; i < 7; i++) {
    const ph = t * 2.2 + i * (TAU / 7);
    const x = mode > 0.5 ? cx + 20 + ((t * 120 + i * 22) % 120) : cx + Math.cos(ph) * 40;
    const y = mode > 0.5 ? cy + Math.sin(ph * 1.5) * 12 : cy + Math.sin(ph) * 22 - 10;
    heart(x, y, 4 + (i % 3), cols[i % 4], amt);
  }
}
