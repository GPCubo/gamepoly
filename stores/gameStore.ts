import { defineStore } from "pinia";
import { tStore } from "~/composables/useI18n";
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
import {
  houseCostForPrice,
  hotelCostForPrice,
  mortgageValueForPrice,
  unmortgageCostForPrice,
  rentForDevelopment,
} from "~/config/economyConfig";

export type BotDifficulty = "regular" | "difficult";

export interface PlayerConfig {
  name: string;
  tokenModel: string;
  startingCash?: number;
  isBot?: boolean;
  botDifficulty?: BotDifficulty | null;
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
  isBot: boolean;
  botDifficulty: BotDifficulty | null;
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
  renegotiationCount?: number;
}

export interface PropertyDevelopmentState {
  houses: number;
  hotel: boolean;
  mortgaged: boolean;
}

export type EconomicHistoryType =
  | "purchase"
  | "auction"
  | "mortgage"
  | "card_gain"
  | "card_loss"
  | "tax"
  | "rent"
  | "exchange";

export interface EconomicHistoryItem {
  id: number;
  type: EconomicHistoryType;
  title: string;
  detail: string;
  titleKey?: string;
  detailKey?: string;
  params?: Record<string, string | number>;
  amount?: number;
  playerIds: number[];
  createdAt: number;
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
  auctionOnly: boolean;
  doublesGiveExtraTurn: boolean;
  jailBailCost: number;
  chanceDeck: number[];
  communityDeck: number[];
  activeCard: GameCard | null;
  isDoubles: boolean;
  skipMovementRequested: boolean;
  forceAllDiceRollsAsDoubles: boolean;
  forceAllDiceRollsToCards: boolean;
  isBotThinking: boolean;
  botActionMessage: string;
  economicHistory: EconomicHistoryItem[];
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

const CARD_TILE_INDEXES = BOARD_TILES.filter((tile) => tile.type === "card")
  .map((tile) => tile.index)
  .sort((a, b) => a - b);

function normalizeBoardPosition(position: number): number {
  return ((position % 40) + 40) % 40;
}

function stepsToNextCardTile(position: number): number {
  const current = normalizeBoardPosition(position);
  return Math.min(
    ...CARD_TILE_INDEXES.map((index) =>
      index > current ? index - current : 40 - current + index,
    ),
  );
}

function diceValuesForTotal(total: number): [number, number] {
  const pairs: Record<number, [number, number]> = {
    2: [1, 1],
    3: [1, 2],
    4: [1, 3],
    5: [2, 3],
    6: [1, 5],
    7: [3, 4],
    8: [3, 5],
    9: [4, 5],
    10: [4, 6],
    11: [5, 6],
    12: [6, 6],
  };

  return pairs[total] ?? [1, 1];
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

function developmentLevel(development: PropertyDevelopmentState): number {
  return development.hotel ? 5 : development.houses;
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
    auctionOnly: GAME_CONFIG.AUCTION_ONLY,
    doublesGiveExtraTurn: GAME_CONFIG.DOUBLES_GIVE_EXTRA_TURN,
    jailBailCost: GAME_CONFIG.JAIL_BAIL_COST,
    chanceDeck: [],
    communityDeck: [],
    activeCard: null,
    isDoubles: false,
    skipMovementRequested: false,
    forceAllDiceRollsAsDoubles: false,
    forceAllDiceRollsToCards: false,
    isBotThinking: false,
    botActionMessage: "",
    economicHistory: [],
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
    hasAnyPropertyOwned: (state) =>
      Object.keys(state.propertyOwners).length > 0,
    canExchange: (state) => {
      if (state.phase !== "playing") return false;
      const proposal = state.exchangeProposal;
      if (proposal) return false;
      return true;
    },
    isCurrentPlayerBot: (state) => {
      const player = state.players[state.activePlayerIndex];
      return player?.isBot ?? false;
    },
    activeBotDifficulty: (state) => {
      const player = state.players[state.activePlayerIndex];
      if (!player?.isBot) return null;
      return player.botDifficulty;
    },
    hasAnyBot: (state) => state.players.some((p) => p.isBot),
    hasAny_human: (state) => state.players.some((p) => !p.isBot),
  },

  actions: {
    setupGame(
      configs: PlayerConfig[],
      options?: {
        goSalary?: number;
        canSkipBuy?: boolean;
        auctionOnly?: boolean;
        doublesGiveExtraTurn?: boolean;
      },
    ) {
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
        isBot: c.isBot ?? false,
        botDifficulty: c.botDifficulty ?? null,
      }));
      this.activePlayerIndex = 0;
      this.phase = "playing";
      this.isTurnComplete = false;
      this.goSalary = options?.goSalary ?? GAME_CONFIG.GO_SALARY;
      this.canSkipBuy = options?.canSkipBuy ?? GAME_CONFIG.CAN_SKIP_BUY;
      this.auctionOnly = options?.auctionOnly ?? GAME_CONFIG.AUCTION_ONLY;
      this.doublesGiveExtraTurn =
        options?.doublesGiveExtraTurn ?? GAME_CONFIG.DOUBLES_GIVE_EXTRA_TURN;
      this.chanceDeck = shuffleDeck(
        Array.from({ length: CHANCE_CARDS.length }, (_, i) => i),
      );
      this.communityDeck = shuffleDeck(
        Array.from({ length: COMMUNITY_CARDS.length }, (_, i) => i),
      );
      this.activeCard = null;
      this.isDoubles = false;
      this.skipMovementRequested = false;
      this.forceAllDiceRollsAsDoubles = false;
      this.forceAllDiceRollsToCards = false;
      this.economicHistory = [];
      this.statusMessage = tStore("game.status.started", {
        player: configs[0].name,
      });
      this.propertyOwners = {};
      this.propertyDevelopments = {};
      this.bankruptPlayers = [];
      this.isAuctionActive = false;
    },

    async moveCurrentPlayer(steps: number) {
      const p = this.players[this.activePlayerIndex];
      if (!p) return;

      p.isMoving = true;
      this.skipMovementRequested = false;
      const startPosition = p.position;
      const target = p.position + steps;

      if (Math.floor(target / 40) > Math.floor(startPosition / 40)) {
        p.cash += this.goSalary;
        this.statusMessage = tStore("game.status.passedGo", {
          player: p.name,
          amount: this.goSalary,
        });
      }

      for (let i = p.position + 1; i <= target; i++) {
        if (this.skipMovementRequested) {
          p.position = target;
          this.moveEvent = {
            playerIndex: this.activePlayerIndex,
            position: target,
          };
          await new Promise((r) => setTimeout(r, 0));
          break;
        }

        p.position = i;
        this.moveEvent = {
          playerIndex: this.activePlayerIndex,
          position: i,
        };
        await new Promise((r) => setTimeout(r, 300));

        if (this.skipMovementRequested && i < target) {
          p.position = target;
          this.moveEvent = {
            playerIndex: this.activePlayerIndex,
            position: target,
          };
          await new Promise((r) => setTimeout(r, 0));
          break;
        }
      }

      p.isMoving = false;
      p.inJail = false;
      p.jailTurns = 0;
      this.moveEvent = null;
      this.skipMovementRequested = false;
      this.isTurnComplete = true;
    },

    skipCurrentMovement() {
      if (!this.isAnyMoving) return;
      this.skipMovementRequested = true;
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
      while (
        this.bankruptPlayers.includes(this.players[next].id) &&
        guard < total
      ) {
        next = (next + 1) % total;
        guard++;
      }
      this.activePlayerIndex = next;
      const tokenName =
        GAME_CONFIG.TOKEN_MODELS.find(
          (t) => t.file === this.players[this.activePlayerIndex].tokenModel,
        )?.name ?? "?";
      this.statusMessage = tStore("game.status.turn", {
        player: this.players[this.activePlayerIndex].name,
        token: tokenName,
      });
    },

    finishTurnKeepPlayer() {
      this.isTurnComplete = false;
      this.isDoubles = false;
      const tokenName =
        GAME_CONFIG.TOKEN_MODELS.find(
          (t) => t.file === this.players[this.activePlayerIndex].tokenModel,
        )?.name ?? "?";
      this.statusMessage = tStore("game.status.doublesAgain", {
        player: this.players[this.activePlayerIndex].name,
      });
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
      this.statusMessage = tStore("game.status.jail", { player: player.name });
    },

    payJailBail(playerId: number) {
      const player = this.players.find((p) => p.id === playerId);
      if (!player || !player.inJail) return;
      player.cash -= this.jailBailCost;
      player.inJail = false;
      player.jailTurns = 0;
      this.statusMessage = tStore("game.status.bail", {
        player: player.name,
        amount: this.jailBailCost,
      });
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
        this.statusMessage = tStore("game.status.jailDoubles", {
          player: player.name,
        });
        return "freed";
      }

      player.jailTurns++;
      if (player.jailTurns >= 3) {
        player.cash -= this.jailBailCost;
        player.inJail = false;
        player.jailTurns = 0;
        this.statusMessage = tStore("game.status.jailForced", {
          player: player.name,
          amount: this.jailBailCost,
        });
        this._checkBankruptcy(player.id);
        return "forced_free";
      }

      this.statusMessage = tStore("game.status.jailStayed", {
        player: player.name,
        turns: player.jailTurns,
      });
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
      if (player.isMoving || this.isDiceRolling || this.isTurnComplete)
        return false;
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
      this.statusMessage = tStore("game.status.buy", {
        player: player.name,
        tile: tile.name,
        amount: tile.price,
      });
      const _purchaseParams = {
        player: player.name,
        tile: tile.name,
        amount: tile.price,
        balance: player.cash,
      };
      this.addEconomicHistory({
        type: "purchase",
        title: tStore("history.purchase.title", _purchaseParams),
        detail: tStore("history.purchase.detail", _purchaseParams),
        titleKey: "history.purchase.title",
        detailKey: "history.purchase.detail",
        params: _purchaseParams,
        amount: tile.price,
        playerIds: [playerId],
      });
      this._checkBankruptcy(playerId);
    },

    buyAuctionedProperty(tileIndex: number, playerId: number, amount: number) {
      const tile = getOwnableTile(tileIndex);
      const player = this.players.find((p) => p.id === playerId);
      if (!tile || !player) return;

      player.cash -= amount;
      this.propertyOwners[tileIndex] = playerId;
      this._ensurePropertyDevelopment(tileIndex);
      this.statusMessage = tStore("game.status.auctionWon", {
        player: player.name,
        tile: tile.name,
        amount,
      });
      const _auctionParams = {
        player: player.name,
        tile: tile.name,
        amount,
        balance: player.cash,
      };
      this.addEconomicHistory({
        type: "auction",
        title: tStore("history.auction.title", _auctionParams),
        detail: tStore("history.auction.detail", _auctionParams),
        titleKey: "history.auction.title",
        detailKey: "history.auction.detail",
        params: _auctionParams,
        amount,
        playerIds: [playerId],
      });
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

    seedAllPropertiesWithHotelsForActivePlayer(cash: number) {
      const player = this.activePlayer;
      if (!player) return;

      player.cash = cash;

      for (const tile of BOARD_TILES) {
        if (tile.price === undefined) continue;
        this.propertyOwners[tile.index] = player.id;
        const development = this._ensurePropertyDevelopment(tile.index);
        if (tile.type === "property") {
          development.houses = 0;
          development.hotel = true;
          development.mortgaged = false;
        }
      }

      this.statusMessage = `Escenario local activado. ${player.name} inicia con todas las propiedades, hoteles y $${cash}`;
    },

    seedDebtResolutionScenario() {
      const player = this.activePlayer;
      if (!player) return;

      this.propertyOwners = {};
      this.propertyDevelopments = {};
      this.bankruptPlayers = [];
      this.exchangeProposal = null;
      this.isAuctionActive = false;
      this.activeCard = null;
      this.isDiceVisible = false;
      this.isDiceRolling = false;
      this.moveEvent = null;
      this.skipMovementRequested = false;
      this.isTurnComplete = true;

      player.position = 24;
      player.cash = -260;
      player.inJail = false;
      player.jailTurns = 0;
      player.consecutiveDoubles = 0;

      const mortgageableIndexes = [1, 3, 5, 12, 15];
      for (const tileIndex of mortgageableIndexes) {
        this.propertyOwners[tileIndex] = player.id;
        const development = this._ensurePropertyDevelopment(tileIndex);
        development.houses = 0;
        development.hotel = false;
        development.mortgaged = false;
      }

      const houseGroupIndexes = [16, 18, 19];
      for (const tileIndex of houseGroupIndexes) {
        this.propertyOwners[tileIndex] = player.id;
        const development = this._ensurePropertyDevelopment(tileIndex);
        development.houses = 2;
        development.hotel = false;
        development.mortgaged = false;
      }

      const hotelGroupIndexes = [26, 27, 29];
      for (const tileIndex of hotelGroupIndexes) {
        this.propertyOwners[tileIndex] = player.id;
        const development = this._ensurePropertyDevelopment(tileIndex);
        development.houses = 0;
        development.hotel = true;
        development.mortgaged = false;
      }

      const opponent = this.players.find(
        (candidate) => candidate.id !== player.id,
      );
      if (opponent) {
        opponent.position = 0;
        opponent.cash = 1760;
        for (const tileIndex of [21, 23, 24]) {
          this.propertyOwners[tileIndex] = opponent.id;
          const development = this._ensurePropertyDevelopment(tileIndex);
          development.houses = 3;
          development.hotel = false;
          development.mortgaged = false;
        }
      }

      this.statusMessage = `Escenario deuda: ${player.name} debe $${Math.abs(player.cash)}. Usa Resolver deuda para vender mejoras o hipotecar`;
    },

    seedAllPlayersRollDoubles() {
      this.forceAllDiceRollsAsDoubles = true;
      this.diceValues = [6, 6];
      this.isDoubles = true;
      this.statusMessage =
        "Escenario local activado. Todos los tiros seran dobles";
    },

    seedAllPlayersInJail() {
      for (const player of this.players) {
        player.inJail = true;
        player.jailTurns = 0;
        player.position = 10;
        player.consecutiveDoubles = 0;
      }

      this.moveEvent = null;
      this.isTurnComplete = false;
      this.statusMessage =
        "Escenario local activado. Todos los jugadores inician en la carcel";
    },

    seedAllPlayersLandOnCards() {
      this.forceAllDiceRollsToCards = true;
      const player = this.activePlayer;
      if (player) {
        this.diceValues = diceValuesForTotal(
          stepsToNextCardTile(player.position),
        );
        this.isDoubles = this.diceValues[0] === this.diceValues[1];
      }
      this.statusMessage =
        "Escenario local activado. Todos los jugadores caeran en Arca Comunal o Suerte";
    },

    getPropertyDevelopment(tileIndex: number): PropertyDevelopmentState {
      return (
        this.propertyDevelopments[tileIndex] ?? {
          houses: 0,
          hotel: false,
          mortgaged: false,
        }
      );
    },

    getHouseCost(tileIndex: number): number {
      const tile = getOwnableTile(tileIndex);
      if (!tile) return 0;
      return houseCostForPrice(tile.price ?? 0);
    },

    getHotelCost(tileIndex: number): number {
      const tile = getOwnableTile(tileIndex);
      if (!tile) return 0;
      return hotelCostForPrice(tile.price ?? 0);
    },

    getMortgageValue(tileIndex: number): number {
      const tile = getOwnableTile(tileIndex);
      if (!tile) return 0;
      return mortgageValueForPrice(tile.price ?? 0);
    },

    getUnmortgageCost(tileIndex: number): number {
      const tile = getOwnableTile(tileIndex);
      if (!tile) return 0;
      return unmortgageCostForPrice(tile.price ?? 0);
    },

    ownsFullPropertyGroup(tileIndex: number, playerId: number): boolean {
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
      if (!tile || tile.type !== "property") return false;

      const groupTiles = getPropertyGroupTiles(tile.group);
      if (groupTiles.length === 0) return false;
      return groupTiles.every(
        (candidate) => this.propertyOwners[candidate.index] === playerId,
      );
    },

    hasMortgagedPropertyInColorGroup(tileIndex: number): boolean {
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
      if (!tile || tile.type !== "property") return false;

      return getPropertyGroupTiles(tile.group).some(
        (candidate) => this.getPropertyDevelopment(candidate.index).mortgaged,
      );
    },

    hasImprovementInColorGroup(tileIndex: number): boolean {
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
      if (!tile || tile.type !== "property") return false;

      return getPropertyGroupTiles(tile.group).some((candidate) => {
        const development = this.getPropertyDevelopment(candidate.index);
        return development.hotel || development.houses > 0;
      });
    },

    canBuildHouse(tileIndex: number, playerId: number): boolean {
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      if (!tile || tile.type !== "property" || !player) return false;
      if (this.propertyOwners[tileIndex] !== playerId) return false;
      if (!this.ownsFullPropertyGroup(tileIndex, playerId)) return false;
      if (this.hasMortgagedPropertyInColorGroup(tileIndex)) return false;

      const development = this.getPropertyDevelopment(tileIndex);
      if (development.mortgaged || development.hotel || development.houses >= 4)
        return false;
      const nextHouseLevel = development.houses + 1;
      const groupTiles = getPropertyGroupTiles(tile.group);
      const canBuildEvenly = groupTiles.every((candidate) => {
        if (candidate.index === tileIndex) return true;
        const candidateDevelopment = this.getPropertyDevelopment(
          candidate.index,
        );
        const candidateLevel = candidateDevelopment.hotel
          ? 5
          : candidateDevelopment.houses;
        return candidateLevel >= nextHouseLevel - 1;
      });
      if (!canBuildEvenly) return false;
      return player.cash >= this.getHouseCost(tileIndex);
    },

    canBuildHotel(tileIndex: number, playerId: number): boolean {
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      if (!tile || tile.type !== "property" || !player) return false;
      if (this.propertyOwners[tileIndex] !== playerId) return false;
      if (!this.ownsFullPropertyGroup(tileIndex, playerId)) return false;
      if (this.hasMortgagedPropertyInColorGroup(tileIndex)) return false;

      const development = this.getPropertyDevelopment(tileIndex);
      if (development.mortgaged || development.hotel || development.houses < 4)
        return false;
      const groupTiles = getPropertyGroupTiles(tile.group);
      const canBuildEvenly = groupTiles.every((candidate) => {
        if (candidate.index === tileIndex) return true;
        const candidateDevelopment = this.getPropertyDevelopment(
          candidate.index,
        );
        return candidateDevelopment.hotel || candidateDevelopment.houses >= 4;
      });
      if (!canBuildEvenly) return false;
      return player.cash >= this.getHotelCost(tileIndex);
    },

    canSellImprovement(tileIndex: number, playerId: number): boolean {
      if (this.propertyOwners[tileIndex] !== playerId) return false;
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
      if (!tile || tile.type !== "property") return false;
      const development = this.getPropertyDevelopment(tileIndex);
      if (!development.hotel && development.houses <= 0) return false;

      const currentLevel = development.hotel ? 5 : development.houses;
      const nextLevel = development.hotel ? 4 : development.houses - 1;
      const groupTiles = getPropertyGroupTiles(tile.group);
      return groupTiles.every((candidate) => {
        if (candidate.index === tileIndex) return true;
        const candidateDevelopment = this.getPropertyDevelopment(
          candidate.index,
        );
        const candidateLevel = candidateDevelopment.hotel
          ? 5
          : candidateDevelopment.houses;
        return (
          candidateLevel <= currentLevel && candidateLevel <= nextLevel + 1
        );
      });
    },

    _groupImprovementTargets(
      tileIndex: number,
      playerId: number,
      direction: "build" | "sell",
    ): BoardTile[] {
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
      if (!tile || tile.type !== "property") return [];
      if (!this.ownsFullPropertyGroup(tileIndex, playerId)) return [];

      const groupTiles = getPropertyGroupTiles(tile.group);
      if (
        groupTiles.some(
          (candidate) => this.propertyOwners[candidate.index] !== playerId,
        )
      ) {
        return [];
      }

      const levels = groupTiles.map((candidate) =>
        developmentLevel(this.getPropertyDevelopment(candidate.index)),
      );

      if (direction === "build") {
        if (this.hasMortgagedPropertyInColorGroup(tileIndex)) return [];
        const minLevel = Math.min(...levels);
        if (minLevel >= 5) return [];
        return groupTiles.filter(
          (candidate) =>
            developmentLevel(this.getPropertyDevelopment(candidate.index)) ===
            minLevel,
        );
      }

      const maxLevel = Math.max(...levels);
      if (maxLevel <= 0) return [];
      return groupTiles.filter(
        (candidate) =>
          developmentLevel(this.getPropertyDevelopment(candidate.index)) ===
          maxLevel,
      );
    },

    getPropertyGroupBuildCost(tileIndex: number, playerId: number): number {
      const targets = this._groupImprovementTargets(
        tileIndex,
        playerId,
        "build",
      );
      return targets.reduce((total, target) => {
        const development = this.getPropertyDevelopment(target.index);
        const level = developmentLevel(development);
        const cost =
          level >= 4
            ? this.getHotelCost(target.index)
            : this.getHouseCost(target.index);
        return total + cost;
      }, 0);
    },

    getPropertyGroupSellRefund(tileIndex: number, playerId: number): number {
      const targets = this._groupImprovementTargets(
        tileIndex,
        playerId,
        "sell",
      );
      return targets.reduce((total, target) => {
        const development = this.getPropertyDevelopment(target.index);
        const refund = development.hotel
          ? Math.round(this.getHotelCost(target.index) / 2)
          : Math.round(this.getHouseCost(target.index) / 2);
        return total + refund;
      }, 0);
    },

    canBuildPropertyGroupImprovement(
      tileIndex: number,
      playerId: number,
    ): boolean {
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      const targets = this._groupImprovementTargets(
        tileIndex,
        playerId,
        "build",
      );
      if (!player || targets.length === 0) return false;
      const totalCost = this.getPropertyGroupBuildCost(tileIndex, playerId);
      if (player.cash < totalCost) return false;
      return targets.every((target) => {
        const development = this.getPropertyDevelopment(target.index);
        return developmentLevel(development) >= 4
          ? this.canBuildHotel(target.index, playerId)
          : this.canBuildHouse(target.index, playerId);
      });
    },

    canSellPropertyGroupImprovement(
      tileIndex: number,
      playerId: number,
    ): boolean {
      const targets = this._groupImprovementTargets(
        tileIndex,
        playerId,
        "sell",
      );
      if (targets.length === 0) return false;
      return targets.every((target) =>
        this.canSellImprovement(target.index, playerId),
      );
    },

    canMortgageProperty(tileIndex: number, playerId: number): boolean {
      const tile = getOwnableTile(tileIndex);
      if (!tile) return false;
      if (this.propertyOwners[tileIndex] !== playerId) return false;
      const development = this.getPropertyDevelopment(tileIndex);
      if (development.mortgaged) return false;
      if (
        tile.type === "property" &&
        this.hasImprovementInColorGroup(tileIndex)
      )
        return false;
      return true;
    },

    canUnmortgageProperty(tileIndex: number, playerId: number): boolean {
      const tile = getOwnableTile(tileIndex);
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      if (!tile || !player) return false;
      if (this.propertyOwners[tileIndex] !== playerId) return false;
      if (!this.getPropertyDevelopment(tileIndex).mortgaged) return false;
      return player.cash >= this.getUnmortgageCost(tileIndex);
    },

    getEmergencyLiquidationValue(playerId: number): number {
      let total = 0;

      for (const tile of BOARD_TILES) {
        if (
          tile.price === undefined ||
          this.propertyOwners[tile.index] !== playerId
        )
          continue;

        const development = this.getPropertyDevelopment(tile.index);
        if (tile.type === "property") {
          if (development.hotel) {
            total += Math.round(this.getHotelCost(tile.index) / 2);
            total += 4 * Math.round(this.getHouseCost(tile.index) / 2);
          } else if (development.houses > 0) {
            total +=
              development.houses *
              Math.round(this.getHouseCost(tile.index) / 2);
          }
        }

        if (!development.mortgaged) {
          total += this.getMortgageValue(tile.index);
        }
      }

      return total;
    },

    canPlayerAvoidBankruptcy(playerId: number): boolean {
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      if (!player) return false;
      if (player.cash >= 0) return true;
      return player.cash + this.getEmergencyLiquidationValue(playerId) >= 0;
    },

    buildHouse(tileIndex: number, playerId: number) {
      if (!this.canBuildHouse(tileIndex, playerId)) return;
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
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
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
      if (!player || !tile) return;

      const cost = this.getHotelCost(tileIndex);
      const development = this._ensurePropertyDevelopment(tileIndex);
      player.cash -= cost;
      development.houses = 0;
      development.hotel = true;
      this.statusMessage = `${player.name} amplió ${tile.name} a hotel por $${cost}`;
      this._checkBankruptcy(playerId);
    },

    buildPropertyGroupImprovement(tileIndex: number, playerId: number) {
      if (!this.canBuildPropertyGroupImprovement(tileIndex, playerId)) return;
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
      if (!player || !tile || tile.type !== "property") return;

      const targets = this._groupImprovementTargets(
        tileIndex,
        playerId,
        "build",
      );
      let totalCost = 0;

      for (const target of targets) {
        const development = this._ensurePropertyDevelopment(target.index);
        const level = developmentLevel(development);

        if (level >= 4) {
          const cost = this.getHotelCost(target.index);
          player.cash -= cost;
          totalCost += cost;
          development.houses = 0;
          development.hotel = true;
        } else {
          const cost = this.getHouseCost(target.index);
          player.cash -= cost;
          totalCost += cost;
          development.houses = Math.min(4, development.houses + 1);
          development.hotel = false;
        }
      }

      this.statusMessage = `${player.name} mejoro el grupo ${tile.group} por $${totalCost}`;
      this._checkBankruptcy(playerId);
    },

    sellImprovement(tileIndex: number, playerId: number) {
      if (!this.canSellImprovement(tileIndex, playerId)) return;
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
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

    sellPropertyGroupImprovement(tileIndex: number, playerId: number) {
      if (!this.canSellPropertyGroupImprovement(tileIndex, playerId)) return;
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      const tile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
      if (!player || !tile || tile.type !== "property") return;

      const targets = this._groupImprovementTargets(
        tileIndex,
        playerId,
        "sell",
      );
      let totalRefund = 0;

      for (const target of targets) {
        const development = this._ensurePropertyDevelopment(target.index);

        if (development.hotel) {
          const refund = Math.round(this.getHotelCost(target.index) / 2);
          development.hotel = false;
          development.houses = 4;
          player.cash += refund;
          totalRefund += refund;
          continue;
        }

        if (development.houses > 0) {
          const refund = Math.round(this.getHouseCost(target.index) / 2);
          development.houses = Math.max(0, development.houses - 1);
          development.hotel = false;
          player.cash += refund;
          totalRefund += refund;
        }
      }

      this.statusMessage = `${player.name} vendio mejoras del grupo ${tile.group} por $${totalRefund}`;
    },

    mortgageProperty(tileIndex: number, playerId: number) {
      if (!this.canMortgageProperty(tileIndex, playerId)) return;
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      const tile = getOwnableTile(tileIndex);
      if (!player || !tile) return;

      const value = this.getMortgageValue(tileIndex);
      const development = this._ensurePropertyDevelopment(tileIndex);
      development.mortgaged = true;
      player.cash += value;
      this.statusMessage = tStore("game.status.mortgage", {
        player: player.name,
        tile: tile.name,
        amount: value,
      });
      const _mortgageParams = { player: player.name, tile: tile.name, amount: value, balance: player.cash };
      this.addEconomicHistory({
        type: "mortgage",
        title: tStore("history.mortgage.title", _mortgageParams),
        detail: tStore("history.mortgage.detail", _mortgageParams),
        titleKey: "history.mortgage.title",
        detailKey: "history.mortgage.detail",
        params: _mortgageParams,
        amount: value,
        playerIds: [playerId],
      });
    },

    mortgageAllAvailable(playerId: number): number {
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      if (!player) return 0;

      let total = 0;
      const mortgageableTiles = BOARD_TILES.filter(
        (tile) =>
          tile.price !== undefined &&
          this.canMortgageProperty(tile.index, playerId),
      );

      for (const tile of mortgageableTiles) {
        const development = this._ensurePropertyDevelopment(tile.index);
        if (development.mortgaged) continue;
        development.mortgaged = true;
        const value = this.getMortgageValue(tile.index);
        player.cash += value;
        total += value;
      }

      if (total > 0) {
        this.statusMessage = tStore("game.status.mortgageMany", {
          player: player.name,
          count: mortgageableTiles.length,
          amount: total,
        });
        const _mmParams = { player: player.name, count: mortgageableTiles.length, amount: total, balance: player.cash };
        this.addEconomicHistory({
          type: "mortgage",
          title: tStore("history.mortgageMany.title", _mmParams),
          detail: tStore("history.mortgageMany.detail", _mmParams),
          titleKey: "history.mortgageMany.title",
          detailKey: "history.mortgageMany.detail",
          params: _mmParams,
          amount: total,
          playerIds: [playerId],
        });
      }

      this._checkBankruptcy(playerId);
      return total;
    },

    unmortgageProperty(tileIndex: number, playerId: number) {
      if (!this.canUnmortgageProperty(tileIndex, playerId)) return;
      const player = this.players.find(
        (candidate) => candidate.id === playerId,
      );
      const tile = getOwnableTile(tileIndex);
      if (!player || !tile) return;

      const cost = this.getUnmortgageCost(tileIndex);
      const development = this._ensurePropertyDevelopment(tileIndex);
      development.mortgaged = false;
      player.cash -= cost;
      this.statusMessage = tStore("game.status.unmortgage", {
        player: player.name,
        tile: tile.name,
        amount: cost,
      });
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
        const railroadRentByCount = [0, 25, 50, 100, 200];
        return railroadRentByCount[Math.min(count, 4)] ?? 0;
      }

      if (tile.type === "utility") {
        const count = BOARD_TILES.filter(
          (t) =>
            t.type === "utility" &&
            this.propertyOwners[t.index] === ownerId &&
            !this.getPropertyDevelopment(t.index).mortgaged,
        ).length;
        return this.diceTotal * (count >= 2 ? 8 : 1);
      }

      if (tile.type !== "property") return 0;

      return rentForDevelopment(
        tile.price ?? 0,
        development.houses,
        development.hotel,
      );
    },

    collectRent(fromPlayerId: number, toPlayerId: number, amount: number) {
      const payer = this.players.find((p) => p.id === fromPlayerId);
      const receiver = this.players.find((p) => p.id === toPlayerId);
      if (!payer || !receiver || amount <= 0) return;
      payer.cash -= amount;
      receiver.cash += amount;
      this.statusMessage = tStore("game.status.rent", {
        payer: payer.name,
        amount,
        receiver: receiver.name,
      });
      const _rentParams = { payer: payer.name, amount, receiver: receiver.name };
      this.addEconomicHistory({
        type: "rent",
        title: tStore("history.rent.title", _rentParams),
        detail: tStore("history.rent.detail", _rentParams),
        titleKey: "history.rent.title",
        detailKey: "history.rent.detail",
        params: _rentParams,
        amount,
        playerIds: [fromPlayerId, toPlayerId],
      });
      this._checkBankruptcy(fromPlayerId);
    },

    payTax(playerId: number, amount: number) {
      const player = this.players.find((p) => p.id === playerId);
      if (!player) return;
      player.cash -= amount;
      this.statusMessage = tStore("game.status.tax", {
        player: player.name,
        amount,
      });
      const _taxParams = { player: player.name, amount, balance: player.cash };
      this.addEconomicHistory({
        type: "tax",
        title: tStore("history.tax.title", _taxParams),
        detail: tStore("history.tax.detail", _taxParams),
        titleKey: "history.tax.title",
        detailKey: "history.tax.detail",
        params: _taxParams,
        amount,
        playerIds: [playerId],
      });
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
      this.statusMessage = tStore("game.status.bankruptcy", {
        player: player?.name ?? tStore("common.player"),
      });
    },

    _checkBankruptcy(playerId: number) {
      const player = this.players.find((p) => p.id === playerId);
      if (!player || this.bankruptPlayers.includes(playerId)) return;
      if (player.cash >= 0) return;
      if (this.canPlayerAvoidBankruptcy(playerId)) {
        this.statusMessage = tStore("game.status.debt", {
          player: player.name,
          amount: Math.abs(player.cash),
        });
        return;
      }
      this.declareBankruptcy(playerId);
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
        const newDeck = shuffleDeck(
          Array.from({ length: cards.length }, (_, i) => i),
        );
        if (group === "chance") {
          this.chanceDeck = newDeck;
        } else {
          this.communityDeck = newDeck;
        }
      }

      const currentDeck =
        group === "chance" ? this.chanceDeck : this.communityDeck;
      const index = currentDeck.shift()!;
      this.activeCard = {
        ...cards[index],
        text: resolveCardText(cards[index]),
      };

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
          const steps =
            target > currentPos
              ? target - currentPos
              : 40 - currentPos + target;
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
            await new Promise((resolve) => setTimeout(resolve, 0));
            this.isTurnComplete = true;
          }
          break;
        }
        case "collect": {
          player.cash += card.amount ?? 0;
          this.statusMessage = `${player.name} cobra $${card.amount ?? 0}`;
          const _cardGainParams = { player: player.name, amount: card.amount ?? 0 };
          this.addEconomicHistory({
            type: "card_gain",
            title: tStore("history.card.title", _cardGainParams),
            detail: card.text,
            titleKey: "history.card.title",
            params: _cardGainParams,
            amount: card.amount ?? 0,
            playerIds: [player.id],
          });
          break;
        }
        case "pay": {
          player.cash -= card.amount ?? 0;
          this.statusMessage = `${player.name} paga $${card.amount ?? 0}`;
          const _cardLossParams = { player: player.name, amount: card.amount ?? 0 };
          this.addEconomicHistory({
            type: "card_loss",
            title: tStore("history.cardLoss.title", _cardLossParams),
            detail: card.text,
            titleKey: "history.cardLoss.title",
            params: _cardLossParams,
            amount: card.amount ?? 0,
            playerIds: [player.id],
          });
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
          const _cardPayParams = { player: player.name, amount: totalPay };
          this.addEconomicHistory({
            type: "card_loss",
            title: tStore("history.cardPay.title", _cardPayParams),
            detail: card.text,
            titleKey: "history.cardPay.title",
            params: _cardPayParams,
            amount: totalPay,
            playerIds: [player.id, ...otherPlayers.map((other) => other.id)],
          });
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
      if (this.forceAllDiceRollsToCards) {
        const player = this.activePlayer;
        const steps = player ? stepsToNextCardTile(player.position) : 2;
        this.diceValues = diceValuesForTotal(steps);
        this.isDoubles = this.diceValues[0] === this.diceValues[1];
        return;
      }

      if (this.forceAllDiceRollsAsDoubles) {
        this.diceValues = [6, 6];
        this.isDoubles = true;
        return;
      }

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
      if (proposal.requestMoney > to.cash) return;

      this.exchangeProposal = {
        ...proposal,
        renegotiationCount: proposal.renegotiationCount ?? 0,
      };
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

        if (
          proposal.offerMoney > from.cash ||
          proposal.requestMoney > to.cash
        ) {
          this.exchangeProposal = null;
          this.statusMessage = tStore("game.status.exchangeCancelledFunds");
          return;
        }

        for (const tileIdx of proposal.offerProperties) {
          if (this.propertyOwners[tileIdx] !== proposal.fromPlayerId) {
            this.exchangeProposal = null;
            this.statusMessage = tStore(
              "game.status.exchangeCancelledProperties",
            );
            return;
          }
        }
        for (const tileIdx of proposal.requestProperties) {
          if (this.propertyOwners[tileIdx] !== proposal.toPlayerId) {
            this.exchangeProposal = null;
            this.statusMessage = tStore(
              "game.status.exchangeCancelledProperties",
            );
            return;
          }
        }

        const fromImprovementRefund = this._sellPartialExchangeDevelopments(
          proposal.offerProperties,
          proposal.fromPlayerId,
        );
        const toImprovementRefund = this._sellPartialExchangeDevelopments(
          proposal.requestProperties,
          proposal.toPlayerId,
        );

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

        const improvementRefund = fromImprovementRefund + toImprovementRefund;
        const offeredItems = this._exchangeSideSummary(
          proposal.offerProperties,
          proposal.offerMoney,
        );
        const requestedItems = this._exchangeSideSummary(
          proposal.requestProperties,
          proposal.requestMoney,
        );
        const _exParams = { from: from.name, to: to.name, offered: offeredItems, received: requestedItems };
        this.addEconomicHistory({
          type: "exchange",
          title: tStore("history.exchange.title", _exParams),
          detail: tStore("history.exchange.detail", _exParams),
          titleKey: "history.exchange.title",
          detailKey: "history.exchange.detail",
          params: _exParams,
          amount: proposal.offerMoney + proposal.requestMoney,
          playerIds: [from.id, to.id],
        });
        this.statusMessage =
          improvementRefund > 0
            ? tStore("game.status.exchangeAcceptedWithImprovements", {
                from: from.name,
                to: to.name,
                amount: improvementRefund,
              })
            : tStore("game.status.exchangeAccepted", {
                from: from.name,
                to: to.name,
              });
      } else {
        this.statusMessage = tStore("game.status.exchangeRejected");
      }

      this.exchangeProposal = null;
    },

    cancelExchange() {
      this.exchangeProposal = null;
    },

    setBotThinking(message: string) {
      this.isBotThinking = true;
      this.botActionMessage = message;
    },

    clearBotThinking() {
      this.isBotThinking = false;
      this.botActionMessage = "";
    },

    addEconomicHistory(entry: Omit<EconomicHistoryItem, "id" | "createdAt">) {
      const item: EconomicHistoryItem = {
        ...entry,
        id: Date.now() + this.economicHistory.length,
        createdAt: Date.now(),
      };
      this.economicHistory.unshift(item);
      if (this.economicHistory.length > 100) {
        this.economicHistory.length = 100;
      }
    },

    _exchangeSideSummary(propertyIndexes: number[], money: number): string {
      const parts: string[] = [];
      if (propertyIndexes.length > 0) {
        const names = propertyIndexes
          .map(
            (tileIndex) =>
              BOARD_TILES.find((tile) => tile.index === tileIndex)?.name,
          )
          .filter(Boolean);
        parts.push(names.join(", "));
      }
      if (money > 0) parts.push(`$${money}`);
      return parts.length > 0 ? parts.join(" + ") : "sin elementos";
    },

    _sellPartialExchangeDevelopments(
      tileIndexes: number[],
      ownerId: number,
    ): number {
      const owner = this.players.find((player) => player.id === ownerId);
      if (!owner) return 0;

      const transferSet = new Set(tileIndexes);
      let totalRefund = 0;
      const clearedGroups = new Set<TileGroup>();

      for (const tileIndex of tileIndexes) {
        const tile = BOARD_TILES.find(
          (candidate) => candidate.index === tileIndex,
        );
        if (!tile || tile.type !== "property") continue;
        if (clearedGroups.has(tile.group)) continue;

        const groupTiles = getPropertyGroupTiles(tile.group);
        const fullGroupTransfers = groupTiles.every(
          (groupTile) =>
            this.propertyOwners[groupTile.index] === ownerId &&
            transferSet.has(groupTile.index),
        );
        if (fullGroupTransfers) continue;

        clearedGroups.add(tile.group);

        for (const groupTile of groupTiles) {
          if (this.propertyOwners[groupTile.index] !== ownerId) continue;
          const development = this.propertyDevelopments[groupTile.index];
          if (!development || (!development.hotel && development.houses <= 0))
            continue;

          let refund = 0;
          if (development.hotel) {
            refund += Math.round(this.getHotelCost(groupTile.index) / 2);
            refund += 4 * Math.round(this.getHouseCost(groupTile.index) / 2);
          } else {
            refund +=
              development.houses *
              Math.round(this.getHouseCost(groupTile.index) / 2);
          }

          development.houses = 0;
          development.hotel = false;
          owner.cash += refund;
          totalRefund += refund;
        }
      }

      return totalRefund;
    },
  },
});
