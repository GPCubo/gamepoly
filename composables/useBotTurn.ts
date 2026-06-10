import { type Ref } from "vue";
import { useGameStore, type BotDifficulty, type ExchangeProposal } from "~/stores/gameStore";
import { getBotEngine, type BuyDecision } from "~/composables/useBotEngine";
import { BOARD_TILES, type BoardTile } from "~/config/boardTilesConfig";

const THINK_DELAY = 800;
const ACTION_DELAY = 500;
const BUILD_DELAY = 400;
const DICE_ROLL_DELAY = 900;
const DICE_SETTLE_DELAY = 450;
const BOT_EXCHANGE_COOLDOWN_TURNS = 4;
const BOT_EXCHANGE_PAIR_COOLDOWN_TURNS = 6;
const BOT_EXCHANGE_ACCEPTED_PAIR_COOLDOWN_TURNS = 8;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface UseBotTurnOptions {
  onBotCardDrawn?: () => Promise<void> | void;
  onBotExchangeProposed?: (proposal: ExchangeProposal) => Promise<BotExchangeResult> | BotExchangeResult;
}

export type BotExchangeResult = "accepted" | "rejected" | "renegotiated" | "cancelled";
export type BotExchangeDecision = {
  action: "accept" | "reject" | "renegotiate";
  counterProposal?: ExchangeProposal;
};

export function getBotAuctionBid(tileIndex: number, currentBid: number, playerId: number): number {
  const store = useGameStore();
  const player = store.players.find((p) => p.id === playerId);
  if (!player || !player.isBot || !player.botDifficulty) return 0;
  const engine = getBotEngine(player.botDifficulty);
  const tile = BOARD_TILES.find((t) => t.index === tileIndex);
  if (!tile) return 0;
  return engine.decideAuctionBid(tile, currentBid, playerId, store);
}

export function getBotExchangeResponse(proposal: ExchangeProposal): BotExchangeDecision {
  const store = useGameStore();
  const player = store.players.find((p) => p.id === proposal.toPlayerId);
  if (!player || !player.isBot || !player.botDifficulty) return { action: "reject" };
  const engine = getBotEngine(player.botDifficulty);
  const action = engine.decideExchangeResponse(proposal, player.id, store);
  const counterProposal = action === "renegotiate"
    ? engine.decideExchangeCounterProposal(proposal, player.id, store) ?? undefined
    : undefined;
  if (action === "renegotiate" && !counterProposal) return { action: "reject" };
  return { action, counterProposal };
}

export function getBotExchangeResponseAction(proposal: {
  fromPlayerId: number;
  toPlayerId: number;
  offerProperties: number[];
  offerMoney: number;
  requestProperties: number[];
  requestMoney: number;
}): "accept" | "reject" {
  return getBotExchangeResponse(proposal).action === "accept" ? "accept" : "reject";
}

export function useBotTurn(
  _isTurnComplete: Ref<boolean>,
  _isMoving: Ref<boolean>,
  options: UseBotTurnOptions = {},
) {
  const store = useGameStore();
  let processing = false;
  let botPendingExtraTurn = false;
  const botExchangeTurnCounts = new Map<number, number>();
  const botExchangeNextAllowedTurn = new Map<number, number>();
  const botExchangePairNextAllowedTurn = new Map<string, number>();

  function getActiveBotInfo(): { id: number; difficulty: BotDifficulty } | null {
    const player = store.activePlayer;
    if (!player || !player.isBot) return null;
    if (!player.botDifficulty) return null;
    return { id: player.id, difficulty: player.botDifficulty };
  }

  async function runBotTurn() {
    const botInfo = getActiveBotInfo();
    if (!botInfo) return;

    const engine = getBotEngine(botInfo.difficulty);
    const player = store.activePlayer;
    if (!player) return;

    botExchangeTurnCounts.set(
      botInfo.id,
      (botExchangeTurnCounts.get(botInfo.id) ?? 0) + 1,
    );

    const difficultyLabel = botInfo.difficulty === "difficult" ? "Dificil" : "Regular";
    store.setBotThinking(`${player.name} (Bot ${difficultyLabel}) esta pensando...`);
    await delay(THINK_DELAY);

    if (player.inJail) {
      const action = engine.decideJailAction(player.cash, store);
      if (action === "payBail" && player.cash >= store.jailBailCost) {
        store.setBotThinking(`${player.name} paga fianza`);
        await delay(ACTION_DELAY);
        store.payJailBail(player.id);
      }
    }

    if (!store.canActivePlayerRoll()) {
      store.clearBotThinking();
      return;
    }

    store.setBotThinking(`${player.name} tira los dados`);
    store.showDice();
    await delay(DICE_ROLL_DELAY);
    store.finishDiceRoll();
    await delay(DICE_SETTLE_DELAY);

    const total = store.diceTotal;
    store.hideDice();

    if (player.inJail) {
      const result = store.rollFromJail();
      if (result === "stayed") {
        store.clearBotThinking();
        finishBotTurn();
        return;
      }

      await store.moveCurrentPlayer(total);
      if (result === "freed") {
        botPendingExtraTurn = store.doublesGiveExtraTurn && store.checkDoubles();
      }
      store.clearBotThinking();
      await handleLanding();
      return;
    }

    if (store.doublesGiveExtraTurn) {
      const isExtraTurn = store.checkDoubles();
      if (player.inJail) {
        botPendingExtraTurn = false;
        store.clearBotThinking();
        finishBotTurn();
        return;
      }
      botPendingExtraTurn = isExtraTurn;
    }

    await store.moveCurrentPlayer(total);
    store.clearBotThinking();
    await handleLanding();
  }

  async function handleLanding() {
    const botInfo = getActiveBotInfo();
    if (!botInfo) return;

    const engine = getBotEngine(botInfo.difficulty);
    const player = store.activePlayer;
    if (!player) return;

    const difficultyLabel = botInfo.difficulty === "difficult" ? "Dificil" : "Regular";
    const pos = ((player.position % 40) + 40) % 40;
    const tile = BOARD_TILES.find((t) => t.index === pos);

    if (!tile) {
      finishBotTurn();
      return;
    }

    if (tile.group === "gotojail") {
      botPendingExtraTurn = false;
      store.sendToJail(player.id);
      await delay(ACTION_DELAY);
      finishBotTurn();
      return;
    }

    if (tile.type === "corner") {
      await completeBotTurn(engine, player.id);
      return;
    }

    if (tile.type === "tax") {
      const amount = tile.index === 38 ? 100 : 200;
      store.payTax(player.id, amount);
      await delay(ACTION_DELAY);
      await completeBotTurn(engine, player.id);
      return;
    }

    if (tile.type === "card") {
      store.setBotThinking(`${player.name} toma una carta`);
      store.drawCard(tile.group as "chance" | "community");
      if (options.onBotCardDrawn) {
        await options.onBotCardDrawn();
      } else {
        await delay(ACTION_DELAY);
      }
      const movedPosition = await store.applyCardEffect();
      if (store.activePlayer?.inJail) {
        botPendingExtraTurn = false;
        await delay(ACTION_DELAY);
        finishBotTurn();
        return;
      }
      if (movedPosition) {
        await handleLanding();
        return;
      }
      await completeBotTurn(engine, player.id);
      return;
    }

    if (tile.type === "property" || tile.type === "railroad" || tile.type === "utility") {
      const ownerId = store.propertyOwners[tile.index];
      if (ownerId !== undefined) {
        if (ownerId !== player.id) {
          const owner = store.players.find((p) => p.id === ownerId);
          if (owner && !store.bankruptPlayers.includes(ownerId)) {
            const rent = store.calculateRent(tile, ownerId);
            if (rent > 0) {
              store.collectRent(player.id, ownerId, rent);
            }
          }
        }
        await delay(ACTION_DELAY);
        await completeBotTurn(engine, player.id);
        return;
      }

      store.setBotThinking(`${player.name} (Bot ${difficultyLabel}) decide sobre ${tile.name}`);
      await delay(THINK_DELAY);

      const decision: BuyDecision = engine.decideBuy(tile, player.cash, store);

      if (store.auctionOnly) {
        store.setBotThinking(`${player.name} envia ${tile.name} a subasta`);
        await delay(ACTION_DELAY);
        store.isAuctionActive = true;
        return;
      }

      if (decision === "buy" && (tile.price ?? 0) <= player.cash) {
        store.setBotThinking(`${player.name} compra ${tile.name}`);
        await delay(ACTION_DELAY);
        store.buyProperty(tile.index, player.id);
      } else if (decision === "auction") {
        store.setBotThinking(`${player.name} envia ${tile.name} a subasta`);
        await delay(ACTION_DELAY);
        store.isAuctionActive = true;
        return;
      } else if (store.canSkipBuy) {
        store.setBotThinking(`${player.name} omite ${tile.name}`);
        await delay(ACTION_DELAY);
      }

      store.clearBotThinking();
      await completeBotTurn(engine, player.id);
      return;
    }

    await completeBotTurn(engine, player.id);
  }

  async function completeBotTurn(engine: ReturnType<typeof getBotEngine>, playerId: number) {
    const hadDebtBeforeBuild = await resolveBotDebt(playerId);
    if (hadDebtBeforeBuild) {
      finishBotTurn();
      return;
    }

    await handleBotBuildPhase(engine, playerId);
    const hadDebtAfterBuild = await resolveBotDebt(playerId);
    if (hadDebtAfterBuild) {
      finishBotTurn();
      return;
    }

    await maybeProposeBotExchange(engine, playerId);
    finishBotTurn();
  }

  async function handleBotBuildPhase(engine: ReturnType<typeof getBotEngine>, playerId: number) {
    const player = store.players.find((candidate) => candidate.id === playerId);
    if (!player) return;

    const buildActions = engine.decideBuild(player.cash, store);
    for (const action of buildActions) {
      if (action.action === "house") {
        if (store.canBuildHouse(action.tileIndex, playerId)) {
          store.buildHouse(action.tileIndex, playerId);
          await delay(BUILD_DELAY);
        }
      } else if (action.action === "hotel") {
        if (store.canBuildHotel(action.tileIndex, playerId)) {
          store.buildHotel(action.tileIndex, playerId);
          await delay(BUILD_DELAY);
        }
      }
    }

    const mortgageActions = engine.decideMortgage(player.cash, store);
    for (const action of mortgageActions) {
      if (action.action === "mortgage") {
        if (store.canMortgageProperty(action.tileIndex, playerId)) {
          store.mortgageProperty(action.tileIndex, playerId);
          await delay(BUILD_DELAY);
        }
      } else if (action.action === "unmortgage") {
        if (store.canUnmortgageProperty(action.tileIndex, playerId)) {
          store.unmortgageProperty(action.tileIndex, playerId);
          await delay(BUILD_DELAY);
        }
      }
    }
  }

  async function maybeProposeBotExchange(engine: ReturnType<typeof getBotEngine>, playerId: number) {
    const player = store.players.find((candidate) => candidate.id === playerId);
    if (!player || !player.isBot || player.botDifficulty !== "difficult") return;
    if (store.bankruptPlayers.includes(playerId)) return;
    if (botPendingExtraTurn || store.exchangeProposal || store.isAuctionActive || store.winner) return;

    const turnCount = botExchangeTurnCounts.get(playerId) ?? 0;
    const nextAllowedTurn = botExchangeNextAllowedTurn.get(playerId) ?? 0;
    if (turnCount < nextAllowedTurn) return;

    const proposal = engine.decideProposeExchange(playerId, store);
    if (!proposal) return;

    const target = store.players.find((candidate) => candidate.id === proposal.toPlayerId);
    if (!target || store.bankruptPlayers.includes(target.id)) return;

    const pairKey = `${proposal.fromPlayerId}:${proposal.toPlayerId}`;
    const pairNextAllowedTurn = botExchangePairNextAllowedTurn.get(pairKey) ?? 0;
    if (turnCount < pairNextAllowedTurn) return;

    store.setBotThinking(`${player.name} propone intercambio a ${target.name}`);
    await delay(THINK_DELAY);

    if (store.exchangeProposal || store.winner) return;

    const result = await proposeBotExchange(proposal);
    const botCooldown = result === "accepted"
      ? BOT_EXCHANGE_COOLDOWN_TURNS + 1
      : BOT_EXCHANGE_COOLDOWN_TURNS;
    const pairCooldown = result === "accepted"
      ? BOT_EXCHANGE_ACCEPTED_PAIR_COOLDOWN_TURNS
      : BOT_EXCHANGE_PAIR_COOLDOWN_TURNS;

    botExchangeNextAllowedTurn.set(playerId, turnCount + botCooldown);
    botExchangePairNextAllowedTurn.set(pairKey, turnCount + pairCooldown);
  }

  async function proposeBotExchange(proposal: ExchangeProposal): Promise<BotExchangeResult> {
    if (options.onBotExchangeProposed) {
      try {
        return await options.onBotExchangeProposed(proposal);
      } catch {
        return "cancelled";
      }
    }

    store.startExchange(proposal);
    if (!store.exchangeProposal) return "cancelled";

    const target = store.players.find((player) => player.id === proposal.toPlayerId);
    if (!target?.isBot || !target.botDifficulty) {
      store.cancelExchange();
      return "cancelled";
    }

    await delay(THINK_DELAY);
    const engine = getBotEngine(target.botDifficulty);
    const response = engine.decideExchangeResponse(proposal, target.id, store);
    if (response === "renegotiate") {
      const counterProposal = engine.decideExchangeCounterProposal(proposal, target.id, store);
      if (counterProposal) {
        store.startExchange(counterProposal);
        return "renegotiated";
      }
    }
    store.respondExchange(response === "accept");
    return response === "accept" ? "accepted" : "rejected";
  }

  function getOwnedTiles(playerId: number): BoardTile[] {
    return BOARD_TILES.filter(
      (tile) => tile.price !== undefined && store.propertyOwners[tile.index] === playerId,
    );
  }

  function getBestGroupImprovementToSell(playerId: number): BoardTile | null {
    const groupCandidates = getOwnedTiles(playerId)
      .filter((tile) => tile.type === "property" && store.canSellPropertyGroupImprovement(tile.index, playerId))
      .map((tile) => ({
        tile,
        refund: store.getPropertyGroupSellRefund(tile.index, playerId),
      }))
      .sort((a, b) => b.refund - a.refund);

    return groupCandidates[0]?.tile ?? null;
  }

  function getBestSingleImprovementToSell(playerId: number): BoardTile | null {
    const singleCandidates = getOwnedTiles(playerId)
      .filter((tile) => tile.type === "property" && store.canSellImprovement(tile.index, playerId))
      .map((tile) => {
        const development = store.getPropertyDevelopment(tile.index);
        const refund = development.hotel
          ? Math.round(store.getHotelCost(tile.index) / 2)
          : Math.round(store.getHouseCost(tile.index) / 2);
        return { tile, refund };
      })
      .sort((a, b) => b.refund - a.refund);

    return singleCandidates[0]?.tile ?? null;
  }

  async function resolveBotDebt(playerId: number): Promise<boolean> {
    const player = store.players.find((candidate) => candidate.id === playerId);
    if (!player || player.cash >= 0 || store.bankruptPlayers.includes(playerId)) return false;

    store.setBotThinking(`${player.name} resuelve su deuda`);
    await delay(ACTION_DELAY);

    let guard = 0;
    while (player.cash < 0 && !store.bankruptPlayers.includes(playerId) && guard < 80) {
      guard++;
      const cashBefore = player.cash;

      const mortgageTotal = store.mortgageAllAvailable(playerId);
      if (mortgageTotal > 0) {
        store.setBotThinking(`${player.name} hipoteca propiedades para cubrir la deuda`);
        await delay(BUILD_DELAY);
        continue;
      }

      const groupTile = getBestGroupImprovementToSell(playerId);
      if (groupTile) {
        store.setBotThinking(`${player.name} vende mejoras de ${groupTile.group}`);
        store.sellPropertyGroupImprovement(groupTile.index, playerId);
        await delay(BUILD_DELAY);
        continue;
      }

      const singleTile = getBestSingleImprovementToSell(playerId);
      if (singleTile) {
        store.setBotThinking(`${player.name} vende una mejora de ${singleTile.name}`);
        store.sellImprovement(singleTile.index, playerId);
        await delay(BUILD_DELAY);
        continue;
      }

      if (player.cash <= cashBefore) break;
    }

    if (player.cash < 0 && !store.bankruptPlayers.includes(playerId)) {
      store.setBotThinking(`${player.name} no puede cubrir la deuda`);
      await delay(ACTION_DELAY);
      store.declareBankruptcy(playerId);
    }

    return true;
  }

  function finishBotTurn() {
    store.clearBotThinking();
    if (store.bankruptPlayers.includes(store.players[store.activePlayerIndex]?.id ?? -1)) {
      botPendingExtraTurn = false;
    }
    if (botPendingExtraTurn) {
      botPendingExtraTurn = false;
      store.finishTurnKeepPlayer();
      return;
    }
    store.finishTurn();
  }

  function startBotTurn() {
    if (processing) return;
    const botInfo = getActiveBotInfo();
    if (!botInfo) return;
    processing = true;
    runBotTurn().finally(() => {
      processing = false;
      if (
        store.isCurrentPlayerBot &&
        store.phase === "playing" &&
        !store.isTurnComplete &&
        !store.isAnyMoving &&
        !store.isDiceRolling &&
        !store.isBotThinking
      ) {
        window.setTimeout(() => startBotTurn(), ACTION_DELAY);
      }
    });
  }

  function resolveBotLanding() {
    if (processing) return;
    const botInfo = getActiveBotInfo();
    if (!botInfo) return;
    processing = true;
    handleLanding().finally(() => {
      processing = false;
    });
  }

  return {
    startBotTurn,
    resolveBotLanding,
    getActiveBotInfo,
  };
}
