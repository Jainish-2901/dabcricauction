import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
    ArrowRight,
    Trophy,
    Users,
    Activity,
    Sparkles,
    Smartphone,
    Monitor,
    Gavel,
    Shield,
    RotateCcw,
    Layers,
    UserCheck,
    Radio,
    Clock,
    Phone,
    Mail,
    Globe,
    Github,
    Linkedin,
    Instagram,
    MessageCircle,
    ExternalLink,
    CheckCircle2,
    ChevronRight,
    Zap,
    Maximize2,
    X,
    Menu,
    Code2,
    Download,
    Laptop,
    Wifi
} from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';

const APK_URL = "https://github.com/Jainish-2901/dabcricauction/releases/download/v1.4.0/dab-cric-auction-v1.4.0.apk";

const LandingPage = () => {
    const navigate = useNavigate();
    const [spectatorCode, setSpectatorCode] = useState('');
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleJoinSpectator = (e) => {
        e.preventDefault();
        const clean = spectatorCode.trim();
        if (!clean) return;
        // If user pasted a full URL or just the tournament ID
        const id = clean.includes('/auction/') ? clean.split('/auction/')[1].split('/')[0] : clean;
        navigate(`/auction/${id}`);
    };

    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden font-sans selection:bg-blue-600 selection:text-white">
            {/* Top Navigation Bar */}
            <PublicHeader />

            {/* Hero Section */}
            <main className="relative z-10 container mx-auto px-4 pt-8 sm:pt-16 md:pt-20 pb-16 sm:pb-20 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 mb-4 sm:mb-6 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-[10px] sm:text-xs font-extrabold uppercase tracking-wider shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        Enterprise Cricket Auction Management
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                    className="text-3xl sm:text-5xl md:text-7xl font-black tracking-tight mb-4 sm:mb-6 leading-[1.12] text-slate-900 max-w-4xl px-2"
                >
                    Host IPL-Style Cricket Auctions <br className="hidden sm:inline" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
                        With Real-Time Precision
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="text-xs sm:text-base md:text-xl text-slate-900 max-w-2xl mb-8 sm:mb-10 leading-relaxed font-semibold px-2"
                >
                    Complete gavel hammer controls, live team owner bidding keypads, automatic purse validation, public broadcast stream, and instant audit-safe rollbacks across Web & Mobile.
                </motion.p>

                {/* Primary CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="flex flex-col sm:flex-row gap-3 sm:gap-3.5 justify-center w-full sm:w-auto px-3 sm:px-0"
                >
                    <Link
                        to="/login"
                        className="w-full sm:w-auto px-6 sm:px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-98 text-sm sm:text-base"
                    >
                        <span>Enter Auctioneer / Owner Portal</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                    </Link>
                    <Link
                        to="/register"
                        className="w-full sm:w-auto px-6 sm:px-7 py-3.5 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-bold border border-slate-300 shadow-2xs transition-all hover:scale-[1.02] active:scale-98 text-sm sm:text-base text-center"
                    >
                        Create Tournament Host Account
                    </Link>
                </motion.div>

                {/* Join Live Spectator Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="mt-8 sm:mt-10 w-full max-w-lg bg-white/95 backdrop-blur border border-slate-200 p-2 sm:p-2.5 rounded-2xl shadow-xs mx-3 sm:mx-0"
                >
                    <form onSubmit={handleJoinSpectator} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 sm:py-0 flex-1 bg-slate-50 sm:bg-transparent rounded-xl sm:rounded-none">
                            <Radio className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
                            <input
                                type="text"
                                placeholder="Enter Tournament ID or Live Link..."
                                value={spectatorCode}
                                onChange={(e) => setSpectatorCode(e.target.value)}
                                className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none py-1"
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition-all shrink-0 active:scale-98 text-center"
                        >
                            Spectate Live
                        </button>
                    </form>
                </motion.div>

                {/* Platform Highlights Badges */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.7 }}
                    className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-6 mt-10 sm:mt-12 text-[11px] sm:text-xs font-black text-slate-900 px-2 w-full max-w-3xl"
                >
                    <div className="flex items-center gap-2 p-2 sm:p-0 bg-white/80 sm:bg-transparent border border-slate-200/70 sm:border-transparent rounded-xl justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                        <span className="truncate">Supabase Realtime</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 sm:p-0 bg-white/80 sm:bg-transparent border border-slate-200/70 sm:border-transparent rounded-xl justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                        <span className="truncate">Instant Undo & Rollback</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 sm:p-0 bg-white/80 sm:bg-transparent border border-slate-200/70 sm:border-transparent rounded-xl justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                        <span className="truncate">CricHeroes Profile Sync</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 sm:p-0 bg-white/80 sm:bg-transparent border border-slate-200/70 sm:border-transparent rounded-xl justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0" />
                        <span className="truncate">Mobile Expo & Web Parity</span>
                    </div>
                </motion.div>
            </main>

            {/* Services & Core Features Section */}
            <section id="services" className="relative z-10 container mx-auto px-4 py-20 border-t border-slate-200/80">
                <div className="max-w-3xl mx-auto text-center mb-16">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/60">
                        End-To-End Auction Solutions
                    </span>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 mb-4">
                        Everything You Need For A Flawless Auction
                    </h2>
                    <p className="text-slate-900 text-sm sm:text-base leading-relaxed font-semibold">
                        Built specifically for corporate cricket leagues, community tournaments, and professional clubs to conduct fast, transparent, and exciting live auctions.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {[
                        {
                            icon: Gavel,
                            color: 'bg-blue-50 text-blue-600 border-blue-100',
                            title: 'Live Auctioneer Console',
                            subtitle: 'Official Gavel Room',
                            desc: 'Full hammer controls, customized dynamic bid increment slabs, live countdown timer, audio sound effects, step-by-step Erase Last Bid (Undo Recent Bid), and instant Sold/Unsold gavel buttons.'
                        },
                        {
                            icon: Users,
                            color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                            title: 'Team Owner Bidding Keypad',
                            subtitle: 'Interactive Mobile & Web Keypad',
                            desc: 'Dedicated owner view with 1-tap live bidding button, dynamic K/L/Cr purse balance, captain-first squad roster preview with retention fee calculations, and instant outbid notifications.'
                        },
                        {
                            icon: Radio,
                            color: 'bg-violet-50 text-violet-600 border-violet-100',
                            title: 'Public Live Spectator Stream',
                            subtitle: 'Zero Login Required',
                            desc: 'Public viewing portal for fans, audience, and community members. Live bid ticker, recent bids ledger stream, current player stats card, and sold roster boards.'
                        },
                        {
                            icon: UserCheck,
                            color: 'bg-amber-50 text-amber-600 border-amber-100',
                            title: 'Player Self-Registration Portal',
                            subtitle: 'With Form Open/Close Switch',
                            desc: 'Shareable registration link for players to submit CricHeroes profile URL, career stats, batting/bowling roles, and photos. Tournament organizer can open or close registrations with 1 click.'
                        },
                        {
                            icon: Layers,
                            color: 'bg-indigo-50 text-indigo-600 border-indigo-100',
                            title: 'Category Slots & Pool Management',
                            subtitle: 'Budget & Squad Governance',
                            desc: 'Dual currency scales (L→Cr & K→L), smart CSV bulk player import with auto-formatting, dedicated Pending Players pool, 1-click squad release to Unsold pool, and direct manual player allocation.'
                        },
                        {
                            icon: RotateCcw,
                            color: 'bg-rose-50 text-rose-600 border-rose-100',
                            title: 'Audit-Safe Rollback & Undo',
                            subtitle: 'Zero Data Loss Guarantee',
                            desc: 'Accidental high bid? Step-by-step Erase Last Bid deletes only the recent bid back to the previous leader. Roll back sold sales or return players to the Unsold pool with zero data loss.'
                        },
                        {
                            icon: Shield,
                            color: 'bg-cyan-50 text-cyan-600 border-cyan-100',
                            title: 'Isolated Organizer Workspaces',
                            subtitle: 'Multi-Tenant Architecture',
                            desc: 'Every organizer account operates in a completely dedicated, isolated workspace. Tournaments, teams, rosters, and live bidding sessions remain strictly private with built-in profile & password controls.'
                        }
                    ].map((service, idx) => (
                        <div
                            key={idx}
                            className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-400 transition-all flex flex-col justify-between group"
                        >
                            <div>
                                <div className={`w-12 h-12 rounded-xl ${service.color} border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                                    <service.icon className="w-6 h-6" />
                                </div>
                                <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider block mb-1">
                                    {service.subtitle}
                                </span>
                                <h3 className="text-lg font-black text-slate-950 mb-2.5">
                                    {service.title}
                                </h3>
                                <p className="text-slate-900 text-xs sm:text-sm leading-relaxed font-medium">
                                    {service.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="relative z-10 bg-slate-100/70 py-20 border-y border-slate-200">
                <div className="container mx-auto px-4 max-w-6xl">
                    <div className="max-w-2xl mx-auto text-center mb-16">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/60">
                            Simple 4-Step Process
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mt-3 mb-4">
                            How An Auction Runs Seamlessly
                        </h2>
                        <p className="text-slate-900 text-sm font-semibold">
                            From tournament configuration to the final gavel strike in just four easy steps.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            {
                                step: '01',
                                title: 'Configure & Setup',
                                desc: 'Define tournament rules, purse budget, team slots, and generate secure passwords for auctioneers & owners.'
                            },
                            {
                                step: '02',
                                title: 'Register Players',
                                desc: 'Collect player entries via the self-registration form or import CricHeroes profiles with stats and photos.'
                            },
                            {
                                step: '03',
                                title: 'Conduct Live Bidding',
                                desc: 'Auctioneer controls gavel timer while team owners place live bids from their mobile or web keypad.'
                            },
                            {
                                step: '04',
                                title: 'Export & Celebrate',
                                desc: 'Instant sold rosters, team expense ledger, remaining balances, and printable squad PDFs.'
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm relative">
                                <span className="text-4xl font-black text-slate-300 block mb-3 font-mono">
                                    {item.step}
                                </span>
                                <h3 className="text-base font-black text-slate-950 mb-2">
                                    {item.title}
                                </h3>
                                <p className="text-xs text-slate-900 leading-relaxed font-medium">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Cross-Platform Simultaneous Harmony Section */}
            <section id="cross-platform" className="relative z-10 container mx-auto px-3.5 sm:px-6 py-12 sm:py-20">
                <div className="max-w-5xl mx-auto bg-slate-950 text-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-2xl border border-slate-800 relative overflow-hidden">
                    {/* Section Header */}
                    <div className="max-w-3xl mx-auto text-center mb-8 sm:mb-12">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/20 text-blue-300 text-[11px] sm:text-xs font-black uppercase tracking-wider mb-3 border border-blue-500/40 shadow-xs">
                            <Zap className="w-3.5 h-3.5 text-blue-400" />
                            100% Feature Parity • Simultaneous Web & Mobile Sync
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight mb-3 text-white">
                            Full Access on Any Device • Laptop & Mobile Work Together
                        </h2>
                        <p className="text-slate-100 text-xs sm:text-sm leading-relaxed max-w-2xl mx-auto font-medium">
                            Every feature and every role (SuperAdmin, Auctioneer, Team Owner, Spectator) is <strong className="text-white">100% accessible on BOTH Laptop Website and Mobile App</strong>. You can use any device, or mix them simultaneously for the exact same tournament auction!
                        </p>
                    </div>

                    {/* Popular Example Notice */}
                    <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-indigo-500/40 text-slate-100 text-xs sm:text-sm font-medium flex items-center gap-3">
                        <span className="text-xl sm:text-2xl shrink-0">💡</span>
                        <p className="leading-relaxed">
                            <strong className="text-white">Popular Tournament Setup Example:</strong> Many organizers prefer having the <em className="text-blue-300 font-semibold not-italic">Auctioneer manage from a Laptop</em> (for big-screen display and full gavel console) while <em className="text-emerald-300 font-semibold not-italic">Franchise Owners bid live from their Mobile Phones</em>. But this is just one example — anyone can use either device or both at any time with full access!
                        </p>
                    </div>

                    {/* 2-Box Visual Contrast: Laptop vs Mobile */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 relative">
                        {/* Box 1: Laptop Web Console */}
                        <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-800 hover:border-blue-500/50 transition-all flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/40">
                                        <Laptop className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-blue-600/20 text-blue-300 rounded-full border border-blue-500/30">
                                        100% Full Access • Any Role
                                    </span>
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-white mb-2">
                                    Laptop / Desktop Website
                                </h3>
                                <p className="text-xs text-slate-100 leading-relaxed font-normal mb-4">
                                    Complete platform suite on any web browser: SuperAdmin league settings, Master Auctioneer gavel stage, Team Owner bidding panel, and big-screen TV projector broadcast.
                                </p>
                                <ul className="space-y-2 text-xs text-slate-100 font-medium">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                        <span>Full Admin, Auctioneer & Team Owner portals</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                        <span>Gavel hammer, countdown timer & rollback engine</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                        <span>Live TV / Projector full-screen broadcast view</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                        <span>Logo CRUD, date/time pickers & dual slab config</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="pt-4 mt-4 border-t border-slate-800">
                                <Link
                                    to="/login"
                                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
                                >
                                    <Monitor className="w-3.5 h-3.5" /> Launch Web Console
                                </Link>
                            </div>
                        </div>

                        {/* Box 2: Mobile App */}
                        <div className="bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-800 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                                        <Smartphone className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-600/20 text-emerald-300 rounded-full border border-emerald-500/30">
                                        100% Full Access • Any Role
                                    </span>
                                </div>
                                <h3 className="text-base sm:text-lg font-black text-white mb-2">
                                    Mobile Phone Android App
                                </h3>
                                <p className="text-xs text-slate-100 leading-relaxed font-normal mb-4">
                                    Full native experience on Android phones: Team Owners can bid with 1-tap buttons, while Auctioneers & Admins can also run the entire auction directly from their pocket.
                                </p>
                                <ul className="space-y-2 text-xs text-slate-100 font-medium">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span>1-Tap quick bid keypad with haptic feedback & audio</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span>Full Admin & Auctioneer hammer controls on mobile</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span>Real-time purse budget meter & squad composition</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <span>1:1 camera photo crop, player trades & injury window</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="pt-4 mt-4 border-t border-slate-800">
                                <a
                                    href={APK_URL}
                                    download="dab-cric-auction-v1.4.0.apk"
                                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98"
                                >
                                    <Download className="w-3.5 h-3.5" /> Download Android APK (v1.4.0)
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Crucial Network Advisory Box */}
                    <div className="p-4 sm:p-5 bg-slate-900 rounded-2xl border border-blue-500/40 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-300 shrink-0 shadow-inner">
                            <Wifi className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h4 className="text-xs sm:text-sm font-black text-white flex items-center justify-center sm:justify-start gap-1.5">
                                <span>📶 Important Connectivity Requirement:</span>
                                <span className="text-emerald-400 font-extrabold uppercase text-[11px] bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-400/40">Stable Speed Needed</span>
                            </h4>
                            <p className="text-[11px] sm:text-xs text-slate-100 leading-relaxed font-medium mt-1">
                                To ensure instant sub-second synchronization between laptops and mobile phones for the same tournament auction, <strong className="text-white">ensure all devices have a stable, good-speed internet connection (Wi-Fi or 4G/5G)</strong>. Our WebSocket channels sync every bid, timer tick, and gavel strike across all screens in real time.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Dedicated Android App Download Showcase Section */}
            <section id="download-app" className="relative z-10 container mx-auto px-4 py-16">
                <div className="max-w-5xl mx-auto bg-slate-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl border border-emerald-500/40 relative overflow-hidden">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-8 relative z-10">
                        <div className="max-w-xl text-center lg:text-left">
                            {/* Android Only Pill */}
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black uppercase tracking-wider mb-4 border border-emerald-400/40 shadow-xs">
                                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Android Phones Only (v1.4.0 Released)</span>
                            </div>

                            <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-3 leading-tight text-white">
                                Download The Official Android App
                            </h2>

                            <p className="text-slate-100 text-xs sm:text-sm leading-relaxed mb-6 font-medium">
                                Built exclusively for Android smartphones. Franchise owners and team captains can push bids in 100 milliseconds, crop player photos directly from camera, and monitor live budget counters.
                            </p>

                            {/* Compatibility Alert */}
                            <div className="p-3.5 bg-slate-900 rounded-2xl border border-emerald-500/30 text-xs text-slate-100 mb-6 text-left">
                                <p className="flex items-start gap-2">
                                    <span className="text-emerald-400 font-bold shrink-0">📱 Compatibility:</span>
                                    <span>Supports <strong className="text-white">Android 8.0+</strong> (Oreo to Android 15). <em className="text-amber-300 font-semibold not-italic">Apple iPhone / iOS users can use our responsive Web App directly in Safari or Chrome without installing an APK.</em></span>
                                </p>
                            </div>

                            {/* Download CTA Buttons */}
                            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
                                <a
                                    href={APK_URL}
                                    download="dab-cric-auction-v1.4.0.apk"
                                    className="w-full sm:w-auto px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Download Android APK (v1.4.0)</span>
                                </a>
                                <Link
                                    to="/download"
                                    className="w-full sm:w-auto px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
                                >
                                    <span>Installation Guide</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>

                        {/* Quick Specs & App Badges Box */}
                        <div className="w-full lg:w-auto grid grid-cols-2 gap-3 shrink-0">
                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Format</span>
                                <span className="text-base font-black text-white mt-0.5 block">Standalone APK</span>
                                <span className="text-[10px] text-emerald-400 font-black">Direct Install</span>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Version</span>
                                <span className="text-base font-black text-white mt-0.5 block">v1.4.0</span>
                                <span className="text-[10px] text-blue-400 font-black">EAS Build</span>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Platform</span>
                                <span className="text-base font-black text-white mt-0.5 block">Android Only</span>
                                <span className="text-[10px] text-amber-400 font-black">Phones & Tablets</span>
                            </div>
                            <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-300 block tracking-wider">Latency</span>
                                <span className="text-base font-black text-white mt-0.5 block">&lt; 100ms</span>
                                <span className="text-[10px] text-emerald-400 font-black">Supabase WS</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Developer & Contact Information (Shared Footer) */}
            <PublicFooter />
        </div>
    );
};

export default LandingPage;
