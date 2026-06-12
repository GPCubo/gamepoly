<template>
  <div class="mp-game-page">
    <div class="history-snackbar-stack" aria-live="polite">
      <TransitionGroup name="history-snackbar">
        <article
          v-for="item in visibleHistorySnackbars"
          :key="item.id"
          class="history-snackbar"
          :class="`history-${item.type}`"
        >
          <span class="material-symbols-outlined">{{
            historyIcon(item.type)
          }}</span>
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail }}</p>
          </div>
          <span v-if="item.amount !== undefined" class="history-amount">
            ${{ item.amount.toLocaleString() }}
          </span>
        </article>
      </TransitionGroup>
    </div>

    <!-- Connection overlay -->
    <div v-if="!socket.connected.value" class="conn-overlay">
      <div class="conn-card">
        <span class="material-symbols-outlined conn-icon">wifi_off</span>
        <p v-if="socket.reconnectAttempts.value > 0">
          Reconectando... (intento {{ socket.reconnectAttempts.value }}/5)
        </p>
        <p v-else>Conectando al servidor...</p>
      </div>
    </div>

    <!-- Winner overlay -->
    <div v-if="mpStore.winner" class="winner-overlay">
      <div class="winner-card">
        <span class="material-symbols-outlined winner-icon">emoji_events</span>
        <h2>¡{{ mpStore.winner.name }} ganó!</h2>
        <button class="action-btn" @click="navigateTo('/multiplayer/lobby')">
          Volver al lobby
        </button>
      </div>
    </div>

    <ClientOnly>
      <TresCanvas
        shadows
        clear-color="#1a1a2e"
        class="mp-board-canvas"
        @loop="onRenderTick"
      >
        <TresPerspectiveCamera
          ref="cameraRef"
          :position="[12, 15, 12]"
          :fov="45"
          :near="0.1"
          :far="1000"
        />
        <OrbitControls
          ref="controlsRef"
          :enable-damping="true"
          :target="[0, 0, 0]"
        />
        <TresAmbientLight :intensity="1.8" />
        <TresDirectionalLight
          :position="[10, 20, 10]"
          :intensity="2"
          cast-shadow
        />
        <primitive
          v-if="tableroScene"
          :object="tableroScene"
          :position="[0, 0, 0]"
          :scale="1"
        />
        <primitive
          v-if="boardHouseInstancedGroup"
          :object="boardHouseInstancedGroup"
        />
        <template
          v-for="(scene, idx) in playerScenes"
          :key="playerSceneKeys[idx] ?? idx"
        >
          <primitive
            v-if="
              scene &&
              mpStore.players[idx] &&
              !mpStore.bankruptPlayers.includes(mpStore.players[idx].id)
            "
            :object="scene"
            :position="[
              displayPositions[idx]?.x ?? 0,
              displayPositions[idx]?.y ?? 0,
              displayPositions[idx]?.z ?? 0,
            ]"
            :scale="displayScales[idx] ?? GAME_CONFIG.DEFAULT_SCALE"
          />
        </template>
      </TresCanvas>
      <div
        v-if="mpStore.state && !tableroScene && !boardLoadError"
        class="board-loading"
      >
        <span class="board-loading-spinner" aria-hidden="true"></span>
        <span>{{ currentBoardLoadingMessage }}</span>
        <span class="board-loading-dots" aria-hidden="true"></span>
      </div>
      <div v-if="boardLoadError" class="board-loading board-error">
        No se pudo cargar el mapa 3D.
      </div>
    </ClientOnly>

    <!-- Connected players HUD -->
    <div class="players-hud" v-if="mpStore.state">
      <div class="players-hud-title">
        <span>Jugadores</span>
        <strong>{{ mpStore.players.length }}</strong>
      </div>
      <div
        v-for="(p, idx) in mpStore.players"
        :key="p.id"
        class="hud-player"
        :class="{
          'hud-active': p.id === mpStore.activePlayer?.id,
          'hud-bankrupt': mpStore.isBankrupt(p.id),
          'hud-me': p.id === mpStore.myPlayerId,
        }"
      >
        <span class="hud-icon">{{ tokenIcon(p.tokenModel, idx) }}</span>
        <div class="hud-copy">
          <span class="hud-name">
            {{ p.name }}
            <span
              v-if="p.isBot"
              class="hud-bot-badge"
              :class="
                p.botDifficulty === 'difficult' ? 'bot-hard' : 'bot-regular'
              "
            >
              {{ p.botDifficulty === "difficult" ? "Difícil" : "Regular" }}
            </span>
            <span v-if="p.id === mpStore.myPlayerId" class="hud-you-badge"
              >Tú</span
            >
          </span>
          <span class="hud-position"
            >Casilla {{ (p.position % 40) + 1 }}/40</span
          >
        </div>
        <span class="hud-cash" :class="{ 'hud-negative': p.cash < 0 }">
          ${{ p.cash.toLocaleString() }}
        </span>
      </div>
    </div>

    <button
      v-if="mpStore.state"
      class="minimap-toggle-btn"
      :class="{ 'minimap-toggle-active': minimapOpen }"
      type="button"
      @click="minimapOpen = !minimapOpen"
    >
      <span class="material-symbols-outlined">map</span>
      <span>Mapa</span>
    </button>

    <div
      class="minimap-wrapper"
      :class="{ 'minimap-open': minimapOpen }"
      v-if="mpStore.state"
    >
      <div class="board-minimap">
        <div class="minimap-header">
          <span>Mapa</span>
          <strong>{{ currentPosition }}</strong>
        </div>
        <div class="minimap-board" aria-hidden="true">
          <div class="minimap-center">
            <div class="minimap-legend">
              <span><i class="legend-swatch legend-house"></i> Casas</span>
              <span><i class="legend-swatch legend-hotel"></i> Hotel</span>
              <span
                ><i class="legend-swatch legend-mortgage"></i> Hipoteca</span
              >
            </div>
          </div>
          <span
            v-for="tile in minimapTiles"
            :key="tile.index"
            class="minimap-tile"
            :class="{
              'minimap-tile-corner': tile.isCorner,
              'minimap-tile-active': tile.hasActivePlayer,
              'minimap-tile-dark': tile.isDark,
            }"
            :style="{
              left: `${tile.x}%`,
              top: `${tile.y}%`,
              background: tile.background,
            }"
          >
            {{ tile.label }}
          </span>
          <span
            v-for="owner in minimapOwnerMarkers"
            :key="owner.id"
            class="minimap-owner-marker"
            :style="{
              left: `${owner.x}%`,
              top: `${owner.y}%`,
              borderColor: owner.color,
            }"
            :title="owner.title"
          >
            {{ owner.icon }}
          </span>
          <span
            v-for="marker in minimapMarkers"
            :key="marker.id"
            class="minimap-marker"
            :class="{ 'minimap-marker-active': marker.isActive }"
            :style="{ left: `${marker.x}%`, top: `${marker.y}%` }"
            :title="marker.title"
          >
            {{ marker.icon }}
          </span>
        </div>
      </div>
      <button
        ref="historyBtnRef"
        class="history-trigger-btn"
        @click="showHistoryDialog = true"
      >
        <span class="material-symbols-outlined">history</span>
        Ver Historico
      </button>

      <Transition name="dice">
        <div v-if="diceVisible" class="dado-wrapper">
          <div class="dado-titulo">
            Total: {{ mpStore.diceTotal }} | Casilla: {{ currentPosition }}/40
            <span v-if="mpStore.isDoubles" class="doubles-text"> DOBLES </span>
          </div>
          <div class="dados-row">
            <div
              v-for="(val, idx) in mpStore.diceValues"
              :key="idx"
              class="dado-pequeno"
            >
              {{ val }}
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Status + action bar -->
    <div class="overlay-container" v-if="mpStore.state">
      <div class="status-card">
        <div class="status-player">
          <span class="status-token">{{ activeTokenIcon }}</span>
          <div>
            <span class="status-kicker">Turno actual</span>
            <strong>{{ mpStore.activePlayer?.name ?? "—" }}</strong>
          </div>
        </div>
        <div class="status-details">
          <span class="status-chip">
            <span class="material-symbols-outlined">location_on</span>
            Casilla {{ currentPosition }}/40
          </span>
          <span v-if="mpStore.isDoubles" class="doubles-badge">DOBLES</span>
          <span v-if="!socket.connected.value" class="offline-badge">
            <span class="material-symbols-outlined">wifi_off</span>
          </span>
        </div>
        <p>{{ mpStore.statusMessage }}</p>
      </div>

      <div class="action-buttons">
        <!-- Bot thinking -->
        <div v-if="mpStore.isBotThinking" class="bot-thinking-indicator">
          <span class="material-symbols-outlined bot-thinking-icon"
            >smart_toy</span
          >
          <span>{{ mpStore.botActionMessage || "Bot pensando..." }}</span>
        </div>

        <template v-else-if="mpStore.isMyTurn && !mpStore.isTurnComplete">
          <!-- Bail -->
          <button
            v-if="myPlayer?.inJail"
            ref="bailBtnRef"
            class="action-btn bail-btn"
            :disabled="
              isMovementLocked ||
              (myPlayer?.cash ?? 0) < (mpStore.state?.jailBailCost ?? 50)
            "
            @click="send('pay_bail')"
          >
            <span class="material-symbols-outlined">lock_open</span>
            Pagar fianza (${{ mpStore.state?.jailBailCost ?? 50 }})
          </button>

          <!-- Roll -->
          <button
            ref="rollBtnRef"
            class="action-btn roll-btn"
            :disabled="isMovementLocked"
            @click="send('roll_dice')"
          >
            <span class="material-symbols-outlined">casino</span>
            Tirar Dados
          </button>
        </template>

        <template v-else-if="mpStore.isMyTurn && mpStore.isTurnComplete">
          <button
            ref="nextBtnRef"
            class="action-btn next-btn"
            :disabled="isMovementLocked"
            @click="send('next_turn')"
          >
            <span class="material-symbols-outlined">navigate_next</span>
            Siguiente
          </button>
        </template>

        <template v-else-if="!mpStore.isMyTurn && !mpStore.isCurrentPlayerBot">
          <div class="waiting-indicator">
            <span class="material-symbols-outlined">hourglass_empty</span>
            Esperando a {{ mpStore.activePlayer?.name }}...
          </div>
        </template>

        <button
          ref="configBtnRef"
          class="action-btn config-btn"
          :class="{ 'config-active': sidebarOpen }"
          @click="sidebarOpen = !sidebarOpen"
        >
          <span class="material-symbols-outlined">settings</span>
          Configuracion
        </button>
      </div>
    </div>

    <!-- Buy decision (landing on unowned property) -->
    <TileCard
      v-if="showBuyPrompt && mpStore.isMyTurn"
      :tile="buyTileResolved"
      :active-player-id="mpStore.myPlayerId"
      :active-player-cash="myPlayer?.cash ?? 0"
      :can-skip-buy="mpStore.state?.canSkipBuy ?? false"
      :auction-only="mpStore.state?.auctionOnly ?? false"
      :houses="0"
      :has-hotel="false"
      :is-mortgaged="false"
      :can-build-house="false"
      :can-build-hotel="false"
      :can-sell-improvement="false"
      :can-mortgage="false"
      :can-unmortgage="false"
      :house-cost="houseCost(buyTileIndex)"
      :hotel-cost="hotelCost(buyTileIndex)"
      :mortgage-value="mortgageValue(buyTileIndex)"
      :unmortgage-cost="unmortgageCost(buyTileIndex)"
      @close="() => passBuy()"
      @buy="() => confirmBuy()"
      @auction="() => passBuy()"
      @skip="() => passBuy()"
    />

    <!-- Card overlay -->
    <div v-if="mpStore.activeCard && !isAnimatingMyMove" class="card-overlay">
      <div class="card-card">
        <span class="card-group">{{
          mpStore.activeCard.group === "chance"
            ? "🃏 Suerte"
            : "📦 Arca Comunal"
        }}</span>
        <p class="card-text">{{ mpStore.activeCard.text }}</p>
        <button
          ref="acceptCardBtnRef"
          class="action-btn roll-btn"
          :disabled="!mpStore.isMyTurn"
          @click="send('accept_card')"
        >
          {{
            mpStore.isMyTurn
              ? "Aceptar"
              : `Esperando a ${mpStore.activePlayer?.name ?? "jugador"}`
          }}
        </button>
      </div>
    </div>

    <!-- Auction -->
    <div
      v-if="mpStore.isAuctionActive && mpStore.auction"
      class="auction-overlay"
    >
      <div class="auction-card">
        <div class="auction-header-section">
          <span class="auction-tag">🔨 Subasta</span>
          <strong>{{ auctionTileName }}</strong>
        </div>
        <div class="auction-bid-info">
          <div>
            <span class="bid-label">Puja actual</span>
            <span class="bid-amount">${{ mpStore.auction.currentBid }}</span>
          </div>
          <div>
            <span class="bid-label">Turno</span>
            <span class="bid-bidder">{{ currentAuctionBidderName }}</span>
          </div>
        </div>
        <div v-if="isMyAuctionTurn" class="auction-actions">
          <button
            v-for="(inc, bidIdx) in [10, 50, 100]"
            :key="inc"
            :ref="(el) => { auctionBidRefs[bidIdx] = el as HTMLElement | null; }"
            class="bid-btn"
            :disabled="(myPlayer?.cash ?? 0) < mpStore.auction.currentBid + inc"
            @click="send('place_bid', { increment: inc })"
          >
            +${{ inc }}<br /><small
              >${{ mpStore.auction.currentBid + inc }}</small
            >
          </button>
        </div>
        <button
          v-if="isMyAuctionTurn"
          ref="auctionPassBtnRef"
          class="pass-bid-btn"
          @click="send('pass_bid')"
        >
          Pasar turno
        </button>
        <p v-else class="waiting-auction">
          Esperando a {{ currentAuctionBidderName }}...
        </p>
      </div>
    </div>

    <!-- Exchange modal -->
    <ExchangeModal
      v-if="showExchange && mpStore.state"
      :active-player="mpStore.myPlayer!"
      :players="mpStore.activePlayers.filter(p => p.id !== mpStore.myPlayerId)"
      :property-owners="mpStore.propertyOwners"
      :property-developments="mpStore.propertyDevelopments"
      :proposal="mpStore.exchangeProposal"
      :is-responding="exchangeIsResponding"
      :spectator-mode="exchangeSpectatorMode"
      :spectator-result="exchangeSpectatorResult"
      @propose="onExchangePropose"
      @accept="onExchangeAccept"
      @reject="onExchangeReject"
      @cancel="onExchangeCancel"
    />

    <!-- Connection status badge -->
    <div
      class="conn-badge"
      :class="{
        online: socket.connected.value,
        offline: !socket.connected.value,
      }"
    >
      <span class="material-symbols-outlined">{{
        socket.connected.value ? "wifi" : "wifi_off"
      }}</span>
      {{ socket.connected.value ? "En línea" : "Desconectado" }}
    </div>

    <Transition name="sidebar">
      <div v-if="sidebarOpen" class="sidebar-config">
        <div class="sidebar-header">
          <span class="sidebar-title">Configuracion</span>
          <button
            class="sidebar-close"
            tabindex="-1"
            @click="sidebarOpen = false"
          >
            x
          </button>
        </div>

        <div class="sidebar-body">
          <section class="player-summary">
            <div class="player-avatar">{{ myPlayerInitial }}</div>
            <div class="player-summary-copy">
              <span>Tu estado</span>
              <strong>{{ myPlayer?.name ?? "Jugador" }}</strong>
            </div>
            <div class="player-cash">
              ${{ (myPlayer?.cash ?? 0).toLocaleString() }}
            </div>
          </section>

          <div class="quick-actions">
            <button
              ref="closeSidebarBtnRef"
              class="sidebar-btn cam-btn"
              @click="sidebarOpen = false"
            >
              <span class="material-symbols-outlined">casino</span>
              <span>Volver al tablero</span>
            </button>

            <button
              ref="exchangeBtnRef"
              class="sidebar-btn cam-btn"
              :disabled="!mpStore.hasAnyPropertyOwned && !mpStore.myPlayer?.cash"
              @click="onOpenExchange()"
            >
              <span class="material-symbols-outlined">sync_alt</span>
              <span>Intercambio</span>
            </button>

            <button
              ref="cameraToggleBtnRef"
              class="sidebar-btn cam-btn"
              :class="{ 'cam-active': mpStore.isCamFollowActive }"
              @click="mpStore.toggleCameraFollow()"
            >
              <span class="material-symbols-outlined">
                {{ mpStore.isCamFollowActive ? "videocam" : "videocam_off" }}
              </span>
              <span>{{
                mpStore.isCamFollowActive ? "Camara fija" : "Camara libre"
              }}</span>
            </button>

            <button
              v-if="activeOwnedTiles.length"
              ref="mortgageAllBtnRef"
              class="sidebar-btn mortgage-all-btn"
              :class="{ 'disabled-btn': !canMortgageAll }"
              :disabled="!canMortgageAll"
              @click="onMortgageAll"
            >
              <span class="material-symbols-outlined"
                >account_balance_wallet</span
              >
              <span>Hipotecar todo +${{ mortgageAllValue }}</span>
            </button>
          </div>

          <section class="property-panel">
            <div class="panel-heading">
              <div>
                <span class="panel-kicker">Gestion</span>
                <span class="panel-title">Propiedades</span>
              </div>
              <span class="panel-count"
                >{{ filteredOwnedTiles.length }}/{{
                  activeOwnedTiles.length
                }}</span
              >
            </div>

            <label class="property-search">
              <span class="material-symbols-outlined">search</span>
              <input
                ref="propertySearchInputRef"
                v-model="searchTerm"
                type="search"
                placeholder="Buscar por nombre, color o estado"
              />
            </label>

            <p v-if="!activeOwnedTiles.length" class="empty-text">
              Sin propiedades
            </p>

            <p v-else-if="!filteredOwnedTiles.length" class="empty-text">
              Sin resultados
            </p>

            <div v-else class="property-groups">
              <section
                v-for="group in groupedOwnedTiles"
                :key="group.key"
                class="property-group"
                :style="{ '--property-accent': group.color }"
              >
                <header class="group-header">
                  <span class="group-color" />
                  <div>
                    <strong>{{ group.label }}</strong>
                    <span
                      >{{ group.tiles.length }}
                      {{
                        group.tiles.length === 1 ? "propiedad" : "propiedades"
                      }}</span
                    >
                  </div>
                </header>

                <div v-if="canShowGroupActions(group)" class="group-actions">
                  <button
                    :ref="captureSidebarListEl"
                    class="mini-action build-action"
                    :class="{ 'disabled-btn': !canBuildGroup(group) }"
                    :disabled="!canBuildGroup(group)"
                    @click="onBuildGroup(group)"
                  >
                    <span class="material-symbols-outlined">add_home</span>
                    <span>Comprar grupo ${{ groupBuildCost(group) }}</span>
                  </button>
                  <button
                    :ref="captureSidebarListEl"
                    class="mini-action sell-action"
                    :class="{ 'disabled-btn': !canSellGroup(group) }"
                    :disabled="!canSellGroup(group)"
                    @click="onSellGroup(group)"
                  >
                    <span class="material-symbols-outlined"
                      >real_estate_agent</span
                    >
                    <span>Vender grupo +${{ groupSellRefund(group) }}</span>
                  </button>
                </div>

                <div class="property-list">
                  <article
                    v-for="tile in group.tiles"
                    :key="tile.index"
                    class="property-card"
                    :class="{ mortgaged: developmentFor(tile.index).mortgaged }"
                    :style="{ '--property-accent': tile.color ?? '#4ade80' }"
                  >
                    <div class="property-main">
                      <span class="property-accent" />
                      <div class="property-copy">
                        <strong>{{ tile.shortName ?? tile.name }}</strong>
                        <span>{{ developmentLabel(tile.index) }}</span>
                      </div>
                      <span
                        class="property-price"
                        v-if="tile.price !== undefined"
                        >${{ tile.price }}</span
                      >
                    </div>

                    <div class="property-actions">
                      <button
                        v-if="
                          tile.type === 'property' &&
                          !developmentFor(tile.index).hotel &&
                          developmentFor(tile.index).houses < 4
                        "
                        :ref="captureSidebarListEl"
                        class="mini-action build-action"
                        :class="{ 'disabled-btn': !canBuildHouse(tile.index) }"
                        :disabled="!canBuildHouse(tile.index)"
                        @click="send('build_house', { tileIndex: tile.index })"
                      >
                        <span class="material-symbols-outlined">home_work</span>
                        <span>Casa ${{ houseCost(tile.index) }}</span>
                      </button>

                      <button
                        v-if="
                          tile.type === 'property' &&
                          !developmentFor(tile.index).hotel &&
                          developmentFor(tile.index).houses >= 4
                        "
                        :ref="captureSidebarListEl"
                        class="mini-action hotel-action"
                        :class="{ 'disabled-btn': !canBuildHotel(tile.index) }"
                        :disabled="!canBuildHotel(tile.index)"
                        @click="send('build_hotel', { tileIndex: tile.index })"
                      >
                        <span class="material-symbols-outlined">apartment</span>
                        <span>Hotel ${{ hotelCost(tile.index) }}</span>
                      </button>

                      <button
                        v-if="
                          tile.type === 'property' &&
                          (developmentFor(tile.index).hotel ||
                            developmentFor(tile.index).houses > 0)
                        "
                        :ref="captureSidebarListEl"
                        class="mini-action sell-action"
                        :class="{
                          'disabled-btn': !canSellImprovement(tile.index),
                        }"
                        :disabled="!canSellImprovement(tile.index)"
                        @click="
                          send('sell_improvement', { tileIndex: tile.index })
                        "
                      >
                        <span class="material-symbols-outlined">sell</span>
                        <span>Vender +${{ sellRefund(tile.index) }}</span>
                      </button>

                      <button
                        v-if="!developmentFor(tile.index).mortgaged"
                        :ref="captureSidebarListEl"
                        class="mini-action mortgage-action"
                        :class="{ 'disabled-btn': !canMortgage(tile.index) }"
                        :disabled="!canMortgage(tile.index)"
                        @click="send('mortgage', { tileIndex: tile.index })"
                      >
                        <span class="material-symbols-outlined"
                          >account_balance</span
                        >
                        <span>Hipotecar +${{ mortgageValue(tile.index) }}</span>
                      </button>

                      <button
                        v-else
                        :ref="captureSidebarListEl"
                        class="mini-action mortgage-action"
                        :class="{ 'disabled-btn': !canUnmortgage(tile.index) }"
                        :disabled="!canUnmortgage(tile.index)"
                        @click="send('unmortgage', { tileIndex: tile.index })"
                      >
                        <span class="material-symbols-outlined">paid</span>
                        <span>Pagar ${{ unmortgageCost(tile.index) }}</span>
                      </button>
                    </div>
                  </article>
                </div>
              </section>
            </div>
          </section>
        </div>
      </div>
    </Transition>

    <Teleport to="body">
      <div
        v-if="showHistoryDialog"
        class="history-dialog-overlay"
        @click.self="showHistoryDialog = false"
      >
        <div class="history-dialog">
          <div class="history-dialog-header">
            <div>
              <span class="history-dialog-kicker">Eventos</span>
              <span class="history-dialog-title">Historico</span>
            </div>
            <div class="history-dialog-meta">
              <span class="history-dialog-count">{{ activeHistoryCount }}</span>
              <button
                class="history-dialog-close"
                @click="showHistoryDialog = false"
              >
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          <div class="history-tabs" role="tablist" aria-label="Historico">
            <button
              v-for="tab in historyTabs"
              :key="tab.key"
              class="history-tab"
              :class="{ 'history-tab-active': activeHistoryTab === tab.key }"
              type="button"
              role="tab"
              :aria-selected="activeHistoryTab === tab.key"
              @click="activeHistoryTab = tab.key"
            >
              <span class="material-symbols-outlined">{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
              <strong>{{ tab.count }}</strong>
            </button>
          </div>

          <p v-if="activeHistoryCount === 0" class="history-dialog-empty">
            {{ activeHistoryEmptyText }}
          </p>

          <div
            v-else-if="activeHistoryTab === 'money'"
            class="history-dialog-list"
          >
            <article
              v-for="item in mpStore.economicHistory"
              :key="item.id"
              class="history-dialog-item"
            >
              <span
                class="history-dialog-item-icon material-symbols-outlined"
                >{{ historyIcon(item.type) }}</span
              >
              <div class="history-dialog-item-copy">
                <strong>{{ item.title }}</strong>
                <span>{{ item.detail }}</span>
              </div>
              <span
                v-if="item.amount !== undefined"
                class="history-dialog-item-amount"
              >
                ${{ item.amount.toLocaleString() }}
              </span>
            </article>
          </div>

          <div
            v-else-if="activeHistoryTab === 'tiles'"
            class="history-dialog-list"
          >
            <article
              v-for="item in mpStore.movementHistory"
              :key="item.id"
              class="history-dialog-item"
            >
              <span
                class="history-dialog-item-icon material-symbols-outlined"
                >{{ item.source === "card" ? "style" : "casino" }}</span
              >
              <div class="history-dialog-item-copy">
                <strong>{{ movementHistoryTitle(item) }}</strong>
                <span>{{ movementHistoryDetail(item) }}</span>
              </div>
              <span class="history-dialog-item-amount">
                {{ tileLabel(item.from) }} -> {{ tileLabel(item.to) }}
              </span>
            </article>
          </div>

          <div v-else class="history-dialog-list">
            <article
              v-for="item in mpStore.cardHistory"
              :key="item.id"
              class="history-dialog-item"
            >
              <span
                class="history-dialog-item-icon material-symbols-outlined"
                >{{ item.group === "chance" ? "help" : "inventory_2" }}</span
              >
              <div class="history-dialog-item-copy">
                <strong>{{ cardHistoryTitle(item) }}</strong>
                <span>{{ item.text }}</span>
                <span>{{ item.effect }}</span>
              </div>
              <span class="history-dialog-item-amount">
                {{ item.group === "chance" ? "Suerte" : "Arca" }}
              </span>
            </article>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  shallowRef,
  reactive,
  computed,
  onMounted,
  onUnmounted,
  onBeforeUpdate,
  watch,
  nextTick,
  type Ref,
} from "vue";
import { TresCanvas } from "@tresjs/core";
import { OrbitControls } from "@tresjs/cientos";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  Group as ThreeGroup,
  InstancedMesh,
  Matrix4,
  Euler,
  Quaternion,
  Vector3,
} from "three";
import type { Group, Mesh, BufferGeometry, Material } from "three";
import { useMultiplayerStore } from "~/stores/multiplayerStore";
import { useGameSocket } from "~/composables/useGameSocket";
import { useBoardGeometry } from "~/composables/useBoardGeometry";
import { usePieceAnimation } from "~/composables/usePieceAnimation";
import { useCameraFollow } from "~/composables/useCameraFollow";
import { useKeyboardNavigation } from "~/composables/useKeyboardNavigation";
import { GAME_CONFIG } from "~/config/gameConfig";
import {
  BOARD_TILES,
  type BoardTile,
  type TileGroup,
} from "~/config/boardTilesConfig";
import {
  houseCostForPrice,
  hotelCostForPrice,
  mortgageValueForPrice,
  unmortgageCostForPrice,
} from "~/config/economyConfig";
import {
  BOARD_HOUSE_ASSET_GROUPS,
  BOARD_HOUSE_ASSET_DEFINITIONS,
  getBoardHouseAssetGroup,
  getBoardHouseAssetKey,
  getBoardHouseGroupModelPath,
  getPropertyDevelopmentPlacements,
} from "~/config/boardHouseAssets";
import type {
  BoardHouseAssetPlacement,
  BoardHouseAssetType,
} from "~/config/boardHouseAssets";
import type {
  MPCardHistoryItem,
  MPEconomicHistoryItem,
  MPMovementHistoryItem,
  MPPropertyDevelopment,
} from "~/stores/multiplayerStore";
import TileCard from "~/components/TileCard.vue";
import ExchangeModal from "~/components/ExchangeModal.vue";
import type { ExchangeProposalShape } from "~/components/ExchangeModal.vue";

const mpStore = useMultiplayerStore();
const socket = useGameSocket();
const route = useRoute();

const tableId = route.query.tableId as string;
const playerId = route.query.playerId as string;

const REVEAL_DELAY_MS = 350;
const showBuyPrompt = ref(false);
const buyTileIndex = ref(0);
const isAnimatingMyMove = ref(false);
const diceVisible = ref(false);
const tableroScene = shallowRef<Group | null>(null);
const playerScenes = shallowRef<(Group | null)[]>([]);
const boardHouseInstancedGroup = shallowRef<Group | null>(null);
const boardHouseModels = shallowRef<Map<string, Group>>(new Map());
const boardLoadError = ref(false);
const boardLoadingIndex = ref(0);
const cameraRef = shallowRef();
const controlsRef = shallowRef();
const playerSceneKeys = computed(() =>
  mpStore.players.map(
    (p, idx) => `${p.id}:${normalizedTokenModel(p.tokenModel, idx)}`,
  ),
);
const sidebarOpen = ref(false);
const showHistoryDialog = ref(false);
const activeHistoryTab = ref<"money" | "tiles" | "cards">("money");
const minimapOpen = ref(false);
const searchTerm = ref("");
const visibleHistorySnackbars = ref<MPEconomicHistoryItem[]>([]);
const rollBtnRef = ref<HTMLElement | null>(null);
const nextBtnRef = ref<HTMLElement | null>(null);
const bailBtnRef = ref<HTMLElement | null>(null);
const configBtnRef = ref<HTMLElement | null>(null);
const closeSidebarBtnRef = ref<HTMLElement | null>(null);
const mortgageAllBtnRef = ref<HTMLElement | null>(null);
const historyBtnRef = ref<HTMLElement | null>(null);
const acceptCardBtnRef = ref<HTMLElement | null>(null);
const auctionBidRefs = ref<(HTMLElement | null)[]>([null, null, null]);
const auctionPassBtnRef = ref<HTMLElement | null>(null);
const propertySearchInputRef = ref<HTMLElement | null>(null);
const cameraToggleBtnRef = ref<HTMLElement | null>(null);
const exchangeBtnRef = ref<HTMLElement | null>(null);
const sidebarListElements = ref<HTMLElement[]>([]);
const showExchange = ref(false);
const exchangeIsResponding = ref(false);
const exchangeSpectatorMode = ref(false);
const exchangeSpectatorResult = ref<"accepted" | "rejected" | null>(null);
let diceHideTimer: ReturnType<typeof setTimeout> | null = null;
let boardLoadingTimer: ReturnType<typeof setInterval> | null = null;
let loadedTokenSignature = "";
let boardLoadRequestId = 0;
let animationPlayerCount = 0;
let fpsFrames = 0;
let fpsElapsedMs = 0;
const movementAnimating = ref(false);
let pendingSnapshot: any = null;
let pendingBotThinking: {
  playerId: string;
  delayMs: number;
  receivedAt: number;
} | null = null;
let movementSeq = 0;
let botThinkingTimer: ReturnType<typeof setTimeout> | null = null;
const isMovementLocked = computed(
  () => movementAnimating.value || isAnimatingMyMove.value,
);
const boardLoadingMessages = [
  "Cargando tablero 🎲",
  "Configurando partida ⚙️",
  "Personalizando mapa ✨",
  "Ubicando fichas 🚗",
  "Casi está 🚀",
];
const currentBoardLoadingMessage = computed(
  () => boardLoadingMessages[boardLoadingIndex.value % boardLoadingMessages.length],
);

const normalizedPlayerTiles = computed(() =>
  mpStore.players.map((player) => ((player.position % 40) + 40) % 40),
);

const displayPositions = reactive<{ x: number; y: number; z: number }[]>([]);
const displayScales = ref<number[]>([]);
const prevAnimating = ref<boolean[]>([]);
const prevShared = ref<boolean[]>([]);

const {
  init: initPieceAnimation,
  startHop,
  startGrow,
  cancelGrow,
  tick,
  getCurrentPosition,
  getCurrentScale,
  isAnimating,
  setPosition,
} = usePieceAnimation();

const { updateCamera } = useCameraFollow(
  {
    get isCamFollowActive() {
      return mpStore.isCamFollowActive;
    },
    get activePlayerIndex() {
      return mpStore.activePlayerIndex;
    },
    get players() {
      return mpStore.players;
    },
  },
  {
    cameraRef,
    controlsRef,
    displayPositions,
  },
);

const {
  getCasillaCoordinates,
  getPropertyBuildSlot,
  getPropertyBuildingSlots,
  getBoardLocalOffset,
} = useBoardGeometry();

const actionRefs = computed(() => {
  const refs: Ref<HTMLElement | null>[] = [];
  if (
    mpStore.isMyTurn &&
    !mpStore.isTurnComplete &&
    myPlayer.value?.inJail &&
    !isMovementLocked.value
  )
    refs.push(bailBtnRef);
  if (mpStore.isMyTurn && !mpStore.isTurnComplete && !isMovementLocked.value)
    refs.push(rollBtnRef);
  if (mpStore.isMyTurn && mpStore.isTurnComplete && !isMovementLocked.value)
    refs.push(nextBtnRef);
  refs.push(configBtnRef);
  return refs;
});

const overlayKeyboardEnabled = computed(
  () =>
    !!mpStore.state &&
    !sidebarOpen.value &&
    !showHistoryDialog.value &&
    !showBuyPrompt.value &&
    !mpStore.activeCard &&
    !mpStore.isAuctionActive &&
    !showExchange.value &&
    !isMovementLocked.value,
);

const overlayAutoFocusEnabled = computed(
  () => overlayKeyboardEnabled.value && mpStore.isMyTurn,
);

useKeyboardNavigation(actionRefs, {
  direction: "horizontal",
  autoFocusOn: overlayAutoFocusEnabled,
  enabled: overlayKeyboardEnabled,
  loop: true,
});

const sidebarRefs = computed((): Ref<HTMLElement | null>[] => {
  const refs: Ref<HTMLElement | null>[] = [
    closeSidebarBtnRef,
    cameraToggleBtnRef,
    exchangeBtnRef,
  ];
  if (activeOwnedTiles.value.length) refs.push(mortgageAllBtnRef);
  refs.push(propertySearchInputRef);
  for (const el of sidebarListElements.value) {
    refs.push({ value: el } as Ref<HTMLElement | null>);
  }
  return refs;
});

useKeyboardNavigation(sidebarRefs, {
  direction: "vertical",
  allowBothAxes: true,
  enabled: computed(() => sidebarOpen.value),
  loop: true,
});

onBeforeUpdate(() => {
  sidebarListElements.value = [];
});

function captureSidebarListEl(el: unknown) {
  if (el) sidebarListElements.value.push(el as HTMLElement);
}

function onOpenExchange() {
  showExchange.value = true;
  exchangeIsResponding.value = false;
  exchangeSpectatorMode.value = false;
  exchangeSpectatorResult.value = null;
  sidebarOpen.value = false;
}

function onExchangePropose(proposal: ExchangeProposalShape) {
  send("propose_trade", { proposal });
  exchangeIsResponding.value = true;
}

function onExchangeAccept() {
  send("respond_trade", { accepted: true });
  showExchange.value = false;
  exchangeIsResponding.value = false;
  exchangeSpectatorMode.value = false;
  exchangeSpectatorResult.value = null;
}

function onExchangeReject() {
  send("respond_trade", { accepted: false });
  showExchange.value = false;
  exchangeIsResponding.value = false;
  exchangeSpectatorMode.value = false;
  exchangeSpectatorResult.value = null;
}

function onExchangeCancel() {
  showExchange.value = false;
  exchangeIsResponding.value = false;
  exchangeSpectatorMode.value = false;
  exchangeSpectatorResult.value = null;
}

watch(
  () => mpStore.exchangeProposal,
  (proposal) => {
    if (!proposal) {
      if (exchangeIsResponding.value) {
        showExchange.value = false;
        exchangeIsResponding.value = false;
        exchangeSpectatorMode.value = false;
        exchangeSpectatorResult.value = null;
      }
      return;
    }
    if (proposal.toPlayerId === mpStore.myPlayerId && !showExchange.value) {
      exchangeIsResponding.value = true;
      exchangeSpectatorMode.value = false;
      showExchange.value = true;
    }
  },
);

useKeyboardNavigation(
  computed(() => [acceptCardBtnRef]),
  {
    direction: "horizontal",
    autoFocusOn: computed(() => !!mpStore.activeCard && mpStore.isMyTurn),
    enabled: computed(() => !!mpStore.activeCard && mpStore.isMyTurn),
    loop: true,
  },
);

const isAuctionKeyboardEnabled = computed(
  () => mpStore.isAuctionActive && isMyAuctionTurn.value,
);

const auctionRefs = computed((): Ref<HTMLElement | null>[] => [
  ...auctionBidRefs.value.map(
    (el) => ({ value: el }) as Ref<HTMLElement | null>,
  ),
  auctionPassBtnRef,
]);

useKeyboardNavigation(auctionRefs, {
  direction: "horizontal",
  allowBothAxes: true,
  enabled: isAuctionKeyboardEnabled,
  autoFocusOn: isAuctionKeyboardEnabled,
  loop: true,
});

const boardHouseModelVariantFiles = import.meta.glob(
  "../../public/models/{casa_detallada,hotel_detallado}_*.glb",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const availableBoardHouseModelPaths = new Set(
  Object.keys(boardHouseModelVariantFiles).map(
    (path) => `/models/${path.split("/").pop()}`,
  ),
);

const boardHousePlacements = computed(() =>
  getPropertyDevelopmentPlacements(mpStore.propertyDevelopments),
);

const currentPosition = computed(() => {
  const p = mpStore.activePlayer;
  if (!p) return 0;
  return (((p.position % 40) + 40) % 40) + 1;
});

const myPlayer = computed(() => mpStore.myPlayer);

const activeTokenIcon = computed(() => {
  const p = mpStore.activePlayer;
  if (!p) return "?";
  return tokenIcon(p.tokenModel, mpStore.activePlayerIndex);
});

function tokenConfig(file: string | undefined, idx = 0) {
  return (
    GAME_CONFIG.TOKEN_MODELS.find((t) => t.file === file) ??
    GAME_CONFIG.TOKEN_MODELS[idx % GAME_CONFIG.TOKEN_MODELS.length] ??
    GAME_CONFIG.TOKEN_MODELS[0]
  );
}

function normalizedTokenModel(file: string | undefined, idx = 0) {
  return tokenConfig(file, idx)?.file ?? "sombrero.glb";
}

function tokenIcon(file: string | undefined, idx = 0) {
  return tokenConfig(file, idx)?.icon ?? "?";
}

function playerSharesTile(idx: number) {
  const tile = normalizedPlayerTiles.value[idx];
  return normalizedPlayerTiles.value.some(
    (candidate, i) => i !== idx && candidate === tile,
  );
}

function sharedBoardOffset(idx: number): { x: number; z: number } {
  const tile = normalizedPlayerTiles.value[idx];
  const group = normalizedPlayerTiles.value
    .map((candidate, i) => ({ idx: i, tile: candidate }))
    .filter((candidate) => candidate.tile === tile);

  if (group.length <= 1) return { x: 0, z: 0 };

  const posInGroup = group.findIndex((candidate) => candidate.idx === idx);
  const angle = (posInGroup / group.length) * 2 * Math.PI;
  const radius = GAME_CONFIG.SAME_TILE_SPACING;

  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius,
  };
}

function ensureAnimationState() {
  const count = mpStore.players.length;
  if (count === 0) return;
  if (count === animationPlayerCount) return;

  animationPlayerCount = count;
  initPieceAnimation(count);
  displayPositions.splice(0, displayPositions.length);
  displayScales.value = Array(count).fill(GAME_CONFIG.DEFAULT_SCALE);
  prevAnimating.value = Array(count).fill(false);
  prevShared.value = Array(count).fill(false);

  mpStore.players.forEach((player, idx) => {
    const coords = getCasillaCoordinates(((player.position % 40) + 40) % 40);
    setPosition(idx, coords);
    displayPositions[idx] = { ...coords };
  });
}

function syncIdlePiecePositions() {
  mpStore.players.forEach((player, idx) => {
    if (isAnimating(idx)) return;
    const coords = getCasillaCoordinates(((player.position % 40) + 40) % 40);
    setPosition(idx, coords);
  });
}

function onMovementComplete() {
  movementAnimating.value = false;
  if (pendingSnapshot) {
    const snap = pendingSnapshot;
    pendingSnapshot = null;
    mpStore.applySnapshot(snap);
    syncIdlePiecePositions();
  }
  flushPendingBotThinking();
}

function showBotThinking(delayMs: number) {
  if (botThinkingTimer) clearTimeout(botThinkingTimer);
  mpStore.setBotThinking(true, "Bot pensando...");
  botThinkingTimer = setTimeout(() => {
    mpStore.setBotThinking(false);
    botThinkingTimer = null;
  }, delayMs + 200);
}

function flushPendingBotThinking() {
  if (!pendingBotThinking) return;
  const pending = pendingBotThinking;
  pendingBotThinking = null;
  const elapsed = Date.now() - pending.receivedAt;
  const remaining = Math.max(0, pending.delayMs - elapsed);
  showBotThinking(remaining);
}

function onRenderTick({ delta }: { delta: number }) {
  const deltaMs = delta * 1000;
  fpsFrames += 1;
  fpsElapsedMs += deltaMs;
  if (fpsElapsedMs >= 500) {
    fpsFrames = 0;
    fpsElapsedMs = 0;
  }

  if (mpStore.players.length === 0) return;
  ensureAnimationState();
  tick(deltaMs);

  for (let i = 0; i < mpStore.players.length; i++) {
    const justFinished = prevAnimating.value[i] && !isAnimating(i);
    prevAnimating.value[i] = isAnimating(i);

    const shared = playerSharesTile(i);
    if (shared !== prevShared.value[i] || justFinished) {
      if (shared) {
        cancelGrow(i);
      } else if (!isAnimating(i)) {
        startGrow(i);
      }
    }
    prevShared.value[i] = shared;

    const pos = getCurrentPosition(i);
    if (!pos) continue;
    const offset = sharedBoardOffset(i);
    displayPositions[i] = {
      x: pos.x + offset.x,
      y: pos.y,
      z: pos.z + offset.z,
    };
    displayScales.value[i] = shared
      ? GAME_CONFIG.SHARED_TILE_SCALE
      : getCurrentScale(i);
  }

  updateCamera(delta);
}

const PROPERTY_GROUP_ORDER: TileGroup[] = [
  "brown",
  "lightBlue",
  "pink",
  "orange",
  "red",
  "yellow",
  "green",
  "darkBlue",
  "railroad",
  "utility",
];

const PROPERTY_GROUP_LABELS: Partial<Record<TileGroup, string>> = {
  brown: "Marron",
  lightBlue: "Azul claro",
  pink: "Rosa",
  orange: "Naranja",
  red: "Rojo",
  yellow: "Amarillo",
  green: "Verde",
  darkBlue: "Azul oscuro",
  railroad: "Estaciones",
  utility: "Servicios",
};

interface OwnedTileGroup {
  key: TileGroup;
  label: string;
  color: string;
  tiles: BoardTile[];
}

const myPlayerInitial = computed(() => {
  const name = myPlayer.value?.name?.trim();
  return name ? name.slice(0, 1).toUpperCase() : "?";
});

const activeOwnedTiles = computed(() =>
  BOARD_TILES.filter(
    (tile) =>
      isOwnableTile(tile) &&
      mpStore.propertyOwners[tile.index] === mpStore.myPlayerId,
  ),
);

const filteredOwnedTiles = computed(() => {
  const query = normalizeText(searchTerm.value);
  if (!query) return activeOwnedTiles.value;

  return activeOwnedTiles.value.filter((tile) => {
    const searchFields = [
      tile.name,
      tile.shortName,
      tile.group,
      groupLabelFor(tile),
      developmentLabel(tile.index),
      tile.price?.toString(),
    ];
    return searchFields.some((field) =>
      normalizeText(field ?? "").includes(query),
    );
  });
});

const groupedOwnedTiles = computed(() => {
  const groups = new Map<TileGroup, OwnedTileGroup>();

  for (const tile of filteredOwnedTiles.value) {
    const groupKey = tile.group;
    const current = groups.get(groupKey) ?? {
      key: groupKey,
      label: groupLabelFor(tile),
      color: tile.color ?? "#94a3b8",
      tiles: [],
    };
    current.tiles.push(tile);
    groups.set(groupKey, current);
  }

  return [...groups.values()].sort((a, b) => {
    const aIndex = PROPERTY_GROUP_ORDER.indexOf(a.key);
    const bIndex = PROPERTY_GROUP_ORDER.indexOf(b.key);
    if (aIndex === -1 && bIndex === -1) return a.label.localeCompare(b.label);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
});

function isOwnableTile(tile: BoardTile) {
  return (
    tile.type === "property" ||
    tile.type === "railroad" ||
    tile.type === "utility"
  );
}

function ownableTile(tileIndex: number) {
  return BOARD_TILES.find(
    (tile) => tile.index === tileIndex && isOwnableTile(tile),
  );
}

function propertyGroupTiles(group: TileGroup) {
  return BOARD_TILES.filter(
    (tile) => tile.type === "property" && tile.group === group,
  );
}

function developmentFor(tileIndex: number): MPPropertyDevelopment {
  return mpStore.getPropertyDevelopment(tileIndex);
}

function groupLabelFor(tile: BoardTile) {
  return PROPERTY_GROUP_LABELS[tile.group] ?? tile.group;
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function ownsFullPropertyGroup(tileIndex: number) {
  const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
  if (!tile || tile.type !== "property") return false;
  const groupTiles = propertyGroupTiles(tile.group);
  return (
    groupTiles.length > 0 &&
    groupTiles.every(
      (candidate) =>
        mpStore.propertyOwners[candidate.index] === mpStore.myPlayerId,
    )
  );
}

function hasMortgagedPropertyInColorGroup(tileIndex: number) {
  const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
  if (!tile || tile.type !== "property") return false;
  return propertyGroupTiles(tile.group).some(
    (candidate) => developmentFor(candidate.index).mortgaged,
  );
}

function hasImprovementInColorGroup(tileIndex: number) {
  const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
  if (!tile || tile.type !== "property") return false;
  return propertyGroupTiles(tile.group).some((candidate) => {
    const development = developmentFor(candidate.index);
    return development.hotel || development.houses > 0;
  });
}

function houseCost(tileIndex: number) {
  const tile = ownableTile(tileIndex);
  return tile ? houseCostForPrice(tile.price ?? 0) : 0;
}

function hotelCost(tileIndex: number) {
  const tile = ownableTile(tileIndex);
  return tile ? hotelCostForPrice(tile.price ?? 0) : 0;
}

function mortgageValue(tileIndex: number) {
  const tile = ownableTile(tileIndex);
  return tile ? mortgageValueForPrice(tile.price ?? 0) : 0;
}

function unmortgageCost(tileIndex: number) {
  const tile = ownableTile(tileIndex);
  return tile ? unmortgageCostForPrice(tile.price ?? 0) : 0;
}

function canManageTile(tileIndex: number) {
  const tile = ownableTile(tileIndex);
  return (
    !!tile &&
    mpStore.isMyTurn &&
    !mpStore.isCurrentPlayerBot &&
    mpStore.propertyOwners[tileIndex] === mpStore.myPlayerId
  );
}

function canBuildHouse(tileIndex: number) {
  const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
  const player = myPlayer.value;
  if (!tile || tile.type !== "property" || !player || !canManageTile(tileIndex))
    return false;
  if (!ownsFullPropertyGroup(tileIndex)) return false;
  if (hasMortgagedPropertyInColorGroup(tileIndex)) return false;
  const development = developmentFor(tileIndex);
  if (development.mortgaged || development.hotel || development.houses >= 4)
    return false;
  const nextHouseLevel = development.houses + 1;
  const canBuildEvenly = propertyGroupTiles(tile.group).every((candidate) => {
    if (candidate.index === tileIndex) return true;
    const candidateDevelopment = developmentFor(candidate.index);
    const candidateLevel = candidateDevelopment.hotel
      ? 5
      : candidateDevelopment.houses;
    return candidateLevel >= nextHouseLevel - 1;
  });
  return canBuildEvenly && player.cash >= houseCost(tileIndex);
}

function canBuildHotel(tileIndex: number) {
  const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
  const player = myPlayer.value;
  if (!tile || tile.type !== "property" || !player || !canManageTile(tileIndex))
    return false;
  if (!ownsFullPropertyGroup(tileIndex)) return false;
  if (hasMortgagedPropertyInColorGroup(tileIndex)) return false;
  const development = developmentFor(tileIndex);
  if (development.mortgaged || development.hotel || development.houses < 4)
    return false;
  const canBuildEvenly = propertyGroupTiles(tile.group).every((candidate) => {
    if (candidate.index === tileIndex) return true;
    const candidateDevelopment = developmentFor(candidate.index);
    return candidateDevelopment.hotel || candidateDevelopment.houses >= 4;
  });
  return canBuildEvenly && player.cash >= hotelCost(tileIndex);
}

function canSellImprovement(tileIndex: number) {
  const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
  if (!tile || tile.type !== "property" || !canManageTile(tileIndex))
    return false;
  const development = developmentFor(tileIndex);
  if (!development.hotel && development.houses <= 0) return false;
  const currentLevel = development.hotel ? 5 : development.houses;
  const nextLevel = development.hotel ? 4 : development.houses - 1;
  return propertyGroupTiles(tile.group).every((candidate) => {
    if (candidate.index === tileIndex) return true;
    const candidateDevelopment = developmentFor(candidate.index);
    const candidateLevel = candidateDevelopment.hotel
      ? 5
      : candidateDevelopment.houses;
    return candidateLevel <= currentLevel && candidateLevel <= nextLevel + 1;
  });
}

function canMortgage(tileIndex: number) {
  const tile = ownableTile(tileIndex);
  if (!tile || !canManageTile(tileIndex)) return false;
  const development = developmentFor(tileIndex);
  if (development.mortgaged) return false;
  if (tile.type === "property" && hasImprovementInColorGroup(tileIndex))
    return false;
  return true;
}

function canUnmortgage(tileIndex: number) {
  const tile = ownableTile(tileIndex);
  const player = myPlayer.value;
  if (!tile || !player || !canManageTile(tileIndex)) return false;
  if (!developmentFor(tileIndex).mortgaged) return false;
  return player.cash >= unmortgageCost(tileIndex);
}

const mortgageableTiles = computed(() =>
  activeOwnedTiles.value.filter((tile) => canMortgage(tile.index)),
);

const mortgageAllValue = computed(() =>
  mortgageableTiles.value.reduce(
    (total, tile) => total + mortgageValue(tile.index),
    0,
  ),
);

const canMortgageAll = computed(() => mortgageableTiles.value.length > 0);

function developmentLevel(development: MPPropertyDevelopment) {
  return development.hotel ? 5 : development.houses;
}

function groupRepresentative(group: OwnedTileGroup) {
  return group.tiles.find((tile) => tile.type === "property") ?? null;
}

function groupImprovementTargets(
  group: OwnedTileGroup,
  direction: "build" | "sell",
) {
  const representative = groupRepresentative(group);
  if (!representative || !ownsFullPropertyGroup(representative.index))
    return [];

  const groupTiles = propertyGroupTiles(representative.group);
  if (
    groupTiles.some(
      (tile) => mpStore.propertyOwners[tile.index] !== mpStore.myPlayerId,
    )
  )
    return [];

  const levels = groupTiles.map((tile) =>
    developmentLevel(developmentFor(tile.index)),
  );

  if (direction === "build") {
    if (hasMortgagedPropertyInColorGroup(representative.index)) return [];
    const minLevel = Math.min(...levels);
    if (minLevel >= 5) return [];
    return groupTiles.filter(
      (tile) => developmentLevel(developmentFor(tile.index)) === minLevel,
    );
  }

  const maxLevel = Math.max(...levels);
  if (maxLevel <= 0) return [];
  return groupTiles.filter(
    (tile) => developmentLevel(developmentFor(tile.index)) === maxLevel,
  );
}

function canShowGroupActions(group: OwnedTileGroup) {
  return groupRepresentative(group) !== null;
}

function groupBuildCost(group: OwnedTileGroup) {
  return groupImprovementTargets(group, "build").reduce((total, tile) => {
    const level = developmentLevel(developmentFor(tile.index));
    return total + (level >= 4 ? hotelCost(tile.index) : houseCost(tile.index));
  }, 0);
}

function groupSellRefund(group: OwnedTileGroup) {
  return groupImprovementTargets(group, "sell").reduce((total, tile) => {
    const development = developmentFor(tile.index);
    return (
      total +
      (development.hotel
        ? Math.round(hotelCost(tile.index) / 2)
        : Math.round(houseCost(tile.index) / 2))
    );
  }, 0);
}

function canBuildGroup(group: OwnedTileGroup) {
  const targets = groupImprovementTargets(group, "build");
  const player = myPlayer.value;
  if (!player || targets.length === 0) return false;
  if (player.cash < groupBuildCost(group)) return false;
  return targets.every((tile) => {
    const level = developmentLevel(developmentFor(tile.index));
    return level >= 4 ? canBuildHotel(tile.index) : canBuildHouse(tile.index);
  });
}

function canSellGroup(group: OwnedTileGroup) {
  const targets = groupImprovementTargets(group, "sell");
  return (
    targets.length > 0 &&
    targets.every((tile) => canSellImprovement(tile.index))
  );
}

function onBuildGroup(group: OwnedTileGroup) {
  if (!canBuildGroup(group)) return;
  for (const tile of groupImprovementTargets(group, "build")) {
    const level = developmentLevel(developmentFor(tile.index));
    send(level >= 4 ? "build_hotel" : "build_house", { tileIndex: tile.index });
  }
}

function onSellGroup(group: OwnedTileGroup) {
  if (!canSellGroup(group)) return;
  for (const tile of groupImprovementTargets(group, "sell")) {
    send("sell_improvement", { tileIndex: tile.index });
  }
}

function onMortgageAll() {
  if (!canMortgageAll.value) return;
  for (const tile of mortgageableTiles.value) {
    send("mortgage", { tileIndex: tile.index });
  }
}

function focusPrimaryAction() {
  nextTick(() => {
    if (!overlayKeyboardEnabled.value || !mpStore.isMyTurn) return;
    if (mpStore.isTurnComplete) {
      nextBtnRef.value?.focus();
      return;
    }
    rollBtnRef.value?.focus();
  });
}

function sellRefund(tileIndex: number) {
  const development = developmentFor(tileIndex);
  if (development.hotel) return Math.round(hotelCost(tileIndex) / 2);
  return Math.round(houseCost(tileIndex) / 2);
}

function developmentLabel(tileIndex: number) {
  const tile = BOARD_TILES.find((candidate) => candidate.index === tileIndex);
  const development = developmentFor(tileIndex);
  if (development.mortgaged) return "Hipotecada";
  if (tile?.type === "railroad") return "Activa";
  if (tile?.type === "utility") return "Activa";
  if (development.hotel) return "Hotel";
  if (development.houses > 0) return `${development.houses}/4 casas`;
  if (ownsFullPropertyGroup(tileIndex)) return "Grupo completo";
  return "Sin mejoras";
}

function historyIcon(type: MPEconomicHistoryItem["type"]) {
  const icons: Record<string, string> = {
    go: "flag",
    purchase: "shopping_cart",
    auction: "gavel",
    mortgage: "account_balance",
    unmortgage: "account_balance_wallet",
    build: "domain_add",
    sell_improvement: "real_estate_agent",
    card_gain: "add_card",
    card_loss: "credit_card_off",
    tax: "receipt_long",
    rent: "payments",
    exchange: "sync_alt",
  };
  return icons[type] ?? "receipt_long";
}

const historyTabs = computed(() => [
  {
    key: "money" as const,
    label: "Dinero",
    icon: "payments",
    count: mpStore.economicHistory.length,
  },
  {
    key: "tiles" as const,
    label: "Casillas",
    icon: "casino",
    count: mpStore.movementHistory.length,
  },
  {
    key: "cards" as const,
    label: "Tarjetas",
    icon: "style",
    count: mpStore.cardHistory.length,
  },
]);

const activeHistoryCount = computed(() => {
  if (activeHistoryTab.value === "tiles") return mpStore.movementHistory.length;
  if (activeHistoryTab.value === "cards") return mpStore.cardHistory.length;
  return mpStore.economicHistory.length;
});

const activeHistoryEmptyText = computed(() => {
  if (activeHistoryTab.value === "tiles") return "Sin movimientos de casillas";
  if (activeHistoryTab.value === "cards") return "Sin tarjetas registradas";
  return "Sin transacciones registradas";
});

function tileLabel(index: number) {
  const normalized = ((index % 40) + 40) % 40;
  return `${normalized + 1}`;
}

function movementHistoryTitle(item: MPMovementHistoryItem) {
  if (item.source === "card") {
    return `${item.playerName} se movio por tarjeta`;
  }
  return `${item.playerName} saco ${item.diceTotal}`;
}

function movementHistoryDetail(item: MPMovementHistoryItem) {
  const from =
    BOARD_TILES[((item.from % 40) + 40) % 40]?.name ??
    `Casilla ${tileLabel(item.from)}`;
  const to =
    BOARD_TILES[((item.to % 40) + 40) % 40]?.name ??
    `Casilla ${tileLabel(item.to)}`;
  if (item.source === "card") {
    return `${from} -> ${to}${item.cardText ? ` | ${item.cardText}` : ""}`;
  }
  return `Dados ${item.diceValues[0]} + ${item.diceValues[1]} | ${from} -> ${to}`;
}

function cardHistoryTitle(item: MPCardHistoryItem) {
  const group = item.group === "chance" ? "Suerte" : "Arca Comunal";
  return `${item.playerName} robo ${group}`;
}

const minimapMarkers = computed(() => {
  const tileCounts = new Map<number, number>();

  return mpStore.players
    .filter((player) => !mpStore.bankruptPlayers.includes(player.id))
    .map((player, idx) => {
      const tile = ((player.position % 40) + 40) % 40;
      const count = tileCounts.get(tile) ?? 0;
      tileCounts.set(tile, count + 1);
      const base = minimapPosition(tile);
      const offset = sharedMinimapOffset(count);

      return {
        id: player.id,
        icon: tokenIcon(player.tokenModel, idx),
        isActive: player.id === mpStore.activePlayer?.id,
        title: `${player.name} - casilla ${tile + 1}`,
        x: base.x + offset.x,
        y: base.y + offset.y,
      };
    });
});

const minimapOwnerMarkers = computed(() =>
  Object.entries(mpStore.propertyOwners)
    .map(([tileKey, ownerId]) => {
      const tileIndex = Number(tileKey);
      const boardTile = BOARD_TILES.find(
        (candidate) => candidate.index === tileIndex,
      );
      const ownerIndex = mpStore.players.findIndex(
        (player) => player.id === ownerId,
      );
      const owner = mpStore.players[ownerIndex];
      const token = tokenConfig(
        owner?.tokenModel,
        ownerIndex >= 0 ? ownerIndex : 0,
      );
      if (!boardTile || !owner || !token) return null;

      const position = minimapPosition(tileIndex);
      const offset = ownerMinimapOffset(tileIndex);

      return {
        id: `${tileIndex}-${ownerId}`,
        icon: token.icon,
        color: token.color,
        title: `${boardTile.name} - ${owner.name}`,
        x: position.x + offset.x,
        y: position.y + offset.y,
      };
    })
    .filter((marker): marker is NonNullable<typeof marker> => Boolean(marker)),
);

const minimapTiles = computed(() => {
  const activeTile = mpStore.activePlayer
    ? ((mpStore.activePlayer.position % 40) + 40) % 40
    : -1;

  return Array.from({ length: 40 }, (_, index) => {
    const position = minimapPosition(index);
    const baseColor = minimapTileBaseColor(index);
    const statusColor = minimapTileStatusColor(index);
    const background = statusColor
      ? `linear-gradient(135deg, ${baseColor} 0 50%, ${statusColor} 50% 100%)`
      : baseColor;
    return {
      index,
      x: position.x,
      y: position.y,
      background,
      label: minimapTileLabel(index),
      isCorner: index % 10 === 0,
      hasActivePlayer: index === activeTile,
      isDark: positionIsDark(statusColor ?? baseColor),
    };
  });
});

function minimapTileBaseColor(tile: number) {
  const boardTile = BOARD_TILES.find((candidate) => candidate.index === tile);
  if (boardTile?.type === "property" && boardTile.color) return boardTile.color;
  return "#9ca3af";
}

function minimapTileStatusColor(tile: number) {
  const development = developmentFor(tile);
  if (development?.mortgaged) return "#050505";
  if (development?.hotel) return "#ef4444";
  if ((development?.houses ?? 0) > 0) return "#22c55e";
  return null;
}

function minimapTileLabel(tile: number) {
  if (tile === 0) return "GO";
  if (tile === 10) return "J";
  if (tile === 20) return "P";
  if (tile === 30) return "C";
  return "";
}

function positionIsDark(color: string) {
  if (color === "#050505") return true;
  const hex = color.replace("#", "");
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 95;
}

function minimapPosition(tile: number) {
  const edgeMin = 7;
  const edgeMax = 93;
  const span = edgeMax - edgeMin;

  if (tile <= 10) return { x: edgeMin + (tile / 10) * span, y: edgeMax };
  if (tile <= 20) return { x: edgeMax, y: edgeMax - ((tile - 10) / 10) * span };
  if (tile <= 30) return { x: edgeMax - ((tile - 20) / 10) * span, y: edgeMin };
  return { x: edgeMin, y: edgeMin + ((tile - 30) / 10) * span };
}

function sharedMinimapOffset(index: number) {
  const offsets = [
    { x: 0, y: 0 },
    { x: 2.2, y: -2.2 },
    { x: -2.2, y: 2.2 },
    { x: 2.2, y: 2.2 },
  ];
  return offsets[index % offsets.length];
}

function ownerMinimapOffset(tile: number) {
  if (tile <= 10) return { x: 0, y: -4.6 };
  if (tile <= 20) return { x: -4.6, y: 0 };
  if (tile <= 30) return { x: 0, y: 4.6 };
  return { x: 4.6, y: 0 };
}

const boardHouseTransforms = computed(() =>
  boardHousePlacements.value.map((placement) => {
    const definition = BOARD_HOUSE_ASSET_DEFINITIONS[placement.type];
    const buildSlots = placement.buildCount
      ? getPropertyBuildingSlots(placement.tileIndex, placement.buildCount)
      : [];
    const buildSlot = placement.buildCount
      ? buildSlots[placement.buildIndex ?? 0]
      : getPropertyBuildSlot(placement.tileIndex);
    const position =
      buildSlot?.position ?? getCasillaCoordinates(placement.tileIndex);
    const rotation = buildSlot?.rotation ?? { x: 0, y: 0, z: 0 };
    const localOffset = getBoardLocalOffset(
      placement.tileIndex,
      placement.inwardOffset ?? definition.defaultInwardOffset,
      placement.alongOffset ?? definition.defaultAlongOffset,
    );

    return {
      position: {
        x:
          position.x +
          localOffset.x +
          (placement.xOffset ?? definition.defaultXOffset),
        y: position.y + (placement.yOffset ?? definition.defaultYOffset),
        z:
          position.z +
          localOffset.z +
          (placement.zOffset ?? definition.defaultZOffset),
      },
      rotation: {
        x: rotation.x,
        y: rotation.y + (placement.rotationYOffset ?? 0),
        z: rotation.z,
      },
      scale: placement.scale ?? definition.defaultScale,
    };
  }),
);

interface BoardHouseLeaf {
  geometry: BufferGeometry;
  material: Material | Material[];
  matrix: Matrix4;
}

const boardHouseLeafCache = new Map<string, BoardHouseLeaf[]>();
const placementMatrix = new Matrix4();
const instanceMatrix = new Matrix4();
const instancePosition = new Vector3();
const instanceQuaternion = new Quaternion();
const instanceEuler = new Euler();
const instanceScale = new Vector3();

function getBoardHouseLeaves(
  modelKey: string,
  source: Group,
): BoardHouseLeaf[] {
  const cached = boardHouseLeafCache.get(modelKey);
  if (cached) return cached;

  source.position.set(0, 0, 0);
  source.rotation.set(0, 0, 0);
  source.scale.set(1, 1, 1);
  source.updateMatrixWorld(true);

  const leaves: BoardHouseLeaf[] = [];
  source.traverse((child) => {
    const mesh = child as Mesh;
    if (!mesh.isMesh) return;
    leaves.push({
      geometry: mesh.geometry,
      material: mesh.material,
      matrix: mesh.matrixWorld.clone(),
    });
  });

  boardHouseLeafCache.set(modelKey, leaves);
  return leaves;
}

function rebuildBoardHouseInstances() {
  const models = boardHouseModels.value;
  const placements = boardHousePlacements.value;
  const transforms = boardHouseTransforms.value;

  const groupedByModel = new Map<
    string,
    { source: Group; indices: number[] }
  >();
  placements.forEach((placement, idx) => {
    const group = getBoardHouseAssetGroup(placement.tileIndex, BOARD_TILES);
    const modelKey = getBoardHouseAssetKey(placement.type, group);
    const source = models.get(modelKey) ?? models.get(placement.type);
    if (!source) return;
    const entry = groupedByModel.get(modelKey);
    if (entry) entry.indices.push(idx);
    else groupedByModel.set(modelKey, { source, indices: [idx] });
  });

  const container = new ThreeGroup();
  for (const [modelKey, { source, indices }] of groupedByModel) {
    const leaves = getBoardHouseLeaves(modelKey, source);
    for (const leaf of leaves) {
      const instanced = new InstancedMesh(
        leaf.geometry,
        leaf.material,
        indices.length,
      );
      instanced.frustumCulled = false;
      indices.forEach((placementIdx, i) => {
        const transform = transforms[placementIdx];
        instancePosition.set(
          transform.position.x,
          transform.position.y,
          transform.position.z,
        );
        instanceEuler.set(
          transform.rotation.x,
          transform.rotation.y,
          transform.rotation.z,
        );
        instanceQuaternion.setFromEuler(instanceEuler);
        instanceScale.setScalar(transform.scale);
        placementMatrix.compose(
          instancePosition,
          instanceQuaternion,
          instanceScale,
        );
        instanceMatrix.multiplyMatrices(placementMatrix, leaf.matrix);
        instanced.setMatrixAt(i, instanceMatrix);
      });

      instanced.instanceMatrix.needsUpdate = true;
      container.add(instanced);
    }
  }

  const previous = boardHouseInstancedGroup.value;
  boardHouseInstancedGroup.value = container;
  if (previous) {
    previous.traverse((child) => {
      const instanced = child as InstancedMesh;
      if (instanced.isInstancedMesh) instanced.dispose();
    });
  }
}

async function loadGltfScene(
  loader: GLTFLoader,
  modelPath: string,
): Promise<Group> {
  return (await loader.loadAsync(modelPath)).scene as Group;
}

async function loadOptionalGltfScene(
  loader: GLTFLoader,
  modelPath: string,
): Promise<Group | null> {
  if (!availableBoardHouseModelPaths.has(modelPath)) return null;
  return await loadGltfScene(loader, modelPath);
}

async function loadBoardHouseModels(
  loader: GLTFLoader,
): Promise<Map<string, Group>> {
  const models = new Map<string, Group>();
  const types = Object.keys(
    BOARD_HOUSE_ASSET_DEFINITIONS,
  ) as BoardHouseAssetType[];

  for (const type of types) {
    const definition = BOARD_HOUSE_ASSET_DEFINITIONS[type];
    const fallbackScene = await loadGltfScene(loader, definition.modelPath);
    models.set(getBoardHouseAssetKey(type), fallbackScene);

    for (const group of BOARD_HOUSE_ASSET_GROUPS) {
      const groupScene =
        (await loadOptionalGltfScene(
          loader,
          getBoardHouseGroupModelPath(type, group),
        )) ?? fallbackScene;
      models.set(getBoardHouseAssetKey(type, group), groupScene);
    }
  }

  return models;
}

async function loadBoardAssets() {
  if (typeof window === "undefined") return;

  const tokenModels = mpStore.players.map((player, idx) =>
    normalizedTokenModel(player.tokenModel, idx),
  );
  if (tokenModels.length === 0) return;

  const signature = tokenModels.join("|");
  if (tableroScene.value && signature === loadedTokenSignature) return;

  const requestId = ++boardLoadRequestId;
  boardLoadError.value = false;

  try {
    const loader = new GLTFLoader();
    const [boardResult, tokenResults, houseModels] = await Promise.all([
      tableroScene.value
        ? Promise.resolve({ scene: tableroScene.value })
        : loader.loadAsync("/models/tablero.glb"),
      Promise.all(
        tokenModels.map((file) => loader.loadAsync(`/models/users/${file}`)),
      ),
      boardHouseModels.value.size
        ? Promise.resolve(boardHouseModels.value)
        : loadBoardHouseModels(loader),
    ]);

    if (requestId !== boardLoadRequestId) return;

    tableroScene.value = boardResult.scene as Group;
    playerScenes.value = tokenResults.map((gltf) => gltf.scene as Group);
    boardHouseLeafCache.clear();
    boardHouseModels.value = houseModels;
    rebuildBoardHouseInstances();
    ensureAnimationState();
    syncIdlePiecePositions();
    loadedTokenSignature = signature;
  } catch (error) {
    boardLoadError.value = true;
    console.error("Error loading multiplayer board assets", error);
  }
}

const buyTileResolved = computed(
  () =>
    BOARD_TILES.find((t) => t.index === buyTileIndex.value) ?? BOARD_TILES[0],
);

const auctionTileName = computed(() => {
  if (!mpStore.auction) return "";
  const tile = BOARD_TILES.find((t) => t.index === mpStore.auction!.tileIndex);
  return tile?.name ?? "Propiedad";
});

const isMyAuctionTurn = computed(() => {
  if (!mpStore.auction || !mpStore.myPlayerId) return false;
  const idx = mpStore.auction.bidderIdx;
  return mpStore.auction.activeBidders[idx] === mpStore.myPlayerId;
});

const currentAuctionBidderName = computed(() => {
  if (!mpStore.auction) return "";
  const bidderId = mpStore.auction.activeBidders[mpStore.auction.bidderIdx];
  return mpStore.players.find((p) => p.id === bidderId)?.name ?? bidderId;
});

function send(type: string, payload?: Record<string, unknown>) {
  socket.send(type, payload);
}

function confirmBuy() {
  send("buy_property", { tileIndex: buyTileIndex.value });
  showBuyPrompt.value = false;
}

function passBuy() {
  send("pass_buy");
  showBuyPrompt.value = false;
}

let unsubscribeSocket: (() => void) | null = null;
let stopBoardAssetWatch: (() => void) | null = null;

// Handle incoming socket events
onMounted(() => {
  if (!tableId || !playerId) {
    navigateTo("/multiplayer/lobby");
    return;
  }

  boardLoadingTimer = setInterval(() => {
    boardLoadingIndex.value =
      (boardLoadingIndex.value + 1) % boardLoadingMessages.length;
  }, 1200);

  mpStore.setConnection(tableId, playerId);
  socket.connect(tableId, playerId);

  stopBoardAssetWatch = watch(
    () =>
      mpStore.players
        .map((player, idx) => normalizedTokenModel(player.tokenModel, idx))
        .join("|"),
    () => {
      void loadBoardAssets();
    },
    { immediate: true },
  );

  unsubscribeSocket = socket.onMessage((msg) => {
    switch (msg.type) {
      case "game_snapshot": {
        const payload = msg.payload as { state: any };
        if (payload?.state) {
          if (movementAnimating.value) {
            pendingSnapshot = payload.state;
            // Update dice display immediately even while animating
            if (mpStore.state) {
              mpStore.state.diceValues = payload.state.diceValues;
              mpStore.state.isDoubles = payload.state.isDoubles;
            }
          } else {
            mpStore.applySnapshot(payload.state);
            syncIdlePiecePositions();
          }
        }
        break;
      }
      case "dice_rolled": {
        diceVisible.value = true;
        if (diceHideTimer) clearTimeout(diceHideTimer);
        diceHideTimer = setTimeout(() => {
          diceVisible.value = false;
        }, 2500);
        break;
      }
      case "player_moved": {
        const payload = msg.payload as {
          playerId: string;
          from: number;
          to: number;
          path?: number[];
        };
        const playerIdx = mpStore.players.findIndex(
          (player) => player.id === payload.playerId,
        );
        if (playerIdx >= 0) {
          ensureAnimationState();

          const currentPos =
            payload.from ?? mpStore.players[playerIdx].position;
          const targetPos = payload.to;

          if (currentPos === targetPos) return;

          movementAnimating.value = true;
          const moveId = ++movementSeq;

          const isMyPlayer = payload.playerId === mpStore.myPlayerId;
          if (isMyPlayer) {
            isAnimatingMyMove.value = true;
            showBuyPrompt.value = false;
          }

          const movePath =
            payload.path && payload.path.length > 0
              ? payload.path
              : [targetPos];

          const finishMovement = () => {
            if (moveId !== movementSeq) return;
            onMovementComplete();
            if (isMyPlayer) {
              const pos = ((payload.to % 40) + 40) % 40;
              const tile = BOARD_TILES[pos];
              if (
                isOwnableTile(tile) &&
                mpStore.propertyOwners[tile.index] === undefined &&
                mpStore.isMyTurn
              ) {
                buyTileIndex.value = tile.index;
                showBuyPrompt.value = true;
              }
              isAnimatingMyMove.value = false;
            }
          };

          let stepIdx = 0;

          const animateNextStep = () => {
            if (stepIdx >= movePath.length) return;

            const nextPos = movePath[stepIdx];
            const fromPos = stepIdx === 0 ? currentPos : movePath[stepIdx - 1];

            const fromCoords = getCasillaCoordinates(
              ((fromPos % 40) + 40) % 40,
            );
            const toCoords = getCasillaCoordinates(((nextPos % 40) + 40) % 40);

            startHop(playerIdx, fromCoords, toCoords);
            mpStore.players[playerIdx].position = nextPos;

            stepIdx++;
            if (stepIdx < movePath.length) {
              setTimeout(animateNextStep, 300);
            } else {
              setTimeout(finishMovement, 250 + REVEAL_DELAY_MS);
            }
          };

          animateNextStep();
        }
        break;
      }
      case "player_connected":
        mpStore.setPlayerConnected(msg.payload as any);
        break;
      case "player_disconnected":
        mpStore.setPlayerDisconnected(msg.payload as any);
        break;
      case "bot_thinking": {
        const p = msg.payload as { playerId: string; delayMs: number };
        if (movementAnimating.value) {
          pendingBotThinking = {
            playerId: p.playerId,
            delayMs: p.delayMs,
            receivedAt: Date.now(),
          };
          break;
        }
        showBotThinking(p.delayMs);
        break;
      }
      case "auction_started": {
        showBuyPrompt.value = false;
        break;
      }
      case "auction_ended": {
        // state will be refreshed via next game_snapshot
        break;
      }
    }
  });
});

onUnmounted(() => {
  if (diceHideTimer) clearTimeout(diceHideTimer);
  if (boardLoadingTimer) clearInterval(boardLoadingTimer);
  if (botThinkingTimer) clearTimeout(botThinkingTimer);
  stopBoardAssetWatch?.();
  unsubscribeSocket?.();
  socket.disconnect();
  mpStore.reset();
});

watch(boardHousePlacements, rebuildBoardHouseInstances, { deep: true });

watch(
  () =>
    mpStore.players
      .map((player) => `${player.id}:${player.position}`)
      .join("|"),
  () => {
    ensureAnimationState();
  },
);

watch(
  () => mpStore.economicHistory[0]?.id,
  () => {
    const item = mpStore.economicHistory[0];
    if (!item) return;
    visibleHistorySnackbars.value = [
      item,
      ...visibleHistorySnackbars.value,
    ].slice(0, 3);
    window.setTimeout(() => {
      visibleHistorySnackbars.value = visibleHistorySnackbars.value.filter(
        (candidate) => candidate.id !== item.id,
      );
    }, 5200);
  },
);

watch(overlayKeyboardEnabled, (enabled) => {
  if (enabled) focusPrimaryAction();
});

watch(
  () => mpStore.activePlayerIndex,
  () => focusPrimaryAction(),
);

watch(
  () => mpStore.isTurnComplete,
  () => focusPrimaryAction(),
);

watch(sidebarOpen, (open) => {
  if (open) {
    nextTick(() => propertySearchInputRef.value?.focus());
  } else {
    searchTerm.value = "";
    focusPrimaryAction();
  }
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    if (showHistoryDialog.value) showHistoryDialog.value = false;
    else if (sidebarOpen.value) sidebarOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  focusPrimaryAction();
});

onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
});

// Show buy prompt when landing on unowned buyable tile (only for this player)
watch(
  () => mpStore.state?.isTurnComplete,
  (done, prev) => {
    if (!done && prev === true) {
      // turn reset — check if we're the active player and on a buyable tile
      if (!mpStore.isMyTurn) return;
      const p = myPlayer.value;
      if (!p) return;
      const pos = ((p.position % 40) + 40) % 40;
      const tile = BOARD_TILES.find((t) => t.index === pos);
      if (!tile?.price) return;
      const ownerID = mpStore.propertyOwners[pos];
      if (!ownerID && !mpStore.isAuctionActive) {
        buyTileIndex.value = pos;
        showBuyPrompt.value = true;
      }
    }
  },
);
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1");

.mp-game-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  background: #1a1a2e;
  overflow: hidden;
  font-family: "Inter", sans-serif;
  color: #f8fafc;
}

.mp-board-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
}

.board-loading {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 20;
  transform: translate(-50%, -50%);
  min-width: 260px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(10, 16, 25, 0.82);
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
  font-weight: 700;
  pointer-events: none;
}

.board-loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(250, 204, 21, 0.28);
  border-top-color: #facc15;
  border-radius: 50%;
  animation: boardLoaderSpin 0.85s linear infinite;
}

.board-loading-dots::after {
  content: "";
  display: inline-block;
  width: 18px;
  text-align: left;
  animation: boardLoaderDots 1.2s steps(4, end) infinite;
}

@keyframes boardLoaderSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes boardLoaderDots {
  0% {
    content: "";
  }
  25% {
    content: ".";
  }
  50% {
    content: "..";
  }
  75%,
  100% {
    content: "...";
  }
}

.board-error {
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.35);
}

.conn-overlay,
.winner-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
}

.conn-card,
.winner-card {
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 32px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.conn-icon {
  font-size: 48px;
  color: #94a3b8;
}
.winner-icon {
  font-size: 56px;
  color: #fbbf24;
  font-variation-settings: "FILL" 1;
}
.winner-card h2 {
  font-size: 24px;
  font-weight: 800;
  margin: 0;
}

.players-hud {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 100;
  width: min(300px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 7px;
  pointer-events: none;
}

.players-hud-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px 2px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.players-hud-title strong {
  min-width: 24px;
  padding: 3px 7px;
  border-radius: 8px;
  color: #111827;
  background: #facc15;
  font-weight: 600;
  text-align: center;
}

.hud-player {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  padding: 8px 10px;
  color: #fff;
  background: rgba(10, 16, 25, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.hud-active {
  border-color: rgba(134, 239, 172, 0.48);
  background: linear-gradient(
    90deg,
    rgba(22, 163, 74, 0.22),
    rgba(10, 16, 25, 0.84)
  );
}
.hud-bankrupt {
  opacity: 0.38;
  filter: grayscale(0.7);
}
.hud-me {
  border-color: rgba(59, 130, 246, 0.4);
}

.hud-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  font-size: 16px;
}
.hud-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hud-name {
  color: #f8fafc;
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hud-position {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
}
.hud-cash {
  color: #86efac;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.hud-negative {
  color: #f87171;
}

.hud-bot-badge,
.hud-you-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
  vertical-align: middle;
}
.bot-regular {
  background: rgba(59, 130, 246, 0.2);
  color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.3);
}
.bot-hard {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.hud-you-badge {
  background: rgba(0, 245, 155, 0.15);
  color: #00e38f;
  border: 1px solid rgba(0, 245, 155, 0.25);
}

.overlay-container {
  position: absolute;
  bottom: 26px;
  left: 50%;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: min(760px, calc(100vw - 32px));
  transform: translateX(-50%);
  pointer-events: none;
}

.status-card {
  width: min(680px, 100%);
  display: grid;
  grid-template-columns: minmax(190px, auto) minmax(0, 1fr);
  gap: 10px 14px;
  align-items: center;
  padding: 10px 12px;
  background: rgba(10, 16, 25, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 8px;
  backdrop-filter: blur(12px);
  pointer-events: auto;
}

.status-player {
  display: flex;
  align-items: center;
  gap: 10px;
}
.status-token {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #facc15;
  color: #111827;
  font-size: 20px;
  font-weight: 950;
}
.status-kicker {
  display: block;
  color: rgba(255, 255, 255, 0.52);
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
}
.status-player strong {
  display: block;
  color: #f8fafc;
  font-size: 15px;
  font-weight: 700;
}
.status-details {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 7px;
}
.status-chip {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  border-radius: 8px;
  color: #dbeafe;
  background: rgba(37, 99, 235, 0.16);
  border: 1px solid rgba(147, 197, 253, 0.18);
  font-size: 11px;
  font-weight: 600;
}
.doubles-badge {
  padding: 4px 8px;
  border-radius: 8px;
  background: #f59e0b;
  color: #111827;
  font-size: 11px;
  font-weight: 600;
}
.offline-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.16);
  color: #fca5a5;
  font-size: 11px;
}
.status-card p {
  grid-column: 1/-1;
  margin: 0;
  color: #86efac;
  font-size: 12px;
  text-align: center;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  pointer-events: auto;
}

.action-btn {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 13px 20px;
  color: white;
  border: 0;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.roll-btn {
  min-width: 178px;
  background: #10b981;
  box-shadow: 0 12px 22px rgba(16, 185, 129, 0.34);
}
.roll-btn:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-2px);
}
.next-btn {
  background: #2563eb;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.34);
}
.next-btn:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-2px);
}
.bail-btn {
  background: #f59e0b;
  color: #111827;
}
.bail-btn:hover:not(:disabled) {
  background: #d97706;
  transform: translateY(-2px);
}
.config-btn {
  background: #475569;
}
.config-btn:hover {
  background: #334155;
  transform: translateY(-2px);
}

.waiting-indicator,
.waiting-auction {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  color: #94a3b8;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.bot-thinking-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  background: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  color: #93c5fd;
  font-size: 14px;
  font-weight: 600;
  animation: botPulse 1.5s ease-in-out infinite;
}
.bot-thinking-icon {
  font-size: 22px;
  animation: botSpin 2s linear infinite;
}

@keyframes botPulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}
@keyframes botSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.history-snackbar-stack {
  position: absolute;
  left: 16px;
  top: 16px;
  z-index: 180;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}

.history-snackbar {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #f8fafc;
  background: rgba(10, 16, 25, 0.92);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.28);
  backdrop-filter: blur(12px);
}

.history-snackbar .material-symbols-outlined {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  color: #111827;
  background: #facc15;
}

.history-snackbar strong {
  display: block;
  font-size: 12px;
}

.history-snackbar p {
  margin: 2px 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 11px;
  line-height: 1.3;
}

.history-amount {
  color: #86efac;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
}

.history-card_loss .history-amount,
.history-tax .history-amount,
.history-rent .history-amount,
.history-purchase .history-amount,
.history-auction .history-amount {
  color: #fca5a5;
}

.history-snackbar-enter-active,
.history-snackbar-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}
.history-snackbar-enter-from,
.history-snackbar-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

.minimap-wrapper {
  position: absolute;
  right: 16px;
  bottom: 88px;
  z-index: 95;
  width: 220px;
  pointer-events: auto;
}

.board-minimap {
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(10, 16, 25, 0.84);
  backdrop-filter: blur(12px);
}

.history-trigger-btn {
  width: 100%;
  margin-top: 8px;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.88);
  color: #dbeafe;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.history-trigger-btn:hover {
  border-color: rgba(147, 197, 253, 0.36);
  background: rgba(37, 99, 235, 0.22);
}

.minimap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.minimap-header strong {
  min-width: 24px;
  padding: 3px 7px;
  border-radius: 8px;
  background: #facc15;
  color: #111827;
  text-align: center;
}

.minimap-board {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
}

.minimap-center {
  position: absolute;
  inset: 24%;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
}

.minimap-legend {
  display: flex;
  flex-direction: column;
  gap: 3px;
  color: rgba(255, 255, 255, 0.56);
  font-size: 9px;
  font-weight: 700;
}

.minimap-legend span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  display: inline-block;
}
.legend-house {
  background: #22c55e;
}
.legend-hotel {
  background: #ef4444;
}
.legend-mortgage {
  background: #050505;
  border: 1px solid rgba(255, 255, 255, 0.22);
}

.minimap-tile {
  position: absolute;
  width: 11.5%;
  height: 11.5%;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 3px;
  color: #111827;
  font-size: 8px;
  font-weight: 900;
}

.minimap-tile-corner {
  width: 14%;
  height: 14%;
}
.minimap-tile-active {
  outline: 2px solid #facc15;
  outline-offset: 1px;
}
.minimap-tile-dark {
  color: #f8fafc;
}

.minimap-owner-marker,
.minimap-marker {
  position: absolute;
  width: 17px;
  height: 17px;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  font-size: 10px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.32);
}

.minimap-owner-marker {
  border: 2px solid #94a3b8;
  opacity: 0.82;
}

.minimap-marker {
  border: 1px solid rgba(255, 255, 255, 0.42);
  z-index: 4;
}

.minimap-marker-active {
  width: 22px;
  height: 22px;
  border-color: #facc15;
  box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.22);
}

.sidebar-config {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 190;
  width: min(380px, 92vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(
    180deg,
    rgba(18, 24, 35, 0.98),
    rgba(9, 13, 22, 0.98)
  );
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 22px 0 40px rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(14px);
  pointer-events: auto;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-title {
  color: #f8fafc;
  font-size: 16px;
  font-weight: 800;
}

.sidebar-close {
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
}

.sidebar-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  overflow-y: auto;
}

.player-summary {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
}

.player-avatar {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: #facc15;
  color: #111827;
  font-weight: 950;
}

.player-summary-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.player-summary-copy span,
.panel-kicker {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}
.player-summary-copy strong,
.panel-title {
  color: #f8fafc;
  font-size: 15px;
  font-weight: 800;
}
.player-cash {
  color: #86efac;
  font-weight: 900;
}

.quick-actions {
  display: grid;
  gap: 8px;
}

.sidebar-btn {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid rgba(147, 197, 253, 0.22);
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.16);
  color: #dbeafe;
  font-weight: 800;
  cursor: pointer;
}

.property-panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.panel-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
}
.panel-count {
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.74);
  font-size: 11px;
  font-weight: 800;
}

.property-search {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}
.property-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #f8fafc;
}

.empty-text {
  padding: 18px 10px;
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.52);
  text-align: center;
}

.property-groups,
.property-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.property-group {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.045);
  overflow: hidden;
}

.group-header {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 10px;
}
.group-color,
.property-accent {
  width: 10px;
  height: 30px;
  border-radius: 6px;
  background: var(--property-accent);
}
.group-header strong {
  display: block;
  color: #f8fafc;
  font-size: 13px;
}
.group-header span:last-child {
  color: rgba(255, 255, 255, 0.52);
  font-size: 11px;
}

.property-card {
  margin: 0 10px 10px;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(10, 16, 25, 0.64);
}
.property-card.mortgaged {
  opacity: 0.72;
}

.property-main {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.property-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.property-copy strong {
  overflow: hidden;
  color: #f8fafc;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.property-copy span,
.property-price {
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  font-weight: 700;
}

.property-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.mini-action {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #f8fafc;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}
.build-action {
  background: rgba(34, 197, 94, 0.14);
}
.hotel-action {
  background: rgba(239, 68, 68, 0.16);
}
.sell-action {
  background: rgba(14, 165, 233, 0.16);
}
.mortgage-action {
  background: rgba(250, 204, 21, 0.13);
}
.disabled-btn,
.mini-action:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.history-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 600;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(5px);
}
.history-dialog {
  width: min(720px, 100%);
  max-height: min(680px, calc(100vh - 36px));
  display: flex;
  flex-direction: column;
  font-family: "JetBrains Mono", monospace;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  background: rgba(10, 16, 25, 0.96);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
}
.history-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.history-dialog-kicker,
.history-dialog-title {
  display: block;
}
.history-dialog-kicker {
  color: rgba(255, 255, 255, 0.52);
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
}
.history-dialog-title {
  color: #f8fafc;
  font-size: 18px;
  font-weight: 900;
}
.history-dialog-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.history-dialog-count {
  min-width: 28px;
  padding: 5px 8px;
  border-radius: 8px;
  color: #111827;
  background: #facc15;
  font-weight: 900;
  text-align: center;
}
.history-dialog-close {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #f8fafc;
  cursor: pointer;
}
.history-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.history-tab {
  min-width: 0;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.68);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}
.history-tab span:not(.material-symbols-outlined) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-tab .material-symbols-outlined {
  font-size: 18px;
}
.history-tab strong {
  min-width: 22px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
  font-size: 11px;
}
.history-tab-active {
  border-color: rgba(250, 204, 21, 0.52);
  background: rgba(250, 204, 21, 0.16);
  color: #fef3c7;
}
.history-dialog-empty {
  padding: 26px;
  color: rgba(255, 255, 255, 0.52);
  text-align: center;
}
.history-dialog-list {
  overflow-y: auto;
  padding: 12px;
}
.history-dialog-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.history-dialog-item-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(250, 204, 21, 0.18);
  color: #facc15;
}
.history-dialog-item-copy {
  min-width: 0;
}
.history-dialog-item-copy strong,
.history-dialog-item-copy span {
  display: block;
}
.history-dialog-item-copy strong {
  color: #f8fafc;
  font-size: 13px;
}
.history-dialog-item-copy span {
  color: rgba(255, 255, 255, 0.58);
  font-size: 12px;
}
.history-dialog-item-amount {
  color: #86efac;
  font-size: 12px;
  font-weight: 900;
  white-space: nowrap;
}

.sidebar-enter-active,
.sidebar-leave-active {
  transition:
    transform 0.22s ease,
    opacity 0.22s ease;
}
.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 0;
  transform: translateX(-18px);
}

/* Overlays */
.buy-overlay,
.card-overlay,
.auction-overlay {
  position: absolute;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.buy-card,
.card-card,
.auction-card {
  background: rgba(15, 23, 42, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  padding: 28px 32px;
  min-width: min(400px, 100%);
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  text-align: center;
}
.buy-card h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
}
.buy-price {
  font-size: 36px;
  font-weight: 800;
  color: #34d399;
  margin: 0;
}
.buy-actions {
  display: flex;
  gap: 12px;
}

.card-group {
  font-size: 13px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
}
.card-text {
  font-size: 16px;
  color: #f8fafc;
  max-width: 340px;
  line-height: 1.5;
  margin: 0;
}

.auction-header-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.auction-tag {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  color: #34d399;
  letter-spacing: 0.12em;
}
.auction-header-section strong {
  font-size: 22px;
}
.auction-bid-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  width: 100%;
}
.bid-label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 4px;
}
.bid-amount {
  font-size: 32px;
  font-weight: 800;
  color: #34d399;
  font-family: monospace;
}
.bid-bidder {
  font-size: 18px;
  font-weight: 700;
}
.auction-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 100%;
}
.bid-btn {
  min-height: 60px;
  border-radius: 8px;
  border: 1px solid rgba(52, 211, 153, 0.3);
  background: rgba(52, 211, 153, 0.1);
  color: #d1fae5;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.16s;
}
.bid-btn:hover:not(:disabled) {
  background: rgba(52, 211, 153, 0.2);
  transform: translateY(-1px);
}
.bid-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.bid-btn small {
  font-size: 11px;
  font-weight: 600;
  color: #86efac;
  display: block;
}
.pass-bid-btn {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.22);
  background: rgba(127, 29, 29, 0.16);
  color: #fecaca;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.pass-bid-btn:hover {
  background: rgba(127, 29, 29, 0.28);
}

.dado-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  color: #ecfdf5;
  background: rgba(10, 16, 25, 0.9);
  border: 1px solid rgba(134, 239, 172, 0.24);
  border-radius: 8px;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
  pointer-events: none;
  margin-top: 8px;
}

.dice-enter-active {
  animation: diceSlideIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.dice-leave-active {
  animation: diceSlideIn 0.2s ease-in reverse both;
}

@keyframes diceSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
.dado-titulo {
  color: #86efac;
  font-size: 11px;
  font-weight: 600;
}
.dados-row {
  display: flex;
  gap: 10px;
}
.dado-pequeno {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  background: #fff;
  color: #111827;
  border-radius: 8px;
  font-size: 22px;
  font-weight: 900;
  border: 1px solid rgba(15, 23, 42, 0.15);
}
.doubles-text {
  color: #fbbf24;
  font-weight: 600;
  margin-left: 6px;
}

.conn-badge {
  position: absolute;
  bottom: 16px;
  right: 16px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
  pointer-events: none;
}
.conn-badge.online {
  background: rgba(16, 185, 129, 0.14);
  color: #86efac;
  border: 1px solid rgba(16, 185, 129, 0.22);
}
.conn-badge.offline {
  background: rgba(239, 68, 68, 0.14);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.22);
  animation: blink 1s infinite;
}

.config-active {
  background: #2563eb;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.3);
}

.action-btn:focus-visible,
.history-trigger-btn:focus-visible,
.sidebar-btn:focus-visible,
.mini-action:focus-visible {
  outline: 2px solid #00e38f;
  outline-offset: 3px;
  box-shadow: 0 0 0 4px rgba(0, 245, 155, 0.25);
}

.history-snackbar-stack {
  left: 50%;
  top: 16px;
  z-index: 360;
  width: min(560px, calc(100vw - 32px));
  display: grid;
  gap: 10px;
  transform: translateX(-50%);
}

.history-snackbar {
  min-height: 64px;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(148, 163, 184, 0.26);
  box-shadow: 0 18px 34px rgba(0, 0, 0, 0.36);
}

.history-snackbar .material-symbols-outlined {
  color: #93c5fd;
  background: rgba(148, 163, 184, 0.14);
}

.history-snackbar strong {
  margin-bottom: 3px;
  font-size: 13px;
  font-weight: 800;
}

.history-snackbar p {
  margin: 0;
  color: rgba(226, 232, 240, 0.78);
  font-weight: 600;
}

.history-amount {
  align-self: start;
  padding: 4px 7px;
  border-radius: 6px;
  background: rgba(34, 197, 94, 0.14);
}

.history-card_loss .history-amount,
.history-tax .history-amount,
.history-rent .history-amount,
.history-purchase .history-amount,
.history-auction .history-amount {
  background: rgba(248, 113, 113, 0.14);
}

.history-snackbar-enter-from,
.history-snackbar-leave-to {
  transform: translateY(-16px);
}

.minimap-wrapper {
  top: 16px;
  left: 16px;
  right: auto;
  bottom: auto;
  width: 226px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.board-minimap {
  width: 100%;
  background: rgba(10, 16, 25, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.26);
  pointer-events: none;
}

.history-trigger-btn {
  margin-top: 0;
  min-height: 36px;
  gap: 7px;
  padding: 8px 12px;
  color: #c4b5fd;
  background: rgba(49, 46, 129, 0.72);
  border: 1px solid rgba(129, 140, 248, 0.3);
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  pointer-events: auto;
}

.history-trigger-btn:hover {
  color: #e9d5ff;
  background: rgba(67, 56, 202, 0.82);
  transform: translateY(-1px);
}

.minimap-header {
  color: rgba(255, 255, 255, 0.64);
  font-weight: 600;
}

.minimap-header strong {
  background: #86efac;
}

.minimap-board {
  background:
    linear-gradient(rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.94)) center / 70%
      70% no-repeat,
    #273142;
  border: 1px solid rgba(255, 255, 255, 0.14);
  overflow: hidden;
}

.minimap-center {
  inset: 17%;
  padding: 8px;
  border-radius: 6px;
  background: rgba(10, 16, 25, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.minimap-legend {
  width: 100%;
  display: grid;
  gap: 5px;
  color: rgba(248, 250, 252, 0.78);
  font-size: 10px;
  line-height: 1;
}

.legend-swatch {
  width: 13px;
  height: 13px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.legend-house {
  background: linear-gradient(135deg, #f8fafc 0 50%, #22c55e 50% 100%);
}

.legend-hotel {
  background: linear-gradient(135deg, #f8fafc 0 50%, #ef4444 50% 100%);
}

.legend-mortgage {
  background: linear-gradient(135deg, #f8fafc 0 50%, #050505 50% 100%);
}

.minimap-tile {
  width: 21px;
  height: 21px;
  border: 1px solid rgba(15, 23, 42, 0.58);
  border-radius: 4px;
  font-weight: 800;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
  z-index: 1;
}

.minimap-tile-corner {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  font-size: 10px;
  z-index: 2;
}

.minimap-tile-active {
  outline-color: #86efac;
}

.minimap-owner-marker {
  width: 13px;
  height: 13px;
  color: #f8fafc;
  background: rgba(17, 24, 39, 0.92);
  border: 1px solid rgba(248, 250, 252, 0.78);
  font-size: 8px;
  z-index: 3;
}

.minimap-marker {
  width: 25px;
  height: 25px;
  color: #f8fafc;
  background: #111827;
  border: 2px solid rgba(248, 250, 252, 0.85);
  font-size: 13px;
}

.minimap-marker-active {
  border-color: #86efac;
  box-shadow:
    0 0 0 3px rgba(134, 239, 172, 0.22),
    0 4px 10px rgba(0, 0, 0, 0.38);
}

.sidebar-config {
  z-index: 170;
  background: linear-gradient(
    180deg,
    rgba(18, 24, 35, 0.98) 0%,
    rgba(9, 13, 22, 0.98) 100%
  );
}

.sidebar-title,
.panel-title {
  font-weight: 700;
  letter-spacing: 0;
}

.sidebar-close {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  transition: all 0.2s ease;
}

.sidebar-close:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.4);
}

.player-summary-copy {
  gap: 3px;
}

.player-summary-copy span,
.panel-kicker,
.group-header span {
  color: rgba(255, 255, 255, 0.56);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0;
}

.player-cash {
  padding: 7px 9px;
  border-radius: 8px;
  background: rgba(22, 163, 74, 0.14);
  border: 1px solid rgba(134, 239, 172, 0.2);
  font-size: 13px;
  font-weight: 600;
}

.quick-actions {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.sidebar-btn {
  min-height: 44px;
  padding: 12px;
  border: 0;
  color: white;
  font-size: 13px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.cam-btn {
  background: #475569;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.cam-btn:hover:not(.cam-active) {
  background: #334155;
  transform: translateY(-2px);
}

.cam-active {
  background: #16a34a;
  box-shadow: 0 8px 16px rgba(22, 163, 74, 0.28);
}

.mortgage-all-btn {
  background: linear-gradient(135deg, #334155, #0f766e);
  border: 1px solid rgba(45, 212, 191, 0.28);
  box-shadow: 0 8px 16px rgba(15, 118, 110, 0.2);
}

.mortgage-all-btn:hover:not(.disabled-btn) {
  filter: brightness(1.08);
  transform: translateY(-2px);
}

.property-panel {
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
  display: block;
  font-size: 18px;
  line-height: 1.15;
}

.panel-count {
  min-width: 24px;
  padding: 5px 9px;
  background: rgba(74, 222, 128, 0.13);
  color: #86efac;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.property-search {
  min-height: 42px;
  display: flex;
  padding: 0 11px;
  color: rgba(255, 255, 255, 0.58);
  background: rgba(255, 255, 255, 0.06);
}

.property-search input {
  min-width: 0;
  font-size: 13px;
  font-weight: 400;
}

.property-search input::placeholder {
  color: rgba(255, 255, 255, 0.42);
}

.property-groups {
  gap: 16px;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 0;
  background: transparent;
  overflow: visible;
}

.group-header {
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 9px;
  padding: 0 2px;
}

.group-color {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  box-shadow: 0 0 16px
    color-mix(in srgb, var(--property-accent), transparent 44%);
}

.group-header div {
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.group-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--property-accent), transparent 74%);
  background: color-mix(in srgb, var(--property-accent), transparent 92%);
}

.property-card {
  margin: 0;
  padding: 10px 10px 11px;
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--property-accent), transparent 88%) 0%,
      rgba(255, 255, 255, 0.055) 42%
    ),
    rgba(255, 255, 255, 0.055);
}

.property-card.mortgaged {
  opacity: 1;
  filter: grayscale(0.35);
  background: rgba(148, 163, 184, 0.08);
}

.property-main {
  grid-template-columns: 8px minmax(0, 1fr) auto;
  margin-bottom: 0;
  min-width: 0;
}

.property-accent {
  width: 8px;
  border-radius: 999px;
  box-shadow: 0 0 14px
    color-mix(in srgb, var(--property-accent), transparent 42%);
}

.property-copy {
  gap: 2px;
}

.property-copy strong {
  font-weight: 600;
  line-height: 1.2;
  overflow-wrap: anywhere;
  white-space: normal;
}

.property-copy span {
  font-size: 12px;
  font-weight: 500;
}

.property-price {
  padding: 4px 7px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #f8fafc;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.property-actions {
  margin-top: 9px;
}

.mini-action {
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: white;
  font-weight: 700;
  transition: all 0.16s ease;
  min-width: 0;
}

.mini-action span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mini-action:hover:not(.disabled-btn) {
  transform: translateY(-1px);
  filter: brightness(1.06);
}

.build-action {
  background: #2563eb;
}

.hotel-action {
  background: #dc2626;
}

.sell-action {
  background: #d97706;
}

.mortgage-action {
  background: #475569;
}

.history-dialog-overlay {
  z-index: 9000;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(4px);
  padding: 16px;
}

.history-dialog {
  width: min(720px, 100%);
  max-height: min(680px, calc(100vh - 32px));
  border-radius: 12px;
  background: linear-gradient(
    180deg,
    rgba(18, 24, 35, 0.99) 0%,
    rgba(9, 13, 22, 0.99) 100%
  );
  border: 1px solid rgba(129, 140, 248, 0.3);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.history-dialog-count {
  background: rgba(74, 222, 128, 0.12);
  color: #86efac;
}

.history-dialog-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 18px;
}

.history-dialog-item {
  align-items: start;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.7);
}

.history-dialog-item-icon {
  width: 32px;
  height: 32px;
  background: rgba(129, 140, 248, 0.16);
  color: #c4b5fd;
  font-size: 17px !important;
}

.history-dialog-item-amount {
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(15, 118, 110, 0.22);
  color: #99f6e4;
  font-size: 11px;
}

.sidebar-enter-active {
  transition: transform 0.25s ease-out;
}

.sidebar-leave-active {
  transition: transform 0.2s ease-in;
}

.sidebar-enter-from,
.sidebar-leave-to {
  opacity: 1;
  transform: translateX(-100%);
}

.minimap-toggle-btn {
  display: none;
}

@media (max-width: 720px) {
  .players-hud {
    left: 12px;
    right: 12px;
    top: 238px;
    width: auto;
  }

  .minimap-wrapper {
    top: 12px;
    left: 12px;
    width: 190px;
  }

  .overlay-container {
    bottom: 16px;
    width: calc(100vw - 24px);
  }

  .status-card {
    grid-template-columns: 1fr;
  }

  .status-details {
    justify-content: flex-start;
  }

  .action-buttons,
  .action-btn {
    width: 100%;
  }

  .quick-actions,
  .property-actions,
  .group-actions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .players-hud {
    display: none;
  }

  .minimap-toggle-btn {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 132;
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 9px 12px;
    border: 1px solid rgba(129, 140, 248, 0.3);
    border-radius: 8px;
    color: #e9d5ff;
    background: rgba(49, 46, 129, 0.82);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.28);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    pointer-events: auto;
    backdrop-filter: blur(10px);
  }

  .minimap-toggle-active {
    color: #111827;
    background: #86efac;
    border-color: rgba(134, 239, 172, 0.6);
  }

  .minimap-wrapper {
    display: none;
    top: 58px;
    left: 12px;
    width: min(226px, calc(100vw - 24px));
    z-index: 131;
  }

  .minimap-wrapper.minimap-open {
    display: flex;
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.material-symbols-outlined {
  font-variation-settings:
    "FILL" 0,
    "wght" 400;
  font-size: 18px;
  line-height: 1;
}
</style>
