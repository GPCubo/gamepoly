import type { GameCard } from "~/types/board";

export const CHANCE_CARDS_EN: GameCard[] = [
  { id: "ch01", group: "chance", text: "Advance to {tileName}. Collect $200.", action: "moveTo", tileIndex: 0 },
  { id: "ch02", group: "chance", text: "Advance to {tileName}.", action: "moveTo", tileIndex: 11 },
  { id: "ch03", group: "chance", text: "Advance to {tileName}.", action: "moveTo", tileIndex: 8 },
  { id: "ch04", group: "chance", text: "Advance to {tileName}.", action: "moveTo", tileIndex: 5 },
  { id: "ch05", group: "chance", text: "Advance to {tileName}.", action: "moveTo", tileIndex: 25 },
  { id: "ch06", group: "chance", text: "Go back 3 spaces.", action: "moveSteps", amount: -3 },
  { id: "ch07", group: "chance", text: "Go to {tileName}. Do not pass GO.", action: "goToJail", tileIndex: 10 },
  { id: "ch08", group: "chance", text: "Collect $50 from the bank.", action: "collect", amount: 50 },
  { id: "ch09", group: "chance", text: "Collect $150 from the bank.", action: "collect", amount: 150 },
  { id: "ch10", group: "chance", text: "Pay a $50 fine.", action: "pay", amount: 50 },
  { id: "ch11", group: "chance", text: "Pay a $100 fine.", action: "pay", amount: 100 },
  { id: "ch12", group: "chance", text: "Pay each player $25.", action: "payEach", amount: 25 },
  { id: "ch13", group: "chance", text: "Your investments pay off. Collect $100.", action: "collect", amount: 100 },
  { id: "ch14", group: "chance", text: "Advance to {tileName}.", action: "moveTo", tileIndex: 24 },
  { id: "ch15", group: "chance", text: "Advance to {tileName}.", action: "moveTo", tileIndex: 34 },
  { id: "ch16", group: "chance", text: "Bank pays you dividends: $20.", action: "collect", amount: 20 },
];

export const COMMUNITY_CARDS_EN: GameCard[] = [
  { id: "co01", group: "community", text: "Advance to {tileName}. Collect $200.", action: "moveTo", tileIndex: 0 },
  { id: "co02", group: "community", text: "Bank error in your favor. Collect $200.", action: "collect", amount: 200 },
  { id: "co03", group: "community", text: "Medical expenses. Pay $50.", action: "pay", amount: 50 },
  { id: "co04", group: "community", text: "Doctor's fees. Pay $100.", action: "pay", amount: 100 },
  { id: "co05", group: "community", text: "Pay each player $50 for a gala dinner.", action: "payEach", amount: 50 },
  { id: "co06", group: "community", text: "Collect $45 interest from your investments.", action: "collect", amount: 45 },
  { id: "co07", group: "community", text: "Go to {tileName}. Do not pass GO.", action: "goToJail", tileIndex: 10 },
  { id: "co08", group: "community", text: "Inheritance: collect $100.", action: "collect", amount: 100 },
  { id: "co09", group: "community", text: "Collect $25 for consulting services.", action: "collect", amount: 25 },
  { id: "co10", group: "community", text: "Pay $75 school taxes.", action: "pay", amount: 75 },
  { id: "co11", group: "community", text: "Collect $10 in dividends.", action: "collect", amount: 10 },
  { id: "co12", group: "community", text: "It is your birthday. Collect $10 from each player.", action: "collect", amount: 10 },
  { id: "co13", group: "community", text: "Life insurance matures. Collect $100.", action: "collect", amount: 100 },
  { id: "co14", group: "community", text: "Pay $50 for hospitalization.", action: "pay", amount: 50 },
  { id: "co15", group: "community", text: "Pay $150 traffic fine.", action: "pay", amount: 150 },
  { id: "co16", group: "community", text: "You won a crossword contest. Collect $100.", action: "collect", amount: 100 },
];
