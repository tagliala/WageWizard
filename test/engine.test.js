import { describe, it, expect, beforeAll } from "vitest";
import "../src/formulae.js";
import { KEEPER_FORMULA, MINIMUM_WAGE_TABLE } from "../src/minimum-wage-table.js";
import {
  getRate,
  setPlayerData,
  getSalaryComponents,
  getKeeperComponents,
  getSetPiecesMultipliers,
  validateSkill,
  getPlayerBonus,
  getWageMultiplier,
} from "../src/engine.js";

beforeAll(() => {
  window.WageWizard.CONFIG = { DEBUG: false };
});

// ---------- validateSkill ----------

describe("validateSkill", () => {
  it("clamps below minimum to min", () => {
    expect(validateSkill(0, "form")).toBe(1);
    expect(validateSkill(-5, "stamina")).toBe(1);
  });

  it("clamps above maximum to max", () => {
    expect(validateSkill(10, "form")).toBe(8);
    expect(validateSkill(25, "skill")).toBe(22);
  });

  it("returns the value when within range", () => {
    expect(validateSkill(5, "form")).toBe(5);
    expect(validateSkill(7.5, "stamina")).toBe(7.5);
  });

  it("handles comma-separated decimals", () => {
    expect(validateSkill("5,5", "stamina")).toBe(5.5);
  });

  it("returns 0 for unknown skill type", () => {
    expect(validateSkill(5, "unknown")).toBe(0);
  });
});

// ---------- getPlayerBonus ----------

describe("getPlayerBonus", () => {
  it("returns 0 for minimum loyalty without mother club", () => {
    expect(getPlayerBonus(1, false)).toBe(0);
  });

  it("returns 1 for loyalty 20 without mother club", () => {
    expect(getPlayerBonus(20, false)).toBe(1);
  });

  it("returns 1.5 with mother club bonus", () => {
    expect(getPlayerBonus(1, true)).toBe(1.5);
  });

  it("scales linearly between 1 and 20", () => {
    const bonus = getPlayerBonus(10, false);
    expect(bonus).toBeCloseTo(9 / 19, 5);
  });
});

// ---------- getRate ----------

describe("getRate", () => {
  it("returns 1 for age 28 and below", () => {
    expect(getRate(20)).toBe(1);
    expect(getRate(28)).toBe(1);
  });

  it("returns discount for age 29+", () => {
    expect(getRate(29)).toBeCloseTo(0.9);
    expect(getRate(30)).toBeCloseTo(0.8);
    expect(getRate(33)).toBeCloseTo(0.5);
  });

  it("caps at age 37", () => {
    expect(getRate(37)).toBeCloseTo(0.1);
    expect(getRate(40)).toBeCloseTo(0.1);
  });
});

// ---------- getSetPiecesMultipliers ----------

describe("getSetPiecesMultipliers", () => {
  it("returns [1, ~1] for level 1", () => {
    const [lo, hi] = getSetPiecesMultipliers(1);
    expect(lo).toBe(1);
    expect(hi).toBeCloseTo(1 + 0.0026 * 0.99, 6);
  });

  it("increases with higher levels", () => {
    const [lo5] = getSetPiecesMultipliers(5);
    const [lo10] = getSetPiecesMultipliers(10);
    expect(lo10).toBeGreaterThan(lo5);
  });
});

// ---------- getKeeperComponents ----------

describe("getKeeperComponents", () => {
  it("reuses the keeper column from the minimum wage table data", () => {
    expect(KEEPER_FORMULA).toEqual(MINIMUM_WAGE_TABLE.rows.map((row) => row.wages[0]));
    expect(window.WageWizard.KEEPER_FORMULA).toEqual(KEEPER_FORMULA);
  });

  it("returns expected values for level 1", () => {
    const [lo, hi] = getKeeperComponents(1);
    expect(lo).toBe(250 * 10 - 2500);
    expect(hi).toBe(270 * 10 - 2500);
  });

  it("returns expected values for level 0", () => {
    const [lo, hi] = getKeeperComponents(0);
    expect(lo).toBe(250 * 10 - 2500);
    expect(hi).toBe(250 * 10 - 2500);
  });
});

// ---------- getSalaryComponents ----------

describe("getSalaryComponents", () => {
  it("returns [0, 0] for level < 1", () => {
    expect(getSalaryComponents("DefenderSkill", 0)).toEqual([0, 0]);
  });

  it("returns positive values for level >= 1", () => {
    const [lo, hi] = getSalaryComponents("DefenderSkill", 5);
    expect(lo).toBeGreaterThan(0);
    expect(hi).toBeGreaterThan(lo);
  });
});

// ---------- setPlayerData ----------

describe("setPlayerData", () => {
  it("calculates salary data for a player", () => {
    const player = {
      Age: 25,
      Salary: "5000",
      Abroad: false,
      KeeperSkill: 1,
      SetPiecesSkill: 5,
      DefenderSkill: 10,
      PlaymakerSkill: 8,
      PassingSkill: 6,
      WingerSkill: 4,
      ScorerSkill: 3,
    };
    setPlayerData(player);
    expect(player.WageWizard).toBeDefined();
    expect(player.WageWizard.weekly).toBe(5000);
    expect(player.WageWizard.seasonly).toBe(80000);
    expect(player.WageWizard.rate).toBe(1);
    expect(player.WageWizard.discount).toBe(0);
    expect(player.WageWizard.primary).toBe("DefenderSkill");
    expect(player.WageWizard.baseSalary).toBe(2500);
    expect(player.WageWizard.min).toBeGreaterThan(0);
    expect(player.WageWizard.max).toBeGreaterThan(player.WageWizard.min);
  });

  it("applies age discount for older players", () => {
    const player = {
      Age: 33,
      Salary: "5000",
      Abroad: false,
      KeeperSkill: 1,
      SetPiecesSkill: 5,
      DefenderSkill: 10,
      PlaymakerSkill: 8,
      PassingSkill: 6,
      WingerSkill: 4,
      ScorerSkill: 3,
    };
    setPlayerData(player);
    expect(player.WageWizard.rate).toBeCloseTo(0.5);
    expect(player.WageWizard.discount).toBeCloseTo(0.5);
  });

  it("applies abroad bonus", () => {
    const player = {
      Age: 25,
      Salary: "5000",
      Abroad: true,
      KeeperSkill: 1,
      SetPiecesSkill: 5,
      DefenderSkill: 10,
      PlaymakerSkill: 8,
      PassingSkill: 6,
      WingerSkill: 4,
      ScorerSkill: 3,
    };
    setPlayerData(player);
    expect(player.WageWizard.baseSalary).toBe(3000);
    expect(player.WageWizard.abroadWeekly).toBe(1000);
    expect(player.WageWizard.abroadSeasonly).toBe(16000);
  });

  it("applies special bonus without inflating base salary", () => {
    const player = {
      Age: 25,
      Salary: "5000",
      Special: true,
      Abroad: false,
      KeeperSkill: 1,
      SetPiecesSkill: 5,
      DefenderSkill: 10,
      PlaymakerSkill: 8,
      PassingSkill: 6,
      WingerSkill: 4,
      ScorerSkill: 3,
    };
    setPlayerData(player);
    expect(player.WageWizard.baseSalary).toBe(2500);
    expect(player.WageWizard.specialWeekly).toBe(500);
    expect(player.WageWizard.specialSeasonly).toBe(8000);
    expect(player.WageWizard.abroadWeekly).toBe(0);
  });

  it("keeps the fixed base salary on the abroad path as well", () => {
    const player = {
      Age: 25,
      Salary: "5000",
      Special: true,
      Abroad: true,
      KeeperSkill: 1,
      SetPiecesSkill: 5,
      DefenderSkill: 10,
      PlaymakerSkill: 8,
      PassingSkill: 6,
      WingerSkill: 4,
      ScorerSkill: 3,
    };
    setPlayerData(player);
    expect(player.WageWizard.baseSalary).toBe(3000);
    expect(player.WageWizard.abroadWeekly).toBe(1000);
    expect(player.WageWizard.specialWeekly).toBe(500);
  });

  it("shows zero special bonus when not special", () => {
    const player = {
      Age: 25,
      Salary: "5000",
      Special: false,
      Abroad: false,
      KeeperSkill: 1,
      SetPiecesSkill: 5,
      DefenderSkill: 10,
      PlaymakerSkill: 8,
      PassingSkill: 6,
      WingerSkill: 4,
      ScorerSkill: 3,
    };
    setPlayerData(player);
    expect(player.WageWizard.specialWeekly).toBe(0);
    expect(player.WageWizard.specialSeasonly).toBe(0);
  });

  it("allows overriding primary skill", () => {
    const player = {
      Age: 25,
      Salary: "5000",
      Abroad: false,
      KeeperSkill: 1,
      SetPiecesSkill: 5,
      DefenderSkill: 10,
      PlaymakerSkill: 10,
      PassingSkill: 6,
      WingerSkill: 4,
      ScorerSkill: 3,
    };
    setPlayerData(player, "PlaymakerSkill");
    expect(player.WageWizard.primary).toBe("PlaymakerSkill");
  });
});

// ---------- getWageMultiplier ----------

describe("getWageMultiplier", () => {
  it("returns 1 when neither special nor abroad", () => {
    expect(getWageMultiplier({ Special: false, Abroad: false })).toBe(1);
  });

  it("returns 1.2 when abroad only", () => {
    expect(getWageMultiplier({ Special: false, Abroad: true })).toBeCloseTo(1.2);
  });

  it("returns 1.1 when special only", () => {
    expect(getWageMultiplier({ Special: true, Abroad: false })).toBeCloseTo(1.1);
  });

  it("returns 1.32 when both special and abroad", () => {
    expect(getWageMultiplier({ Special: true, Abroad: true })).toBeCloseTo(1.32);
  });
});
