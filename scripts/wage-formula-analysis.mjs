#!/usr/bin/env node
// Wage formula analysis: compare the current reverse-engineered formula against
// the community-maintained minimum-wage table, and search for better
// coefficients / forms.
//
// Model replicated from src/engine.js (single skill at level L, others at 1):
//   wage_EUR = BASE + g(L)
//   BASE = 250 (engine uses 2500 SEK = 250 EUR)
//   g(L) = a*(L-1)^b, with soft compression above 20000:
//          if raw > 20000 -> 20000 + (raw - 20000) * d
//   (engine works in SEK and multiplies by 10; here everything is in EUR)
//
// Table values are rounded to the nearest 10 EUR, so ~+-5 EUR of the absolute
// error is unavoidable noise for any formula.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const table = JSON.parse(
  readFileSync(resolve(__dirname, "../src/minimum-wage-table.json"), "utf8"),
);

const BASE = 250;
const COMPRESS_THRESHOLD = 20000;

// Current coefficients from src/formulae.js
const CURRENT = {
  DefenderSkill: { a: 0.0007107782, b: 6.4631407136, d: 0.7908 },
  PlaymakerSkill: { a: 0.0009418058, b: 6.4407950328, d: 0.7846 },
  PassingSkill: { a: 0.0003934936, b: 6.5741432118, d: 0.7914 },
  WingerSkill: { a: 0.0004408464, b: 6.4670218339, d: 0.7857 },
  ScorerSkill: { a: 0.0009078253, b: 6.4120304076, d: 0.7961 },
};

const SKILLS = Object.keys(CURRENT); // keeper excluded by request

// ---- data extraction -------------------------------------------------------
function dataFor(skill) {
  const idx = table.skills.indexOf(skill);
  const pts = [];
  for (const row of table.rows) {
    const w = row.wages[idx];
    if (w != null) pts.push({ level: row.level, wage: w });
  }
  return pts;
}

// ---- model -----------------------------------------------------------------
// Power-law with soft compression (the engine's form).
function predictPow({ a, b, d }, level) {
  if (level < 1) return 0;
  let raw = a * Math.pow(level - 1, b);
  if (raw > COMPRESS_THRESHOLD) {
    raw = COMPRESS_THRESHOLD + (raw - COMPRESS_THRESHOLD) * d;
  }
  return BASE + raw;
}

// Power-law with a free onset level `c`: the wage stays flat at the base until
// the level exceeds c. This models the low-level floor that the engine's fixed
// (L-1) form overshoots.
function predictPowShift({ a, b, c, d }, level) {
  const x = level - c;
  if (x <= 0) return BASE;
  let raw = a * Math.pow(x, b);
  if (raw > COMPRESS_THRESHOLD) {
    raw = COMPRESS_THRESHOLD + (raw - COMPRESS_THRESHOLD) * d;
  }
  return BASE + raw;
}

// Table values are all multiples of 10 EUR, so the displayed wage is the model
// output quantized to the nearest 10. q10 applies that quantization.
function q10(x) {
  return Math.round(x / 10) * 10;
}

// ---- metrics ---------------------------------------------------------------
function metrics(pts, predict, params, quantize = false) {
  const absErr = [];
  const relErr = []; // signed relative error in %
  let exact = 0;
  for (const { level, wage } of pts) {
    let p = predict(params, level);
    if (quantize) p = q10(p);
    if (p === wage) exact++;
    absErr.push(p - wage);
    relErr.push(((p - wage) / wage) * 100);
  }
  const n = pts.length;
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const std = (xs) => {
    const m = mean(xs);
    return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  };
  const absRel = relErr.map(Math.abs);
  const rmseRel = Math.sqrt(mean(relErr.map((x) => x * x)));
  const rmseAbs = Math.sqrt(mean(absErr.map((x) => x * x)));
  // outliers: |relative error| over 1% AND |abs error| over the 5 EUR
  // rounding noise floor.
  const outliers = pts.filter((pt, i) => absRel[i] > 1 && Math.abs(absErr[i]) > 5);
  return {
    n,
    exact,
    maxAbsRel: Math.max(...absRel),
    meanAbsRel: mean(absRel),
    stdRel: std(relErr),
    rmseRel,
    rmseAbs,
    maxAbsErr: Math.max(...absErr.map(Math.abs)),
    outliers,
    relErr,
    absErr,
  };
}

// ---- optimiser: Nelder-Mead simplex ---------------------------------------
function nelderMead(f, x0, { maxIter = 4000, tol = 1e-12 } = {}) {
  const n = x0.length;
  const alpha = 1, gamma = 2, rho = 0.5, sigma = 0.5;
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const x = x0.slice();
    x[i] = x[i] !== 0 ? x[i] * 1.05 : 0.00025;
    simplex.push(x);
  }
  let fv = simplex.map(f);
  for (let iter = 0; iter < maxIter; iter++) {
    const order = fv.map((v, i) => i).sort((p, q) => fv[p] - fv[q]);
    simplex = order.map((i) => simplex[i]);
    fv = order.map((i) => fv[i]);
    if (Math.abs(fv[n] - fv[0]) < tol) break;
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
    const reflect = centroid.map((c, j) => c + alpha * (c - simplex[n][j]));
    const fr = f(reflect);
    if (fr < fv[0]) {
      const expand = centroid.map((c, j) => c + gamma * (reflect[j] - c));
      const fe = f(expand);
      if (fe < fr) { simplex[n] = expand; fv[n] = fe; }
      else { simplex[n] = reflect; fv[n] = fr; }
    } else if (fr < fv[n - 1]) {
      simplex[n] = reflect; fv[n] = fr;
    } else {
      const contract = centroid.map((c, j) => c + rho * (simplex[n][j] - c));
      const fc = f(contract);
      if (fc < fv[n]) { simplex[n] = contract; fv[n] = fc; }
      else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((v, j) => simplex[0][j] + sigma * (v - simplex[0][j]));
          fv[i] = f(simplex[i]);
        }
      }
    }
  }
  const best = fv.map((v, i) => i).sort((p, q) => fv[p] - fv[q])[0];
  return { x: simplex[best], fx: fv[best] };
}

// Loss: mean squared relative error (fit quality across the whole scale).
function makeLoss(pts, predict) {
  return (params) => {
    let s = 0;
    for (const { level, wage } of pts) {
      const p = predict(params, level);
      const rel = (p - wage) / wage;
      s += rel * rel;
    }
    return s / pts.length;
  };
}

// Fit the engine's power+compression model. Optimise [log10(a), b, d].
function fitPow(pts, start) {
  const predict = (v, L) => predictPow({ a: 10 ** v[0], b: v[1], d: v[2] }, L);
  const loss = makeLoss(pts, predict);
  // multi-start to avoid local minima
  const starts = [
    [Math.log10(start.a), start.b, start.d],
    [Math.log10(start.a), start.b, 0.8],
    [-3.2, 6.45, 0.79],
    [-3.5, 6.6, 0.78],
    [-2.8, 6.3, 0.82],
  ];
  let best = null;
  for (const s of starts) {
    const r = nelderMead(loss, s);
    if (!best || r.fx < best.fx) best = r;
  }
  return { a: 10 ** best.x[0], b: best.x[1], d: best.x[2] };
}

// Fit the 4-parameter onset-shift model. Optimise [log10(a), b, c, d].
function fitPowShift(pts, start) {
  const predict = (v, L) =>
    predictPowShift({ a: 10 ** v[0], b: v[1], c: v[2], d: v[3] }, L);
  const loss = makeLoss(pts, predict);
  const starts = [
    [Math.log10(start.a), start.b, 1.0, start.d],
    [Math.log10(start.a), start.b, 1.5, 0.78],
    [-3.2, 6.45, 2.0, 0.78],
    [-3.5, 6.6, 1.0, 0.78],
    [-2.8, 6.3, 2.5, 0.82],
  ];
  let best = null;
  for (const s of starts) {
    const r = nelderMead(loss, s, { maxIter: 8000 });
    if (!best || r.fx < best.fx) best = r;
  }
  return { a: 10 ** best.x[0], b: best.x[1], c: best.x[2], d: best.x[3] };
}

// ---- reporting -------------------------------------------------------------
function fmt(n, d = 2) {
  return Number(n).toFixed(d);
}

console.log("=".repeat(78));
console.log("WAGE FORMULA ANALYSIS  (all values in EUR; keeper excluded)");
console.log("=".repeat(78));

const summary = [];

for (const skill of SKILLS) {
  const pts = dataFor(skill);
  const cur = CURRENT[skill];
  const fitted = fitPow(pts, cur);
  const fittedShift = fitPowShift(pts, cur);

  const mCur = metrics(pts, predictPow, cur);
  const mNew = metrics(pts, predictPow, fitted);
  const mShift = metrics(pts, predictPowShift, fittedShift);
  console.log("\n" + "-".repeat(78));
  console.log(`${skill}  (n=${pts.length} levels)`);
  console.log("-".repeat(78));
  console.log("                       current            new (refit)");
  console.log(
    `  a                    ${cur.a.toExponential(6)}   ${fitted.a.toExponential(6)}`,
  );
  console.log(`  b                    ${fmt(cur.b, 6)}        ${fmt(fitted.b, 6)}`);
  console.log(`  d                    ${fmt(cur.d, 6)}        ${fmt(fitted.d, 6)}`);
  console.log(`  RMSE (rel %)         ${fmt(mCur.rmseRel, 4).padStart(9)}        ${fmt(mNew.rmseRel, 4)}`);
  console.log(`  mean |rel| %         ${fmt(mCur.meanAbsRel, 4).padStart(9)}        ${fmt(mNew.meanAbsRel, 4)}`);
  console.log(`  max |rel| %          ${fmt(mCur.maxAbsRel, 4).padStart(9)}        ${fmt(mNew.maxAbsRel, 4)}`);
  console.log(`  std rel %            ${fmt(mCur.stdRel, 4).padStart(9)}        ${fmt(mNew.stdRel, 4)}`);
  console.log(`  RMSE (abs EUR)       ${fmt(mCur.rmseAbs, 2).padStart(9)}        ${fmt(mNew.rmseAbs, 2)}`);
  console.log(`  max abs err (EUR)    ${fmt(mCur.maxAbsErr, 2).padStart(9)}        ${fmt(mNew.maxAbsErr, 2)}`);
  console.log(`  outliers (>1% & >5)  ${String(mCur.outliers.length).padStart(9)}        ${mNew.outliers.length}`);
  console.log(
    `  -> 4-param (a,b,c,d): RMSE %=${fmt(mShift.rmseRel, 4)}  max|rel|%=${fmt(mShift.maxAbsRel, 4)}  std%=${fmt(mShift.stdRel, 4)}  outliers=${mShift.outliers.length}  c=${fmt(fittedShift.c, 4)}`,
  );
  // Exact-match counts after quantizing predictions to the nearest 10 EUR.
  const qCur = metrics(pts, predictPow, cur, true);
  const qNew = metrics(pts, predictPow, fitted, true);
  const qShift = metrics(pts, predictPowShift, fittedShift, true);
  console.log(
    `  exact matches (round to 10 EUR):  current ${qCur.exact}/${pts.length}   3-param ${qNew.exact}/${pts.length}   4-param ${qShift.exact}/${pts.length}`,
  );

  // per-level comparison table
  console.log("\n   lvl   actual    current   err%       3-param   err%      4-param   err%");
  const idx = table.skills.indexOf(skill);
  for (const row of table.rows) {
    const w = row.wages[idx];
    if (w == null) continue;
    const pc = predictPow(cur, row.level);
    const pn = predictPow(fitted, row.level);
    const ps = predictPowShift(fittedShift, row.level);
    console.log(
      `   ${String(row.level).padStart(2)}   ${String(w).padStart(7)}   ` +
        `${fmt(pc, 1).padStart(8)}  ${fmt(((pc - w) / w) * 100, 2).padStart(6)}   ` +
        `${fmt(pn, 1).padStart(8)}  ${fmt(((pn - w) / w) * 100, 2).padStart(6)}   ` +
        `${fmt(ps, 1).padStart(8)}  ${fmt(((ps - w) / w) * 100, 2).padStart(6)}`,
    );
  }

  summary.push({ skill, fitted, fittedShift, mCur, mNew, mShift });
}

console.log("\n" + "=".repeat(78));
console.log("SUMMARY (RMSE relative %, lower is better)");
console.log("=".repeat(78));
console.log("  skill            current   3-param   4-param   best gain");
for (const s of summary) {
  const imp = ((s.mCur.rmseRel - s.mShift.rmseRel) / s.mCur.rmseRel) * 100;
  console.log(
    `  ${s.skill.padEnd(15)}  ${fmt(s.mCur.rmseRel, 4).padStart(7)}   ${fmt(s.mNew.rmseRel, 4).padStart(7)}   ${fmt(s.mShift.rmseRel, 4).padStart(7)}   ${fmt(imp, 1)}%`,
  );
}

console.log("\n3-param refit (drop-in for src/formulae.js, same engine form):");
for (const s of summary) {
  console.log(
    `  ${s.skill}: { a: ${s.fitted.a.toExponential(10)}, b: ${fmt(s.fitted.b, 10)}, d: ${fmt(s.fitted.d, 6)} },`,
  );
}

console.log("\n4-param refit (requires engine change: component uses (L - c)):");
for (const s of summary) {
  console.log(
    `  ${s.skill}: { a: ${s.fittedShift.a.toExponential(10)}, b: ${fmt(s.fittedShift.b, 10)}, c: ${fmt(s.fittedShift.c, 6)}, d: ${fmt(s.fittedShift.d, 6)} },`,
  );
}
