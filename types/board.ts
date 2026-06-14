export type TileType = "corner" | "property" | "card" | "tax" | "railroad" | "utility";

export type TileGroup =
  | "go" | "brown" | "lightBlue" | "pink" | "orange" | "red"
  | "yellow" | "green" | "darkBlue" | "railroad" | "utility"
  | "tax" | "chance" | "community" | "jail" | "parking" | "gotojail";

export type CardActionType =
  | "moveTo" | "moveSteps" | "collect" | "pay" | "payEach" | "goToJail";

export interface BoardTile {
  index: number;
  type: TileType;
  group: TileGroup;
  name: string;
  shortName?: string;
  price?: number;
  color?: string;
}

export interface GameCard {
  id: string;
  group: string;
  text: string;
  action: CardActionType;
  amount?: number;
  tileIndex?: number;
}
