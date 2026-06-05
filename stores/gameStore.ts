import { defineStore } from "pinia";
import { GAME_CONFIG } from "~/config/gameConfig";
import { BOARD_TILES, CHANCE_CARDS, COMMUNITY_CARDS, shuffleDeck, resolveCardText, type GameCard } from "~/config/boardTilesConfig";

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
}

export interface MoveEvent {
  playerIndex: number;
  position: number;
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
  bankruptPlayers: number[];
  isAuctionActive: boolean;
  canSkipBuy: boolean;
  chanceDeck: number[];
  communityDeck: number[];
  activeCard: GameCard | null;
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
    bankruptPlayers: [],
    isAuctionActive: false,
    canSkipBuy: GAME_CONFIG.CAN_SKIP_BUY,
    chanceDeck: [],
    communityDeck: [],
    activeCard: null,
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
  },

  actions: {
    setupGame(configs: PlayerConfig[], options?: { goSalary?: number; canSkipBuy?: boolean }) {
      const defaultCash = GAME_CONFIG.STARTING_CASH;
      this.players = configs.map((c, idx) => ({
        id: idx,
        name: c.name,
        tokenModel: c.tokenModel,
        position: 0,
        isMoving: false,
        cash: c.startingCash ?? defaultCash,
      }));
      this.activePlayerIndex = 0;
      this.phase = "playing";
      this.isTurnComplete = false;
      this.goSalary = options?.goSalary ?? GAME_CONFIG.GO_SALARY;
      this.canSkipBuy = options?.canSkipBuy ?? GAME_CONFIG.CAN_SKIP_BUY;
      this.chanceDeck = shuffleDeck(Array.from({ length: CHANCE_CARDS.length }, (_, i) => i));
      this.communityDeck = shuffleDeck(Array.from({ length: COMMUNITY_CARDS.length }, (_, i) => i));
      this.activeCard = null;
      this.statusMessage = `¡${configs[0].name} comienza!`;
      this.propertyOwners = {};
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
      this.moveEvent = null;
      this.isTurnComplete = true;
    },

    finishTurn() {
      this.isTurnComplete = false;
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

    buyProperty(tileIndex: number, playerId: number) {
      const tile = BOARD_TILES.find((t) => t.index === tileIndex);
      if (!tile || tile.price === undefined) return;
      const player = this.players.find((p) => p.id === playerId);
      if (!player) return;
      player.cash -= tile.price;
      this.propertyOwners[tileIndex] = playerId;
      this.statusMessage = `${player.name} compró ${tile.name} por $${tile.price}`;
      this._checkBankruptcy(playerId);
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

    applyCardEffect() {
      const card = this.activeCard;
      if (!card) return;

      const player = this.players[this.activePlayerIndex];
      if (!player) return;

      switch (card.action) {
        case "moveTo": {
          const target = card.tileIndex ?? 0;
          const currentPos = player.position;
          const steps = target > currentPos
            ? target - currentPos
            : (40 - currentPos) + target;
          this.moveCurrentPlayer(steps);
          break;
        }
        case "moveSteps": {
          const steps = card.amount ?? 1;
          if (steps > 0) {
            this.moveCurrentPlayer(steps);
          } else if (steps < 0) {
            player.position += steps;
            if (player.position < 0) player.position += 40;
            this.statusMessage = `${player.name} retrocede ${Math.abs(steps)} casillas`;
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
          player.position = 10;
          this.statusMessage = `${player.name} va a la cárcel`;
          break;
        }
      }

      this.activeCard = null;
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
  },
});
