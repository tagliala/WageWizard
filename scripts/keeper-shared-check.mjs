#!/usr/bin/env node
// Does the Keeper skill follow the same SHARED growth curve as outfield skills?
//
// Refined shared shape (from wage-formula-reverse.mjs Hypothesis C):
//   raw = a * (L - c)^b ; w = 250 + linearHinge(raw, T, d)
// with b, c, d, T shared across all outfield skills and only `a` per skill.
//
// We test three things for the Keeper column:
//   1) Fit ONLY a keeper scale `a` to the shared (b, c, d, T) -> does it work?
//   2) Fit keeper with its own free power+compression (5 params) -> best case.
//   3) Compare against the current table-based keeper values (exact).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(
  readFileSync(resolve(__dirname, "../src/minimum-wage-table.json"), "utf8"),
);

const BASE = 250;
// Shared refined shape constants.
const SHARED = { b: 5.979790782842938, c: 1.8201470723061353, d: 0.8178733871057215, T: 21412.4477345029 };

function dataFor(skill) {
  const idx = table.skills.indexOf(skill);
  const pts = [];
  for (const row of table.rows) {
    const w = row.wages[idx];
    if (w != null) pts.push([row.level, w]);
  }
  return pts;
}

const keeper = dataFor("KeeperSkill");

const compress = (raw, d, T) => (raw <= T ? raw : T + (raw - T) * d);
const rmsePct = (pts, f) => {
  let s = 0;
  for (const [L, w] of pts) {
    const r = (f(L) - w) / w;
    s += r * r;
  }
  return Math.sqrt(s / pts.length) * 100;
};
const maxPct = (pts, f) => {
  let m = 0;
  for (const [L, w] of pts) m = Math.max(m, Math.abs((f(L) - w) / w) * 100);
  return m;
};

// --- generic Nelder-Mead (same as the other scripts) ---
function nelderMead(f, x0, { maxIter = 40000, tol = 1e-14 } = {}) {
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
      simplex[n] = fe < fr ? exp : ref;
      fv[n] = Math.min(fe, fr);
    } else if (fr < fv[n - 1]) {
      simplex[n] = ref;
      fv[n] = fr;
    } else {
      const con = cen.map((c, j) => c + rho * (simplex[n][j] - c));
      const fc = f(con);
      if (fc < fv[n]) {
        simplex[n] = con;
        fv[n] = fc;
      } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[0].map((c, j) => c + sigma * (simplex[i][j] - c));
          fv[i] = f(simplex[i]);
        }
      }
    }
  }
  const i0 = fv.map((v, i) => i).sort((p, q) => fv[p] - fv[q])[0];
  return { x: simplex[i0], fx: fv[i0] };
}

console.log("Keeper data points (level -> EUR):");
console.log("  " + keeper.map(([L, w]) => `${L}:${w}`).join("  "));

// (1) Only a per-skill scale `a`, locked to the shared shape.
{
  const { b, c, d, T } = SHARED;
  const loss = (v) => {
    const a = 10 ** v[0];
    let s = 0;
    for (const [L, w] of keeper) {
      const x = L - c;
      const raw = x <= 0 ? 0 : a * Math.pow(x, b);
      const p = BASE + compress(raw, d, T);
      const r = (p - w) / w;
      s += r * r;
    }
    return s / keeper.length;
  };
  let best = null;
  for (const s0 of [-2.5, -2.3, -2.0, -1.8]) {
    const r = nelderMead(loss, [s0]);
    if (!best || r.fx < best.fx) best = r;
  }
  const a = 10 ** best.x[0];
  const f = (L) => {
    const x = L - c;
    const raw = x <= 0 ? 0 : a * Math.pow(x, b);
    return BASE + compress(raw, d, T);
  };
  console.log("\n[1] SHARED shape, only keeper scale a free:");
  console.log(`    a = ${a}`);
  console.log(`    RMSE% = ${rmsePct(keeper, f).toFixed(3)}   max% = ${maxPct(keeper, f).toFixed(2)}`);
}

// (2) Keeper with its own free power + compression (5 params).
{
  const loss = (v) => {
    const [la, b, c, d, lT] = v;
    const a = 10 ** la;
    const T = 10 ** lT;
    let s = 0;
    for (const [L, w] of keeper) {
      const x = L - c;
      const raw = x <= 0 ? 0 : a * Math.pow(x, b);
      const p = BASE + compress(raw, d, T);
      const r = (p - w) / w;
      s += r * r;
    }
    return s / keeper.length;
  };
  let best = null;
  for (const s of [
    [-2.3, 5.98, 1.82, 0.82, 4.33],
    [-2.0, 6.0, 1.5, 0.85, 4.4],
    [-2.5, 5.8, 2.0, 0.8, 4.3],
    [-1.8, 6.4, 1.0, 0.79, 4.3],
  ]) {
    const r = nelderMead(loss, s);
    if (!best || r.fx < best.fx) best = r;
  }
  const [la, b, c, d, lT] = best.x;
  const a = 10 ** la;
  const T = 10 ** lT;
  const f = (L) => {
    const x = L - c;
    const raw = x <= 0 ? 0 : a * Math.pow(x, b);
    return BASE + compress(raw, d, T);
  };
  console.log("\n[2] Keeper free power + compression (own b,c,d,T):");
  console.log(`    a=${a.toExponential(4)} b=${b.toFixed(4)} c=${c.toFixed(4)} d=${d.toFixed(4)} T=${Math.round(T)}`);
  console.log(`    RMSE% = ${rmsePct(keeper, f).toFixed(3)}   max% = ${maxPct(keeper, f).toFixed(2)}`);
}

// Reference: outfield refined RMSE was ~0.6-1.4%.
console.log("\n(For reference, refined outfield skills fit at RMSE ~0.6-1.4%.)");
