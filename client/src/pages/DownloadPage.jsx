import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Smartphone,
    Download,
    CheckCircle2,
    AlertTriangle,
    ShieldCheck,
    Cpu,
    HardDrive,
    ExternalLink,
    Zap,
    QrCode,
    ArrowRight,
    Monitor,
    Copy,
    Check,
    Laptop,
    Wifi
} from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';

const APK_URL = "https://github.com/Jainish-2901/dabcricauction/releases/download/v1.3.0/dab-cric-auction-v1.3.0.apk";

export default function DownloadPage() {
    const [copied, setCopied] = useState(false);

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(APK_URL);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
            <PublicHeader />

            <main className="flex-1 py-10 sm:py-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    {/* Hero Showcase */}
                    <div className="text-center max-w-3xl mx-auto mb-12">
                        {/* Android Only Pill */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black uppercase tracking-wider mb-4 shadow-2xs">
                            <Smartphone className="w-4 h-4 text-emerald-600" />
                            <span>Exclusively For Android Phones (Android 8.0+)</span>
                        </div>

                        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                            Download <span className="text-blue-600">Dab Cric Auction</span> for Android
                        </h1>

                        <p className="text-slate-900 text-sm sm:text-base leading-relaxed font-semibold mb-8">
                            Experience zero-latency live bidding on your Android smartphone. Custom-tailored for Franchise Owners, Captains, and Tournament Organizers.
                        </p>

                        {/* Big Download Button */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
                            <a
                                href={APK_URL}
                                download="dab-cric-auction-v1.3.0.apk"
                                className="w-full sm:flex-1 py-4 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Download className="w-5 h-5 animate-bounce" />
                                <span>Download Android APK (v1.3.0)</span>
                            </a>
                            <button
                                type="button"
                                onClick={handleCopyUrl}
                                className="w-full sm:w-auto py-4 px-4 bg-white hover:bg-slate-100 text-slate-900 font-black text-xs rounded-2xl border border-slate-300 transition-all flex items-center justify-center gap-2"
                                title="Copy direct download link"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-700" />}
                                <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-900 font-bold mt-3">
                            Direct Standalone APK • Size: ~130 MB • Fast GitHub Release Mirror
                        </p>
                    </div>

                    {/* Notice for iOS / iPhone Users */}
                    <div className="mb-8 max-w-3xl mx-auto p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-xs sm:text-sm font-black text-amber-950">
                                    Using an Apple iPhone or iPad?
                                </h3>
                                <p className="text-[11px] sm:text-xs text-amber-950 font-semibold mt-0.5">
                                    This APK file is <strong>strictly for Android devices</strong>. iOS users can open our high-speed responsive Web App directly in Safari or Chrome without installing an APK.
                                </p>
                            </div>
                        </div>
                        <Link
                            to="/login"
                            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs shrink-0 flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
                        >
                            <Monitor className="w-3.5 h-3.5" /> Launch Web App
                        </Link>
                    </div>

                    {/* Simultaneous Multi-Device Sync Feature Card */}
                    <div className="mb-12 max-w-4xl mx-auto bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800 text-center sm:text-left">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/20 text-blue-300 text-[11px] font-black uppercase tracking-wider mb-2 border border-blue-500/40">
                                    <Zap className="w-3.5 h-3.5 text-blue-400" />
                                    100% Complete Feature Parity
                                </span>
                                <h3 className="text-xl sm:text-2xl font-black text-white">
                                    Full Access on Both Laptop & Mobile App
                                </h3>
                                <p className="text-xs text-slate-100 font-medium mt-1">
                                    All roles & features available on any screen • Use simultaneously in the same tournament
                                </p>
                            </div>
                            <span className="text-[10px] uppercase font-black px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-400/40 shrink-0">
                                ⚡ Sub-Second Sync
                            </span>
                        </div>

                        {/* Popular Example Notice */}
                        <div className="mb-5 p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-indigo-500/40 text-slate-100 text-xs font-medium flex items-center gap-2.5">
                            <span className="text-lg shrink-0">💡</span>
                            <p className="leading-relaxed">
                                <strong className="text-white">Recommended Tournament Workflow:</strong> Both platforms have 100% full capabilities. As a popular practical setup, the <em className="text-blue-300 font-semibold not-italic">Auctioneer can use a Laptop</em> for stage control while <em className="text-emerald-300 font-semibold not-italic">Team Owners bid from their Mobile Phones</em>. But anyone can perform any role on either device!
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {/* Role 1: Laptop */}
                            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
                                        <Laptop className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-white">Laptop / Desktop Website</h4>
                                        <span className="text-[10px] text-blue-400 font-bold">100% Full Access (Any Role)</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-100 leading-relaxed font-medium">
                                    SuperAdmin tournament configuration, Auctioneer master gavel and countdown timer, Team Owner live bidding, squad viewer, and projector broadcast.
                                </p>
                            </div>

                            {/* Role 2: Mobile Phone */}
                            <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
                                        <Smartphone className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-white">Android Mobile App</h4>
                                        <span className="text-[10px] text-emerald-400 font-bold">100% Full Access (Any Role)</span>
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-100 leading-relaxed font-medium">
                                    Full native Android experience: 1-tap quick bid buttons, live purse tracking, squad management, mobile auctioneer gavel controls, and trade windows.
                                </p>
                            </div>
                        </div>

                        {/* Network Speed Recommendation Alert */}
                        <div className="p-3.5 bg-slate-900 rounded-xl border border-blue-500/40 flex items-center gap-3 text-left">
                            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-300 flex items-center justify-center shrink-0">
                                <Wifi className="w-5 h-5" />
                            </div>
                            <div className="text-xs text-slate-100">
                                <span className="font-black text-white block">📶 Stable Internet Speed Needed:</span>
                                <span className="text-[11px] text-slate-100 font-medium">
                                    Ensure all participating devices (laptop & mobile phones) have a stable, good-speed internet connection (Wi-Fi or 4G/5G) so bids and gavel strikes sync seamlessly in real time without lag.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* APK Technical Specifications Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-12">
                        <h2 className="text-base sm:text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                            <Cpu className="w-5 h-5 text-blue-600" />
                            Package Technical Specifications
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-slate-800 font-extrabold uppercase text-[10px] block">App Version</span>
                                <span className="text-sm font-black text-slate-950 mt-0.5 block">v1.3.0</span>
                                <span className="text-[10px] text-emerald-700 font-black">Latest Release</span>
                            </div>
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-slate-800 font-extrabold uppercase text-[10px] block">Operating System</span>
                                <span className="text-sm font-black text-slate-950 mt-0.5 block">Android 8.0+</span>
                                <span className="text-[10px] text-slate-900 font-bold">Oreo to Android 15</span>
                            </div>
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-slate-800 font-extrabold uppercase text-[10px] block">Architecture</span>
                                <span className="text-sm font-black text-slate-950 mt-0.5 block">Universal APK</span>
                                <span className="text-[10px] text-slate-900 font-bold">arm64-v8a, armeabi-v7a</span>
                            </div>
                            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="text-slate-800 font-extrabold uppercase text-[10px] block">Framework Engine</span>
                                <span className="text-sm font-black text-slate-950 mt-0.5 block">Expo SDK 58</span>
                                <span className="text-[10px] text-indigo-700 font-black">EAS Standalone</span>
                            </div>
                        </div>
                    </div>

                    {/* Step-by-Step Installation Guide */}
                    <div className="mb-14">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-950">
                                Easy 4-Step Android Installation Guide
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-900 font-bold mt-1">
                                Follow these simple steps to install the APK directly on your Android phone
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Step 1 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-2xs relative">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-3">
                                    1
                                </div>
                                <h3 className="text-sm font-black text-slate-950 mb-1.5">Download APK</h3>
                                <p className="text-xs text-slate-900 leading-relaxed font-medium">
                                    Tap the green <strong>"Download Android APK"</strong> button above. Your browser will start downloading <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono font-bold">dab-cric-auction-v1.3.0.apk</code>.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-2xs relative">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-3">
                                    2
                                </div>
                                <h3 className="text-sm font-black text-slate-950 mb-1.5">Open The File</h3>
                                <p className="text-xs text-slate-900 leading-relaxed font-medium">
                                    Once downloaded, swipe down your notification panel or go to your <strong>Downloads</strong> folder in File Manager and tap on the downloaded file.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-2xs relative">
                                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center mb-3">
                                    3
                                </div>
                                <h3 className="text-sm font-black text-slate-950 mb-1.5">Allow Unknown Apps</h3>
                                <p className="text-xs text-slate-900 leading-relaxed font-medium">
                                    If Android shows a prompt, tap <strong>Settings</strong> and switch ON <strong>"Allow from this source"</strong> for your browser/file manager. This is standard for direct APK installs.
                                </p>
                            </div>

                            {/* Step 4 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-300 shadow-2xs relative">
                                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center mb-3">
                                    4
                                </div>
                                <h3 className="text-sm font-black text-slate-950 mb-1.5">Install & Launch</h3>
                                <p className="text-xs text-slate-900 leading-relaxed font-medium">
                                    Tap <strong>"Install"</strong>. Once completed, tap <strong>"Open"</strong>, sign in with your credentials, and enjoy real-time live cricket bidding!
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Features in the Mobile App */}
                    <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl mb-12 border border-slate-800">
                        <div className="max-w-2xl mb-8">
                            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30">
                                Real-Time Mobile Capabilities
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-black mt-3 text-white">
                                Why Franchise Owners Love The Android App
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-100 font-medium mt-1">
                                Engineered specifically for fast-paced live bidding with haptic responsiveness
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2 font-black">
                                    ⚡
                                </div>
                                <h4 className="text-sm font-black text-white mb-1">100ms Push Bids</h4>
                                <p className="text-xs text-slate-100 leading-relaxed font-medium">
                                    Instant responsive bidding buttons with dynamic increment slabs (K & L or L & Cr) synced with the Auctioneer.
                                </p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-2 font-black">
                                    📸
                                </div>
                                <h4 className="text-sm font-black text-white mb-1">1:1 Camera Crop</h4>
                                <p className="text-xs text-slate-100 leading-relaxed font-medium">
                                    Snap photos directly on Android with built-in 1:1 square crop for players and team logos before cloud upload.
                                </p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
                                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2 font-black">
                                    👀
                                </div>
                                <h4 className="text-sm font-black text-white mb-1">Live Spectator View</h4>
                                <p className="text-xs text-slate-100 leading-relaxed font-medium">
                                    Watch live bids, squad breakdowns, and auction stage statuses on your mobile handset without logging in.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
                            <a
                                href={APK_URL}
                                download="dab-cric-auction-v1.3.0.apk"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md active:scale-95"
                            >
                                <Download className="w-4 h-4" /> Start Download: dab-cric-auction-v1.3.0.apk
                            </a>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}
