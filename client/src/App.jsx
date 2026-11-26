import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import PublicAuctionView from './pages/PublicAuctionView';
import AdminAuctionConsole from './pages/AdminAuctionConsole';
import AuctioneerDashboard from './pages/AuctioneerDashboard';
import PlayerRegistrationPage from './pages/PlayerRegistrationPage';
import AboutPage from './pages/AboutPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import DownloadPage from './pages/DownloadPage';
import ProfilePage from './pages/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ToastContainer from './components/ToastContainer';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/20 antialiased">
          <ToastContainer />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/download" element={<DownloadPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/signup" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            <Route path="/profile" element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } />

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
            <Route path="/spectator/:tournamentId" element={<PublicAuctionView />} />
            <Route path="/register-player/:tournamentId" element={<PlayerRegistrationPage />} />
            <Route path="/player-form/:tournamentId" element={<PlayerRegistrationPage />} />

            {/* 404 Page Not Found Routes */}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
