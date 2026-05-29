<?php
require __DIR__ . '/vendor/autoload.php';
include __DIR__ . '/config.php';
include __DIR__ . '/includes/icon.php';
session_start();
$oauthToken = $_SESSION['oauthToken'] ?? null;
$permanent = $_COOKIE['permanent'] ?? null;
$tryAjax = (($oauthToken != null) || $permanent);
if (!isset($_SESSION['csrf_token'])) {
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}
?>
<?php
include 'localization.php';
?>
<?php

function optionSkills($start = 0, $stop = 20, $select = 1)
{
    global $localizedSkills;

    if ($start < 0) {
        $start = 0;
    }
    if ($stop > 20) {
        $stop = 20;
    }
    if (($select < 0) || ($select > 20)) {
        $select = -1;
    }

    if ($stop < $start) {
        $start = 0;
        $stop = 20;
    }
    if ($select > $stop) {
        $select = -1;
    }

    $result = '';
    for ($i = $start; $i <= $stop; ++$i) {
        $skillLabel = $localizedSkills[$i] . ' (' . $i . ')';
        $result .= "<option value=\"$i\"" . (($select == $i) ? " selected=\"selected\"" : "") . ">$skillLabel</option>\n";
    }
    return $result;
}

function skillRow($player, $skill, $couldBePrimarySkill = true, $class = 'wage-cell', $start = 0, $stop = 20, $select = 1)
{
    $localizedSkill = localize($skill);
    $localizedPlayer = localize("Player $player");
    $options = optionSkills($start, $stop, $select);
    $primary = '';
    if ($couldBePrimarySkill) {
        $primary
          = '<div class="toggle-check">
             <input type="radio" class="btn-check refresh-table" name="WageWizard_Primary_Player_' . $player . '" value="' . $skill . '" id="WageWizard_Primary_Player_' . $player . '_' . $skill . '" disabled data-id="' . $player . '" autocomplete="off">
             <label class="btn btn-secondary btn-sm d-inline-flex" for="WageWizard_Primary_Player_' . $player . '_' . $skill . '">
               <span class="toggle-check-icon"></span>
             </label>
           </div>';
    }

    echo
      '<tr>
        <td class="text-center">' . $primary . '</td>
        <td>' . $localizedSkill . '</td>
        <td>
          <div class="control-group">
            <span class="field-caption">' . $localizedSkill . '</span>
            <select class="form-select form-select-sm refresh-table" id="WageWizard_Player_' . $player . '_' . $skill . '" name="WageWizard_Player_' . $player . '_' . $skill . '" data-id="' . $player . '">
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
<?php $WageWizard_version = "27.0.0" ?>
<!DOCTYPE html>
<html lang="<?php echo localize("lang"); ?>">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Wage Wizard <?php echo localize("SUBTITLE"); ?></title>

    <meta name="description" content="Wage Wizard <?php echo localize("SUBTITLE"); ?>"/>
    <meta name="author" content="Lizardopoli"/>
    <meta name="keywords" content="Wage Wizard, CHPP, hattrick, wages, skill predictions"/>

    <meta property="og:title" content="Wage Wizard"/>
    <meta property="og:description" content="<?php echo localize("SUBTITLE"); ?>"/>
    <meta property="og:type" content="game"/>
    <meta property="og:image" content="<?= APP_ROOT ?>img/big_logo.png"/>
    <meta property="og:url" content="<?= APP_ROOT ?>"/>
    <meta property="og:site_name" content="Lizardopoli"/>

    <script>
      (function(){var m=document.cookie.match(/(?:^|;\s*)theme=(\w+)/);document.documentElement.setAttribute("data-bs-theme",m?m[1]:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"))})()
    </script>

    <link href="dist/wagewizard.min.css?v=<?php echo filemtime('dist/wagewizard.min.css'); ?>" rel="stylesheet">

    <link rel="shortcut icon" href="img/favicon.ico">
    <link rel="apple-touch-icon" href="img/ico/apple-touch-icon.png">
    <link rel="apple-touch-icon" sizes="72x72" href="img/ico/apple-touch-icon-72x72.png">
    <link rel="apple-touch-icon" sizes="114x114" href="img/ico/apple-touch-icon-114x114.png">
  </head>
<?php flush(); ?>
  <body>

  <!-- Navbar
    ================================================== -->
    <nav class="navbar navbar-expand-md fixed-top bg-body-tertiary">
      <div class="container-fluid">
        <a class="navbar-brand position-relative main-navbar-brand">
          <svg class="wagewizard-logo" xmlns="http://www.w3.org/2000/svg" viewBox="361.81 375.375 121.17 121.17"><path d="m366.06 410.996 24.309 49.165 15.226-34.663 15.312 34.663 20.333-41.124" style="fill:none;stroke:#1b1918;stroke-width:8.5039;stroke-linecap:butt;stroke-linejoin:miter"/><path d="m366.06 409.862 24.309 49.166 15.226-34.664 15.312 34.664 20.333-41.125" style="fill:none;stroke:#304860;stroke-width:8.5039;stroke-linecap:butt;stroke-linejoin:miter"/><path d="m384.966 418.44 20.629 37.596 15.269-18.725 15.27 22.85 24.308-49.165" style="fill:none;stroke:#1b1918;stroke-width:8.5039;stroke-linecap:butt;stroke-linejoin:miter"/><path d="m384.966 417.306 20.629 37.597 15.269-18.726 15.27 22.85 24.308-49.165" style="fill:none;stroke:#a8c0d8;stroke-width:8.5039;stroke-linecap:butt;stroke-linejoin:miter"/><path d="M452.57 456.087h-7.154l4.713 3.993.356.302-.21.415-2.622 5.162 5.485-3.49.343-.219.325.241 5.145 3.822-.825-6.428-.051-.401.359-.193 5.975-3.204h-6.83l-.082-.497-.931-5.696-3.488 5.902-.172.291z" style="fill:#1b1918;fill-rule:evenodd"/><path d="M452.57 455.804h-7.154l4.713 3.993.356.301-.21.415-2.622 5.162 5.485-3.49.343-.218.325.241 5.145 3.822-.825-6.428-.051-.402.359-.192 5.975-3.204h-6.83l-.082-.497-.931-5.697-3.488 5.903-.172.29z" style="fill:#fc0;fill-rule:evenodd"/><path d="M461.876 436.904h-7.153l4.713 3.993.356.302-.21.414-2.622 5.163 5.485-3.49.343-.22.325.242 5.145 3.822-.825-6.428-.051-.401.359-.193 5.975-3.204h-6.83l-.082-.497-.931-5.696-3.488 5.902-.172.291z" style="fill:#1b1918;fill-rule:evenodd"/><path d="M461.876 436.62h-7.153l4.713 3.993.356.302-.21.415-2.622 5.162 5.485-3.49.343-.219.325.242 5.145 3.822-.825-6.428-.051-.402.359-.192 5.975-3.204h-6.83l-.082-.497-.931-5.697-3.488 5.902-.172.292z" style="fill:#fc0;fill-rule:evenodd"/><path d="M471.136 417.58h-7.153l4.713 3.992.356.302-.21.414-2.622 5.163 5.485-3.49.343-.22.325.242 5.145 3.822-.825-6.428-.051-.401.359-.193 5.975-3.204h-6.83l-.082-.497-.931-5.696-3.488 5.902-.172.291z" style="fill:#1b1918;fill-rule:evenodd"/><path d="M471.136 417.296h-7.153l4.713 3.992.356.302-.21.415-2.622 5.162 5.485-3.49.343-.219.325.242 5.145 3.822-.825-6.428-.051-.402.359-.192 5.975-3.204h-6.83l-.082-.497-.931-5.697-3.488 5.902-.172.292z" style="fill:#fc0;fill-rule:evenodd"/></svg>
          Wage Wizard
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent" aria-controls="navbarContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarContent">
          <ul class="navbar-nav me-auto">
            <li class="nav-item"><a class="nav-link" href="#helpModal" data-bs-toggle="modal"><?= localize("Help") ?></a></li>
          </ul>
          <ul class="navbar-nav mb-3 mb-md-0">
            <li class="nav-item">
              <button class="nav-link" id="themeToggle" type="button" aria-label="Toggle theme">
                <?= icon('sun', 'theme-icon-sun') ?>
                <?= icon('moon', 'theme-icon-moon') ?>
              </button>
            </li>
            <?php if (CHPP_APP_ID != "") { ?>
              <li class="nav-item dropdown" id="dropdownLogin">
                <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" data-bs-auto-close="outside" href="#" role="button" aria-expanded="false">
                  <span id="menuLoginTitle"><?= localize("CHPP"); ?></span>
                </a>
                <div class="dropdown-menu dropdown-menu-end">
                  <div id="loginDropdown">
                    <form id="LoginForm" action="chpp/chpp_auth.php" method="post">
                      <input type="hidden" name="csrf_token" value="<?= e($_SESSION['csrf_token']) ?>">
                      <p class="small text-body-secondary mb-2"><?= localize("Authorize Wage Wizard to access your data"); ?></p>
                      <fieldset>
                        <div class="d-flex align-items-center justify-content-between gap-2">
                          <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="permanent" id="chppRememberMe" <?php if ($permanent) {
                                echo "checked=\"checked\"";
                            } ?>/>
                            <label class="form-check-label" for="chppRememberMe"><?php echo localize("Remember me"); ?></label>
                          </div>
                          <button type="submit" class="btn btn-sm btn-primary" id="CHPPLink"><?= localize("Login"); ?></button>
                        </div>
                      </fieldset>
                    </form>
                    <div class="alert alert-warning small mb-0 mt-2 p-2"><?= icon('triangle-exclamation') ?> <?php echo sprintf(localize("<b>WARNING:</b> by enabling \"%s\", your authorization data are stored in a %s on your computer.<br><b>DO NOT USE</b> this option on public WiFi or shared devices (e.g. library, hotel).", false), localize("Remember me"), "<abbr title=\"" . localize("A cookie is used for an origin website to send state information to a user's browser and for the browser to return the state information to the origin site.") . "\">" . localize("cookie") . "</abbr>"); ?></div>
                  </div>
                  <ul class="list-unstyled mb-0 d-none" id="loggedInDropdown">
                    <li>
                      <a class="dropdown-item" id="CHPP_Revoke_Auth_Link" href="chpp/chpp_revokeauth.php"><?= localize("Revoke authorization"); ?></a>
                    </li>
                  </ul>
                </div>
              </li>
            <?php } ?>
            <li class="nav-item dropdown" id="dropdownLanguages">
              <a class="nav-link dropdown-toggle" data-bs-toggle="dropdown" href="#" role="button" aria-expanded="false">
                <i class="flag-<?= e($lang_array[strtolower(localize("lang"))]["flag"]) ?>"></i>
                <span class="d-none d-sm-inline">
                  <?= e($lang_array[strtolower(localize("lang"))]["lang-name"]) ?>
                </span>
              </a>
              <ul class="dropdown-menu dropdown-menu-end">
<?php
foreach ($lang_array as $key => $val) {
    if (strtolower(localize("lang")) === $key) {
        continue;
    }
    echo "                  <li><a class=\"dropdown-item\" href=\"?locale=" . e($key) . "\"><i class=\"flag-" . e($val["flag"]) . "\"></i> " . e($val["lang-name"]) . "</a></li>\n";
}
?>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <!-- Container Start -->
    <div id="main" class="container-fluid">

      <!-- First Row Start -->
      <div class="row">

        <!-- First Column Start -->
        <div class="col-lg-3 side-panel" id="side-panel">

          <!-- WageWizard CHPP Start -->
          <div class="accordion mb-3<?php if (!$tryAjax) {
              echo " d-none";
          } ?>" id="accordion-chpp">
            <div class="accordion-item">
              <h2 class="accordion-header">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseCHPP" aria-expanded="false" aria-controls="collapseCHPP">
                  <?= icon('star') ?>
                  <span class="ms-2"><?= localize("CHPP Mode") ?></span>
                </button>
              </h2>
              <div id="collapseCHPP" class="accordion-collapse collapse" data-bs-parent="#accordion-chpp">
                <div class="accordion-body">
                  <div class="wagewizard-button-panel<?php if (!$tryAjax) {
                      echo " d-none";
                  } ?>" id="WageWizard_Options_CHPP">
                    <div class="btn-group d-flex" role="group">
                      <button class="btn btn-sm btn-status" id="CHPP_Refresh_Data_Status" disabled="disabled"><?= icon('triangle-exclamation') ?></button>
                      <button class="btn btn-sm btn-secondary flex-grow-1 text-start" disabled="disabled" id="CHPP_Refresh_Data" data-error-text="<?= localize("Error"); ?>" data-loading-text="<?= localize("Loading..."); ?>" data-success-text="<?= localize("Refresh data") ?>" data-complete-text="<?= localize("Refresh data") ?>"><?= localize("Unauthorized") ?></button>
                    </div>

                    <div id="CHPP_Results" class="d-none">
                      <p class="small text-body-secondary m-0 mt-2" id="CHPP_Status_Description"></p>
                    </div>

                  </div> <!-- WageWizard CHPP Options End -->
                </div>
              </div>
            </div>
          </div> <!-- WageWizard CHPP End -->
        </div> <!-- First Column End -->

        <!-- Second Column Start -->
        <div class="col-lg-9">
          <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item"><a class="nav-link active" href="#tabPlayer" data-bs-toggle="tab" role="tab"><?= icon('user') ?> <span class="d-none d-sm-inline"><?= localize("Player") ?></span></a></li>
            <li class="nav-item d-none" id="tabTeamsNav"><a class="nav-link" href="#tabTeams" data-bs-toggle="tab" role="tab"><?= icon('users') ?> <span class="d-none d-sm-inline"><?= localize("Teams") ?></span></a></li>
            <li class="nav-item" id="tabExtraNav"><a class="nav-link" href="#tabExtra" data-bs-toggle="tab" role="tab"><?= icon('tools') ?> <span class="d-none d-sm-inline"><?= localize("Extra") ?></span></a></li>
            <li class="nav-item d-none" id="tabDebugNav"><a class="nav-link" href="#tabDebug" data-bs-toggle="tab" role="tab">Debug</a></li>
            <li class="nav-item credits"><a class="nav-link" href="#tabCredits" data-bs-toggle="tab" role="tab"><?= icon('gift') ?> <span class="d-none d-sm-inline"><?= localize("Credits") ?></span></a></li>
          </ul>

          <!-- Tab Content Start -->
          <div class="tab-content">

            <div id="AlertsContainer"></div>

            <noscript>
              <div class="alert alert-danger">
                <h4 class="alert-heading"><?= localize("Error"); ?></h4>
                <?= localize("You need a browser with JavaScript support") ?>
              </div>
            </noscript>

            <!-- Tab Player -->
            <div class="tab-pane active" id="tabPlayer" role="tabpanel">
              <h1 class="h4">Wage Wizard <span class="h5 text-body-secondary"><?= localize("SUBTITLE") ?></span></h1>

              <!-- Main Form Start -->
              <form id="formPlayersInfo" action="javascript:{}" method="post" class="wagewizardForm">

                <!-- CHPP Container Start -->
                <div id="WageWizard_CHPP" class="d-none">
                  <!-- CHPP Controls Start -->
                  <select class="form-select form-select-lg ignore mb-3" id="CHPP_Team" name="CHPP_Team"></select>

                  <div class="row">
                    <div class="col-md-8">
                      <select class="form-select ignore mb-3" id="CHPP_Player_1" name="CHPP_Player_1_Name" data-id="1"></select>
                    </div>
                    <div class="col-md-4">
                      <select class="form-select ignore mb-3" id="CHPP_Players_SortBy" name="CHPP_Players_SortBy">
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
                    </div>
                  </div> <!-- CHPP Controls End -->

                  <div class="row">
                    <div class="col-md-6">
                      <div class="d-flex d-none mb-3" id="WageWizard_Description_Player_1">
                        <div class="flex-shrink-0" id="WageWizard_Description_Player_1_Avatar"></div>
                        <div class="ms-3">
                          <h4 class="mb-0" id="WageWizard_Description_Player_1_Name"></h4>
                          <p class="mb-0">
                            <em id="WageWizard_Description_Player_1_Statement" class="text-body-secondary d-block"></em>
                            <span id="WageWizard_Description_Player_1_Age" class="d-block"></span>
                            <span class="d-block"><?= icon('gift') ?> <span id="WageWizard_Description_Player_1_NextBirthday"></span></span>
                            <span class="d-block"><?= localize("TSI"); ?>: <span id="WageWizard_Description_Player_1_Tsi"></span></span>
                            <span class="d-block"><?= localize("Salary"); ?>: <span id="WageWizard_Description_Player_1_Salary"></span></span>
                            <span class="d-none" id="WageWizard_Description_Player_1_Specialty">&#x2605; <?= localize("Specialty"); ?></span>
                          </p>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <table class="table table-bordered table-sm table-striped w-100">
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
                            <td><?= localize("Special Bonus"); ?></td>
                            <td class="wage-cell" data-type="salary" data-target="specialWeekly"></td>
                            <td class="wage-cell" data-type="salary" data-target="specialSeasonly"></td>
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
                          <tr class="WageWizard_Player_1_Percent">
                            <td><?= localize("Team Impact %"); ?></td>
                            <td colspan="2" class="wage-cell" data-type="percent" data-target="teamPercent" data-colorize data-direction="asc"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <table class="table table-bordered table-sm table-striped">
                  <tbody>
                    <tr>
                      <th><?= localize("Age") ?></th>
                      <td>
                        <input type="hidden" name="WageWizard_Player_1_Salary" id="WageWizard_Player_1_Salary">
                        <select class="form-select form-select-sm ignore refresh-table" id="WageWizard_Player_1_Age" name="WageWizard_Player_1_Age" data-id="1">
                          <?php for ($i = 17; $i <= 99; $i++) { ?>
                            <option value=<?= $i ?>><?= $i ?></option>
                          <?php } ?>
                        </select>
                      </td>
                      <td>
                        <div class="toggle-check">
                          <input type="checkbox" class="btn-check refresh-table" name="WageWizard_Player_1_Special" id="WageWizard_Player_1_Special" data-id="1" autocomplete="off">
                          <label class="btn btn-secondary btn-sm" for="WageWizard_Player_1_Special" title="<?= localize("Special Bonus") ?>">
                            <span class="toggle-check-icon toggle-check-icon--star"></span>
                            <span class="toggle-check-label"><?= localize("Special Bonus") ?></span>
                          </label>
                        </div>
                      </td>
                      <td>
                        <div class="toggle-check">
                          <input type="checkbox" class="btn-check refresh-table" name="WageWizard_Player_1_Abroad" id="WageWizard_Player_1_Abroad" data-id="1" autocomplete="off">
                          <label class="btn btn-secondary btn-sm" for="WageWizard_Player_1_Abroad" title="<?= localize("Abroad Bonus") ?>">
                            <span class="toggle-check-icon"></span>
                            <span class="toggle-check-label"><?= localize("Abroad Bonus") ?></span>
                          </label>
                        </div>
                      </td>
                      <th class="wagewizard-league d-none"><?= localize("Country") ?></th>
                      <td class="wagewizard-league d-none">
                        <select class="form-select form-select-sm refresh-table" name="WageWizard_League" id="WageWizard_League" data-id="1" data-league="<?= localize("LEAGUE_ID") ?>">
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>
                <table class="table table-bordered table-sm table-striped" id="playersInfoTable">
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
                    <tr>
                      <td></td>
                      <td><?= localize("Base Salary") ?></td>
                      <td></td>
                      <td id="WageWizard_Player_Min_1_BaseSalary" class="wage-cell"></td>
                      <td id="WageWizard_Player_Max_1_BaseSalary" class="wage-cell"></td>
                    </tr>
                    <?php skillRow(1, 'KeeperSkill') ?>
                    <?php skillRow(1, 'DefenderSkill') ?>
                    <?php skillRow(1, 'PlaymakerSkill') ?>
                    <?php skillRow(1, 'WingerSkill') ?>
                    <?php skillRow(1, 'PassingSkill') ?>
                    <?php skillRow(1, 'ScorerSkill') ?>
                    <?php skillRow(1, 'SetPiecesSkill', false, 'wage-percent') ?>
                    <tr class="table-total">
                      <td></td>
                      <td></td>
                      <th class="superheader text-end"><?= localize("Total") ?></th>
                      <td id="WageWizard_Player_1_Min" class="wage-cell"></td>
                      <td id="WageWizard_Player_1_Max" class="wage-cell"></td>
                    </tr>
                  </tbody>
                </table>
                <div class="text-center form-actions">
                  <button type="button" id="getLink" class="btn btn-lg btn-secondary"><?= icon('link') ?> <?= localize("Get link") ?></button>
                </div>
              </form> <!-- Main Form End -->
            </div>

            <!-- Teams -->
            <div class="tab-pane" id="tabTeams" role="tabpanel">
              <div id="WageWizard_Teams" class="row g-3"></div>
            </div>

            <template id="team-table-template">
              <table class="table table-bordered table-sm table-striped w-auto">
                <tbody>
                  <tr>
                    <th colspan="3" class="superheader text-center"><span class="team-name-cell"></span></th>
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
                    <td><?= localize("Special Bonus"); ?></td>
                    <td class="wage-cell" data-type="salary" data-target="specialWeekly"></td>
                    <td class="wage-cell" data-type="salary" data-target="specialSeasonly"></td>
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
            </template>

            <!-- Extra -->
            <div class="tab-pane" id="tabExtra" role="tabpanel">
              <h3 class="legend-like"><?= localize("Age Discount Calculation"); ?></h3>
              <form action="javascript:{}" method="post" class="d-flex flex-wrap align-items-center gap-2 mb-3">
                <div class="control-group d-flex align-items-center gap-2">
                  <label for="ageDiscountCalculation" class="text-nowrap">
                    <?= localize("Age"); ?>:
                  </label>
                  <select class="form-select ignore w-auto" id="ageDiscountCalculation" name="ageDiscountCalculation">
                    <?php for ($i = 17; $i <= 99; $i++) { ?>
                      <option value=<?= $i ?>><?= $i ?></option>
                    <?php } ?>
                  </select>
                  <span class="text-success text-nowrap"><?= localize("Discount"); ?>: <b id="ageDiscountCalculationTarget">0</b> %</span>
                </div>
                <div class="control-group d-flex align-items-center gap-2">
                  <label for="ageDiscountCalculationSalary" class="text-nowrap">
                    <?= localize("Salary"); ?>:
                  </label>
                  <input type="text" value="" class="form-control form-control-sm w-auto" id="ageDiscountCalculationSalary" name="ageDiscountCalculationSalary">
                </div>
                <div class="control-group d-flex align-items-center gap-2">
                  <label for="ageDiscountCalculationDiscountedSalary" class="text-nowrap">
                    <?= localize("Discounted Salary"); ?>:
                  </label>
                  <input type="text" value="" class="form-control form-control-sm w-auto" id="ageDiscountCalculationDiscountedSalary" name="ageDiscountCalculationDiscountedSalary" disabled>
                </div>
              </form>

              <h3 class="legend-like"><?= localize("Minimum Wage Table"); ?></h3>
              <div class="table-responsive">
                <table class="table table-bordered table-sm table-striped w-auto table--minimum-wage" id="minimumWageTable">
                  <thead></thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>

            <!-- Debug -->
            <div class="tab-pane" id="tabDebug" role="tabpanel">
            </div>

            <!-- Credits -->
            <div class="tab-pane" id="tabCredits" role="tabpanel">
              <h3><?= localize("Thanks to"); ?>:</h3>
              <p>
                <b>bigpapy</b> (7967145), <b>Shinobi-fisc</b> (7328722)
              </p>
              <h3><?= localize("Translated by"); ?>:</h3>
              <p>
                <?= localize("TRANSLATED_BY", false); ?>
              </p>
              <h3><?= localize("Nerd thanks"); ?>:</h3>
              <p>
                <a href="https://getbootstrap.com/">Twitter Bootstrap's team</a>,
                <a href="https://fontawesome.com/">Font Awesome</a>,
                <a href="https://github.com/legacy-icons/famfamfam-flags">Mark James</a>
              </p>
            </div>

          </div> <!-- Tab Content End -->

        </div> <!-- Second Column End -->

      </div> <!-- First Row End -->

      <!-- Help Modal Start -->
      <div class="modal fade" tabindex="-1" id="helpModal" aria-labelledby="helpModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="helpModalLabel"><?= localize("Help") ?></h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <?= localize("LONG_HELP", false) ?>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal"><?= localize("Close") ?></button>
            </div>
          </div>
        </div>
      </div> <!-- Help Modal End -->

      <hr/>

      <!-- Footer Start -->
      <footer>
        <ul class="list-inline">
          <li class="list-inline-item d-block d-sm-inline-block"><b>Wage Wizard</b> by <b>Lizardopoli</b> (5246225)</li>
          <li class="list-inline-item d-block d-sm-inline-block"><a href="https://github.com/<?= GH_REPO ?>/blob/master/CHANGELOG.md">v<?= $WageWizard_version ?></a></li>
          <?php if (CHPP_APP_ID != "") { ?>
            <li class="list-inline-item d-block d-sm-inline-block"><?= icon('star') ?> <a href="https://www.hattrick.org/Community/CHPP/ChppProgramDetails.aspx?ApplicationId=<?= CHPP_APP_ID ?>">Certified Hattrick Product Provider</a></li>
          <?php } ?>
          <li class="list-inline-item d-block d-sm-inline-block"><?= icon('github') ?> <a href="https://github.com/<?= GH_REPO ?>">Wage Wizard @ github</a></li>
        </ul>
      </footer> <!-- Footer End -->

    </div> <!-- Container End -->

    <script src="dist/wagewizard.min.js?v=<?php echo filemtime('dist/wagewizard.min.js'); ?>"></script>

    <script>
      document.startAjax = <?php if ($tryAjax) {
          echo "true";
      } else {
          echo "false";
      } ?>;
<?php
    $minimumWageTableLabels = [
        'skillLevel' => localize('Skill Level'),
        'skills' => [
            'KeeperSkill' => localize('KeeperSkill'),
            'DefenderSkill' => localize('DefenderSkill'),
            'PlaymakerSkill' => localize('PlaymakerSkill'),
            'PassingSkill' => localize('PassingSkill'),
            'WingerSkill' => localize('WingerSkill'),
            'ScorerSkill' => localize('ScorerSkill'),
        ],
        'levels' => array_values($localizedSkills),
    ];
echo localizeJavascript();
?>
      WageWizard.MinimumWageTableLabels = <?= json_encode($minimumWageTableLabels, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?>;
    </script>
  </body>
</html>
