# 🚀 Dab Cric Auction - Master Production Deployment Guide

આ ગાઈડમાં **Dab Cric Auction** પ્લેટફોર્મને સત્તાવાર પ્રોડક્શનમાં ડિપ્લોય કરવાની સંપૂર્ણ વિગતો છે:
- **Git & GitHub**: કોડ પુશ અને સેક્યુરિટી
- **Database**: Supabase Cloud (PostgreSQL + Realtime Sync + `bids` ledger)
- **Image Storage / CDN**: Cloudinary
- **Backend API & WebSockets**: Node.js / Express / Socket.io (Render.com / Railway.app)
- **Web Frontend**: React + Vite + Tailwind CSS (Vercel)
- **Mobile App (Android APK)**: React Native Expo via EAS Build (`.apk` ડાઉનલોડ & OTA અપડેટ્સ)

---

## 🏗️ સિસ્ટમ આર્કિટેક્ચર Overview

```
                                  +------------------------------------+
                                  |         SUPABASE CLOUD DB          |
                                  |   (PostgreSQL + Realtime Sync)     |
                                  |  Tournaments | Teams | Players |   |
                                  |  Slots | Users | Creds | Bids      |
                                  +-----------------+------------------+
                                                    |
                                  +-----------------+------------------+
                                  |                                    |
      +---------------------------v---+              +-----------------v-------------+
      |       CLOUDINARY CDN          |              |       NODE.JS BACKEND         |
      |   (Photos, Logos & Banners)   |              |  (Socket.io Live Auction Hub) |
      +-------------------------------+              |  - Render.com / Railway.app   |
                                                     +--------+----------------------+
                                                              |
                               +------------------------------+-------------------------------+
                               |                                                              |
                +--------------v--------------+                                +--------------v--------------+
                |     VERCEL WEB PORTAL       |                                |    EXPO MOBILE APP (EAS)    |
                |  - SuperAdmin Control Hub   |                                |  - Direct Installable .APK  |
                |  - Auctioneer Console       |                                |  - Team Owner Live Bidding  |
                |  - Public Projector View    |                                |  - Live Roster & Purse      |
                |  - Player Self-Registration |                                |  - Instant OTA Auto-Updates |
                +-----------------------------+                                +-----------------------------+
```

---

## Step 0: 🐙 Git Commit & GitHub Push

પ્રોજેક્ટને Vercel, Render અને EAS પર ડિપ્લોય કરવા માટે કોડ GitHub પર હોવો જરૂરી છે.

### 0.1: સેક્યુરિટી ચેક (`.env` ક્યારેય પુશ ન થાય)
પ્રોજેક્ટમાં `.gitignore` ફાઇલ પહેલેથી જ સેટ કરેલી છે જે નીચેની સંવેદનશીલ ફાઇલોને આપોઆપ બ્લોક કરે છે:
- `.env`, `client/.env`, `server/.env`, `mobile/.env`
- `node_modules/`
- `local_db.json`

### 0.2: GitHub પર પુશ કરવાના કમાન્ડ્સ
તમારા ટર્મિનલમાં પ્રોજેક્ટના રૂટ ડિરેક્ટરીમાંથી રન કરો:
```bash
git add .
git commit -m "feat: complete auction ecosystem with supabase sync, full-width landing page & eas apk support"
git push origin main
```

---

## Step 1: 🗄️ Supabase Cloud Database Setup

### 1.1: Database Tables & Schema તૈયાર કરવું
1. [supabase.com](https://supabase.com) પર જાઓ અને તમારા પ્રોજેક્ટના ડેશબોર્ડમાં લોગિન કરો.
2. ડાબી બાજુના મેનુમાંથી **SQL Editor** પર ક્લિક કરો.
3. **New Query** ખોલો.
4. પ્રોજેક્ટની ફાઇલ [`supabase/supabase_schema_for_dabcricauction.sql`](../supabase/supabase_schema_for_dabcricauction.sql) નો આખો કોડ કોપી કરીને SQL Editor માં પેસ્ટ કરો.
5. **Run** બટન દબાવો. આનાથી નીચેના તમામ ટેબલ્સ અને ઇન્ડેક્સ તૈયાર થઈ જશે:
   - `tournaments` (વિથ `registration_open` toggle)
   - `teams` (કેપ્ટન ફોટો, બજેટ, પર્સ)
   - `players` (સ્ટેટ્સ, ક્રિકહીરોઝ URL, કેટેગરી, ફોટો)
   - `slots` (કસ્ટમ રાઉન્ડ્સ અને કેટેગરી પૂલ)
   - `users` (સુપર એડમિન, ઓક્શનિયર અને ટીમ ઓનર્સ લોગિન)
   - `bids` (લાઈવ બિડ ઓડિટ ટ્રેક અને હિસ્ટ્રી લેજર)
   - `transfers` (ફ્રેન્ચાઇઝ પ્લેયર ટ્રેડ્સ, ઇન્જરી રિપ્લેસમેન્ટ અને રિકવરી ઓડિટ લોગ્સ)

> [!TIP]
> જો તમારું સુપાબેઝ અગાઉથી સેટઅપ થયેલું હોય અને માત્ર નવું ટ્રાન્સફર ટેબલ ઉમેરવું હોય, તો [`supabase/migrations/003_transfers_table.sql`](../supabase/migrations/003_transfers_table.sql) રન કરી શકો છો.

### 1.2: Local Data ને Supabase માં Direct Migrate કરવું (Optional)
જો તમારી પાસે લોકલ ડેટાબેઝ (`local_db.json`) માં અગાઉથી બનાવેલા ટૂર્નામેન્ટ, પ્લેયર્સ કે ટ્રાન્સફર રેકોર્ડ્સ હોય:
```bash
cd server
node scripts/sync_transfers.js
```

---

## Step 2: ☁️ Cloudinary Setup (Image Storage)

પ્લેયર્સના ફોટો અને ટીમના લોગો માટે:
1. [cloudinary.com](https://cloudinary.com) ડેશબોર્ડમાંથી આ 3 વિગતો મેળવો:
   - **Cloud Name** (દા.ત. `dlsxkuhty`)
   - **API Key** (15 આંકડાનો ન્યુમેરિક કી)
   - **API Secret**

---

## Step 3: 🖥️ Backend Server Deployment (Render.com)

> [!IMPORTANT]
> લાઈવ ક્રિકેટ ઓક્શન માટે **Socket.io (WebSockets)** સતત કનેક્ટેડ રહેવું જરૂરી છે. તેથી બેકએન્ડને **Render.com** (અથવા Railway) પર હોસ્ટ કરવું.

### Render.com પર Deploy કરવાના સ્ટેપ્સ:
1. [render.com](https://render.com) પર જાઓ -> **New +** -> **Web Service**.
2. તમારી GitHub રિપોઝિટરી કનેક્ટ કરો.
3. નીચેની સેટિંગ્સ ભરો:
   - **Name**: `cricauction-server` (અથવા મનપસંદ નામ)
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
4. **Environment Variables** સેક્શનમાં આ કી-વેલ્યુઝ ઉમેરો:
   ```env
   PORT=5001
   CLIENT_URL=https://your-cric-auction.vercel.app
   APP_URL=https://your-cric-auction.vercel.app
   JWT_SECRET=super_secret_jwt_random_key_production_2026
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   ```
5. **Create Web Service** પર ક્લિક કરો. સર્વર લાઈવ થતાં તમને બેકએન્ડ URL મળશે (દા.ત. `https://cricauction-server.onrender.com`).

---

## Step 4: 🌐 Web Frontend Deployment (Vercel)

1. [vercel.com](https://vercel.com) પર જાઓ -> **Add New...** -> **Project**.
2. GitHub રિપોઝિટરી પસંદ કરો.
3. સેટિંગ્સમાં:
   - **Framework Preset**: Vite
   - **Root Directory**: `client` પર સેટ કરો (ક્લિક Edit -> `client` પસંદ કરો).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables** માં આ વિગતો ઉમેરો:
   ```env
   VITE_SOCKET_URL=https://cricauction-server.onrender.com
   VITE_PUBLIC_URL=https://your-cric-auction.vercel.app
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
   *(નોંધ: `VITE_SOCKET_URL` માં તમારા Render બેકએન્ડનું URL મૂકવું)*
5. **Deploy** પર ક્લિક કરો. 1-2 મિનિટમાં વેબસાઇટ લાઈવ થઈ જશે!

---

## Step 5: 📱 Mobile App (Direct APK Download via EAS Build)

મોબાઇલ એપ્લિકેશનમાંથી સીધો ઇન્સ્ટોલ થઈ શકે તેવો **Android APK** મેળવવાના સ્ટેપ્સ:

### 5.1: `mobile/.env` ફાઇલ અપડેટ કરવી
`mobile/.env` ફાઇલમાં તમારા પ્રોડક્શન URLs મૂકો:
```env
EXPO_PUBLIC_API_URL=https://cricauction-server.onrender.com
EXPO_PUBLIC_SOCKET_URL=https://cricauction-server.onrender.com
EXPO_PUBLIC_WEB_URL=https://your-cric-auction.vercel.app
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 5.2: Expo / EAS CLI માં Login કરવું
ટર્મિનલમાં `mobile` ફોલ્ડરમાં જાઓ:
```bash
cd mobile
npx eas-cli login
```
*(તમારું Expo એકાઉન્ટ Username & Password એન્ટર કરો)*

### 5.3: Expo Project Initialize કરવો
```bash
npx eas-cli project:init
```
*(આ કમાન્ડથી તમારી પ્રોજેક્ટ ID આપમેળે `app.json` માં કન્ફિગર થઈ જશે)*

### 5.4: Standalone Android APK Generate કરવું
[`mobile/eas.json`](../mobile/eas.json) માં `preview` પ્રોફાઇલ માટે `buildType: "apk"` પહેલેથી જ સેટ છે.  
હવે ફક્ત નીચેનો કમાન્ડ રન કરો:
```bash
npx eas-cli build -p android --profile preview
```
1. ટર્મિનલમાં તમને પૂછશે: `Generate a new Android Keystore?` &rarr; પ્રેસ `Yes` (`Y`).
2. EAS Cloud પર બિલ્ડ પ્રોસેસ શરૂ થશે (આમાં લગભગ 5 થી 10 મિનિટ લાગે છે).
3. બિલ્ડ પૂર્ણ થતાં જ ટર્મિનલમાં:
   - **Direct APK Download URL** મળશે (દા.ત. `https://expo.dev/artifacts/eas/...apk`)
   - **QR Code** જોવા મળશે જે તમારા ફોનથી સ્કેન કરતાં સીધો `.apk` ડાઉનલોડ થઈ જશે!

### 5.5: ભવિષ્યમાં Instant Over-The-Air (OTA) Updates
જ્યારે પણ તમારે કોડ કે UI માં નવો ફેરફાર કરવો હોય ત્યારે ફરીથી APK બનાવવાની જરૂર નથી:
```bash
cd mobile
npx eas-cli update --branch preview --environment preview --message "Bug fixes and improvements"
```
બધા યુઝર્સના ફોનમાં એપ ખોલતાં જ નવો કોડ ઓટોમેટિક અપડેટ થઈ જશે!

---

## 🏁 ચેકલિસ્ટ
- [x] GitHub Repo Updated
- [x] Supabase SQL Schema Ran (`tournaments`, `teams`, `players`, `slots`, `users`, `bids`)
- [x] Render Web Service Live (WebSockets Active)
- [x] Vercel Web Portal Live
- [x] Android APK Built & Downloadable via EAS
