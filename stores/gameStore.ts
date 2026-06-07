import { defineStore } from "pinia";
import { GAME_CONFIG } from "~/config/gameConfig";
import {
  BOARD_TILES,
  CHANCE_CARDS,
  COMMUNITY_CARDS,
  shuffleDeck,
  resolveCardText,
  type BoardTile,
  type GameCard,
  type TileGroup,
} from "~/config/boardTilesConfig";

export interface PlayerConfig {
  name: string;
  tokenModel: string;
  startingCash?: number;
}

export interface PlayerState {
  id: number;
  name: string;
  tokenModel: string;
  position: number;
  isMoving: boolean;
  cash: number;
  inJail: boolean;
  jailTurns: number;
  consecutiveDoubles: number;
}

export interface MoveEvent {
  playerIndex: number;
  position: number;
}

export interface ExchangeProposal {
  fromPlayerId: number;
  toPlayerId: number;
  offerProperties: number[];
  offerMoney: number;
  requestProperties: number[];
  requestMoney: number;
}

export interface PropertyDevelopmentState {
  houses: number;
  hotel: boolean;
  mortgaged: boolean;
}

export interface GameState {
  phase: "setup" | "playing";
  players: PlayerState[];
  activePlayerIndex: number;
  isTurnComplete: boolean;
  moveEvent: MoveEvent | null;
  isDiceVisible: boolean;
  diceValues: [number, number];
  isDiceRolling: boolean;
  statusMessage: string;
  isCamFollowActive: boolean;
  goSalary: number;
  propertyOwners: Record<number, number>;
  propertyDevelopments: Record<number, PropertyDevelopmentState>;
  bankruptPlayers: number[];
  isAuctionActive: boolean;
  exchangeProposal: ExchangeProposal | null;
  canSkipBuy: boolean;
  doublesGiveExtraTurn: boolean;
  jailBailCost: number;
  chanceDeck: number[];
  communityDeck: number[];
  activeCard: GameCard | null;
  isDoubles: boolean;
}

const PROPERTY_COLOR_GROUPS = new Set<TileGroup>([
  "brown",
  "lightBlue",
  "pink",
  "orange",
  "red",
  "yellow",
  "green",
  "darkBlue",
]);

function roundToNearest10(value: number): number {
  return Math.round(value / 10) * 10;
}

function getOwnableTile(tileIndex: number): BoardTile | undefined {
  const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
  if (!tile || tile.price === undefined) return undefined;
  return tile;
}

function getPropertyGroupTiles(group: TileGroup): BoardTile[] {
  if (!PROPERTY_COLOR_GROUPS.has(group)) return [];
  return BOARD_TILES.filter(
    (tile) => tile.type === "property" && tile.group === group,
  );
}

export const useGameStore = defineStore("game", {
  state: (): GameState => ({
    phase: "setup",
    players: [],
    activePlayerIndex: 0,
    isTurnComplete: false,
    moveEvent: null,
    isDiceVisible: false,
    diceValues: [1, 1],
    isDiceRolling: false,
    statusMessage: "Configura la partida",
    isCamFollowActive: true,
    goSalary: GAME_CONFIG.GO_SALARY,
    propertyOwners: {},
    propertyDevelopments: {},
    bankruptPlayers: [],
    isAuctionActive: false,
    exchangeProposal: null,
    canSkipBuy: GAME_CONFIG.CAN_SKIP_BUY,
    doublesGiveExtraTurn: GAME_CONFIG.DOUBLES_GIVE_EXTRA_TURN,
    jailBailCost: GAME_CONFIG.JAIL_BAIL_COST,
    chanceDeck: [],
    communityDeck: [],
    activeCard: null,
    isDoubles: false,
  }),

  getters: {
    diceTotal: (state) => state.diceValues[0] + state.diceValues[1],
    activePlayer: (state) => state.players[state.activePlayerIndex] ?? null,
    casillaActual: (state) => {
      const p = state.players[state.activePlayerIndex];
      return p ? (p.position % 40) + 1 : 0;
    },
    isAnyMoving: (state) => state.players.some((p) => p.isMoving),
    activePlayers: (state) =>
      state.players.filter((p) => !state.bankruptPlayers.includes(p.id)),
    winner: (state): PlayerState | null => {
      if (state.phase !== "playing") return null;
      const alive = state.players.filter(
        (p) => !state.bankruptPlayers.includes(p.id),
      );
      return alive.length === 1 ? alive[0] : null;
    },
    hasAnyPropertyOwned: (state) => Object.keys(state.propertyOwners).length > 0,
    canExchange: (state) => {
      if (state.phase !== "playing") return false;
      const proposal = state.exchangeProposal;
      if (proposal) return false;
      return true;
    },
  },

  actions: {
    setupGame(configs: PlayerConfig[], options?: { goSalary?: number; canSkipBuy?: boolean; doublesGiveExtraTurn?: boolean }) {
      const defaultCash = GAME_CONFIG.STARTING_CASH;
      this.players = configs.map((c, idx) => ({
        id: idx,
        name: c.name,
        tokenModel: c.tokenModel,
        position: 0,
        isMoving: false,
        cash: c.startingCash ?? defaultCash,
        inJail: false,
        jailTurns: 0,
        consecutiveDoubles: 0,
      }));
      this.activePlayerIndex = 0;
      this.phase = "playing";
      this.isTurnComplete = false;
      this.goSalary = options?.goSalary ?? GAME_CONFIG.GO_SALARY;
      this.canSkipBuy = options?.canSkipBuy ?? GAME_CONFIG.CAN_SKIP_BUY;
      this.doublesGiveExtraTurn = options?.doublesGiveExtraTurn ?? GAME_CONFIG.DOUBLES_GIVE_EXTRA_TURN;
      this.chanceDeck = shuffleDeck(Array.from({ length: CHANCE_CARDS.length }, (_, i) => i));
      this.communityDeck = shuffleDeck(Array.from({ length: COMMUNITY_CARDS.length }, (_, i) => i));
      this.activeCard = null;
      this.isDoubles = false;
      this.statusMessage = `¡${configs[0].name} comienza!`;
      this.propertyOwners = {};
      this.propertyDevelopments = {};
      this.bankruptPlayers = [];
      this.isAuctionActive = false;
    },

    async moveCurrentPlayer(steps: number) {
      const p = this.players[this.activePlayerIndex];
      if (!p) return;

      p.isMoving = true;
      const startPosition = p.position;
      const target = p.position + steps;

      if (Math.floor(target / 40) > Math.floor(startPosition / 40)) {
        p.cash += this.goSalary;
        this.statusMessage = `¡${p.name} pasó por la Salida y cobró $${this.goSalary}!`;
      }

      for (let i = p.position + 1; i <= target; i++) {
        p.position = i;
        this.moveEvent = {
          playerIndex: this.activePlayerIndex,
          position: i,
        };
        await new Promise((r) => setTimeout(r, 300));
      }

      p.isMoving = false;
      p.inJail = false;
      p.jailTurns = 0;
      this.moveEvent = null;
      this.isTurnComplete = true;
    },

    finishTurn() {
      this.isTurnComplete = false;
      this.isDoubles = false;
      const current = this.players[this.activePlayerIndex];
      if (current) {
        current.consecutiveDoubles = 0;
      }
      const total = this.players.length;
      let next = (this.activePlayerIndex + 1) % total;
      let guard = 0;
      while (this.bankruptPlayers.includes(this.players[next].id) && guard < total) {
        next = (next + 1) % total;
        guard++;
      }
      this.activePlayerIndex = next;
      const tokenName =
        GAME_CONFIG.TOKEN_MODELS.find(
          (t) => t.file === this.players[this.activePlayerIndex].tokenModel,
        )?.name ?? "?";
      this.statusMessage = `¡Turno de ${this.players[this.activePlayerIndex].name} (${tokenName})!`;
    },

    finishTurnKeepPlayer() {
      this.isTurnComplete = false;
      this.isDoubles = false;
      const tokenName =
        GAME_CONFIG.TOKEN_MODELS.find(
          (t) => t.file === this.players[this.activePlayerIndex].tokenModel,
        )?.name ?? "?";
      this.statusMessage = `¡${this.players[this.activePlayerIndex].name} sacó dobles, tira de nuevo!`;
    },

    sendToJail(playerId: number) {
      const player = this.players.find((p) => p.id === playerId);
      if (!player) return;
      player.inJail = true;
      player.jailTurns = 0;
      player.position = 10;
      player.consecutiveDoubles = 0;
      this.moveEvent = {
        playerIndex: this.players.indexOf(player),
        position: 10,
      };
      this.statusMessage = `¡${player.name} va a la cárcel!`;
    },

    payJailBail(playerId: number) {
      const player = this.players.find((p) => p.id === playerId);
      if (!player || !player.inJail) return;
      player.cash -= this.jailBailCost;
      player.inJail = false;
      player.jailTurns = 0;
      this.statusMessage = `${player.name} pagó $${this.jailBailCost} de fianza y sale de la cárcel`;
      this._checkBankruptcy(playerId);
    },

    rollFromJail(): "freed" | "stayed" | "forced_free" {
      const player = this.players[this.activePlayerIndex];
      if (!player || !player.inJail) return "freed";

      const d1 = this.diceValues[0];
      const d2 = this.diceValues[1];
      const doubled = d1 === d2;

      if (doubled) {
        player.inJail = false;
        player.jailTurns = 0;
        player.consecutiveDoubles = 1;
        this.isDoubles = true;
        this.statusMessage = `¡${player.name} sacó dobles y sale de la cárcel!`;
        return "freed";
      }

      player.jailTurns++;
      if (player.jailTurns >= 3) {
        player.cash -= this.jailBailCost;
        player.inJail = false;
        player.jailTurns = 0;
        this.statusMessage = `${player.name} cumplió 3 turnos, sale pagando $${this.jailBailCost}`;
        this._checkBankruptcy(player.id);
        return "forced_free";
      }

      this.statusMessage = `${player.name} no sacó dobles. Turno en cárcel (${player.jailTurns}/3)`;
      return "stayed";
    },

    checkDoubles(): boolean {
      const d1 = this.diceValues[0];
      const d2 = this.diceValues[1];
      this.isDoubles = d1 === d2;

      if (!this.isDoubles || !this.doublesGiveExtraTurn) {
        const player = this.players[this.activePlayerIndex];
        if (player) player.consecutiveDoubles = 0;
        return false;
      }

      const player = this.players[this.activePlayerIndex];
      if (!player) return false;

      player.consecutiveDoubles++;

      if (player.consecutiveDoubles >= 3) {
        this.sendToJail(player.id);
        return false;
      }

      return true;
    },

    canActivePlayerRoll(): boolean {
      const player = this.activePlayer;
      if (!player) return false;
      if (player.isMoving || this.isDiceRolling || this.isTurnComplete) return false;
      return true;
    },

    buyProperty(tileIndex: number, playerId: number) {
      const tile = BOARD_TILES.find((t) => t.index === tileIndex);
      if (!tile || tile.price === undefined) return;
      const player = this.players.find((p) => p.id === playerId);
      if (!player) return;
      player.cash -= tile.price;
      this.propertyOwners[tileIndex] = playerId;
      this._ensurePropertyDevelopment(tileIndex);
      this.statusMessage = `${player.name} compró ${tile.name} por $${tile.price}`;
      this._checkBankruptcy(playerId);
    },

    buyAuctionedProperty(tileIndex: number, playerId: number, amount: number) {
      const tile = getOwnableTile(tileIndex);
      const player = this.players.find((p) => p.id === playerId);
      if (!tile || !player) return;

      player.cash -= amount;
      this.propertyOwners[tileIndex] = playerId;
      this._ensurePropertyDevelopment(tileIndex);
      this.statusMessage = `${player.name} ganó la subasta de ${tile.name} por $${amount}`;
      this._checkBankruptcy(playerId);
    },

    seedAllPropertiesForActivePlayer(cash: number) {
      const player = this.activePlayer;
      if (!player) return;

      player.cash = cash;

      for (const tile of BOARD_TILES) {
        if (tile.price === undefined) continue;
        this.propertyOwners[tile.index] = player.id;
        this._ensurePropertyDevelopment(tile.index);
      }

      this.statusMessage = `Escenario local activado. ${player.name} inicia con todas las propiedades y $${cash}`;
    },

    getPropertyDevelopment(tileIndex: number): PropertyDevelopmentState {
      return this.propertyDevelopments[tileIndex] ?? {
        houses: 0,
        hotel: false,
        mortgaged: false,
      };
    },

    getHouseCost(tileIndex: number): number {
      const tile = getOwnableTile(tileIndex);
      if (!tile) return 0;
      return roundToNearest10((tile.price ?? 0) * 0.5);
    },

    getHotelCost(tileIndex: number): number {
      const tile = getOwnableTile(tileIndex);
      if (!tile) return 0;
      return roundToNearest10((tile.price ?? 0) * 0.75);
    },

    getMortgageValue(tileIndex: number): number {
      const tile = getOwnableTile(tileIndex);
      if (!tile) return 0;
      return Math.round((tile.price ?? 0) / 2);
    },

    getUnmortgageCost(tileIndex: number): number {
      return roundToNearest10(this.getMortgageValue(tileIndex) * 1.1);
    },

    ownsFullPropertyGroup(tileIndex: number, playerId: number): boolean {
      const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
      if (!tile || tile.type !== "property") return false;

      const groupTiles = getPropertyGroupTiles(tile.group);
      if (groupTiles.length === 0) return false;
      return groupTiles.every((candidate) => this.propertyOwners[candidate.index] === playerId);
    },

    hasMortgagedPropertyInColorGroup(tileIndex: number): boolean {
      const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
      if (!tile || tile.type !== "property") return false;

      return getPropertyGroupTiles(tile.group).some(
        (candidate) => this.getPropertyDevelopment(candidate.index).mortgaged,
      );
    },

    hasImprovementInColorGroup(tileIndex: number): boolean {
      const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
      if (!tile || tile.type !== "property") return false;

      return getPropertyGroupTiles(tile.group).some((candidate) => {
        const development = this.getPropertyDevelopment(candidate.index);
        return development.hotel || development.houses > 0;
      });
    },

    canBuildHouse(tileIndex: number, playerId: number): boolean {
      const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
      const player = this.players.find((candidate) => candidate.id === playerId);
      if (!tile || tile.type !== "property" || !player) return false;
      if (this.propertyOwners[tileIndex] !== playerId) return false;
      if (!this.ownsFullPropertyGroup(tileIndex, playerId)) return false;
      if (this.hasMortgagedPropertyInColorGroup(tileIndex)) return false;

      const development = this.getPropertyDevelopment(tileIndex);
      if (development.mortgaged || development.hotel || development.houses >= 4) return false;
      const nextHouseLevel = development.houses + 1;
      const groupTiles = getPropertyGroupTiles(tile.group);
      const canBuildEvenly = groupTiles.every((candidate) => {
        if (candidate.index === tileIndex) return true;
        const candidateDevelopment = this.getPropertyDevelopment(candidate.index);
        const candidateLevel = candidateDevelopment.hotel ? 5 : candidateDevelopment.houses;
        return candidateLevel >= nextHouseLevel - 1;
      });
      if (!canBuildEvenly) return false;
      return player.cash >= this.getHouseCost(tileIndex);
    },

    canBuildHotel(tileIndex: number, playerId: number): boolean {
      const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
      const player = this.players.find((candidate) => candidate.id === playerId);
      if (!tile || tile.type !== "property" || !player) return false;
      if (this.propertyOwners[tileIndex] !== playerId) return false;
      if (!this.ownsFullPropertyGroup(tileIndex, playerId)) return false;
      if (this.hasMortgagedPropertyInColorGroup(tileIndex)) return false;

      const development = this.getPropertyDevelopment(tileIndex);
      if (development.mortgaged || development.hotel || development.houses < 4) return false;
      const groupTiles = getPropertyGroupTiles(tile.group);
      const canBuildEvenly = groupTiles.every((candidate) => {
        if (candidate.index === tileIndex) return true;
        const candidateDevelopment = this.getPropertyDevelopment(candidate.index);
        return candidateDevelopment.hotel || candidateDevelopment.houses >= 4;
      });
      if (!canBuildEvenly) return false;
      return player.cash >= this.getHotelCost(tileIndex);
    },

    canSellImprovement(tileIndex: number, playerId: number): boolean {
      if (this.propertyOwners[tileIndex] !== playerId) return false;
      const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
      if (!tile || tile.type !== "property") return false;
      const development = this.getPropertyDevelopment(tileIndex);
      if (!development.hotel && development.houses <= 0) return false;

      const currentLevel = development.hotel ? 5 : development.houses;
      const nextLevel = development.hotel ? 4 : development.houses - 1;
      const groupTiles = getPropertyGroupTiles(tile.group);
      return groupTiles.every((candidate) => {
        if (candidate.index === tileIndex) return true;
        const candidateDevelopment = this.getPropertyDevelopment(candidate.index);
        const candidateLevel = candidateDevelopment.hotel
          ? 5
          : candidateDevelopment.houses;
        return candidateLevel <= currentLevel && candidateLevel <= nextLevel + 1;
      });
    },

    canMortgageProperty(tileIndex: number, playerId: number): boolean {
      const tile = getOwnableTile(tileIndex);
      if (!tile) return false;
      if (this.propertyOwners[tileIndex] !== playerId) return false;
      const development = this.getPropertyDevelopment(tileIndex);
      if (development.mortgaged) return false;
      if (tile.type === "property" && this.hasImprovementInColorGroup(tileIndex)) return false;
      return true;
    },

    canUnmortgageProperty(tileIndex: number, playerId: number): boolean {
      const tile = getOwnableTile(tileIndex);
      const player = this.players.find((candidate) => candidate.id === playerId);
      if (!tile || !player) return false;
      if (this.propertyOwners[tileIndex] !== playerId) return false;
      if (!this.getPropertyDevelopment(tileIndex).mortgaged) return false;
      return player.cash >= this.getUnmortgageCost(tileIndex);
    },

    buildHouse(tileIndex: number, playerId: number) {
      if (!this.canBuildHouse(tileIndex, playerId)) return;
      const player = this.players.find((candidate) => candidate.id === playerId);
      const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
      if (!player || !tile) return;

      const cost = this.getHouseCost(tileIndex);
      const development = this._ensurePropertyDevelopment(tileIndex);
      player.cash -= cost;
      development.houses = Math.min(4, development.houses + 1);
      development.hotel = false;
      this.statusMessage = `${player.name} construyó una casa en ${tile.name} por $${cost}`;
      this._checkBankruptcy(playerId);
    },

    buildHotel(tileIndex: number, playerId: number) {
      if (!this.canBuildHotel(tileIndex, playerId)) return;
      const player = this.players.find((candidate) => candidate.id === playerId);
      const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
      if (!player || !tile) return;

      const cost = this.getHotelCost(tileIndex);
      const development = this._ensurePropertyDevelopment(tileIndex);
      player.cash -= cost;
      development.houses = 0;
      development.hotel = true;
      this.statusMessage = `${player.name} amplió ${tile.name} a hotel por $${cost}`;
      this._checkBankruptcy(playerId);
    },

    sellImprovement(tileIndex: number, playerId: number) {
      if (!this.canSellImprovement(tileIndex, playerId)) return;
      const player = this.players.find((candidate) => candidate.id === playerId);
      const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
      if (!player || !tile) return;

      const development = this._ensurePropertyDevelopment(tileIndex);
      if (development.hotel) {
        const refund = Math.round(this.getHotelCost(tileIndex) / 2);
        development.hotel = false;
        development.houses = 4;
        player.cash += refund;
        this.statusMessage = `${player.name} vendió el hotel de ${tile.name} por $${refund}`;
        return;
      }

      if (development.houses > 0) {
        const refund = Math.round(this.getHouseCost(tileIndex) / 2);
        development.houses = Math.max(0, development.houses - 1);
        development.hotel = false;
        player.cash += refund;
        this.statusMessage = `${player.name} vendió una casa de ${tile.name} por $${refund}`;
      }
    },

    mortgageProperty(tileIndex: number, playerId: number) {
      if (!this.canMortgageProperty(tileIndex, playerId)) return;
      const player = this.players.find((candidate) => candidate.id === playerId);
      const tile = getOwnableTile(tileIndex);
      if (!player || !tile) return;

      const value = this.getMortgageValue(tileIndex);
      const development = this._ensurePropertyDevelopment(tileIndex);
      development.mortgaged = true;
      player.cash += value;
      this.statusMessage = `${player.name} hipotecó ${tile.name} y recibió $${value}`;
    },

    unmortgageProperty(tileIndex: number, playerId: number) {
      if (!this.canUnmortgageProperty(tileIndex, playerId)) return;
      const player = this.players.find((candidate) => candidate.id === playerId);
      const tile = getOwnableTile(tileIndex);
      if (!player || !tile) return;

      const cost = this.getUnmortgageCost(tileIndex);
      const development = this._ensurePropertyDevelopment(tileIndex);
      development.mortgaged = false;
      player.cash -= cost;
      this.statusMessage = `${player.name} levantó la hipoteca de ${tile.name} por $${cost}`;
      this._checkBankruptcy(playerId);
    },

    calculateRent(tile: BoardTile, ownerId: number): number {
      const development = this.getPropertyDevelopment(tile.index);
      if (development.mortgaged) return 0;

      if (tile.type === "railroad") {
        const count = BOARD_TILES.filter(
          (t) =>
            t.type === "railroad" &&
            this.propertyOwners[t.index] === ownerId &&
            !this.getPropertyDevelopment(t.index).mortgaged,
        ).length;
        return 25 * count;
      }

      if (tile.type === "utility") {
        const count = BOARD_TILES.filter(
          (t) =>
            t.type === "utility" &&
            this.propertyOwners[t.index] === ownerId &&
            !this.getPropertyDevelopment(t.index).mortgaged,
        ).length;
        return this.diceTotal * (count >= 2 ? 10 : 4);
      }

      if (tile.type !== "property") return 0;

      const baseRent = Math.floor((tile.price ?? 0) * 0.1);
      if (development.hotel) return baseRent * 10;
      if (development.houses > 0) return baseRent * (1 + development.houses * 2);
      return baseRent;
    },

    collectRent(fromPlayerId: number, toPlayerId: number, amount: number) {
      const payer = this.players.find((p) => p.id === fromPlayerId);
      const receiver = this.players.find((p) => p.id === toPlayerId);
      if (!payer || !receiver || amount <= 0) return;
      payer.cash -= amount;
      receiver.cash += amount;
      this.statusMessage = `${payer.name} pagó $${amount} de alquiler a ${receiver.name}`;
      this._checkBankruptcy(fromPlayerId);
    },

    payTax(playerId: number, amount: number) {
      const player = this.players.find((p) => p.id === playerId);
      if (!player) return;
      player.cash -= amount;
      this.statusMessage = `${player.name} pagó $${amount} de impuesto`;
      this._checkBankruptcy(playerId);
    },

    declareBankruptcy(playerId: number) {
      if (this.bankruptPlayers.includes(playerId)) return;
      this.bankruptPlayers.push(playerId);
      for (const key in this.propertyOwners) {
        if (this.propertyOwners[Number(key)] === playerId) {
          delete this.propertyOwners[Number(key)];
          delete this.propertyDevelopments[Number(key)];
        }
      }
      const player = this.players.find((p) => p.id === playerId);
      this.statusMessage = `¡${player?.name ?? "Jugador"} ha quebrado y es eliminado!`;
    },

    _checkBankruptcy(playerId: number) {
      const player = this.players.find((p) => p.id === playerId);
      if (!player || this.bankruptPlayers.includes(playerId)) return;
      if (player.cash < 0) this.declareBankruptcy(playerId);
    },

    _ensurePropertyDevelopment(tileIndex: number): PropertyDevelopmentState {
      if (!this.propertyDevelopments[tileIndex]) {
        this.propertyDevelopments[tileIndex] = {
          houses: 0,
          hotel: false,
          mortgaged: false,
        };
      }
      return this.propertyDevelopments[tileIndex];
    },

    drawCard(group: "chance" | "community") {
      const deck = group === "chance" ? this.chanceDeck : this.communityDeck;
      const cards = group === "chance" ? CHANCE_CARDS : COMMUNITY_CARDS;

      if (deck.length === 0) {
        const newDeck = shuffleDeck(Array.from({ length: cards.length }, (_, i) => i));
        if (group === "chance") {
          this.chanceDeck = newDeck;
        } else {
          this.communityDeck = newDeck;
        }
      }

      const currentDeck = group === "chance" ? this.chanceDeck : this.communityDeck;
      const index = currentDeck.shift()!;
      this.activeCard = { ...cards[index], text: resolveCardText(cards[index]) };

      if (group === "chance") {
        this.chanceDeck.push(index);
      } else {
        this.communityDeck.push(index);
      }
    },

    async applyCardEffect(): Promise<boolean> {
      const card = this.activeCard;
      if (!card) return false;

      const player = this.players[this.activePlayerIndex];
      if (!player) return false;

      let movedPosition = false;

      switch (card.action) {
        case "moveTo": {
          movedPosition = true;
          this.isTurnComplete = false;
          const target = card.tileIndex ?? 0;
          const currentPos = player.position % 40;
          const steps = target > currentPos
            ? target - currentPos
            : (40 - currentPos) + target;
          await this.moveCurrentPlayer(steps);
          break;
        }
        case "moveSteps": {
          const steps = card.amount ?? 1;
          if (steps > 0) {
            movedPosition = true;
            this.isTurnComplete = false;
            await this.moveCurrentPlayer(steps);
          } else if (steps < 0) {
            movedPosition = true;
            this.isTurnComplete = false;
            player.position += steps;
            if (player.position < 0) player.position += 40;
            this.moveEvent = {
              playerIndex: this.activePlayerIndex,
              position: player.position,
            };
            this.statusMessage = `${player.name} retrocede ${Math.abs(steps)} casillas`;
            this.isTurnComplete = true;
          }
          break;
        }
        case "collect": {
          player.cash += card.amount ?? 0;
          this.statusMessage = `${player.name} cobra $${card.amount ?? 0}`;
          break;
        }
        case "pay": {
          player.cash -= card.amount ?? 0;
          this.statusMessage = `${player.name} paga $${card.amount ?? 0}`;
          this._checkBankruptcy(player.id);
          break;
        }
        case "payEach": {
          const amount = card.amount ?? 0;
          const otherPlayers = this.players.filter(
            (p) => p.id !== player.id && !this.bankruptPlayers.includes(p.id),
          );
          const totalPay = amount * otherPlayers.length;
          player.cash -= totalPay;
          for (const other of otherPlayers) {
            other.cash += amount;
          }
          this.statusMessage = `${player.name} paga $${amount} a cada jugador ($${totalPay} total)`;
          this._checkBankruptcy(player.id);
          break;
        }
        case "goToJail": {
          movedPosition = true;
          this.isTurnComplete = false;
          this.sendToJail(player.id);
          this.isTurnComplete = true;
          break;
        }
      }

      this.activeCard = null;
      return movedPosition;
    },

    showDice() {
      this.isDiceVisible = true;
      this.isDiceRolling = true;
      this.diceValues = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ];
    },

    hideDice() {
      this.isDiceVisible = false;
    },

    finishDiceRoll() {
      this.isDiceRolling = false;
    },

    toggleCameraFollow() {
      this.isCamFollowActive = !this.isCamFollowActive;
    },

    setStatusMessage(msg: string) {
      this.statusMessage = msg;
    },

    startExchange(proposal: ExchangeProposal) {
      const from = this.players.find((p) => p.id === proposal.fromPlayerId);
      const to = this.players.find((p) => p.id === proposal.toPlayerId);
      if (!from || !to) return;

      for (const tileIdx of proposal.offerProperties) {
        if (this.propertyOwners[tileIdx] !== proposal.fromPlayerId) return;
      }
      for (const tileIdx of proposal.requestProperties) {
        if (this.propertyOwners[tileIdx] !== proposal.toPlayerId) return;
      }
      if (proposal.offerMoney < 0 || proposal.requestMoney < 0) return;
      if (proposal.offerMoney > from.cash) return;

      this.exchangeProposal = proposal;
    },

    respondExchange(accepted: boolean) {
      const proposal = this.exchangeProposal;
      if (!proposal) return;

      if (accepted) {
        const from = this.players.find((p) => p.id === proposal.fromPlayerId);
        const to = this.players.find((p) => p.id === proposal.toPlayerId);
        if (!from || !to) {
          this.exchangeProposal = null;
          return;
        }

        if (proposal.offerMoney > from.cash || proposal.requestMoney > to.cash) {
          this.exchangeProposal = null;
          this.statusMessage = "Intercambio cancelado: fondos insuficientes";
          return;
        }

        for (const tileIdx of proposal.offerProperties) {
          if (this.propertyOwners[tileIdx] !== proposal.fromPlayerId) {
            this.exchangeProposal = null;
            this.statusMessage = "Intercambio cancelado: propiedades cambiadas";
            return;
          }
        }
        for (const tileIdx of proposal.requestProperties) {
          if (this.propertyOwners[tileIdx] !== proposal.toPlayerId) {
            this.exchangeProposal = null;
            this.statusMessage = "Intercambio cancelado: propiedades cambiadas";
            return;
          }
        }

        for (const tileIdx of proposal.offerProperties) {
          this.propertyOwners[tileIdx] = proposal.toPlayerId;
        }
        for (const tileIdx of proposal.requestProperties) {
          this.propertyOwners[tileIdx] = proposal.fromPlayerId;
        }

        from.cash -= proposal.offerMoney;
        from.cash += proposal.requestMoney;
        to.cash -= proposal.requestMoney;
        to.cash += proposal.offerMoney;

        this._checkBankruptcy(from.id);
        this._checkBankruptcy(to.id);

        this.statusMessage = `Intercambio realizado entre ${from.name} y ${to.name}`;
      } else {
        this.statusMessage = "Intercambio rechazado";
      }

      this.exchangeProposal = null;
    },

    cancelExchange() {
      this.exchangeProposal = null;
    },
  },
});
