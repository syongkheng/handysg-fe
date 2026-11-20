# HandySG app

The customer and technician app for iOS, Android and web, built with Expo (SDK 58) and Expo Router.

## Run it

1. `npm install`
2. Create `.env.development` with the keys from `env.example` (`EXPO_PUBLIC_API_URL`, e.g. `http://localhost:3000`).
3. Start the backend (`npm run dev` in `../backend`). For the web app, add `http://localhost:8081` to the backend's `ALLOWED_ORIGINS`.
4. `npm start`, then press `w` for web, `i` for the iOS simulator or `a` for Android. Or scan the QR code with Expo Go.

On a physical phone, `localhost` is the phone itself: use your Mac's LAN IP in `EXPO_PUBLIC_API_URL`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` / `web` / `ios` / `android` | Dev server (loads `.env.development`) |
| `npm run build` | Token check + typecheck + lint + tests. Run before every PR. |
| `npm test` | Jest (jest-expo) |
| `npm run tokens:sync` | Regenerate `src/theme/tokens.generated.ts` from `../docs/design-system/tokens.json` |

## Layout

```
src/
├── app/          routes only (Expo Router): every file is a screen, _layout.tsx defines navigators
├── features/     screen sections grouped by feature (connectivity, settings, later auth, jobs…)
├── components/   shared UI built on tokens: AppText, Button, TextField, Card, Screen, StatusPill
├── theme/        tokens (generated), Inter fonts, light/dark ThemeProvider
├── api/          fetch client for the { code, status, data } envelope, ApiError, one file per endpoint group
└── config/env.ts the only file that reads process.env
```

## Rules

- No hard-coded colours, font sizes or spacing: use `useTheme().color`, `text`, `space`, `radius`, `size` from `@/theme`. Missing a value? Add it to `tokens.json` and the design-system README, then `npm run tokens:sync`.
- All text goes through `AppText`, so it gets Inter, the type scale and a theme colour.
- `EXPO_PUBLIC_*` values are baked into the app and readable by anyone. Never put a secret in them.
- Install packages with `npx expo install`, not `npm install <pkg>`, so versions match the SDK.
