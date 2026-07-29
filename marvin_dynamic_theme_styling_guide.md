# Marvin Dynamic Theme & Styling Guide

## Objective

Refresh Marvin’s visual design without changing the core app structure.

The main design changes are:

- Replace the flat cream background with a layered, warmer canvas.
- Use deep plum for navigation, headings and secondary actions.
- Use vivid orange for the primary action and active states.
- Replace strong borders with softer shadows and glass-like surfaces.
- Give health cards more depth and clearer interaction states.
- Convert the bottom navigation into a dark floating control bar.
- Add subtle abstract decoration rather than filling the screen with imagery.

---

## 1. Theme Tokens

Add these variables to your global CSS file.

```css
:root {
  /* Brand */
  --marvin-plum-950: #24072f;
  --marvin-plum-900: #32103d;
  --marvin-plum-800: #47124f;
  --marvin-plum-700: #5a175e;
  --marvin-plum-500: #8d4b91;

  --marvin-orange-700: #e84208;
  --marvin-orange-600: #ff520d;
  --marvin-orange-500: #ff6a16;
  --marvin-orange-400: #ff8b3d;

  /* Backgrounds */
  --marvin-canvas: #fffaf7;
  --marvin-canvas-warm: #fff4ec;
  --marvin-surface: rgba(255, 255, 255, 0.88);
  --marvin-surface-solid: #ffffff;

  /* Tints */
  --marvin-orange-tint: #fff0e5;
  --marvin-plum-tint: #f7eafb;
  --marvin-yellow-tint: #fff8df;

  /* Text */
  --marvin-text: #2a1230;
  --marvin-text-muted: #765f79;
  --marvin-text-soft: #9a879c;

  /* Borders */
  --marvin-border: rgba(74, 24, 80, 0.08);

  /* Shadows */
  --marvin-shadow-sm:
    0 6px 18px rgba(56, 18, 61, 0.06);

  --marvin-shadow-md:
    0 14px 32px rgba(56, 18, 61, 0.09);

  --marvin-shadow-button:
    0 14px 28px rgba(255, 82, 13, 0.22);

  --marvin-shadow-nav:
    0 18px 45px rgba(36, 7, 47, 0.3);

  /* Radius */
  --marvin-radius-sm: 18px;
  --marvin-radius-md: 24px;
  --marvin-radius-lg: 32px;
  --marvin-radius-pill: 999px;
}
```

---

## 2. Layered Page Background

Avoid using one solid cream colour. Create depth using several subtle gradients.

```css
.marvin-page {
  min-height: 100dvh;
  position: relative;
  overflow-x: hidden;
  color: var(--marvin-text);

  background:
    radial-gradient(
      circle at 100% 2%,
      rgba(255, 112, 34, 0.14),
      transparent 27rem
    ),
    radial-gradient(
      circle at -10% 45%,
      rgba(114, 38, 121, 0.08),
      transparent 24rem
    ),
    linear-gradient(
      180deg,
      #fffaf7 0%,
      #fff7f1 48%,
      #fffaf7 100%
    );
}
```

### Decorative Background Shapes

```css
.marvin-page::before {
  content: "";
  position: absolute;
  top: -90px;
  left: -110px;
  width: 310px;
  height: 310px;
  border-radius: 44% 56% 58% 42%;
  background: linear-gradient(
    145deg,
    rgba(255, 106, 22, 0.14),
    rgba(255, 220, 195, 0.04)
  );
  transform: rotate(18deg);
  pointer-events: none;
}

.marvin-page::after {
  content: "";
  position: absolute;
  right: -140px;
  bottom: 100px;
  width: 360px;
  height: 260px;
  border-radius: 50% 40% 0 60%;
  background: linear-gradient(
    135deg,
    var(--marvin-orange-500),
    var(--marvin-plum-800)
  );
  opacity: 0.95;
  pointer-events: none;
}
```

Ensure the page content appears above these shapes.

```css
.marvin-content {
  position: relative;
  z-index: 1;
}
```

---

## 3. Hero and Header Styling

Treat the app icon, title and greeting as one coherent hero section.

```css
.marvin-hero {
  padding: 32px 24px 18px;
  text-align: center;
}

.marvin-logo {
  width: 88px;
  height: 88px;
  margin-inline: auto;
  border-radius: 26px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.8);
  box-shadow:
    0 12px 28px rgba(80, 28, 74, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
}

.marvin-title {
  margin-top: 18px;
  font-size: clamp(2.5rem, 10vw, 4rem);
  line-height: 0.95;
  letter-spacing: -0.055em;
  font-weight: 850;
  color: var(--marvin-plum-950);
}

.marvin-greeting {
  margin-top: 18px;
  font-size: clamp(1.15rem, 4.5vw, 1.45rem);
  font-weight: 700;
  color: var(--marvin-plum-700);
}

.marvin-greeting strong {
  color: var(--marvin-orange-600);
}
```

### React Example

```tsx
<section className="marvin-hero">
  <img
    className="marvin-logo"
    src="/icons/marvin-icon.png"
    alt="Marvin"
  />

  <h1 className="marvin-title">MARVIN</h1>

  <p className="marvin-greeting">
    What are we <strong>making</strong>, Stephen?
  </p>
</section>
```

---

## 4. Search Field

Replace the visible purple outline with a white, elevated surface.

```css
.marvin-search {
  display: flex;
  align-items: center;
  gap: 14px;

  min-height: 72px;
  padding: 0 22px;

  border: 1px solid rgba(75, 26, 81, 0.06);
  border-radius: var(--marvin-radius-pill);

  background: rgba(255, 255, 255, 0.88);
  box-shadow: var(--marvin-shadow-md);
  backdrop-filter: blur(16px);
}

.marvin-search:focus-within {
  border-color: rgba(255, 82, 13, 0.38);
  box-shadow:
    0 0 0 4px rgba(255, 82, 13, 0.1),
    var(--marvin-shadow-md);
}

.marvin-search svg {
  flex: 0 0 auto;
  color: var(--marvin-orange-600);
}

.marvin-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;

  font: inherit;
  font-size: 1.05rem;
  color: var(--marvin-text);
}

.marvin-search input::placeholder {
  color: var(--marvin-text-soft);
}
```

---

## 5. Primary Actions

Give each button a clearly differentiated purpose:

- **Search recipes:** orange gradient.
- **Inspire me:** plum gradient.
- **Snap what you cooked:** neutral white or pale cream.

```css
.marvin-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 18px;
}

.marvin-action {
  min-height: 82px;
  padding: 16px 18px;

  display: flex;
  align-items: center;
  gap: 12px;

  border: 0;
  border-radius: 24px;

  color: white;
  text-align: left;
  cursor: pointer;

  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    filter 180ms ease;
}

.marvin-action:hover {
  transform: translateY(-2px);
  filter: brightness(1.03);
}

.marvin-action:active {
  transform: translateY(0) scale(0.985);
}

.marvin-action--search {
  background: linear-gradient(
    135deg,
    var(--marvin-orange-600),
    var(--marvin-orange-500)
  );
  box-shadow: var(--marvin-shadow-button);
}

.marvin-action--inspire {
  background: linear-gradient(
    135deg,
    var(--marvin-plum-700),
    var(--marvin-plum-950)
  );
  box-shadow:
    0 14px 28px rgba(58, 14, 66, 0.22);
}

.marvin-action__label {
  display: block;
  font-size: 1.05rem;
  font-weight: 750;
}

.marvin-action__description {
  display: block;
  margin-top: 2px;
  font-size: 0.78rem;
  font-weight: 500;
  opacity: 0.82;
}
```

### React Example

```tsx
<div className="marvin-actions">
  <button className="marvin-action marvin-action--search">
    <SearchIcon />

    <span>
      <span className="marvin-action__label">Search recipes</span>
      <span className="marvin-action__description">
        Find something delicious
      </span>
    </span>
  </button>

  <button className="marvin-action marvin-action--inspire">
    <SparklesIcon />

    <span>
      <span className="marvin-action__label">Inspire me</span>
      <span className="marvin-action__description">
        Surprise me with ideas
      </span>
    </span>
  </button>
</div>
```

### Narrow Screen Layout

```css
@media (max-width: 390px) {
  .marvin-actions {
    grid-template-columns: 1fr;
  }
}
```

---

## 6. Camera Action

The camera button should feel secondary to the two main actions.

```css
.marvin-camera-action {
  width: fit-content;
  max-width: 100%;
  margin: 18px auto 0;
  min-height: 64px;
  padding: 12px 22px;

  display: flex;
  align-items: center;
  gap: 12px;

  border: 1px solid rgba(255, 106, 22, 0.08);
  border-radius: var(--marvin-radius-pill);

  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.96),
    rgba(255, 248, 223, 0.92)
  );

  color: var(--marvin-plum-800);
  box-shadow: var(--marvin-shadow-sm);
}

.marvin-camera-action svg {
  color: var(--marvin-plum-700);
}

.marvin-camera-action strong {
  display: block;
  font-size: 0.98rem;
}

.marvin-camera-action small {
  display: block;
  margin-top: 2px;
  color: var(--marvin-text-muted);
}
```

---

## 7. Health Cards

The health cards should appear interactive and structured, rather than as plain white boxes.

```css
.health-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.health-card {
  position: relative;
  min-height: 170px;
  padding: 18px 16px;

  border: 1px solid var(--marvin-border);
  border-radius: var(--marvin-radius-md);

  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--marvin-shadow-sm);
  backdrop-filter: blur(12px);

  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.health-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--marvin-shadow-md);
}

.health-card__icon {
  width: 48px;
  height: 48px;

  display: grid;
  place-items: center;

  border-radius: 50%;
  color: var(--marvin-orange-600);
  background: var(--marvin-orange-tint);
}

.health-card:nth-child(2) .health-card__icon,
.health-card:nth-child(5) .health-card__icon {
  color: var(--marvin-plum-700);
  background: var(--marvin-plum-tint);
}

.health-card h3 {
  margin: 18px 0 6px;
  font-size: 1.05rem;
  line-height: 1.15;
  color: var(--marvin-plum-900);
}

.health-card p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
  color: var(--marvin-text-muted);
}

.health-card__arrow {
  position: absolute;
  right: 14px;
  bottom: 14px;
  color: var(--marvin-orange-600);
}
```

### Mobile Layout

```css
@media (max-width: 520px) {
  .health-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

---

## 8. Floating Bottom Navigation

This is the most significant visual change. Replace the pale navigation bar with a deep plum floating panel.

```css
.marvin-nav-shell {
  position: fixed;
  z-index: 50;
  left: 16px;
  right: 16px;
  bottom: max(14px, env(safe-area-inset-bottom));
}

.marvin-nav {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;

  min-height: 82px;
  padding: 8px;

  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 30px;

  background:
    linear-gradient(
      135deg,
      rgba(83, 22, 91, 0.98),
      rgba(34, 6, 45, 0.98)
    );

  box-shadow: var(--marvin-shadow-nav);
  backdrop-filter: blur(20px);
}

.marvin-nav-item {
  min-width: 0;
  min-height: 64px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;

  border: 0;
  border-radius: 22px;
  background: transparent;

  color: rgba(255, 255, 255, 0.72);
  font-size: 0.76rem;
  font-weight: 650;
}

.marvin-nav-item svg {
  width: 23px;
  height: 23px;
}

.marvin-nav-item[data-active="true"] {
  color: white;
  background: linear-gradient(
    145deg,
    var(--marvin-orange-500),
    var(--marvin-orange-600)
  );
  box-shadow: 0 10px 22px rgba(255, 82, 13, 0.35);
}
```

Add sufficient page padding so the fixed navigation does not obscure content.

```css
.marvin-main {
  padding: 0 20px 130px;
}
```

---

## 9. Optional Food Photography

Food photography can add energy to the home hero, but it should not dominate every page.

```css
.marvin-food-visual {
  position: absolute;
  z-index: 0;

  top: 38px;
  right: -78px;

  width: 240px;
  aspect-ratio: 1;
  object-fit: cover;

  border-radius: 50%;
  box-shadow: 0 24px 50px rgba(52, 23, 29, 0.18);
  transform: rotate(-7deg);

  pointer-events: none;
}
```

For a simpler implementation, use an abstract colour orb instead.

```css
.marvin-hero-orb {
  position: absolute;
  top: 40px;
  right: -100px;
  width: 250px;
  height: 250px;
  border-radius: 50%;

  background:
    radial-gradient(
      circle at 35% 35%,
      #ffbd82,
      #ff6a16 42%,
      #7d235f 100%
    );

  opacity: 0.18;
  filter: blur(2px);
}
```

---

## 10. Tailwind CSS Examples

### Page Container

```tsx
<div
  className="
    relative min-h-dvh overflow-x-hidden
    bg-[radial-gradient(circle_at_100%_2%,rgba(255,112,34,0.14),transparent_27rem),radial-gradient(circle_at_-10%_45%,rgba(114,38,121,0.08),transparent_24rem),linear-gradient(180deg,#fffaf7_0%,#fff7f1_48%,#fffaf7_100%)]
    pb-32 text-[#2a1230]
  "
>
  {children}
</div>
```

### Search Button

```tsx
<button
  className="
    flex min-h-20 items-center gap-3 rounded-3xl
    bg-gradient-to-br from-[#ff520d] to-[#ff6a16]
    px-5 text-left text-white
    shadow-[0_14px_28px_rgba(255,82,13,0.22)]
    transition duration-200
    hover:-translate-y-0.5 hover:brightness-105
    active:translate-y-0 active:scale-[0.985]
  "
>
  <Search className="size-7 shrink-0" />

  <span>
    <span className="block text-lg font-bold">
      Search recipes
    </span>

    <span className="block text-sm text-white/80">
      Find something delicious
    </span>
  </span>
</button>
```

### Inspire Button

```tsx
<button
  className="
    flex min-h-20 items-center gap-3 rounded-3xl
    bg-gradient-to-br from-[#5a175e] to-[#24072f]
    px-5 text-left text-white
    shadow-[0_14px_28px_rgba(58,14,66,0.22)]
    transition duration-200
    hover:-translate-y-0.5 hover:brightness-105
    active:translate-y-0 active:scale-[0.985]
  "
>
  <Sparkles className="size-7 shrink-0" />

  <span>
    <span className="block text-lg font-bold">
      Inspire me
    </span>

    <span className="block text-sm text-white/80">
      Surprise me with ideas
    </span>
  </span>
</button>
```

### Health Card

```tsx
<article
  className="
    relative min-h-44 rounded-3xl border
    border-[#4a1850]/[0.08]
    bg-white/90 p-4
    shadow-[0_6px_18px_rgba(56,18,61,0.06)]
    backdrop-blur-xl
    transition duration-200
    hover:-translate-y-1
    hover:shadow-[0_14px_32px_rgba(56,18,61,0.09)]
  "
>
  <div
    className="
      grid size-12 place-items-center rounded-full
      bg-[#fff0e5] text-[#ff520d]
    "
  >
    <Scale className="size-6" />
  </div>

  <h3 className="mt-5 text-lg font-bold text-[#32103d]">
    Weight
  </h3>

  <p className="mt-1 text-sm text-[#765f79]">
    Not logged yet
  </p>

  <ChevronRight
    className="
      absolute bottom-4 right-4 size-5
      text-[#ff520d]
    "
  />
</article>
```

---

## 11. Suggested Component Structure

```text
components/
├── home/
│   ├── MarvinHero.tsx
│   ├── RecipeSearch.tsx
│   ├── QuickActions.tsx
│   ├── CameraAction.tsx
│   ├── HealthOverview.tsx
│   └── HealthCard.tsx
├── navigation/
│   └── MobileBottomNav.tsx
└── ui/
    ├── IconBadge.tsx
    ├── SectionHeading.tsx
    └── SurfaceCard.tsx
```

This prevents rounded corners, shadows and colours from being repeated throughout the application.

---

## 12. Recommended Implementation Balance

Do not copy every decorative element from the concept image. The strongest practical version should use:

1. A layered cream and peach page background.
2. Orange and plum gradient action buttons.
3. White health cards with tinted circular icons.
4. A dark plum floating navigation bar.
5. One subtle abstract decorative shape near the top.
6. Food photography only where it adds meaning.
7. Consistent corner radii between 24px and 30px.
8. A single, restrained shadow system.

This will make Marvin feel more dynamic while preserving usability, readability and a coherent visual identity.
