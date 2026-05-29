#!/usr/bin/env node
// FROM-SCRATCH reverse engineering of the minimum-wage table.
// We ignore the shipped formula entirely and let the data pick the structure.
//
// Tests several hypotheses about Hattrick's generator and reports fit quality
// (RMSE of relative error, %) so we can see which structure the data prefers.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(
  readFileSync(resolve(__dirname, "../src/minimum-wage-table.json"), "utf8"),
);

const SKILLS = [
  "DefenderSkill",
  "PlaymakerSkill",
  "PassingSkill",
  "WingerSkill",
  "ScorerSkill",
];
const BASE = 250;

function dataFor(skill) {
  const idx = table.skills.indexOf(skill);
  const pts = [];
  for (const row of table.rows) {
    const w = row.wages[idx];
    if (w != null) pts.push([row.level, w]);
  }
  return pts;
}

const ALL = SKILLS.map((s) => ({ skill: s, pts: dataFor(s) }));

// ---------- generic Nelder-Mead ----------
function nelderMead(f, x0, { maxIter = 8000, tol = 1e-14 } = {}) {
  const n = x0.length;
  const [alpha, gamma, rho, sigma] = [1, 2, 0.5, 0.5];
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const x = x0.slice();
    x[i] = x[i] !== 0 ? x[i] * 1.05 : 0.05;
    simplex.push(x);
  }
  let fv = simplex.map(f);
  for (let it = 0; it < maxIter; it++) {
    const ord = fv.map((v, i) => i).sort((p, q) => fv[p] - fv[q]);
    simplex = ord.map((i) => simplex[i]);
    fv = ord.map((i) => fv[i]);
    if (Math.abs(fv[n] - fv[0]) < tol) break;
    const cen = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cen[j] += simplex[i][j] / n;
    const ref = cen.map((c, j) => c + alpha * (c - simplex[n][j]));
    const fr = f(ref);
    if (fr < fv[0]) {
      const exp = cen.map((c, j) => c + gamma * (ref[j] - c));
      const fe = f(exp);
      if (fe < fr) { simplex[n] = exp; fv[n] = fe; } else { simplex[n] = ref; fv[n] = fr; }
    } else if (fr < fv[n - 1]) {
      simplex[n] = ref; fv[n] = fr;
    } else {
      const con = cen.map((c, j) => c + rho * (simplex[n][j] - c));
      const fc = f(con);
      if (fc < fv[n]) { simplex[n] = con; fv[n] = fc; }
      else for (let i = 1; i <= n; i++) {
        simplex[i] = simplex[i].map((v, j) => simplex[0][j] + sigma * (v - simplex[0][j]));
        fv[i] = f(simplex[i]);
      }
    }
  }
  const b = fv.map((v, i) => i).sort((p, q) => fv[p] - fv[q])[0];
  return { x: simplex[b], fx: fv[b] };
}

function rmsePct(pts, predict) {
  let s = 0;
  for (const [L, w] of pts) {
    const r = (predict(L) - w) / w;
    s += r * r;
  }
  return Math.sqrt(s / pts.length) * 100;
}
function maxPct(pts, predict) {
  let m = 0;
  for (const [L, w] of pts) m = Math.max(m, Math.abs((predict(L) - w) / w) * 100);
  return m;
}

// =====================================================================
// HYPOTHESIS A: per-skill independent simple power, NO compression.
//   w = 250 + a*(L-c)^b      (3 params each)
// =====================================================================
function fitSimplePower(pts) {
  const predict = (v) => (L) => {
    const x = L - v[2];
    return x <= 0 ? BASE : BASE + 10 ** v[0] * Math.pow(x, v[1]);
  };
  const loss = (v) => rmsePct(pts, predict(v)) ** 2;
  let best = null;
  for (const s of [[-3, 6.4, 1], [-3.5, 6.6, 2], [-2.5, 6, 2.5], [-4, 7, 0.5]]) {
    const r = nelderMead(loss, s);
    if (!best || r.fx < best.fx) best = r;
  }
  return { a: 10 ** best.x[0], b: best.x[1], c: best.x[2], predict: predict(best.x) };
}

// =====================================================================
// HYPOTHESIS B: per-skill power + smooth saturation (logistic-like damping)
//   w = 250 + a*(L-c)^b / (1 + (a*(L-c)^b / T)^e)^(... )  -- too many knobs.
// Use a cleaner one: power with multiplicative slowdown above T:
//   raw = a*(L-c)^b ; w = 250 + (raw<=T ? raw : T + (raw-T)^d * T^(1-d))
//   (continuous power-compression; 5 params)
// =====================================================================
function fitPowerCompress(pts) {
  const predict = (v) => (L) => {
    const [la, b, c, d, lT] = v;
    const T = 10 ** lT;
    const x = L - c;
    if (x <= 0) return BASE;
    let raw = 10 ** la * Math.pow(x, b);
    if (raw > T) raw = T + Math.pow(raw - T, d) * Math.pow(T, 1 - d);
    return BASE + raw;
  };
  const loss = (v) => rmsePct(pts, predict(v)) ** 2;
  let best = null;
  for (const s of [
    [-2.3, 5.9, 1.9, 0.85, 4.3],
    [-2.5, 6.0, 2.0, 0.8, 4.4],
    [-2.0, 5.8, 1.7, 0.9, 4.5],
  ]) {
    const r = nelderMead(loss, s, { maxIter: 12000 });
    if (!best || r.fx < best.fx) best = r;
  }
  const [la, b, c, d, lT] = best.x;
  return { a: 10 ** la, b, c, d, T: 10 ** lT, predict: predict(best.x) };
}

// =====================================================================
// HYPOTHESIS C (the "design" hypothesis): ONE shared curve shape for all
// outfield skills; only a per-skill scale `k` multiplies it.
//   raw = k_skill * (L-c)^b ; w = 250 + linearHinge(raw, T, d)
// Linear hinge applied AFTER scaling so threshold T is a real shared wage.
// Shared: b, c, d, T. Per-skill: k. Params: [b, c, d, lT, k1..k5] (9).
// =====================================================================
function fitSharedShape(start) {
  const compress = (raw, d, T) => (raw <= T ? raw : T + (raw - T) * d);
  const loss = (v) => {
    const [b, c, d, lT, ...lk] = v;
    const T = 10 ** lT;
    let s = 0, n = 0;
    ALL.forEach((g, gi) => {
      const k = 10 ** lk[gi];
      for (const [L, w] of g.pts) {
        const x = L - c;
        const raw = x <= 0 ? 0 : k * Math.pow(x, b);
        const p = BASE + compress(raw, d, T);
        const r = (p - w) / w;
        s += r * r; n++;
      }
    });
    return s / n;
  };
  const r = nelderMead(loss, start, { maxIter: 40000 });
  const [b, c, d, lT, ...lk] = r.x;
  const T = 10 ** lT;
  const predicts = ALL.map((g, gi) => {
    const k = 10 ** lk[gi];
    return {
      skill: g.skill,
      k,
      predict: (L) => {
        const x = L - c;
        const raw = x <= 0 ? 0 : k * Math.pow(x, b);
        return BASE + compress(raw, d, T);
      },
    };
  });
  return { b, c, d, T, predicts, rmse: Math.sqrt(r.fx) * 100 };
}

// ---------------- run & report ----------------
console.log("=".repeat(72));
console.log("FROM-SCRATCH FITS  (RMSE of relative error %, lower = better)");
console.log("=".repeat(72));

console.log("\n[A] per-skill simple power  w = 250 + a*(L-c)^b   (no compression)");
console.log("    skill            a            b       c       RMSE%   max%");
const resA = {};
for (const { skill, pts } of ALL) {
  const f = fitSimplePower(pts);
  resA[skill] = f;
  console.log(
    `    ${skill.padEnd(15)} ${f.a.toExponential(3)}  ${f.b.toFixed(3)}  ${f.c.toFixed(3)}   ${rmsePct(pts, f.predict).toFixed(3)}  ${maxPct(pts, f.predict).toFixed(2)}`,
  );
}

console.log("\n[B] per-skill power + compression  (5 params each)");
console.log("    skill            a            b       c       d      T       RMSE%   max%");
const resB = {};
for (const { skill, pts } of ALL) {
  const f = fitPowerCompress(pts);
  resB[skill] = f;
  console.log(
    `    ${skill.padEnd(15)} ${f.a.toExponential(3)}  ${f.b.toFixed(3)}  ${f.c.toFixed(3)}  ${f.d.toFixed(3)}  ${Math.round(f.T).toString().padStart(6)}  ${rmsePct(pts, f.predict).toFixed(3)}  ${maxPct(pts, f.predict).toFixed(2)}`,
  );
}

console.log("\n[C] SHARED shape, per-skill scale only  (design hypothesis)");
// log10(k) ~ log10(6e-3) ≈ -2.22 ; T ≈ 10000 -> lT=4 ; b≈5.8 c≈2 d≈0.93
const cStarts = [
  [5.8, 2.0, 0.93, 4.0, -2.22, -2.16, -2.18, -2.35, -2.21],
  [5.27, 2.85, 1.0, 6.0, -1.47, -1.38, -1.57, -1.68, -1.45],
  [6.0, 1.8, 0.85, 4.3, -2.3, -2.2, -2.3, -2.5, -2.3],
];
let C = null;
for (const s of cStarts) {
  const r = fitSharedShape(s);
  if (!C || r.rmse < C.rmse) C = r;
}
console.log(`    shared:  b=${C.b.toFixed(4)}  c=${C.c.toFixed(4)}  d=${C.d.toFixed(4)}  T=${Math.round(C.T)}`);
console.log(`    overall RMSE% = ${C.rmse.toFixed(3)}`);
console.log("    skill            k(scale)     RMSE%   max%");
for (const p of C.predicts) {
  const pts = dataFor(p.skill);
  console.log(
    `    ${p.skill.padEnd(15)} ${p.k.toExponential(4)}  ${rmsePct(pts, p.predict).toFixed(3)}  ${maxPct(pts, p.predict).toFixed(2)}`,
  );
}
console.log("\n    [C] full-precision drop-in (shared shape + per-skill scale):");
console.log(`    SHARED = { b: ${C.b}, c: ${C.c}, d: ${C.d}, T: ${C.T} }`);
for (const p of C.predicts) {
  console.log(`    ${p.skill}: a=${p.k}`);
}

// summary table
console.log("\n" + "=".repeat(72));
console.log("SUMMARY  RMSE% per skill");
console.log("  skill            A:power  B:pow+comp  C:shared");
for (const { skill, pts } of ALL) {
  const cP = C.predicts.find((x) => x.skill === skill).predict;
  console.log(
    `  ${skill.padEnd(15)}  ${rmsePct(pts, resA[skill].predict).toFixed(3).padStart(6)}   ${rmsePct(pts, resB[skill].predict).toFixed(3).padStart(7)}   ${rmsePct(pts, cP).toFixed(3).padStart(6)}`,
  );
}
