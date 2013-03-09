"use strict"
window.WageWizard = window.WageWizard || {}
WageWizard = window.WageWizard
WageWizard.CONFIG = WageWizard.CONFIG || {}
$.extend WageWizard.CONFIG,
  FORM_ID: "#formPlayersInfo"
  OPTION_FORM_ID: "#optionForm"
  TABLE_ID: "#playersInfoTable"
  SEASON_WEEKS: 16
  DEBUG: false
  DEBUG_STEP: 1
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

createSubstitutionAlert = (substituteAtArray, mayNotReplace) ->
  ranges = []
  r = 0

  for minute in substituteAtArray
    unless ranges[r]
      ranges[r] = []
      ranges[r].push minute
      check_with = minute + 1
    else if minute isnt check_with
      ranges[r].push check_with - 1 unless ranges[r][ranges[r].length - 1] is check_with - 1
      r++
      _i--
    else if minute is check_with
      check_with = minute + 1
    if _i is _len-1
      l = ranges[r].length - 1
      ranges[r].push minute if ranges[r][l] isnt minute

  result = []
  for range in ranges
    result.push range.join "-"
  title = ""
  body = ""
  if substituteAtArray.length > 0
    title = ""
    if substituteAtArray.length is 1
      title += "#{WageWizard.messages.replace} #{WageWizard.messages.at_minute}"
    else
      title += "#{WageWizard.messages.replace} #{WageWizard.messages.at_minutes}"
    body = """
      <span class="minutes">#{result.join ", "}</span>
      """
    body += "#{WageWizard.messages.may_not_replace}" if mayNotReplace
  else
    title = WageWizard.messages.do_not_replace
  $('#AlertsContainer').append createAlert "id": "formSubstituteAt", "type": "success", "title" : title, "body": body
  return

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

# Stops propagation of click event on login form
$('.dropdown-menu').find('form').click (e) ->
  e.stopPropagation()

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
    $("#calculate").addClass 'disabled'
    resetAndHideTabs()
    $("#AlertsContainer").html ""
    result = WageWizard.Engine.start()

    # Show warnings
    warnings_list = ""
    if result.player2_stronger_than_player1
      warnings_list += "<li>#{WageWizard.messages.player2_stronger_than_player1}</li>"
    if result.player1_low_stamina_se_risk
      warnings_list += "<li>#{WageWizard.messages.player1_low_stamina_se(result.player1_low_stamina_se)}</li>"
    if result.player2_low_stamina_se_risk
      warnings_list += "<li>#{WageWizard.messages.player2_low_stamina_se(result.player2_low_stamina_se)}</li>"
    if result.bestInFirstHalf and isOnlySecondHalfEnabled()
      warnings_list += "<li>#{WageWizard.messages.best_in_first_half}</li>"
    $('#AlertsContainer').append createAlert "id": "formWarnings", "type": "warning", "title" : WageWizard.messages.status_warning, "body": "<ul>#{warnings_list}</ul>" if warnings_list isnt ""

    # Render Contributions table
    if isVerboseModeEnabled()
      # Strength table
      tempHTML = """
        <h3 class="legend-like">#{WageWizard.messages.strength_table}</h3>
        <table class="table table-striped table-condensed table-staminia table-staminia-strength width-auto">
          <thead>
            <tr>
              <th></th><th>#{WageWizard.messages.player1}</th><th>#{WageWizard.messages.player2}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>#{WageWizard.messages.strength}</td>
              <td>#{number_format(result.player1Strength, 2)}</td>
              <td>#{number_format(result.player2Strength, 2)}</td>
            </tr>
            <tr>
              <td>#{WageWizard.messages.strength_st_independent}</td>
              <td>#{number_format(result.player1StrengthStaminaIndependent, 2)}</td>
              <td>#{number_format(result.player2StrengthStaminaIndependent, 2)}</td>
            </tr>
          </tbody>
        </table>
        <p><small>#{WageWizard.messages.used_in_calculation}</small></p>
        """
      $("#tabContributions").append tempHTML

      # Contributions table
      tableHeader = """
        <thead>
          <tr>
            <th class="min-width">#{WageWizard.messages.substitution_minute}</th>
            <th>#{WageWizard.messages.total_contribution}</th>
            <th>#{WageWizard.messages.contribution_percent}</th>
            <th>#{WageWizard.messages.p1_contrib}</th>
            <th>#{WageWizard.messages.p2_contrib}</th>
            <th>#{WageWizard.messages.notes}</th>
          </tr>
        </thead>
        """

      tableSeparator = "<tr><td colspan='6'></td></tr>"

      tempHTML = """
        <h3 class="legend-like">#{WageWizard.messages.contribution_table}</h3>
        <table class="table table-striped table-condensed table-staminia table-staminia-contributions">
          #{tableHeader}
          <tbody>
        """
      player1LowStamina = (String) result.player1_low_stamina_se
      player2LowStamina = (String) result.player2_low_stamina_se
      for minute of result.minutes
        minuteObject = result.minutes[minute]
        totalContribution = minuteObject.total
        percentContribution = minuteObject.percent
        p1Contribution = minuteObject.p1
        p2Contribution = minuteObject.p2
        isMax = minuteObject.isMax
        isMin = minuteObject.isMin
        if minute is "46"
          tempHTML += tableHeader
        note = (if isMax then "MAX" else (if isMin then "MIN" else (if 100 - percentContribution < 1 then "~ 1%" else ""))) + (if minute is player1LowStamina then " " + WageWizard.messages.p1_low_stamina else "") + (if minute is player2LowStamina then " " + WageWizard.messages.p2_low_stamina else "")
        css_classes = (if isMax then " max" else "") + (if isMin then " min" else "")
        tempHTML += """
          <tr class="#{css_classes}">
            <td>#{minute}</td>
            <td>#{totalContribution}</td>
            <td>#{percentContribution}%</td>
            <td>#{p1Contribution}</td>
            <td>#{p2Contribution}</td>
            <td>#{note}</td>
          </tr>
          """
      tempHTML += "</tbody></table>"
      $("#tabContributions").append tempHTML
      $("#tabContributionsNav").show()

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

    createSubstitutionAlert((if isOnlySecondHalfEnabled() then result.substituteAtSecondHalf else result.substituteAt), result.mayNotReplace)

    # Show the right tab
    if isChartsEnabled()
      $("#tabChartsNav").find("a").tab "show"
      setTimeout ->
        plot_redraw document.plot1
        plot_redraw document.plot2
      , 500
    else if isVerboseModeEnabled()
      $("#tabContributionsNav").find("a").tab "show"

    #if WageWizard.CONFIG.DEBUG_STEP
    #  printContributionTable()
    #  $("#tabDebugNav").show()
    #  #$("#tabDebugNav").find("a").tab "show"

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

# Enable Advanced Mode
enableAdvancedMode =  ->
  $("#WageWizard_Options_AdvancedMode_Predictions").find(".btn").prop 'disabled', false
  $("#{TABLE_ID} tr[class~='simple']").addClass("hide").hide()
  $("#{FORM_ID} *[name*=_]").addClass "ignore"
  $("#{TABLE_ID} tr[class~=advanced]:not([id*=_Advanced_])").removeClass("hide").show()
  $("#WageWizard_Options_Predictions_Type").slideDown()
  showSkillsByPosition()
  return

# Disable Advanced Mode
disableAdvancedMode =  ->
  $("#WageWizard_Options_AdvancedMode_Predictions").find(".btn").prop 'disabled', false
  $("#{TABLE_ID} tr[class~='advanced']").addClass("hide").hide()
  $("#{FORM_ID} *[name*=_Advanced_]").addClass "ignore"
  $("#{FORM_ID} *[name*=_]").removeClass "ignore"
  $("#{TABLE_ID} tr[class~='simple']").removeClass("hide").show()
  $("#WageWizard_Options_Predictions_Type").slideUp()
  return

isOnlySecondHalfEnabled = ->
  $("#WageWizard_Options_OnlySecondHalf").prop 'checked'

isChartsEnabled = ->
  $("#WageWizard_Options_Charts").prop 'checked'

isVerboseModeEnabled = ->
  $("#WageWizard_Options_VerboseMode").prop 'checked'

isPressingEnabled = ->
  $("#WageWizard_Options_Pressing").prop 'checked'

isAdvancedModeEnabled = ->
  $("#WageWizard_Options_AdvancedMode").prop 'checked'

enableCHPPMode = ->
  $("#{TABLE_ID} tr[class~='chpp']").removeClass("hide").show()
  return

disableCHPPMode = ->
  $("#{TABLE_ID} tr[class~='chpp']").addClass("hide").hide()
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
  if isAdvancedModeEnabled()
    enableAdvancedMode()
  else
    disableAdvancedMode()
  checkMotherClubBonus()
  updatePredictions()
  #stripeTable()
  return

checkMotherClubBonus = ->
  for playerId in [1, 2]
    status = $("input[name=WageWizard_Player_#{playerId}_MotherClubBonus]").prop('checked')
    $("select[name=WageWizard_Player_#{playerId}_Loyalty]").prop 'disabled', status
    $("input[name=WageWizard_Advanced_Player_#{playerId}_Loyalty]").prop 'disabled', status
  return

updatePredictions = ->
  if $('input[name="WageWizard_Options_Predictions_Type"]:checked').val() is 'ho'
    WageWizard.predictions = WageWizard.CONFIG.PREDICTIONS_HO
  else
    WageWizard.predictions = WageWizard.CONFIG.PREDICTIONS_ANDREAC
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

$('#WageWizard_Options_AdvancedMode').on 'change', (e) ->
  if $(this).prop 'checked'
    enableAdvancedMode()
  else
    disableAdvancedMode()
  #stripeTable()
  return

$('.motherclub-bonus-checkbox').on 'change', (e) ->
  checkMotherClubBonus()
  return

$('input[name="WageWizard_Options_Predictions_Type"]').on 'change', (e) ->
  updatePredictions()

$('input[data-validate="range"], select[data-validate="range"]').each ->
  $(this).rules 'add', { range: [$(this).data('rangeMin'), $(this).data('rangeMax')] }

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
  disableAdvancedMode()
  setupCHPPPlayerFields()
  #stripeTable()
  e.preventDefault()

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
          $("#menuLoginTitle").text jsonObject.TeamName
          PlayersData = jsonObject.PlayersData
          WageWizard.PlayersData = PlayersData
          WageWizard.CountryDetails = WageWizard.COUNTRY_DETAILS[jsonObject.CountryID]
          WageWizard.Engine.start()
          fillTeamWageTable()
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
  PlayersData = WageWizard.PlayersData
  return unless PlayersData?

  field = "PlayerNumber"
  reverse = false
  primer = parseInt

  switch $("#{FORM_ID} select[id=CHPP_Players_SortBy]").val()
    when "ShirtNumber"
      field = "PlayerNumber"
    when "Name"
      field = "PlayerName"
      primer = undefined
    when "Form"
      field = "PlayerForm"
      reverse = true
    when "TSI"
      field = "Tsi"
      reverse = true
    when "Stamina"
      field = "StaminaSkill"
      reverse = true
    when "Salary"
      field = "Salary"
      reverse = true
    when "Keeper"
      field = "KeeperSkill"
      reverse = true
    when "Playmaking"
      field = "PlaymakerSkill"
      reverse = true
    when "Passing"
      field = "PassingSkill"
      reverse = true
    when "Winger"
      field = "WingerSkill"
      reverse = true
    when "Defending"
      field = "DefenderSkill"
      reverse = true
    when "Scoring"
      field = "ScorerSkill"
      reverse = true
    when "SetPieces"
      field = "SetPiecesSkill"
      reverse = true
    when "Experience"
      field = "Experience"
      reverse = true
    when "Loyalty"
      field = "Loyalty"
      reverse = true

  PlayersData.sort sort_by(field, reverse, primer)

  return

updateCHPPPlayerFields = ->
  PlayersData = WageWizard.PlayersData
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

  return

setupCHPPPlayerFields = (checkUrlParameter = false) ->
  updateCHPPPlayerFields()

  $('#CHPP_Player_1 option:eq(0)').prop 'selected', true
  setPlayerFormFields 1, checkUrlParameter
  return

$("#{FORM_ID} select[id=CHPP_Player_1]").on 'change', ->
  setPlayerFormFields 1
  return

$("#{FORM_ID} select[id=CHPP_Player_2]").on 'change', ->
  setPlayerFormFields 2
  return

$("#{FORM_ID} select[id=CHPP_Players_SortBy]").on "change", ->
  updateCHPPPlayerFields()

  if ($("#CHPP_Player_1 option").length >= 1)
    $("#CHPP_Player_1 option:eq(0)").prop 'selected', true
    setPlayerFormFields 1

  return

getWageInUserCurrency = (salary) ->
  salary / WageWizard.CountryDetails.CurrencyRate

salaryToString = (salary) ->
  result = [number_format(getWageInUserCurrency(salary), 0, '', ' '), WageWizard.CountryDetails.CurrencyName]
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
    fillDataField $this, WageWizard.TeamData[$this.data('target')]
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
    $("#WageWizard_Description_Player_#{id}_Salary").text WageWizard.messages.salary_with_bonus(salaryToString(player.Salary))
  else
    $("#WageWizard_Description_Player_#{id}_Salary").text WageWizard.messages.salary(salaryToString(player.Salary))

  $("#WageWizard_Description_Player_#{id}").show()
  return

setTableFields = (player, id) ->
  $("#playersInfoTable tr").removeClass 'success warning'
  $("#playersInfoTable .btn-radio input").prop('disabled', true).closest('label').hide()

  $("#WageWizard_Player_#{id}_Salary").val player.Salary
  $("#WageWizard_Player_#{id}_Age").val player.Age
  $("#WageWizard_Player_#{id}_Abroad").prop 'checked', player.Abroad

  for k, v of WageWizard.MAP_HATTRICK_SKILLS
    $("#WageWizard_Player_#{id}_#{k}").val player[v]
    continue if k is 'Keeper' or k is 'SetPieces'
    $("#WageWizard_Player_Min_#{id}_#{k}").text salaryToString(player.WageWizard.Skills[k].min)
    $("#WageWizard_Player_Max_#{id}_#{k}").text salaryToString(player.WageWizard.Skills[k].max)
    if player.WageWizard.primary is k
      $("#WageWizard_Primary_Player_#{id}_#{k}").closest('label').show()
      $("#WageWizard_Primary_Player_#{id}_#{k}").prop 'checked', true
      $("#WageWizard_Primary_Player_#{id}_#{k}").closest('tr').addClass 'success'

  for k of player.WageWizard.unpredictable_skills
    $("#WageWizard_Primary_Player_#{id}_#{k}").closest('label').show()
    $("#WageWizard_Primary_Player_#{id}_#{k}").prop 'disabled', false
    $("#WageWizard_Primary_Player_#{id}_#{k}").closest('tr').addClass 'warning'

  $("#WageWizard_Player_Min_#{id}_SetPieces").text rateToString(player.WageWizard.Skills['SetPieces'].min)
  $("#WageWizard_Player_Max_#{id}_SetPieces").text rateToString(player.WageWizard.Skills['SetPieces'].max)

  $("#WageWizard_Player_#{id}_Min").text salaryToString(player.WageWizard.min)
  $("#WageWizard_Player_#{id}_Max").text salaryToString(player.WageWizard.max)

  # Mother Club Bonus
  #$("input[name=WageWizard_Player_#{id}_MotherClubBonus]").prop 'checked', player.MotherClubBonus
  #checkMotherClubBonus()

setPlayerFormFields = (id, checkUrlParameter = false) ->
  return if checkUrlParameter && gup("params")?

  PlayersData = WageWizard.PlayersData
  formReference = $(FORM_ID)[0]
  return unless PlayersData?
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

setDiscountedSalary = ->
  input = (Number) $("#ageDiscountCalculationSalary").val().replace /[^\d]/g, ''
  if input < 250
    $("#ageDiscountCalculationDiscountedSalary").val ''
    return
  rate = WageWizard.Engine.getRate $("#ageDiscountCalculation").val()
  $("#ageDiscountCalculationDiscountedSalary").val WageWizard.number_format((input - 250) * rate + 250, 0, '', ' ')

$("#ageDiscountCalculation").on "change", ->
  $("#ageDiscountCalculationTarget").text WageWizard.number_format(100 - WageWizard.Engine.getRate($(this).val()) * 100, 0)
  setDiscountedSalary()

$("#ageDiscountCalculationSalary").on "keyup", setDiscountedSalary

$("#extraLink").on "click", (e) ->
  e.preventDefault()
  $("#tabExtraNav").find("a").tab "show"
  $('#helpModal').modal 'toggle'
  false

$('a.accordion-toggle[data-toggle="collapse"]').on 'click', (e) ->
  $this = $(this)
  $target = $($this.attr 'href')
  $target.addClass('in') if $target.css('height') isnt '0px'

#export
WageWizard.format = format
WageWizard.number_format = number_format

WageWizard.isChartsEnabled = isChartsEnabled
WageWizard.isVerboseModeEnabled = isVerboseModeEnabled
WageWizard.isPressingEnabled = isPressingEnabled
WageWizard.isAdvancedModeEnabled = isAdvancedModeEnabled

createPlayerFromForm = (id) ->
  player =
    Age: $("#WageWizard_Player_#{id}_Age").val()
    Abroad: $("#WageWizard_Player_#{id}_Abroad").prop 'checked'
    Salary: $("#WageWizard_Player_#{id}_Salary").val()

  for k, v of WageWizard.MAP_HATTRICK_SKILLS
    player[v] = $("#WageWizard_Player_#{id}_#{k}").val()

  WageWizard.Engine.setPlayerData player, $("input[name=WageWizard_Primary_Player_#{id}]:checked").val()

  player

# Document.ready
$ ->
  checkIframe()
  hasParams = gup("params")?
  fillForm() if hasParams
  #stripeTable()
  $(FORM_ID).submit() if hasParams and AUTOSTART
  $("#imgMadeInItaly").tooltip()
  $.ajax { url: "chpp/chpp_retrievedata.php", cache: true } if document.startAjax
  $('[data-colorize]').bind 'DOMSubtreeModified', ->
    colorizePercent $(this)
  $('.refresh-table').on 'change', ->
    id = $(this).data 'id'
    player = createPlayerFromForm id
    setTableFields player, id
