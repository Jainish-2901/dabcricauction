import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowLeft, Shield, User, LogIn, Trophy, Eye, EyeOff, AlertCircle, Sparkles, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setErrorMsg('');

        if (!username.trim() || !password.trim()) {
            setErrorMsg('Please enter both username and password.');
            return;
        }

        setLoading(true);

        try {
            const response = await apiFetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    password: password.trim()
                })
            });

            const data = await response.json();

            if (response.ok) {
                login(data.user, data.token);
                if (data.user.role === 'superadmin') navigate('/admin');
                else if (data.user.role === 'team_owner') navigate('/owner/dashboard');
                else if (data.user.role === 'auctioneer') navigate('/auctioneer/dashboard');
                else navigate('/');
            } else {
                setErrorMsg(data.message || 'Invalid username or password.');
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('Unable to connect to backend server. Please verify your Render server is live and VITE_API_URL / VITE_SOCKET_URL is set in Vercel settings.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 relative font-sans selection:bg-blue-500/20">
            {/* Top Navigation */}
            <div className="absolute top-6 left-6 flex items-center gap-4">
                <Link 
                    to="/" 
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
                </Link>
            </div>

            <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden my-auto">
                {/* Accent Top Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

                {/* Header Icon & Brand */}
                <div className="text-center mb-6">
                    <img 
                        src="/logo.png" 
                        alt="Dab Cric Auction" 
                        className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-md shadow-slate-200 object-contain bg-white border border-slate-200 p-1" 
                    />
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-2">
                        Executive Sports Portal
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        Dab Cric Auction
                    </h1>
                    <p className="text-slate-500 text-xs font-medium mt-1">
                        Sign in as Tournament Host, Team Owner, or Auctioneer
                    </p>
                </div>

                {errorMsg && (
                    <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                            Username
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => { setUsername(e.target.value); if (errorMsg) setErrorMsg(''); }}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                                Password
                            </label>
                            <Link 
                                to="/forgot-password" 
                                className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors"
                            >
                                Forgot Password?
                            </Link>
                        </div>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => { setPassword(e.target.value); if (errorMsg) setErrorMsg(''); }}
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 p-0.5"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-sm shadow-blue-600/30 transition-all mt-6 active:scale-98 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span>Signing In...</span>
                        ) : (
                            <>
                                <LogIn className="w-4 h-4" />
                                <span>Sign In to Platform</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Role Guidance Card */}
                <div className="mt-6 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                    <div className="flex items-start gap-2 text-xs">
                        <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="text-slate-600">
                            <strong className="text-slate-900">Tournament Organizers:</strong> Sign in with your registered account to manage auctions.
                        </span>
                    </div>
                    <div className="flex items-start gap-2 text-xs border-t border-slate-200/60 pt-2">
                        <Key className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span className="text-slate-600">
                            <strong className="text-slate-900">Team Owners & Auctioneers:</strong> Sign in with the credentials set by your tournament organizer.
                        </span>
                    </div>
                </div>

                {/* Register Link */}
                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                        Want to organize a cricket auction?{' '}
                        <Link to="/register" className="text-blue-600 hover:text-blue-800 font-extrabold">
                            Register as Host →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
