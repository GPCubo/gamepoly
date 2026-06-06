export interface LocalScenarioSeedContext {
  seedOneGroupPerPlayer(): void;
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
    key: "one-group-property",
    queryParam: "onegroupproperty",
    description: "Asigna un grupo completo de propiedades a cada jugador activo.",
    isEnabled: (params) => isTrueParam(params, "onegroupproperty"),
    apply: (context) => context.seedOneGroupPerPlayer(),
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
