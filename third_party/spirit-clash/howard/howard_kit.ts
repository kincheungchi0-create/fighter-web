import { Frame, OUTLINE, TAU, bezier, dir, ellipsePts, mix, shade, type Drawer, type DrawCtx, type P } from './core';
import { at, cl, sstep, type V2 } from './mario_kit';
import { arc, tube } from './round_kit';
import { hash, star } from './hero_kit';
import { footRot } from './hero2_kit';

/*
 * Parts, props and effects for Howard (howard.ts): a cheerful 7-year-old Hong Kong schoolboy who
 * fights with stationery. Body parts (sneakers, polo shirt with a trimmed collar, wristbands,
 * fluffy brown hair, big brown anime eyes), the props (giant pencil, ballpoint-pen sword, teal
 * textbook that opens, spiral notebook, wooden ruler) and the effects (homework wave / alphabet
 * storm of flying pages and letters, lightbulb idea, gold burst, slash arcs, impact stars).
 * Everything is a smooth function of its inputs, so pose blends never pop.
 */

export const HC = {
  skin: 0xffdcbc, skinD: 0xeaa886, skinL: 0xfff2e4, cheek: 0xff8e84,
  hair: 0x4a2f22, hairD: 0x2a1910, hairL: 0x80583e,
  shirt: 0xfbfcff, shirtD: 0xc6d0e6, trimB: 0x2a5cc8, trimY: 0xf6c63a,
  shorts: 0x243262, shortsD: 0x161f44, shortsL: 0x3b4c8a,
  sock: 0xfcfcfc, sockD: 0xd6dbe8,
  shoe: 0xf6f8fc, shoeB: 0x2f62d6, shoeBD: 0x1d3e94, sole: 0xe4e8f0,
  band: 0x24242e, bandL: 0x55556a,
  eye: 0x6a3c1e, eyeL: 0xb8743a, ink: 0x1c1216, mouth: 0x8a2832, tongue: 0xff8a90, teeth: 0xffffff,
  pack: 0x24346e, packD: 0x161f4a, packL: 0x3a50a0, packY: 0xf6c63a,
  book: 0x1f8a8e, bookD: 0x12585c, bookL: 0x4cbab8, gold: 0xf6c63a, page: 0xfffcf2, pageD: 0xe4dccb,
  pencil: 0xffc82e, pencilL: 0xffe680, pencilD: 0xe09a0c, wood: 0xf3cf98, lead: 0x3c3c48, eraser: 0xf58aa0, eraserD: 0xd25f7e, metal: 0xc8ccd8, metalD: 0x868c9e,
  pen: 0x2d62d8, penL: 0x7ea8ff, penD: 0x1a3c8e, ruler: 0xf0cf8a, rulerD: 0xc89a52,
  swirl: 0x6fb4ff, swirlL: 0xd8ecff, glow: 0xfff0a0,
};
type HCol = typeof HC;

// ----------------------------------------------------------------- small helpers
/** Rounded rectangle polygon. */
export function rrect(x0: number, y0: number, x1: number, y1: number, r: number): number[] {
  r = Math.min(r, (x1 - x0) / 2, (y1 - y0) / 2);
  return [
    ...arc(x1 - r, y0 + r, r, -Math.PI / 2, 0, 4), ...arc(x1 - r, y1 - r, r, 0, Math.PI / 2, 4),
    ...arc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, 4), ...arc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, 4),
  ];
}

/** Five-point star polygon. */
export function star5(x: number, y: number, r: number, rot = 0, inner = 0.45): number[] {
  const o: number[] = [];
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * inner : r;
    o.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  return o;
}

// ----------------------------------------------------------------- stroke font
const C_ARC = arc(0, 0, 0.46, -0.8, -TAU + 0.8, 14).map((v, i) => (i % 2 ? v * 1.08 : v));
const GLYPHS: Record<string, number[][]> = {
  A: [[-0.36, 0.5, 0, -0.5, 0.36, 0.5], [-0.2, 0.14, 0.2, 0.14]],
  B: [[-0.28, 0.5, -0.28, -0.5], bezier([-0.28, -0.5, 0.4, -0.52, 0.4, 0.02, -0.28, 0], 8), bezier([-0.28, 0, 0.48, -0.02, 0.48, 0.54, -0.28, 0.5], 8)],
  C: [C_ARC],
  '1': [[-0.18, -0.3, 0.04, -0.5, 0.04, 0.5], [-0.2, 0.5, 0.28, 0.5]],
  '2': [[...bezier([-0.3, -0.26, -0.24, -0.58, 0.38, -0.6, 0.28, -0.16], 8), -0.3, 0.5, 0.34, 0.5]],
  '3': [bezier([-0.28, -0.38, -0.05, -0.62, 0.46, -0.45, 0, -0.03], 8), bezier([0, -0.03, 0.56, 0, 0.42, 0.62, -0.3, 0.38], 8)],
  '0': [ellipsePts(0, 0, 0.3, 0.48, 0, 16).concat([0.3, 0])],
  // 字: dot, roof, then 子
  Z: [[0, -0.58, 0.06, -0.44], [-0.46, -0.16, -0.46, -0.32, 0.46, -0.32, 0.42, -0.16], [-0.28, -0.08, 0.3, -0.08, 0.03, 0.1], [0.03, 0.1, 0.03, 0.55, -0.12, 0.47], [-0.48, 0.22, 0.48, 0.22]],
};

/** A letter drawn as a thick outlined stroke (A B C 1 2 3 0, Z = 字). */
export function glyph(d: Drawer, ch: string, x: number, y: number, size: number, rot: number, color: number, alpha = 1, outline = true) {
  const gl = GLYPHS[ch];
  if (!gl || size < 0.5 || d.flat !== null) return;
  const f = new Frame(x, y, rot, size);
  const lw = size * 0.17;
  const strokes = gl.map((s) => f.pts(s));
  if (outline) {
    for (const s of strokes) {
      d.stroke(s, lw + 2.4, OUTLINE, alpha);
      d.circle(s[0], s[1], (lw + 2.4) / 2, OUTLINE, { outline: false, alpha });
      d.circle(s[s.length - 2], s[s.length - 1], (lw + 2.4) / 2, OUTLINE, { outline: false, alpha });
    }
  }
  for (const s of strokes) {
    d.stroke(s, lw, color, alpha);
    d.circle(s[0], s[1], lw / 2, color, { outline: false, alpha });
    d.circle(s[s.length - 2], s[s.length - 1], lw / 2, color, { outline: false, alpha });
  }
  if (outline) for (const s of strokes) d.stroke(s.slice(0, Math.min(s.length, 6)), lw * 0.35, 0xffffff, 0.45 * alpha);
}

// ----------------------------------------------------------------- body
export function leg(d: Drawer, C: HCol, hip: V2, knee: V2, ft: V2, k: number, sole: number) {
  tube(d, [hip, knee, ft], [5.4, 4.5, 4], shade(C.skin, k));
  // shorts leg, flared hem just above the knee
  const s1 = at(hip, knee, 0.68);
  d.limb(hip[0], hip[1], s1[0], s1[1], 8.2, 7.4, shade(C.shorts, k), { lw: 2 });
  const [nx, ny] = dir(Math.atan2(s1[1] - hip[1], s1[0] - hip[0]) + Math.PI / 2);
  d.stroke([s1[0] - nx * 6.4, s1[1] - ny * 6.4, s1[0] + nx * 6.4, s1[1] + ny * 6.4], 1.3, shade(C.shortsD, k), 0.8);
  d.stroke([...at(hip, s1, 0.25), ...at(hip, s1, 0.8)].map((v, i) => v + (i % 2 ? ny : nx) * -3.5), 1.3, shade(C.shortsL, k), 0.55);
  // sock with a ribbed top
  const s2 = at(knee, ft, 0.42);
  d.limb(s2[0], s2[1], ft[0], ft[1], 4.6, 4.4, shade(C.sock, k), { lw: 1.8 });
  const s3 = at(knee, ft, 0.52);
  const [mx, my] = dir(Math.atan2(ft[1] - knee[1], ft[0] - knee[0]) + Math.PI / 2);
  d.stroke([s3[0] - mx * 4, s3[1] - my * 4, s3[0] + mx * 4, s3[1] + my * 4], 1, shade(C.sockD, k), 0.9);
  // blue-and-white sneaker
  const f = new Frame(ft[0], ft[1], footRot(knee, ft, -0.7, 0.5) * sstep(1, 12, -ft[1] - sole));
  d.poly(f.pts([-6.5, -4, -1.5, -7, 6, -6.6, 11, -4, 14, 0, 13, 4, -5.5, 4, -8, 0.5]), shade(C.shoe, k));
  d.poly(f.pts([-2, -6.6, 3.5, -6.6, 8.5, -1, 1, 0.6, -6.6, -1.2, -7, -3.2]), shade(C.shoeB, k), { lw: 1.4 });
  d.poly(f.pts([-8, 1.4, 13.9, 1.4, 13, 4.4, -5.5, 4.4]), shade(C.sole, k), { lw: 1.6 });
  d.stroke(f.pts([-7.4, 2.9, 13.4, 2.9]), 0.9, shade(C.shoeBD, k), 0.5);
  d.poly(f.pts([9, -4.6, 11.6, -3.6, 14, 0, 13.9, 1.4, 9.6, 1.4]), shade(C.shoeB, k), { outline: false, alpha: 0.85 });
  d.stroke(f.pts([1.5, -5.4, 4.2, -2.6]), 1.1, shade(C.shoeBD, k), 0.9);
  d.stroke(f.pts([3.6, -6, 6.2, -3.4]), 1.1, shade(C.shoeBD, k), 0.9);
  d.stroke(f.pts([-4.5, -5, 0, -6.4]), 1.1, 0xffffff, 0.5 * k);
}

export function arm(d: Drawer, C: HCol, s: V2, e: V2, h: V2, k: number) {
  tube(d, [s, e, h], [4.6, 4, 3.6], shade(C.skin, k));
  // short polo sleeve with a blue / yellow trimmed cuff
  const sl = at(s, e, 0.62);
  d.limb(s[0], s[1], sl[0], sl[1], 6.4, 5.8, shade(C.shirt, k), { lw: 2 });
  const [nx, ny] = dir(Math.atan2(e[1] - s[1], e[0] - s[0]) + Math.PI / 2);
  const c0 = at(s, e, 0.585), c1 = at(s, e, 0.53);
  d.stroke([c0[0] - nx * 5.4, c0[1] - ny * 5.4, c0[0] + nx * 5.4, c0[1] + ny * 5.4], 2.6, shade(C.trimB, k), 1);
  d.stroke([c1[0] - nx * 5.8, c1[1] - ny * 5.8, c1[0] + nx * 5.8, c1[1] + ny * 5.8], 0.9, C.trimY, 0.95);
  d.stroke([...at(s, sl, 0.15), ...at(s, sl, 0.4)].map((v, i) => v + (i % 2 ? ny : nx) * -3.5), 1.6, shade(C.shirtD, k), 0.5);
  // black wristband
  const w0 = at(e, h, 0.66);
  d.limb(w0[0], w0[1], h[0], h[1], 4.6, 4.6, shade(C.band, k), { lw: 1.6 });
  const w1 = at(e, h, 0.8);
  d.stroke([w1[0] - nx * 3.6, w1[1] - ny * 3.6, w1[0] + nx * 3.6, w1[1] + ny * 3.6], 0.9, C.bandL, 0.7 * k);
}

export function fist(d: Drawer, C: HCol, h: V2, a: number, k: number, r = 4.9) {
  const [ux, uy] = dir(a);
  const x = h[0] + ux * 2.6, y = h[1] + uy * 2.6;
  d.circle(x, y, r, shade(C.skin, k), { lw: 2 });
  const f = new Frame(x, y, a);
  d.stroke(f.pts([1.5, -r * 0.7, 2.4, 0, 1.5, r * 0.7]), 1, shade(C.skinD, k), 0.8);
  d.circle(x - uy * 1.2 + ux * 0.4, y + ux * -1.2 + uy * 0.4 - 1.2, 1.5, C.skinL, { outline: false, alpha: 0.7 * k });
}

/** Open palm (homework wave push, catching papers). */
export function palm(d: Drawer, C: HCol, h: V2, a: number, k: number) {
  const f = new Frame(h[0], h[1], a);
  const col = shade(C.skin, k);
  for (const [fy, L] of [[-3.4, 8.5], [-1.1, 9.8], [1.2, 9.4], [3.3, 8]] as [number, number][]) d.limb(...f.p(4, fy * 0.9), ...f.p(L, fy * 1.2), 1.4, 1.3, col, { lw: 1.4 });
  d.limb(...f.p(2, -3.5), ...f.p(5.5, -7.5), 1.6, 1.4, col, { lw: 1.4 });
  d.ellipse(...f.p(3.4, 0), 4.4, 4.6, a, col, { lw: 1.8 });
}

/** Polo shirt (untucked, hem on a spring) over navy shorts; badge, placket. */
/** `school` = the polo placket and school badge (Chiikawa Howard wears a plain T-shirt) */
export function torso(d: Drawer, C: HCol, tf: Frame, sway: number, school = true) {
  const Fw = (u: number) => 12.2 + 2.2 * Math.sin(Math.PI * u) - 2.6 * u * u * u;
  const Bw = (u: number) => 11.6 + 1.4 * Math.sin(Math.PI * u) - 2 * u * u * u;
  const Y0 = 3, Y1 = -32;
  const Y = (u: number) => Y0 + (Y1 - Y0) * u;
  // shorts
  d.poly(tf.pts([-12.5, -6, 12.8, -6, 13.8, 3, 11.8, 10, 3, 11, 0, 7, -3, 11, -12.5, 10, -13.8, 3]), C.shorts);
  d.poly(tf.pts([-12.5, -6, -4, -6, -3, 11, -12.5, 10, -13.8, 3]), C.shortsD, { outline: false, alpha: 0.5 });
  const out: number[] = [];
  const N = 8;
  for (let i = 0; i <= N; i++) { const u = i / N; out.push(...tf.p(-Bw(u) + sway * (1 - u), Y(u))); }
  out.push(...tf.p(-6, Y1 - 3), ...tf.p(0, Y1 - 3.8), ...tf.p(6, Y1 - 3));
  for (let i = N; i >= 0; i--) { const u = i / N; out.push(...tf.p(Fw(u) + sway * (1 - u), Y(u))); }
  out.push(...tf.p(4 + sway, Y0 + 1), ...tf.p(-4 + sway, Y0 + 1.2));
  d.poly(out, C.shirt);
  // soft cool shading down the back half and under the chest
  const sh: number[] = [];
  for (let i = 0; i <= N; i++) { const u = i / N; sh.push(...tf.p(-Bw(u) + 1 + sway * (1 - u), Y(u))); }
  for (let i = N; i >= 0; i--) { const u = i / N; sh.push(...tf.p(-Bw(u) * 0.15 + sway * (1 - u), Y(u))); }
  d.poly(sh, C.shirtD, { outline: false, alpha: 0.42 });
  d.stroke([...tf.p(-4 + sway, Y0 - 1), ...tf.p(3 + sway * 0.8, Y(0.2)), ...tf.p(9 + sway * 0.7, Y(0.26))], 1.2, C.shirtD, 0.75);
  d.stroke([...tf.p(Fw(0.62) - 2.4, Y(0.55)), ...tf.p(Fw(0.82) - 3, Y(0.82))], 2, 0xffffff, 0.8);
  // hem band
  d.stroke([...tf.p(-Bw(0) + 1 + sway, Y0 - 2), ...tf.p(Fw(0) - 1 + sway, Y0 - 2)], 1, C.shirtD, 0.8);
  if (!school) return;
  // placket with buttons
  d.stroke([...tf.p(7.2, Y1 + 1), ...tf.p(7.6, Y(0.62))], 1.2, C.shirtD, 0.9);
  d.circle(...tf.p(7.4, Y(0.86)), 1, 0xe8ecf6, { lw: 0.9 });
  d.circle(...tf.p(7.5, Y(0.72)), 1, 0xe8ecf6, { lw: 0.9 });
  // school badge: blue disc, gold ring, gold star (no logo or text)
  const [bx, by] = tf.p(1.5, Y(0.7));
  d.circle(bx, by, 4.3, C.trimB, { lw: 1.4 });
  d.stroke(arc(bx, by, 3.1, 0, TAU, 16), 0.9, C.trimY, 1);
  d.poly(star5(bx, by + 0.2, 2.3, tf.a - Math.PI / 2), C.trimY, { outline: false });
}

/** Polo collar: white flaps trimmed in blue with a yellow pinstripe (drawn over the neck). */
export function collar(d: Drawer, C: HCol, tf: Frame) {
  const Y1 = -32;
  d.poly(tf.pts([-7.5, Y1 - 2.4, -2, Y1 - 3.6, 4, Y1 - 3.4, 8.5, Y1 - 1.6, 6, Y1 + 0.5, -4, Y1 + 0.5]), C.trimB, { lw: 1.6 });
  for (const fl of [[1.5, Y1 - 2.2, 10.5, Y1 - 2.4, 8.4, Y1 + 5.6], [1.5, Y1 - 2.2, -6.5, Y1 - 3.2, -3.4, Y1 + 4.8]]) {
    d.poly(tf.pts(fl), C.shirt, { lw: 1.6 });
    const p = tf.pts(fl);
    d.stroke([p[2], p[3], p[4], p[5]], 1.6, C.trimB, 1);
    d.stroke([...at([p[0], p[1]], [p[2], p[3]], 0.75), ...at([p[0], p[1]], [p[4], p[5]], 0.78)], 0.9, C.trimY, 0.95);
  }
}

export function backpack(d: Drawer, C: HCol, bf: Frame, charmA: number) {
  // body, side shade, front pocket with a yellow zip and piping
  d.poly(bf.pts(rrect(-8, -14, 7, 13, 5)), C.packD);
  d.poly(bf.pts(rrect(-6.5, -13, 6, 11.5, 4.4)), C.pack, { outline: false });
  d.stroke(bf.pts([-4.5, -11.5, 3.5, -12]), 1.6, C.packL, 0.8);
  d.poly(bf.pts(rrect(-7, 0, 5.5, 12, 3.6)), C.packL, { lw: 1.6 });
  d.stroke(bf.pts([-6, 2.5, 4.5, 2.5]), 1.3, C.packY, 0.95);
  d.stroke(bf.pts([-8, -6, -8, 9]), 1.4, C.packY, 0.9);
  // top handle
  d.stroke(bf.pts([-3, -14, -2, -17.5, 2, -17.5, 3, -14]), 2.6, OUTLINE, 0.9);
  d.stroke(bf.pts([-3, -14, -2, -17.5, 2, -17.5, 3, -14]), 1.3, C.packD, 1);
  // zip pull with a little star charm swinging on its ring
  const ring = bf.p(-5.5, 2.5);
  const [cx, cy] = [ring[0] + Math.sin(charmA) * 6, ring[1] + Math.cos(charmA) * 6];
  d.stroke([...ring, cx, cy], 1, OUTLINE, 0.9);
  d.poly(star5(cx, cy + 1, 3.2, charmA * 0.6), C.packY, { lw: 1.3 });
}

export function straps(d: Drawer, C: HCol, tf: Frame) {
  const s = tf.pts([-7, -33, 1, -31, 5, -23, 4, -12]);
  d.stroke(s, 4.6, OUTLINE, 0.95);
  d.stroke(s, 3, C.packD, 1);
  d.stroke(tf.pts([1.5, -30, 4.5, -23, 3.6, -14]), 0.9, C.packY, 0.9);
  d.poly(tf.pts(rrect(1.6, -19, 6.6, -16.4, 0.8)), C.packY, { lw: 1 });
}

// ----------------------------------------------------------------- head
export function face(d: Drawer, C: HCol, hf: Frame, p: P, ctx: DrawCtx) {
  const E = (x: number, y: number, rx: number, ry: number, col: number, o?: { outline?: boolean; alpha?: number; lw?: number }, rot = 0) => d.ellipse(...hf.p(x, y), rx * hf.k, ry * hf.k, hf.a + rot, col, o);
  const fc = p.face ?? 0;
  E(2, 3, 23, 21.5, C.skin);
  E(-5, 7, 16, 14, C.skinD, { outline: false, alpha: 0.18 });
  // ear
  E(-6, 8, 4.2, 5.4, C.skin, { lw: 2 });
  d.stroke(hf.pts([-5.4, 5.4, -7.8, 8, -5.8, 10.8]), 1.1, C.skinD);
  // nose
  d.poly(hf.pts([23, 3, 26.8, 6.5, 25.6, 8.6, 22.8, 9]), C.skin, { lw: 1.5 });
  const det = fc > 0.5 && fc < 1.5, hurt = fc > 1.5 && fc < 2.5, happy = fc >= 2.5;
  const eyes: [number, number, number][] = [[11.5, 2.5, 1], [21.6, 2, 0.66]];
  for (const [x, y, k] of eyes) {
    if (hurt) d.stroke(hf.pts([x - 3.2 * k, y - 3.4, x + 2.2 * k, y, x - 3.2 * k, y + 3.4]), 2.1, C.ink);
    else if (happy) d.stroke(hf.pts([x - 3.6 * k, y + 1.6, x - 1.6 * k, y - 1.8, x + 1.6 * k, y - 1.8, x + 3.6 * k, y + 1.6]), 2.2, C.ink);
    else if (ctx.blink) d.stroke(hf.pts([x - 3.6 * k, y + 0.8, x, y + 1.6, x + 3.6 * k, y + 0.8]), 2, C.ink);
    else {
      const sq = det ? 0.86 : 1;
      E(x, y + 0.3, 3.9 * k, 5.2 * sq, C.ink, { outline: false });
      E(x + 0.1 * k, y + 1, 3.1 * k, 4.2 * sq, C.eye, { outline: false });
      E(x + 0.2 * k, y + 2.4, 2.4 * k, 2.4 * sq, C.eyeL, { outline: false, alpha: 0.85 });
      E(x + 0.2 * k, y + 0.6, 1.5 * k, 2.2 * sq, C.ink, { outline: false });
      E(x + 1.2 * k, y - 1.6, 1.4 * k, 1.7, 0xffffff, { outline: false });
      E(x - 1.2 * k, y + 2.8, 0.7 * k, 0.7, 0xffffff, { outline: false, alpha: 0.85 });
      // upper lid: thick lash line
      d.stroke(hf.pts([x - 4.2 * k, y - 2.4 * sq, x - 1.5 * k, y - 5.1 * sq, x + 2.2 * k, y - 5 * sq, x + 4.3 * k, y - 3.4 * sq]), 1.9, C.ink, 1);
      if (det) d.stroke(hf.pts([x - 4 * k, y - 4.2, x + 4 * k, y - 2.4]), 1.6, C.ink, 0.9);
    }
  }
  E(9.5, 11, 4.8, 2.8, C.cheek, { outline: false, alpha: 0.45 });
  E(21.6, 10.6, 1.8, 1.6, C.cheek, { outline: false, alpha: 0.4 });
  if (hurt) {
    E(17.5, 15.4, 2.6, 2.2, C.mouth, { lw: 1.2 });
  } else if (happy) {
    // laughing open mouth
    d.poly(hf.pts([12, 12.4, 23, 12, 21.6, 16.6, 17.5, 19, 14, 17]), C.mouth, { lw: 1.4 });
    d.poly(hf.pts([12.8, 12.6, 22.4, 12.2, 22, 13.8, 13.4, 14]), C.teeth, { outline: false });
    E(17.6, 17, 2.8, 1.4, C.tongue, { outline: false });
  } else if (det) {
    // gritted confident grin
    d.poly(hf.pts([12.6, 12.6, 22, 11.8, 21, 15, 14, 15.4]), C.teeth, { lw: 1.3 });
    d.stroke(hf.pts([13.4, 14, 21.2, 13.4]), 0.8, C.shirtD, 0.9);
  } else {
    // confident grin, one corner up
    d.poly(hf.pts([12.5, 12, 22.6, 11.2, 21, 14.6, 16.6, 16.4, 14, 14.8]), C.mouth, { lw: 1.3 });
    d.poly(hf.pts([13.2, 12.2, 22, 11.5, 21.4, 13, 13.8, 13.4]), C.teeth, { outline: false });
    d.stroke(hf.pts([22.4, 11, 23.6, 9.8]), 1.2, C.ink, 0.8);
  }
}

/** Brows, drawn over the fringe (anime style). */
export function brows(d: Drawer, C: HCol, hf: Frame, p: P) {
  const fc = p.face ?? 0;
  const det = fc > 0.5 && fc < 1.5, hurt = fc > 1.5 && fc < 2.5;
  for (const [x, y, k] of [[11.5, 2.5, 1], [21.6, 2, 0.66]] as [number, number, number][]) {
    const by = y - 7.8 - (hurt ? 0.8 : 0);
    const pts = hf.pts([x - 3.8 * k, by + (det ? -1.2 : hurt ? 1.2 : 0.3), x, by - (det ? -0.6 : 0.7), x + 3.4 * k, by + (det ? 2 : hurt ? -1 : 0.2)]);
    d.stroke(pts, 3.4, OUTLINE, 0.9);
    d.stroke(pts, 1.8, C.hair, 1);
  }
}

/** Messy, fluffy brown hair with spiky tufts; `tu` is the spring offset of the loose tufts. */
export function hair(d: Drawer, C: HCol, hf: Frame, tu: V2) {
  const [tx, ty] = tu;
  // loose tufts behind (spring)
  const tuft = (bx: number, by: number, mx: number, my: number, ex: number, ey: number, w: number, kx: number) => {
    const line = bezier(hf.pts([bx, by, mx + tx * kx * 0.5, my + ty * kx * 0.5, ex + tx * kx, ey + ty * kx]), 6);
    d.ribbon(line, (u) => w * (1 - u * 0.92), C.hair, { lw: 1.8 });
  };
  tuft(-14, -16, -24, -22, -31, -20, 4.6, 1);
  tuft(-17, -6, -27, -8, -32, -3, 4, 1.1);
  tuft(-4, -22, -10, -32, -16, -35, 4, 0.9);
  // main mass: messy crown spikes, back, nape, fringe spikes across the forehead
  d.poly(hf.pts([
    -13, 16, -19, 12, -22.5, 5, -25.5, 2, -23.5, -3, -26.5, -9, -22.5, -12.5, -23.5, -19.5, -17.5, -20.5, -15.5, -26.5, -9, -24.5,
    -3, -29.5, 3, -25.5, 10, -28.8, 13.5, -24, 20.2, -24.4, 20.5, -19.5, 26, -16, 24.5, -12,
    28.6, -7.4, 23.5, -7.5, 25, -1, 19.5, -4.5, 18, 1.5, 14, -4, 10.5, 0.5, 7.5, -5, 4, -0.5, 2.5, -3, 1.5, 4.5,
    -2.5, 0.5, -5.5, 0, -9, 3, -10.5, 10, -11.5, 14,
  ]), C.hair);
  // shading underneath, warm highlight sheen on top
  d.poly(hf.pts([-19, 12, -22.5, 5, -24, -2, -26, -8, -20, -6, -16, 4, -12.5, 15]), C.hairD, { outline: false, alpha: 0.5 });
  d.poly(hf.pts([4, -1, 7.5, -5, 10.5, 0.5, 14, -4, 18, 1.5, 19.5, -4.5, 23, -3, 20, -9, 6, -8]), C.hairD, { outline: false, alpha: 0.35 });
  d.stroke(bezier(hf.pts([-15, -15, -8, -22, 3, -23, 11, -19]), 8), 2.4, C.hairL, 0.8);
  d.stroke(bezier(hf.pts([-11, -12, -4, -17, 4, -17.5, 9, -14.5]), 6), 1.2, C.hairL, 0.5);
  d.stroke(bezier(hf.pts([-20, -6, -17, -12, -12, -14]), 5), 1.6, C.hairL, 0.6);
  d.stroke(hf.pts([-1, -26, 3, -15, 2, -7]), 1.2, C.hairD, 0.7);
  d.stroke(hf.pts([14, -22, 16, -12, 14, -6]), 1.2, C.hairD, 0.7);
  // one springy fringe tuft over the brow
  tuft(16, -14, 22, -16, 27 + 0.2, -6, 3, 0.35);
}

// ----------------------------------------------------------------- props
/** Giant yellow pencil: grip at g, pointing along a, scale s. Returns the tip. */
export function pencil(d: Drawer, C: HCol, g: V2, a: number, s: number, glowAmt: number, t: number): V2 {
  const f = new Frame(g[0], g[1], a, s);
  const hw = 4.4;
  if (glowAmt > 0.02) for (const u of [-14, 6, 26, 46]) d.glow(...f.p(u, 0), 16 * s, C.glow, 0.32 * glowAmt * (0.85 + 0.15 * Math.sin(t * 9 + u)));
  // eraser and ferrule
  d.poly(f.pts([-19, -hw, -25, -hw, ...arc(-25, 0, hw, -Math.PI / 2, -Math.PI * 1.5, 6), -19, hw]), C.eraser, { lw: 1.8 });
  d.poly(f.pts([-25, hw * 0.35, -19, hw * 0.35, -19, hw, -25, hw]), C.eraserD, { outline: false, alpha: 0.7 });
  d.poly(f.pts([-20, -hw - 0.4, -12, -hw - 0.4, -12, hw + 0.4, -20, hw + 0.4]), C.metal, { lw: 1.8 });
  for (const x of [-17.5, -14.5]) d.stroke(f.pts([x, -hw, x, hw]), 1, C.metalD, 0.9);
  d.stroke(f.pts([-19.5, -hw * 0.5, -12.5, -hw * 0.5]), 1.2, 0xffffff, 0.7);
  // hexagonal yellow body: lit top facet, shaded bottom facet
  d.poly(f.pts([-12, -hw, 41, -hw, 41, hw, -12, hw]), C.pencil, { lw: 1.9 });
  d.poly(f.pts([-12, -hw, 41, -hw, 41, -hw / 3, -12, -hw / 3]), C.pencilL, { outline: false });
  d.poly(f.pts([-12, hw / 3, 41, hw / 3, 41, hw, -12, hw]), C.pencilD, { outline: false });
  d.stroke(f.pts([-10, -hw * 0.68, 38, -hw * 0.68]), 1, 0xffffff, 0.55);
  // sharpened wood cone with a scalloped paint edge, then the lead
  d.poly(f.pts([40.5, -hw, 53, -1.5, 53, 1.5, 40.5, hw]), C.wood, { lw: 1.8 });
  for (const y of [-hw * 0.66, 0, hw * 0.66]) d.ellipse(...f.p(41, y), 2.6 * s, 1.5 * s, a, y < 0 ? C.pencilL : y > 0 ? C.pencilD : C.pencil, { outline: false });
  d.stroke(f.pts([41, -hw, 43.4, -hw * 0.66, 41, -hw * 0.33, 43.6, 0, 41, hw * 0.33, 43.4, hw * 0.66, 41, hw]), 1, OUTLINE, 0.6);
  d.poly(f.pts([52.6, -1.7, 59, 0, 52.6, 1.7]), C.lead, { lw: 1.5 });
  d.stroke(f.pts([53.4, -0.8, 57, -0.2]), 0.8, 0xa0a0b4, 0.9);
  return f.p(59, 0);
}

/** Big ballpoint pen used like a sword. Returns the tip. */
export function pen(d: Drawer, C: HCol, g: V2, a: number, s: number): V2 {
  const f = new Frame(g[0], g[1], a, s);
  // clicker and end cap
  d.limb(...f.p(-22, 0), ...f.p(-18, 0), 1.8 * s, 1.8 * s, C.metal, { lw: 1.4 });
  d.limb(...f.p(-18, 0), ...f.p(-9, 0), 3.4 * s, 3.4 * s, C.penD, { lw: 1.8 });
  // barrel
  d.limb(...f.p(-9, 0), ...f.p(30, 0), 3.6 * s, 3.4 * s, C.pen, { lw: 1.9 });
  d.stroke(f.pts([-8, -1.6, 28, -1.5]), 1.4 * s, C.penL, 0.75);
  d.stroke(f.pts([-8, 2, 28, 1.9]), 1.2 * s, C.penD, 0.6);
  // silver clip
  d.poly(f.pts([-17, -3.6, -2, -4.6, -1, -6.2, -16, -5.4]), C.metal, { lw: 1.3 });
  // rubber grip, chrome cone, ball point
  d.limb(...f.p(30, 0), ...f.p(40, 0), 3.4 * s, 3 * s, 0x2a2e3e, { lw: 1.8 });
  for (const x of [32.5, 35, 37.5]) d.stroke(f.pts([x, -2.8, x, 2.8]), 0.8 * s, 0x50566e, 0.9);
  d.poly(f.pts([40, -3, 49, -0.9, 49, 0.9, 40, 3]), C.metal, { lw: 1.6 });
  d.stroke(f.pts([41, -1.6, 47.5, -0.6]), 0.9 * s, 0xffffff, 0.8);
  d.circle(...f.p(50, 0), 1 * s, C.metalD, { lw: 1 });
  return f.p(50.5, 0);
}

/** Big wooden ruler: grip at g, along a. Returns the far end. */
export function ruler(d: Drawer, C: HCol, g: V2, a: number, s: number): V2 {
  const f = new Frame(g[0], g[1], a, s);
  d.poly(f.pts(rrect(-12, -4.6, 74, 4.6, 1.6)), C.ruler, { lw: 1.9 });
  d.poly(f.pts([-11, 1.8, 73, 1.8, 73, 4, -11, 4]), C.rulerD, { outline: false, alpha: 0.6 });
  for (let i = 0; i <= 32; i++) {
    const x = -8 + i * 2.5, L = i % 4 === 0 ? 3.2 : i % 2 ? 1.4 : 2.2;
    d.stroke(f.pts([x, -4.6, x, -4.6 + L]), 0.7, 0x6a4a22, 0.85);
  }
  for (let i = 1; i <= 7; i++) d.circle(...f.p(-8 + i * 10, -0.2), 0.7 * s, 0x6a4a22, { outline: false, alpha: 0.8 });
  d.stroke(f.pts([-9, 0.8, 70, 0.8]), 1, 0xfff4d8, 0.5);
  d.circle(...f.p(68, 0), 1.6 * s, C.rulerD, { lw: 1 });
  return f.p(74, 0);
}

/**
 * Teal textbook. Local frame: the hand holds `anchor` (0 = left edge middle, 1 = bottom middle);
 * open 0..1 flips the front cover over the spine to the left. Returns the far edge (front hand
 * target) and the centre.
 */
export interface BookGeo { f: Frame; edge: V2; c: V2; low: V2; a: number; s: number; open: number }
export function bookGeo(g: V2, a: number, s: number, open: number, anchor: number): BookGeo {
  const W = 22, H = 28;
  const span = W * (1 + open);
  const f0 = new Frame(g[0], g[1], a, s);
  const f = new Frame(...f0.p(-span * 0.5 * anchor, -H / 2 * anchor * 1.05), a, s);
  const xs = W * open;
  let low: V2 = [0, -1e9];
  for (const [x, y] of [[0, -H / 2], [span, -H / 2], [span, H / 2], [0, H / 2]]) { const q = f.p(x, y); if (q[1] > low[1]) low = q; }
  return { f, edge: f.p(xs + W, 2), c: f.p(span / 2, 0), low, a, s, open };
}
export function book(d: Drawer, C: HCol, B: BookGeo) {
  const W = 22, H = 28;
  const { f, a, s, open } = B;
  const xs = W * open;
  const ca = Math.cos(Math.PI * open), lift = Math.sin(Math.PI * open) * 3;
  // back cover + page block
  d.poly(f.pts(rrect(xs - 0.6, -H / 2 - 1.6, xs + W + 1.6, H / 2 + 0.6, 1.6)), C.bookD, { lw: 1.9 });
  const top = (x0: number, x1: number, dip: number) => bezier([x0, -H / 2 - 0.4 + dip, (x0 + x1) / 2, -H / 2 - 2.2 * open, x1, -H / 2 - 0.4], 6);
  d.poly(f.pts([...top(xs, xs + W + 0.6, 1.2 * open), xs + W + 0.6, H / 2 - 1, xs, H / 2 - 1 + open]), C.page, { lw: 1.4 });
  if (open > 0.35) {
    const al = sstep(0.35, 0.8, open);
    for (let i = 0; i < 6; i++) d.stroke(f.pts([xs + 3, -7 + i * 3.4, xs + W - 3 - (i % 3) * 2, -7 + i * 3.4]), 0.9, 0xa0b0c8, 0.8 * al);
    glyph(d, '1', ...f.p(xs + 6, -10.5), 5 * s, a, 0xe8403a, al, false);
    glyph(d, '2', ...f.p(xs + 11, -10.5), 5 * s, a, 0x3a7ae8, al, false);
    glyph(d, '3', ...f.p(xs + 16, -10.5), 5 * s, a, 0x2fae5a, al, false);
  } else {
    d.stroke(f.pts([xs + W + 0.8, -H / 2 + 1, xs + W + 0.8, H / 2 - 2]), 0.8, C.pageD, 0.9);
  }
  // the flipping leaf: front cover outside, then the inside page
  if (Math.abs(ca) > 0.04) {
    const xe = xs + W * ca;
    if (ca > 0) {
      d.poly(f.pts([xs, -H / 2 - lift, xe, -H / 2 - lift * 0.3, xe, H / 2, xs, H / 2]), C.book, { lw: 1.9 });
      const u = (v: number) => xs + (xe - xs) * v;
      d.poly(f.pts([xs, -H / 2 - lift, u(0.16), -H / 2 - lift, u(0.16), H / 2, xs, H / 2]), C.bookD, { outline: false, alpha: 0.75 });
      d.stroke(f.pts([u(0.24), -H / 2 + 2, u(0.24), H / 2 - 2]), 1.2, C.bookL, 0.6);
      // gold title panel and emblem
      d.poly(f.pts([u(0.32), -9, u(0.88), -9, u(0.88), -3, u(0.32), -3]), C.gold, { lw: 1.2 });
      d.stroke(f.pts([u(0.38), -6, u(0.82), -6]), 1, C.bookD, 0.8);
      d.circle(...f.p(u(0.6), 5), 3.4 * s * Math.max(0.2, ca), C.gold, { lw: 1.2 });
      d.stroke(f.pts([u(0.32), 10, u(0.88), 10]), 1.2, C.gold, 0.9);
      d.stroke(f.pts([u(0.3), -H / 2 + 1.5, u(0.9), -H / 2 + 1.5]), 1.2, C.bookL, 0.5);
    } else {
      d.poly(f.pts(rrect(xe - 1.6, -H / 2 - 1.6, xs + 0.6, H / 2 + 0.6, 1.6)), C.bookD, { lw: 1.9 });
      d.poly(f.pts([...top(xs, xe - 0.6, 1.2 * open), xe - 0.6, H / 2 - 1, xs, H / 2 - 1 + open]), C.page, { lw: 1.4 });
      const al = sstep(0.35, 0.8, open);
      for (let i = 0; i < 6; i++) d.stroke(f.pts([xs - 3, -7 + i * 3.4, xe + 3 + (i % 2) * 3, -7 + i * 3.4]), 0.9, 0xa0b0c8, 0.8 * al);
      glyph(d, 'A', ...f.p(xs - 16, -10.5), 5 * s, a, 0xe8403a, al, false);
      glyph(d, 'B', ...f.p(xs - 11, -10.5), 5 * s, a, 0x3a7ae8, al, false);
      glyph(d, 'C', ...f.p(xs - 6, -10.5), 5 * s, a, 0x2fae5a, al, false);
      d.stroke(f.pts([xs, -H / 2, xs, H / 2 - 1]), 1.6, C.pageD, 0.9);
    }
  }
}

/** Spiral notebook (flying projectile, slightly spinning). */
export function notebook(d: Drawer, x: number, y: number, rot: number, s: number) {
  if (s < 0.03) return;
  const f = new Frame(x, y, rot, s);
  d.poly(f.pts(rrect(-13, -10, 13, 11, 1.8)), 0x3a6ad8, { lw: 1.8 });
  d.poly(f.pts(rrect(-12, -9, 11.6, 9.6, 1.2)), 0xfdfcf6, { lw: 1.3 });
  for (let i = 0; i < 5; i++) d.stroke(f.pts([-9, -4 + i * 3.2, 9, -4 + i * 3.2]), 0.8, 0x9ec4ef, 0.85);
  d.stroke(f.pts([-7, -8, -7, 9]), 0.8, 0xf08080, 0.7);
  for (let i = 0; i < 8; i++) {
    const rx = -10.5 + i * 3;
    d.stroke(f.pts([rx, -7.6, rx - 0.6, -11.4, rx + 0.8, -12.2]), 1.7, OUTLINE, 0.9);
    d.stroke(f.pts([rx, -7.6, rx - 0.6, -11.4, rx + 0.8, -12.2]), 0.9, 0xd8dce6, 1);
  }
  d.stroke(f.pts([-10, -6.4, 0, -6.6]), 1, 0xffffff, 0.8);
}

/** Loose sheet of paper (fluttering). */
export function sheet(d: Drawer, x: number, y: number, rot: number, s: number, flip: number, alpha = 1) {
  const f = new Frame(x, y, rot, s);
  const fx = 0.35 + 0.65 * Math.abs(flip);
  const P_ = (px: number, py: number) => [px * fx, py];
  d.poly(f.pts([...P_(-4.5, -6), ...P_(2.5, -6), ...P_(4.5, -4), ...P_(4.5, 6), ...P_(-4.5, 6)]), 0xfffdf6, { lw: 1.3, alpha });
  for (let i = 0; i < 4; i++) d.stroke(f.pts([...P_(-3, -3 + i * 2.6), ...P_(3, -3 + i * 2.6)]), 0.7, 0x9ec4ef, alpha * 0.9);
}

/** Mini closed book (in the homework wave / storm). */
export function miniBook(d: Drawer, C: HCol, x: number, y: number, rot: number, s: number, col: number, alpha = 1) {
  const f = new Frame(x, y, rot, s);
  d.poly(f.pts(rrect(-5.5, -7, 6, 7, 1)), shade(col, 0.7), { lw: 1.3, alpha });
  d.poly(f.pts([-5, -6.4, 4.4, -6.4, 4.4, 6, -5, 6]), col, { outline: false, alpha });
  d.poly(f.pts([-5, -6.4, -3, -6.4, -3, 6, -5, 6]), shade(col, 0.75), { outline: false, alpha });
  d.stroke(f.pts([-1, -3, 3, -3]), 1, C.gold, alpha);
}

// ----------------------------------------------------------------- effects
/** Crescent slash arc (pen slash / swirl band) along an ellipse from a0 to a1. */
export function crescent(d: Drawer, cx: number, cy: number, rx: number, ry: number, rot: number, a0: number, a1: number, w: number, color: number, alpha: number, light = 0xffffff) {
  if (alpha < 0.02 || d.flat !== null) return;
  const line: number[] = [];
  const N = 16, c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    line.push(cx + x * c - y * s, cy + x * s + y * c);
  }
  d.ribbon(line, (u) => w * Math.sin(Math.PI * Math.pow(u, 0.7)) + 0.2, color, { outline: false, alpha: alpha * 0.7 });
  d.ribbon(line, (u) => w * 0.4 * Math.sin(Math.PI * Math.pow(u, 0.7)) + 0.1, light, { outline: false, alpha: alpha * 0.85 });
}

/** Gold starburst behind the shield book / held-up book. */
export function burst(d: Drawer, x: number, y: number, amt: number, t: number, C: HCol) {
  if (amt < 0.03 || d.flat !== null) return;
  d.glow(x, y, 40 * amt, C.glow, 0.45 * amt);
  const pts: number[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU + t * 0.6;
    const r = (i % 2 ? 14 : 30 + 6 * Math.sin(t * 7 + i * 1.7)) * amt;
    pts.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  d.poly(pts, 0xffe066, { outline: false, alpha: 0.55 * amt });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2 + Math.sin(t * 2 + i) * 0.05;
    const r0 = 22 * amt, r1 = (34 + 5 * Math.sin(t * 9 + i)) * amt;
    d.stroke([x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1], 2.2, 0xffd23a, 0.9 * amt);
  }
  for (let i = 0; i < 3; i++) star(d, x + Math.cos(t * 2 + i * 2.1) * 26 * amt, y + Math.sin(t * 2 + i * 2.1) * 22 * amt, 4 * amt, 0xffffff, 0.9 * amt, t * 3 + i);
}

/** Glowing lightbulb idea above the head. */
export function bulb(d: Drawer, x: number, y: number, amt: number, t: number, C: HCol) {
  if (amt < 0.03 || d.flat !== null) return;
  const s = sstep(0, 1, amt);
  y += Math.sin(t * 3) * 1.5;
  d.glow(x, y, 28 * s, C.glow, 0.5 * s);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU - Math.PI / 2;
    const r0 = 12 * s, r1 = (17 + 3 * Math.sin(t * 8 + i)) * s;
    d.stroke([x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1], 2, 0xffd23a, s);
  }
  d.poly([...arc(x, y, 8 * s, 2.2, 7.22, 20), x + 3.4 * s, y + 11 * s, x - 3.4 * s, y + 11 * s], 0xfff6b0, { lw: 1.6 });
  d.circle(x, y, 5 * s, 0xffffff, { outline: false, alpha: 0.5 });
  d.stroke([x - 2.5 * s, y + 7 * s, x - 2.5 * s, y + 1.5 * s, x - 1.2 * s, y - 1.5 * s, x, y + 0.6 * s, x + 1.2 * s, y - 1.5 * s, x + 2.5 * s, y + 1.5 * s, x + 2.5 * s, y + 7 * s], 1.1, 0xff9a20, s);
  d.limb(x - 3.4 * s, y + 12.4 * s, x + 3.4 * s, y + 12.4 * s, 1.6 * s, 1.6 * s, 0xb8bcc8, { lw: 1.2 });
  d.limb(x - 2.8 * s, y + 15.2 * s, x + 2.8 * s, y + 15.2 * s, 1.4 * s, 1.4 * s, 0xa0a4b4, { lw: 1.2 });
  d.circle(x, y + 17.4 * s, 1.3 * s, 0x50566e, { lw: 1 });
  d.stroke(arc(x, y, 5.6 * s, 3.5, 4.5, 6), 1.4, 0xffffff, 0.9 * s);
}

/**
 * Flying pages, little books and letters. mode 0: the alphabet storm swirling round the body
 * (big A B C 字); mode 1: the homework wave streaming forward from (cx, cy). layer 0 = behind
 * the body, 1 = in front.
 */
export function pagesFx(d: Drawer, C: HCol, cx: number, cy: number, amt: number, mode: number, t: number, layer: number) {
  if (amt < 0.03 || d.flat !== null) return;
  const N = 12;
  const letters = ['A', 'B', 'C', 'Z'];
  const bookCols = [0x2f9a6a, 0xd84a3a, 0x3a6ad8, 0xe8a020];
  const letCols = [0x2a62e0, 0x2a62e0, 0x2a62e0, 0x1f4fc0];
  for (let i = 0; i < N; i++) {
    const h1 = hash(i + 1), h2 = hash(i * 3 + 7);
    // swirl
    const ang = t * (1.6 + 0.5 * h1) + (i * TAU) / N;
    const rr = 34 * (0.75 + 0.45 * h2);
    const sx = cx + Math.cos(ang) * rr * 1.25, sy = cy + Math.sin(ang) * rr * 0.5 - 24 * (h1 - 0.5) - 4 * Math.sin(t * 2 + i);
    const sDepth = Math.sin(ang);
    // forward stream
    const u = (t * 0.9 + h1) % 1;
    const wx = cx + 8 + u * 80, wy = cy + (h2 - 0.5) * 34 * (0.4 + u) + Math.sin(u * 7 + i) * 3;
    const x = sx + (wx - sx) * mode, y = sy + (wy - sy) * mode;
    const depth = mode > 0.5 ? (h2 > 0.25 ? 1 : -1) : sDepth;
    if ((depth > 0) !== (layer === 1)) continue;
    const al = amt * (mode > 0.5 ? Math.sin(Math.PI * u) : 1);
    if (al < 0.03) continue;
    const rot = Math.sin(t * 3 + i) * 0.6 + mode * (h1 - 0.5) * t * 3;
    const kind = i % 4;
    if (kind < 2 && mode < 0.5) {
      const li = (((i / 4) | 0) * 2 + kind) % letters.length;
      glyph(d, letters[li], x, y, (13 + 4 * h2) * amt, Math.sin(t * 2 + i) * 0.3, letCols[li], al);
    } else if (kind === 2) miniBook(d, C, x, y, rot, 0.8 + 0.3 * h2, bookCols[i % 4], al);
    else sheet(d, x, y, rot, 0.9 + 0.4 * h2, Math.cos(t * 6 + i * 1.3), al);
  }
}

/** Blue swirl bands round the body (alphabet storm) or a forward wave (homework wave). */
export function swirl(d: Drawer, C: HCol, cx: number, cy: number, amt: number, mode: number, t: number, layer: number) {
  if (amt < 0.03 || d.flat !== null) return;
  if (mode < 0.5) {
    for (let i = 0; i < 3; i++) {
      const ph = t * 4.5 + i * 2.1;
      const a0 = ph, a1 = ph + 2.6;
      const mid = Math.sin((a0 + a1) / 2);
      if ((mid > 0) !== (layer === 1)) continue;
      crescent(d, cx, cy - 18 + i * 18, 44 + i * 4, 13, -0.08, a0, a1, 6 * amt, C.swirl, 0.75 * amt, C.swirlL);
    }
  } else if (layer === 0) {
    d.glow(cx + 22, cy, 30 * amt, C.swirl, 0.3 * amt);
  } else {
    for (let i = 0; i < 3; i++) {
      const u = (t * 1.6 + i / 3) % 1;
      crescent(d, cx + 10 + u * 50, cy, 12 + u * 14, 22 + u * 12, 0, -1.2, 1.2, (6 - u * 3) * amt, C.swirl, amt * Math.sin(Math.PI * u), C.swirlL);
    }
  }
}

/** Impact flash where a ruler / book hits the floor. */
export function impact(d: Drawer, x: number, y: number, amt: number, t: number) {
  if (amt < 0.03 || d.flat !== null) return;
  d.glow(x, y - 4, 22 * amt, 0xfff0a0, 0.6 * amt);
  const pts: number[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU, r = (i % 2 ? 6 : 16 + 4 * Math.sin(t * 20 + i)) * amt;
    pts.push(x + Math.cos(a) * r, y - 4 + Math.sin(a) * r * 0.7);
  }
  d.poly(pts, 0xffe066, { outline: false, alpha: 0.85 * amt });
  star(d, x, y - 4, 7 * amt, 0xffffff, amt, t * 4);
  for (let i = 0; i < 4; i++) {
    const u = (t * 2 + i / 4) % 1;
    d.circle(x + (i - 1.5) * 9 * (0.6 + u), y - 2 - u * 6, (3 + u * 3) * amt, 0xe8e2d4, { outline: false, alpha: amt * (1 - u) * 0.8 });
  }
}

/** Stack of schoolbooks (read pose). */
export function stack(d: Drawer, C: HCol, x: number, n: number, s: number, seed: number) {
  if (s < 0.03) return;
  const cols = [0xc8443a, 0x2f8a5a, 0x3a5ec8, 0xe0a030, 0x7a4ac0, 0x1f8a8e];
  let y = 0;
  for (let i = 0; i < n; i++) {
    const h = 5.2 + hash(seed + i) * 2.4, w = 26 + hash(seed * 3 + i) * 7, off = (hash(seed + i * 5) - 0.5) * 4;
    const col = cols[(seed + i) % cols.length];
    const x0 = x - w / 2 + off;
    const pts = [x0, y - h * s, x0 + w, y - h * s, x0 + w, y, x0, y].map((v, k) => (k % 2 ? v : x + (v - x) * s));
    d.poly(pts, col, { lw: 1.6 });
    const pp = [x0 + 2, y - h * s + 1.2, x0 + w - 1, y - h * s + 1.2, x0 + w - 1, y - 1.2, x0 + 2, y - 1.2].map((v, k) => (k % 2 ? v : x + (v - x) * s));
    d.poly([pp[2] - 4 * s, pp[3], pp[2], pp[3], pp[4], pp[5], pp[4] - 4 * s, pp[5]], C.page, { outline: false });
    d.stroke([x + (x0 + 3 - x) * s, y - h * s * 0.5, x + (x0 + 9 - x) * s, y - h * s * 0.5], 1, C.gold, 0.9);
    y -= h * s;
  }
}

export { mix, cl };
