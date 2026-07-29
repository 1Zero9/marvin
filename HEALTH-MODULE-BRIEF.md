# Health Module — Project Brief for Claude Code

## What this is
A personal weight loss / health tracking module, built as part of Marvin
(existing personal hub), sitting behind a secure/private area. Four core
features: alcohol tracking, weight logging, home bodyweight workouts, and a
"recipe lightener" that suggests healthier swaps for meals pulled from the
existing book/recipe index (Cookshelf-style data).

This is personal-use software, not medical software. No diagnosis, no
calorie-counting obsession mechanics, no guilt-tripping copy. Tone should be
matter-of-fact and encouraging, never punitive.

## Context / constraints (read before building)
- User has a sore ankle — no running, no long walks, no jumping/plyometric
  moves in the workout library.
- User has a lower back that flares up — avoid crunches/sit-ups and any move
  that loads spinal flexion. Favor bird-dog, dead bug, glute bridge, side
  plank style core work instead.
- Sessions should default to 10-15 minutes, bodyweight only (no equipment
  assumed).
- Current weight ~15 stone, target ~12–12.5 stone, height 5'10".
- Alcohol reduction is the top-priority feature, not an afterthought.
  User does NOT want full/permanent abstinence — the pattern is cyclical:
  a 30-day full-stop period, followed by a "moderate" period with a
  weekly unit target, then optionally another 30-day full-stop later.
  Support repeating this cycle, not just a single one-off challenge.
  First 30-day period starts after user's upcoming trip.
- Recipe/meal data reuses the existing book-index and manual recipe schema
  already built for Cookshelf — do not duplicate that data model, extend it.
- AI-powered swap suggestions call **Gemini** (already paid for, already
  wired up elsewhere) — not the Anthropic API — for the recipe lightener.

## Tech stack
- Next.js 15 (App Router), TypeScript — match existing Marvin/Cookshelf stack
- Prisma ORM + Postgres (Neon)
- Vercel deploy, auto-deploy on main
- PWA, installable
- Gemini API for recipe-swap suggestions (server-side route handler only,
  key never exposed client-side)
- Auth: sits behind Marvin's existing secure area — confirm session/auth
  pattern already used elsewhere in Marvin and reuse it, don't build a
  parallel auth system

## Data model (Prisma — adjust as needed, keep these entities)

```prisma
model AlcoholLog {
  id        String   @id @default(cuid())
  date      DateTime @db.Date
  hadDrink  Boolean
  units     Float?
  notes     String?
  createdAt DateTime @default(now())
}

model AlcoholPhase {
  id              String   @id @default(cuid())
  type            String   // "zero" | "moderate"
  startDate       DateTime @db.Date
  endDate         DateTime? @db.Date // null = ongoing (moderate phases have no fixed end)
  weeklyUnitTarget Int?    // only relevant when type = "moderate"
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
}

model WeightLog {
  id        String   @id @default(cuid())
  date      DateTime @db.Date
  weightKg  Float
  notes     String?
  createdAt DateTime @default(now())
}

model UserGoal {
  id             String  @id @default(cuid())
  targetWeightKg Float
  heightCm       Float
  updatedAt      DateTime @updatedAt
}

model Exercise {
  id            String   @id @default(cuid())
  name          String
  category      String   // strength | core | mobility | low-impact-cardio | chest | ankle-rehab | back-rehab
  cue           String   // one-line plain instruction
  whySafeNote   String?  // why this is ankle/back-friendly
  beginnerVariant   String?
  progressedVariant String?
  iconUrl       String?  // custom line-art, not sourced from external db
  // Prescription detail (used for physio-prescribed exercises)
  physioPrescribed Boolean @default(false)
  reps          String?  // e.g. "10", "8-10", "12"
  sets          Int?
  holdSeconds   Int?
  frequencyPerDay Int?   // e.g. 3 = "3 times daily"
  source        String?  // e.g. "Tyrrell Physiotherapy, Gerard Tyrrell"
}

model WorkoutSession {
  id          String   @id @default(cuid())
  date        DateTime @db.Date
  durationMin Int
  exerciseIds String[] // Exercise ids completed
  notes       String?
}

model DailyChecklist {
  id         String   @id @default(cuid())
  date       DateTime @db.Date
  items      Json     // e.g. [{label: "No alcohol", done: true}, ...]
}

// Weekly Meal Planner, Shopping List, Daily Rating
model MealPlanEntry {
  id           String   @id @default(cuid())
  date         DateTime @db.Date
  mealType     String   // "breakfast" | "lunch"
  recipeId     String?  // FK to existing Recipe model, if chosen from index
  freeformText String?  // quick entry, if not using an indexed recipe
  createdAt    DateTime @default(now())
}

model ShoppingListItem {
  id            String   @id @default(cuid())
  weekStartDate DateTime @db.Date
  ingredient    String
  quantity      String?  // kept as string, e.g. "2" or "1 tin" — aggregation is best-effort text merge
  checked       Boolean  @default(false)
  source        String   @default("auto") // "auto" (from planned meals) | "manual"
  createdAt     DateTime @default(now())
}

model DailyRating {
  id           String   @id @default(cuid())
  date         DateTime @db.Date
  stuckToPlan  String?  // "yes" | "partial" | "no"
  energyMood   Int?     // 1-5 scale
  note         String?
  createdAt    DateTime @default(now())
}

model RecipeSwapSuggestion {
  id          String   @id @default(cuid())
  recipeId    String   // FK to existing Recipe model
  suggestions Json     // [{original, swap, reason, impactLevel}]
  generatedAt DateTime @default(now())
}

model RecipeVariant {
  id           String   @id @default(cuid())
  originalRecipeId String // FK to existing Recipe model
  name         String   // e.g. "Lightened version"
  ingredients  Json
  notes        String?
  createdAt    DateTime @default(now())
}
```

## Screens / features

### 1. Alcohol tracker
- Daily log: quick yes/no tap, optional units field, optional note
- **Phase model, not one-off challenge**: alternates between "zero"
  periods (30 days, full stop) and "moderate" periods (ongoing, weekly
  unit target — default reference point is the HSE low-risk guideline
  of ~11 units/week, but user-editable)
- "Start 30-day zero period" — pick a start date, app tracks days
  remaining/completed, auto-transitions to a moderate phase on day 31
  (user confirms the transition rather than it being silent)
- Can schedule multiple zero periods over time — not limited to one
- During moderate phases: weekly units logged against target, simple
  under/over indicator, no shaming copy if over — just the number
- Streak counter (days since last drink) always visible regardless of
  phase
- Timeline/history view: see past zero periods and moderate periods
  laid out chronologically, so patterns over months are visible

### 2. Weight log
- Add entry (date + weight), single input, fast
- Target weight set once in settings (12–12.5 stone equivalent in kg)
- Trend chart: raw entries + 7-day rolling average line (avoid showing
  noisy day-to-day fluctuation as the headline number)
- Progress framed as "X kg to go" not percentage-based guilt metrics

### 3. Home workouts
- Library of ~12-15 exercises across categories: strength, core,
  mobility, low-impact cardio, chest, ankle-rehab, back-rehab
- Ankle-rehab and back-rehab moves are tagged/grouped distinctly in the
  UI so they read as targeted rehab work, not generic strength
- Chest exercises included (incline push-ups, isometric chest squeeze)
  but UI copy should NOT imply spot-reduction — chest fat comes down
  with overall body fat loss, not from chest exercises alone; frame
  these as building/toning the muscle underneath as weight comes off,
  not as a fat-burning target in themselves
- Each exercise: name, plain-language cue, why-safe note, beginner
  variant, progressed variant, simple custom icon (not sourced externally)
- Session builder: pick 10-15 min worth of exercises, or use a
  pre-built "today's session" suggestion
- Log completed sessions; simple history view
- Exact exercise list is a first draft — expect to refine once the
  library is actually visible/usable, rather than finalizing on paper

### Physio-prescribed seed content (ankle-rehab + back-rehab)
User has an existing personal exercise program from Tyrrell Physiotherapy
(Gerard Tyrrell) for both the lower back and ankle. These should be the
actual seed data for those two categories — real prescribed reps/sets/
holds, not app-invented numbers. Mark `physioPrescribed: true`,
`source: "Tyrrell Physiotherapy, Gerard Tyrrell"`.

**Back-rehab:**
1. **Prone press-up (lumbar extension)** — lying face down, hands at
   shoulder height, straighten elbows and lift upper trunk as far as
   comfortable, keep pelvis/legs relaxed. Reps: 10-15, freq: 3x/day
   (hold 2 sec on later progression)
2. **Prone on elbows (extension in lying)** — face down, lean on
   elbows/forearms, arch lower back, pillow under chest, relax in
   position. Hold: 2 min
3. **Lumbar traction stretch** — standing, knees bent, hold a stable
   support (pole/banister), let upper trunk drop and hips sit back,
   arms straight. Hold: 30 sec, freq: 3x/day
4. **Knees to sides** — lying on back, knees bent, move knees side to
   side in a controlled manner without shoulders moving or back
   arching. Reps: 20, sets: 3
5. **Posterior pelvic tilt** — lying on back, knees bent, draw in
   lower abs/pelvic floor, tilt pelvis back to flatten lower back into
   the floor. Reps: 10, sets: 3
6. **Bridge** — lying on back, legs bent, squeeze glutes and lift
   pelvis off floor, controlled return. Reps: 8-10, sets: 3
7. **Hamstring stretch** — lying on back, hold under one knee, pull
   toward chest, straighten knee until stretch felt in back of thigh.
   Hold: 30 sec, freq: 3x/day, both sides

**Ankle-rehab:**
1. **Calf stretch (wedge)** — 1-2cm wedge under toes/ball of foot,
   affected leg behind, lean body forward/down until stretch felt in
   calf. Hold: 30 sec, freq: 3x/day
2. **Elevated leg + ankle pumps** — if swelling present, leg elevated
   above hip, bend/straighten ankle frequently while seated
3. **Isometric calf press (long sitting)** — seated, feet against
   wall, push toes into wall as if pushing it away. Hold: 3-5 sec,
   reps: 10, freq: 3x/day
4. **Standing eversion press** — seated, foot against wall, heel down,
   press foot outward against wall. Hold: 10 sec, reps: 10, freq: 3x/day
5. **Heel raise** — standing, weight even on both feet, rise onto
   toes, controlled return. Reps: 10-12, sets: 3
6. **Weight-bearing Achilles stretch** — affected leg behind other
   leg, push heel down while bending front knee. Reps: 12, freq: 3x/day
7. **Single-leg standing balance** — balance on one leg, stand tall,
   weight even, toes forward. Hold: 30 sec, reps: 2, freq: 3x/day

These should display with their exact prescribed numbers pre-filled
(not editable defaults the way generic library exercises might be),
since they came from a professional assessment specific to the user.

### 4. Recipe lightener
- From any recipe (book-indexed or manual) in the existing Cookshelf
  data, tap "Lighten this meal"
- Server route sends ingredient list to Gemini, gets back ranked swaps
  (ingredient or method) with a one-line reason and rough impact level
  (low/medium/high)
- User can save result as a `RecipeVariant` linked back to the original
- Method swaps included, not just ingredients (e.g. fry → air-fry)

### 5. Weekly meal planner (breakfast + lunch)
- Grid view, Mon-Sun, breakfast and lunch slots — mainly for solo
  at-home meals, not family dinners
- Each slot: pick from the recipe index (search/browse) OR add a quick
  freeform entry ("eggs + toast") — both supported per meal
- This is the direct fix for "not knowing what to eat" — the plan
  should exist *before* the week starts, not be decided meal-by-meal
- Once books are scanned/indexed (Cookshelf), this becomes a proper
  browse rather than relying on memory — call this out in the UI as
  the index grows (e.g. "12 books indexed, 340 recipes searchable")

### 6. Shopping list
- Auto-generated from the current week's planned meals — aggregates
  ingredients across all planned breakfasts/lunches, best-effort merge
  of duplicates (e.g. onions needed twice → one line)
- Manual items can be added on top (non-meal groceries)
- Checkable list, resets/archives at end of week
- Directly fixes "not having" — the other half of the problem alongside
  the planner fixing "not knowing"

### 7. Daily rating
- Two quick taps per day, not a form: **stuck to plan** (yes/partial/no)
  and **energy/mood** (1-5)
- Optional short note
- History view over weeks — the point is spotting patterns (e.g. energy
  dips on days you didn't stick to plan, or vice versa), not judging
  any single day

### 8. Daily checklist (lightweight overview)
- 3-4 user-chosen non-negotiables (e.g. no alcohol, one workout, water,
  short walk within ankle tolerance)
- Simple tick-off per day, no scoring/streaks pressure beyond what's
  already in the alcohol tracker

## Explicitly out of scope for v1
- Calorie counting / food diary beyond the recipe lightener
- Running/step-count targets
- Any exercise involving jumping, running, or spinal flexion (crunches,
  sit-ups)
- Social/sharing features
- Wearable integration

## Build order suggestion
1. Weight log + goal (simplest, standalone)
2. Alcohol tracker (phase model: zero/moderate cycles)
3. Exercise library + workout session logging
4. Daily checklist
5. Daily rating (small, standalone, no dependencies)
6. Weekly meal planner — freeform entries first, recipe-index picking
   depends on Cookshelf data being queryable
7. Shopping list (depends on planner existing, since it aggregates from
   planned meals)
8. Recipe lightener (depends on existing Cookshelf recipe data — build
   last so that schema is stable)
