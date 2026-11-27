import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Smartphone, Download, Menu, X, ArrowRight, ShieldCheck, FileText } from 'lucide-react';

const APK_URL = "https://github.com/Jainish-2901/dabcricauction/releases/download/v1.2.0/dab-cric-auction-v1.2.0.apk";

export default function PublicHeader() {
    const [mobileOpen, setMobileOpen] = useState(false);
    const location = useLocation();

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <header className="relative z-50 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] lg:w-full max-w-7xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3.5 bg-white rounded-2xl border border-slate-200 shadow-xs sticky top-2.5 sm:top-4 my-2 sm:my-3 transition-all">
            <div className="flex items-center justify-between">
                {/* Brand Logo */}
                <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
                    <img
                        src="/logo.png"
                        alt="Dab Cric Auction"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-2xs group-hover:scale-105 transition-transform shrink-0"
                    />
                    <div className="min-w-0">
                        <span className="text-sm sm:text-lg font-black tracking-tight text-slate-900 block leading-tight truncate">
                            Dab Cric <span className="text-blue-600">Auction</span>
                        </span>
                        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold leading-tight">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            Live Auction Cloud Platform
                        </div>
                    </div>
                </Link>

                {/* Desktop Nav Links with Active Highlight */}
                <nav className="hidden lg:flex items-center gap-1.5 text-xs">
                    <Link
                        to="/"
                        className={`transition-all py-1.5 px-3 rounded-xl flex items-center gap-1.5 ${
                            isActive('/')
                                ? 'bg-blue-600 text-white font-black shadow-xs shadow-blue-600/30'
                                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100 font-bold'
                        }`}
                    >
                        <span>Home</span>
                    </Link>

                    <Link
                        to="/about"
                        className={`transition-all py-1.5 px-3 rounded-xl flex items-center gap-1.5 ${
                            isActive('/about')
                                ? 'bg-blue-600 text-white font-black shadow-xs shadow-blue-600/30'
                                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100 font-bold'
                        }`}
                    >
                        <span>About Us</span>
                    </Link>

                    <Link
                        to="/download"
                        className={`transition-all py-1.5 px-3 rounded-xl flex items-center gap-1.5 ${
                            isActive('/download')
                                ? 'bg-indigo-600 text-white font-black shadow-xs shadow-indigo-600/30'
                                : 'text-slate-700 hover:text-indigo-600 hover:bg-slate-100 font-bold'
                        }`}
                    >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Download App</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                            isActive('/download')
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                            v1.2.0
                        </span>
                    </Link>

                    <Link
                        to="/terms"
                        className={`transition-all py-1.5 px-3 rounded-xl flex items-center gap-1.5 ${
                            isActive('/terms')
                                ? 'bg-blue-600 text-white font-black shadow-xs shadow-blue-600/30'
                                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100 font-bold'
                        }`}
                    >
                        <span>Terms</span>
                    </Link>

                    <Link
                        to="/privacy"
                        className={`transition-all py-1.5 px-3 rounded-xl flex items-center gap-1.5 ${
                            isActive('/privacy')
                                ? 'bg-blue-600 text-white font-black shadow-xs shadow-blue-600/30'
                                : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100 font-bold'
                        }`}
                    >
                        <span>Privacy</span>
                    </Link>
                </nav>

                {/* Right Actions */}
                <div className="flex items-center gap-2">
                    <a
                        href={APK_URL}
                        download="dab-cric-auction-v1.2.0.apk"
                        className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95"
                        title="Download Android APK (v1.2.0)"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Android APK (v1.2.0)</span>
                    </a>

                    <Link
                        to="/login"
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
                    >
                        Sign In
                    </Link>

                    {/* Mobile Hamburger Button */}
                    <button
                        type="button"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden p-1.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
                        aria-label="Toggle Navigation Menu"
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Menu with Active Highlight */}
            {mobileOpen && (
                <div className="lg:hidden pt-3 mt-2 border-t border-slate-100 space-y-1 text-xs font-bold text-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
                    <Link
                        to="/"
                        onClick={() => setMobileOpen(false)}
                        className={`px-3 py-2 rounded-xl flex items-center justify-between transition-all ${
                            isActive('/')
                                ? 'bg-blue-600 text-white font-black shadow-xs'
                                : 'hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        <span>🏠 Home</span>
                        {isActive('/') && <span className="text-[10px] uppercase font-black tracking-wider">Active</span>}
                    </Link>

                    <Link
                        to="/about"
                        onClick={() => setMobileOpen(false)}
                        className={`px-3 py-2 rounded-xl flex items-center justify-between transition-all ${
                            isActive('/about')
                                ? 'bg-blue-600 text-white font-black shadow-xs'
                                : 'hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        <span>🏏 About Us & Architecture</span>
                        {isActive('/about') && <span className="text-[10px] uppercase font-black tracking-wider">Active</span>}
                    </Link>

                    <Link
                        to="/download"
                        onClick={() => setMobileOpen(false)}
                        className={`px-3 py-2 rounded-xl flex items-center justify-between transition-all ${
                            isActive('/download')
                                ? 'bg-indigo-600 text-white font-black shadow-xs'
                                : 'hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        <span className="flex items-center gap-1.5">
                            <Smartphone className="w-4 h-4 text-emerald-400" />
                            <span>Download Android App (.APK)</span>
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-black ${
                            isActive('/download')
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-100 text-emerald-800'
                        }`}>
                            Android Only
                        </span>
                    </Link>

                    <Link
                        to="/terms"
                        onClick={() => setMobileOpen(false)}
                        className={`px-3 py-2 rounded-xl flex items-center justify-between transition-all ${
                            isActive('/terms')
                                ? 'bg-blue-600 text-white font-black shadow-xs'
                                : 'hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        <span>📜 Terms & Conditions</span>
                        {isActive('/terms') && <span className="text-[10px] uppercase font-black tracking-wider">Active</span>}
                    </Link>

                    <Link
                        to="/privacy"
                        onClick={() => setMobileOpen(false)}
                        className={`px-3 py-2 rounded-xl flex items-center justify-between transition-all ${
                            isActive('/privacy')
                                ? 'bg-blue-600 text-white font-black shadow-xs'
                                : 'hover:bg-slate-100 text-slate-700'
                        }`}
                    >
                        <span>🛡️ Privacy Policy</span>
                        {isActive('/privacy') && <span className="text-[10px] uppercase font-black tracking-wider">Active</span>}
                    </Link>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                        <a
                            href={APK_URL}
                            download="dab-cric-auction-v1.2.0.apk"
                            className="flex-1 text-center py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-xs"
                            title="Download Android APK (v1.2.0)"
                        >
                            <Download className="w-3.5 h-3.5" /> Download APK (v1.2.0)
                        </a>
                        <Link
                            to="/register"
                            onClick={() => setMobileOpen(false)}
                            className="flex-1 text-center py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold"
                        >
                            Register Host
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
