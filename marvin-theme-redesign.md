# Marvin Theme Redesign

## Design direction

Marvin should feel warm, modern, food-led and slightly playful rather than corporate or flat.

The new visual direction is built around:

- Warm cream backgrounds
- Terracotta-orange primary actions
- Deep forest-green secondary actions
- Dark charcoal text
- Golden accent details
- Softer cards with clearer depth
- Stronger action hierarchy
- More visual separation between sections

---

# 1. Core colour palette

```css
:root {
  /* Brand */
  --marvin-orange: #d95e2a;
  --marvin-orange-hover: #c94f20;
  --marvin-orange-active: #b9431a;
  --marvin-orange-soft: #f9e2d7;

  --marvin-green: #2e6b57;
  --marvin-green-hover: #245745;
  --marvin-green-active: #1d4839;
  --marvin-green-soft: #dcebe5;

  --marvin-gold: #f4b942;
  --marvin-gold-soft: #fff1c9;

  /* Neutrals */
  --marvin-bg: #f7f4ee;
  --marvin-bg-deep: #eee9df;
  --marvin-surface: #ffffff;
  --marvin-surface-soft: #fbfaf7;
  --marvin-border: #ded8cc;
  --marvin-border-strong: #cfc7b8;

  --marvin-text: #1f2a2e;
  --marvin-text-soft: #506065;
  --marvin-text-muted: #7b878b;
  --marvin-text-inverse: #ffffff;

  /* Feedback */
  --marvin-success: #3a7d5e;
  --marvin-warning: #d99a2b;
  --marvin-error: #bf4b42;
  --marvin-info: #4b7288;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(31, 42, 46, 0.05);
  --shadow-sm: 0 4px 12px rgba(31, 42, 46, 0.07);
  --shadow-md: 0 10px 28px rgba(31, 42, 46, 0.11);
  --shadow-lg: 0 18px 48px rgba(31, 42, 46, 0.16);
  --shadow-orange: 0 10px 24px rgba(217, 94, 42, 0.24);
  --shadow-green: 0 10px 24px rgba(46, 107, 87, 0.22);

  /* Radius */
  --radius-sm: 12px;
  --radius-md: 18px;
  --radius-lg: 26px;
  --radius-xl: 34px;
  --radius-pill: 999px;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
}
```

---

# 2. Global page styling

```css
html {
  background: var(--marvin-bg);
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(
      circle at top right,
      rgba(244, 185, 66, 0.10),
      transparent 28%
    ),
    linear-gradient(
      180deg,
      #fbf9f4 0%,
      var(--marvin-bg) 48%,
      #f1ece3 100%
    );
  color: var(--marvin-text);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

* {
  box-sizing: border-box;
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

::selection {
  background: var(--marvin-orange-soft);
  color: var(--marvin-text);
}
```

---

# 3. Main app shell

```css
.marvin-app {
  min-height: 100vh;
  padding:
    max(20px, env(safe-area-inset-top))
    20px
    calc(112px + env(safe-area-inset-bottom));
}

.marvin-shell {
  width: min(100%, 720px);
  margin: 0 auto;
}

.marvin-section {
  margin-top: var(--space-8);
}
```

---

# 4. Header and logo

```css
.marvin-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 42px;
}

.marvin-header__icon {
  width: 48px;
  height: 48px;
  border-radius: 15px;
  box-shadow: var(--shadow-sm);
}

.marvin-header__brand {
  margin: 0;
  font-size: clamp(1.75rem, 7vw, 2.5rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.045em;
  color: var(--marvin-text);
}
```

---

# 5. Hero area

```css
.marvin-hero {
  text-align: center;
}

.marvin-hero__logo {
  width: 148px;
  height: 148px;
  margin: 0 auto 22px;
  border-radius: 38px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow:
    0 18px 44px rgba(31, 42, 46, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
}

.marvin-hero__title {
  margin: 0;
  font-size: clamp(2.5rem, 12vw, 4.5rem);
  font-weight: 900;
  letter-spacing: -0.065em;
  line-height: 0.95;
  color: var(--marvin-text);
}

.marvin-hero__subtitle {
  margin: 28px 0 30px;
  font-size: clamp(1.2rem, 5vw, 1.75rem);
  font-weight: 650;
  line-height: 1.3;
  color: var(--marvin-green);
}
```

---

# 6. Search field

```css
.marvin-search {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 68px;
  padding: 0 22px;
  border: 1px solid rgba(207, 199, 184, 0.75);
  border-radius: var(--radius-pill);
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    0 12px 34px rgba(31, 42, 46, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transition:
    border-color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.marvin-search:focus-within {
  border-color: rgba(217, 94, 42, 0.65);
  box-shadow:
    0 0 0 4px rgba(217, 94, 42, 0.12),
    0 14px 38px rgba(31, 42, 46, 0.12);
  transform: translateY(-1px);
}

.marvin-search__icon {
  flex: 0 0 auto;
  width: 25px;
  height: 25px;
  color: var(--marvin-green);
}

.marvin-search__input {
  width: 100%;
  min-width: 0;
  margin-left: 16px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--marvin-text);
  font-size: 1.1rem;
}

.marvin-search__input::placeholder {
  color: var(--marvin-text-muted);
}
```

---

# 7. Button system

## Base button

```css
.marvin-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 58px;
  padding: 0 24px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  font-weight: 750;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease;
}

.marvin-button:hover {
  transform: translateY(-2px);
}

.marvin-button:active {
  transform: translateY(0) scale(0.985);
}

.marvin-button:focus-visible {
  outline: 3px solid rgba(217, 94, 42, 0.25);
  outline-offset: 3px;
}

.marvin-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
```

## Primary action

Use for **Search** and the most important action on a page.

```css
.marvin-button--primary {
  background: linear-gradient(
    135deg,
    #e66a32 0%,
    var(--marvin-orange) 58%,
    #c94f20 100%
  );
  color: var(--marvin-text-inverse);
  box-shadow: var(--shadow-orange);
}

.marvin-button--primary:hover {
  background: linear-gradient(
    135deg,
    #ec7440 0%,
    var(--marvin-orange-hover) 100%
  );
  box-shadow: 0 14px 32px rgba(217, 94, 42, 0.30);
}
```

## Secondary action

Use for **Inspire me**.

```css
.marvin-button--secondary {
  background: linear-gradient(
    135deg,
    #244b43 0%,
    #1f3434 100%
  );
  color: var(--marvin-text-inverse);
  box-shadow: 0 10px 24px rgba(31, 52, 52, 0.24);
}

.marvin-button--secondary:hover {
  background: linear-gradient(
    135deg,
    #2a574d 0%,
    #172b2a 100%
  );
}
```

## Outline action

Use for **Bring in a recipe**.

```css
.marvin-button--outline {
  border-color: rgba(46, 107, 87, 0.45);
  background: rgba(255, 255, 255, 0.70);
  color: var(--marvin-green);
  box-shadow: var(--shadow-xs);
  backdrop-filter: blur(10px);
}

.marvin-button--outline:hover {
  border-color: var(--marvin-green);
  background: var(--marvin-green-soft);
}
```

## Quiet action

Use for **Snap what you cooked**.

```css
.marvin-button--quiet {
  min-height: 52px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--marvin-text);
  box-shadow: var(--shadow-sm);
}

.marvin-button--quiet:hover {
  background: var(--marvin-surface);
  box-shadow: var(--shadow-md);
}
```

---

# 8. Home action layout

```css
.marvin-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 24px;
}

.marvin-actions .marvin-button {
  width: 100%;
}

.marvin-actions__supporting {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
}

@media (max-width: 430px) {
  .marvin-actions {
    gap: 10px;
  }

  .marvin-button {
    min-height: 56px;
    padding-inline: 18px;
    font-size: 0.98rem;
  }
}
```

---

# 9. Card system

```css
.marvin-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(207, 199, 184, 0.72);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.98),
      rgba(251, 250, 247, 0.92)
    );
  box-shadow: var(--shadow-sm);
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.marvin-card:hover {
  transform: translateY(-3px);
  border-color: rgba(217, 94, 42, 0.30);
  box-shadow: var(--shadow-md);
}

.marvin-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 5px;
  background: linear-gradient(
    180deg,
    var(--marvin-orange),
    var(--marvin-gold)
  );
  opacity: 0;
  transition: opacity 180ms ease;
}

.marvin-card:hover::before {
  opacity: 1;
}
```

## Recipe/library card

```css
.marvin-library-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  min-height: 150px;
  padding: 24px;
}

.marvin-library-card__icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 19px;
  background: linear-gradient(
    145deg,
    var(--marvin-orange-soft),
    var(--marvin-gold-soft)
  );
  color: var(--marvin-orange);
}

.marvin-library-card__eyebrow {
  margin: 0 0 7px;
  color: var(--marvin-green);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.marvin-library-card__title {
  margin: 0;
  color: var(--marvin-text);
  font-size: 1.25rem;
  font-weight: 780;
  letter-spacing: -0.025em;
}

.marvin-library-card__meta {
  margin: 5px 0 0;
  color: var(--marvin-text-soft);
  font-size: 0.98rem;
}

.marvin-library-card__arrow {
  color: var(--marvin-orange);
  font-size: 1.5rem;
  transition: transform 180ms ease;
}

.marvin-library-card:hover .marvin-library-card__arrow {
  transform: translateX(4px);
}
```

---

# 10. Section headings

```css
.marvin-section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.marvin-section-heading__title {
  margin: 0;
  color: var(--marvin-text);
  font-size: 1.55rem;
  font-weight: 820;
  letter-spacing: -0.035em;
}

.marvin-section-heading__action {
  color: var(--marvin-orange);
  font-weight: 700;
  text-decoration: none;
}
```

---

# 11. Chips and tags

```css
.marvin-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 34px;
  padding: 0 13px;
  border: 1px solid rgba(46, 107, 87, 0.16);
  border-radius: var(--radius-pill);
  background: var(--marvin-green-soft);
  color: var(--marvin-green);
  font-size: 0.82rem;
  font-weight: 700;
}

.marvin-chip--orange {
  border-color: rgba(217, 94, 42, 0.18);
  background: var(--marvin-orange-soft);
  color: var(--marvin-orange-active);
}

.marvin-chip--gold {
  border-color: rgba(244, 185, 66, 0.28);
  background: var(--marvin-gold-soft);
  color: #8a6214;
}
```

---

# 12. Bottom navigation

```css
.marvin-bottom-nav {
  position: fixed;
  left: 50%;
  bottom: max(14px, env(safe-area-inset-bottom));
  z-index: 50;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  width: min(calc(100% - 28px), 680px);
  padding: 10px;
  border: 1px solid rgba(207, 199, 184, 0.72);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.90);
  box-shadow:
    0 18px 50px rgba(31, 42, 46, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(22px);
  transform: translateX(-50%);
}

.marvin-bottom-nav__item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 72px;
  border: 0;
  border-radius: 22px;
  background: transparent;
  color: var(--marvin-text-soft);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.marvin-bottom-nav__item:hover {
  background: var(--marvin-surface-soft);
  color: var(--marvin-text);
}

.marvin-bottom-nav__item--active {
  background: linear-gradient(
    145deg,
    var(--marvin-orange),
    #c94f20
  );
  color: var(--marvin-text-inverse);
  box-shadow: 0 8px 20px rgba(217, 94, 42, 0.26);
  transform: translateY(-2px);
}

.marvin-bottom-nav__icon {
  width: 27px;
  height: 27px;
}
```

---

# 13. Food imagery and featured recipe card

Add a featured recipe or recommendation near the top of the home page.

```css
.marvin-featured {
  position: relative;
  min-height: 270px;
  overflow: hidden;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  isolation: isolate;
}

.marvin-featured__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 400ms ease;
}

.marvin-featured:hover .marvin-featured__image {
  transform: scale(1.035);
}

.marvin-featured::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    180deg,
    rgba(15, 24, 24, 0.03) 20%,
    rgba(15, 24, 24, 0.82) 100%
  );
}

.marvin-featured__content {
  position: absolute;
  inset: auto 0 0;
  z-index: 2;
  padding: 28px;
  color: white;
}

.marvin-featured__label {
  display: inline-flex;
  margin-bottom: 10px;
  padding: 7px 11px;
  border-radius: var(--radius-pill);
  background: rgba(244, 185, 66, 0.92);
  color: #2e2410;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.marvin-featured__title {
  margin: 0;
  font-size: clamp(1.65rem, 7vw, 2.5rem);
  font-weight: 850;
  letter-spacing: -0.045em;
}

.marvin-featured__meta {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.82);
}
```

---

# 14. Form controls

```css
.marvin-input,
.marvin-textarea,
.marvin-select {
  width: 100%;
  border: 1px solid var(--marvin-border);
  border-radius: var(--radius-md);
  background: var(--marvin-surface);
  color: var(--marvin-text);
  box-shadow: var(--shadow-xs);
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.marvin-input,
.marvin-select {
  min-height: 54px;
  padding: 0 16px;
}

.marvin-textarea {
  min-height: 120px;
  padding: 16px;
  resize: vertical;
}

.marvin-input:focus,
.marvin-textarea:focus,
.marvin-select:focus {
  border-color: var(--marvin-orange);
  outline: none;
  box-shadow: 0 0 0 4px rgba(217, 94, 42, 0.12);
}

.marvin-label {
  display: block;
  margin-bottom: 8px;
  color: var(--marvin-text);
  font-size: 0.9rem;
  font-weight: 720;
}
```

---

# 15. Modal and sheet styling

```css
.marvin-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(23, 34, 34, 0.44);
  backdrop-filter: blur(6px);
}

.marvin-sheet {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 90;
  width: min(100%, 720px);
  max-height: 90vh;
  margin: 0 auto;
  overflow-y: auto;
  padding: 12px 22px calc(28px + env(safe-area-inset-bottom));
  border: 1px solid var(--marvin-border);
  border-bottom: 0;
  border-radius: 32px 32px 0 0;
  background: var(--marvin-surface);
  box-shadow: 0 -18px 54px rgba(31, 42, 46, 0.18);
}

.marvin-sheet__handle {
  width: 46px;
  height: 5px;
  margin: 2px auto 20px;
  border-radius: var(--radius-pill);
  background: var(--marvin-border-strong);
}
```

---

# 16. Motion

```css
@keyframes marvin-fade-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes marvin-pulse-glow {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(217, 94, 42, 0.18);
  }

  50% {
    box-shadow: 0 0 0 8px rgba(217, 94, 42, 0);
  }
}

.marvin-animate-in {
  animation: marvin-fade-up 420ms ease both;
}

.marvin-inspire-icon {
  animation: marvin-pulse-glow 2.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behaviour: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# 17. Example home page structure

```html
<main class="marvin-app">
  <div class="marvin-shell">
    <header class="marvin-header">
      <img class="marvin-header__icon" src="/icons/marvin.png" alt="" />
      <h1 class="marvin-header__brand">Marvin</h1>
    </header>

    <section class="marvin-hero marvin-animate-in">
      <img class="marvin-hero__logo" src="/icons/marvin.png" alt="Marvin" />

      <h2 class="marvin-hero__title">MARVIN</h2>
      <p class="marvin-hero__subtitle">What are we making, Stephen?</p>

      <label class="marvin-search">
        <svg class="marvin-search__icon" aria-hidden="true"></svg>
        <input
          class="marvin-search__input"
          type="search"
          placeholder='Try “aubergine” or “Tuesday curry”…'
        />
      </label>

      <div class="marvin-actions">
        <button class="marvin-button marvin-button--primary">Search</button>
        <button class="marvin-button marvin-button--secondary">
          ✦ Inspire me
        </button>
      </div>

      <div class="marvin-actions__supporting">
        <button class="marvin-button marvin-button--outline">
          + Bring in a recipe
        </button>

        <button class="marvin-button marvin-button--quiet">
          Snap what you cooked
        </button>
      </div>
    </section>

    <section class="marvin-section">
      <a class="marvin-card marvin-library-card" href="/library">
        <div class="marvin-library-card__icon"></div>

        <div>
          <p class="marvin-library-card__eyebrow">Your recipes</p>
          <h3 class="marvin-library-card__title">Browse what you’ve saved</h3>
          <p class="marvin-library-card__meta">11 recipes in your kitchen</p>
        </div>

        <span class="marvin-library-card__arrow">→</span>
      </a>
    </section>
  </div>
</main>
```

---

# 18. Tailwind theme mapping

If the app uses Tailwind CSS, map the palette into the theme.

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colours: {
        marvin: {
          orange: "#D95E2A",
          "orange-hover": "#C94F20",
          "orange-soft": "#F9E2D7",
          green: "#2E6B57",
          "green-hover": "#245745",
          "green-soft": "#DCEBE5",
          gold: "#F4B942",
          "gold-soft": "#FFF1C9",
          background: "#F7F4EE",
          surface: "#FFFFFF",
          border: "#DED8CC",
          text: "#1F2A2E",
          muted: "#7B878B",
        },
      },
      borderRadius: {
        marvin: "26px",
        "marvin-lg": "34px",
      },
      boxShadow: {
        "marvin-sm": "0 4px 12px rgba(31, 42, 46, 0.07)",
        marvin: "0 10px 28px rgba(31, 42, 46, 0.11)",
        "marvin-lg": "0 18px 48px rgba(31, 42, 46, 0.16)",
        "marvin-orange": "0 10px 24px rgba(217, 94, 42, 0.24)",
      },
    },
  },
  plugins: [],
};

export default config;
```

> Note: Tailwind uses the American spelling `colors` in the actual configuration key. Use `colors`, not `colours`, in the final code.

Corrected block:

```ts
extend: {
  colors: {
    marvin: {
      orange: "#D95E2A",
      "orange-hover": "#C94F20",
      "orange-soft": "#F9E2D7",
      green: "#2E6B57",
      "green-hover": "#245745",
      "green-soft": "#DCEBE5",
      gold: "#F4B942",
      "gold-soft": "#FFF1C9",
      background: "#F7F4EE",
      surface: "#FFFFFF",
      border: "#DED8CC",
      text: "#1F2A2E",
      muted: "#7B878B",
    },
  },
}
```

---

# 19. Recommended visual hierarchy

Apply the action hierarchy consistently:

| Action | Style |
|---|---|
| Search | Orange primary button |
| Inspire me | Dark forest secondary button |
| Bring in a recipe | Green outline button |
| Snap what you cooked | White quiet button |
| Selected navigation item | Orange filled pill |
| Section links and arrows | Orange |
| Supporting labels and metadata | Green or muted charcoal |

Avoid giving multiple actions the same visual weight.

---

# 20. Changes to make first

1. Replace the current green Search button with terracotta orange.
2. Keep Inspire me dark, but move it towards forest-charcoal rather than pure green.
3. Change Bring in a recipe to an outline style.
4. Change the active bottom-navigation item to orange.
5. Add warmer card shadows and cream page backgrounds.
6. Use orange for arrows, links, focus states and small visual highlights.
7. Add at least one food-led image or featured recipe card to the home screen.
8. Reduce the amount of solid green across the interface.
9. Keep forest green as a supporting brand colour rather than the dominant colour.
10. Use golden yellow sparingly for badges, ratings, highlights and inspiration states.

---

# 21. Final CSS token summary

```css
/* Main page */
background: #f7f4ee;

/* Cards */
background: #ffffff;
border: #ded8cc;

/* Primary action */
background: #d95e2a;

/* Secondary action */
background: #1f3434;

/* Supporting colour */
color: #2e6b57;

/* Accent */
color: #f4b942;

/* Main text */
color: #1f2a2e;

/* Muted text */
color: #7b878b;
```

This theme keeps Marvin clean and modern, but gives the app more warmth, contrast and appetite appeal.
