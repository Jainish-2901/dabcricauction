# 🌐 Dab Cric Auction - Web Client

The web portal for **Dab Cric Auction**, built with **React**, **Vite**, and **Tailwind CSS**.

---

## 🎯 Portals Included

1. **Super Admin Dashboard**: Multi-tournament creation, team roster, player catalog with 1:1 image cropping, category/slot queues, and user credential management.
2. **Auctioneer Master Console**: Live bidding controller with pause/resume, countdown timers, force-sell, unsold queuing, and rollback capabilities.
3. **Owner Bidding Dashboard**: Interactive web room for team owners to place bids.
4. **Public Spectator View**: Projector/TV-ready broadcast view displaying live auction progress, player cards, and team budgets.
5. **Player Self-Registration Page**: Open registration form for tournament applicants.

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
