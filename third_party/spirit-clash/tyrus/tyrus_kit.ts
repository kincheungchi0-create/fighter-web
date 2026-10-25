import { Frame, TAU, dir, ellipsePts, type Drawer } from './core';
import { HC } from './howard_kit';
import type { V2 } from './mario_kit';

/*
 * Tyrus: a sporty tennis kid. Teal sports jersey with white side stripes and a white V-neck, white shorts,
 * red headband and wristbands, white-and-teal sneakers, messy brown hair. He swings a tennis racket in
 * place of Howard's stationery; tennis balls replace the flying letters.
 */
export const TY = {
  ...HC,
  shirt: 0x22b89a, shirtD: 0x168a72, trimB: 0xffffff, trimY: 0xffffff,
  shorts: 0xf4f6fa, shortsD: 0xc8d0de, shortsL: 0xffffff,
  shoeB: 0x22b89a, shoeBD: 0x168a72, band: 0xe8343a, bandL: 0xff7a7a,
  swirl: 0xd8f040, swirlL: 0xf6ffc0, glow: 0xf6ffc0,
};

const BALL = 0xd8f040;
const BALL_D = 0xa8c020;
const RED = 0xe8343a;

/** white V-neck and side stripes on the jersey (torso frame, drawn after the torso) */
export function jerseyTrim(d: Drawer, tf: Frame) {
  const Y1 = -32;
  d.stroke([...tf.p(-6, Y1 - 1.5), ...tf.p(1.5, Y1 + 6), ...tf.p(8.5, Y1 - 1.5)], 2.2, 0xffffff, 1);
  d.stroke([...tf.p(11, -28), ...tf.p(12.5, -2)], 2, 0xffffff, 0.9);
  d.stroke([...tf.p(-10.5, -28), ...tf.p(-11.5, -2)], 2, 0xffffff, 0.9);
  // the number 1 on the chest
  d.stroke([...tf.p(1, -24), ...tf.p(3, -26), ...tf.p(3, -15)], 1.8, 0xffffff, 0.95);
}

/** red sweatband across the forehead (head frame, drawn over the hair) */
export function headband(d: Drawer, hf: Frame) {
  d.poly(hf.pts([-22, -12, -6, -14, 10, -13.5, 26, -10, 26.5, -5, 10, -8.5, -6, -9, -22.5, -7]), RED, { lw: 1.6 });
  d.stroke(hf.pts([-20, -10.5, -6, -12, 10, -11.5, 24, -8.5]), 1, 0xff9a9a, 0.8);
  // knot tails at the back
  d.poly(hf.pts([-22, -11, -30, -16, -28, -9]), RED, { lw: 1.4 });
  d.poly(hf.pts([-22, -9, -31, -6, -26, -4]), RED, { lw: 1.4 });
}

/** a tennis ball (rig units) */
export function tennisBall(d: Drawer, x: number, y: number, r: number, rot: number, alpha = 1) {
  d.circle(x, y, r, BALL, { lw: 1.2, alpha });
  const c = Math.cos(rot), s = Math.sin(rot);
  const seam = (k: number) => {
    const pts: number[] = [];
    for (let i = 0; i <= 8; i++) {
      const u = -0.9 + (1.8 * i) / 8;
      const lx = k * r * (0.55 + 0.35 * Math.cos(u * 1.6)), ly = r * 0.85 * Math.sin(u);
      pts.push(x + lx * c - ly * s, y + lx * s + ly * c);
    }
    d.stroke(pts, Math.max(0.7, r * 0.18), 0xffffff, 0.95 * alpha);
  };
  seam(1);
  seam(-1);
  d.circle(x - r * 0.3, y - r * 0.35, r * 0.25, 0xffffff, { outline: false, alpha: 0.35 * alpha });
  void BALL_D;
}

/** tennis racket gripped at g, pointing along a (s = scale). Returns the tip of the head. */
export function racket(d: Drawer, g: V2, a: number, s: number): V2 {
  if (s < 0.02) return g;
  const f = new Frame(g[0], g[1], a, s);
  // grip + throat
  d.limb(...f.p(-7, 0), ...f.p(9, 0), 2.6 * s, 2.3 * s, 0x2a2a34, { lw: 1.4 });
  d.stroke(f.pts([-5, -2.2, -3, 2.2, -1, -2.2, 1, 2.2, 3, -2.2, 5, 2.2]), 0.7 * s, 0x55556a, 0.9);
  d.poly(f.pts([9, -1.6, 20, -6.5, 21.5, -4.5, 12, 0, 21.5, 4.5, 20, 6.5, 9, 1.6]), RED, { lw: 1.3 });
  // head: frame + strings
  const cx = 35, rx = 15, ry = 11.5;
  d.poly(ellipsePts(...f.p(cx, 0), rx * s, ry * s, a, 24), 0xffffff, { lw: 1.6, alpha: 0.25 });
  for (let i = -3; i <= 3; i++) {
    const ly = (i / 3.6) * ry;
    const w = rx * Math.sqrt(Math.max(0, 1 - (ly / ry) ** 2));
    d.stroke(f.pts([cx - w, ly, cx + w, ly]), 0.6 * s, 0xffffff, 0.85);
  }
  for (let i = -4; i <= 4; i++) {
    const lx = (i / 4.6) * rx;
    const h = ry * Math.sqrt(Math.max(0, 1 - (lx / rx) ** 2));
    d.stroke(f.pts([cx + lx, -h, cx + lx, h]), 0.6 * s, 0xffffff, 0.85);
  }
  const ring = ellipsePts(...f.p(cx, 0), rx * s, ry * s, a, 24);
  d.stroke([...ring, ring[0], ring[1]], 3.2 * s, RED, 1);
  d.stroke([...ring, ring[0], ring[1]], 1.1 * s, 0xff9a9a, 0.8);
  return f.p(cx + rx, 0);
}

/** tennis balls circling him (mode 0) or streaming forward (mode 1) */
export function ballStorm(d: Drawer, cx: number, cy: number, amt: number, mode: number, t: number) {
  if (amt < 0.03) return;
  for (let i = 0; i < 7; i++) {
    const ph = t * 2.6 + i * (TAU / 7);
    const x = mode > 0.5 ? cx + 18 + ((t * 140 + i * 22) % 130) : cx + Math.cos(ph) * 42;
    const y = mode > 0.5 ? cy + Math.sin(ph * 1.4) * 12 : cy + Math.sin(ph) * 24 - 10;
    tennisBall(d, x, y, 4.2, ph, amt);
  }
}

/** a tennis ball just tossed above the hand (serve) */
export function tossBall(d: Drawer, g: V2, a: number, k: number, t: number) {
  if (k < 0.05) return;
  const [ux, uy] = dir(a);
  tennisBall(d, g[0] + ux * 10, g[1] + uy * 10 - 18 * k, 4.4, t * 5, k);
}
