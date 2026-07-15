# DoAn_FE_Mobile

Frontend-only React Native project for the mobile app.

## Scope

- Contains the React Native UI and local offline-first flow
- Talks to the backend in `D:/Ky 9/DoAn_BE_Mobile`
- Does not contain backend server code

## Scripts

```bash
npm install
npm run lint
npm test
```

Run Metro:

```bash
npm start
```

Run Android when an emulator or device is available:

```bash
npm run android
```

## API configuration

The app uses a localhost-first strategy from `src/config/api.js`:

- `http://localhost:4000` is tried first for iOS simulator and environments where localhost is forwarded correctly.
- On Android, the app can automatically fall back to `http://10.0.2.2:4000` when direct localhost access fails in the emulator.
- For a physical device, replace the override host in `src/config/api.js` with your machine LAN IP if needed.

This keeps local development simple while still working around Android emulator networking limits.
