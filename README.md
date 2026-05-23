# Cricket Auction Pro

A professional MERN stack application for managing cricket tournament auctions.

## Features
- **Super Admin Panel**: Manage multiple tournaments and users.
- **Owner Dashboard**: Real-time bidding interface for team owners.
- **Public Auction View**: Live tracking of auctions for the public (no login required).
- **Professional UI**: Dark themed, responsive, and animated using Tailwind CSS and Framer Motion.

## Setup

### Server
The backend runs on port 5000.
```bash
cd server
npm install
# Ensure you have MongoDB running locally or update .env
npm start
```

### Client
The frontend runs on port 5173.
```bash
cd client
npm install
npm run dev
```

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Framer Motion, Lucide React
- **Backend**: Node.js, Express, MongoDB, Socket.io
- **Auth**: JWT (Skeleton)
