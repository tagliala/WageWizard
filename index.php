<?php
include 'config.php';
include 'lib/PHT/PHT.php';
session_start();
$HT = $_SESSION['HT'];
$permanent = $_COOKIE['permanent'];
/*
When user is redirected to your callback url
you will received two parameters in url
oauth_token and oauth_verifier
use both in next function:
*/
if ($HT != null) try
{
}
catch(HTError $e)
{
  echo $e->getMessage();
}
$tryAjax = (($HT != null) || $permanent);
?>
<?php
include 'localization.php';
?>
<?

function optionSkills($start = 0, $stop = 20, $select = 6) {
  global $localizedSkills;

  if ($start < 0) $start = 0;
  if ($stop > 20) $stop = 20;
  if (($select < 0) || ($select > 20)) $select = -1;

  if ($stop < $start) { $start = 0; $stop = 20; }
  if ($select > $stop) { $select = -1; }

  $result = '';
  for ($i = $start; $i <= $stop; ++$i) {
    $result .= "<option value=\"$i\"" . (($select == $i)?" selected=\"selected\"":"") . ">$localizedSkills[$i]</option>\n";
  }
  return $result;
}

function skillRow($player, $skill, $couldBePrimarySkill = true, $class="wage-cell", $start = 0, $stop = 20, $select = 6) {
  $localizedSkill = localize($skill);
  $localizedPlayer = localize("Player $player");
  $options = optionSkills($start, $stop, $select);
  $primary = '';
  if ($couldBePrimarySkill) {
    $primary =
      '<label class="btn-radio hide">
         <input type="radio" name="WageWizard_Primary_Player_' . $player. '" value="' . $skill . '" id="WageWizard_Primary_Player_' . $player . '_' . $skill . '" disabled class="refresh-table" data-id="' . $player . '">
         <i class="btn-radio-status-icon"></i>
       </label>';
  }

  echo
    '<tr>
      <td class="text-center">' . $primary . '</td>
      <td>' . $localizedSkill . '</td>
      <td>
        <div class="control-group">
          <span class="field-caption">' . $localizedSkill . '</span>
          <select id="WageWizard_Player_' . $player . '_' . $skill . '" name="WageWizard_Player_' . $player . '_' . $skill . '" data-validate="range" data-range-min="' . $start . '" data-range-max="' . $stop . '" data-field-name="' . $localizedPlayer . ' ' . $localizedSkill . '" class="refresh-table" data-id="' . $player . '">
            ' . $options . '
          </select>
        </div>
      </td>
      <td id="WageWizard_Player_Min_' . $player . '_' . $skill . '" class="' . $class . '">
      </td>
      <td id="WageWizard_Player_Max_' . $player . '_' . $skill . '" class="' . $class . '">
      </td>
    </tr>';
}
?>
<?php $WageWizard_version = "13.09.29" ?>
<!DOCTYPE html>
<html lang="<?php echo localize("lang"); ?>">
  <head>
    <meta http-equiv="content-type" content="text/html; charset=UTF-8">
    <meta charset="utf-8">
    <title>Wage Wizard <?php echo localize("SUBTITLE"); ?></title>

    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Wage Wizard <?php echo localize("SUBTITLE"); ?>"/>
    <meta name="author" content="Lizardopoli"/>

    <meta name="description" content="Wage Wizard <?php echo localize("SUBTITLE"); ?>"/>
    <meta name="keywords" content="Wage Wizard, CHPP, hattrick, wages, skill predictions"/>

    <?php if (FB_ADMINS != "") { ?>
      <meta property="fb:admins" content="<?= FB_ADMINS ?>"/>
      <meta property="og:title" content="Wage Wizard"/>
      <meta property="og:description" content="<?php echo localize("SUBTITLE"); ?>"/>
      <meta property="og:type" content="game"/>
      <meta property="og:image" content="<?= APP_ROOT ?>img/big_logo.png"/>
      <meta property="og:url" content="<?= APP_ROOT ?>"/>
      <meta property="og:site_name" content="Lizardopoli"/>
    <?php } ?>

    <!-- Le HTML5 shim, for IE6-8 support of HTML elements -->
    <!--[if lt IE 9]>
      <script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script>
    <![endif]-->

    <!-- Le styles -->
    <link href="css/main.css" rel="stylesheet">
    <link href="//fonts.googleapis.com/css?family=Roboto|Pacifico" rel="stylesheet" type="text/css">
    <link href="//netdna.bootstrapcdn.com/font-awesome/3.2.1/css/font-awesome.min.css" rel="stylesheet" type="text/css">

    <!-- Le fav and touch icons -->
    <link rel="shortcut icon" href="img/wagewizard_favicon.png">
    <link rel="apple-touch-icon" href="img/ico/apple-touch-icon.png">
    <link rel="apple-touch-icon" sizes="72x72" href="img/ico/apple-touch-icon-72x72.png">
    <link rel="apple-touch-icon" sizes="114x114" href="img/ico/apple-touch-icon-114x114.png">
  </head>
<?php flush(); ?>
  <body>
  <div id="fb-root"></div>

  <!-- Navbar
    ================================================== -->
    <div class="navbar navbar-fixed-top">
      <div class="navbar-inner">
        <div class="container">
          <a class="btn btn-navbar" data-toggle="collapse" data-target=".nav-collapse">
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
            <span class="icon-bar"></span>
          </a>
          <div class="brand"><i id="wagewizard-logo"></i><span id="wagewizard-brand" class="hidden-phone">Wage Wizard</span></div>
          <ul class="nav pull-right">
            <?php if (CHPP_APP_ID != "") { ?>
              <li class="dropdown" id="dropdownLogin">
                <a class="dropdown-toggle" data-toggle="dropdown" href="#dropdownLogin">
                  <span id="menuLoginTitle"><?= localize("CHPP"); ?></span>
                  <b class="caret"></b>
                </a>
                <ul class="dropdown-menu" id="loginDropdown">
                  <li>
                    <form id="LoginForm" action="chpp/chpp_auth.php" method="get">
                      <p><?= localize("Authorize Wage Wizard to access your data"); ?></p>
                      <fieldset>
                        <label class="rememberme"><input type="checkbox" name="permanent" <?php if ($permanent) echo "checked=\"checked\"" ?>/> <span><?php echo localize("Remember me"); ?></span></label>
                        <button type="submit" class="btn" id="CHPPLink"><?= localize("Login"); ?></button>
                      </fieldset>
                    </form>
                    <small><i class="icon-warning-sign"></i> <?php echo sprintf(localize("<b>WARNING:</b> by enabling \"%s\", your authorization data are stored in a %s on your computer. <b>DO NOT USE</b> this option if you are using a public computer (i.e. internet points)."), localize("Remember me"), "<abbr title=\"" . localize("A cookie is used for an origin website to send state information to a user's browser and for the browser to return the state information to the origin site.") . "\">" . localize("cookie") . "</abbr>"); ?></small>
                  </li>
                </ul>
                <ul class="dropdown-menu hide" id="loggedInDropdown">
                  <li>
                    <a id="CHPP_Revoke_Auth_Link" href="chpp/chpp_revokeauth.php"><?= localize("Revoke authorization"); ?></a>
                  </li>
                </ul>
              </li>
            <?php } ?>
            <li class="dropdown" id="dropdownLanguages">
              <a class="dropdown-toggle" data-toggle="dropdown" href="#dropdownLanguages">
                <i class="flag-<?= $lang_array[strtolower(localize("lang"))]["flag"] ?>"></i>
                <span class="hidden-phone">
                  <?= $lang_array[strtolower(localize("lang"))]["lang-name"] ?>
                </span>
                <b class="caret"></b>
              </a>
              <ul class="dropdown-menu">
<?php
foreach ($lang_array as $key => $val) {
if (strtolower(localize("lang")) === $key) { continue; }
echo "                  <li><a href=\"?locale=$key\"><i class=\"flag-" . $val["flag"] . "\"></i> " . $val["lang-name"] . "</a></li>\n";
}
?>
                </ul>
              </li>
          </ul>
          <div class="nav-collapse">
            <ul class="nav">
              <li><a href="#helpModal" data-toggle="modal"><?= localize("Help") ?></a></li>
            </ul>
            <ul class="nav pull-right">
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Container Fluid Start -->
    <div id="main" class="container-fluid">

      <!-- First Row Start -->
      <div class="row-fluid">

        <!-- First Column Start -->
        <div class="span3 side-panel" id="side-panel">

          <!-- WageWizard Options Start -->
          <div class="accordion hide" id="accordion-settings">
            <form id="optionForm" action="javascript:{}" method="post">
              <div class="accordion-group">
                <div class="accordion-heading">
                  <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion-settings" href="#collapseSettings">
                    <i class="icon-cog"></i>
                    <?= localize("Settings") ?>
                  </a>
                </div>
                <div id="collapseSettings" class="accordion-body collapse">
                  <div class="accordion-inner">
                    <div class="wagewizard-button-panel">
                      <label class="btn btn-checkbox">
                        <input type="checkbox" name="WageWizard_Options_Charts" id="WageWizard_Options_Charts" checked>
                        <i class="btn-checkbox-status-icon"></i>
                        <span title="<?= localize("Show charts") ?>"><?= localize("Show charts") ?></span>
                      </label>
                      <label class="btn btn-checkbox">
                        <input type="checkbox" name="WageWizard_Options_VerboseMode" id="WageWizard_Options_VerboseMode" checked>
                        <i class="btn-checkbox-status-icon"></i>
                        <span title="<?= localize("Show contributions table") ?>"><?= localize("Show contributions table") ?></span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div> <!-- WageWizard Options End -->

          <!-- WageWizard CHPP Start -->
          <div class="accordion<? if (!$tryAjax) echo " hide"; ?>" id="accordion-chpp">
            <div class="accordion-group">
              <div class="accordion-heading">
                <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion-chpp" href="#collapseCHPP">
                  <i class="icon-star"></i>
                  <?= localize("CHPP Mode") ?>
                </a>
              </div>
              <div id="collapseCHPP" class="accordion-body collapse">
                <div class="accordion-inner">
                  <div class="wagewizard-button-panel<? if (!$tryAjax) echo " hide"; ?>" id="WageWizard_Options_CHPP">
                    <div class="btn-chpp">
                      <button class="btn btn-status" id="CHPP_Refresh_Data_Status" disabled="disabled"><i class="icon-warning-sign"></i></button>
                      <button class="btn" disabled="disabled" id="CHPP_Refresh_Data" data-error-text="<?= localize("Error"); ?>" data-loading-text="<?= localize("Loading..."); ?>" data-success-text="<?= localize("Refresh data") ?>" data-complete-text="<?= localize("Refresh data") ?>"><?= localize("Unauthorized") ?></button>
                    </div>

                    <div id="CHPP_Results" class="hide shy">
                      <p id="CHPP_Status_Description"></p>
                    </div>

                  </div> <!-- WageWizard CHPP Options End -->
                </div>
              </div>
            </div>
          </div> <!-- WageWizard CHPP End -->

<? if (defined('GOOGLE_AD_CLIENT')) { ?>
          <!-- Advertising -->
          <div class="advertising border-box">
            <script type="text/javascript">
              google_ad_client = "<?= GOOGLE_AD_CLIENT ?>";
              if (window.innerWidth <= 767) {
                /* Wage Wizard 234x60 */
                google_ad_slot = "3972242614";
                google_ad_width = 234;
                google_ad_height = 60;
              } else if (window.innerWidth >= 1024) {
                /* Wage Wizard 200x200 */
                google_ad_slot = "5448975810";
                google_ad_width = 200;
                google_ad_height = 200;
              } else {
                /* Wage Wizard 125x125 */
                google_ad_slot = "6925709019";
                google_ad_width = 125;
                google_ad_height = 125;
              }
            </script>
            <script type="text/javascript"
             src="http://pagead2.googlesyndication.com/pagead/show_ads.js">
            </script>
          </div>
<? } else { ?>
          <div class="spacer"></div>
<? } ?>
        </div> <!-- First Column End -->

        <!-- Second Column Start -->
        <div class="span9">
          <h1 class="mainTitle">Wage Wizard <span class="sub"><?= localize("SUBTITLE") ?></span></h1>

          <form action="javascript:{}" method="post" class="hide">
            <select class="ignore input-block-level" id="CHPP_Team" name="CHPP_Team">
            </select>
          </form>


          <ul class="nav nav-tabs">
            <li class="active"><a href="#tabPlayer" data-toggle="tab"><i class="icon-user"></i> <span class="hidden-phone"><?= localize("Player") ?></span></a></li>
            <li class="hide" id="tabTeamNav"><a href="#tabTeam" data-toggle="tab"><i class="icon-group"></i> <span class="hidden-phone"><?= localize("Team") ?></span></a></li>
            <li id="tabExtraNav"><a href="#tabExtra" data-toggle="tab"><i class="icon-plus-sign"></i> <span class="hidden-phone"><?= localize("Extra") ?></span></a></li>
            <li class="hide" id="tabChartsNav"><a href="#tabCharts" data-toggle="tab"><i class="icon-bar-chart"></i> <span class="hidden-phone"><?= localize("Charts") ?></span></a></li>
            <li class="hide" id="tabContributionsNav"><a href="#tabContributions" data-toggle="tab"><i class="icon-list-alt"></i> <span class="hidden-phone"><?= localize("Contributions table") ?></span></a></li>
            <li class="hide" id="tabDebugNav"><a href="#tabDebug" data-toggle="tab">Debug</a></li>
            <li class="credits"><a href="#tabCredits" data-toggle="tab"><i class="icon-gift"></i> <span class="hidden-phone"><?= localize("Credits") ?></span></a></li>
          </ul>

          <!-- Tab Content Start -->
          <div class="tab-content">

            <div id="AlertsContainer"></div>

            <noscript>
              <div class="alert alert-block alert-error">
                <h4 class="alert-heading"><?= localize("Error"); ?></h4>
                <?= localize("You need a browser with JavaScript support") ?>
              </div>
            </noscript>

            <!-- Tab Player -->
            <div class="tab-pane active" id="tabPlayer">
              <!-- Main Form Start -->
              <form id="formPlayersInfo" action="javascript:{}" method="post" class="wagewizardForm form-vertical">

                <!-- CHPP Container Start -->
                <div id="WageWizard_CHPP" class="hide">

                  <!-- CHPP Controls Start -->
                  <div class="controls controls-row">
                    <select class="ignore span8" id="CHPP_Player_1" name="CHPP_Player_1_Name" data-id="1">
                    </select>
                    <select class="ignore span4" id="CHPP_Players_SortBy" name="CHPP_Players_SortBy">
                      <option value="PlayerNumber"><?php echo localize("Shirt Number"); ?></option>
                      <option value="PlayerName"><?php echo localize("Name"); ?></option>
                      <option value="Salary"><?php echo localize("Salary"); ?></option>
                      <option value="Tsi"><?php echo localize("TSI"); ?></option>
                      <option value="PlayerForm"><?php echo localize("Form"); ?></option>
                      <option value="StaminaSkill"><?php echo localize("Stamina"); ?></option>
                      <option value="Experience"><?php echo localize("Experience"); ?></option>
                      <option value="Loyalty"><?php echo localize("Loyalty"); ?></option>
                      <optgroup label="<?= localize("Skill"); ?>">
                        <option value="KeeperSkill"><?php echo localize("KeeperSkill"); ?></option>
                        <option value="PlaymakerSkill"><?php echo localize("PlaymakerSkill"); ?></option>
                        <option value="PassingSkill"><?php echo localize("PassingSkill"); ?></option>
                        <option value="WingerSkill"><?php echo localize("WingerSkill"); ?></option>
                        <option value="DefenderSkill"><?php echo localize("DefenderSkill"); ?></option>
                        <option value="ScorerSkill"><?php echo localize("ScorerSkill"); ?></option>
                        <option value="SetPiecesSkill"><?php echo localize("SetPiecesSkill"); ?></option>
                      </optgroup>
                    </select>
                  </div> <!-- CHPP Controls End -->

                  <div class="spacer"></div>

                  <div class="row-fluid">
                    <div class="span6">
                      <div class="media hide" id="WageWizard_Description_Player_1">
                        <div class="media-object pull-left" id="WageWizard_Description_Player_1_Avatar"></div>
                        <div class="media-body">
                          <h4 class="media-heading" id="WageWizard_Description_Player_1_Name"></h4>
                          <p>
                            <em id="WageWizard_Description_Player_1_Statement" class="muted block"></em>
                            <span id="WageWizard_Description_Player_1_Age" class="block"></span>
                            <span class="block"><i class='icon-gift'></i> <span id="WageWizard_Description_Player_1_NextBirthday"></span></span>
                            <span class="block"><?= localize("TSI"); ?>: <span id="WageWizard_Description_Player_1_Tsi"></span></span>
                            <span class="block"><?= localize("Salary"); ?>: <span id="WageWizard_Description_Player_1_Salary"></span></span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div class="span6">
                      <table class="table table-bordered table-condensed table-striped">
                        <tbody id="WageWizard_Player_1">
                          <tr>
                            <th></th>
                            <th><?= localize("Weekly"); ?></th>
                            <th><?= localize("Seasonly"); ?></th>
                          </tr>
                          <tr>
                            <td><?= localize("Salary"); ?></td>
                            <td class="wage-cell" data-type="salary" data-target="weekly"></td>
                            <td class="wage-cell" data-type="salary" data-target="seasonly"></td>
                          </tr>
                          <tr>
                            <td><?= localize("Abroad Bonus"); ?></td>
                            <td class="wage-cell" data-type="salary" data-target="abroadWeekly"></td>
                            <td class="wage-cell" data-type="salary" data-target="abroadSeasonly"></td>
                          </tr>
                          <tr>
                            <td><?= localize("Age Discount"); ?></td>
                            <td colspan=2 class="wage-cell" data-type="percent" data-target="discount" data-colorize data-direction="desc"></td>
                          </tr>
                          <tr class="WageWizard_Player_1_Percent">
                            <td><?= localize("Team Impact %"); ?></td>
                            <td colspan=2 class="wage-cell" data-type="percent" data-target="teamPercent" data-colorize data-direction="asc"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div class="spacer"></div>
                  </div>
                </div>

                <table class="table table-bordered table-condensed table-striped">
                  <tbody>
                    <tr>
                      <th><?= localize("Age") ?></th>
                      <td>
                        <input type="hidden" name="WageWizard_Player_1_Salary" id="WageWizard_Player_1_Salary">
                        <select id="WageWizard_Player_1_Age" name="WageWizard_Player_1_Age" class="ignore refresh-table" data-id="1">
                          <?php for ($i = 17; $i <= 99; $i++) { ?>
                            <option value=<?= $i ?>><?= $i ?></option>
                          <?php } ?>
                        </select>
                      </td>
                      <td>
                        <label class="btn btn-checkbox">
                          <input type="checkbox" name="WageWizard_Player_1_Abroad" id="WageWizard_Player_1_Abroad" class="refresh-table" data-id="1">
                          <i class="btn-checkbox-status-icon"></i>
                          <span title="<?= localize("Abroad Bonus") ?>"><?= localize("Abroad Bonus") ?></span>
                        </label>
                      </td>
                      <th class="wagewizard-league hide"><?= localize("Country") ?></th>
                      <td class="wagewizard-league hide">
                        <select name="WageWizard_League" id="WageWizard_League" class="refresh-table" data-id="1" data-league="<?= localize("LEAGUE_ID") ?>">
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table class="table table-bordered table-condensed table-striped full-width" id="playersInfoTable">
                  <tbody>
                    <tr>
                      <th><?= localize("Primary") ?></th>
                      <th><?= localize("Skill") ?></th>
                      <th><?= localize("Level") ?></th>
                      <th><?= localize("Min") ?></th>
                      <th><?= localize("Max") ?></th>
                    </tr>
                  </tbody>
                  <tbody>
                    <!--
                    <? skillRow(1, 'Form', false, 1, 8) ?>
                    <? skillRow(1, 'Stamina', false, 1, 9) ?>
                    <? skillRow(1, 'Experience', false, 0, 20) ?>
                    <? skillRow(1, 'Loyalty', false, 1, 20, 1) ?>
                    <tr class="motherClubBonus">
                      <td><?= localize("Mother club bonus") ?></td>
                      <td>
                        <label class="btn btn-checkbox btn-motherclub-bonus">
                          <input type="checkbox" name="WageWizard_Player_1_MotherClubBonus" class="motherclub-bonus-checkbox">
                          <i class="btn-checkbox-status-icon"></i>
                          <i class="icon-heart"></i>
                        </label>
                      </td>
                    </tr>
                    -->
                    <? skillRow(1, 'KeeperSkill') ?>
                    <? skillRow(1, 'DefenderSkill') ?>
                    <? skillRow(1, 'PlaymakerSkill') ?>
                    <? skillRow(1, 'WingerSkill') ?>
                    <? skillRow(1, 'PassingSkill') ?>
                    <? skillRow(1, 'ScorerSkill') ?>
                    <? skillRow(1, 'SetPiecesSkill', false, 'wage-percent') ?>
                    <tr class="table-total">
                      <td></td>
                      <td></td>
                      <th class="superheader text-right"><?= localize("Total") ?></th>
                      <td id="WageWizard_Player_1_Min" class="wage-cell"></td>
                      <td id="WageWizard_Player_1_Max" class="wage-cell"></td>
                    </tr>
                  </tbody>
                </table>
                <div class="text-center form-actions">
                  <button type="button" id="getLink" class="btn"><i class="icon-link"></i> <?= localize("Get link") ?></button>
                </div>
              </form> <!-- Main Form End -->
            </div>

            <!-- Team -->
            <div class="tab-pane" id="tabTeam">
              <table class="table table-bordered table-condensed table-striped width-auto">
                <tbody id="WageWizard_Team">
                  <tr>
                    <th colspan="3" class="superheader text-center"><i class="icon-group"></i> <?= localize("Team Total"); ?></th>
                  </tr>
                  <tr>
                    <th></th>
                    <th><?= localize("Weekly"); ?></th>
                    <th><?= localize("Seasonly"); ?></th>
                  </tr>
                  <tr>
                    <td><?= localize("Salary"); ?></td>
                    <td class="wage-cell" data-type="salary" data-target="weekly"></td>
                    <td class="wage-cell" data-type="salary" data-target="seasonly"></td>
                  </tr>
                  <tr>
                    <td><?= localize("Abroad Bonus"); ?></td>
                    <td class="wage-cell" data-type="salary" data-target="abroadWeekly"></td>
                    <td class="wage-cell" data-type="salary" data-target="abroadSeasonly"></td>
                  </tr>
                  <tr>
                    <td><?= localize("Age Discount"); ?></td>
                    <td colspan="2" class="wage-cell" data-type="percent" data-target="discount" data-colorize data-direction="desc"></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Extra -->
            <div class="tab-pane" id="tabExtra">
              <h3 class="legend-like"><?= localize("Age Discount Calculation"); ?></h3>
              <form action="javascript:{}" method="post" class="form-horizontal">
                <div class="control-group">
                  <label for="ageDiscountCalculation" class="control-label">
                    <?= localize("Age"); ?>
                  </label>
                  <div class="controls">
                    <select class="ignore width-auto" id="ageDiscountCalculation" name="ageDiscountCalculation">
                      <?php for ($i = 17; $i <= 99; $i++) { ?>
                        <option value=<?= $i ?>><?= $i ?></option>
                      <?php } ?>
                    </select>
                    <span class="help-inline"><span class="text-success"><?= localize("Discount"); ?>: <b id="ageDiscountCalculationTarget">0</b> %</span></span>
                  </div>
                </div>
                <div class="control-group">
                  <label for="ageDiscountCalculationSalary" class="control-label">
                    <?= localize("Salary"); ?>
                  </label>
                  <div class="controls">
                    <input type="text" value="" class="input-medium" id="ageDiscountCalculationSalary" name="ageDiscountCalculationSalary">
                  </div>
                </div>
                <div class="control-group">
                  <label for="ageDiscountCalculationDiscountedSalary" class="control-label">
                    <?= localize("Discounted Salary"); ?>
                  </label>
                  <div class="controls">
                    <input type="text" value="" class="input-medium" id="ageDiscountCalculationDiscountedSalary" name="ageDiscountCalculationDiscountedSalary" disabled>
                  </div>
                </div>
              </form>
            </div>

            <!-- Charts -->
            <div class="tab-pane" id="tabCharts">
              <div id="charts">
                <h3 class="legend-like"><?= localize("Total Contribution"); ?></h3>
                <div id="chartTotal" class="chart"></div>
                <h3 class="legend-like"><?= localize("Partial Contributions"); ?></h3>
                <div id="chartPartials" class="chart"></div>
              </div>
            </div>

            <!-- Contributions -->
            <div class="tab-pane" id="tabContributions">
            </div>

            <!-- Debug -->
            <div class="tab-pane" id="tabDebug">
            </div>

            <!-- Credits -->
            <div class="tab-pane" id="tabCredits">
              <!--
              <blockquote>
                <p><?= localize("QUOTE"); ?></p>
                <small>Danfisico (3232936)</small>
              </blockquote>
              -->
              <h3><?= localize("Thanks to"); ?>:</h3>
              <p>
                <b>bigpapy</b> (7967145), <b>Shinobi-fisc</b> (7328722)
              </p>
              <h3><?= localize("Translated by"); ?>:</h3>
              <p>
                <?= localize("TRANSLATED_BY"); ?>
              </p>
              <h3><?= localize("Nerd thanks"); ?>:</h3>
              <p>
                <a href="http://getbootstrap.com">Twitter Bootstrap's team</a>,
                <a href="http://html5boilerplate.com/">HTML5 Bolierplate's team</a>,
                <a href="http://github.com/mojombo/clippy">mojombo/clippy</a>,
                <a href="http://github.com/jzaefferer/jquery-validation">jzaefferer/jquery-validation</a>,
                <a href="http://github.com/flot/flot">flot/flot</a>,
                <a href="http://fontawesome.io">Font Awesome</a>,
                <a href="http://www.famfamfam.com/lab/icons/flags/">Mark James</a>
              </p>
            </div>

          </div> <!-- Tab Content End -->
<? if (defined('GOOGLE_AD_CLIENT')) { ?>
          <!-- Advertising -->
          <div class="advertising border-box advertising-leaderboard">
            <script type="text/javascript">
              google_ad_client = "<?= GOOGLE_AD_CLIENT ?>";
              /* Wage Wizard 728x90 */
              google_ad_slot = "2495509419";
              google_ad_width = 728;
              google_ad_height = 90;
              //-->
              </script>
              <script type="text/javascript"
              src="http://pagead2.googlesyndication.com/pagead/show_ads.js">
              </script>
          </div>
<? } ?>

        </div> <!-- Second Column End -->

      </div> <!-- First Row End -->

      <!-- Help Modal Start -->
      <div class='modal border-box hide' tabindex="-1" id='helpModal'>
        <div class='modal-header'>
          <button type='button' class='close' data-dismiss='modal'>&times;</button>
          <h3><?= localize("Help") ?></h3>
        </div>
        <div class="modal-body">
          <?= localize("LONG_HELP") ?>
        </div>
        <div class="modal-footer">
          <a href="#" class="btn" data-dismiss="modal"><?= localize("Close") ?></a>
        </div>
      </div> <!-- Help Modal End -->

      <hr/>

      <!-- Footer Start -->
      <footer>
        <ul class="unstyled">
          <li><b>Wage Wizard</b> by <b>Lizardopoli</b> (5246225)</li>
          <li><a href="https://github.com/<?= GH_REPO ?>/blob/master/CHANGELOG.md">v<?= $WageWizard_version ?></a></li>
          <?php if (CHPP_APP_ID != "") { ?>
            <li><i class="icon-star"></i> <a href="http://www.hattrick.org/Community/CHPP/ChppProgramDetails.aspx?ApplicationId=<?= CHPP_APP_ID ?>">Certified Hattrick Product Provider</a></li>
          <?php } ?>
          <li><i class="icon-github"></i> <a href="http://github.com/<?= GH_REPO ?>">Wage Wizard @ github</a></li>
        </ul>
      </footer> <!-- Footer End -->

    </div> <!-- Container Fluid End -->
<?php
if (defined('GA_ID')) { ?>
    <script type="text/javascript">
      var _gaq = _gaq || [];
      _gaq.push(['_setAccount', '<?= GA_ID ?>']);
      _gaq.push(['_trackPageview']);

      (function() {
        var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
        ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
        var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
      })();
    </script>
<? } ?>
    <!-- Bootstrap and jQuery from CDN for better performance -->
    <script src="//code.jquery.com/jquery-1.9.1.min.js"></script>
    <script src="//netdna.bootstrapcdn.com/twitter-bootstrap/2.3.1/js/bootstrap.min.js"></script>

    <!-- scripts concatenated and minified via build script -->
    <script src="js/vendor/jqvalidate/jquery.validate.min.js"></script>
    <script src="js/vendor/jqthrottle/jquery.ba-throttle-debounce.min.js"></script>
    <script src="js/jquery.flot.js"></script>
    <script src="js/league_details.js"></script>
    <script src="js/formulae.js"></script>
    <script src="js/main.js"></script>
    <script src="js/plugins.js"></script>
    <script src="js/engine.js"></script>
    <!-- end scripts -->

    <!--[if IE]><script language="javascript" type="text/javascript" src="js/vendor/flot/excanvas.min.js"></script><![endif]-->

    <script>
      document.startAjax = <?php if ($tryAjax) { echo "true"; } else { echo "false"; } ?>;
<?php
$file = "js/localization/messages_" . localize("lang") . ".js";
$file_en = "js/localization/messages_en-US.js";
if (is_file($file)) { include($file); }
else { include($file_en); }
?>
    </script>
  </body>
</html>
