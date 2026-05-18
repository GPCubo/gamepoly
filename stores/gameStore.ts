import { defineStore } from "pinia";

export interface GameState {
  currentPosition: number;
  isMoving: boolean;
  isRolling: boolean;
  lastDiceRoll: number | null;
  
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
    
    // NUEVO
    isDiceVisible: false,
    diceValues: [1, 1],
    isDiceRolling: false,
    statusMessage: "Cargando entorno...",
    isCamFollowActive: false,
  }),

  getters: {
    diceTotal: (state) => state.diceValues[0] + state.diceValues[1],
  },

  actions: {
    async movePlayer(steps: number) {
      this.isMoving = true;
      const target = this.currentPosition + steps;

      // Anima casilla por casilla con delay
      for (let i = this.currentPosition + 1; i <= target; i++) {
        this.currentPosition = i;
        await new Promise((r) => setTimeout(r, 300));
      }

      this.isMoving = false;
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
  },
});
