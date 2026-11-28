# 🌐 Dab Cric Auction - Web Client

The responsive web application for **Dab Cric Auction**, built with **React 18**, **Vite**, and **Tailwind CSS**.

---

## 🎯 Portals & Pages Included

1. **Executive Landing Page (`/`)**: Service showcase, live auction room joiner, cross-platform capabilities, Android APK download card, and developer contact.
2. **About Us (`/about`)**: Architecture blueprint, mission, technology overview, feature catalog, and developer profile.
3. **Download Android App (`/download`)**: Dedicated APK download portal with universal Android APK release (v1.4.0) and step-by-step installation instructions.
4. **Terms & Conditions (`/terms`)**: Platform agreement, auctioneer authority, purse policies, and intellectual property.
5. **Privacy Policy (`/privacy`)**: Supabase PostgreSQL data security, Cloudinary CDN asset protection, and minimal permission models.
6. **Super Admin Dashboard (`/admin`)**: Multi-tournament creation (dual scales: L→Cr and K→L), dynamic bid increment slab manager, tournament logo CRUD with 1:1 cropper and click-to-open lightbox, dedicated Pending Players Pool, quick status filter pills (ALL, Pending, Sold, Unsold, Injured) with live counts, 1-click squad player release to Unsold pool with purse refund, direct manual player sale/assignment to any team, team purse allocation, player catalog, franchise trades, and injury replacement engine.
7. **Auctioneer Master Console (`/admin/console/:tournamentId`)**: Live bidding gavel controller with countdown timers, dynamic bid increment slabs, step-by-step Erase Last Bid (Undo Recent Bid), force-sell, unsold queuing, audio effects, squad release to Unsold pool, and zero-loss undo & rollback capabilities.
8. **Owner Bidding Dashboard (`/owner/dashboard`)**: Interactive web bidding room for franchise owners, live purse balance, dynamic K/L/Cr unit formatting, priority captain squad display with retention fee deduction, and live outbid notices.
9. **Public Spectator View (`/auction/:tournamentId`)**: TV/Projector-ready live audience broadcast view displaying real-time bids, sold players, remaining budgets, and interactive slots/sets explorer.
10. **Player Self-Registration (`/register-player/:tournamentId`)**: Public player nomination portal with 1:1 image cropping and category selection.
11. **Page Not Found (`/404` and `*`)**: Cricket-themed "Clean Bowled! Page Not Found" error page with fast redirection back to Home, Download, About, or Sign In.

---

## 🎨 UI & Layout System Highlights
- **Unified Public Navigation (`PublicHeader.jsx` & `PublicFooter.jsx`)**: Consistent branding, real-time active tab pill highlights, developer photo with 1-click full-screen lightbox, and responsive mobile hamburger drawer.
- **High-Contrast Dark Typography**: All paragraphs and tables use crisp, deep black fonts (`text-slate-900` / `text-slate-950 font-bold`) ensuring effortless readability without pale reflection glare.
- **Interactive Lightboxes (`SafeImage`)**: Click-to-open fullscreen modal inspection on tournament logos, team emblems, player photos, and developer portraits.
- **Interactive Date & Time Pickers (`DateTimePickerModal.jsx`)**: Visual calendar and clock selector for setting auction start dates and times cleanly.

---

## 🚀 Local Development

```bash
cd client
npm install
npm run dev
```

Runs the development server on `http://localhost:5173`.

---

## 🚢 Vercel Production Deployment

1. Set **Root Directory** to `client` in the Vercel project dashboard.
2. Ensure the build configuration is:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add the following **Environment Variables**:
   ```env
   VITE_SOCKET_URL=https://your-server-api.onrender.com
   VITE_PUBLIC_URL=https://your-domain.vercel.app
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
4. Deploy!
