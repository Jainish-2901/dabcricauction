import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
    User, Building, Phone, Lock, Eye, EyeOff, Save, KeyRound, 
    ArrowLeft, Shield, CheckCircle2, AlertCircle, Sparkles, Trophy
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import toast from '../lib/toast';

const ProfilePage = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();

    // Profile Info State
    const [name, setName] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [phone, setPhone] = useState('');
    const [username, setUsername] = useState('');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPass, setShowCurrentPass] = useState(false);
    const [showNewPass, setShowNewPass] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // Active Section tab
    const [activeSection, setActiveSection] = useState('profile'); // 'profile' | 'security'

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setOrganizationName(user.organizationName || '');
            setPhone(user.phone || '');
            setUsername(user.username || '');
        }
    }, [user]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!user) return;

        setIsSavingProfile(true);
        try {
            const res = await apiFetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user._id || user.id,
                    name: name.trim(),
                    organizationName: organizationName.trim(),
                    phone: phone.trim(),
                    username: username.trim()
                })
            });

            const data = await res.json();
            if (res.ok) {
                if (data.user) {
                    updateUser(data.user);
                } else {
                    updateUser({ name: name.trim(), organizationName: organizationName.trim(), phone: phone.trim(), username: username.trim() });
                }
                toast.success('Profile details updated successfully!');
            } else {
                toast.error(data.message || 'Failed to update profile.');
            }
        } catch (err) {
            console.error('Update profile error:', err);
            toast.error('Network error while updating profile.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        if (!user) return;

        if (!currentPassword) {
            toast.error('Please enter your current password.');
            return;
        }

        if (!newPassword || newPassword.length < 4) {
            toast.error('New password must be at least 4 characters long.');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('New password and confirm password do not match.');
            return;
        }

        setIsUpdatingPassword(true);
        try {
            const res = await apiFetch('/api/auth/change-password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user._id || user.id,
                    currentPassword: currentPassword.trim(),
                    newPassword: newPassword.trim()
                })
            });

            const data = await res.json();
            if (res.ok) {
                toast.success('Password changed successfully!');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                toast.error(data.message || 'Failed to update password.');
            }
        } catch (err) {
            console.error('Change password error:', err);
            toast.error('Network error while updating password.');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Top Nav Header */}
                <div className="flex items-center justify-between mb-8">
                    <button
                        onClick={() => navigate(user?.role === 'superadmin' ? '/admin' : -1)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200/90 rounded-2xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:border-slate-300 shadow-xs transition-all cursor-pointer"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-full text-xs font-extrabold flex items-center gap-1.5 uppercase tracking-wider">
                            <Shield className="w-3.5 h-3.5" />
                            {user?.role === 'superadmin' ? 'Organizer Account' : (user?.role?.replace('_', ' ') || 'User')}
                        </span>
                    </div>
                </div>

                {/* Profile Banner Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs mb-8 relative">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 rounded-t-3xl" />
                    
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                        <div className="flex items-center gap-5 min-w-0 flex-1">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md shadow-blue-600/20 shrink-0">
                                {(name || username || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5 truncate">
                                    {name || username || 'My Profile'}
                                </h1>
                                <p className="text-slate-500 font-medium text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                                    <span className="text-blue-600 font-bold">@{username}</span>
                                    {organizationName && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Building className="w-3 h-3 text-slate-400" />
                                                {organizationName}
                                            </span>
                                        </>
                                    )}
                                </p>
                                <p className="text-[11px] text-slate-400 mt-2 max-w-xl">
                                    Dedicated Workspace: You have an isolated workspace. All tournaments, teams, and live auctions created here are exclusively yours.
                                </p>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/70 shrink-0 w-full sm:w-auto shadow-2xs">
                            <button
                                type="button"
                                onClick={() => setActiveSection('profile')}
                                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                                    activeSection === 'profile'
                                        ? 'bg-white text-blue-600 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <User className="w-4 h-4 shrink-0" />
                                <span>Profile Info</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSection('security')}
                                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
                                    activeSection === 'security'
                                        ? 'bg-white text-blue-600 shadow-xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Lock className="w-4 h-4 shrink-0" />
                                <span>Security & Password</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section Content */}
                {activeSection === 'profile' && (
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
                        <div className="border-b border-slate-100 pb-5 mb-6">
                            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <User className="w-5 h-5 text-blue-600" /> Personal & Organization Information
                            </h2>
                            <p className="text-slate-500 text-xs mt-1">
                                Update the information provided during registration. These details appear across your tournament materials.
                            </p>
                        </div>

                        <form onSubmit={handleSaveProfile} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {/* Full Name */}
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Enter your full name"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Organization Name */}
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                        Organization / Club Name
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                            <Building className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={organizationName}
                                            onChange={(e) => setOrganizationName(e.target.value)}
                                            placeholder="e.g. Dabgar Cricket Club"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                        Phone / WhatsApp Number
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="e.g. +91 9876543210"
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Username */}
                                <div>
                                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                        Account Username
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                            <span className="font-bold text-xs">@</span>
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="username"
                                            className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={isSavingProfile}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <Save className="w-4 h-4" />
                                    {isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Security Section */}
                {activeSection === 'security' && (
                    <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
                        <div className="border-b border-slate-100 pb-5 mb-6">
                            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-indigo-600" /> Update Account Password
                            </h2>
                            <p className="text-slate-500 text-xs mt-1">
                                Secure your account by creating a new password. Enter your current password to authorize the change.
                            </p>
                        </div>

                        <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-lg">
                            {/* Current Password */}
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                    Current Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type={showCurrentPass ? 'text' : 'password'}
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                    >
                                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type={showNewPass ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password (min. 4 chars)"
                                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        required
                                        minLength={4}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNewPass(!showNewPass)}
                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                                    >
                                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm New Password */}
                            <div>
                                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                        <Lock className="w-4 h-4" />
                                    </div>
                                    <input
                                        type={showNewPass ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        required
                                        minLength={4}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-start pt-4 border-t border-slate-100">
                                <button
                                    type="submit"
                                    disabled={isUpdatingPassword}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50"
                                >
                                    <KeyRound className="w-4 h-4" />
                                    {isUpdatingPassword ? 'Updating Password...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
