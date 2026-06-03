export type TileType =
  | "corner"
  | "property"
  | "card"
  | "tax"
  | "railroad"
  | "utility";

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
}

export const BOARD_TILES: BoardTile[] = [
  { index: 0, type: "corner", group: "go", name: "Salida" },
  {
    index: 1,
    type: "property",
    group: "brown",
    name: "Ronda de Arrieta",
    price: 60,
  },
  { index: 2, type: "card", group: "community", name: "Arca Comunal" },
  {
    index: 3,
    type: "property",
    group: "brown",
    name: "Plaza de Lavapies",
    price: 60,
  },
  {
    index: 4,
    type: "tax",
    group: "tax",
    name: "Impuesto s/Renta",
    shortName: "Impuesto",
  },
  {
    index: 5,
    type: "railroad",
    group: "railroad",
    name: "Estacion Norte",
    price: 200,
  },
  {
    index: 6,
    type: "property",
    group: "lightBlue",
    name: "Calle de la Montera",
    shortName: "La Montera",
    price: 100,
  },
  { index: 7, type: "card", group: "chance", name: "Suerte" },
  {
    index: 8,
    type: "property",
    group: "lightBlue",
    name: "Calle de Alcala",
    price: 100,
  },
  {
    index: 9,
    type: "property",
    group: "lightBlue",
    name: "Gran Via",
    price: 120,
  },
  {
    index: 10,
    type: "corner",
    group: "jail",
    name: "Carcel",
    shortName: "Carcel (Visita)",
  },
  {
    index: 11,
    type: "property",
    group: "pink",
    name: "Paseo del Prado",
    price: 140,
  },
  {
    index: 12,
    type: "utility",
    group: "utility",
    name: "Cia. Electrica",
    shortName: "Electrica",
    price: 150,
  },
  {
    index: 13,
    type: "property",
    group: "pink",
    name: "Calle de Serrano",
    price: 140,
  },
  {
    index: 14,
    type: "property",
    group: "pink",
    name: "Paseo de Recoletos",
    price: 160,
  },
  {
    index: 15,
    type: "railroad",
    group: "railroad",
    name: "Estacion Este",
    price: 200,
  },
  {
    index: 16,
    type: "property",
    group: "orange",
    name: "Calle de Goya",
    price: 180,
  },
  { index: 17, type: "card", group: "community", name: "Arca Comunal" },
  {
    index: 18,
    type: "property",
    group: "orange",
    name: "Calle de Velazquez",
    price: 180,
  },
  {
    index: 19,
    type: "property",
    group: "orange",
    name: "P. de la Castellana",
    shortName: "Castellana",
    price: 200,
  },
  {
    index: 20,
    type: "corner",
    group: "parking",
    name: "Parking Gratuito",
    shortName: "Parking",
  },
  {
    index: 21,
    type: "property",
    group: "red",
    name: "Plaza de Espana",
    price: 220,
  },
  { index: 22, type: "card", group: "chance", name: "Suerte" },
  {
    index: 23,
    type: "property",
    group: "red",
    name: "Calle de Fuencarral",
    shortName: "Fuencarral",
    price: 220,
  },
  {
    index: 24,
    type: "property",
    group: "red",
    name: "Paseo de la Reforma",
    shortName: "Reforma",
    price: 240,
  },
  {
    index: 25,
    type: "railroad",
    group: "railroad",
    name: "Estacion Sur",
    price: 200,
  },
  {
    index: 26,
    type: "property",
    group: "yellow",
    name: "Av. de America",
    shortName: "America",
    price: 260,
  },
  {
    index: 27,
    type: "property",
    group: "yellow",
    name: "Calle Bravo Murillo",
    shortName: "Bravo Murillo",
    price: 260,
  },
  {
    index: 28,
    type: "utility",
    group: "utility",
    name: "Cia. de Agua",
    shortName: "Agua",
    price: 150,
  },
  {
    index: 29,
    type: "property",
    group: "yellow",
    name: "Calle Alberto Aguilera",
    shortName: "Alberto Aguilera",
    price: 280,
  },
  {
    index: 30,
    type: "corner",
    group: "gotojail",
    name: "Ve a la Carcel",
    shortName: "Ve Carcel",
  },
  {
    index: 31,
    type: "property",
    group: "green",
    name: "Paseo de Gracia",
    price: 300,
  },
  {
    index: 32,
    type: "property",
    group: "green",
    name: "Rambla de Cataluna",
    price: 300,
  },
  { index: 33, type: "card", group: "community", name: "Arca Comunal" },
  {
    index: 34,
    type: "property",
    group: "green",
    name: "Avenida Diagonal",
    price: 320,
  },
  {
    index: 35,
    type: "railroad",
    group: "railroad",
    name: "Estacion Oeste",
    price: 200,
  },
  { index: 36, type: "card", group: "chance", name: "Suerte" },
  {
    index: 37,
    type: "property",
    group: "darkBlue",
    name: "Paseo de la Habana",
    shortName: "La Habana",
    price: 350,
  },
  {
    index: 38,
    type: "tax",
    group: "tax",
    name: "Impuesto de Lujo",
    shortName: "Lujo",
  },
  {
    index: 39,
    type: "property",
    group: "darkBlue",
    name: "Paseo del Arte",
    price: 400,
  },
];
