import WageWizard from "./wagewizard.js";

WageWizard.Engine = WageWizard.Engine || {};

const VERSION = 1;
const WEEKS = 16;
const BASE_SALARY = 2500;

const SKILL_VALIDATION = {
  form: { min: 1, max: 8 },
  stamina: { min: 1, max: 9 },
  exp: { min: 0, max: 30 },
  skill: { min: 0, max: 22 },
  loyalty: { min: 1, max: 20 },
};

const PR_ENUM_ROLE = {
  0: "GK",
  1: "CD",
  2: "CD OFF",
  3: "CD TW",
  4: "WB",
  5: "WB OFF",
  6: "WB DEF",
  7: "WB TM",
  8: "IM",
  9: "IM OFF",
  10: "IM DEF",
  11: "IM TW",
  12: "WI",
  13: "WI OFF",
  14: "WI DEF",
  15: "WI TM",
  16: "FW",
  17: "FW DEF",
  18: "FW DEF+T",
  19: "FW TW",
};

function validateSkill(skill, type) {
  if (SKILL_VALIDATION[type] == null) {
    return 0;
  }
  const min = SKILL_VALIDATION[type].min;
  const max = SKILL_VALIDATION[type].max;
  const parsedSkill = Number(String(skill).replace(/,/g, "."));
  if (Number.isNaN(parsedSkill) || parsedSkill < min) {
    return min;
  }
  if (parsedSkill > max) {
    return max;
  }
  return parsedSkill;
}

function getPlayerBonus(loyalty, motherClubBonus) {
  if (motherClubBonus) {
    loyalty = 20;
  }
  let playerBonus = 0;
  if (motherClubBonus) {
    playerBonus += 0.5;
  }
  playerBonus += Math.max(0, loyalty - 1) / 19;
  return playerBonus;
}

function getRate(age) {
  age = Math.min(Number.parseInt(age, 10), 37);
  if (age >= 29) {
    return 1 - (age - 28) / 10;
  }
  return 1;
}

function getSetPiecesMultipliers(level) {
  return [
    1 + 0.0026 * Math.max(0, level - 1),
    1 + 0.0026 * Math.max(0, level - 0.01),
  ];
}

function getKeeperComponents(level) {
  return [
    WageWizard.KEEPER_FORMULA[Math.max(0, level - 1)] * 10 - 2500,
    WageWizard.KEEPER_FORMULA[Math.max(0, level)] * 10 - 2500,
  ];
}

function getSalaryComponents(skill, level) {
  const formula = WageWizard.FORMULAE[skill];
  if (level < 1) {
    return [0, 0];
  }
  let salary_component_low = formula.a * Math.pow(level - 1, formula.b);
  let salary_component_high = formula.a * Math.pow(level - 0.01, formula.b);
  if (salary_component_low > 20000) {
    salary_component_low =
      20000 + (salary_component_low - 20000) * formula.d;
  }
  if (salary_component_high > 20000) {
    salary_component_high =
      20000 + (salary_component_high - 20000) * formula.d;
  }
  return [salary_component_low * 10, salary_component_high * 10];
}

function getWageMultiplier(player) {
  return player.Special ? 1.1 * (player.Abroad ? 1.2 : 1) : (player.Abroad ? 1.2 : 1);
}

function setMinAndMaxSalary(player) {
  let min = 0;
  let max = 0;
  for (const skill in player.WageWizard.Skills) {
    min += player.WageWizard.Skills[skill].min;
    max += player.WageWizard.Skills[skill].max;
  }
  let baseSalary = player.Special ? 1.1 * BASE_SALARY : BASE_SALARY;
  baseSalary = player.Abroad ? 1.2 * baseSalary : baseSalary;
  player.WageWizard.baseSalary = baseSalary;
  player.WageWizard.min =
    baseSalary + min * player.WageWizard.Skills.SetPiecesSkill.min;
  player.WageWizard.max =
    baseSalary + max * player.WageWizard.Skills.SetPiecesSkill.max;
}

function applySecondaryDiscounts(player) {
  const primary = player.WageWizard.primary;
  for (const skill of WageWizard.HATTRICK_SKILLS) {
    if (skill !== "SetPiecesSkill" && skill !== primary) {
      player.WageWizard.Skills[skill].min *= WageWizard.DISCOUNT_RATE;
      player.WageWizard.Skills[skill].max *= WageWizard.DISCOUNT_RATE;
    }
  }
}

function setPrimarySkill(player) {
  player.WageWizard.unpredictable_skills = [];
  let maximum_min = -Infinity;
  let primary = "";
  for (const skill of WageWizard.HATTRICK_SKILLS) {
    if (skill !== "SetPiecesSkill") {
      if (player.WageWizard.Skills[skill].min > maximum_min) {
        maximum_min = player.WageWizard.Skills[skill].min;
        primary = skill;
      }
    }
  }
  for (const skill of WageWizard.HATTRICK_SKILLS) {
    if (skill !== "SetPiecesSkill" && skill !== primary) {
      if (player.WageWizard.Skills[skill].max >= maximum_min) {
        player.WageWizard.unpredictable_skills.push(skill);
      }
    }
  }
  if (player.WageWizard.unpredictable_skills.length !== 0) {
    player.WageWizard.unpredictable_skills.push(primary);
  }
  player.WageWizard.primary = primary;
}

function setKeeperSkill(player) {
  player.WageWizard.Skills.KeeperSkill = {};
  const wage_multiplier = getWageMultiplier(player);
  const keeperComponents = getKeeperComponents(player.KeeperSkill);
  player.WageWizard.Skills.KeeperSkill.min =
    keeperComponents[0] * player.WageWizard.rate * wage_multiplier;
  player.WageWizard.Skills.KeeperSkill.max =
    keeperComponents[1] * player.WageWizard.rate * wage_multiplier;
}

function setSetPiecesSkill(player) {
  player.WageWizard.Skills.SetPiecesSkill = {};
  const setPiecesMultipliers = getSetPiecesMultipliers(player.SetPiecesSkill);
  player.WageWizard.Skills.SetPiecesSkill.min = setPiecesMultipliers[0];
  player.WageWizard.Skills.SetPiecesSkill.max = setPiecesMultipliers[1];
}

function setPlayerSkills(player) {
  player.WageWizard.Skills = {};
  const wage_multiplier = getWageMultiplier(player);
  setKeeperSkill(player);
  setSetPiecesSkill(player);
  for (const skill in WageWizard.FORMULAE) {
    player.WageWizard.Skills[skill] = {};
    const salaryComponents = getSalaryComponents(skill, player[skill]);
    player.WageWizard.Skills[skill].min =
      salaryComponents[0] * player.WageWizard.rate * wage_multiplier;
    player.WageWizard.Skills[skill].max =
      salaryComponents[1] * player.WageWizard.rate * wage_multiplier;
  }
}

function setPlayerData(player, overridePrimary) {
  if (overridePrimary == null) {
    overridePrimary = null;
  }
  player.WageWizard = {};
  const weekly = Number.parseInt(player.Salary);
  player.WageWizard.rate = getRate(player.Age);
  player.WageWizard.discount = 1 - player.WageWizard.rate;
  player.WageWizard.weekly = weekly;
  player.WageWizard.seasonly = weekly * WEEKS;
  player.WageWizard.weeklyWithoutDiscount = weekly / player.WageWizard.rate;
  player.WageWizard.seasonlyWithoutDiscount =
    player.WageWizard.weeklyWithoutDiscount * WEEKS;
  player.WageWizard.abroadWeekly = player.Abroad ? weekly * 0.2 : 0;
  player.WageWizard.abroadSeasonly = player.Abroad
    ? player.WageWizard.abroadWeekly * WEEKS
    : 0;
  player.WageWizard.specialWeekly = player.Special ? weekly * 0.1 : 0;
  player.WageWizard.specialSeasonly = player.Special
    ? player.WageWizard.specialWeekly * WEEKS
    : 0;
  setPlayerSkills(player);
  setPrimarySkill(player);
  if (
    overridePrimary &&
    player.WageWizard.unpredictable_skills.indexOf(overridePrimary) >= 0
  ) {
    player.WageWizard.primary = overridePrimary;
  }
  applySecondaryDiscounts(player);
  setMinAndMaxSalary(player);
}

function setData(team) {
  let weekly_total = 0;
  let abroad_total = 0;
  let special_total = 0;
  let weekly_without_discount_total = 0;
  for (const player of team.PlayersData) {
    setPlayerData(player);
    weekly_total += player.WageWizard.weekly;
    abroad_total += player.WageWizard.abroadWeekly;
    special_total += player.WageWizard.specialWeekly;
    weekly_without_discount_total += player.WageWizard.weeklyWithoutDiscount;
  }
  team.TeamData = {
    weekly: weekly_total,
    seasonly: weekly_total * 16,
    specialWeekly: special_total,
    specialSeasonly: special_total * 16,
    abroadWeekly: abroad_total,
    abroadSeasonly: abroad_total * 16,
    discount: 1 - weekly_total / weekly_without_discount_total,
  };
  for (const player of team.PlayersData) {
    player.WageWizard.teamPercent = player.WageWizard.weekly / weekly_total;
  }
}

WageWizard.Engine.start = function () {
  for (const team of WageWizard.Teams) {
    setData(team);
  }
  this.result = "OK";
  if (WageWizard.CONFIG.DEBUG) {
    console.log(this.result);
    document
      .getElementById("tabDebugNav")
      .style.removeProperty("display");
  }
  return this.result;
};

WageWizard.Engine.setPlayerData = setPlayerData;
WageWizard.Engine.getRate = getRate;

export { getRate, setPlayerData, getSalaryComponents, getKeeperComponents, getSetPiecesMultipliers, validateSkill, getPlayerBonus, getWageMultiplier };
