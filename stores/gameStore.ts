import { defineStore } from "pinia";

export interface GameState {
  currentPosition: number;
  isMoving: boolean;
  isRolling: boolean;
  lastDiceRoll: number | null;
  
  player2Position: number;
  isPlayer2Moving: boolean;

  isTurnComplete: boolean;

  activePlayer: 1 | 2;

  // NUEVO: Estado UI
  isDiceVisible: boolean;
  diceValues: [number, number];
  isDiceRolling: boolean;
  statusMessage: string;
  isCamFollowActive: boolean;
}

export const useGameStore = defineStore("game", {
  state: (): GameState => ({
    currentPosition: 0,
    isMoving: false,
    isRolling: false,
    lastDiceRoll: null,

    player2Position: 0,
    isPlayer2Moving: false,

    isTurnComplete: false,
    activePlayer: 1 as 1 | 2,
    
    // NUEVO
    isDiceVisible: false,
    diceValues: [1, 1],
    isDiceRolling: false,
    statusMessage: "Cargando entorno...",
    isCamFollowActive: false,
  }),

  getters: {
    diceTotal: (state) => state.diceValues[0] + state.diceValues[1],
    casillaActual: (state) => (state.currentPosition % 40) + 1,
    casilla2Actual: (state) => (state.player2Position % 40) + 1,
  },

  actions: {
    async movePlayer(steps: number) {
      this.isMoving = true;
      const target = this.currentPosition + steps;

      for (let i = this.currentPosition + 1; i <= target; i++) {
        this.currentPosition = i;
        await new Promise((r) => setTimeout(r, 300));
      }

      this.isMoving = false;
      this.isTurnComplete = true;
    },

    async movePlayer2(steps: number) {
      this.isPlayer2Moving = true;
      const target = this.player2Position + steps;

      for (let i = this.player2Position + 1; i <= target; i++) {
        this.player2Position = i;
        await new Promise((r) => setTimeout(r, 300));
      }

      this.isPlayer2Moving = false;
      this.isTurnComplete = true;
    },

    showDice() {
      this.isDiceVisible = true;
      this.isDiceRolling = true;
      this.diceValues = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1];
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

    finishTurn() {
      this.isTurnComplete = false;
      this.activePlayer = this.activePlayer === 1 ? 2 : 1;
      this.statusMessage = this.activePlayer === 1 ? "¡Turno del Sombrero!" : "¡Turno del Dedal!";
    },
  },
});
