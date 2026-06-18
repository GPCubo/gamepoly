export default defineNuxtPlugin(() => {
  useHead({
    link: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&family=Hanken+Grotesk:wght@400;500;600&display=swap",
      },
      {
        // display=block: iconos invisibles mientras carga (sin flash de texto)
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block",
      },
    ],
  });
});
