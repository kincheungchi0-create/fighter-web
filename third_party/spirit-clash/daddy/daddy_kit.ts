import { Frame, TAU, dir, ellipsePts, type Drawer } from './core';
import { HC } from './howard_kit';
import type { V2 } from './mario_kit';

/*
 * DADDY: Howard's food-loving, very round dad. Orange T-shirt stretched over a big belly (the belly button
 * peeks out under the hem), khaki shorts, brown sandals, short dark hair, round glasses, a moustache and a
 * double chin. He fights with chopsticks, a fork and a (rounded) dinner knife, blocks with a dinner plate,
 * bites with a huge chomping mouth and bumps people with his belly; food circles him when he powers up.
 */
export const DD = {
  ...HC,
  shirt: 0xf28c28, shirtD: 0xc86a14, trimB: 0xffffff, trimY: 0xffffff,
  shorts: 0xc8b48a, shortsD: 0xa08c66, shortsL: 0xe0d0aa,
  sock: 0xffdcbc, sockD: 0xeaa886,
  shoe: 0x8a5a32, shoeB: 0x6a4224, shoeBD: 0x4a2c16, sole: 0x5a3a20,
  band: 0xffdcbc, bandL: 0xfff2e4,
  hair: 0x2a2220, hairD: 0x141010, hairL: 0x5a4a44,
  swirl: 0xffb44a, swirlL: 0xfff0c0, glow: 0xfff0c0,
};

const INK = 0x1c1216;
const STEEL = 0xd8dde6;
const STEEL_D = 0x9aa2b0;
const WOOD = 0xa86a3a;

/** the big round belly over the torso (torso frame); `k` swells it for the belly bump */
export function belly(d: Drawer, tf: Frame, k: number) {
  // wide hips / seat of the shorts under the belly
  const [hx, hy] = tf.p(0, 1);
  d.poly(ellipsePts(hx, hy, 12 * tf.k, 19 * tf.k, tf.a, 22), DD.shorts, { lw: 1.6 });
  // a back bulge so he is round from behind too
  const [px, py] = tf.p(-2, -16);
  d.poly(ellipsePts(px, py, 17 * tf.k, 18 * tf.k, tf.a, 24), DD.shirt, { lw: 1.6 });
  d.poly(ellipsePts(px, py + 4, 12 * tf.k, 12 * tf.k, tf.a, 20), DD.shirtD, { outline: false, alpha: 0.3 });
  const [cx, cy] = tf.p(9 + 5 * (k - 1), -14);
  const rx = 25 * k, ry = 22 * (1 + (k - 1) * 0.6);
  d.poly(ellipsePts(cx, cy, rx * tf.k, ry * tf.k, tf.a, 28), DD.shirt, { lw: 1.8 });
  d.poly(ellipsePts(cx - rx * 0.35, cy, rx * 0.55, ry * 0.85, tf.a, 20), DD.shirtD, { outline: false, alpha: 0.35 });
  d.poly(ellipsePts(cx + rx * 0.35, cy - ry * 0.4, rx * 0.25, ry * 0.18, tf.a - 0.4, 14), 0xffffff, { outline: false, alpha: 0.35 });
  // belly button peeking out under the hem
  const [bx, by] = tf.p(11 + 6 * (k - 1), -14 + ry * 0.66);
  d.poly(ellipsePts(bx, by, 7 * k, 4.5, tf.a, 16), DD.skin, { lw: 1.2 });
  d.poly(ellipsePts(bx, by, 1.4, 1.1, tf.a, 10), DD.skinD, { outline: false });
  // a little sauce stain
  const [sx, sy] = tf.p(14 + 4 * (k - 1), -23);
  d.circle(sx, sy, 1.8 * k, 0xc83a2a, { outline: false, alpha: 0.7 });
}

/** round glasses, moustache and double chin (head frame, over the face) */
export function dadFace(d: Drawer, hf: Frame) {
  for (const [x, y, r] of [[11.5, 2.5, 6], [21.6, 2, 4.2]] as const) {
    const ring = ellipsePts(...hf.p(x, y), r * hf.k, r * hf.k * 0.92, hf.a, 18);
    d.poly(ring, 0xffffff, { outline: false, alpha: 0.12 });
    d.stroke([...ring, ring[0], ring[1]], 1.6 * hf.k, INK, 1);
  }
  d.stroke(hf.pts([17.4, 1.2, 19, 0.6]), 1.4 * hf.k, INK, 1);
  d.stroke(hf.pts([5.6, 1.4, -2, -0.5]), 1.4 * hf.k, INK, 1);
  d.poly(hf.pts([13.5, 10.6, 17.5, 9.2, 21.5, 9.6, 24.5, 11.2, 22, 12.2, 18, 11, 14.5, 12.2]), DD.hair, { lw: 1 });
  d.stroke(hf.pts([4, 21, 10, 25, 18, 25.5, 24, 21]), 1.3 * hf.k, DD.skinD, 0.9);
}

/** the giant chomping mouth (bite 0..1), over the face's own mouth */
export function chompMouth(d: Drawer, hf: Frame, amt: number) {
  if (amt < 0.2) return;
  const o = 4 + 10 * amt;
  d.poly(hf.pts([10, 11, 26, 9.5, 25.5, 11 + o, 18, 13 + o * 1.15, 10.5, 11 + o]), 0x5a0e16, { lw: 1.6 });
  // top and bottom teeth
  d.poly(hf.pts([11, 11.2, 25.6, 9.8, 25.4, 12.4, 11.2, 13.6]), 0xffffff, { outline: false });
  d.poly(hf.pts([12, 10 + o, 24.6, 10 + o * 0.95, 23.6, 12.4 + o * 0.95, 13, 12 + o]), 0xffffff, { outline: false });
  d.ellipse(...hf.p(18, 9 + o), 4 * hf.k, 1.8 * hf.k, hf.a, 0xff7a8a, { outline: false });
}

/** chopsticks held at g along a (s = scale); returns the tips */
export function chopsticks(d: Drawer, g: V2, a: number, s: number): V2 {
  const f = new Frame(g[0], g[1], a, s);
  d.limb(...f.p(-6, -1.6), ...f.p(40, -0.6), 1.7 * s, 1.0 * s, WOOD, { lw: 1.1 });
  d.limb(...f.p(-6, 1.6), ...f.p(40, 2.4), 1.7 * s, 1.0 * s, WOOD, { lw: 1.1 });
  d.stroke(f.pts([-6, -1.6, 2, -1.4]), 2.2 * s, 0xc83a2a, 0.9);
  d.stroke(f.pts([-6, 1.6, 2, 1.8]), 2.2 * s, 0xc83a2a, 0.9);
  return f.p(41, 1);
}

/** a big silver fork (tines forward) */
export function fork(d: Drawer, g: V2, a: number, s: number): V2 {
  const f = new Frame(g[0], g[1], a, s);
  d.limb(...f.p(-7, 0), ...f.p(22, 0), 2.6 * s, 1.8 * s, STEEL, { lw: 1.3 });
  d.poly(f.pts([22, -6, 28, -6, 28, 6, 22, 6, 20, 0]), STEEL, { lw: 1.3 });
  for (const y of [-5, -1.7, 1.7, 5]) d.limb(...f.p(27, y), ...f.p(42, y), 1.2 * s, 0.9 * s, STEEL, { lw: 1 });
  d.stroke(f.pts([-5, -1, 18, -1]), 0.8 * s, 0xffffff, 0.8);
  return f.p(42, 0);
}

/** a big rounded dinner knife */
export function knife(d: Drawer, g: V2, a: number, s: number): V2 {
  const f = new Frame(g[0], g[1], a, s);
  d.limb(...f.p(-7, 0), ...f.p(9, 0), 3.2 * s, 3 * s, WOOD, { lw: 1.3 });
  d.poly(f.pts([9, -3.6, 44, -3.4, 50, 0, 46, 4, 9, 3.6]), STEEL, { lw: 1.4 });
  d.stroke(f.pts([12, -1.4, 44, -1.4]), 1 * s, 0xffffff, 0.85);
  d.stroke(f.pts([12, 2.6, 44, 2.8]), 0.8 * s, STEEL_D, 0.9);
  return f.p(50, 0);
}

/** the dinner plate shield (centred at c, facing forward) */
export function plate(d: Drawer, c: V2, s: number) {
  if (s < 0.05) return;
  d.poly(ellipsePts(c[0], c[1], 9 * s, 21 * s, 0, 24), 0xffffff, { lw: 1.6 });
  d.poly(ellipsePts(c[0], c[1], 6 * s, 15 * s, 0, 20), 0xeef3fb, { outline: false });
  const rim = ellipsePts(c[0], c[1], 7.6 * s, 18 * s, 0, 24);
  d.stroke([...rim, rim[0], rim[1]], 1.4 * s, 0x2f6bd8, 0.9);
}

/** a steamed bun (bao) */
export function bao(d: Drawer, x: number, y: number, r: number, alpha = 1) {
  d.poly(ellipsePts(x, y, r, r * 0.8, 0, 18), 0xfffaf0, { lw: 1.2, alpha });
  d.stroke([x - r * 0.4, y - r * 0.5, x, y - r * 0.15, x + r * 0.4, y - r * 0.5], 1, 0xd8c8a8, alpha);
}

/** a chicken drumstick */
export function drumstick(d: Drawer, x: number, y: number, r: number, rot: number, alpha = 1) {
  const f = new Frame(x, y, rot, r / 6);
  d.poly(ellipsePts(...f.p(0, 0), r, r * 0.75, rot, 16), 0xc8782a, { lw: 1.2, alpha });
  d.limb(...f.p(5, 0), ...f.p(12, 0), 1.6 * (r / 6), 1.6 * (r / 6), 0xfff4e0, { lw: 1, alpha });
  d.circle(...f.p(13, -1.2), 1.6 * (r / 6), 0xfff4e0, { lw: 1, alpha });
  d.circle(...f.p(13, 1.2), 1.6 * (r / 6), 0xfff4e0, { lw: 1, alpha });
}

/** food circling him (mode 0) or streaming forward (mode 1) */
export function foodStorm(d: Drawer, cx: number, cy: number, amt: number, mode: number, t: number) {
  if (amt < 0.03) return;
  for (let i = 0; i < 6; i++) {
    const ph = t * 2.2 + i * (TAU / 6);
    const x = mode > 0.5 ? cx + 20 + ((t * 120 + i * 24) % 130) : cx + Math.cos(ph) * 42;
    const y = mode > 0.5 ? cy + Math.sin(ph * 1.4) * 12 : cy + Math.sin(ph) * 24 - 10;
    if (i % 2) bao(d, x, y, 5, amt);
    else drumstick(d, x, y, 5, ph, amt);
  }
}

/** a bun just thrown from the hand (cast) */
export function heldBao(d: Drawer, g: V2, a: number, k: number) {
  if (k < 0.05) return;
  const [ux, uy] = dir(a);
  bao(d, g[0] + ux * (12 + 18 * k), g[1] + uy * (12 + 18 * k) - 4, 6, k);
}
