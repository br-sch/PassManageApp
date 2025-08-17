# PassManageApp

A simple, elegant password manager built with Expo + Expo Router. Local-only: credentials are stored on-device using Expo SecureStore (or AsyncStorage fallback).

## Run locally

```sh
npm install
npm run web   # or: npm run android / npm run ios
```

## Features

- Login and registration (local, hashed with SHA-256)
- Per-user vault stored securely on device
- Add entries: Source/Company, Username, Password
- Delete entries

## Notes

- This is a demo and doesn’t implement end-to-end encryption or cloud sync.
- For production, prefer a proven, audited password manager.

