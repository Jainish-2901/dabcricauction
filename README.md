# 🏏 Dab Cric Auction Pro

> **Enterprise-Grade Live Cricket Auction Cloud Platform**  
> Multi-tenant tournament management with sub-second WebSocket bidding, Supabase Cloud real-time synchronization, Cloudinary CDN asset pipelines, React Web management hub, and React Native Expo mobile application with EAS Over-The-Air updates and standalone Android APK builds.

---

## 🌟 Architecture & Tech Stack

| Layer | Technology | Hosting / Provider |
| :--- | :--- | :--- |
| **Web Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion | [Vercel](https://vercel.com) |
| **Mobile App** | React Native, Expo SDK 58, EAS Update (`expo-updates`), EAS Standalone Build | Expo Application Services (EAS) |
| **Backend API** | Node.js, Express, Socket.io (WebSockets) | [Render](https://render.com) / [Railway](https://railway.app) |
| **Database** | PostgreSQL, Realtime Sync, ACID Transactions, RLS Policies | [Supabase](https://supabase.com) |
| **Asset CDN** | 1:1 Aspect Cropper, Fast Cloud Delivery | [Cloudinary](https://cloudinary.com) |

---

## 🚀 Key Features

### 🏆 Tournament & Budget Management
- **Multi-Tenant Organizer Workspaces & Isolation**:
  - Each organizer account (e.g. `@jainish_dabgar`, `@dcb_auction_admin`) has a completely isolated workspace. Tournaments, teams, players, and live auctions belong strictly to their creator, preserved permanently across server hydration and cold boots with metadata tags `[CREATOR:<userId>]`.
  - Dedicated **Organizer Profile & Security Management** (`/profile`) allowing live updates to organization names, display profiles, contact numbers, and password resets.
- **Dual Currency & Budget Scales**:
  - **Lakhs to Crores (`L_TO_CR`)**: Designed for mega IPL-scale tournaments with purse in Crores (`Cr`) and increments in Lakhs (`L`). Unit selectors strictly show `['L', 'Cr']`.
  - **Thousands to Lakhs (`K_TO_L`)**: Designed for local club, box cricket, and village/corporate tournaments with purse in Lakhs (`L`) and increments in Thousands (`K`). Unit selectors strictly show `['K', 'L']`.
- **Dynamic Multi-Unit Formatting (`K`, `L`, `Cr`)**: Seamless automatic conversion across all tables, rosters, and cards (e.g. 100K displays as ₹1 L; 700L in `L_TO_CR` displays as ₹7 Cr; Lakhs and Crores automatically scaled with zero truncation or rounding confusion).
- **Dynamic Bid Increment Slabs**: Per-slab `from`, `to`, `increment`, and independent unit selection pills (`K`, `L`, `Cr`). Supports adding, removing, and reordering slabs with seamless parity between Web and Mobile.
- **Tournament Logo Full CRUD & Lightbox**: Upload, 1:1 square crop, view, change, and remove tournament logos at creation and edit time. Click-to-open high-resolution lightbox modal preview across tournament cards, modals, and hub.
- **Interactive Date & Time Pickers**: Native-feeling date pickers and time pickers on both Web (`WebDatePickerModal`, `WebTimePickerModal`) and Mobile (`DatePickerModal`, `TimePickerModal`) for tournament scheduling.
- **Bulk CSV Player Import**: Intelligent CSV ingestion with auto-mapped columns, category normalization, and configurable base prices (defaulting cleanly to `0` when empty).

### ⚡ Live Auction Engine & Gavel Controls
- **Real-Time Live Bidding Engine**: Sub-100ms WebSocket auctions with instant leader updates, timer sync, and dynamic bid increments.
- **Master Auctioneer Console**: Gavel controls, force-sell, unsold queuing, pause/resume, audio gavel effects, and zero-loss undo & rollback capabilities.
- **Step-by-Step Erase Last Bid (Undo Recent Bid)**: If a bid is misclicked or accidentally placed, the auctioneer can erase only the single most recent bid from the round's bidding history (e.g., 20k → 50k → 70k → 90k, clicking undo erases only 90k back to 70k) rather than wiping out the entire round.
- **Zero-Loss Undo & Rollback Engine**:
  - Reverts misclicked or invalid bids to previous bidder and amount.
  - Rollback completed sales: refunds team purse in Postgres, removes player from winning roster, restores player to active bidding, and alerts all rooms.
- **Direct Owner & Captain Priority Integration**: Team captains and direct owner-captains are always pinned at the top (#1) of acquired squad lists with crown emblems, with their retention fees correctly computed in team spent and remaining purse calculations.

### 🔄 Squad & Pool Lifecycle Management
- **1-Click "To Unsold" Squad Release**: Admins and auctioneers can release any acquired player from a team directly back to the Unsold Pool without requiring a player exchange; the team's purse is refunded instantly in real time.
- **Direct Manual Player Assignment & Sale**: SuperAdmins can directly sell/assign any player from either the Unsold Pool or Pending Pool to any franchise at a custom agreed price, automatically updating purses, team rosters, and Supabase sync.
- **Dedicated Pending Players Pool & Live Status Filter Pills**: Prominent dedicated pool view in SuperAdmin (Web & Mobile) for all players awaiting auction, complete with quick status filter pills showing live player counts (`ALL`, `Pending`, `Sold`, `Unsold`, `Injured`).
- **Franchise Player Trades & Swaps**: Post-auction player trading with dynamic price differential calculation and automated team purse re-balancing across Web and Mobile.
- **Injury Replacement & Recovery Window**: Dedicated injury replacement system with automatic purse adjustment (refund injured player's price, debit replacement player's fee) and 1-click recovery back to the unsold pool.
- **Live Bid & Transfer Audit Ledger**: Real-time bid logs (`bids` table) and complete trade/injury audit history (`transfers` table) with instant Supabase persistence.

### 📱 Android Mobile App & Cross-Platform Parity
- **100% Full Access on Both Platforms (Web & Mobile)**: All roles (SuperAdmin, Auctioneer, Team Owner, Spectator) have full feature parity across both Desktop Web and Android Mobile App. Use any device, or mix them simultaneously for the same tournament (e.g. Auctioneer on laptop, Owners on mobile). Good internet speed (Wi-Fi or 4G/5G) is recommended for seamless real-time sub-second synchronization.
- **Standalone Android APK (v1.4.0)**:
  - Download Link: [Download dab-cric-auction-v1.4.0.apk](https://github.com/Jainish-2901/dabcricauction/releases/download/v1.4.0/dab-cric-auction-v1.4.0.apk)
  - Standalone build for Android smartphones (Android 8.0+).
  - 100ms quick bids, live purse counter, 1:1 camera crop for player/team photos.
- **Interactive Fullscreen Previews (`SafeImage`)**: 1-click modal preview for all player photos, team logos, and tournament badges with Android status-bar safe offset.
- **Public Spectator View & Slots Explorer**: Live audience broadcast screen (`/auction/:tournamentId`) with current player stats, live bid stream, sold boards, and interactive Slots / Sets explorer.

### 🌐 Public Web Routes
- **`/`**: Executive Landing Page with live auction spectator joiner, cross-platform overview, Android APK download showcase, and developer contact.
- **`/about`**: Mission, technical architecture, feature breakdown, developer spotlight, and 1-click photo lightboxes.
- **`/download`**: Dedicated Android APK download page with step-by-step 4-step installation guide.
- **`/terms`**: Complete Terms and Conditions for tournament organizers and franchise owners.
- **`/privacy`**: Comprehensive Privacy Policy detailing Supabase PostgreSQL data protection, Cloudinary asset storage, and user rights.
- **`/404` (or any invalid route `*`)**: Cricket-themed "Clean Bowled! Page Not Found" error page with quick links to Home, Download, About, and Sign In.

---

## 📁 Repository Structure

```
CricAuction/
├── client/          # React 18 + Vite Web Portal
│   ├── src/
│   │   ├── components/    # Reusable modals, headers, footers, SafeImage, cropper
│   │   ├── pages/         # Landing, About, Download, Terms, Privacy, Console, SuperAdmin
│   │   └── utils/         # Currency, slab converters, auth context
├── mobile/          # React Native Expo SDK 58 Mobile App
│   ├── components/  # SuperAdmin, AdminConsole, LiveBiddingRoom, Hub, Modals
│   ├── lib/         # Supabase service, API client, currency logic
│   └── app.json     # Expo & EAS configuration (package: com.dabcricauction.app)
├── server/          # Node.js + Express + Socket.io Real-time API
│   ├── controllers/ # Tournament, team, player, bid, transfer controllers
│   ├── services/    # Hybrid JSON DB + Supabase bidirectional sync service
│   └── routes/      # Express REST API endpoints
├── supabase/        # PostgreSQL SQL Schema (`supabase_schema_for_dabcricauction.sql`)
└── docs/            # Master Production Architecture & Deployment Guides
```

---

## 🛠️ Quick Start (Local Development)

### 1. Server Setup
```bash
cd server
npm install
npm run dev
# Server runs on http://localhost:5000
```

### 2. Web Client Setup
```bash
cd client
npm install
npm run dev
# Open http://localhost:5173
```

### 3. Mobile App Setup (Expo Go / EAS)
```bash
cd mobile
npm install
npx expo start --go --tunnel
```

---

## 📲 Android Mobile App (APK Download)

The native mobile app is compiled as a standalone Universal Android APK:

- **Direct Download**: [dab-cric-auction-v1.4.0.apk](https://github.com/Jainish-2901/dabcricauction/releases/download/v1.4.0/dab-cric-auction-v1.4.0.apk)
- **Compatibility**: Android 8.0 (Oreo) through Android 15
- **Architecture**: Universal (`arm64-v8a`, `armeabi-v7a`)
- **Web Download Page**: Visit [`/download`](http://localhost:5173/download) for a full step-by-step installation guide.

*Note for iOS Users: Apple iPhone / iPad users can open the responsive Web App directly in Safari or Chrome without installing an APK.*

---

## 👨‍💻 Developer & Credits

Designed, Architected & Engineered by **Jainish Dabgar**  
*Full-Stack Engineer & UI/UX Designer*  

- 📞 Phone: [+91 97732 72749](tel:+919773272749)  
- 🌐 Portfolio: [jainishdabgar.vercel.app](https://jainishdabgar.vercel.app/)  
- 💼 LinkedIn: [Jainish Dabgar](https://www.linkedin.com/in/jainish-dabgar-87474a320/)  
- 🐙 GitHub: [@Jainish-2901](https://github.com/Jainish-2901)  
- 📸 Instagram: [@dabgar_jainish_2901](https://www.instagram.com/dabgar_jainish_2901/)  
- ✉️ Email: [jainishdabgar2901@gmail.com](mailto:jainishdabgar2901@gmail.com)  

---

## 📄 License
ISC License • Dab Cric Auction Pro © 2026
