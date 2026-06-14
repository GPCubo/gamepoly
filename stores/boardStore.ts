import { defineStore } from "pinia";
import { ref } from "vue";
import { getApiBaseUrl } from "~/utils/env";
import type { BoardTile, GameCard } from "~/types/board";

export const useBoardStore = defineStore("board", () => {
  const tiles = ref<BoardTile[]>([]);
  const chanceCards = ref<GameCard[]>([]);
  const communityCards = ref<GameCard[]>([]);
  const ready = ref(false);
  const slug = ref("monopoly-es");
  const glbPath = ref("/models/tablero.glb");

  async function fetchBoard(boardSlug = "monopoly-es") {
    const API_BASE = getApiBaseUrl();
    const res = await fetch(`${API_BASE}/api/v1/boards/${boardSlug}`);
    if (!res.ok) throw new Error(`Failed to fetch board '${boardSlug}': ${res.status}`);
    const data = await res.json();
    tiles.value = data.tiles ?? [];
    chanceCards.value = data.chanceCards ?? [];
    communityCards.value = data.communityCards ?? [];
    glbPath.value = data.glbPath ?? "/models/tablero.glb";
    slug.value = boardSlug;
    ready.value = true;
  }

  /** Replaces {tileName} in card text with the tile's name from the loaded board. */
  function resolveCardText(card: GameCard): string {
    if (card.tileIndex === undefined || card.tileIndex === null) return card.text;
    const tile = tiles.value.find((t) => t.index === card.tileIndex);
    if (!tile) return card.text;
    return card.text.replace("{tileName}", tile.name);
  }

  return { tiles, chanceCards, communityCards, ready, slug, glbPath, fetchBoard, resolveCardText };
});
