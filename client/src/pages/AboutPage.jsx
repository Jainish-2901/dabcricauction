import React from 'react';
import { Link } from 'react-router-dom';
import {
    Trophy,
    Users,
    Zap,
    Shield,
    Smartphone,
    Monitor,
    RotateCcw,
    Layers,
    Activity,
    CheckCircle2,
    Calendar,
    ArrowRight,
    Download,
    Mail,
    Phone,
    Globe,
    Github,
    Linkedin,
    Instagram,
    Code2,
    Sparkles
} from 'lucide-react';
import SafeImage from '../components/SafeImage';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';

const APK_URL = "https://github.com/Jainish-2901/dabcricauction/releases/download/v1.1.0/dab-cric-auction-v1.1.0.apk";

export default function AboutPage() {
    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
            {/* Subtle Gradient Glow Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] bg-blue-100/60 rounded-full blur-[120px]" />
                <div className="absolute top-[25%] -right-[10%] w-[45%] h-[45%] bg-indigo-100/60 rounded-full blur-[120px]" />
            </div>

            <PublicHeader />

            <main className="flex-1 py-10 sm:py-16">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    {/* Hero Header */}
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-black uppercase tracking-wider mb-4">
                            <Sparkles className="w-3.5 h-3.5" />
                            Next-Gen Cricket Auction Platform
                        </span>
                        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
                            About <span className="text-blue-600">Dab Cric Auction</span>
                        </h1>
                        <p className="text-slate-900 text-sm sm:text-base leading-relaxed font-semibold">
                            An enterprise-grade, cloud-powered live cricket auction suite built to bring IPL-standard bidding thrills, accuracy, and real-time synchronisation to community tournaments, premier leagues, and corporate championships.
                        </p>
                    </div>

                    {/* Mission & Vision Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4">
                                <Trophy className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 mb-2">Our Mission</h2>
                            <p className="text-xs sm:text-sm text-slate-900 leading-relaxed font-medium">
                                To eliminate tedious paperwork, pen-and-paper bid tracking, and chaotic calculations from cricket tournaments. We empower organizers with automated budget calculations, transparent audit logs, and instant broadcast capabilities so every participant enjoys a professional IPL-like auction atmosphere.
                            </p>
                        </div>

                        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs relative overflow-hidden">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
                                <Zap className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-black text-slate-900 mb-2">Our Technology</h2>
                            <p className="text-xs sm:text-sm text-slate-900 leading-relaxed font-medium">
                                Engineered with modern WebSockets, Supabase PostgreSQL, and Cloudinary CDN, delivering sub-second real-time state synchronization across desktop browsers and mobile handsets without delays or page refreshes.
                            </p>
                        </div>
                    </div>

                    {/* Key Platform Capabilities */}
                    <div className="mb-16">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                                Built For Every Cricket Tournament Need
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-800 font-bold mt-1">
                                Comprehensive features spanning web and native Android mobile applications
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {/* Feature 1 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                                    <Zap className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 mb-1">Dual Currency Scales</h3>
                                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                                    Choose between <strong>Lakhs to Crores (L → Cr)</strong> for mega leagues or <strong>Thousands to Lakhs (K → L)</strong> for local club & box cricket formats with dynamic bidding slab units.
                                </p>
                            </div>

                            {/* Feature 2 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                                    <Smartphone className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 mb-1">Android Mobile App</h3>
                                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                                    Dedicated native Android app with 1-tap quick bid keypad, live budget counters, 1:1 camera crop, and instant team owner controls.
                                </p>
                            </div>

                            {/* Feature 3 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 mb-1">Gavel & Undo Rollback</h3>
                                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                                    Master Auctioneer console with zero-loss undo bid, sale rollback, manual hammer price override, and pause/resume controls.
                                </p>
                            </div>

                            {/* Feature 4 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                                    <RotateCcw className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 mb-1">Post-Auction Trades</h3>
                                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                                    Execute franchise player trades and dynamic fee differentials with automated team purse rebalancing and audit ledger.
                                </p>
                            </div>

                            {/* Feature 5 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                                    <Activity className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 mb-1">Injury Replacement Window</h3>
                                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                                    Replace injured players from unsold pools with purse refund/debit adjustment and 1-click player recovery options.
                                </p>
                            </div>

                            {/* Feature 6 */}
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                                    <Users className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-black text-slate-900 mb-1">Public Live Broadcast</h3>
                                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                                    Shareable live stream URL for audience, spectators, and fans to monitor live bids, sold players, and squad compositions on any TV or phone.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Developer Profile Spotlight */}
                    <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl mb-16 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8">
                            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden border-2 border-blue-500/40 shrink-0 shadow-lg bg-slate-800">
                                <SafeImage
                                    src="/developer.jpg"
                                    alt="Jainish Dabgar"
                                    className="w-full h-full object-cover"
                                    previewable={true}
                                    previewTitle="Jainish Dabgar - Lead Architect & Developer"
                                />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-2 border border-blue-400/30">
                                    <Code2 className="w-3.5 h-3.5" /> Lead Architect & Developer
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-black text-white">Jainish Dabgar</h3>
                                <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1 leading-relaxed">
                                    <p className="text-xs sm:text-sm text-slate-100 font-medium mt-1 leading-relaxed">
                                        Full-Stack Engineer & UI/UX Designer specialized in real-time cloud architectures, reactive frontends, and mobile development. Designed, engineered, and fine-tuned Dab Cric Auction from the ground up.
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4 text-xs font-bold">
                                        <a
                                            href="https://jainishdabgar.vercel.app/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-1.5 transition-all"
                                        >
                                            <Globe className="w-3.5 h-3.5" /> Portfolio
                                        </a>
                                        <a
                                            href="https://github.com/Jainish-2901"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center gap-1.5 border border-slate-700 transition-all"
                                        >
                                            <Github className="w-3.5 h-3.5" /> GitHub
                                        </a>
                                        <a
                                            href="https://www.linkedin.com/in/jainish-dabgar-87474a320/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-[#0A66C2]/20 hover:bg-[#0A66C2] text-white rounded-xl flex items-center gap-1.5 border border-[#0A66C2]/40 transition-all"
                                        >
                                            <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                                        </a>
                                        <a
                                            href="mailto:jainishdabgar2901@gmail.com"
                                            className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-600 text-white rounded-xl flex items-center gap-1.5 border border-rose-500/40 transition-all"
                                        >
                                            <Mail className="w-3.5 h-3.5" /> Email
                                        </a>
                                    </div>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Call to Action Banner */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white text-center shadow-lg">
                        <h2 className="text-2xl sm:text-3xl font-black mb-3">
                            Ready To Host Your Cricket Auction?
                        </h2>
                        <p className="text-blue-100 text-xs sm:text-sm max-w-xl mx-auto mb-6 font-medium">
                            Launch your tournament in minutes on the web or download our standalone Android app for real-time mobile bidding.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                to="/register"
                                className="w-full sm:w-auto px-6 py-3 bg-white text-blue-700 hover:bg-blue-50 font-black text-xs rounded-xl transition-all shadow-sm"
                            >
                                Register New Host
                            </Link>
                            <Link
                                to="/download"
                                className="w-full sm:w-auto px-6 py-3 bg-blue-900/60 hover:bg-blue-900 text-white font-black text-xs rounded-xl transition-all border border-blue-400/30 flex items-center justify-center gap-2"
                            >
                                <Smartphone className="w-4 h-4 text-emerald-400" /> Download Android APK
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}
