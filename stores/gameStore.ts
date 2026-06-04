import { defineStore } from "pinia";
import { GAME_CONFIG } from "~/config/gameConfig";
import { BOARD_TILES } from "~/config/boardTilesConfig";

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
    setupGame(configs: PlayerConfig[], options?: { goSalary?: number }) {
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
