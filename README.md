# Vaulton

A secure, privacy-first password manager built with React Native. All vault data is stored locally and encrypted on your device. No cloud, no tracking, no ads.

## Features

- **Local-Only Vault:** All passwords and folders are encrypted and stored locally using AsyncStorage and AES-GCM encryption.
- **Biometric Unlock:** Unlock your vault with fingerprint/face ID (if enabled for your account).
- **Folder Organization:** Organize entries into folders. Prevents duplicate folder names.
- **Add/Edit/Delete Entries:** Easily manage passwords, usernames, and folders.
- **Password Generator:** Generate strong random passwords.
- **Copy to Clipboard:** Copy passwords with a single tap.
- **Import/Export:** Backup and restore your vault with encrypted files (base64-encoded JSON blob).
- **Bulk Import:** Imports entries and folders, mapping them correctly and preventing duplicates.
- **Auto-Logout:** Secure auto-logout after inactivity.
- **Error Handling & Logging:** Robust error handling and detailed logging for all major actions.

## How to Use

1. **Install Dependencies:**
   ```bash
   npm install
   npx react-native install @react-native-async-storage/async-storage
   npm install react-native-aes-gcm-crypto crypto-js
   ```

2. **Start the App:**
   ```bash
   npx react-native run-android
   npx react-native run-ios
   ```

3. **Register/Login:**
   - Create a new account with a username and password.
   - Enable biometric unlock after first login (optional).

4. **Add Entries:**
   - Tap "Add Entry" to create a new password entry.
   - Use the password generator or enter your own.
   - Assign to a folder (or create a new one).
   - Tap the copy icon to copy the password.

5. **Manage Folders:**
   - Create, rename, or delete folders.
   - Duplicate folder names are blocked (case-insensitive).

6. **Import/Export Vault:**
   - Export: Save an encrypted, base64-encoded backup of your vault.
   - Import: Restore from a backup file. Entries and folders are mapped and deduplicated using merge logic.

7. **Security:**
   - All data is encrypted with AES-GCM and stored using AsyncStorage.
   - Biometric unlock is device-bound and optional.
   - Auto-logout after inactivity.
   - **Important:** For your privacy and security, there is no way to recover your account if you forget your username or password. If you have exported your vault, you can import it on another device—but only if you use the same username and password you originally registered with.

## Development Notes
- All logic is modularized and documented for maintainability.
- Logging is enabled for all major events and errors.
- No cloud sync or external storage; privacy is guaranteed.

## License
MIT
