import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, Shield, ArrowLeft, Lock, User, Building, Phone, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

const RegisterPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        organizationName: '',
        phone: '',
        username: '',
        password: '',
        confirmPassword: ''
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errorMsg) setErrorMsg('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!formData.username.trim() || !formData.password.trim()) {
            setErrorMsg('Username and Password are required.');
            return;
        }

        if (formData.password.length < 4) {
            setErrorMsg('Password should be at least 4 characters long.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setErrorMsg('Passwords do not match. Please verify.');
            return;
        }

        setLoading(true);

        try {
            const response = await apiFetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    organizationName: formData.organizationName.trim(),
                    phone: formData.phone.trim(),
                    username: formData.username.trim(),
                    password: formData.password.trim(),
                    role: 'superadmin'
                })
            });

            const data = await response.json();

            if (response.ok) {
                login(data.user, data.token);
                navigate('/admin');
            } else {
                setErrorMsg(data.message || 'Registration failed. Please try a different username.');
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('Unable to connect to server. Please ensure server is running on port 5001.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 py-8 relative font-sans selection:bg-blue-500/20">
            {/* Top Navigation */}
            <div className="absolute top-6 left-6 flex items-center gap-3">
                <Link 
                    to="/" 
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
                </Link>
            </div>

            <div className="max-w-lg w-full bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden my-auto">
                {/* Accent Top Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

                {/* Header */}
                <div className="text-center mb-6">
                    <img
                        src="/logo.png"
                        alt="Dab Cric Auction"
                        className="w-16 h-16 rounded-2xl mx-auto mb-3 shadow-md shadow-slate-200 object-contain bg-white border border-slate-200 p-1"
                    />
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-[11px] font-extrabold uppercase tracking-wider mb-2">
                        <Shield className="w-3 h-3 text-blue-600" /> Dab Cric Auction Organizer
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        Create Organizer Account
                    </h1>
                    <p className="text-slate-500 text-xs font-medium mt-1">
                        Register to host live cricket auctions, manage teams, slots, and auctioneers.
                    </p>
                </div>

                {/* Organizer Role Callout */}
                <div className="mb-6 p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-blue-900 leading-relaxed font-semibold">
                        <strong>Public registration is for Tournament Hosts only.</strong> Team Owners & Auctioneers do not need to register here; their credentials are generated directly inside your tournament console.
                    </p>
                </div>

                {errorMsg && (
                    <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Organization / League Name */}
                    <div>
                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                            Organization / League Name
                        </label>
                        <div className="relative">
                            <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                placeholder="e.g. Gujarat Premier Cricket Association"
                                value={formData.organizationName}
                                onChange={(e) => handleChange('organizationName', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Organizer Full Name & Mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                Organizer Full Name
                            </label>
                            <div className="relative">
                                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                    placeholder="e.g. Ramesh Patel"
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                Mobile / WhatsApp
                            </label>
                            <div className="relative">
                                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                    placeholder="e.g. 9876543210"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Admin Username */}
                    <div>
                        <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                            Choose Admin Username *
                        </label>
                        <div className="relative">
                            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                placeholder="e.g. gpl_admin"
                                value={formData.username}
                                onChange={(e) => handleChange('username', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Passwords */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                Password *
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
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

                        <div>
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                Confirm Password *
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-sm shadow-blue-600/30 transition-all mt-6 active:scale-98 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <span>Creating Organizer Account...</span>
                        ) : (
                            <>
                                <Shield className="w-4 h-4" />
                                <span>Register as Tournament Host</span>
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                        Already have an Organizer or Team account?{' '}
                        <Link to="/login" className="text-blue-600 hover:text-blue-800 font-extrabold">
                            Sign In here →
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;

