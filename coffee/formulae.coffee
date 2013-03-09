"use strict"
window.WageWizard = window.WageWizard || {}
WageWizard = window.WageWizard

WageWizard.MAP_HATTRICK_SKILLS =
  Keeper: 'KeeperSkill'
  Defending: 'DefenderSkill'
  Playmaking: 'PlaymakerSkill'
  Passing: 'PassingSkill'
  Winger: 'WingerSkill'
  Scoring: 'ScorerSkill'
  SetPieces: 'SetPiecesSkill'

WageWizard.FORMULAE =
  Keeper:
    a: 0.0005010000
    b: 6.4000000000
    c: 0.50
    d: 1
  Defending:
    a: 0.0007107782
    b: 6.4631407136
    c: 0.50
    d: 0.7908
  Playmaking:
    a: 0.0009193936
    b: 6.4521801940
    c: 0.50
    d: 0.7762
  Passing:
    a: 0.0005546901
    b: 6.4374619273
    c: 0.50
    d: 0.8830
  Winger:
    a: 0.0004312358
    b: 6.4774737732
    c: 0.50
    d: 0.7778
  Scoring:
    a: 0.0008983969
    b: 6.4171590563
    c: 0.50
    d: 0.7917
