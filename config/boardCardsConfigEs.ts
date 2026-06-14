import type { GameCard } from "~/types/board";

export const CHANCE_CARDS_ES: GameCard[] = [
  { id: "ch01", group: "chance", text: "Avanza a {tileName}. Cobra $200.", action: "moveTo", tileIndex: 0 },
  { id: "ch02", group: "chance", text: "Avanza a {tileName}.", action: "moveTo", tileIndex: 11 },
  { id: "ch03", group: "chance", text: "Avanza a {tileName}.", action: "moveTo", tileIndex: 8 },
  { id: "ch04", group: "chance", text: "Avanza a {tileName}.", action: "moveTo", tileIndex: 5 },
  { id: "ch05", group: "chance", text: "Avanza a {tileName}.", action: "moveTo", tileIndex: 25 },
  { id: "ch06", group: "chance", text: "Retrocede 3 casillas.", action: "moveSteps", amount: -3 },
  { id: "ch07", group: "chance", text: "Ve a {tileName}. No pases por la Salida.", action: "goToJail", tileIndex: 10 },
  { id: "ch08", group: "chance", text: "Cobra $50 del banco.", action: "collect", amount: 50 },
  { id: "ch09", group: "chance", text: "Cobra $150 del banco.", action: "collect", amount: 150 },
  { id: "ch10", group: "chance", text: "Paga $50 de multa.", action: "pay", amount: 50 },
  { id: "ch11", group: "chance", text: "Paga $100 de multa.", action: "pay", amount: 100 },
  { id: "ch12", group: "chance", text: "Paga $25 a cada jugador.", action: "payEach", amount: 25 },
  { id: "ch13", group: "chance", text: "Tus inversiones te dan frutos. Cobra $100.", action: "collect", amount: 100 },
  { id: "ch14", group: "chance", text: "Avanza a {tileName}.", action: "moveTo", tileIndex: 24 },
  { id: "ch15", group: "chance", text: "Avanza a {tileName}.", action: "moveTo", tileIndex: 34 },
  { id: "ch16", group: "chance", text: "Banco te paga dividendos: $20.", action: "collect", amount: 20 },
];

export const COMMUNITY_CARDS_ES: GameCard[] = [
  { id: "co01", group: "community", text: "Avanza a {tileName}. Cobra $200.", action: "moveTo", tileIndex: 0 },
  { id: "co02", group: "community", text: "Error bancario a tu favor. Cobra $200.", action: "collect", amount: 200 },
  { id: "co03", group: "community", text: "Gastos medicos. Paga $50.", action: "pay", amount: 50 },
  { id: "co04", group: "community", text: "Gastos del medico. Paga $100.", action: "pay", amount: 100 },
  { id: "co05", group: "community", text: "Paga $50 a cada jugador por una cena de gala.", action: "payEach", amount: 50 },
  { id: "co06", group: "community", text: "Cobra $45 de intereses de tus inversiones.", action: "collect", amount: 45 },
  { id: "co07", group: "community", text: "Ve a {tileName}. No pases por la Salida.", action: "goToJail", tileIndex: 10 },
  { id: "co08", group: "community", text: "Herencia: cobra $100.", action: "collect", amount: 100 },
  { id: "co09", group: "community", text: "Cobra $25 por servicios consultivos.", action: "collect", amount: 25 },
  { id: "co10", group: "community", text: "Paga $75 por taxes de escuela.", action: "pay", amount: 75 },
  { id: "co11", group: "community", text: "Cobra $10 de dividendos.", action: "collect", amount: 10 },
  { id: "co12", group: "community", text: "Es tu cumpleanos. Cobra $10 de cada jugador.", action: "collect", amount: 10 },
  { id: "co13", group: "community", text: "Seguro de vida vence. Cobra $100.", action: "collect", amount: 100 },
  { id: "co14", group: "community", text: "Paga $50 por hospitalizacion.", action: "pay", amount: 50 },
  { id: "co15", group: "community", text: "Paga $150 por multa de trafico.", action: "pay", amount: 150 },
  { id: "co16", group: "community", text: "Ganaste un concurso de crucigramas. Cobra $100.", action: "collect", amount: 100 },
];
