import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Trophy, KeyRound, ArrowLeft, Lock, User, Phone, Eye, EyeOff, CheckCircle2, AlertCircle, Shield, Sparkles } from 'lucide-react';
import { apiFetch } from '../lib/api';

const ForgotPasswordPage = () => {
    const navigate = useNavigate();

    const [step, setStep] = useState(1); // 1: identify, 2: reset, 3: success
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [accountInfo, setAccountInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Step 1: Verify username exists
    const handleVerifyUsername = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!username.trim()) {
            setErrorMsg('Please enter your username.');
            return;
        }

        setLoading(true);

        try {
            const res = await apiFetch('/api/auth/check-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim() })
            });

            const data = await res.json();

            if (res.ok && data.exists) {
                setAccountInfo(data);
                setStep(2);
            } else {
                setErrorMsg(data.message || 'No account found with this username.');
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('Unable to connect to server. Please ensure server is running.');
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Reset password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!newPassword.trim()) {
            setErrorMsg('Please enter a new password.');
            return;
        }

        if (newPassword.trim().length < 4) {
            setErrorMsg('Password should be at least 4 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMsg('Passwords do not match. Please verify.');
            return;
        }

        if (accountInfo?.hasPhone && !phone.trim()) {
            setErrorMsg('Please enter your registered mobile number for verification.');
            return;
        }

        setLoading(true);

        try {
            const res = await apiFetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    phone: phone.trim(),
                    newPassword: newPassword.trim()
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setStep(3);
            } else {
                setErrorMsg(data.message || 'Password reset failed. Please verify your details.');
            }
        } catch (err) {
            console.error(err);
            setErrorMsg('Unable to connect to server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 relative font-sans selection:bg-blue-500/20">
            {/* Top Navigation */}
            <div className="absolute top-6 left-6 flex items-center gap-4">
                <Link 
                    to="/login" 
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
                >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
            </div>

            <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl shadow-slate-200/50 relative overflow-hidden my-auto">
                {/* Accent Top Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />

                {/* Header Icon */}
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-orange-500/25 text-white">
                        <KeyRound className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        Password Retrieval
                    </h1>
                    <p className="text-slate-500 text-xs font-medium mt-1">
                        {step === 1 ? 'Find and verify your auction account' :
                         step === 2 ? 'Create a new secure password' :
                         'Password successfully updated!'}
                    </p>
                </div>

                {errorMsg && (
                    <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* STEP 1: IDENTIFY USERNAME */}
                {step === 1 && (
                    <form onSubmit={handleVerifyUsername} className="space-y-4">
                        <div>
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                Enter Your Username
                            </label>
                            <div className="relative">
                                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                    placeholder="e.g. gpl_admin or owner_rcb"
                                    value={username}
                                    onChange={(e) => { setUsername(e.target.value); if (errorMsg) setErrorMsg(''); }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-sm shadow-blue-600/30 transition-all mt-4 active:scale-98 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                        >
                            {loading ? <span>Searching Account...</span> : <span>Verify Account →</span>}
                        </button>
                    </form>
                )}

                {/* STEP 2: VERIFY AND SET NEW PASSWORD */}
                {step === 2 && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        {/* Account Found Badge */}
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <span className="font-extrabold text-emerald-900 block">
                                    Account Verified: @{accountInfo?.username}
                                </span>
                                <span className="text-emerald-700 font-medium">
                                    Role: <strong className="uppercase">{accountInfo?.role === 'superadmin' ? 'Tournament Host' : accountInfo?.role?.replace('_', ' ')}</strong>
                                    {accountInfo?.phoneHint ? ` • Mobile ending in ${accountInfo.phoneHint}` : ''}
                                </span>
                            </div>
                        </div>

                        {/* If Phone Verification Required */}
                        {accountInfo?.hasPhone && (
                            <div>
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Registered Mobile Number (Verification)
                                </label>
                                <div className="relative">
                                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                        placeholder="Enter your 10-digit mobile number"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* New Password */}
                        <div>
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                New Password *
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
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

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                Confirm New Password *
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-semibold"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold shadow-sm transition-all text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                {loading ? 'Updating Password...' : 'Save New Password'}
                            </button>
                        </div>
                    </form>
                )}

                {/* STEP 3: SUCCESS STATE */}
                {step === 3 && (
                    <div className="text-center py-4 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900">Password Reset Complete!</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                                Your account password has been updated securely. You can now sign in with your new credentials.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow-sm text-sm transition-all"
                        >
                            Sign In Now →
                        </button>
                    </div>
                )}

                {/* Footer Link */}
                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                        Remember your password?{' '}
                        <Link to="/login" className="text-blue-600 hover:text-blue-800 font-extrabold">
                            Sign In here
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;

