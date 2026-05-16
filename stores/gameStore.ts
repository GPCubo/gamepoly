import { defineStore } from "pinia";

export interface GameState {
  currentPosition: number;
  isMoving: boolean;
  isRolling: boolean;
  lastDiceRoll: number | null;
}

export const useGameStore = defineStore("game", {
  state: (): GameState => ({
    currentPosition: 0,
    isMoving: false,
    isRolling: false,
    lastDiceRoll: null,
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
  },
});
