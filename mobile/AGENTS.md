# Mobile App Architecture & Guidelines (Expo React Native)

This is an Expo/React Native mobile application built for **Dab Cric Auction** team owners and live mobile bidding.

---

## 🛠️ Tech Stack & SDK

- **Framework**: Expo SDK 58 (React Native 0.88, React 19)
- **State & Real-time**: WebSockets (`socket.io-client`), Supabase JS SDK
- **OTA Updates**: `expo-updates` via EAS Update
- **Icons**: `lucide-react-native`
- **Build System**: Expo Application Services (EAS Build & Submit)

---

## 📦 Over-The-Air (OTA) Updates via EAS Update

The application is configured with `expo-updates` to allow instant over-the-air updates without requiring new APK builds:

- **Service Module**: [`mobile/lib/updateManager.ts`](./lib/updateManager.ts)
  - `checkForAppUpdates()` runs automatically on app mount in [`mobile/App.tsx`](./App.tsx).
  - Admins can also trigger a manual check via the refresh icon in the Super Admin header.
- **Publishing an OTA Update**:
  ```bash
  cd mobile
  npx eas-cli update --branch preview --environment preview --message "Release notes"
  ```

---

## 🌟 Key Mobile Modules & Features

- **🔄 Franchise Trades & Injury Replacements** ([`components/TradePlayersModal.tsx`](./components/TradePlayersModal.tsx), [`components/ReplaceInjuredModal.tsx`](./components/ReplaceInjuredModal.tsx)):
  - Team purse re-balancing and price differential calculations.
  - Full Supabase Cloud DB direct sync via [`lib/supabaseService.ts`](./lib/supabaseService.ts).
- **🖼️ SafeImage Fullscreen Previews** ([`components/SafeImage.tsx`](./components/SafeImage.tsx)):
  - Previewable team logos and player photos with Android statusbar safe margin (`StatusBar.currentHeight`).
- **🎯 Clean In-Card Auction Status Messages**:
  - Embedded directly inside main auction cards across [`components/LiveBiddingRoom.tsx`](./components/LiveBiddingRoom.tsx), [`components/SpectatorScreen.tsx`](./components/SpectatorScreen.tsx), and [`components/AdminConsoleScreen.tsx`](./components/AdminConsoleScreen.tsx).
- **📊 Spectator Slots / Sets Explorer**:
  - Live public spectator screen features real-time set navigation and active slot (`🔥`) indicators.

---

## 🚀 Building Android Binaries (EAS Build)

```bash
# 1. Installable standalone APK (Testing / Direct distribution)
npx eas-cli build -p android --profile preview

# 2. Production Play Store AAB
npx eas-cli build -p android --profile production
```

---

## 🔑 Environment Variables (`mobile/.env`)

```env
EXPO_PUBLIC_API_URL=https://your-api.onrender.com
EXPO_PUBLIC_SOCKET_URL=https://your-api.onrender.com
EXPO_PUBLIC_WEB_URL=https://your-web.vercel.app
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
