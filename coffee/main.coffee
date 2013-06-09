"use strict"
window.WageWizard = window.WageWizard || {}
WageWizard = window.WageWizard
WageWizard.CONFIG = WageWizard.CONFIG || {}
$.extend WageWizard.CONFIG,
  FORM_ID: "#formPlayersInfo"
  OPTION_FORM_ID: "#optionForm"
  TABLE_ID: "#playersInfoTable"
  SEASON_WEEKS: 16
  DEBUG: true
  AUTOSTART: true
  MAP_HATTRICK_SKILLS =
    Keeper: 'KeeperSkill'
    Defending: 'DefenderSkill'
    Playmaking: 'PlaymakerSkill'
    Passing: 'PassingSkill'
    Winger: 'WingerSkill'
    Scoring: 'ScorerSkill'
    SetPieces: 'SetPiecesSkill'
  PR_ENUM_SKILL:
    Keeper: 0
    Defending: 1
    Playmaking: 2
    Winger: 3
    Passing: 4
    Scoring: 5
  PLOT_OPTIONS:
    shadowSize: 0
    lines:
      show: true
      lineWidth: 2
      steps: false
    points:
      show: false
      radius: 3
    xaxis:
      color: "#666666"
      ticks: [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71, 76, 81, 86, 89]
    yaxis:
      color: "#666666"
      tickFormatter: (val, axis) ->
        val.toFixed(2)
    grid:
      backgroundColor: null
      color: null
      borderWidth: 2
      borderColor: "#AAAAAA"
      hoverable: true
      labelMargin: 15
      #markings: [
      #  xaxis:
      #    from: 1
      #    to: 46
      #  color: "#FAF8F1"
      #]

format = (source, params) ->
  if arguments.length is 1
    return ->
      args = $.makeArray(arguments)
      args.unshift source
      format.apply this, args
  params = $.makeArray(arguments).slice(1)  if arguments.length > 2 and params.constructor isnt Array
  params = [ params ]  unless params.constructor is Array
  $.each params, (i, n) ->
    source = source.replace(new RegExp("\\{" + i + "\\}", "g"), n)
    return
  source

resetAndHideTabs = ->
  $("#tabChartsNav").hide()
  $("#tabContributionsNav").hide()
  $("#tabDebugNav").hide()
  $("#chartTotal").html ""
  $("#chartPartials").html ""
  $("#tabContributions").html ""
  $("#tabDebug").html ""

FORM_ID = WageWizard.CONFIG.FORM_ID
OPTION_FORM_ID = WageWizard.CONFIG.OPTION_FORM_ID
TABLE_ID = WageWizard.CONFIG.TABLE_ID
DEBUG = WageWizard.CONFIG.DEBUG
AUTOSTART = WageWizard.CONFIG.AUTOSTART
WageWizard.predictions = WageWizard.CONFIG.PREDICTIONS_HO

checkIframe = ->
  top.location = self.location if top.location isnt self.location

$(FORM_ID).validate({
  ignore: ".ignore"
  errorContainer: "#formErrors"
  errorLabelContainer: "#formErrorsUl"
  errorElement: "li"
  focusInvalid: true
  showErrors: (errorMap, errorList) ->
    if (@numberOfInvalids() == 0)
      $("#formErrors").remove()
    @defaultShowErrors()
    return
  errorPlacement: (error, element) -> null
  invalidHandler: (form, validator) ->
    errors = validator.numberOfInvalids()
    if errors
      message = WageWizard.messages.validation_error if errors == 1
      message = WageWizard.messages.validation_errors(errors) if errors > 1
      $("#formErrors").remove()
      if validator.errorList.length > 0
        $('#AlertsContainer').append createAlert "id": "formErrors", "type": "error", "title" : message, "body": """
          <ul id="formErrorsUl"></ul>
        """
        for error in validator.errorList
          $("#formErrorsUl").append "<li>#{$(error.element).data("fieldName")}: #{error.message}</li>"
      else
        $('#formErrors').dismiss()
      validator.focusInvalid()
      return
  submitHandler: (form) ->
    return

    # Render Charts
    if isChartsEnabled()
      plot_options = $.extend true, {}, WageWizard.CONFIG.PLOT_OPTIONS
      $.extend true, plot_options,
        lines:
          fill: true
          fillColor: "rgba(0,136,204,0.1)"
        points:
          fillColor: "#0088CC"
        yaxis:
          min: (Number) result.min * 0.99
          max: (Number) result.max * 1.01
      document.plot1 = $.plot $('#chartTotal'), [ data: result.plotDataTotal[0], color: "#0088CC" ], plot_options

      dataset = [
        {
          data: result.plotDataPartial[0]
          color: "#BD362F"
          label: WageWizard.messages.p1_contrib
          points:
            fillColor: "#BD362F"
          lines:
            fill: true
            fillColor: "rgba(189,54,47,0.1)"
        }, {
          data: result.plotDataPartial[1]
          color: "#51A351"
          label: WageWizard.messages.p2_contrib
          points:
            fillColor: "#51A351"
          lines:
            fill: true
            fillColor: "rgba(81,163,81,0.10)"
        }
      ]

      plot_options = $.extend true, {}, WageWizard.CONFIG.PLOT_OPTIONS
      $.extend true, plot_options,
        legend:
          position: "se"
          labelBoxBorderColor: "#cccccc"
          margin: [10, 10]
          backgroundColor: "#ffffff"
          backgroundOpacity: 0.5
          borderColor: "#cccccc"
      document.plot2 = $.plot $('#chartPartials'), dataset, plot_options
      $("#tabChartsNav").show()

    # Show the right tab
    if isChartsEnabled()
      $("#tabChartsNav").find("a").tab "show"
      setTimeout ->
        plot_redraw document.plot1
        plot_redraw document.plot2
      , 500
    else if isVerboseModeEnabled()
      $("#tabContributionsNav").find("a").tab "show"

    if WageWizard.CONFIG.DEBUG
      printContributionTable()
      $("#tabDebugNav").show()
      $("#tabDebugNav").find("a").tab "show"

    # Scroll up if needed
    scrollUpToResults()

    # Reset button status
    $("#calculate").removeClass 'disabled'

    return
  highlight: (element, errorClass, validClass) ->
     $(element).closest("div").addClass(errorClass).removeClass(validClass)
     return
  unhighlight: (element, errorClass, validClass) ->
     $(element).closest("div").removeClass(errorClass).addClass(validClass)
     return
})

# GUP
gup = (name) ->
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]")
  regexS = "[\\?&]#{name}=([^&#]*)"
  regex = new RegExp(regexS)
  results = regex.exec(window.location.search)
  results[1] if results?

number_format = (number = "", decimals = 0, dec_point = ".", thousands_sep = ",") ->
  number = ((String) number).replace /[^0-9+\-Ee.]/g, ""
  n = if isFinite(number) then number else 0
  prec = if isFinite(decimals) then Math.abs(decimals) else 0
  s = ""
  toFixedFix = (n, prec) ->
    k = Math.pow(10, prec)
    "" + Math.round(n * k) / k
  s = (if prec then toFixedFix(n, prec) else "" + Math.round(n)).split '.'
  if s[0].length > 3
    s[0] = s[0].replace /\B(?=(?:\d{3})+(?!\d))/g, thousands_sep
  if (s[1] or "").length < prec
    s[1] = s[1] or ""
    s[1] += new Array(prec - s[1].length + 1).join "0"

  s.join dec_point

# Set the view at the right point
scrollUpToResults = ->
  $elem = $(".nav-tabs")
  docViewTop = $(window).scrollTop()
  elemTop = $elem.offset().top
  if docViewTop > elemTop
    $('html, body').animate {scrollTop: elemTop}, 200

# Dynamic Table Stripe
stripeTable = ->
  $("#{TABLE_ID} tr td, #{TABLE_ID} tr th").removeClass "stripe"
  $("#{TABLE_ID} tr:visible:odd td, #{TABLE_ID} tr:visible:odd td").addClass "stripe"

# Create alert
createAlert = (params) ->
  """
  <div class="alert alert-block alert-#{params.type} fade in" id="#{params.id}">
    <button class="close" data-dismiss="alert" type="button">&times;</button>
    <h4 class="alert-heading">#{params.title}</h4>
    <p id="#{params.id}Body">#{params.body}</p>
  </div>
  """

isChartsEnabled = ->
  $("#WageWizard_Options_Charts").prop 'checked'

isVerboseModeEnabled = ->
  $("#WageWizard_Options_VerboseMode").prop 'checked'

enableCHPPMode = ->
  $("#tabTeamNav, #WageWizard_CHPP").show()
  return

disableCHPPMode = ->
  $("#tabTeamNav, #WageWizard_CHPP").hide()
  return

# Fill Form Helper
fillForm = ->
  paramsString = gup("params")
  return unless paramsString?
  params = decodeURI(paramsString).split "-"
  fields = $('*[name^=WageWizard_]')
  for field, i in fields
    $field = $(field)
    switch $field.attr('type')
      when 'checkbox', 'radio' then $field.prop 'checked', (params[i] is 'true')
      else $field.val params[i]
  checkMotherClubBonus()
  #stripeTable()
  return

checkMotherClubBonus = ->
  for playerId in [1, 2]
    status = $("input[name=WageWizard_Player_#{playerId}_MotherClubBonus]").prop('checked')
    $("select[name=WageWizard_Player_#{playerId}_Loyalty]").prop 'disabled', status
  return

formSerialize = ->
  serializedFields = []
  $('*[name^="WageWizard_"]').each ->
    $this = $(this)
    switch $this.attr('type')
      when 'checkbox', 'radio' then serializedFields.push $this.prop('checked')
      else serializedFields.push $this.val()
  encodeURI serializedFields.join("-")

# Stamin.IA! Get Link Button
$("#getLink").on "click", (e) ->
  unless $(FORM_ID).validate().form()
    $("#generatedLink").alert('close')
    return

  link = document.location.href.split("?")[0]
  locale = gup "locale"

  if locale?
    link += "?locale=#{locale}&amp;"
  else
    link +="?"

  link += "params=#{formSerialize()}"

  clippy = """
    &nbsp;<span class="clippy" data-clipboard-text="#{link}" id="staminiaClippy"></span>
    """
  body = link

  if $("#generatedLinkBody").length
    $("#copyLinkToClipboard").data("text", link)
    $("#staminiaClippy").attr("data-clipboard-text", link)
    $("#generatedLinkBody").fadeOut "fast", ->
      $(this).html(body).fadeIn "fast"
  else
    $("#AlertsContainer").append createAlert "id": "generatedLink", "type": "info", "body": body, "title" : WageWizard.messages.copy_link + " " + clippy
    new WageWizard.ClippableBehavior($("#staminiaClippy")[0])

  # Scroll up if needed
  scrollUpToResults()
  return

$.validator.methods.range = (value, element, param) ->
  globalizedValue = value.replace ",", "."
  @optional(element) or (globalizedValue >= param[0] and globalizedValue <= param[1])

$.validator.methods.number = (value, element) ->
  return @optional(element) or /^-?(?:\d+|\d{1,3}(?:[\s\.,]\d{3})+)(?:[\.,]\d+)?$/.test(value)

$.validator.addMethod "position" , (value, element, params) ->
 @optional(element) or value >= params[0] and value <= params[1]
, jQuery.validator.messages.required

$.ajaxSetup {
  dataType: "json",
  timeout: 30000,
  beforeSend : (XMLHttpRequest, settings) ->
    $("#CHPP_Refresh_Data").button('loading')
    $("#CHPP_Refresh_Data_Status").find("i").attr "class", "icon-white icon-time"
    $("#CHPP_Refresh_Data_Status").find("i").attr "title", ""
    $("#CHPP_Refresh_Data_Status").prop 'disabled', true
    $("#CHPP_Refresh_Data_Status").removeClass("btn-danger btn-success btn-warning").addClass "btn-progress"
    $("#CHPP_Results").hide()
    $("#CHPP_Status_Description").html ""
  success : (jsonObject, textStatus, xhr) ->
    switch jsonObject.Status
      when "OK"
        try
          WageWizard.Teams = jsonObject.Teams
          WageWizard.LeagueDetails = WageWizard.LEAGUE_DETAILS[jsonObject.LeagueID]
          WageWizard.Engine.start()
          setupCHPPPlayerFields(true)
          loginMenuHide()
          enableCHPPMode()
          #stripeTable()
          if (jsonObject.RefreshThrottle)
            $("#CHPP_Refresh_Data_Status").find("i").attr "class", "icon-warning-sign"
            $("#CHPP_Refresh_Data_Status").find("i").attr "title", WageWizard.messages.status_warning
            $("#CHPP_Refresh_Data_Status").removeClass("btn-progress btn-danger btn-success").addClass "btn-warning"
            $("#CHPP_Status_Description").text WageWizard.messages.refresh_throttle jsonObject.RefreshThrottle
          else
            $("#CHPP_Refresh_Data_Status").find("i").attr "class", "icon-white icon-ok"
            $("#CHPP_Refresh_Data_Status").find("i").attr "title", WageWizard.messages.status_ok
            $("#CHPP_Refresh_Data_Status").removeClass("btn-progress btn-danger btn-warning").addClass "btn-success"
          $("#CHPP_Refresh_Data").data "completeText", $("#CHPP_Refresh_Data").data("successText")
        catch error
          if WageWizard.CONFIG.DEBUG
            console.log error
            console.log error.stack
          $("#CHPP_Refresh_Data_Status").find("i").attr "class", "icon-white icon-remove"
          $("#CHPP_Refresh_Data_Status").find("i").attr "title", WageWizard.messages.status_error
          $("#CHPP_Refresh_Data_Status").removeClass("btn-progress btn-success btn-warning").addClass "btn-danger"
          loginMenuShow()
          $("#CHPP_Refresh_Data").data "completeText", $("#CHPP_Refresh_Data").data("errorText")
          $("#CHPP_Status_Description").html """
            #{WageWizard.messages.error_unknown}.<br/>
            #{WageWizard.messages.retry_to_authorize}.
            """
      when "Error"
        switch jsonObject.ErrorCode
          when "InvalidToken"
            error_message = WageWizard.messages.error_invalid_token
            description_message = WageWizard.messages.retry_to_authorize
          when ""
          else
            error_message = WageWizard.messages.error_unknown
            description_message = WageWizard.messages.retry_to_authorize
        $("#CHPP_Refresh_Data_Status").find("i").attr "class", "icon-white icon-remove"
        $("#CHPP_Refresh_Data_Status").find("i").attr "title", WageWizard.messages.status_error
        $("#CHPP_Refresh_Data_Status").removeClass("btn-progress btn-success btn-warning").addClass "btn-danger"
        $("#CHPP_Status_Description").html """
          #{error_message}<br/>
          #{description_message}
          """
        loginMenuShow()
        $("#CHPP_Refresh_Data").data "completeText", $("#CHPP_Refresh_Data").data("errorText")
    $("#CHPP_Refresh_Data_Status").prop 'disabled', false
    return

  error : (jqXHR, textStatus, thrownError) ->
    switch textStatus
      when "timeout"
        error_message = WageWizard.messages.error_timeout
        description_message = ""
      when "parsererror"
        error_message = WageWizard.messages.error_parser
        description_message = ""
      else
        error_message = WageWizard.messages.error_unknown
        description_message = WageWizard.messages.retry_to_authorize
    $("#CHPP_Refresh_Data_Status").find("i").attr "class", "icon-white icon-remove"
    $("#CHPP_Refresh_Data_Status").find("i").attr "title", WageWizard.messages.status_error
    $("#CHPP_Refresh_Data_Status").removeClass("btn-success btn-warning").addClass "btn-danger"
    $("#CHPP_Status_Description").html """
      #{error_message}<br/>
      #{description_message}
      """
    loginMenuShow()
    $("#CHPP_Refresh_Data").data "completeText", $("#CHPP_Refresh_Data").data("errorText")
    $("#CHPP_Refresh_Data_Status").prop 'disabled', false
    return

  complete : (jqXHR, textStatus) ->
    $("#CHPP_Results").show()
    $("#CHPP_Refresh_Data").button 'complete'
}

sort_by = (field, reverse, primer) ->
  reverse = if reverse then -1 else 1
  (a, b) ->
    a = if field.indexOf("WW-") is 0 then a.WageWizard[field.substring(3)] else a[field]
    b = if field.indexOf("WW-") is 0 then b.WageWizard[field.substring(3)] else b[field]
    if primer?
      a = primer(a)
      b = primer(b)
      a = Infinity if isNaN(a)
      b = Infinity if isNaN(b)
    return reverse * -1 if a < b
    return reverse * 1 if a > b
    0

sortCHPPPlayerFields = ->
  Team = WageWizard.Teams[$("#CHPP_Team").val()]
  $("#menuLoginTitle").text Team.TeamName

  PlayersData = Team.PlayersData
  return unless PlayersData?

  field = $("#CHPP_Players_SortBy").val()
  reverse = true
  primer = parseInt

  switch field
    when "PlayerNumber"
      reverse = false
    when "PlayerName"
      reverse = false
      primer = undefined

  PlayersData.sort sort_by(field, reverse, primer)

  return

updateCHPPPlayerFields = ->
  Team = WageWizard.Teams[$("#CHPP_Team").val()]
  $("#menuLoginTitle").text Team.TeamName

  PlayersData = Team.PlayersData
  return unless PlayersData?

  sortCHPPPlayerFields()

  $("#CHPP_Player_1").html ""

  select = $(document.createElement("select"))
  for player, index in PlayersData
    optionElement = $(document.createElement("option"))
    optionElement.addClass("isBruised") if ((Number) player.InjuryLevel) == 0
    optionElement.addClass("isInjured") if ((Number) player.InjuryLevel) > 0
    optionElement.addClass("isSuspended") if ((Number) player.Cards) >= 3
    optionElement.addClass("isTransferListed") if player.TransferListed
    optionElement.attr "value", index
    name = optionElement.text "#{ number = if player.PlayerNumber? then player.PlayerNumber + '.' else '' } #{player.PlayerName} #{ mc = if player.MotherClubBonus then '\u2665' else '' }"
    select.append optionElement

  selectP1 = select.clone true

  selectP1.attr 'id', 'CHPP_Player_1'

  $("#CHPP_Player_1").html selectP1.html()

  fillTeamWageTable()
  return

setupCHPPPlayerFields = (checkUrlParameter = false) ->
  Teams = WageWizard.Teams
  return if !Teams? or Teams.length is 0

  select = $(document.createElement("select"))
  for team, index in Teams
    optionElement = $(document.createElement("option"))
    optionElement.attr "value", index
    optionElement.text team.TeamName
    select.append optionElement

  $("#CHPP_Team").html select.html()
  $("#CHPP_Team").closest(".controls").show() if Teams.length > 1

  updateCHPPPlayerFields()

  $('#CHPP_Player_1 option:eq(0)').prop 'selected', true
  setPlayerFormFields 1, checkUrlParameter
  return

# Stamin.IA! Switch Players Button
$('#switchPlayers').click ->
  $("#{FORM_ID} *[name*=_Player_1_]").each ->
    form = $(FORM_ID)[0]
    p2Field = form[@name.replace('_1', '_2')]

    $this = $(this)
    $p2Field = $(p2Field)

    p1Value = @value
    p1Disabled = $this.prop 'disabled'
    p1Checked = $this.prop 'checked'
    $this.val $p2Field.val()
    $this.prop 'disabled', $p2Field.prop('disabled')
    $this.prop 'checked', $p2Field.prop('checked')
    $p2Field.val p1Value
    $p2Field.prop 'disabled', p1Disabled
    $p2Field.prop 'checked', p1Checked
  checkMotherClubBonus()
  $('.control-group').removeClass 'error'
  $(FORM_ID).validate().form()
  return

$('input[data-validate="range"], select[data-validate="range"]').each ->
  $(this).rules 'add', { range: [$(this).data('rangeMin'), $(this).data('rangeMax')] }

getWageInUserCurrency = (salary) ->
  salary / parseFloat(WageWizard.LeagueDetails.Country.CurrencyRate.replace(',','.'), 10)

salaryToString = (salary) ->
  result = [number_format(getWageInUserCurrency(salary), 0, '', ' '), WageWizard.LeagueDetails.Country.CurrencyName]
  result.join ' '

rateToString = (rate, precision = 0) ->
  "#{WageWizard.number_format(rate * 100, 2)}%"

colorizePercent = ($element) ->
  # Red: hsl(1,45%,50%)
  # Green: hsl(121,32%,40%)
  value = parseFloat($element.text())
  return if value is NaN
  direction = $element.data 'direction'
  hue = if direction is 'asc' then (121 - value) * 121 / 100 else value * 121 / 100
  $element.css 'color', "hsl(#{hue}, 45%, 50%)"

fillDataField = ($element, target) ->
  switch $element.data 'type'
    when 'salary' then $element.text(salaryToString target)
    when 'percent' then $element.text(rateToString target, 2)
  return

fillTeamWageTable = ->
  $('#WageWizard_Team [data-target]').each ->
    $this = $(this)
    Team = WageWizard.Teams[$("#CHPP_Team").val() || 0]
    fillDataField $this, Team.TeamData[$this.data('target')]
    return

setPlayerWageTable = (player, id) ->
  $("#WageWizard_Player_#{id} [data-target]").each ->
    $this = $(this)
    fillDataField $this, player.WageWizard[$this.data('target')]
    return

setDescriptionFields = (player, id) ->
  $("#WageWizard_Description_Player_#{id}_Avatar").html player.Avatar

  $("#WageWizard_Description_Player_#{id}_Name").text "#{if player.PlayerNumber? then "#{player.PlayerNumber}. " else ""}#{player.PlayerName}"
  $("#WageWizard_Description_Player_#{id}_Age").text WageWizard.messages.age(player.Age, player.Days)
  $("#WageWizard_Description_Player_#{id}_NextBirthday").text player.NextBirthday
  $("#WageWizard_Description_Player_#{id}_Tsi").text WageWizard.number_format(player.Tsi, 0, '', ' ')

  if player.Statement
    $("#WageWizard_Description_Player_#{id}_Statement").text(player.Statement).show()
  else
    $("#WageWizard_Description_Player_#{id}_Statement").hide()

  if player.Abroad
    $("#WageWizard_Description_Player_#{id}_Salary").html WageWizard.messages.salary_with_bonus(salaryToString(player.Salary), salaryToString(player.Salary / 1.2))
  else
    $("#WageWizard_Description_Player_#{id}_Salary").text WageWizard.messages.salary(salaryToString(player.Salary))

  $("#WageWizard_Description_Player_#{id}").show()
  return

setTableFields = (player, id) ->
  $("#playersInfoTable tr").removeClass 'success warning'
  $("#playersInfoTable .btn-radio input").prop('disabled', true).closest('label').addClass 'hide'

  $("#WageWizard_Player_#{id}_Salary").val player.Salary
  $("#WageWizard_Player_#{id}_Age").val player.Age
  $("#WageWizard_Player_#{id}_Abroad").prop 'checked', player.Abroad

  for skill in WageWizard.HATTRICK_SKILLS when skill isnt 'SetPiecesSkill'
    $("#WageWizard_Player_#{id}_#{skill}").val player[skill]
    $("#WageWizard_Player_Min_#{id}_#{skill}").text salaryToString(player.WageWizard.Skills[skill].min)
    $("#WageWizard_Player_Max_#{id}_#{skill}").text salaryToString(player.WageWizard.Skills[skill].max)
    if skill is player.WageWizard.primary
      $("#WageWizard_Primary_Player_#{id}_#{skill}").closest('label').removeClass 'hide'
      $("#WageWizard_Primary_Player_#{id}_#{skill}").prop 'checked', true
      if player.WageWizard.unpredictable_skills.length is 0
        $("#WageWizard_Primary_Player_#{id}_#{skill}").closest('tr').addClass 'success'
      else
        $("#WageWizard_Primary_Player_#{id}_#{skill}").closest('tr').addClass 'warning'

  for unpredictable_skill in player.WageWizard.unpredictable_skills
    $("#WageWizard_Primary_Player_#{id}_#{unpredictable_skill}").closest('label').removeClass 'hide'
    $("#WageWizard_Primary_Player_#{id}_#{unpredictable_skill}").prop 'disabled', false
    $("#WageWizard_Primary_Player_#{id}_#{unpredictable_skill}").closest('tr').addClass 'warning'

  $("#WageWizard_Player_Min_#{id}_SetPiecesSkill").text rateToString(player.WageWizard.Skills['SetPiecesSkill'].min)
  $("#WageWizard_Player_Max_#{id}_SetPiecesSkill").text rateToString(player.WageWizard.Skills['SetPiecesSkill'].max)

  $("#WageWizard_Player_#{id}_Min").text salaryToString(player.WageWizard.min)
  $("#WageWizard_Player_#{id}_Max").text salaryToString(player.WageWizard.max)

  # Mother Club Bonus
  #$("input[name=WageWizard_Player_#{id}_MotherClubBonus]").prop 'checked', player.MotherClubBonus
  #checkMotherClubBonus()

setPlayerFormFields = (id, checkUrlParameter = false) ->
  return if checkUrlParameter && gup("params")?

  Team = WageWizard.Teams[$("#CHPP_Team").val()]
  $("#menuLoginTitle").text Team.TeamName

  PlayersData = Team.PlayersData
  return unless PlayersData?

  formReference = $(FORM_ID)[0]
  player = PlayersData[formReference["CHPP_Player_#{id}"].value]
  return unless player?

  setDescriptionFields player, id
  setPlayerWageTable player, id
  setTableFields player, id

loginMenuHide = ->
  $("#loginDropdown").addClass "hide"
  $("#loggedInDropdown").removeClass "hide"

loginMenuShow = ->
  $("#menuLoginTitle").text "CHPP"
  $("#loggedInDropdown").addClass "hide"
  $("#loginDropdown").removeClass "hide"

$("#CHPP_Refresh_Data").on "click", ->
  $.ajax { url: "chpp/chpp_retrievedata.php?refresh", cache: false }

$("#CHPP_Revoke_Auth_Link").on "click", ->
  $(this).closest("[class~='open']").removeClass 'open'
  window.confirm WageWizard.messages.revoke_auth_confirm

plot_redraw = (plot) ->
  return unless plot?
  plot.resize()
  plot.setupGrid()
  plot.draw()

# Resize charts if needed
$(window).resize $.debounce 500, ->
  return unless $("#tabChartsNav").hasClass "active"
  plot_redraw document.plot1 if document.plot1?
  plot_redraw document.plot2 if document.plot2?

# Charts tooltips
showTooltip = (x, y, contents) ->
  $content_div = $('<div id="flot-tooltip">' + contents + '</div>').appendTo("body")

  $content_div.css
    display: "none"
    visibility: "visible"
    top: y - $content_div.height() - 11
    left: x - $content_div.width() - 11
  .fadeIn("fast")

setDiscountedSalary = ->
  input = (Number) $("#ageDiscountCalculationSalary").val().replace /[^\d]/g, ''
  if input < 250
    $("#ageDiscountCalculationDiscountedSalary").val ''
    return
  rate = WageWizard.Engine.getRate $("#ageDiscountCalculation").val()
  $("#ageDiscountCalculationDiscountedSalary").val WageWizard.number_format((input - 250) * rate + 250, 0, '', ' ')

createPlayerFromForm = (id) ->
  player =
    Age: $("#WageWizard_Player_#{id}_Age").val()
    Abroad: $("#WageWizard_Player_#{id}_Abroad").prop 'checked'
    Salary: $("#WageWizard_Player_#{id}_Salary").val()

  for skill in WageWizard.HATTRICK_SKILLS
    player[skill] = $("#WageWizard_Player_#{id}_#{skill}").val()

  WageWizard.Engine.setPlayerData player, $("input[name=WageWizard_Primary_Player_#{id}]:checked").val()

  player

createCountryDropbox = ->
  leagueArray = []
  for k, v of WageWizard.LEAGUE_DETAILS
    leagueArray.push { id: k, name: v.Country.CountryName }
  leagueArray.sort sort_by('name', false)

  leagueId = $('#WageWizard_League').data('league').toString()
  leagueOptions = []
  for league in leagueArray
    leagueOptions.push "<option value='#{league.id}'#{if league.id is leagueId then ' selected' else ''}>#{league.name}</option>"
  $('#WageWizard_League').html leagueOptions.join()
  WageWizard.LeagueDetails = WageWizard.LEAGUE_DETAILS[leagueId]

refreshTable = (id) ->
  player = createPlayerFromForm id
  setTableFields player, id

# Event listeners
$('.dropdown-menu').find('form').click (e) ->
  # Stops propagation of click event on login form
  e.stopPropagation()

$('[data-colorize]').bind 'DOMSubtreeModified', ->
  colorizePercent $(this)

$('#WageWizard_League').on 'change', ->
  WageWizard.LeagueDetails = WageWizard.LEAGUE_DETAILS[$(this).val()]

$('.refresh-table').on 'change', ->
  refreshTable $(this).data 'id'

$("#ageDiscountCalculation").on "change", ->
  $("#ageDiscountCalculationTarget").text WageWizard.number_format(100 - WageWizard.Engine.getRate($(this).val()) * 100, 0)
  setDiscountedSalary()

$("#ageDiscountCalculationSalary").on "keyup", setDiscountedSalary

$("#extraLink").on "click", (e) ->
  e.preventDefault()
  $("#tabExtraNav").find("a").tab "show"
  $('#helpModal').modal 'toggle'
  false

$("select[id^=CHPP_Player_]").on 'change', ->
  setPlayerFormFields $(this).data 'id'
  return

$("#CHPP_Players_SortBy, #CHPP_Team").on "change", ->
  updateCHPPPlayerFields()

  if ($("#CHPP_Player_1 option").length >= 1)
    $("#CHPP_Player_1 option:eq(0)").prop 'selected', true
    setPlayerFormFields 1

  return

$('a.accordion-toggle[data-toggle="collapse"]').on 'click', (e) ->
  $this = $(this)
  $target = $($this.attr 'href')
  $target.addClass('in') if $target.css('height') isnt '0px'

previousPoint = null
$("#chartTotal, #chartPartials").bind "plothover", (event, pos, item) ->
  if (item)
    return if previousPoint is item.dataIndex
    previousPoint = item.dataIndex
    $("#flot-tooltip").remove()
    x = item.datapoint[0]
    y = item.datapoint[1].toFixed 2
    showTooltip item.pageX, item.pageY, "#{WageWizard.messages.substitution_minute}: #{x}<br/>#{WageWizard.messages.contribution}: #{y}"
  else
    $("#flot-tooltip").remove()
    previousPoint = null

$('.motherclub-bonus-checkbox').on 'change', (e) ->
  checkMotherClubBonus()
  return

# Hide alerts when showing credits and redraw charts if needed
$('a[data-toggle="tab"]').on 'shown', (e) ->
  if $(e.target).attr("href") is "#tabCredits"
    $("#AlertsContainer").hide()
  else
    $("#AlertsContainer").show()
  if $(e.target).attr("href") is "#tabCharts"
    plot_redraw document.plot1
    plot_redraw document.plot2
  return

# Stamin.IA! Reset Button
$("#resetApp").on "click", (e) ->
  $("#{FORM_ID}, #{OPTION_FORM_ID}").each ->
    if (typeof this.reset == 'function' or (typeof this.reset == 'object' and !this.reset.nodeType))
      this.reset()

  $('.control-group').removeClass "error"
  $("#AlertsContainer").html ""
  resetAndHideTabs()

  checkMotherClubBonus()
  setupCHPPPlayerFields()
  #stripeTable()
  e.preventDefault()

#export
WageWizard.format = format
WageWizard.number_format = number_format

WageWizard.isChartsEnabled = isChartsEnabled
WageWizard.isVerboseModeEnabled = isVerboseModeEnabled

# Document.ready
$ ->
  checkIframe()
  hasParams = gup("params")?
  fillForm() if hasParams
  #stripeTable()
  $(FORM_ID).submit() if hasParams and AUTOSTART
  $("#imgMadeInItaly").tooltip()
  if document.startAjax
    $.ajax { url: "chpp/chpp_retrievedata.php", cache: true }
  else
    createCountryDropbox()
    $('.wagewizard-league').show()
    refreshTable 1
