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

  LABEL_FONT_SIZE: 34,
  LABEL_CANVAS_WIDTH: 384,
  LABEL_CANVAS_HEIGHT: 192,
  LABEL_PLANE_WIDTH: 0.34,
  LABEL_PLANE_HEIGHT: 0.18,
  LABEL_COLOR: "#ffffff",
  LABEL_BG_COLOR: "rgba(0, 0, 0, 0.65)",
  LABEL_Y_OFFSET: 0.0,
  // Desplazamiento de la etiqueta hacia el interior del tablero (perpendicular al lado)
  LABEL_INWARD_OFFSET: 0.0,
  // Ajuste fino a lo largo del lado (0 = centrada sobre la casilla)
  LABEL_ALONG_OFFSET: 0.0,
  LABEL_CORNER_PLANE_WIDTH: 0.36,
  LABEL_CORNER_PLANE_HEIGHT: 0.18,
  // Desplazamiento hacia el interior para las esquinas (diagonal)
  LABEL_CORNER_INWARD_OFFSET: 0.0,

  STARTING_CASH: 1500,
  GO_SALARY: 200,
  CAN_SKIP_BUY: false,
} as const;
