<template>
  <div class="landing-page" ref="pageRef">
    <!-- Fixed ambient glow orbs -->
    <div class="ambient-glow ambient-1" />
    <div class="ambient-glow ambient-2" />
    <div class="ambient-glow ambient-3" />

    <AppHeader>
      <template #actions>
        <nav class="header-nav" :aria-label="t('landing.nav.experience')">
          <button @click="scrollToSection('features')">
            {{ t("landing.nav.modes") }}
          </button>
          <button @click="scrollToSection('cta')">
            {{ t("landing.nav.experience") }}
          </button>
          <button class="nav-primary" @click="navigateTo('/setup')">
            {{ t("landing.nav.play") }}
          </button>
        </nav>
      </template>
    </AppHeader>

    <main>
      <!-- ── HERO ──────────────────────────────────────── -->
      <section class="scroll-section landing-hero" id="hero">
        <canvas ref="canvasRef" class="particle-canvas" />

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

          <h1 class="hero-title">GamePoly</h1>

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
        </div>

        <button class="scroll-hint" @click="scrollToSection('features')" aria-label="Siguiente sección">
          <span class="scroll-hint-dot" />
        </button>
      </section>

      <!-- ── FEATURES (modos + características) ────────── -->
      <section class="scroll-section landing-features" id="features">
        <div class="section-inner">

          <!-- Sub-sección: Modos -->
          <div class="subsection-header reveal-on-scroll">
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
          <div class="subsection-header reveal-on-scroll">
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

      <!-- ── CTA ───────────────────────────────────────── -->
      <section class="scroll-section landing-cta-section" id="cta">
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
  const el = document.getElementById(id);
  const container = pageRef.value;
  if (!el || !container) return;
  // getBoundingClientRect gives positions relative to the viewport;
  // subtracting container's top and adding scrollTop gives the correct
  // target within the scroll container (regardless of offsetParent chain).
  const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop;
  container.scrollTo({ top, behavior: "smooth" });
}

// ── Reveal on scroll ────────────────────────────────────────────────────────
let revealObserver: IntersectionObserver | null = null;

function initRevealObserver() {
  // Use the landing-page element as the scroll root so IntersectionObserver
  // fires inside the snap container (not the window).
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
  // Scroll snap aplicado DESPUÉS del primer render para que Lighthouse
  // mida LCP sin snap activo (si está en SSR, headless Chrome lo dispara
  // durante medición, salta a sección 2 y descarta los LCP candidates).
  if (pageRef.value) {
    pageRef.value.style.scrollSnapType = "y proximity";
  }

  heroMessageTimer = setInterval(() => {
    heroMessageIndex.value = (heroMessageIndex.value + 1) % heroMessages.length;
  }, 1800);
  initParticles();
  initRevealObserver();
});

onUnmounted(() => {
  if (pageRef.value) pageRef.value.style.scrollSnapType = "";
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

/* ── Scroll sections ────────────────────────────────────────────────────── */
main {
  position: relative;
  z-index: 1;
}

.scroll-section {
  min-height: 100dvh;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
}

.section-inner {
  width: min(1200px, 100%);
  margin: 0 auto;
  padding: clamp(72px, 9vh, 110px) clamp(18px, 5vw, 64px) clamp(36px, 5vh, 64px);
}

/* ── HERO ───────────────────────────────────────────────────────────────── */
.landing-hero {
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

.hero-copy {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  max-width: 640px;
  padding-top: 80px;
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
  font-size: clamp(72px, 10vw, 120px);
  font-weight: 900;
  line-height: 0.92;
  text-shadow: 0 28px 52px rgba(0, 0, 0, 0.5);
  animation: heroFloat 6s ease-in-out infinite;
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
  /* Allow content taller than viewport to scroll within the snap section */
  justify-content: flex-start;
}

.landing-features .section-inner {
  padding-top: clamp(80px, 10vh, 120px);
  padding-bottom: clamp(36px, 5vh, 64px);
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

/* ── CTA ────────────────────────────────────────────────────────────────── */
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

@keyframes titlePop {
  0% { opacity: 0; filter: blur(16px); transform: translateY(38px) scale(0.86); }
  58% { opacity: 1; filter: blur(0); transform: translateY(-6px) scale(1.03); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
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
@media (max-width: 1024px) {
  .modos-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 720px) {
  .modos-grid,
  .showcase-grid { grid-template-columns: 1fr; }

  .hero-copy { padding-top: 72px; }

  .hero-actions,
  .hero-primary,
  .hero-secondary { width: 100%; }
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
