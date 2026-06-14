export type TileType =
  | "corner"
  | "property"
  | "card"
  | "tax"
  | "railroad"
  | "utility";

export type CardActionType =
  | "moveTo"
  | "moveSteps"
  | "collect"
  | "pay"
  | "payEach"
  | "goToJail";

export interface GameCard {
  id: string;
  group: "chance" | "community";
  text: string;
  action: CardActionType;
  amount?: number;
  tileIndex?: number;
}

export type TileGroup =
  | "go"
  | "brown"
  | "lightBlue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "darkBlue"
  | "railroad"
  | "utility"
  | "tax"
  | "chance"
  | "community"
  | "jail"
  | "parking"
  | "gotojail";

export interface BoardTile {
  index: number;
  type: TileType;
  group: TileGroup;
  name: string;
  shortName?: string;
  price?: number;
  color?: string;
}

export const BOARD_TILES: BoardTile[] = [
  { index: 0, type: "corner", group: "go", name: "Salida", color: "#28b463" },
  {
    index: 1,
    type: "property",
    group: "brown",
    name: "Ronda de Arrieta",
    price: 60,
    color: "#955436",
  },
  {
    index: 2,
    type: "card",
    group: "community",
    name: "Arca Comunal",
    color: "#3aa6e0",
  },
  {
    index: 3,
    type: "property",
    group: "brown",
    name: "Plaza de Lavapies",
    price: 60,
    color: "#955436",
  },
  {
    index: 4,
    type: "tax",
    group: "tax",
    name: "Impuesto s/Renta",
    shortName: "Impuesto",
    color: "#5a5a5a",
  },
  {
    index: 5,
    type: "railroad",
    group: "railroad",
    name: "Estacion Norte",
    price: 200,
    color: "#2b2b2b",
  },
  {
    index: 6,
    type: "property",
    group: "lightBlue",
    name: "Calle de la Montera",
    shortName: "La Montera",
    price: 100,
    color: "#aae0fa",
  },
  { index: 7, type: "card", group: "chance", name: "Suerte", color: "#f7941d" },
  {
    index: 8,
    type: "property",
    group: "lightBlue",
    name: "Calle de Alcala",
    price: 100,
    color: "#aae0fa",
  },
  {
    index: 9,
    type: "property",
    group: "lightBlue",
    name: "Gran Via",
    price: 120,
    color: "#aae0fa",
  },
  {
    index: 10,
    type: "corner",
    group: "jail",
    name: "Carcel",
    shortName: "Carcel",
    color: "#e67e22",
  },
  {
    index: 11,
    type: "property",
    group: "pink",
    name: "Paseo del Prado",
    price: 140,
    color: "#d93a96",
  },
  {
    index: 12,
    type: "utility",
    group: "utility",
    name: "Cia. Electrica",
    shortName: "Electrica",
    price: 150,
    color: "#9ed1a6",
  },
  {
    index: 13,
    type: "property",
    group: "pink",
    name: "Calle de Serrano",
    price: 140,
    color: "#d93a96",
  },
  {
    index: 14,
    type: "property",
    group: "pink",
    name: "Paseo de Recoletos",
    price: 160,
    color: "#d93a96",
  },
  {
    index: 15,
    type: "railroad",
    group: "railroad",
    name: "Estacion Este",
    price: 200,
    color: "#2b2b2b",
  },
  {
    index: 16,
    type: "property",
    group: "orange",
    name: "Calle de Goya",
    price: 180,
    color: "#f7941d",
  },
  {
    index: 17,
    type: "card",
    group: "community",
    name: "Arca Comunal",
    color: "#3aa6e0",
  },
  {
    index: 18,
    type: "property",
    group: "orange",
    name: "Calle de Velazquez",
    price: 180,
    color: "#f7941d",
  },
  {
    index: 19,
    type: "property",
    group: "orange",
    name: "P. de la Castellana",
    shortName: "Castellana",
    price: 200,
    color: "#f7941d",
  },
  {
    index: 20,
    type: "corner",
    group: "parking",
    name: "Parking Gratuito",
    shortName: "Parking",
    color: "#c0392b",
  },
  {
    index: 21,
    type: "property",
    group: "red",
    name: "Plaza de Espana",
    price: 220,
    color: "#ed1b24",
  },
  {
    index: 22,
    type: "card",
    group: "chance",
    name: "Suerte",
    color: "#f7941d",
  },
  {
    index: 23,
    type: "property",
    group: "red",
    name: "Calle de Fuencarral",
    shortName: "Fuencarral",
    price: 220,
    color: "#ed1b24",
  },
  {
    index: 24,
    type: "property",
    group: "red",
    name: "Paseo de la Reforma",
    shortName: "Reforma",
    price: 240,
    color: "#ed1b24",
  },
  {
    index: 25,
    type: "railroad",
    group: "railroad",
    name: "Estacion Sur",
    price: 200,
    color: "#2b2b2b",
  },
  {
    index: 26,
    type: "property",
    group: "yellow",
    name: "Av. de America",
    shortName: "America",
    price: 260,
    color: "#fef200",
  },
  {
    index: 27,
    type: "property",
    group: "yellow",
    name: "Calle Bravo Murillo",
    shortName: "Bravo Murillo",
    price: 260,
    color: "#fef200",
  },
  {
    index: 28,
    type: "utility",
    group: "utility",
    name: "Cia. de Agua",
    shortName: "Agua",
    price: 150,
    color: "#9ed1a6",
  },
  {
    index: 29,
    type: "property",
    group: "yellow",
    name: "Calle Alberto Aguilera",
    shortName: "Alberto Aguilera",
    price: 280,
    color: "#fef200",
  },
  {
    index: 30,
    type: "corner",
    group: "gotojail",
    name: "Ve a la Carcel",
    shortName: "Ve Carcel",
    color: "#922b21",
  },
  {
    index: 31,
    type: "property",
    group: "green",
    name: "Paseo de Gracia",
    price: 300,
    color: "#1fb25a",
  },
  {
    index: 32,
    type: "property",
    group: "green",
    name: "Rambla de Cataluna",
    price: 300,
    color: "#1fb25a",
  },
  {
    index: 33,
    type: "card",
    group: "community",
    name: "Arca Comunal",
    color: "#3aa6e0",
  },
  {
    index: 34,
    type: "property",
    group: "green",
    name: "Avenida Diagonal",
    price: 320,
    color: "#1fb25a",
  },
  {
    index: 35,
    type: "railroad",
    group: "railroad",
    name: "Estacion Oeste",
    price: 200,
    color: "#2b2b2b",
  },
  {
    index: 36,
    type: "card",
    group: "chance",
    name: "Suerte",
    color: "#f7941d",
  },
  {
    index: 37,
    type: "property",
    group: "darkBlue",
    name: "Paseo de la Habana",
    shortName: "La Habana",
    price: 350,
    color: "#0072bb",
  },
  {
    index: 38,
    type: "tax",
    group: "tax",
    name: "Impuesto de Lujo",
    shortName: "Lujo",
    color: "#5a5a5a",
  },
  {
    index: 39,
    type: "property",
    group: "darkBlue",
    name: "Paseo del Arte",
    price: 400,
    color: "#0072bb",
  },
];

export const CHANCE_CARDS: GameCard[] = [
  {
    id: "ch01",
    group: "chance",
    text: "Avanza a {tileName}. Cobra $200.",
    action: "moveTo",
    tileIndex: 0,
  },
  {
    id: "ch02",
    group: "chance",
    text: "Avanza a {tileName}.",
    action: "moveTo",
    tileIndex: 11,
  },
  {
    id: "ch03",
    group: "chance",
    text: "Avanza a {tileName}.",
    action: "moveTo",
    tileIndex: 8,
  },
  {
    id: "ch04",
    group: "chance",
    text: "Avanza a {tileName}.",
    action: "moveTo",
    tileIndex: 5,
  },
  {
    id: "ch05",
    group: "chance",
    text: "Avanza a {tileName}.",
    action: "moveTo",
    tileIndex: 25,
  },
  {
    id: "ch06",
    group: "chance",
    text: "Retrocede 3 casillas.",
    action: "moveSteps",
    amount: -3,
  },
  {
    id: "ch07",
    group: "chance",
    text: "Ve a {tileName}. No pases por la Salida.",
    action: "goToJail",
    tileIndex: 10,
  },
  {
    id: "ch08",
    group: "chance",
    text: "Cobra $50 del banco.",
    action: "collect",
    amount: 50,
  },
  {
    id: "ch09",
    group: "chance",
    text: "Cobra $150 del banco.",
    action: "collect",
    amount: 150,
  },
  {
    id: "ch10",
    group: "chance",
    text: "Paga $50 de multa.",
    action: "pay",
    amount: 50,
  },
  {
    id: "ch11",
    group: "chance",
    text: "Paga $100 de multa.",
    action: "pay",
    amount: 100,
  },
  {
    id: "ch12",
    group: "chance",
    text: "Paga $25 a cada jugador.",
    action: "payEach",
    amount: 25,
  },
  {
    id: "ch13",
    group: "chance",
    text: "Tus inversiones te dan frutos. Cobra $100.",
    action: "collect",
    amount: 100,
  },
  {
    id: "ch14",
    group: "chance",
    text: "Avanza a {tileName}.",
    action: "moveTo",
    tileIndex: 24,
  },
  {
    id: "ch15",
    group: "chance",
    text: "Avanza a {tileName}.",
    action: "moveTo",
    tileIndex: 34,
  },
  {
    id: "ch16",
    group: "chance",
    text: "Banco te paga dividendos: $20.",
    action: "collect",
    amount: 20,
  },
];

export const COMMUNITY_CARDS: GameCard[] = [
  {
    id: "co01",
    group: "community",
    text: "Avanza a {tileName}. Cobra $200.",
    action: "moveTo",
    tileIndex: 0,
  },
  {
    id: "co02",
    group: "community",
    text: "Error bancario a tu favor. Cobra $200.",
    action: "collect",
    amount: 200,
  },
  {
    id: "co03",
    group: "community",
    text: "Gastos médicos. Paga $50.",
    action: "pay",
    amount: 50,
  },
  {
    id: "co04",
    group: "community",
    text: "Gastos del médico. Paga $100.",
    action: "pay",
    amount: 100,
  },
  {
    id: "co05",
    group: "community",
    text: "Paga $50 a cada jugador por una cena de gala.",
    action: "payEach",
    amount: 50,
  },
  {
    id: "co06",
    group: "community",
    text: "Cobra $45 de intereses de tus inversiones.",
    action: "collect",
    amount: 45,
  },
  {
    id: "co07",
    group: "community",
    text: "Ve a {tileName}. No pases por la Salida.",
    action: "goToJail",
    tileIndex: 10,
  },
  {
    id: "co08",
    group: "community",
    text: "Herencia: cobra $100.",
    action: "collect",
    amount: 100,
  },
  {
    id: "co09",
    group: "community",
    text: "Cobra $25 por servicios consultivos.",
    action: "collect",
    amount: 25,
  },
  {
    id: "co10",
    group: "community",
    text: "Paga $75 por taxes de escuela.",
    action: "pay",
    amount: 75,
  },
  {
    id: "co11",
    group: "community",
    text: "Cobra $10 de dividendos.",
    action: "collect",
    amount: 10,
  },
  {
    id: "co12",
    group: "community",
    text: "Es tu cumpleaños. Cobra $10 de cada jugador.",
    action: "collect",
    amount: 10,
  },
  {
    id: "co13",
    group: "community",
    text: "Seguro de vida vence. Cobra $100.",
    action: "collect",
    amount: 100,
  },
  {
    id: "co14",
    group: "community",
    text: "Paga $50 por hospitalización.",
    action: "pay",
    amount: 50,
  },
  {
    id: "co15",
    group: "community",
    text: "Paga $150 por multa de tráfico.",
    action: "pay",
    amount: 150,
  },
  {
    id: "co16",
    group: "community",
    text: "Ganaste un concurso de crucigramas. Cobra $100.",
    action: "collect",
    amount: 100,
  },
];

export function shuffleDeck<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function resolveCardText(
  card: GameCard,
  tileNameResolver?: (index: number) => string,
): string {
  if (card.text.includes("{tileName}") && card.tileIndex !== undefined) {
    const name = tileNameResolver
      ? tileNameResolver(card.tileIndex)
      : BOARD_TILES[card.tileIndex]?.name ?? `casilla ${card.tileIndex}`;
    return card.text.replace("{tileName}", name);
  }
  return card.text;
}
