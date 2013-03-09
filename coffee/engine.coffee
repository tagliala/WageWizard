"use strict"
window.WageWizard = window.WageWizard || {}
WageWizard = window.WageWizard
WageWizard.Engine = WageWizard.Engine || {}

VERSION = 1

WEEKS = 16

# In Swedish Krona
BASE_SALARY = 2500

SKILL_VALIDATION = {
  form: {
    min: 1
    max: 8
  }
  stamina: {
    min: 1
    max: 9
  }
  exp: {
    min: 0
    max: 30
  }
  skill: {
    min: 0
    max: 22
  }
  loyalty: {
    min: 1
    max: 20
  }
}

PR_ENUM_ROLE =
  0 : "GK"
  1 : "CD"
  2 : "CD OFF"
  3 : "CD TW"
  4 : "WB"
  5 : "WB OFF"
  6 : "WB DEF"
  7 : "WB TM"
  8 : "IM"
  9 : "IM OFF"
  10 : "IM DEF"
  11 : "IM TW"
  12 : "WI"
  13 : "WI OFF"
  14 : "WI DEF"
  15 : "WI TM"
  16 : "FW"
  17 : "FW DEF"
  18 : "FW DEF+T"
  19 : "FW TW"

validateSkill = (skill, type) ->
  return 0 unless SKILL_VALIDATION[type]?
  min = SKILL_VALIDATION[type].min
  max = SKILL_VALIDATION[type].max

  parsedSkill = (Number) skill.toString().replace(/,/g, ".")
  if isNaN(parsedSkill) or parsedSkill < min
    min
  else if parsedSkill > max
    max
  else
    parsedSkill

getPlayerBonus = (loyalty, motherClubBonus) ->
  loyalty = 20 if motherClubBonus
  playerBonus = 0
  playerBonus += 0.5  if motherClubBonus
  playerBonus += Math.max(0, loyalty - 1) / 19
  if WageWizard.CONFIG.DEBUG
    tempHTML = "getPlayerBonus(loyalty = <b>#{loyalty}</b>, motherClubBonus = <b>#{motherClubBonus}</b>): <b>#{playerBonus}</b><br/><br/>"
    $("#tabDebug").append tempHTML
  playerBonus

getRate = (age) ->
  age = Math.min(parseInt(age, 10), 37)
  if age >= 29 then 1 - (age - 28) / 10 else 1

getSetPiecesMultipliers = (level) ->
  [1 + 0.0026 * Math.max(0, level - 1), 1 + 0.0026 * Math.max(0, level - 0.01)]

getSalaryComponents = (skill, level) ->
  # Get proper formula
  formula = WageWizard.FORMULAE[skill]

  # Speed up calculations
  return [0, 0] if level < 1

  # Make predictions for both high subskills and low ones
  # NOTE: remember that passable = 5 in engine, so we subtract 1 and 0.01
  salary_component_low = formula.a * Math.pow(level - 1, formula.b)
  salary_component_high = formula.a * Math.pow(level - 0.01, formula.b)

  # Apply High Salary Discount
  salary_component_low = 20000 + (salary_component_low - 20000) * formula.d if salary_component_low > 20000
  salary_component_high = 20000 + (salary_component_high - 20000) * formula.d if salary_component_high > 20000

  # Multiply by 10 because Hattrick returns salaries in Swedish Krona
  [salary_component_low * 10, salary_component_high * 10]

setMinAndMaxSalary = (player) ->
  min = 0
  max = 0

  for k of player.WageWizard.Skills
    min += player.WageWizard.Skills[k].min
    max += player.WageWizard.Skills[k].max

  player.WageWizard.min = BASE_SALARY + min * player.WageWizard.Skills['SetPieces'].min
  player.WageWizard.max = BASE_SALARY + max * player.WageWizard.Skills['SetPieces'].max
  return

applySecondaryDiscounts = (player) ->
  primary = player.WageWizard.primary

  for k, v of WageWizard.MAP_HATTRICK_SKILLS
    continue if k is 'Keeper' or k is 'SetPieces' or k is primary
    formula = WageWizard.FORMULAE[k]
    player.WageWizard.Skills[k].min = player.WageWizard.Skills[k].min * formula.c
    player.WageWizard.Skills[k].max = player.WageWizard.Skills[k].max * formula.c
  return

setPrimarySkill = (player) ->
  player.WageWizard.unpredictable_skills = {}
  min = Infinity
  max = -Infinity
  primary = ''

  for k, v of WageWizard.MAP_HATTRICK_SKILLS
    continue if k is 'Keeper' or k is 'SetPieces'
    if player.WageWizard.Skills[k].min > max
      player.WageWizard.primary = k
      player.WageWizard.unpredictable_skills = {}
      min = player.WageWizard.Skills[k].min
      max = player.WageWizard.Skills[k].max
      primary = k
    else if player.WageWizard.Skills[k].max >= min
      player.WageWizard.unpredictable_skills[primary] = true
      player.WageWizard.unpredictable_skills[k] = true
      primary = ''
  return

setPlayerSkills = (player) ->
  player.WageWizard.Skills = {}
  player.WageWizard.Skills['SetPieces'] = {}
  abroad_multiplier = if player.Abroad then 1.2 else 1

  setPiecesMultipliers = getSetPiecesMultipliers player.SetPiecesSkill
  player.WageWizard.Skills['SetPieces'].min = setPiecesMultipliers[0]
  player.WageWizard.Skills['SetPieces'].max = setPiecesMultipliers[1]

  for k, v of WageWizard.MAP_HATTRICK_SKILLS
    continue if k is 'Keeper' or k is 'SetPieces'
    player.WageWizard.Skills[k] = {}
    salaryComponents = getSalaryComponents k, player[v]
    player.WageWizard.Skills[k].min = salaryComponents[0] * player.WageWizard.rate * abroad_multiplier
    player.WageWizard.Skills[k].max = salaryComponents[1] * player.WageWizard.rate * abroad_multiplier
  return

setPlayerData = (player, overridePrimary = null) ->
  player.WageWizard = {}
  weekly = parseInt player.Salary

  player.WageWizard.rate = getRate player.Age
  player.WageWizard.discount = 1 - player.WageWizard.rate
  player.WageWizard.weekly = weekly
  player.WageWizard.seasonly = weekly * WEEKS
  player.WageWizard.weeklyWithoutDiscount = weekly / player.WageWizard.rate
  player.WageWizard.seasonlyWithoutDiscount = player.WageWizard.weeklyWithoutDiscount * WEEKS
  player.WageWizard.abroadWeekly = if player.Abroad then weekly * 0.2 else 0
  player.WageWizard.abroadSeasonly = if player.Abroad then player.WageWizard.abroadWeekly * WEEKS else 0

  setPlayerSkills player
  setPrimarySkill player
  if overridePrimary && player.WageWizard.unpredictable_skills[overridePrimary]?
    player.WageWizard.primary = overridePrimary
  applySecondaryDiscounts player if player.WageWizard.primary isnt ''
  setMinAndMaxSalary player
  return

setData = ->
  weekly_total = 0
  abroad_total = 0
  weekly_without_discount_total = 0

  # Set Player attributes
  for player in WageWizard.PlayersData
    setPlayerData player
    weekly_total += player.WageWizard.weekly
    abroad_total += player.WageWizard.abroadWeekly
    weekly_without_discount_total += player.WageWizard.weeklyWithoutDiscount

  # Set Team attributes
  WageWizard.TeamData =
    weekly: weekly_total
    seasonly: weekly_total * 16
    abroadWeekly: abroad_total
    abroadSeasonly: abroad_total * 16
    discount: 1 - weekly_total / weekly_without_discount_total

  # Cycling again on players to set percent
  for player in WageWizard.PlayersData
    player.WageWizard.teamPercent = player.WageWizard.weekly / weekly_total

WageWizard.Engine.start = ->
  setData()
 
  if WageWizard.isChartsEnabled()
    ###
    plotDataTotal = []
    plotDataPartial = []
    plotDataTotal[0] = []
    plotDataPartial[0] = []
    plotDataPartial[1] = []
    plotIndex = 0
    for minute in [KICKOFF...FULLTIME] when minute isnt HALFTIME
      plotDataTotal[0][plotIndex] = [minute, totalContributionArray[minute]]
      plotDataPartial[0][plotIndex] = [minute, player1AVGArray[minute] * player1StrengthStaminaIndependent]
      plotDataPartial[1][plotIndex] = [minute, player2AVGArray[minute] * player2StrengthStaminaIndependent]
      ++plotIndex;
    @result.plotDataTotal = plotDataTotal
    @result.plotDataPartial = plotDataPartial
    ###

  @result = 'OK'

  if WageWizard.CONFIG.DEBUG
    console.log @result
    $("#tabDebugNav").show()
    #$("#tabDebugNav").find("a").tab "show"

  @result

WageWizard.Engine.setPlayerData = setPlayerData
WageWizard.Engine.getRate = getRate
