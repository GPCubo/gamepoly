import { defineStore } from "pinia";

export interface GameState {
  currentPosition: number;
  isMoving: boolean;
  isRolling: boolean;
  lastDiceRoll: number | null;
  
  // NUEVO: Estado UI
  isDiceVisible: boolean;
  diceValue: number;
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
    diceValue: 1,
    isDiceRolling: false,
    statusMessage: "Cargando entorno...",
    isCamFollowActive: false,
  }),

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
      this.diceValue = Math.floor(Math.random() * 6) + 1;
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
