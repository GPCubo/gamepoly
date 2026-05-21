export const GAME_CONFIG = {
  PIECE_ORIGIN_OFFSET: { x: -2.15, z: 2.15 },
  SAME_TILE_SPACING: 0.1,
  SHARED_TILE_SCALE: 0.5,
  DEFAULT_SCALE: 1,
  GROW_DURATION_MS: 300,
  MAX_PLAYERS: 4,
  TOKEN_MODELS_DIR: "/models/users/",
  TOKEN_MODELS: [
    { file: "sombrero.glb", name: "Sombrero", icon: "🎩" },
    { file: "dedal.glb", name: "Dedal", icon: "🧵" },
    { file: "pork.glb", name: "Alcancía", icon: "🐷" },
    { file: "key.glb", name: "Llave", icon: "🔑" },
  ] as const,
} as const;
