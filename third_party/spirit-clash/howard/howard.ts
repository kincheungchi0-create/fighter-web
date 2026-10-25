import { Frame, clamp01, dir, solveHumanoid, type CharRig, type DrawCtx, type Drawer, type P, type Skel } from './core';
import { cl, makeRunMix, motionFor, sstep, withDefaults, type V2 } from './mario_kit';
import { reach, type Arm } from './round_kit';
import { aimF, grounder } from './hero2_kit';
import {
  HC, arm, backpack, book, bookGeo, bulb, burst, brows, collar, crescent, face, fist, hair, impact, leg, notebook, pagesFx,
  palm, pen, pencil, ruler, sheet, stack, straps, swirl, torso,
} from './howard_kit';
import { CC, earHat, hearts, neckline, plush, shirtPrint } from './chiihoward_kit';
import { HN, angerFx, flush, shoutMouth, soundWaves, spikyHair, stretch } from './hornam_kit';
import { PC, neatHair, percci } from './percy_kit';
import { TY, ballStorm, headband, jerseyTrim, racket, tossBall } from './tyrus_kit';
import { DD, bao, belly, chompMouth, chopsticks, dadFace, foodStorm, fork, heldBao, knife, plate } from './daddy_kit';

/*
 * Howard: an original cheerful, clever 7-year-old Hong Kong primary-school boy (school uniform:
 * white polo with a blue / yellow trimmed collar and a small round badge, navy shorts, white socks,
 * blue-and-white sneakers, black wristbands, a navy backpack with yellow accents). Messy fluffy
 * brown hair, big brown eyes, a confident grin. He fights with stationery.
 *
 * About 0.75x Link's height (~134 units), a big head on a small sporty body. Parts and effects live
 * in howard_kit.ts.
 *
 * Keys (all continuous, every key in every pose; props grow out of the hand):
 *  pencil   0..1  giant yellow pencil in the front hand (pS scale)
 *  pen      0..1  big ballpoint pen used like a sword
 *  ruler    0..1  big wooden ruler (heavy strike)
 *  book     0..1  teal textbook in the back hand (0.5 = held closed, 1 = open); bkA angle, bkH grip
 *                 (0 = left edge, 1 = bottom), bookS scale, bk2 front hand joins the far edge
 *  shield   0..1  book shield: gold burst round the raised book
 *  burst    0..1  gold burst / sparkle lines round the book (victory)
 *  notebook 0..1  spiral notebook flying out of the front hand (cast)
 *  pages    0..1  flying pages, books and letters; wave 0 = alphabet storm round the body (big
 *                 A B C 字 + blue swirl), 1 = homework energy wave streaming forward
 *  ink      0..1  blue slash arc behind the pen (sd = swing direction, +1 downward / -1 upward)
 *  smart    0..1  lightbulb idea above the head
 *  hips     0..1  hands on hips;  plant 0..1  front hand on the floor;  palm 0..1  open front hand
 *  p2       0..1  back hand joins the front-hand weapon grip (two-handed)
 *  sit      0..1  book stacks round him (read pose)
 *  kick, atk, face (0 neutral grin, 1 determined, 2 hurt, 3 laughing)
 */

const SK: Skel = { hipH: 48, thigh: 24, shin: 23, torso: 32, neck: 24, upper: 17, fore: 16, shoulderDrop: 6, stride: 12, lift: 9 };
const SOLE = 4;
const G = grounder(SK, SOLE);
const A = aimF;

/** rig units per run cycle: CharDefs `stride` should be 70 at height 200 */
export const HOWARD_STRIDE = 70;

const DEF: P = {
  breath: 0, run: 0, hx: 0, torso: 0, head: 0, fS: 0, fE: 0, bS: 0, bE: 0, fW: 0,
  pencil: 0, pS: 1, pen: 0, ruler: 0, book: 0, bkA: 0, bkH: 0, bookS: 1, bk2: 0, shield: 0, burst: 0,
  notebook: 0, pages: 0, wave: 0, ink: 0, sd: 1, smart: 0, hips: 0, plant: 0, palm: 0, p2: 0, sit: 0,
  kick: 0, atk: 0, face: 0, rage: 0,
  // Percy's partner Percci Bear: x / y offset of its feet, scale, paw swipe, wave
  bearX: -34, bearY: 0, bearS: 1, bearAtk: 0, bearWave: 0,
  // Daddy: chomping mouth, belly swell
  bite: 0, belly: 0,
};

const POSES: Record<string, P> = {
  // hands on hips, chest out, breathing
  idle: { ...G(2, 9, -9), torso: 0.02, head: -0.06, fS: 0.3, fE: -0.5, bS: -0.2, bE: -0.5, hips: 1, breath: 1 },
  // select-screen bust: punching toward the viewer with a grin
  portrait: { ...G(2, 9, -9), torso: 0.12, head: -0.08, fS: 1.5, fE: 0.05, bS: 0.5, bE: 2.1 },
  run: { ...G(2, 7, -7), run: 1, torso: 0.22, head: -0.14, fS: 0.4, fE: 1.1, bS: 0.35, bE: 1.0 },
  // fist raised
  jump: { fFx: 8, fFy: 20, bFx: -6, bFy: 32, torso: -0.04, head: -0.16, fS: 2.75, fE: 0.35, bS: 0.5, bE: 1.9, face: 3 },
  fall: { fFx: 9, fFy: 34, bFx: -9, bFy: 37, torso: 0.04, head: 0.1, fS: 1.9, fE: -0.2, bS: -1.1, bE: -0.2 },
  dash: { ...G(4, 10, -10), run: 1, torso: 0.45, head: -0.3, fS: 0.3, fE: 1.1, bS: 0.3, bE: 1.1, face: 1 },
  // one hand on the floor, other fist up
  crouch: { ...G(19, 13, -13), torso: 0.5, head: -0.28, fS: 0.7, fE: 0.4, plant: 1, bS: 0.9, bE: 2.0, face: 1 },
  // book shield with a gold burst
  block: { ...G(6, 13, -13), torso: 0.12, head: 0.04, bS: 1.45, bE: 0.55, fS: 1.25, fE: 0.8, book: 0.5, bkA: -0.06, bookS: 1.25, bk2: 1, shield: 1, face: 1 },
  // fists-up guard (extra)
  guard: { ...G(8, 14, -14), torso: 0.1, head: 0.04, fS: 1.25, fE: 1.95, bS: 1.05, bE: 2.05, face: 1 },
  hurt: { hy: -2, fFx: 14, fFy: 26, bFx: -4, bFy: 34, torso: -0.4, head: -0.3, fS: -1.4, fE: -0.3, bS: -1.9, bE: -0.3, face: 2 },
  ko: { fFx: 18, fFy: 18, bFx: -14, bFy: 26, torso: -0.55, head: -0.35, fS: -1.7, fE: -0.2, bS: -2.1, bE: -0.2, face: 2 },
  // laughing, holding a book up high with gold sparkle lines
  victory: { ...G(0, 10, -10), torso: -0.1, head: -0.3, bS: 2.25, bE: 0.05, book: 0.5, bookS: 1.15, bkA: 0.38, bkH: 1, burst: 0.8, fS: 0.4, fE: 1.75, face: 3, breath: 1 },
  // alphabet storm: spinning, arms flung out, letters and pages in a blue swirl
  ultimate: { ...G(4, 14, -14), torso: -0.06, head: -0.22, fS: 2.0, fE: 0.2, bS: -2.0, bE: -0.1, palm: 1, pages: 1, wave: 0, face: 3 },
  // pencil thrust: two-handed, drawn back then lunging
  ready_f: A({ ...G(8, 12, -14), torso: -0.12, head: 0.08, fS: 0.45, fE: 1.3, pencil: 1, p2: 1, face: 1 }, 0.04),
  strike_f: A({ ...G(12, 26, -18), torso: 0.38, head: -0.06, fS: 1.55, fE: 0.1, pencil: 1, p2: 1, atk: 1, face: 1 }, 0.02),
  // ballpoint-pen slash: low behind, then up and over
  ready_up: A({ ...G(10, 12, -12), torso: 0.25, head: 0.04, fS: -0.3, fE: 0.4, bS: 0.5, bE: 1.2, pen: 1, face: 1 }, 2.3),
  strike_up: A({ ...G(4, 12, -10), torso: -0.12, head: -0.25, fS: 2.6, fE: 0.25, bS: 0.3, bE: 1.4, pen: 1, ink: 1, sd: -1, atk: 1, face: 1 }, -1.3),
  // wooden ruler: raised overhead two-handed, then smashed down
  ready_high: A({ ...G(4, 10, -12), torso: -0.16, head: -0.15, fS: 2.8, fE: 0.55, ruler: 1, p2: 1, face: 1 }, -2.25),
  strike_down: A({ ...G(14, 20, -14), torso: 0.5, head: 0.1, fS: 1.3, fE: 0.1, ruler: 1, p2: 1, atk: 1, face: 1 }, 0.5),
  low_strike: A({ ...G(18, 20, -12), torso: 0.55, head: 0.08, fS: 1.05, fE: 0.1, ruler: 1, p2: 1, atk: 1, face: 1 }, 0.3),
  // pen whirl in the air
  spin: A({ fFx: 12, fFy: 18, bFx: -12, bFy: 22, torso: 0.1, head: 0, fS: 1.6, fE: 0.05, bS: -1.5, bE: 0.1, pen: 1, ink: 1, sd: 1, atk: 1, face: 1 }, 0.1),
  // two-handed pen slash forward-down
  air_fwd: A({ fFx: 12, fFy: 24, bFx: -10, bFy: 30, torso: 0.15, head: 0.04, fS: 1.7, fE: 0.1, pen: 1, p2: 1, ink: 1, sd: 1, atk: 1, face: 1 }, 0.3),
  air_up: A({ fFx: 6, fFy: 30, bFx: -6, bFy: 34, torso: -0.1, head: -0.4, fS: 2.95, fE: 0.05, bS: -0.5, bE: 0.3, pencil: 1, atk: 1, face: 1 }, -1.5),
  air_down: A({ fFx: 6, fFy: 36, bFx: -8, bFy: 28, torso: 0.05, head: 0.2, fS: 0.7, fE: -0.2, pencil: 1, p2: 1, atk: 1, face: 1 }, 1.45),
  // flying notebook throw
  cast: { ...G(8, 16, -14), torso: 0.16, head: -0.02, fS: 1.62, fE: 0.05, bS: -0.5, bE: 0.6, palm: 1, notebook: 1, face: 1 },
  // homework energy wave: palm pushed forward, books and pages streaming out
  charge: { ...G(8, 17, -14), torso: 0.12, head: 0.0, fS: 1.6, fE: 0.0, bS: 0.4, bE: 1.7, palm: 1, pages: 1, wave: 1, face: 1 },
  // read to recover: sitting, book open on the knees, lightbulb idea (extra)
  read: { hy: 38, fFx: 22, fFy: 5, bFx: 15, bFy: 6, torso: 0.08, head: 0.32, bS: 1.05, bE: 1.1, fS: 0.85, fE: 1.4, book: 1, bkA: -0.25, bk2: 1, smart: 1, sit: 1, face: 3, breath: 1 },
};

const RUN = makeRunMix(SK, { cycle: HOWARD_STRIDE, duty: 0.4, lift: 12, bob: 4.5, sole: SOLE, runE: 0.5, armF: 0.85, armB: 0.85, rock: 0.06 });

const grip = (a: Arm): V2 => { const [ux, uy] = dir(a.a); return [a.h[0] + ux * 2.6, a.h[1] + uy * 2.6]; };

/**
 * `chii`: Chiikawa Howard (casual clothes, ear hat, plush dolls for weapons, no school things);
 * `hornam`: Hor Nam (same uniform, black spiky hair, always angry: limbs stretch and the head swells on attacks);
 * `percy`: Percy (same uniform, neat hair) with Percci Bear beside him;
 * `tyrus`: Tyrus (sports jersey, headband, a tennis racket for every weapon, tennis balls for the letters);
 * `daddy`: DADDY (orange T-shirt over a big belly, glasses, moustache; chopsticks / fork / knife, plate shield)
 */
type Look = 'howard' | 'chii' | 'hornam' | 'percy' | 'tyrus' | 'daddy';
const makeDraw = (look: Look) => function draw(d: Drawer, p: P, ctx: DrawCtx) {
  const chii = look === 'chii', horn = look === 'hornam', percy = look === 'percy', ty = look === 'tyrus', dad = look === 'daddy';
  const C = chii ? CC : horn ? HN : percy ? PC : ty ? TY : dad ? DD : HC;
  // Percci Bear: behind Percy unless it has moved out in front of him
  const bear = () => percci(d, p.bearX ?? -34, p.bearY ?? 0, p.bearS ?? 1, clamp01(p.bearAtk ?? 0), clamp01(p.bearWave ?? 0), ctx.t);
  const bearFront = (p.bearX ?? -34) > 8;
  const j = solveHumanoid(SK, RUN(p, ctx), ctx);
  const m = motionFor(ctx);
  const t = ctx.t;
  const tf = new Frame(j.hip[0], j.hip[1], j.torso + Math.PI / 2);
  // Hor Nam: attacks stretch the striking arm (weapon keys) / front leg (kick) and swell the head; rage balloons it
  const atkK = horn ? sstep(0.2, 1, p.atk ?? 0) : 0;
  const rage = horn ? clamp01(p.rage ?? 0) : 0;
  const headK = 1 + 0.32 * atkK + 0.95 * rage;
  const nx = j.head[0] - j.neck[0], ny = j.head[1] - j.neck[1], nl = Math.hypot(nx, ny) || 1;
  const hf = new Frame(j.head[0] + (nx / nl) * 16 * (headK - 1), j.head[1] + (ny / nl) * 16 * (headK - 1), j.headA, headK);
  const anger = horn ? Math.max(0.35, atkK, rage) : 0;
  const pf: P = horn && (p.face ?? 0) !== 2 ? { ...p, face: 1 } : p;

  const pencilK = sstep(0.05, 0.6, p.pencil ?? 0), penK = sstep(0.05, 0.6, p.pen ?? 0), rulerK = sstep(0.05, 0.6, p.ruler ?? 0);
  const bookK = sstep(0.02, 0.4, p.book ?? 0), open = sstep(0.5, 1, p.book ?? 0);
  const palmK = clamp01(p.palm ?? 0);

  // ---- follow-through: hair tufts, shirt hem, backpack bounce, zip charm
  const hvx = m.rate('hx', j.head[0]), hvy = m.rate('hy', j.head[1]);
  const tx = m.spring('tuX', -cl((ctx.vx + hvx) * 0.01, -6, 7), 240, 11, -m.ax * 0.0013);
  const ty0 = m.spring('tuY', cl(-(ctx.vy + hvy) * 0.006, -5, 5), 240, 11, -m.ay * 0.0006);
  const pvx = m.rate('px', j.hip[0]), pvy = m.rate('py', j.hip[1]);
  const sway = m.spring('hem', -cl((ctx.vx + pvx) * 0.004, -2.5, 2.5), 280, 12, -m.ax * 0.0006);
  m.limit('hem', -3, 3);
  const bpx = m.spring('bpX', -cl((ctx.vx + pvx) * 0.008, -3.5, 3.5), 170, 9, -m.ax * 0.001);
  const bpy = m.spring('bpY', cl(-pvy * 0.02 - ctx.vy * 0.004, -3.5, 3.5), 200, 8, -m.ay * 0.0006);
  m.limit('bpX', -4, 4); m.limit('bpY', -4, 4);
  const charm = m.spring('chA', cl(-(ctx.vx + pvx) * 0.004 + bpx * 0.12, -1.1, 1.1), 70, 3.5, -m.ax * 0.0025);

  // ---- arms: hands on hips, hand on the floor, two-handed grips, the book
  let fA: Arm = { s: j.sF, e: j.eF, h: j.hF, a: j.aF, w: j.wF };
  let bA: Arm = { s: j.sB, e: j.eB, h: j.hB, a: j.aB, w: j.wB };
  const hips = clamp01(p.hips ?? 0);
  fA = reach(fA, tf.p(11, -6), hips, SK.upper, SK.fore, 1);
  bA = reach(bA, tf.p(-8, -6), hips, SK.upper, SK.fore, -1);
  fA = reach(fA, [j.hip[0] + 22, -4.5], clamp01(p.plant ?? 0), SK.upper, SK.fore, -1);
  let gF = grip(fA);
  const [wx, wy] = dir(fA.w);
  bA = reach(bA, [gF[0] - wx * 9 - Math.cos(bA.a) * 2.6, gF[1] - wy * 9 - Math.sin(bA.a) * 2.6], clamp01(p.p2 ?? 0) * Math.max(pencilK, penK, rulerK), SK.upper, SK.fore, -1);
  const gB = grip(bA);
  const bk = bookGeo(gB, p.bkA ?? 0, bookK * (p.bookS ?? 1), open, p.bkH ?? 0);
  if (bookK > 0.01) fA = reach(fA, [bk.edge[0] - Math.cos(fA.a) * 2.6, bk.edge[1] - Math.sin(fA.a) * 2.6], clamp01(p.bk2 ?? 0) * bookK, SK.upper, SK.fore, -1);
  gF = grip(fA);
  if (horn && atkK > 0.01 && Math.max(pencilK, penK, rulerK) > 0.5) {
    const [e, h] = stretch(fA.s, fA.e, fA.h, 1 + 2 * atkK);
    fA = { ...fA, e, h };
    gF = grip(fA);
  }
  let kF = j.kF, fF = j.fF;
  if (horn && (p.kick ?? 0) > 0.5 && atkK > 0.01) [kF, fF] = stretch([j.hip[0] + 3, j.hip[1]], j.kF, j.fF, 1 + 1.4 * atkK);

  const pages = clamp01(p.pages ?? 0), wave = clamp01(p.wave ?? 0);
  const fxC: V2 = wave > 0.5 ? [gF[0] + 4, gF[1]] : [j.hip[0], j.hip[1] - 22];
  const sit = clamp01(p.sit ?? 0);

  // ---- behind everything
  if (percy && !bearFront) bear();
  if (!chii && !horn && !ty && !dad) {
    stack(d, C, j.hip[0] - 34, 5, sit, 3);
    swirl(d, C, fxC[0], fxC[1], pages, wave, t, 0);
    pagesFx(d, C, fxC[0], fxC[1], pages, wave, t, 0);
  }
  burst(d, bk.c[0] + 4, bk.c[1], bookK * Math.max(clamp01(p.shield ?? 0), clamp01(p.burst ?? 0)), t, C);

  // ---- back arm and leg, backpack, front leg, body, head
  arm(d, C, bA.s, bA.e, bA.h, 0.86);
  fist(d, C, bA.h, bA.a, 0.88);
  leg(d, C, [j.hip[0] - 3, j.hip[1]], j.kB, j.fB, 0.9, SOLE);
  const bf = new Frame(...tf.p(-19.5 + bpx, -17 + bpy), tf.a + bpx * 0.035);
  if (!chii && !ty && !dad) backpack(d, C, bf, charm);
  leg(d, C, [j.hip[0] + 3, j.hip[1]], kF, fF, 1, SOLE);
  torso(d, C, tf, sway, !chii && !ty && !dad);
  if (dad) belly(d, tf, 1 + 0.45 * clamp01(p.belly ?? 0));
  if (chii) shirtPrint(d, tf);
  else if (ty) jerseyTrim(d, tf);
  else if (!dad) straps(d, C, tf);
  d.limb(j.neck[0], j.neck[1], ...hf.p(-2, 20), 5, 5, C.skin, { outline: false });
  if (chii) neckline(d, tf);
  else if (!ty && !dad) collar(d, C, tf);
  face(d, C, hf, pf, ctx);
  if (horn) {
    shoutMouth(d, hf, rage);
    flush(d, hf, anger);
    spikyHair(d, hf);
  } else if (percy || dad) neatHair(d, hf);
  else hair(d, C, hf, [tx, ty0]);
  if (chii) earHat(d, hf);
  if (ty) headband(d, hf);
  if (dad) { dadFace(d, hf); chompMouth(d, hf, clamp01(p.bite ?? 0)); }
  brows(d, C, hf, pf);
  if (horn) { angerFx(d, hf, anger, t); soundWaves(d, hf, rage, t); }

  // ---- the book (back hand), back fingers over its edge
  if (bookK > 0.01 && dad) {
    plate(d, [bk.c[0] + 6, bk.c[1]], 1.15 * bookK * (p.bookS ?? 1));
    fist(d, C, bA.h, bA.a, 0.95, 4.6);
  } else if (bookK > 0.01 && ty) {
    racket(d, [gB[0], gB[1]], -Math.PI / 2 + 0.25, 1.15 * bookK * (p.bookS ?? 1));
    fist(d, C, bA.h, bA.a, 0.95, 4.6);
  } else if (bookK > 0.01 && chii) {
    plush(d, 'usagi', [bk.c[0] - 4, bk.c[1] + 8], -Math.PI / 2, 1.25 * bookK * (p.bookS ?? 1));
    fist(d, C, bA.h, bA.a, 0.95, 4.6);
  } else if (bookK > 0.01) {
    book(d, C, bk);
    fist(d, C, bA.h, bA.a, 0.95, 4.6);
    if (clamp01(p.burst ?? 0) > 0.3) for (let i = 0; i < 3; i++) sheet(d, bk.c[0] + Math.sin(t * 2 + i * 2) * 22, bk.c[1] - 22 - ((t * 20 + i * 12) % 30), Math.sin(t * 3 + i), 1.3, Math.cos(t * 5 + i), 0.95);
  }

  // ---- front arm, weapons, hand
  arm(d, C, fA.s, fA.e, fA.h, 1);
  const ink = clamp01(p.ink ?? 0) * penK;
  if (ink > 0.03) {
    const sd = p.sd ?? 1;
    crescent(d, fA.s[0], fA.s[1], 66, 60, 0, fA.w - 2.5 * sd, fA.w + 0.1 * sd, 9 * ink, C.swirl, 0.8 * ink, C.swirlL);
  }
  let tip: V2 = gF;
  if (horn) tip = gF;
  else if (dad) {
    if (pencilK > 0.02) tip = chopsticks(d, gF, fA.w, 1.2 * pencilK * (p.pS ?? 1));
    if (penK > 0.02) tip = fork(d, gF, fA.w, 1.2 * penK);
    if (rulerK > 0.02) tip = knife(d, gF, fA.w, 1.25 * rulerK);
  } else if (ty) {
    const rk = Math.max(pencilK * (p.pS ?? 1), penK, rulerK * 1.1);
    if (rk > 0.02) tip = racket(d, gF, fA.w, 1.3 * rk);
  } else if (chii) {
    if (pencilK > 0.02) tip = plush(d, 'chiikawa', gF, fA.w, 1.35 * pencilK * (p.pS ?? 1));
    if (penK > 0.02) tip = plush(d, 'hachiware', gF, fA.w, 1.35 * penK);
    if (rulerK > 0.02) tip = plush(d, 'usagi', gF, fA.w, 1.5 * rulerK);
  } else {
    if (pencilK > 0.02) tip = pencil(d, C, gF, fA.w, pencilK * (p.pS ?? 1), clamp01(p.smart ?? 0), t);
    if (penK > 0.02) tip = pen(d, C, gF, fA.w, penK);
    if (rulerK > 0.02) tip = ruler(d, C, gF, fA.w, rulerK);
  }
  if (palmK > 0.5) palm(d, C, fA.h, fA.a, 1); else fist(d, C, fA.h, fA.a, 1);
  if (Math.max(pencilK, penK, rulerK) > 0.3 && clamp01(p.p2 ?? 0) > 0.3) fist(d, C, bA.h, bA.a, 0.95, 4.6);

  // flying notebook
  const nb = sstep(0.05, 0.9, p.notebook ?? 0);
  if (ty) tossBall(d, gF, fA.a, nb, t);
  if (dad) heldBao(d, gF, fA.a, nb);
  if (nb > 0.03 && !chii && !horn && !ty && !dad) {
    const [ux, uy] = dir(fA.a);
    const nx = gF[0] + ux * (16 + 26 * nb), ny = gF[1] + uy * (16 + 26 * nb) - 6 + Math.sin(t * 6) * 1.5;
    if (d.flat === null) for (let i = 0; i < 3; i++) d.stroke([nx - 16 - i * 3, ny - 6 + i * 6, nx - 30 - i * 5, ny - 6 + i * 6], 1.6, 0xffffff, 0.7 * nb);
    notebook(d, nx, ny, -0.25 + Math.sin(t * 5) * 0.1, nb);
  }

  // floor impact for the ruler
  const atk = p.atk ?? 0;
  if (rulerK > 0.5 && atk > 0.5 && !horn && !ty && !dad) impact(d, tip[0], Math.min(0, tip[1] + 2), sstep(-16, -4, tip[1]) * atk, t);

  // ---- in front: storm / wave, book stack, lightbulb
  if (chii) hearts(d, fxC[0], fxC[1], pages, wave, t);
  else if (ty) ballStorm(d, fxC[0], fxC[1], pages, wave, t);
  else if (dad) foodStorm(d, fxC[0], fxC[1], pages, wave, t);
  else if (!horn) {
    swirl(d, C, fxC[0], fxC[1], pages, wave, t, 1);
    pagesFx(d, C, fxC[0], fxC[1], pages, wave, t, 1);
    stack(d, C, j.hip[0] + 58, 2, sit, 7);
    bulb(d, j.head[0] + 18, j.head[1] - 46, clamp01(p.smart ?? 0), t, C);
  }

  if (percy && bearFront) bear();

  // ---- swing trail
  const rising = m.rising('atk', atk);
  if (atk > 0.25 && rising) {
    if (Math.max(pencilK, penK, rulerK) > 0.5) ctx.weapon = { bx: gF[0], by: gF[1], tx: tip[0], ty: tip[1] };
    else if (bookK > 0.5) ctx.weapon = { bx: gB[0], by: gB[1], tx: bk.edge[0], ty: bk.edge[1] };
    else if ((p.kick ?? 0) > 0.5) ctx.weapon = { bx: kF[0], by: kF[1], tx: fF[0] + 9, ty: fF[1] };
    else ctx.weapon = { bx: fA.e[0], by: fA.e[1], tx: gF[0], ty: gF[1] };
  }
};

export const HowardRig: CharRig = {
  poses: withDefaults(DEF, POSES),
  draw: makeDraw('howard'),
  portrait: { pose: 'portrait', cx: 16, cy: -96, r: 44 },
  rate: 23,
  defaults: DEF,
};

/** Chiikawa Howard: Howard's body and poses in casual clothes with a Chiikawa-ear hat; plush dolls for weapons. */
export const ChiiHowardRig: CharRig = { ...HowardRig, draw: makeDraw('chii') };

/** Hor Nam: Howard's body in the same uniform; shouting rage poses for the ultimate, kicks on the low / down strikes. */
export const HorNamRig: CharRig = {
  ...HowardRig,
  poses: withDefaults(DEF, {
    ...POSES,
    // fists clenched at the chest, head thrown back, screaming
    ultimate: { ...G(6, 15, -15), torso: -0.14, head: -0.3, fS: 0.7, fE: 1.9, bS: 0.5, bE: 2.0, rage: 1, face: 1 },
    // fuming: hunched, fists down, head swelling
    charge: { ...G(8, 15, -14), torso: 0.25, head: 0.08, fS: -0.3, fE: 0.4, bS: -0.5, bE: 0.4, rage: 0.45, face: 1 },
    // headbutt: leaning right into it
    headbutt: { ...G(10, 22, -16), torso: 0.75, head: 0.25, fS: -0.6, fE: 0.3, bS: -0.8, bE: 0.3, rage: 0.4, atk: 1, face: 1 },
    low_strike: { ...POSES.low_strike, kick: 1 },
    air_down: { ...POSES.air_down, kick: 1 },
  }),
  draw: makeDraw('hornam'),
};

/**
 * Percy: Howard's body in the same uniform with neat hair (CharDefs draw him taller), and Percci Bear beside
 * him. Extra poses send the bear rushing ahead, boosting him up, hopping for a belly flop, or growing giant.
 */
export const PercyRig: CharRig = {
  ...HowardRig,
  poses: withDefaults(DEF, {
    ...POSES,
    idle: { ...POSES.idle, bearWave: 0.25 },
    victory: { ...POSES.victory, bearX: 40, bearWave: 1 },
    portrait: { ...POSES.portrait, bearX: 40 },
    // pointing: "Percci, go!" and the bear charges out in front
    bear_rush: { ...POSES.portrait, face: 1, bearX: 92, bearAtk: 1 },
    // the bear under his feet, throwing him upward
    bear_boost: { ...POSES.jump, face: 1, bearX: 2, bearY: 34, bearAtk: 1, bearWave: 1 },
    // the bear leaps up ahead of him, then belly-flops
    bear_hop: { ...POSES.portrait, face: 1, bearX: 70, bearY: -80, bearWave: 1 },
    bear_slam: { ...POSES.portrait, face: 1, bearX: 80, bearY: 0, bearAtk: 1 },
    // ultimate: Percci grows giant in front of him and pounds the foe
    giant: { ...POSES.victory, face: 1, bearX: 120, bearS: 2.4, bearAtk: 0 },
    giant_hit: { ...POSES.victory, face: 1, bearX: 124, bearS: 2.4, bearAtk: 1 },
    giant_up: { ...POSES.victory, face: 3, bearX: 120, bearY: -70, bearS: 2.5, bearWave: 1 },
    giant_slam: { ...POSES.victory, face: 3, bearX: 124, bearY: 0, bearS: 2.5, bearAtk: 1 },
  }),
  draw: makeDraw('percy'),
};

/** Tyrus: Howard's body as a sporty tennis kid; the stationery poses swing his racket. */
export const TyrusRig: CharRig = {
  ...HowardRig,
  poses: withDefaults(DEF, {
    ...POSES,
    // racket resting on the shoulder
    idle: { ...POSES.idle, hips: 0.5, pencil: 0.9, pS: 1, fS: 0.2, fE: 2.6 },
    // serve: ball tossed, racket cocked behind the head
    serve_toss: { ...G(4, 10, -10), torso: -0.18, head: -0.35, fS: 3.4, fE: 1.6, bS: 2.6, bE: 0.2, pen: 1, notebook: 1, face: 1 },
    serve_hit: A({ ...G(10, 18, -14), torso: 0.35, head: 0, fS: 1.4, fE: 0.1, bS: -0.4, bE: 0.4, pen: 1, atk: 1, face: 1 }, 0.6),
    victory: { ...POSES.victory, book: 0, pencil: 1, fS: 2.9, fE: 0.2, face: 3 },
  }),
  draw: makeDraw('tyrus'),
};

/**
 * DADDY: Howard's body made a round, cheerful dad (CharDefs draw him taller). Extra poses: the big bite,
 * the belly bump, the ultimate's inhale (mouth wide open) and chewing.
 */
export const DaddyRig: CharRig = {
  ...HowardRig,
  poses: withDefaults(DEF, {
    ...POSES,
    idle: { ...POSES.idle, belly: 0.1 },
    // leaning in, mouth wide open
    bite_open: { ...G(8, 14, -12), torso: 0.35, head: 0.15, fS: 0.9, fE: 1.4, bS: 0.6, bE: 1.4, bite: 1, face: 1 },
    bite_shut: { ...G(10, 16, -12), torso: 0.42, head: 0.25, fS: 0.9, fE: 1.4, bS: 0.6, bE: 1.4, bite: 0.15, face: 3 },
    // leaning back, belly out
    belly_bump: { ...G(10, 18, -14), torso: -0.4, head: -0.2, fS: -1.0, fE: 0.4, bS: -1.2, bE: 0.4, belly: 1, face: 3 },
    // ultimate: head back, mouth huge, arms wide (inhale) / chewing
    inhale: { ...G(6, 16, -16), torso: -0.25, head: -0.25, fS: 1.9, fE: 0.2, bS: 1.6, bE: 0.2, bite: 1, belly: 0.6, face: 1 },
    chew: { ...G(6, 14, -14), torso: 0.05, head: 0.05, fS: 0.3, fE: 1.8, bS: 0.2, bE: 1.8, bite: 0.25, belly: 0.9, face: 3 },
  }),
  draw: makeDraw('daddy'),
};
