# 🏏 Dab Cric Auction Pro

> **Enterprise-Grade Live Cricket Auction Platform**  
> Multi-tenant tournament management with real-time WebSocket bidding, Supabase Cloud synchronization, Cloudinary CDN asset pipelines, React Web management hub, and React Native Expo mobile application with EAS Over-The-Air updates and standalone APK builds.

---

## 🌟 Architecture & Tech Stack

| Layer | Technology | Hosting / Provider |
| :--- | :--- | :--- |
| **Web Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion | [Vercel](https://vercel.com) |
| **Mobile App** | React Native, Expo SDK 58, EAS Update (`expo-updates`), EAS Build | Expo Application Services (EAS) |
| **Backend API** | Node.js, Express, Socket.io (WebSockets) | [Render](https://render.com) / [Railway](https://railway.app) |
| **Database** | PostgreSQL, Realtime Sync, ACID Transactions, RLS Policies | [Supabase](https://supabase.com) |
| **Asset CDN** | 1:1 Aspect Cropper, Fast Cloud Delivery | [Cloudinary](https://cloudinary.com) |

---

## 🚀 Key Features

- **🏆 Multi-Tenant Tournament Hub**: Scope players, teams, slots, budgets, and logins cleanly per tournament.
- **👑 Direct Owner & Captain Integration**: Team owners are automatically linked as team captains with dedicated profiles, photos, and base price adjustments.
- **⚡ Real-Time Live Bidding Engine**: Sub-millisecond WebSocket auctions with instant leader updates, timer sync, and dynamic bid increments (+500, +1K, +5K).
- **🎛️ Master Auctioneer Console**: Gavel controls, force-sell, unsold queuing, pause/resume, audio gavel effects, and zero-loss undo & rollback capabilities.
- **🔄 Franchise Player Trades & Swaps**: Post-auction player trading with dynamic price differential calculation and automated team purse re-balancing across Web and Mobile.
- **🚑 Injury Replacement & Recovery Window**: Dedicated injury replacement system with automatic purse adjustment (refund injured player's price, debit replacement player's fee) and 1-click recovery back to the unsold pool.
- **🖼️ Interactive Fullscreen Previews**: 1-click modal preview for all player photos and team logos with Android status-bar safe offset in `SafeImage`.
- **📜 Live Bid & Transfer Audit Ledger**: Real-time bid logs (`bids` table) and complete trade/injury audit history (`transfers` table) with instant Supabase persistence.
- **🔒 Player Self-Registration with Open/Close Switch**: Public player nomination portal with 1-click organizer toggle to open or close submissions.
- **✂️ 1:1 Image Crop & Upload**: Built-in interactive cropper for team logos and captain portraits with automatic Cloudinary storage.
- **📲 Standalone Android APK & EAS OTA Updates**: Downloadable `.apk` builds via EAS Build plus instant over-the-air code pushes without reinstalling.
- **📊 Public Spectator View & Slots Explorer**: Live audience broadcast screen with current player stats, live bid stream, sold boards, and interactive Slots / Sets explorer with active slot tracking.
- **🎯 Clean In-Card Auction Status Messages**: Unified status cards for Completed, Standby/Not Started, Short Break, and Paused by Auctioneer embedded directly inside the main auction stage card.
- **✨ Executive Full-Width Landing Page**: Complete service showcase and developer contact hub crafted for community cricket leagues.

---

## 📁 Repository Structure

```
CricAuction/
├── client/          # React + Vite Web Portal (SuperAdmin, Auctioneer, Spectator, Landing)
├── mobile/          # React Native Expo Mobile App (Team Owners Keypad & Live Bidding)
├── server/          # Node.js + Express + Socket.io Real-time API
├── supabase/        # PostgreSQL SQL Schema (`supabase_schema_for_dabcricauction.sql`)
└── docs/            # Master Production Deployment Guide
```

---

## 🛠️ Quick Start (Local Development)

### 1. Server Setup
```bash
cd server
npm install
npm run dev
```

### 2. Web Client Setup
```bash
cd client
npm install
npm run dev
# Open http://localhost:5173
```

### 3. Mobile App Setup (Expo Go)
```bash
cd mobile
npm install
npx expo start --go --tunnel
```

---

## 🌐 Production Deployment Guide

For full step-by-step instructions on deploying the Web Portal on **Vercel**, the Mobile App via **Expo EAS (Direct APK Download)**, the Backend on **Render**, and the Database on **Supabase**, please check:

👉 **[Master Production Deployment Guide](docs/DEPLOYMENT_GUIDE.md)**

---

## 👨‍💻 Developer & Credits

Designed & Crafted by **Jainish Dabgar**  
*Full-Stack Developer & UI/UX Designer*  
- 📞 Phone: [+91 97732 72749](tel:+919773272749)  
- 🌐 Portfolio: [jainishdabgar.vercel.app](https://jainishdabgar.vercel.app/)  
- 💼 LinkedIn: [Jainish Dabgar](https://www.linkedin.com/in/jainish-dabgar-87474a320/)  
- 🐙 GitHub: [@Jainish-2901](https://github.com/Jainish-2901)  
- 📸 Instagram: [@dabgar_jainish_2901](https://www.instagram.com/dabgar_jainish_2901/)  
- ✉️ Email: [jainishdabgar2901@gmail.com](mailto:jainishdabgar2901@gmail.com)  

---

## 📄 License
ISC
