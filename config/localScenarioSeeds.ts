export interface LocalScenarioSeedContext {
  seedAllPropertiesForActivePlayer(cash: number): void;
  seedAllPropertiesWithHotelsForActivePlayer(cash: number): void;
  seedAllPlayersRollDoubles(): void;
  seedAllPlayersInJail(): void;
  seedAllPlayersLandOnCards(): void;
  seedDebtResolutionScenario(): void;
}

export interface LocalScenarioSeed {
  key: string;
  queryParam: string;
  description: string;
  isEnabled(params: URLSearchParams): boolean;
  apply(context: LocalScenarioSeedContext): void;
}

function isTrueParam(params: URLSearchParams, key: string) {
  return params.get(key) === "true";
}

export const LOCAL_SCENARIO_SEEDS: LocalScenarioSeed[] = [
  {
    key: "all-properties",
    queryParam: "allproperties",
    description: "Asigna todas las propiedades al jugador activo y fija su dinero.",
    isEnabled: (params) => isTrueParam(params, "allproperties"),
    apply: (context) => context.seedAllPropertiesForActivePlayer(100000),
  },
  {
    key: "all-properties-hotels",
    queryParam: "allhotels",
    description: "Asigna todas las propiedades con hoteles al jugador activo y fija su dinero.",
    isEnabled: (params) => isTrueParam(params, "allhotels"),
    apply: (context) => context.seedAllPropertiesWithHotelsForActivePlayer(100000),
  },
  {
    key: "all-players-doubles",
    queryParam: "alldoubles",
    description: "Fuerza que todos los tiros de dados sean dobles.",
    isEnabled: (params) => isTrueParam(params, "alldoubles"),
    apply: (context) => context.seedAllPlayersRollDoubles(),
  },
  {
    key: "all-players-in-jail",
    queryParam: "alljail",
    description: "Envía a todos los jugadores a la cárcel al iniciar la partida.",
    isEnabled: (params) => isTrueParam(params, "alljail"),
    apply: (context) => context.seedAllPlayersInJail(),
  },
  {
    key: "all-players-land-on-cards",
    queryParam: "allcards",
    description: "Fuerza que todos los jugadores caigan siempre en Arca Comunal o Suerte.",
    isEnabled: (params) => isTrueParam(params, "allcards"),
    apply: (context) => context.seedAllPlayersLandOnCards(),
  },
  {
    key: "debt-resolution",
    queryParam: "debt",
    description: "Deja al jugador activo en deuda con propiedades hipotecables y mejoras vendibles.",
    isEnabled: (params) => isTrueParam(params, "debt"),
    apply: (context) => context.seedDebtResolutionScenario(),
  },
];

export function applyLocalScenarioSeeds(
  params: URLSearchParams,
  context: LocalScenarioSeedContext,
): string[] {
  const appliedSeeds: string[] = [];

  for (const seed of LOCAL_SCENARIO_SEEDS) {
    if (!seed.isEnabled(params)) continue;
    seed.apply(context);
    appliedSeeds.push(seed.key);
  }

  return appliedSeeds;
}
