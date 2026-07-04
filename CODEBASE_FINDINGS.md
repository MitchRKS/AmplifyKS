# AmplifyKS — Codebase Key Findings

_Last updated: 2026-07-03 (branch `main`, HEAD 4cc31e7)_

## What it is
Kansas civic-engagement app: browse KS Legislature bills, look up legislators/committees, submit testimony, take an issue quiz that matches users to legislators, and earn gamification points. Cross-platform Expo app (iOS/Android/web) deployed to Netlify as a static web export.

## Stack
- **Expo SDK 54** / React Native 0.81 / React 19, **expo-router v6** (file-based routing, typed routes + React Compiler experiments enabled in `app.json`)
- **Firebase v12**: Auth (email/password) + Firestore. Web uses `getAuth`, native uses `initializeAuth` with AsyncStorage persistence — lazy singletons in `services/firebase.ts`
- **Netlify**: `npx expo export --platform web` → `dist/`, SPA redirect in `netlify.toml`. `netlify/functions/legiscan.mts` proxies LegiScan so the API key stays server-side (`LEGISCAN_API_KEY` env var)
- **Tests**: jest-expo (`npm test`), suites in `__tests__/` dirs covering the pure logic (match engine, tagger, gamification, legislator adapter, LegiScan helpers). Tests that transitively import firebase must `jest.mock('firebase/firestore', ...)` — firebase's mixed CJS/ESM dist breaks jest otherwise
- **CI**: `.github/workflows/ci.yml` runs tsc, lint, tests, and `validate:data` on pushes to main and PRs
- Shared AsyncStorage cache helpers live in `services/persistent-cache.ts` (`readPersistentCache` = stale-while-revalidate for OpenStates; `readFreshPersistentCache` = evict-on-expiry for LegiScan)

## Running it
- `npm start` / `npm run web` for normal dev
- `npm run web:netlify` → http://localhost:8888 when Netlify function proxying is needed (runs Expo web on 8082 behind Netlify dev on 8888; CI mode = **no hot reload**, manual browser refresh). The script `rm -rf dist` first — a stale `dist/` makes netlify dev's SPA redirect hijack every request (including the JS bundle) and the app renders an empty page
- Secrets in `.env` (gitignored): `EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_OPENSTATES_API_KEY`, `EXPO_PUBLIC_BILLTRACK50_API_KEY`

## Routing / app structure (`app/`)
- `index.tsx`: auth gate — logged in → `/(tabs)/dashboard`; web anon → `/lookup`; native anon → `/(auth)/login`
- Route groups: `(auth)` (login/register), `(tabs)` (dashboard, bills, actions, points, organizations, profile, `officials/` sub-stack: index, state, federal, committees, lookup)
- Detail screens at root level: `bill-detail`, `legislator-detail`, `committee-detail`, `quiz`
- `app/_layout.tsx` wraps everything in `AuthProvider` → `GamificationProvider` → `DesktopWebShell` (renders `WebTopNav` on desktop web). `(tabs)/_layout.tsx` branches: `DesktopLayout` (just a `<Slot/>`, nav lives in the shell) vs `MobileLayout` (bottom `Tabs`)
- Responsive logic: `hooks/use-responsive-layout.ts` — non-web is always "mobile"; web uses `Breakpoints` from `constants/theme.ts`; `showSidebar` only on desktop

## Data sources (`services/`)
- **Local-first legislator data**: `services/data/kansas-legislators.ts` (~4,400 lines) is **AUTO-GENERATED from KansasLegislators.swift — do not hand-edit**; regenerate with `node scripts/parse-kansas-legislators.js`. Contains chamber/district/party/email/phone/committees/leadership per legislator
- `services/kansas-legislators.ts`: adapter exposing the static data in OpenStates-shaped types. Synthetic IDs: legislators `ks-state-{chamber}-{district}`, committees `ks-committee-...` (check `isLocalLegislatorId`/`isLocalCommitteeId`)
- `services/openstates.ts`: OpenStates v3 API with a serialized fetch queue (1.1s min spacing, 60s rate-limit cooldown) + AsyncStorage persistent cache; falls back to/prefers local data for KS legislators
- `services/legiscan.ts`: LegiScan API for bills, sponsored bills (12h cache), voting records (24h cache). Routes through the Netlify Function proxy: web uses the relative `/.netlify/functions/legiscan` path (so local web dev needs `npm run web:netlify`), native uses `EXPO_PUBLIC_LEGISCAN_PROXY_URL`; `EXPO_PUBLIC_LEGISCAN_API_KEY` is a dev-only direct-API fallback
- `services/billtrack50.ts`: BillTrack50 scorecard (hardcoded `SCORECARD_ID = 4579`, "2026 KSLeg Scorecard")
- `services/legislator-match-engine.ts` + `bill-category-tagger.ts` + `hooks/use-quiz.ts`: quiz answers (1–5 per issue category) vs. legislator vote records → alignment/composite match scores
- `constants/committee-meetings.ts`: static meeting day/time/room, keyed `"${chamber} ${committeeName}"` where the name must **exactly match** the KANSAS_LEGISLATORS committee names

## Firebase / Firestore
- Config from `EXPO_PUBLIC_FIREBASE_*` env vars; `getAuth()` throws if `window` is undefined (SSR/static export guard)
- Collections in `firestore.rules`: `users` (+ subcollections `surveys`, `savedOfficials`, `quizs`), `openBills`, `committeeEmails`, `bills`, `testimonies`, `notes`, `surveys`, `survey_responses`, `billTalkingPoints/points`, `legislatorRatings` (doc ID format `userId_legislatorId`, rating 1–5 int enforced in rules), `legislatorRatingStats`. Default deny for everything else
- Roles: `user` / `admin` / `super_admin` stored on the user doc (role changes require super_admin; the old self-promotion rule was removed 2026-07-03)

## Gamification
- `constants/gamification.ts`: 5 action types with points (Contact Legislator 50, Share 25, View Legislation 10, Quiz 200, Rate 15), levels, achievements
- `contexts/gamification-context.tsx`: state + streaks + achievement unlocks, persisted to Firestore under the user; `AchievementCelebration` overlay rendered at root

## Conventions
- Path alias `@/*` → repo root (tsconfig)
- Kebab-case file names; components in `components/` (themed-text/themed-view pattern from Expo template), hooks in `hooks/`, static data in `constants/` and `services/data/`
- Theme: `constants/theme.ts` (`Colors` light/dark palettes, `Breakpoints`); color scheme via `use-color-scheme` (+ `.web` variant)

## Current work in progress (uncommitted at time of writing)
Committee meeting info feature: new `constants/committee-meetings.ts`; modified `officials/committees.tsx`, `committee-detail.tsx`, `committee-card.tsx`, `web-top-nav.tsx`, `services/data/kansas-legislators.ts`

## Gotchas / watch-outs
1. The old LegiScan API key (`18cf...e2a`) lives in git history — rotation pending as of 2026-07-03 (requires emailing LegiScan support); until then the exposed key is still live. New key goes in Netlify env + `.env` only
2. Firestore rules changes require `firebase deploy --only firestore:rules` — editing `firestore.rules` alone does nothing
3. `services/data/kansas-legislators.ts` is generated — edit the generator/source, not the file (exception: the "Veterans & Military Affairs" → "Veterans & Military" typo fix on 2026-07-03 was applied to the generated file directly; the upstream Swift source needs the same fix before regenerating)
4. Gamification points are client-trusted (any user can inflate their own via console) — matters if leaderboards are ever added. `bills`/`legislatorRatingStats` writes were locked to admin and `users/{uid}/actionHistory` + `billCategoryTags` rules added on 2026-07-03 (both were silently hitting default-deny before)
5. `npm run validate:data` checks `COMMITTEE_MEETINGS` keys against committees derived from the legislator data — run it after touching either file (good CI candidate)
6. Verify changes with `npx tsc --noEmit` + `npx expo lint` + `npm test` + `npm run validate:data` — all four are clean as of 2026-07-03 and enforced by CI. The `@ts-expect-error` on `getReactNativePersistence` in `services/firebase.ts` covers a firebase v12 typings gap; remove it if a firebase upgrade makes tsc complain
7. `api/` directory is empty (unused); `COMMITTEE_EMAILS` maps "House Committee on Taxation" to a personal Gmail — looks like a test placeholder
