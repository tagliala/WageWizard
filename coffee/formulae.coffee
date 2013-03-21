"use strict"
window.WageWizard = window.WageWizard || {}
WageWizard = window.WageWizard

# Sorted by wage component, so it will help to
# identify primary skill
WageWizard.HATTRICK_SKILLS = [
  'SetPiecesSkill'
  'KeeperSkill'
  'WingerSkill'
  'PassingSkill'
  'DefenderSkill'
  'ScorerSkill'
  'PlaymakerSkill'
  ]

WageWizard.DISCOUNT_RATE = 0.5

WageWizard.KEEPER_FORMULA = [
  250
  270
  350
  450
  610
  830
  1150
  1610
  2250
  3190
  4550
  6470
  9190
  13010
  18130
  24270
  31720
  41150
  53840
  68960
]

WageWizard.FORMULAE =
  DefenderSkill:
    a: 0.0007107782
    b: 6.4631407136
    d: 0.7908
  PlaymakerSkill:
    a: 0.0009193936
    b: 6.4521801940
    d: 0.7762
  PassingSkill:
    a: 0.0005552801
    b: 6.4335763954
    d: 0.9002
  WingerSkill:
    a: 0.0004312358
    b: 6.4774737732
    d: 0.7778
  ScorerSkill:
    a: 0.0009015187
    b: 6.4153497279
    d: 0.7935
