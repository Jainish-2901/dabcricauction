import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import PublicAuctionView from './pages/PublicAuctionView';
import AdminAuctionConsole from './pages/AdminAuctionConsole';
import AuctioneerDashboard from './pages/AuctioneerDashboard';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/admin" element={
              <ProtectedRoute role="superadmin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />

            <Route path="/auctioneer/dashboard" element={
              <ProtectedRoute role="auctioneer">
                <AuctioneerDashboard />
              </ProtectedRoute>
            } />

            <Route path="/admin/console/:tournamentId" element={
              <ProtectedRoute role={['superadmin', 'auctioneer']}>
                <AdminAuctionConsole />
              </ProtectedRoute>
            } />

            <Route path="/owner/dashboard" element={
              <ProtectedRoute role="team_owner">
                <OwnerDashboard />
              </ProtectedRoute>
            } />

            <Route path="/auction/:tournamentId" element={<PublicAuctionView />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
