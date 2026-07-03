<template>
  <div class="landing-page" ref="pageRef">
    <!-- Fixed ambient glow orbs -->
    <div class="ambient-glow ambient-1" />
    <div class="ambient-glow ambient-2" />
    <div class="ambient-glow ambient-3" />

    <AppHeader>
      <template #actions>
        <nav class="header-nav" :aria-label="t('landing.nav.ariaLabel')">
          <button @click="scrollToSection('modos')">
            {{ t("landing.nav.modes") }}
          </button>
          <button @click="scrollToSection('experiencia')">
            {{ t("landing.nav.experience") }}
          </button>
          <button @click="scrollToSection('showcase')">
            {{ t("landing.nav.live") }}
          </button>
          <button class="nav-primary" @click="navigateTo('/setup')">
            {{ t("landing.nav.play") }}
          </button>
        </nav>
      </template>
    </AppHeader>

    <main>
      <!-- ── HERO ──────────────────────────────────────── -->
      <section class="landing-section landing-hero" id="hero">
        <canvas ref="canvasRef" class="particle-canvas" />

        <div class="hero-grid">
          <div class="hero-copy">
            <span
              class="hero-kicker hero-kicker-live"
              :style="{ '--kicker-color': currentHeroMessage.color }"
            >
              <span
                :key="`${heroMessageIndex}-icon`"
                class="material-symbols-outlined"
                :style="{ color: currentHeroMessage.color }"
              >
                {{ currentHeroMessage.icon }}
              </span>
              <span :key="`${heroMessageIndex}-text`" :style="{ color: currentHeroMessage.color }">
                {{ t(currentHeroMessage.textKey) }}
              </span>
            </span>

            <h1 class="hero-title">
              {{ t("landing.hero.title.prefix") }}
              <span class="hero-title-accent">{{ t("landing.hero.title.highlight") }}</span>
            </h1>

            <p class="hero-subtitle">{{ t("landing.hero.subtitle") }}</p>

            <div class="hero-actions">
              <button class="hero-primary" @click="navigateTo('/setup')">
                <span class="material-symbols-outlined">play_arrow</span>
                {{ t("landing.hero.single") }}
              </button>
              <button class="hero-secondary" @click="navigateTo('/multiplayer/lobby?mode=create')">
                <span class="material-symbols-outlined">wifi</span>
                {{ t("landing.hero.friends") }}
              </button>
            </div>

            <dl class="hero-stats">
              <div v-for="stat in heroStats" :key="stat.label" class="hero-stat">
                <dt>{{ stat.value }}</dt>
                <dd>{{ stat.label }}</dd>
              </div>
            </dl>
          </div>

          <div class="hero-visual">
            <div class="hero-visual-glow" aria-hidden="true" />

            <div class="hero-dice-float">
              <DiceTray :size="60" />
              <span class="hero-dice-caption">{{ t("landing.hero.diceCaption") }}</span>
            </div>

            <div class="hero-frame">
              <div class="hero-frame-bar">
                <span class="hero-frame-dot dot-red" />
                <span class="hero-frame-dot dot-yellow" />
                <span class="hero-frame-dot dot-green" />
                <span class="hero-frame-url">gamepoly.app/partida</span>
              </div>
              <div class="hero-frame-image">
                <img
                  src="/images/game-board.webp"
                  alt="Partida de GamePoly con tablero 3D isometrico, fichas y propiedades"
                  loading="eager"
                  width="1600"
                  height="825"
                />
              </div>
            </div>

            <div class="hero-chip hero-chip-auction">
              <span class="material-symbols-outlined">gavel</span>
              {{ t("landing.hero.chip.auction") }}
            </div>
            <div class="hero-chip hero-chip-bot">
              <span class="material-symbols-outlined">smart_toy</span>
              {{ t("landing.hero.chip.bot") }}
            </div>
          </div>
        </div>

        <button class="scroll-hint" @click="scrollToSection('features')" aria-label="Siguiente sección">
          <span class="scroll-hint-dot" />
        </button>
      </section>

      <!-- ── FEATURES (modos + características) ────────── -->
      <section class="landing-section landing-features" id="features">
        <div class="section-inner">

          <!-- Sub-sección: Modos -->
          <div id="modos" class="subsection-header reveal-on-scroll">
            <span class="section-badge">
              <span class="material-symbols-outlined">sports_esports</span>
              {{ t("landing.nav.modes") }}
            </span>
          </div>
          <div class="modos-grid">
            <article class="mode-card reveal-on-scroll">
              <div class="card-icon">
                <span class="material-symbols-outlined">casino</span>
              </div>
              <strong>{{ t("landing.feature.dice.title") }}</strong>
              <small>{{ t("landing.feature.dice.text") }}</small>
            </article>
            <article class="mode-card reveal-on-scroll" style="--delay: 80ms">
              <div class="card-icon">
                <span class="material-symbols-outlined">style</span>
              </div>
              <strong>{{ t("landing.feature.cards.title") }}</strong>
              <small>{{ t("landing.feature.cards.text") }}</small>
            </article>
            <article class="mode-card reveal-on-scroll" style="--delay: 160ms">
              <div class="card-icon">
                <span class="material-symbols-outlined">gavel</span>
              </div>
              <strong>{{ t("landing.feature.auctions.title") }}</strong>
              <small>{{ t("landing.feature.auctions.text") }}</small>
            </article>
            <article class="mode-card reveal-on-scroll" style="--delay: 240ms">
              <div class="card-icon">
                <span class="material-symbols-outlined">groups</span>
              </div>
              <strong>{{ t("landing.feature.multiplayer.title") }}</strong>
              <small>{{ t("landing.feature.multiplayer.text") }}</small>
            </article>
          </div>

          <!-- Divisor -->
          <div class="section-divider" />

          <!-- Sub-sección: Características -->
          <div id="experiencia" class="subsection-header reveal-on-scroll">
            <span class="section-badge">
              <span class="material-symbols-outlined">auto_awesome</span>
              {{ t("landing.nav.experience") }}
            </span>
          </div>
          <div class="showcase-grid">
            <div class="showcase-card reveal-on-scroll">
              <div class="card-icon">
                <span class="material-symbols-outlined">monitoring</span>
              </div>
              <h3>{{ t("landing.showcase.history.title") }}</h3>
              <p>{{ t("landing.showcase.history.text") }}</p>
            </div>
            <div class="showcase-card showcase-card--highlight reveal-on-scroll" style="--delay: 120ms">
              <div class="card-icon">
                <span class="material-symbols-outlined">smart_toy</span>
              </div>
              <h3>{{ t("landing.showcase.bots.title") }}</h3>
              <p>{{ t("landing.showcase.bots.text") }}</p>
            </div>
            <div class="showcase-card reveal-on-scroll" style="--delay: 240ms">
              <div class="card-icon">
                <span class="material-symbols-outlined">public</span>
              </div>
              <h3>{{ t("landing.showcase.online.title") }}</h3>
              <p>{{ t("landing.showcase.online.text") }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ── AUCTION SHOWCASE ──────────────────────────── -->
      <section class="landing-section landing-auction" id="showcase">
        <div class="section-inner auction-inner">
          <div class="auction-visual reveal-on-scroll">
            <div class="auction-visual-glow" aria-hidden="true" />
            <div class="auction-frame">
              <img
                src="/images/game-auction.webp"
                alt="Panel de subasta de GamePoly mostrando la puja actual, el turno y los participantes"
                loading="lazy"
                width="530"
                height="597"
              />
            </div>
          </div>

          <div class="auction-copy">
            <span class="section-badge reveal-on-scroll">
              <span class="material-symbols-outlined">gavel</span>
              {{ t("landing.auction.kicker") }}
            </span>
            <h2 class="reveal-on-scroll" style="--delay: 60ms">{{ t("landing.auction.title") }}</h2>
            <p class="reveal-on-scroll" style="--delay: 120ms">{{ t("landing.auction.text") }}</p>

            <ul class="auction-points">
              <li
                v-for="(point, index) in auctionPoints"
                :key="point.icon"
                class="reveal-on-scroll"
                :style="{ '--delay': `${180 + index * 80}ms` }"
              >
                <span class="card-icon">
                  <span class="material-symbols-outlined">{{ point.icon }}</span>
                </span>
                <div>
                  <strong>{{ t(point.titleKey) }}</strong>
                  <p>{{ t(point.textKey) }}</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- ── CTA ───────────────────────────────────────── -->
      <section class="landing-section landing-cta-section" id="cta">
        <div class="section-inner">
          <div class="cta-card reveal-on-scroll">
            <div class="cta-glow" />
            <div class="cta-content">
              <span class="section-badge">{{ t("landing.cta.kicker") }}</span>
              <h2>{{ t("landing.cta.title") }}</h2>
              <p>{{ t("landing.cta.text") }}</p>
              <button class="hero-primary" @click="navigateTo('/setup')">
                <span class="material-symbols-outlined">tune</span>
                {{ t("landing.cta.button") }}
              </button>
            </div>
          </div>

          <footer class="site-footer">
            <p>© 2024 GamePoly. Todos los derechos reservados.</p>
          </footer>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "~/composables/useI18n";
import type { TranslationKey } from "~/locales";

const { t, locale } = useI18n();
const { siteUrl } = useRuntimeConfig().public;

useSeoMeta({
  title: () =>
    locale.value === "en"
      ? "GamePoly – Online Monopoly with 3D Tokens & Bots"
      : "GamePoly – Monopoly online con fichas 3D y bots",
  description: () => t("landing.hero.subtitle"),
  ogType: "website",
  ogTitle: () =>
    locale.value === "en"
      ? "GamePoly – Online Monopoly with 3D Tokens & Bots"
      : "GamePoly – Monopoly online con fichas 3D y bots",
  ogDescription: () => t("landing.hero.subtitle"),
  ogLocale: () => (locale.value === "en" ? "en_US" : "es_ES"),
  ogUrl: () => (locale.value === "en" ? `${siteUrl}/en` : siteUrl),
  twitterCard: "summary",
  twitterTitle: () =>
    locale.value === "en"
      ? "GamePoly – Online Monopoly with 3D Tokens & Bots"
      : "GamePoly – Monopoly online con fichas 3D y bots",
  twitterDescription: () => t("landing.hero.subtitle"),
});

useHead({
  htmlAttrs: { lang: () => locale.value },
  link: [
    { rel: "canonical", href: () => (locale.value === "en" ? `${siteUrl}/en` : siteUrl) },
    { rel: "alternate", hreflang: "es", href: siteUrl },
    { rel: "alternate", hreflang: "en", href: `${siteUrl}/en` },
    { rel: "alternate", hreflang: "x-default", href: siteUrl },
  ],
  script: [
    {
      key: "ld-json",
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "GamePoly",
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description:
          "Juego de tablero online tipo Monopoly con fichas 3D, bots inteligentes, subastas, multijugador en tiempo real e historial de partidas.",
        inLanguage: ["es", "en"],
        offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      }),
    },
  ],
});

// ── Hero rotating kicker ────────────────────────────────────────────────────
const heroMessageIndex = ref(0);
const heroMessages = [
  { textKey: "landing.hero.message.0", icon: "cloud_sync", color: "#86efac" },
  { textKey: "landing.hero.message.1", icon: "gavel", color: "#facc15" },
  { textKey: "landing.hero.message.2", icon: "smart_toy", color: "#93c5fd" },
  { textKey: "landing.hero.message.3", icon: "style", color: "#f0abfc" },
  { textKey: "landing.hero.message.4", icon: "wifi", color: "#67e8f9" },
  { textKey: "landing.hero.message.5", icon: "monitoring", color: "#fb7185" },
] satisfies Array<{ textKey: TranslationKey; icon: string; color: string }>;

const currentHeroMessage = computed(
  () => heroMessages[heroMessageIndex.value % heroMessages.length],
);
let heroMessageTimer: ReturnType<typeof setInterval> | null = null;

// ── Hero stats ───────────────────────────────────────────────────────────────
const heroStats = computed(() => [
  { value: "40", label: t("landing.hero.stats.tiles") },
  { value: "3D", label: t("landing.hero.stats.tokens") },
  { value: "2-6", label: t("landing.hero.stats.players") },
]);

// ── Auction showcase points ──────────────────────────────────────────────────
const auctionPoints: Array<{ icon: string; titleKey: TranslationKey; textKey: TranslationKey }> = [
  { icon: "payments", titleKey: "landing.auction.point.bid.title", textKey: "landing.auction.point.bid.text" },
  { icon: "timer", titleKey: "landing.auction.point.turns.title", textKey: "landing.auction.point.turns.text" },
  { icon: "account_balance_wallet", titleKey: "landing.auction.point.balance.title", textKey: "landing.auction.point.balance.text" },
];

// ── Canvas particles ────────────────────────────────────────────────────────
const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationId: number | null = null;

function initParticles() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  interface Particle {
    x: number; y: number; size: number; speedY: number; opacity: number;
    init(): void; update(): void; draw(): void;
  }

  const particles: Particle[] = [];

  function resize() {
    canvas!.width = canvas!.offsetWidth;
    canvas!.height = canvas!.offsetHeight;
  }

  function makeParticle(): Particle {
    return {
      x: 0, y: 0, size: 0, speedY: 0, opacity: 0,
      init() {
        this.x = Math.random() * canvas!.width;
        this.y = canvas!.height + Math.random() * 100;
        this.size = Math.random() * 2 + 0.5;
        this.speedY = Math.random() * 0.8 + 0.4;
        this.opacity = Math.random() * 0.45 + 0.05;
      },
      update() {
        this.y -= this.speedY;
        if (this.y < -10) this.init();
      },
      draw() {
        ctx!.fillStyle = `rgba(0, 255, 157, ${this.opacity})`;
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fill();
      },
    };
  }

  resize();
  window.addEventListener("resize", resize);

  for (let i = 0; i < 55; i++) {
    const p = makeParticle();
    p.init();
    p.y = Math.random() * canvas.height;
    particles.push(p);
  }

  function animate() {
    ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
    for (const p of particles) { p.update(); p.draw(); }
    animationId = requestAnimationFrame(animate);
  }
  animate();
}

// ── Scroll helpers ──────────────────────────────────────────────────────────
const pageRef = ref<HTMLElement | null>(null);

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Reveal on scroll ────────────────────────────────────────────────────────
let revealObserver: IntersectionObserver | null = null;

function initRevealObserver() {
  // Use the landing-page element as the scroll root so IntersectionObserver
  // fires inside the internal scroll container (not the window).
  revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.animationPlayState = "running";
          revealObserver!.unobserve(entry.target);
        }
      }
    },
    { root: pageRef.value, threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
  );
  document.querySelectorAll(".reveal-on-scroll").forEach((el) => {
    revealObserver!.observe(el);
  });
}

onMounted(() => {
  heroMessageTimer = setInterval(() => {
    heroMessageIndex.value = (heroMessageIndex.value + 1) % heroMessages.length;
  }, 1800);
  initParticles();
  initRevealObserver();
});

onUnmounted(() => {
  if (heroMessageTimer) clearInterval(heroMessageTimer);
  if (animationId !== null) cancelAnimationFrame(animationId);
  revealObserver?.disconnect();
});
</script>

<style scoped>
/* ── Material icons ─────────────────────────────────────────────────────── */
.material-symbols-outlined {
  font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
}

/* ── Page shell ─────────────────────────────────────────────────────────── */
.landing-page {
  height: 100dvh;
  overflow-y: scroll;
  overflow-x: hidden;
  scroll-behavior: smooth;
  background: #0b1118;
  color: #e1e1ef;
  font-family: "Hanken Grotesk", sans-serif;
  position: relative;
}

/* ── Ambient roaming glows ──────────────────────────────────────────────── */
.ambient-glow {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  mix-blend-mode: screen;
  will-change: transform, filter;
  transform: translateZ(0);
}

.ambient-1 {
  top: -10%;
  right: -10%;
  width: 50%;
  height: 50%;
  background: rgba(0, 245, 155, 0.06);
  filter: blur(120px);
  animation: ambientRoamA 18s ease-in-out infinite alternate;
}

.ambient-2 {
  bottom: -10%;
  left: -10%;
  width: 50%;
  height: 50%;
  background: rgba(215, 3, 87, 0.04);
  filter: blur(120px);
  animation: ambientRoamB 22s ease-in-out infinite alternate;
}

.ambient-3 {
  top: 34%;
  left: 42%;
  width: 28%;
  height: 42%;
  background: rgba(255, 209, 101, 0.03);
  filter: blur(100px);
  animation: ambientRoamC 26s ease-in-out infinite alternate;
}

/* ── Nav ────────────────────────────────────────────────────────────────── */
.header-nav {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-nav button {
  min-height: 36px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 10px;
  color: rgba(226, 232, 240, 0.74);
  background: transparent;
  font-weight: 800;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.header-nav button:hover {
  color: #00ff9d;
  background: rgba(0, 255, 157, 0.08);
}

.header-nav .nav-primary {
  color: #003920;
  background: #00ff9d;
  transition: box-shadow 0.2s;
}

.header-nav .nav-primary:hover {
  box-shadow: 0 0 20px rgba(0, 255, 157, 0.4);
}

/* ── Sections ───────────────────────────────────────────────────────────── */
main {
  position: relative;
  z-index: 1;
}

.landing-section {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.section-inner {
  width: min(1200px, 100%);
  margin: 0 auto;
  padding: clamp(56px, 8vh, 96px) clamp(18px, 5vw, 64px);
}

/* ── HERO ───────────────────────────────────────────────────────────────── */
.landing-hero {
  min-height: 100dvh;
  padding: 0 clamp(18px, 5vw, 96px);
  overflow: clip;
}

.particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.hero-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  align-items: center;
  gap: clamp(32px, 5vw, 72px);
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding-top: clamp(96px, 12vh, 140px);
  padding-bottom: 64px;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  max-width: 640px;
}

.hero-kicker {
  --kicker-color: #86efac;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding: 6px 12px;
  border: 1px solid color-mix(in srgb, var(--kicker-color) 42%, transparent);
  border-radius: 8px;
  color: var(--kicker-color);
  background: color-mix(in srgb, var(--kicker-color) 10%, transparent);
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  backdrop-filter: blur(6px);
  transition: border-color 0.35s, background 0.35s;
}

.hero-kicker-live span:last-child {
  display: inline-block;
  animation: messageFlip 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero-kicker-live .material-symbols-outlined {
  font-size: 16px;
  animation: sparklePulse 1.8s ease-in-out infinite;
}

.hero-title {
  margin: 0;
  color: #f8fafc;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: clamp(40px, 5.4vw, 68px);
  font-weight: 900;
  line-height: 1.02;
  text-shadow: 0 28px 52px rgba(0, 0, 0, 0.5);
  animation: heroFloat 6s ease-in-out infinite;
}

.hero-title-accent {
  color: #00ff9d;
}

.hero-subtitle {
  margin: 0;
  color: rgba(226, 232, 240, 0.72);
  font-size: clamp(16px, 2vw, 20px);
  line-height: 1.6;
  max-width: 460px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.hero-primary,
.hero-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 50px;
  padding: 13px 24px;
  border-radius: 14px;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}

.hero-primary {
  border: 0;
  color: #003920;
  background: #00ff9d;
  box-shadow: 0 8px 28px rgba(0, 255, 157, 0.3);
}

.hero-primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 36px rgba(0, 255, 157, 0.45);
}

.hero-secondary {
  color: #e1e1ef;
  border: 1px solid rgba(42, 53, 63, 0.9);
  background: rgba(22, 31, 39, 0.6);
  backdrop-filter: blur(10px);
}

.hero-secondary:hover {
  transform: translateY(-3px);
  color: #00ff9d;
  border-color: rgba(0, 255, 157, 0.34);
  background: rgba(0, 255, 157, 0.06);
}

/* Hero stats */
.hero-stats {
  display: flex;
  gap: 32px;
  margin: 12px 0 0;
}

.hero-stat dt {
  color: #f8fafc;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: clamp(22px, 2.6vw, 30px);
  font-weight: 800;
}

.hero-stat dd {
  margin: 4px 0 0;
  color: rgba(226, 232, 240, 0.56);
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* Hero visual: browser frame + dice + chips */
.hero-visual {
  position: relative;
}

.hero-visual-glow {
  position: absolute;
  inset: -16px;
  border-radius: 28px;
  background: rgba(0, 255, 157, 0.08);
  filter: blur(48px);
  pointer-events: none;
  z-index: -1;
}

.hero-dice-float {
  position: absolute;
  top: -34px;
  right: -12px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.hero-dice-caption {
  pointer-events: none;
  padding: 3px 10px;
  border: 1px solid rgba(0, 255, 157, 0.3);
  border-radius: 999px;
  background: rgba(22, 31, 39, 0.9);
  backdrop-filter: blur(6px);
  color: #00ff9d;
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.hero-frame {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid #2a353f;
  background: #161f27;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45);
}

.hero-frame-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(42, 53, 63, 0.7);
  background: rgba(11, 17, 24, 0.6);
}

.hero-frame-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.dot-red { background: rgba(251, 113, 133, 0.7); }
.dot-yellow { background: rgba(250, 204, 21, 0.7); }
.dot-green { background: rgba(0, 255, 157, 0.7); }

.hero-frame-url {
  margin-left: 8px;
  color: rgba(226, 232, 240, 0.5);
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
}

.hero-frame-image {
  position: relative;
  aspect-ratio: 16 / 11;
  overflow: hidden;
}

.hero-frame-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 65%;
  transform: scale(1.18);
}

.hero-chip {
  position: absolute;
  display: none;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border: 1px solid #2a353f;
  border-radius: 12px;
  background: rgba(22, 31, 39, 0.95);
  backdrop-filter: blur(8px);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.35);
  font-size: 12px;
  font-weight: 700;
}

.hero-chip .material-symbols-outlined {
  font-size: 17px;
  color: #00ff9d;
}

.hero-chip-auction {
  top: 42px;
  left: -18px;
}

.hero-chip-bot {
  bottom: 44px;
  right: -14px;
}

/* Scroll hint */
.scroll-hint {
  position: absolute;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  cursor: pointer;
  z-index: 2;
  opacity: 0.45;
  transition: opacity 0.2s;
  padding: 8px;
}

.scroll-hint:hover { opacity: 0.9; }

.scroll-hint-dot {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #00ff9d;
  animation: scrollBounce 2s ease-in-out infinite;
}

/* ── Badges & sub-headers ───────────────────────────────────────────────── */
.subsection-header {
  margin-bottom: 1.25rem;
  scroll-margin-top: 90px;
}

.section-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid rgba(0, 255, 157, 0.25);
  border-radius: 6px;
  background: rgba(0, 255, 157, 0.06);
  color: #00ff9d;
  font-family: "JetBrains Mono", monospace;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.section-badge .material-symbols-outlined {
  font-size: 14px;
}

.section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(42, 53, 63, 0.8), transparent);
  margin: 2rem 0 1.75rem;
}

/* ── FEATURES section ───────────────────────────────────────────────────── */
.landing-features {
  scroll-margin-top: 90px;
}

/* Modos grid */
.modos-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 0;
}

.mode-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: clamp(16px, 2.5vw, 28px);
  border: 1px solid #2a353f;
  border-radius: 20px;
  background: #161f27;
  animation-play-state: paused;
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease, border-color 0.4s ease;
}

.mode-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 0 24px rgba(0, 255, 157, 0.12);
  border-color: rgba(0, 255, 157, 0.28);
}

.card-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: rgba(0, 255, 157, 0.1);
  border: 1px solid rgba(0, 255, 157, 0.14);
  color: #00ff9d;
  flex-shrink: 0;
}

.card-icon .material-symbols-outlined {
  font-size: 21px;
  font-variation-settings: "FILL" 1, "wght" 400;
}

.mode-card strong {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #f8fafc;
}

.mode-card small {
  font-size: 13px;
  color: rgba(226, 232, 240, 0.56);
  line-height: 1.45;
}

/* Showcase grid */
.showcase-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.showcase-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: clamp(20px, 3vw, 32px);
  border: 1px solid #2a353f;
  border-radius: 24px;
  background: #161f27;
  animation-play-state: paused;
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease, border-color 0.4s ease;
}

.showcase-card--highlight {
  border-color: rgba(0, 255, 157, 0.22);
}

.showcase-card:hover {
  transform: translateY(-6px) scale(1.01);
  box-shadow: 0 0 24px rgba(0, 255, 157, 0.12);
  border-color: rgba(0, 255, 157, 0.28);
}

.showcase-card h3 {
  margin: 0;
  color: #f8fafc;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: clamp(18px, 2vw, 26px);
  font-weight: 700;
}

.showcase-card p {
  margin: 0;
  color: rgba(226, 232, 240, 0.6);
  font-size: 14px;
  line-height: 1.55;
}

/* ── AUCTION SHOWCASE ───────────────────────────────────────────────────── */
.landing-auction {
  border-top: 1px solid rgba(42, 53, 63, 0.5);
}

.auction-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: clamp(32px, 6vw, 72px);
}

.auction-visual {
  position: relative;
  display: flex;
  justify-content: center;
}

.auction-visual-glow {
  position: absolute;
  inset: 6%;
  border-radius: 32px;
  background: rgba(0, 255, 157, 0.08);
  filter: blur(48px);
  z-index: 0;
}

.auction-frame {
  position: relative;
  z-index: 1;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid #2a353f;
  background: #0b1118;
  box-shadow: 0 30px 60px rgba(0, 0, 0, 0.45);
  max-width: 380px;
  width: 100%;
}

.auction-frame img {
  display: block;
  width: 100%;
  height: auto;
}

.auction-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}

.auction-copy h2 {
  margin: 0;
  color: #f8fafc;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: clamp(26px, 3.6vw, 40px);
  font-weight: 800;
  line-height: 1.15;
}

.auction-copy > p {
  margin: 0;
  max-width: 480px;
  color: rgba(226, 232, 240, 0.65);
  font-size: clamp(15px, 1.5vw, 17px);
  line-height: 1.6;
}

.auction-points {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
  width: 100%;
}

.auction-points li {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.auction-points strong {
  display: block;
  color: #f8fafc;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 15px;
  font-weight: 700;
}

.auction-points p {
  margin: 2px 0 0;
  color: rgba(226, 232, 240, 0.56);
  font-size: 13px;
  line-height: 1.5;
}

/* ── CTA ────────────────────────────────────────────────────────────────── */
.landing-cta-section {
  border-top: 1px solid rgba(42, 53, 63, 0.5);
}

.cta-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0, 255, 157, 0.18);
  border-radius: 32px;
  background: linear-gradient(135deg, rgba(22, 31, 39, 0.9), rgba(42, 53, 63, 0.3));
  padding: clamp(32px, 6vw, 64px);
  animation-play-state: paused;
  transition: border-color 0.4s ease;
}

.cta-card:hover { border-color: rgba(0, 255, 157, 0.3); }

.cta-glow {
  position: absolute;
  top: 0;
  right: 0;
  width: 420px;
  height: 420px;
  background: rgba(0, 255, 157, 0.04);
  filter: blur(80px);
  border-radius: 50%;
  pointer-events: none;
}

.cta-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 18px;
  max-width: 600px;
}

.cta-content h2 {
  margin: 0;
  color: #f8fafc;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: clamp(26px, 4vw, 46px);
  font-weight: 800;
  line-height: 1.1;
}

.cta-content p {
  margin: 0;
  color: rgba(226, 232, 240, 0.65);
  font-size: clamp(15px, 1.5vw, 18px);
  line-height: 1.6;
}

/* ── Footer ─────────────────────────────────────────────────────────────── */
.site-footer {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(42, 53, 63, 0.5);
  text-align: center;
  color: rgba(226, 232, 240, 0.32);
  font-size: 13px;
}

/* ── Reveal on scroll ───────────────────────────────────────────────────── */
.reveal-on-scroll {
  opacity: 0;
  transform: translateY(36px);
  animation: revealUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) both var(--delay, 0ms);
  animation-play-state: paused;
}

/* ── Keyframes ──────────────────────────────────────────────────────────── */
@keyframes heroFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}

@keyframes messageFlip {
  from { opacity: 0; filter: blur(8px); transform: translateY(10px); }
  to { opacity: 1; filter: blur(0); transform: translateY(0); }
}

@keyframes sparklePulse {
  0%, 100% { opacity: 0.72; transform: rotate(0deg) scale(1); }
  50% { opacity: 1; transform: rotate(18deg) scale(1.14); }
}

@keyframes revealUp {
  from { opacity: 0; transform: translateY(36px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scrollBounce {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(8px); opacity: 1; }
}

@keyframes ambientRoamA {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(-62vw, 72vh, 0) scale(1.32); }
}

@keyframes ambientRoamB {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(70vw, -58vh, 0) scale(1.22); }
}

@keyframes ambientRoamC {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(-34vw, -28vh, 0) scale(1.42); }
}

/* ── Responsive ─────────────────────────────────────────────────────────── */
@media (min-width: 721px) {
  .hero-chip { display: flex; }
}

@media (max-width: 1024px) {
  .modos-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero-grid { grid-template-columns: 1fr; }
  .hero-visual { max-width: 560px; margin: 0 auto; }
  .auction-inner { grid-template-columns: 1fr; }
  .auction-visual { order: -1; }
}

@media (max-width: 720px) {
  .modos-grid,
  .showcase-grid { grid-template-columns: 1fr; }

  .landing-hero { min-height: auto; padding-bottom: 48px; }

  .hero-grid { padding-top: 88px; }

  .hero-actions,
  .hero-primary,
  .hero-secondary { width: 100%; }

  .hero-stats { gap: 24px; }

  .hero-visual { margin: 0 -16px; max-width: none; }

  .hero-dice-float {
    top: -14px;
    right: 6px;
    transform: scale(0.68);
    transform-origin: top right;
  }

  .auction-copy { align-items: stretch; }
}

@media (max-width: 600px) {
  .header-nav button:not(.nav-primary) { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .hero-title,
  .ambient-glow,
  .scroll-hint-dot,
  .hero-kicker-live span:last-child,
  .hero-kicker-live .material-symbols-outlined { animation: none; }

  .reveal-on-scroll {
    opacity: 1;
    transform: none;
    animation: none;
  }
}
</style>
