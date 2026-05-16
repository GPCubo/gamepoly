import { useGameStore } from "~/stores/gameStore";
export function useDice() {
  const store = useGameStore();

  function throwDice() {
    if (store.isRolling || store.isMoving) return;

    store.isRolling = true;

    // Simular duración del tiro
    setTimeout(() => {
      const result = Math.floor(Math.random() * 6) + 1;
      store.lastDiceRoll = result;
      store.isRolling = false;
      store.movePlayer(result);
    }, 600);
  }

  return { throwDice };
}
