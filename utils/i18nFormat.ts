import type { TranslationKey } from "~/locales";

export type I18nParams = Record<string, string | number | boolean | null | undefined>;

export function interpolate(template: string, params: I18nParams = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

export function formatCurrency(amount: number, symbol = "$") {
  return `${symbol}${amount.toLocaleString()}`;
}

type TranslateFn = (key: TranslationKey, params?: I18nParams) => string;

const legacyPatterns: Array<{
  pattern: RegExp;
  key: TranslationKey;
  params(match: RegExpMatchArray): I18nParams;
}> = [
  {
    pattern: /^¡?(.+?) comienza!?$/i,
    key: "game.status.started",
    params: (m) => ({ player: m[1] }),
  },
  {
    pattern: /^¡?Turno de (.+?) \((.+?)\)!?$/i,
    key: "game.status.turn",
    params: (m) => ({ player: m[1], token: m[2] }),
  },
  {
    pattern: /^¡?(.+?) pasó por la Salida y cobró \$(\d+)!?$/i,
    key: "game.status.passedGo",
    params: (m) => ({ player: m[1], amount: m[2] }),
  },
  {
    pattern: /^(.+?) pagó \$(\d+) de alquiler a (.+)$/i,
    key: "game.status.rent",
    params: (m) => ({ payer: m[1], amount: m[2], receiver: m[3] }),
  },
  {
    pattern: /^(.+?) debe \$(\d+)\./i,
    key: "game.status.debt",
    params: (m) => ({ player: m[1], amount: m[2] }),
  },
  {
    pattern: /^(.+?) hipotecó (.+?) y recibió \$(\d+)$/i,
    key: "game.status.mortgage",
    params: (m) => ({ player: m[1], tile: m[2], amount: m[3] }),
  },
  {
    pattern: /^(.+?) pagó \$(\d+) de impuesto$/i,
    key: "game.status.tax",
    params: (m) => ({ player: m[1], amount: m[2] }),
  },
];

export function translateLegacyText(text: string, t: TranslateFn) {
  for (const entry of legacyPatterns) {
    const match = text.match(entry.pattern);
    if (match) return t(entry.key, entry.params(match));
  }
  return text;
}
