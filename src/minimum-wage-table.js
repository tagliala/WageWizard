import minimumWageTable from "./minimum-wage-table.json";

const MINIMUM_WAGE_TABLE = minimumWageTable;
const keeperSkillIndex = MINIMUM_WAGE_TABLE.skills.indexOf("KeeperSkill");

const KEEPER_FORMULA = MINIMUM_WAGE_TABLE.rows.map((row) => row.wages[keeperSkillIndex]);

export { MINIMUM_WAGE_TABLE, KEEPER_FORMULA };
