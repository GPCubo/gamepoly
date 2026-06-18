<template>
  <div class="landing-page">
    <div class="ambient-glow ambient-1" />
    <div class="ambient-glow ambient-2" />
    <div class="ambient-glow ambient-3" />

    <AppHeader>
      <template #actions>
        <nav class="header-nav" :aria-label="t('landing.nav.experience')">
          <button @click="scrollToSection('features')">{{ t("landing.nav.modes") }}</button>
          <button @click="scrollToSection('showcase')">{{ t("landing.nav.experience") }}</button>
          <button class="nav-primary" @click="navigateTo('/setup')">
            {{ t("landing.nav.play") }}
          </button>
        </nav>
      </template>
    </AppHeader>

    <main>
      <section class="landing-hero">
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
            <span
              :key="`${heroMessageIndex}-text`"
              :style="{ color: currentHeroMessage.color }"
            >
              {{ t(currentHeroMessage.textKey) }}
            </span>
          </span>
          <h1 class="hero-title reveal-title">GamePoly</h1>
          <p class="hero-subtitle">
            {{ t("landing.hero.subtitle") }}
          </p>
          <div class="hero-actions">
            <button class="hero-primary" @click="navigateTo('/setup')">
              <span class="material-symbols-outlined">play_arrow</span>
              {{ t("landing.hero.single") }}
            </button>
            <button
              class="hero-secondary"
              @click="navigateTo('/multiplayer/lobby?mode=create')"
            >
              <span class="material-symbols-outlined">wifi</span>
              {{ t("landing.hero.friends") }}
            </button>
          </div>
        </div>

        <div class="hero-stage-slot">
          <Transition name="stage-fade">
            <div v-if="!stageReady" class="hero-stage-skeleton" aria-hidden="true">
              <div class="skeleton-shimmer" />
              <div class="stage-grid-static" />
              <div class="skeleton-orb skeleton-orb-a" />
              <div class="skeleton-orb skeleton-orb-b" />
            </div>
          </Transition>
          <LazyHeroStage v-if="stageReady" />
        </div>
      </section>

      <section id="features" class="landing-strip">
        <article class="feature-chip reveal-on-scroll">
          <span class="material-symbols-outlined">casino</span>
          <strong>{{ t("landing.feature.dice.title") }}</strong>
          <small>{{ t("landing.feature.dice.text") }}</small>
        </article>
        <article class="feature-chip reveal-on-scroll">
          <span class="material-symbols-outlined">style</span>
          <strong>{{ t("landing.feature.cards.title") }}</strong>
          <small>{{ t("landing.feature.cards.text") }}</small>
        </article>
        <article class="feature-chip reveal-on-scroll">
          <span class="material-symbols-outlined">gavel</span>
          <strong>{{ t("landing.feature.auctions.title") }}</strong>
          <small>{{ t("landing.feature.auctions.text") }}</small>
        </article>
        <article class="feature-chip reveal-on-scroll">
          <span class="material-symbols-outlined">groups</span>
          <strong>{{ t("landing.feature.multiplayer.title") }}</strong>
          <small>{{ t("landing.feature.multiplayer.text") }}</small>
        </article>
      </section>

      <section id="showcase" class="scroll-showcase">
        <div class="showcase-card reveal-on-scroll">
          <span class="material-symbols-outlined">monitoring</span>
          <h2>{{ t("landing.showcase.history.title") }}</h2>
          <p>{{ t("landing.showcase.history.text") }}</p>
        </div>
        <div class="showcase-card reveal-on-scroll">
          <span class="material-symbols-outlined">smart_toy</span>
          <h2>{{ t("landing.showcase.bots.title") }}</h2>
          <p>{{ t("landing.showcase.bots.text") }}</p>
        </div>
        <div class="showcase-card reveal-on-scroll">
          <span class="material-symbols-outlined">public</span>
          <h2>{{ t("landing.showcase.online.title") }}</h2>
          <p>{{ t("landing.showcase.online.text") }}</p>
        </div>
      </section>

      <section class="landing-cta glass-readable reveal-on-scroll">
        <span class="hero-kicker">{{ t("landing.cta.kicker") }}</span>
        <h2>{{ t("landing.cta.title") }}</h2>
        <p>{{ t("landing.cta.text") }}</p>
        <button class="hero-primary" @click="navigateTo('/setup')">
          <span class="material-symbols-outlined">tune</span>
          {{ t("landing.cta.button") }}
        </button>
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

const stageReady = ref(false);
const heroMessageIndex = ref(0);
const heroMessages = [
  { textKey: "landing.hero.message.0", icon: "auto_awesome", color: "#86efac" },
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

onMounted(() => {
  heroMessageTimer = setInterval(() => {
    heroMessageIndex.value = (heroMessageIndex.value + 1) % heroMessages.length;
  }, 1800);

  if ("requestIdleCallback" in window) {
    requestIdleCallback(() => { stageReady.value = true; }, { timeout: 2000 });
  } else {
    setTimeout(() => { stageReady.value = true; }, 200);
  }
});

onUnmounted(() => {
  if (heroMessageTimer) clearInterval(heroMessageTimer);
});

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<style scoped>
.material-symbols-outlined {
  font-variation-settings:
    "FILL" 0,
    "wght" 400,
    "GRAD" 0,
    "opsz" 24;
}

.landing-page {
  height: 100vh;
  height: 100dvh;
  color: #e1e1ef;
  background:
    radial-gradient(circle at 72% 20%, rgba(0, 245, 155, 0.1), transparent 32%),
    radial-gradient(circle at 18% 82%, rgba(215, 3, 87, 0.08), transparent 30%),
    #11131c;
  font-family: "Hanken Grotesk", sans-serif;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
}

.landing-page::before {
  content: "";
  position: fixed;
  inset: -28%;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 22%, rgba(0, 245, 155, 0.09), transparent 25%),
    radial-gradient(circle at 76% 18%, rgba(59, 130, 246, 0.09), transparent 28%),
    radial-gradient(circle at 64% 78%, rgba(215, 3, 87, 0.08), transparent 27%);
  filter: blur(38px);
  opacity: 0.88;
  animation: pageGradientFlow 24s ease-in-out infinite alternate;
}

.ambient-glow {
  position: fixed;
  border-radius: 50%;
  pointer-events: none;
  z-index: 0;
  will-change: transform;
  mix-blend-mode: screen;
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
  background: rgba(255, 209, 101, 0.035);
  filter: blur(100px);
  animation: ambientRoamC 26s ease-in-out infinite alternate;
}

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
}

.header-nav button:hover {
  color: #86efac;
  background: rgba(0, 245, 155, 0.08);
}

.header-nav .nav-primary {
  color: #003920;
  background: #00f59b;
}

main {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 34px;
  padding: 28px 18px 58px;
}

.landing-hero {
  width: min(1180px, 100%);
  min-height: calc(100dvh - 112px);
  display: grid;
  grid-template-columns: minmax(360px, 0.78fr) minmax(420px, 1.22fr);
  align-items: center;
  gap: clamp(36px, 6vw, 96px);
  padding: clamp(22px, 5vw, 60px) 0 28px;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  min-width: 0;
  max-width: 560px;
  position: relative;
  z-index: 4;
}

.hero-kicker {
  --kicker-color: #86efac;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
  padding: 6px 10px;
  border: 1px solid color-mix(in srgb, var(--kicker-color) 42%, transparent);
  border-radius: 8px;
  color: var(--kicker-color);
  background: color-mix(in srgb, var(--kicker-color) 12%, transparent);
  font-family: "JetBrains Mono", monospace;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--kicker-color) 10%, transparent),
    0 12px 30px color-mix(in srgb, var(--kicker-color) 16%, transparent);
  transition:
    border-color 0.35s ease,
    background 0.35s ease,
    box-shadow 0.35s ease;
}

.hero-kicker-live span:last-child {
  display: inline-block;
  animation: messageFlip 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.hero-kicker-live .material-symbols-outlined {
  color: var(--kicker-color);
  font-size: 16px;
  animation: sparklePulse 1.8s ease-in-out infinite;
}

.hero-title {
  max-width: 100%;
  margin: 0;
  color: #f8fafc;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: clamp(56px, 7.8vw, 92px);
  font-weight: 800;
  line-height: 0.94;
  overflow-wrap: normal;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.16),
    0 28px 52px rgba(0, 0, 0, 0.38);
}

.reveal-title {
  animation: titlePop 1.1s cubic-bezier(0.18, 1, 0.22, 1) both;
}

.hero-subtitle {
  max-width: 580px;
  margin: 0;
  color: rgba(226, 232, 240, 0.78);
  font-size: clamp(17px, 2vw, 22px);
  line-height: 1.55;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
}

.hero-primary,
.hero-secondary {
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 13px 18px;
  border-radius: 12px;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  transition:
    transform 0.25s ease,
    border-color 0.25s ease,
    background 0.25s ease,
    box-shadow 0.25s ease;
}

.hero-primary {
  border: 0;
  color: #003920;
  background: #00f59b;
  box-shadow: 0 16px 34px rgba(0, 245, 155, 0.28);
}

.hero-secondary {
  color: #e1e1ef;
  border: 1px solid rgba(132, 149, 136, 0.18);
  background: rgba(25, 27, 36, 0.68);
}

.hero-primary:hover,
.hero-secondary:hover {
  transform: translateY(-3px);
}

.hero-secondary:hover {
  color: #86efac;
  border-color: rgba(0, 245, 155, 0.34);
  background: rgba(0, 245, 155, 0.08);
}

.hero-stage-slot {
  position: relative;
  min-height: clamp(360px, 52vw, 600px);
}

.hero-stage-skeleton {
  position: absolute;
  inset: 0;
  border-radius: 22px;
  overflow: hidden;
  background: rgba(8, 13, 22, 0.68);
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 30%,
    rgba(0, 245, 155, 0.06) 50%,
    rgba(103, 232, 249, 0.04) 55%,
    transparent 70%
  );
  background-size: 250% 100%;
  animation: skeletonShimmer 2s ease-in-out infinite;
}

.stage-grid-static {
  position: absolute;
  inset: 6%;
  border: 1px solid rgba(148, 163, 184, 0.07);
  border-radius: 22px;
  background:
    linear-gradient(rgba(148, 163, 184, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.04) 1px, transparent 1px),
    rgba(15, 23, 42, 0.18);
  background-size: 34px 34px, 34px 34px, auto;
  transform: perspective(900px) rotateX(58deg) rotateZ(-9deg);
}

.skeleton-orb {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(148, 163, 184, 0.06),
    rgba(148, 163, 184, 0.02)
  );
  animation: skeletonPulse 2s ease-in-out infinite;
}

.skeleton-orb-a {
  width: 64px;
  height: 64px;
  top: 28%;
  left: 38%;
  animation-delay: 0s;
}

.skeleton-orb-b {
  width: 48px;
  height: 48px;
  top: 42%;
  left: 58%;
  animation-delay: 0.4s;
}

.stage-fade-leave-active {
  transition: opacity 0.4s ease, filter 0.4s ease;
  pointer-events: none;
}

.stage-fade-leave-to {
  opacity: 0;
  filter: blur(6px);
}

@keyframes skeletonShimmer {
  0% { background-position: 150% center; }
  100% { background-position: -50% center; }
}

@keyframes skeletonPulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.08); }
}

.landing-strip,
.scroll-showcase,
.landing-cta {
  width: min(1180px, 100%);
  margin-bottom: 4rem;
}

.landing-strip,
.scroll-showcase {
  display: grid;
  gap: 14px;
}

.landing-strip {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.feature-chip,
.showcase-card,
.landing-cta {
  border: 1px solid rgba(132, 149, 136, 0.12);
  background: rgba(25, 27, 36, 0.62);
  backdrop-filter: blur(18px);
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.22);
  transition:
    transform 0.35s ease,
    border-color 0.35s ease,
    box-shadow 0.35s ease,
    background 0.35s ease;
}

.feature-chip:hover,
.showcase-card:hover,
.landing-cta:hover {
  transform: translateY(-8px);
  border-color: rgba(0, 245, 155, 0.32);
  background: rgba(31, 41, 55, 0.72);
  box-shadow:
    0 28px 70px rgba(0, 0, 0, 0.34),
    0 0 38px rgba(0, 245, 155, 0.08);
}

.feature-chip {
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border-radius: 16px;
  color: #e1e1ef;
}

.feature-chip .material-symbols-outlined {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: #003920;
  background: #00f59b;
  font-variation-settings: "FILL" 1, "wght" 500;
}

.feature-chip strong {
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: 15px;
}

.feature-chip small {
  color: rgba(226, 232, 240, 0.62);
  font-size: 13px;
  line-height: 1.4;
}

.scroll-showcase {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.showcase-card {
  min-height: 250px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 12px;
  padding: 22px;
  border-radius: 18px;
}

.showcase-card .material-symbols-outlined {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  color: #86efac;
  background: rgba(0, 245, 155, 0.1);
  font-size: 24px;
}

.showcase-card h2,
.landing-cta h2 {
  margin: 0;
  color: #f8fafc;
  font-family: "Plus Jakarta Sans", sans-serif;
  font-size: clamp(24px, 3vw, 38px);
}

.showcase-card p,
.landing-cta p {
  margin: 0;
  color: rgba(226, 232, 240, 0.68);
  line-height: 1.5;
}

.landing-cta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
  padding: clamp(24px, 5vw, 48px);
  border-radius: 22px;
}

.glass-readable {
  position: relative;
  overflow: hidden;
  border-color: rgba(248, 250, 252, 0.18);
  background:
    linear-gradient(135deg, rgba(248, 250, 252, 0.1), rgba(15, 23, 42, 0.34)),
    rgba(17, 24, 39, 0.36);
  backdrop-filter: blur(34px) saturate(1.25);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 30px 86px rgba(0, 0, 0, 0.3);
}

.glass-readable::before {
  content: "";
  position: absolute;
  inset: -28%;
  z-index: 0;
  background:
    radial-gradient(circle at 20% 25%, rgba(0, 245, 155, 0.18), transparent 28%),
    radial-gradient(circle at 80% 20%, rgba(147, 197, 253, 0.14), transparent 24%),
    radial-gradient(circle at 50% 88%, rgba(251, 113, 133, 0.12), transparent 30%);
  filter: blur(32px);
  opacity: 0.9;
  animation: ctaGlassFlow 13s ease-in-out infinite alternate;
}

.glass-readable::after {
  content: "";
  position: absolute;
  inset: 1px;
  z-index: 0;
  border-radius: inherit;
  background: rgba(6, 12, 20, 0.18);
  backdrop-filter: blur(8px);
  mask-image: linear-gradient(120deg, rgba(0, 0, 0, 0.86), rgba(0, 0, 0, 0.3));
}

.glass-readable > * {
  position: relative;
  z-index: 2;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.38);
}

.reveal-on-scroll {
  animation: revealUp both;
  animation-timeline: view();
  animation-range: entry 0% cover 42%;
}

@keyframes revealUp {
  from {
    opacity: 0;
    filter: blur(12px);
    transform: translateY(72px) scale(0.92) rotateX(8deg);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0) scale(1);
  }
}

@keyframes titlePop {
  0% { opacity: 0; filter: blur(16px); transform: translateY(38px) scale(0.86); }
  58% { opacity: 1; filter: blur(0); transform: translateY(-6px) scale(1.035); }
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

@keyframes pageGradientFlow {
  0% { transform: translate3d(-4%, -2%, 0) rotate(0deg) scale(1); }
  33% { transform: translate3d(7%, 4%, 0) rotate(12deg) scale(1.08); }
  66% { transform: translate3d(-2%, 8%, 0) rotate(-8deg) scale(1.03); }
  100% { transform: translate3d(5%, -5%, 0) rotate(16deg) scale(1.1); }
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

@keyframes ctaGlassFlow {
  from { transform: translate3d(-5%, -3%, 0) rotate(0deg) scale(1); }
  to { transform: translate3d(5%, 4%, 0) rotate(10deg) scale(1.08); }
}

@media (max-width: 980px) {
  .landing-hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .hero-stage-slot { min-height: 420px; }

  .landing-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .scroll-showcase { grid-template-columns: 1fr; }
}

@media (max-width: 600px) {
  .header-nav button:not(.nav-primary) { display: none; }

  main {
    gap: 22px;
    padding: 12px 12px calc(34px + env(safe-area-inset-bottom));
  }

  .landing-hero { gap: 12px; padding: 26px 0 6px; }
  .hero-copy { gap: 14px; }
  .hero-kicker { font-size: 9px; line-height: 1.35; }
  .hero-title { font-size: clamp(48px, 17vw, 78px); }
  .hero-subtitle { font-size: 16px; }

  .hero-actions,
  .hero-primary,
  .hero-secondary { width: 100%; }

  .hero-stage-slot { width: 100%; min-height: 320px; }

  .landing-strip,
  .scroll-showcase { grid-template-columns: 1fr; }

  .feature-chip { min-height: 116px; }
}

@media (prefers-reduced-motion: reduce) {
  .landing-page::before,
  .ambient-glow,
  .hero-kicker-live span:last-child,
  .hero-kicker-live .material-symbols-outlined,
  .glass-readable::before,
  .reveal-title,
  .reveal-on-scroll {
    animation: none;
  }
}
</style>
