import { KEEPER_FORMULA } from "./minimum-wage-table.js";
import WageWizard from "./wagewizard.js";

WageWizard.HATTRICK_SKILLS = [
  "SetPiecesSkill",
  "KeeperSkill",
  "WingerSkill",
  "PassingSkill",
  "DefenderSkill",
  "ScorerSkill",
  "PlaymakerSkill",
];

WageWizard.DISCOUNT_RATE = 0.5;

WageWizard.KEEPER_FORMULA = KEEPER_FORMULA;

// Available wage formula sets. Each per-skill entry describes the wage
// component model used by the engine:
//   component(level) = a * (level - c) ^ b   (compressed above threshold T by d)
//
// - "legacy" is the original reverse-engineered formula (independent
//   coefficients per skill, onset c = 1, threshold T = 20000).
// - "refined" is a from-scratch fit that shares a single curve shape
//   (b, c, d, T) across all outfield skills and only varies the per-skill
//   scale `a`. It roughly halves the error against the community-maintained
//   minimum-wage table. See scripts/wage-formula-reverse.mjs.
WageWizard.FORMULA_SETS = {
  legacy: {
    DefenderSkill: { a: 0.0007107782, b: 6.4631407136, d: 0.7908 },
    PlaymakerSkill: { a: 0.0009418058, b: 6.4407950328, d: 0.7846 },
    PassingSkill: { a: 0.0003934936, b: 6.5741432118, d: 0.7914 },
    WingerSkill: { a: 0.0004408464, b: 6.4670218339, d: 0.7857 },
    ScorerSkill: { a: 0.0009078253, b: 6.4120304076, d: 0.7961 },
  },
  refined: {
    DefenderSkill: { a: 0.0036081140887371465, b: 5.979790782842938, c: 1.8201470723061353, d: 0.8178733871057215, T: 21412.4477345029 },
    PlaymakerSkill: { a: 0.004504418261995184, b: 5.979790782842938, c: 1.8201470723061353, d: 0.8178733871057215, T: 21412.4477345029 },
    PassingSkill: { a: 0.0025339987172055775, b: 5.979790782842938, c: 1.8201470723061353, d: 0.8178733871057215, T: 21412.4477345029 },
    WingerSkill: { a: 0.0022605003572008474, b: 5.979790782842938, c: 1.8201470723061353, d: 0.8178733871057215, T: 21412.4477345029 },
    ScorerSkill: { a: 0.004059320363827272, b: 5.979790782842938, c: 1.8201470723061353, d: 0.8178733871057215, T: 21412.4477345029 },
  },
};

WageWizard.DEFAULT_FORMULA = "refined";

// Set the active wage formula. Returns the resolved formula name.
WageWizard.setFormula = function (name) {
  const resolved = WageWizard.FORMULA_SETS[name] ? name : WageWizard.DEFAULT_FORMULA;
  WageWizard.ACTIVE_FORMULA = resolved;
  WageWizard.FORMULAE = WageWizard.FORMULA_SETS[resolved];
  return resolved;
};

WageWizard.setFormula(WageWizard.DEFAULT_FORMULA);
