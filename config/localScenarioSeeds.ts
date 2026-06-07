export interface LocalScenarioSeedContext {
  seedAllPropertiesForActivePlayer(cash: number): void;
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
