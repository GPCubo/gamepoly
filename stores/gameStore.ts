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
  inJail: boolean;
  jailTurns: number;
  consecutiveDoubles: number;
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
  doublesGiveExtraTurn: boolean;
  jailBailCost: number;
  chanceDeck: number[];
  communityDeck: number[];
  activeCard: GameCard | null;
  isDoubles: boolean;
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
  },
});
