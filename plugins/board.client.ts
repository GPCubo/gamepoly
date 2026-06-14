import { useBoardStore } from "~/stores/boardStore";

// Fetch the canonical board config once at app startup (client-side only).
// All composables and components that need tile/card data access boardStore.tiles.
export default defineNuxtPlugin(async () => {
  const boardStore = useBoardStore();
  try {
    await boardStore.fetchBoard("monopoly-es");
  } catch (err) {
    console.error("[board plugin] Failed to load board config:", err);
  }
});
