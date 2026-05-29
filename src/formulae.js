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

WageWizard.FORMULAE = {
  DefenderSkill: { a: 0.0007107782, b: 6.4631407136, d: 0.7908 },
  PlaymakerSkill: { a: 0.0009418058, b: 6.4407950328, d: 0.7846 },
  PassingSkill: { a: 0.0003934936, b: 6.5741432118, d: 0.7914 },
  WingerSkill: { a: 0.0004408464, b: 6.4670218339, d: 0.7857 },
  ScorerSkill: { a: 0.0009078253, b: 6.4120304076, d: 0.7961 },
};
