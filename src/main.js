import WageWizard from "./wagewizard.js";
import "./formulae.js";
import "./league_details.js";
import { MINIMUM_WAGE_TABLE } from "./minimum-wage-table.js";

WageWizard.CONFIG = WageWizard.CONFIG || {};

Object.assign(WageWizard.CONFIG, {
  FORM_ID: "#formPlayersInfo",
  OPTION_FORM_ID: "#optionForm",
  TABLE_ID: "#playersInfoTable",
  SEASON_WEEKS: 16,
  DEBUG: false,
});

const MAP_HATTRICK_SKILLS = {
  Keeper: "KeeperSkill",
  Defending: "DefenderSkill",
  Playmaking: "PlaymakerSkill",
  Passing: "PassingSkill",
  Winger: "WingerSkill",
  Scoring: "ScorerSkill",
  SetPieces: "SetPiecesSkill",
};

const FORM_ID = WageWizard.CONFIG.FORM_ID;
const OPTION_FORM_ID = WageWizard.CONFIG.OPTION_FORM_ID;
const TABLE_ID = WageWizard.CONFIG.TABLE_ID;
const DEBUG = WageWizard.CONFIG.DEBUG;

// -- Utility functions --

function format(source, ...params) {
  if (params.length === 0) {
    return (...args) => format(source, ...args);
  }
  let result = source;
  const args = params.length === 1 && Array.isArray(params[0]) ? params[0] : params;
  for (let i = 0; i < args.length; i++) {
    result = result.replace(new RegExp("\\{" + i + "\\}", "g"), args[i]);
  }
  return result;
}

function number_format(number, decimals, dec_point, thousands_sep) {
  if (number == null) number = "";
  if (decimals == null) decimals = 0;
  if (dec_point == null) dec_point = ".";
  if (thousands_sep == null) thousands_sep = ",";
  number = String(number).replace(/[^0-9+\-Ee.]/g, "");
  const n = Number.isFinite(+number) ? +number : 0;
  const prec = Number.isFinite(+decimals) ? Math.abs(decimals) : 0;
  const toFixedFix = (n, prec) => {
    const k = Math.pow(10, prec);
    return "" + Math.round(n * k) / k;
  };
  const s = (prec ? toFixedFix(n, prec) : "" + Math.round(n)).split(".");
  if (s[0].length > 3) {
    s[0] = s[0].replace(/\B(?=(?:\d{3})+(?!\d))/g, thousands_sep);
  }
  if ((s[1] || "").length < prec) {
    s[1] = s[1] || "";
    s[1] += new Array(prec - s[1].length + 1).join("0");
  }
  return s.join(dec_point);
}

function gup(name) {
  const escapedName = name.replace(/[[\]]/g, "\\$&");
  const regex = new RegExp("[\\?&]" + escapedName + "=([^&#]*)");
  const results = regex.exec(window.location.search);
  if (results != null) {
    return results[1];
  }
}

function scrollUpToResults() {
  const elem = document.querySelector(".nav-tabs");
  if (!elem) return;
  const docViewTop = window.scrollY;
  const elemTop = elem.getBoundingClientRect().top + docViewTop;
  if (docViewTop > elemTop) {
    window.scrollTo({ top: elemTop, behavior: "smooth" });
  }
}

function createAlert(params) {
  return `<div class="alert alert-${params.type} alert-dismissible fade show" id="${params.id}">
  <button class="btn-close" data-bs-dismiss="alert" type="button" aria-label="Close"></button>
  <h4 class="alert-heading">${params.title}</h4>
  <p id="${params.id}Body">${params.body}</p>
</div>`;
}

// -- Options --

function isChartsEnabled() {
  const el = document.getElementById("WageWizard_Options_Charts");
  return el ? el.checked : false;
}

function isVerboseModeEnabled() {
  const el = document.getElementById("WageWizard_Options_VerboseMode");
  return el ? el.checked : false;
}

// -- CHPP mode toggle --

function enableCHPPMode() {
  for (const el of document.querySelectorAll("#tabTeamsNav, #WageWizard_CHPP")) {
    el.classList.remove("d-none");
  }
}

function disableCHPPMode() {
  for (const el of document.querySelectorAll("#tabTeamsNav, #WageWizard_CHPP")) {
    el.classList.add("d-none");
  }
}

function resetAndHideTabs() {
  for (const id of ["tabChartsNav", "tabContributionsNav", "tabDebugNav"]) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }
  for (const id of ["chartTotal", "chartPartials", "tabContributions", "tabDebug"]) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  }
}

// -- Login menu --

function loginMenuHide() {
  const login = document.getElementById("loginDropdown");
  if (login) login.classList.add("d-none");
  const loggedIn = document.getElementById("loggedInDropdown");
  if (loggedIn) loggedIn.classList.remove("d-none");
}

function loginMenuShow() {
  const title = document.getElementById("menuLoginTitle");
  if (title) title.textContent = "CHPP";
  const loggedIn = document.getElementById("loggedInDropdown");
  if (loggedIn) loggedIn.classList.add("d-none");
  const login = document.getElementById("loginDropdown");
  if (login) login.classList.remove("d-none");
}

// -- Form serialization / deserialization --

function fillForm() {
  const paramsString = gup("params");
  if (paramsString == null) return;
  const params = decodeURI(paramsString).split("-");
  const fields = document.querySelectorAll("*[name^=WageWizard_]");
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    const type = field.getAttribute("type");
    if (type === "checkbox" || type === "radio") {
      field.checked = params[i] === "true";
    } else {
      field.value = params[i];
    }
  }
  const leagueSelect = document.getElementById("WageWizard_League");
  if (leagueSelect) {
    const details = WageWizard.LEAGUE_DETAILS[leagueSelect.value];
    if (details) WageWizard.LeagueDetails = details;
  }
}

function formSerialize() {
  const serializedFields = [];
  for (const el of document.querySelectorAll('*[name^="WageWizard_"]')) {
    const type = el.getAttribute("type");
    if (type === "checkbox" || type === "radio") {
      serializedFields.push(el.checked);
    } else {
      serializedFields.push(el.value);
    }
  }
  return encodeURI(serializedFields.join("-"));
}

// -- Wage display helpers --

function getWageInUserCurrency(salary) {
  return salary / Number.parseFloat(WageWizard.LeagueDetails.Country.CurrencyRate.replace(",", "."), 10);
}

function salaryToString(salary) {
  return number_format(getWageInUserCurrency(salary), 0, "", " ") + " " + WageWizard.LeagueDetails.Country.CurrencyName;
}

function minimumWageToString(wage) {
  if (wage == null) return "";
  return salaryToString(wage * 10);
}

function rateToString(rate, precision) {
  if (precision == null) precision = 0;
  return number_format(rate * 100, 2) + "%";
}

function colorizePercent(element) {
  const value = Number.parseFloat(element.textContent);
  if (Number.isNaN(value)) return;
  const direction = element.dataset.direction;
  const hue = direction === "asc" ? ((121 - value) * 121) / 100 : (value * 121) / 100;
  element.style.color = `hsl(${hue}, 45%, 50%)`;
}

function fillDataField(element, target) {
  switch (element.dataset.type) {
    case "salary":
      element.textContent = salaryToString(target);
      break;
    case "percent":
      element.textContent = rateToString(target, 2);
      break;
  }
}

function renderMinimumWageTable() {
  const table = document.getElementById("minimumWageTable");
  if (!table || WageWizard.LeagueDetails?.Country == null) return;
  const labels = WageWizard.MinimumWageTableLabels;
  if (labels == null) return;

  const thead = table.tHead ?? table.createTHead();
  const tbody = table.tBodies[0] ?? table.createTBody();
  thead.textContent = "";
  tbody.textContent = "";

  const headerRow = document.createElement("tr");
  const skillLevelHeader = document.createElement("th");
  skillLevelHeader.textContent = labels.skillLevel;
  headerRow.appendChild(skillLevelHeader);

  for (const skill of MINIMUM_WAGE_TABLE.skills) {
    const skillHeader = document.createElement("th");
    skillHeader.textContent = labels.skills?.[skill] ?? skill;
    headerRow.appendChild(skillHeader);
  }
  thead.appendChild(headerRow);

  const fragment = document.createDocumentFragment();
  for (const row of MINIMUM_WAGE_TABLE.rows) {
    const tr = document.createElement("tr");
    const rowHeader = document.createElement("th");
    rowHeader.scope = "row";
    const levelLabel = labels.levels?.[row.level] ?? String(row.level);
    rowHeader.textContent = `${levelLabel} (${row.level})`;
    tr.appendChild(rowHeader);

    for (const wage of row.wages) {
      const cell = document.createElement("td");
      cell.className = "wage-cell";
      cell.textContent = minimumWageToString(wage);
      tr.appendChild(cell);
    }

    fragment.appendChild(tr);
  }

  tbody.appendChild(fragment);
}

// -- Table updates --

function fillTeamWageTables() {
  const container = document.getElementById("WageWizard_Teams");
  if (!container) return;
  const template = document.getElementById("team-table-template");
  if (!template) return;
  container.innerHTML = "";
  for (let index = 0; index < WageWizard.Teams.length; index++) {
    const team = WageWizard.Teams[index];
    const col = document.createElement("div");
    col.className = "col-md-6 col-lg-4";
    const clone = template.content.cloneNode(true);
    const nameCell = clone.querySelector(".team-name-cell");
    if (nameCell) nameCell.textContent = team.TeamName;
    for (const el of clone.querySelectorAll("[data-target]")) {
      fillDataField(el, team.TeamData[el.dataset.target]);
      if (el.dataset.colorize !== undefined) colorizePercent(el);
    }
    col.appendChild(clone);
    container.appendChild(col);
  }
}

function setPlayerWageTable(player, id) {
  for (const el of document.querySelectorAll(`#WageWizard_Player_${id} [data-target]`)) {
    fillDataField(el, player.WageWizard[el.dataset.target]);
  }
}

function setDescriptionFields(player, id) {
  const prefix = `WageWizard_Description_Player_${id}`;
  const avatarEl = document.getElementById(`${prefix}_Avatar`);
  if (avatarEl) avatarEl.innerHTML = player.Avatar;
  const nameEl = document.getElementById(`${prefix}_Name`);
  if (nameEl) nameEl.textContent = `${player.PlayerNumber != null ? `${player.PlayerNumber}. ` : ""}${player.PlayerName}`;
  const ageEl = document.getElementById(`${prefix}_Age`);
  if (ageEl) ageEl.textContent = WageWizard.messages.age(player.Age, player.Days);
  const bdayEl = document.getElementById(`${prefix}_NextBirthday`);
  if (bdayEl) bdayEl.textContent = player.NextBirthday;
  const tsiEl = document.getElementById(`${prefix}_Tsi`);
  if (tsiEl) tsiEl.textContent = number_format(player.Tsi, 0, "", " ");

  const stmtEl = document.getElementById(`${prefix}_Statement`);
  if (stmtEl) {
    if (player.Statement) {
      stmtEl.textContent = player.Statement;
      stmtEl.style.removeProperty("display");
    } else {
      stmtEl.textContent = "";
      stmtEl.style.display = "none";
    }
  }

  const specialtyEl = document.getElementById(`${prefix}_Specialty`);
  if (specialtyEl) specialtyEl.classList.toggle("d-none", !player.Special);

  const salaryEl = document.getElementById(`${prefix}_Salary`);
  if (salaryEl) {
    if (player.Abroad) {
      salaryEl.innerHTML = WageWizard.messages.salary_with_bonus(salaryToString(player.Salary), salaryToString(player.Salary / 1.2));
    } else {
      salaryEl.textContent = WageWizard.messages.salary(salaryToString(player.Salary));
    }
  }

  const descEl = document.getElementById(prefix);
  if (descEl) descEl.classList.remove("d-none");
}

function setTableFields(player, id) {
  const table = document.getElementById("playersInfoTable");
  if (!table) return;
  for (const tr of table.querySelectorAll("tr")) {
    tr.classList.remove("table-success", "table-warning");
  }
  for (const input of table.querySelectorAll(".btn-radio input")) {
    input.disabled = true;
    input.closest("label")?.classList.add("d-none");
  }

  const salaryInput = document.getElementById(`WageWizard_Player_${id}_Salary`);
  if (salaryInput) salaryInput.value = player.Salary;
  const ageSelect = document.getElementById(`WageWizard_Player_${id}_Age`);
  if (ageSelect) ageSelect.value = player.Age;
  const specialCheckbox = document.getElementById(`WageWizard_Player_${id}_Special`);
  if (specialCheckbox) specialCheckbox.checked = player.Special;
  const abroadCheckbox = document.getElementById(`WageWizard_Player_${id}_Abroad`);
  if (abroadCheckbox) abroadCheckbox.checked = player.Abroad;
  const baseMinEl = document.getElementById(`WageWizard_Player_Min_${id}_BaseSalary`);
  if (baseMinEl) baseMinEl.textContent = salaryToString(player.WageWizard.baseSalary);
  const baseMaxEl = document.getElementById(`WageWizard_Player_Max_${id}_BaseSalary`);
  if (baseMaxEl) baseMaxEl.textContent = salaryToString(player.WageWizard.baseSalary);

  for (const skill of WageWizard.HATTRICK_SKILLS) {
    if (skill === "SetPiecesSkill") continue;
    const skillSelect = document.getElementById(`WageWizard_Player_${id}_${skill}`);
    if (skillSelect) skillSelect.value = player[skill];
    const minEl = document.getElementById(`WageWizard_Player_Min_${id}_${skill}`);
    if (minEl) minEl.textContent = salaryToString(player.WageWizard.Skills[skill].min);
    const maxEl = document.getElementById(`WageWizard_Player_Max_${id}_${skill}`);
    if (maxEl) maxEl.textContent = salaryToString(player.WageWizard.Skills[skill].max);

    const radioEl = document.getElementById(`WageWizard_Primary_Player_${id}_${skill}`);
    if (skill === player.WageWizard.primary && radioEl) {
      radioEl.closest("label")?.classList.remove("d-none");
      radioEl.checked = true;
      const row = radioEl.closest("tr");
      if (row) {
        row.classList.add(player.WageWizard.unpredictable_skills.length === 0 ? "table-success" : "table-warning");
      }
    }
  }

  for (const unpredictable_skill of player.WageWizard.unpredictable_skills) {
    const radio = document.getElementById(`WageWizard_Primary_Player_${id}_${unpredictable_skill}`);
    if (radio) {
      radio.closest("label")?.classList.remove("d-none");
      radio.disabled = false;
      radio.closest("tr")?.classList.add("table-warning");
    }
  }

  const spMinEl = document.getElementById(`WageWizard_Player_Min_${id}_SetPiecesSkill`);
  if (spMinEl) spMinEl.textContent = rateToString(player.WageWizard.Skills.SetPiecesSkill.min);
  const spMaxEl = document.getElementById(`WageWizard_Player_Max_${id}_SetPiecesSkill`);
  if (spMaxEl) spMaxEl.textContent = rateToString(player.WageWizard.Skills.SetPiecesSkill.max);
  const spSelect = document.getElementById(`WageWizard_Player_${id}_SetPiecesSkill`);
  if (spSelect) spSelect.value = player.SetPiecesSkill;
  const totalMinEl = document.getElementById(`WageWizard_Player_${id}_Min`);
  if (totalMinEl) totalMinEl.textContent = salaryToString(player.WageWizard.min);
  const totalMaxEl = document.getElementById(`WageWizard_Player_${id}_Max`);
  if (totalMaxEl) totalMaxEl.textContent = salaryToString(player.WageWizard.max);
}

// -- CHPP player handling --

function sort_by(field, reverse, primer) {
  const rev = reverse ? -1 : 1;
  return (a, b) => {
    let aVal = field.indexOf("WW-") === 0 ? a.WageWizard[field.substring(3)] : a[field];
    let bVal = field.indexOf("WW-") === 0 ? b.WageWizard[field.substring(3)] : b[field];
    if (primer != null) {
      aVal = primer(aVal);
      bVal = primer(bVal);
      if (Number.isNaN(aVal)) aVal = Infinity;
      if (Number.isNaN(bVal)) bVal = Infinity;
    }
    if (aVal < bVal) return rev * -1;
    if (aVal > bVal) return rev * 1;
    return 0;
  };
}

function sortCHPPPlayerFields() {
  const teamSelect = document.getElementById("CHPP_Team");
  const Team = WageWizard.Teams[teamSelect?.value];
  const titleEl = document.getElementById("menuLoginTitle");
  if (titleEl) titleEl.textContent = Team.TeamName;
  const PlayersData = Team.PlayersData;
  if (PlayersData == null) return;
  const sortSelect = document.getElementById("CHPP_Players_SortBy");
  const field = sortSelect?.value;
  let reverse = true;
  let primer = Number.parseInt;
  switch (field) {
    case "PlayerNumber":
      reverse = false;
      break;
    case "PlayerName":
      reverse = false;
      primer = undefined;
      break;
  }
  PlayersData.sort(sort_by(field, reverse, primer));
}

function updateCHPPPlayerFields() {
  const teamSelect = document.getElementById("CHPP_Team");
  const Team = WageWizard.Teams[teamSelect?.value];
  const titleEl = document.getElementById("menuLoginTitle");
  if (titleEl) titleEl.textContent = Team.TeamName;
  const leagueSelect = document.getElementById("WageWizard_League");
  if (leagueSelect && Team.LeagueID) {
    leagueSelect.value = Team.LeagueID;
    WageWizard.LeagueDetails = WageWizard.LEAGUE_DETAILS[Team.LeagueID];
    renderMinimumWageTable();
  }
  const PlayersData = Team.PlayersData;
  if (PlayersData == null) return;
  sortCHPPPlayerFields();
  const selectP1 = document.getElementById("CHPP_Player_1");
  if (!selectP1) return;
  selectP1.innerHTML = "";
  for (let index = 0; index < PlayersData.length; index++) {
    const player = PlayersData[index];
    const opt = document.createElement("option");
    if (Number(player.InjuryLevel) === 0) opt.classList.add("isBruised");
    if (Number(player.InjuryLevel) > 0) opt.classList.add("isInjured");
    if (Number(player.Cards) >= 3) opt.classList.add("isSuspended");
    if (player.TransferListed) opt.classList.add("isTransferListed");
    opt.value = index;
    const number = player.PlayerNumber != null ? player.PlayerNumber + "." : "";
    const mc = player.MotherClubBonus ? "\u2665" : "";
    const star = player.Special ? "\u2605" : "";
    opt.textContent = `${number} ${player.PlayerName} ${mc}${star}`;
    selectP1.appendChild(opt);
  }
  fillTeamWageTables();
}

function setupCHPPPlayerFields(checkUrlParameter) {
  if (checkUrlParameter == null) checkUrlParameter = false;
  const Teams = WageWizard.Teams;
  if (Teams == null || Teams.length === 0) return;
  const teamSelect = document.getElementById("CHPP_Team");
  if (!teamSelect) return;
  teamSelect.innerHTML = "";
  for (let index = 0; index < Teams.length; index++) {
    const team = Teams[index];
    const opt = document.createElement("option");
    opt.value = index;
    opt.textContent = team.TeamName;
    teamSelect.appendChild(opt);
  }
  if (Teams.length > 1) {
    teamSelect.closest("form")?.classList.remove("d-none");
  }
  updateCHPPPlayerFields();
  const firstOption = document.querySelector("#CHPP_Player_1 option");
  if (firstOption) firstOption.selected = true;
  setPlayerFormFields(1, checkUrlParameter);
}

function setPlayerFormFields(id, checkUrlParameter) {
  if (checkUrlParameter == null) checkUrlParameter = false;
  if (checkUrlParameter && gup("params") != null) {
    fillForm();
    refreshTable(1);
    return;
  }
  const teamSelect = document.getElementById("CHPP_Team");
  const Team = WageWizard.Teams[teamSelect?.value];
  const titleEl = document.getElementById("menuLoginTitle");
  if (titleEl) titleEl.textContent = Team.TeamName;
  const PlayersData = Team.PlayersData;
  if (PlayersData == null) return;
  const form = document.querySelector(FORM_ID);
  const playerSelect = form?.querySelector(`#CHPP_Player_${id}`);
  if (!playerSelect) return;
  const player = PlayersData[playerSelect.value];
  if (player == null) return;
  setDescriptionFields(player, id);
  setPlayerWageTable(player, id);
  setTableFields(player, id);
}

// -- Country dropbox --

function createCountryDropbox() {
  const leagueArray = [];
  for (const k in WageWizard.LEAGUE_DETAILS) {
    leagueArray.push({ id: k, name: WageWizard.LEAGUE_DETAILS[k].Country.CountryName });
  }
  leagueArray.sort(sort_by("name", false));
  const leagueSelect = document.getElementById("WageWizard_League");
  if (!leagueSelect) return;
  const leagueId = leagueSelect.dataset.league?.toString();
  leagueSelect.innerHTML = leagueArray.map(
    (l) => `<option value='${l.id}'${l.id === leagueId ? " selected" : ""}>${l.name}</option>`
  ).join("");
  WageWizard.LeagueDetails = WageWizard.LEAGUE_DETAILS[leagueId];
  renderMinimumWageTable();
}

// -- Player from form --

function createPlayerFromForm(id) {
  const player = {
    Age: document.getElementById(`WageWizard_Player_${id}_Age`)?.value,
    Special: document.getElementById(`WageWizard_Player_${id}_Special`)?.checked,
    Abroad: document.getElementById(`WageWizard_Player_${id}_Abroad`)?.checked,
    Salary: document.getElementById(`WageWizard_Player_${id}_Salary`)?.value,
  };
  for (const skill of WageWizard.HATTRICK_SKILLS) {
    player[skill] = document.getElementById(`WageWizard_Player_${id}_${skill}`)?.value;
  }
  const checkedRadio = document.querySelector(`input[name=WageWizard_Primary_Player_${id}]:checked`);
  WageWizard.Engine.setPlayerData(player, checkedRadio?.value);
  return player;
}

function refreshTable(id) {
  const player = createPlayerFromForm(id);
  setPlayerWageTable(player, id);
  setTableFields(player, id);
}

// -- Discounted salary --

function setDiscountedSalary() {
  const input = Number(document.getElementById("ageDiscountCalculationSalary")?.value.replace(/[^\d]/g, ""));
  if (input < 250) {
    const output = document.getElementById("ageDiscountCalculationDiscountedSalary");
    if (output) output.value = "";
    return;
  }
  const rate = WageWizard.Engine.getRate(document.getElementById("ageDiscountCalculation")?.value);
  const output = document.getElementById("ageDiscountCalculationDiscountedSalary");
  if (output) output.value = number_format((input - 250) * rate + 250, 0, "", " ");
}

// -- CHPP AJAX --

function fetchCHPPData(url, useCache) {
  const statusBtn = document.getElementById("CHPP_Refresh_Data_Status");
  const refreshBtn = document.getElementById("CHPP_Refresh_Data");
  const resultsEl = document.getElementById("CHPP_Results");
  const descEl = document.getElementById("CHPP_Status_Description");

  // beforeSend
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.textContent = refreshBtn.dataset.loadingText || "Loading...";
  }
  if (statusBtn) {
    const icon = statusBtn.querySelector(".ww");
    if (icon) icon.innerHTML = WageWizard.icons.clock;
    statusBtn.disabled = true;
    statusBtn.classList.remove("btn-danger", "btn-success", "btn-warning");
    statusBtn.classList.add("btn-secondary");
  }
  if (resultsEl) resultsEl.classList.add("d-none");
  if (descEl) descEl.innerHTML = "";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  fetch(url, { signal: controller.signal, cache: useCache ? "default" : "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((jsonObject) => {
      clearTimeout(timeoutId);
      switch (jsonObject.Status) {
        case "OK":
          try {
            WageWizard.Teams = jsonObject.Teams;
            WageWizard.LeagueDetails = WageWizard.LEAGUE_DETAILS[jsonObject.LeagueID];
            WageWizard.Engine.start();
            createCountryDropbox();
            setupCHPPPlayerFields(true);
            loginMenuHide();
            enableCHPPMode();
            if (jsonObject.RefreshThrottle) {
              if (statusBtn) {
                const icon = statusBtn.querySelector(".ww");
                if (icon) icon.innerHTML = WageWizard.icons["triangle-exclamation"];
                statusBtn.title = WageWizard.messages.status_warning;
                statusBtn.classList.remove("btn-secondary", "btn-danger", "btn-success");
                statusBtn.classList.add("btn-warning");
              }
              if (descEl) descEl.textContent = WageWizard.messages.refresh_throttle(jsonObject.RefreshThrottle);
            } else {
              if (statusBtn) {
                const icon = statusBtn.querySelector(".ww");
                if (icon) icon.innerHTML = WageWizard.icons.check;
                statusBtn.title = WageWizard.messages.status_ok;
                statusBtn.classList.remove("btn-secondary", "btn-danger", "btn-warning");
                statusBtn.classList.add("btn-success");
              }
            }
            if (refreshBtn) refreshBtn.textContent = refreshBtn.dataset.successText || "Refresh data";
          } catch (error) {
            if (WageWizard.CONFIG.DEBUG) {
              console.log(error);
              console.log(error.stack);
            }
            if (statusBtn) {
              const icon = statusBtn.querySelector(".ww");
              if (icon) icon.innerHTML = WageWizard.icons.xmark;
              statusBtn.title = WageWizard.messages.status_error;
              statusBtn.classList.remove("btn-secondary", "btn-success", "btn-warning");
              statusBtn.classList.add("btn-danger");
            }
            loginMenuShow();
            if (refreshBtn) refreshBtn.textContent = refreshBtn.dataset.errorText || "Error";
            if (descEl) descEl.innerHTML = `${WageWizard.messages.error_unknown}.<br/>\n${WageWizard.messages.retry_to_authorize}.`;
          }
          break;
        case "Error": {
          let error_message;
          let description_message;
          switch (jsonObject.ErrorCode) {
            case "InvalidToken":
              error_message = WageWizard.messages.error_invalid_token;
              description_message = WageWizard.messages.retry_to_authorize;
              break;
            default:
              error_message = WageWizard.messages.error_unknown;
              description_message = WageWizard.messages.retry_to_authorize;
          }
          if (statusBtn) {
            const icon = statusBtn.querySelector(".ww");
            if (icon) icon.innerHTML = WageWizard.icons.xmark;
            statusBtn.title = WageWizard.messages.status_error;
            statusBtn.classList.remove("btn-secondary", "btn-success", "btn-warning");
            statusBtn.classList.add("btn-danger");
          }
          if (descEl) descEl.innerHTML = `${error_message}<br/>\n${description_message}`;
          loginMenuShow();
          if (refreshBtn) refreshBtn.textContent = refreshBtn.dataset.errorText || "Error";
          break;
        }
      }
      if (statusBtn) statusBtn.disabled = false;
      if (resultsEl) resultsEl.classList.remove("d-none");
      if (refreshBtn) refreshBtn.disabled = false;
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      let error_message;
      let description_message;
      if (err.name === "AbortError") {
        error_message = WageWizard.messages.error_timeout;
        description_message = "";
      } else {
        error_message = WageWizard.messages.error_unknown;
        description_message = WageWizard.messages.retry_to_authorize;
      }
      if (statusBtn) {
        const icon = statusBtn.querySelector(".ww");
        if (icon) icon.innerHTML = WageWizard.icons.xmark;
        statusBtn.title = WageWizard.messages.status_error;
        statusBtn.classList.remove("btn-success", "btn-warning");
        statusBtn.classList.add("btn-danger");
        statusBtn.disabled = false;
      }
      if (descEl) descEl.innerHTML = `${error_message}<br/>\n${description_message}`;
      loginMenuShow();
      if (refreshBtn) {
        refreshBtn.textContent = refreshBtn.dataset.errorText || "Error";
        refreshBtn.disabled = false;
      }
      if (resultsEl) resultsEl.classList.remove("d-none");
    });
}

// -- Iframe check --

function checkIframe() {
  if (top.location !== self.location) {
    top.location = self.location;
  }
}

// -- Exports --

WageWizard.format = format;
WageWizard.number_format = number_format;
WageWizard.isChartsEnabled = isChartsEnabled;
WageWizard.isVerboseModeEnabled = isVerboseModeEnabled;

// -- Theme toggle --

const syncThemeIcon = () => {
  const isDark = document.documentElement.getAttribute("data-bs-theme") === "dark";
  document.documentElement.classList.toggle("dark-mode", isDark);
};
syncThemeIcon();

document.getElementById("themeToggle").addEventListener("click", () => {
  const current = document.documentElement.getAttribute("data-bs-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-bs-theme", next);
  document.cookie = "theme=" + next + ";path=/;max-age=31536000;SameSite=Lax";
  syncThemeIcon();
});

// -- DOM Ready --

document.addEventListener("DOMContentLoaded", () => {
  checkIframe();

  // Get Link button
  const getLinkBtn = document.getElementById("getLink");
  if (getLinkBtn) {
    getLinkBtn.addEventListener("click", () => {
      let link = document.location.href.split("?")[0];
      const locale = gup("locale");
      if (locale != null) {
        link += "?locale=" + locale + "&";
      } else {
        link += "?";
      }
      link += "params=" + formSerialize();
      const copyButton = `<button class="btn btn-sm btn-secondary" id="copyLinkToClipboard" type="button" data-bs-toggle="tooltip" data-bs-title="${WageWizard.messages.copy_to_clipboard}">${WageWizard.icons.clipboard}</button>`;
      const bodyEl = document.getElementById("generatedLinkBody");
      if (bodyEl) {
        bodyEl.textContent = link;
      } else {
        const container = document.getElementById("AlertsContainer");
        if (container) {
          container.insertAdjacentHTML("beforeend", createAlert({
            id: "generatedLink",
            type: "info",
            body: link.replace(/&/g, "&amp;"),
            title: WageWizard.messages.copy_link + " " + copyButton,
          }));
        }
      }
      const copyBtn = document.getElementById("copyLinkToClipboard");
      if (copyBtn) {
        if (!bootstrap.Tooltip.getInstance(copyBtn)) new bootstrap.Tooltip(copyBtn);
        copyBtn.onclick = () => {
          WageWizard.copyToClipboard(link, copyBtn);
        };
      }
      scrollUpToResults();
    });
  }

  // League change
  const leagueSelect = document.getElementById("WageWizard_League");
  if (leagueSelect) {
    leagueSelect.addEventListener("change", () => {
      WageWizard.LeagueDetails = WageWizard.LEAGUE_DETAILS[leagueSelect.value];
      renderMinimumWageTable();
    });
  }

  // Refresh table on change
  for (const el of document.querySelectorAll(".refresh-table")) {
    el.addEventListener("change", () => refreshTable(el.dataset.id));
  }

  // Age discount calculation
  const ageDiscountCalc = document.getElementById("ageDiscountCalculation");
  if (ageDiscountCalc) {
    ageDiscountCalc.addEventListener("change", () => {
      const target = document.getElementById("ageDiscountCalculationTarget");
      if (target) target.textContent = number_format(100 - WageWizard.Engine.getRate(ageDiscountCalc.value) * 100, 0);
      setDiscountedSalary();
    });
  }

  const ageDiscountSalary = document.getElementById("ageDiscountCalculationSalary");
  if (ageDiscountSalary) {
    ageDiscountSalary.addEventListener("keyup", setDiscountedSalary);
  }

  // Extra link in help modal
  const extraLink = document.getElementById("extraLink");
  if (extraLink) {
    extraLink.addEventListener("click", (e) => {
      e.preventDefault();
      const tabEl = document.querySelector("#tabExtraNav a");
      if (tabEl) new bootstrap.Tab(tabEl).show();
      const modal = document.getElementById("helpModal");
      if (modal) bootstrap.Modal.getInstance(modal)?.hide();
    });
  }

  // CHPP player select
  for (const select of document.querySelectorAll("select[id^=CHPP_Player_]")) {
    select.addEventListener("change", () => {
      setPlayerFormFields(select.dataset.id);
    });
  }

  // CHPP sort & team change
  for (const el of document.querySelectorAll("#CHPP_Players_SortBy, #CHPP_Team")) {
    el.addEventListener("change", () => {
      updateCHPPPlayerFields();
      const firstOption = document.querySelector("#CHPP_Player_1 option");
      if (firstOption) {
        firstOption.selected = true;
        setPlayerFormFields(1);
      }
    });
  }

  // CHPP Refresh Data
  const chppRefreshBtn = document.getElementById("CHPP_Refresh_Data");
  if (chppRefreshBtn) {
    chppRefreshBtn.addEventListener("click", () => {
      fetchCHPPData("chpp/chpp_retrievedata.php?refresh", false);
    });
  }

  // CHPP Revoke Auth
  const revokeLink = document.getElementById("CHPP_Revoke_Auth_Link");
  if (revokeLink) {
    revokeLink.addEventListener("click", (e) => {
      if (!window.confirm(WageWizard.messages.revoke_auth_confirm)) {
        e.preventDefault();
      }
    });
  }

  // Colorize percent on mutation
  for (const el of document.querySelectorAll("[data-colorize]")) {
    const observer = new MutationObserver(() => colorizePercent(el));
    observer.observe(el, { childList: true, characterData: true, subtree: true });
  }

  // Tab shown event — hide alerts on credits
  document.addEventListener("shown.bs.tab", (e) => {
    const container = document.getElementById("AlertsContainer");
    if (!container) return;
    const href = e.target.getAttribute("href") || e.target.dataset.bsTarget;
    container.style.display = href === "#tabCredits" ? "none" : "";
  });

  // Prevent dropdown close when clicking form inside
  for (const form of document.querySelectorAll(".dropdown-menu form")) {
    form.addEventListener("click", (e) => e.stopPropagation());
  }

  // Init
  if (document.startAjax) {
    fetchCHPPData("chpp/chpp_retrievedata.php", true);
  } else {
    createCountryDropbox();
    if (gup("params") != null) {
      fillForm();
    }
    for (const el of document.querySelectorAll(".wagewizard-league")) {
      el.classList.remove("d-none");
    }
    refreshTable(1);
  }
});

export { format, number_format, gup, createAlert };
