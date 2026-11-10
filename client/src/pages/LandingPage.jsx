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
    Code2
} from 'lucide-react';

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
            {/* Subtle Gradient Glow Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[55%] h-[55%] bg-blue-100/60 rounded-full blur-[120px]" />
                <div className="absolute top-[25%] -right-[10%] w-[45%] h-[45%] bg-indigo-100/60 rounded-full blur-[120px]" />
                <div className="absolute top-[65%] left-[10%] w-[40%] h-[40%] bg-violet-100/50 rounded-full blur-[120px]" />
            </div>

            {/* Top Navigation Bar */}
            <nav className="relative z-50 px-3.5 sm:px-6 py-2.5 sm:py-3.5 max-w-7xl mx-3 sm:mx-auto backdrop-blur-md bg-white/90 rounded-2xl border border-slate-200 shadow-xs sticky top-3 sm:top-4 mt-3 sm:mt-4 transition-all">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <img
                            src="/logo.png"
                            alt="Dab Cric Auction"
                            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-2xs"
                        />
                        <div>
                            <span className="text-base sm:text-xl font-black tracking-tight text-slate-900">
                                Dab Cric <span className="text-blue-600">Auction</span>
                            </span>
                            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live Auction Cloud Platform
                            </div>
                        </div>
                    </div>

                    {/* Desktop Navigation Links */}
                    <div className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-600">
                        <a href="#services" className="hover:text-blue-600 transition-colors">Our Services</a>
                        <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How It Works</a>
                        <a href="#cross-platform" className="hover:text-blue-600 transition-colors">Cross-Platform</a>
                        <a href="#developer" className="hover:text-blue-600 transition-colors">Developer</a>
                    </div>

                    {/* Right Action Buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2.5">
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">
                            <Monitor className="w-3.5 h-3.5 text-blue-600" />
                            <span>Web</span>
                            <span className="text-slate-300">|</span>
                            <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Mobile App</span>
                        </div>
                        <Link
                            to="/register"
                            className="hidden sm:inline-flex px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-200 transition-all"
                        >
                            Host Register
                        </Link>
                        <Link
                            to="/login"
                            className="px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
                        >
                            <span>Sign In</span>
                            <ArrowRight className="w-3.5 h-3.5 hidden sm:inline" />
                        </Link>

                        {/* Mobile Hamburger Menu Toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all ml-0.5"
                            aria-label="Toggle navigation menu"
                        >
                            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Navigation Drawer */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="lg:hidden overflow-hidden pt-3 mt-3 border-t border-slate-200/90"
                        >
                            <div className="flex flex-col gap-1 pb-3 text-sm font-semibold text-slate-700">
                                <a
                                    href="#services"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-between"
                                >
                                    <span>⚡ Our Services</span>
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                </a>
                                <a
                                    href="#how-it-works"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-between"
                                >
                                    <span>🔄 How It Works</span>
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                </a>
                                <a
                                    href="#cross-platform"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-between"
                                >
                                    <span>📱 Cross-Platform Cloud</span>
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                </a>
                                <a
                                    href="#developer"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-between"
                                >
                                    <span>👨‍💻 Developer Profile & Contact</span>
                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                </a>
                            </div>

                            <div className="pt-2 pb-1 border-t border-slate-100 flex flex-col gap-2">
                                <Link
                                    to="/register"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="w-full text-center py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 transition-all"
                                >
                                    Create Tournament Host Account
                                </Link>
                                <div className="flex items-center justify-center gap-2 py-1 text-[11px] text-slate-500 font-medium">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Expo Mobile App & Web Cloud Parity Active</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </nav>

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
                    className="text-xs sm:text-base md:text-xl text-slate-600 max-w-2xl mb-8 sm:mb-10 leading-relaxed font-normal px-2"
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
                    className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-2 sm:gap-6 mt-10 sm:mt-12 text-[11px] sm:text-xs font-bold text-slate-600 px-2 w-full max-w-3xl"
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
                    <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
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
                            desc: 'Full hammer controls, customized dynamic bid increment buttons (+500, +1K, +5K), live countdown timer, audio sound effects, and instant Sold/Unsold gavel buttons.'
                        },
                        {
                            icon: Users,
                            color: 'bg-emerald-50 text-emerald-600 border-emerald-100',
                            title: 'Team Owner Bidding Keypad',
                            subtitle: 'Interactive Mobile & Web Keypad',
                            desc: 'Dedicated owner view with 1-tap live bidding button, real-time purse balance, remaining player slot requirements, squad roster preview, and instant outbid notifications.'
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
                            title: 'Category Slots & Purse Management',
                            subtitle: 'Budget & Squad Governance',
                            desc: 'Strict slot controls for Batsmen, Bowlers, All-rounders, and Keepers. Prevents teams from bidding when purse is insufficient or team player quota is filled.'
                        },
                        {
                            icon: RotateCcw,
                            color: 'bg-rose-50 text-rose-600 border-rose-100',
                            title: 'Audit-Safe Rollback & Undo',
                            subtitle: 'Zero Data Loss Guarantee',
                            desc: 'Made a mistake during lightning-fast bidding? Instantly undo erroneous bids or roll back sold players with atomic database accuracy and real-time bid log tracking.'
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
                                <h3 className="text-lg font-bold text-slate-900 mb-2.5">
                                    {service.title}
                                </h3>
                                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
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
                        <p className="text-slate-600 text-sm">
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
                            <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
                                <span className="text-4xl font-black text-slate-200 block mb-3 font-mono">
                                    {item.step}
                                </span>
                                <h3 className="text-base font-bold text-slate-900 mb-2">
                                    {item.title}
                                </h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Cross-Platform Parity Banner */}
            <section id="cross-platform" className="relative z-10 container mx-auto px-4 py-20">
                <div className="max-w-5xl mx-auto bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-8 sm:p-12 shadow-xl border border-slate-700/60 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-lg text-left">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-400/30">
                            <Zap className="w-3.5 h-3.5 text-blue-400" />
                            Multi-Platform Cloud Architecture
                        </span>
                        <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-4 leading-tight">
                            Run On Any Laptop, Tablet, Android or iPhone
                        </h2>
                        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
                            Auctioneers can command the gavel from their laptop browser while franchise owners tap bids comfortably from their mobile smartphones. Everything syncs instantaneously via Supabase.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <Link
                                to="/login"
                                className="px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-md text-center"
                            >
                                Launch Web Console
                            </Link>
                            <Link
                                to="/register"
                                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all border border-white/20 text-center"
                            >
                                Register Host
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full md:w-auto">
                        <div className="bg-white/10 backdrop-blur p-5 rounded-2xl border border-white/10 text-center">
                            <Monitor className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                            <h4 className="text-sm font-bold">Web Platform</h4>
                            <p className="text-[11px] text-slate-400 mt-1">Full Gavel & Admin Tools</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur p-5 rounded-2xl border border-white/10 text-center">
                            <Smartphone className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                            <h4 className="text-sm font-bold">Mobile App</h4>
                            <p className="text-[11px] text-slate-400 mt-1">Native Expo SDK 58</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Developer & Contact Information (Full-Width Footer) */}
            <footer id="developer" className="relative z-10 bg-slate-950 text-slate-100 pt-16 pb-10 border-t border-slate-800/80">
                {/* Background Ambient Glows */}
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    {/* Main Footer Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 lg:gap-12 items-start">
                        {/* Left Column: Developer Profile (5 cols) */}
                        <div className="lg:col-span-5 flex flex-col items-center sm:items-start text-center sm:text-left w-full">
                            {/* Profile Header */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 mb-5 text-center sm:text-left">
                                {/* Interactive Avatar with Zoom Lightbox */}
                                <div
                                    className="relative group cursor-pointer shrink-0"
                                    onClick={() => setImageModalOpen(true)}
                                    title="Click to view full photo"
                                >
                                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl p-0.5 bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 shadow-xl group-hover:scale-105 transition-all duration-300">
                                        <img
                                            src="/developer.jpg"
                                            alt="Jainish Dabgar"
                                            className="w-full h-full object-cover rounded-[14px]"
                                        />
                                    </div>
                                    <div className="absolute -bottom-1.5 -right-1.5 bg-blue-600 group-hover:bg-blue-500 text-white p-1 rounded-lg border-2 border-slate-950 shadow-md transition-colors flex items-center justify-center">
                                        <Maximize2 className="w-3 h-3" />
                                    </div>
                                </div>

                                <div className="flex flex-col items-center sm:items-start">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-[11px] font-bold uppercase tracking-wider mb-1.5">
                                        <Sparkles className="w-3 h-3 text-blue-400" />
                                        Designed & Crafted by
                                    </span>
                                    <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                                        Jainish Dabgar
                                    </h3>
                                    <p className="text-xs sm:text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 mt-0.5">
                                        Full-Stack Developer & UI/UX Designer
                                    </p>
                                </div>
                            </div>

                            {/* Tech Stack Badges */}
                            <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mb-5">
                                {['React', 'React Native (Expo)', 'Node.js', 'Supabase', 'Socket.io', 'Tailwind CSS'].map((tech) => (
                                    <span
                                        key={tech}
                                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-semibold text-slate-300"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>

                            {/* Gujarati Project Enquiry Note */}
                            <div className="w-full p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-left">
                                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                    💡 એપ્લિકેશન ડેવલપમેન્ટ, ડિઝાઇન અથવા અન્ય ટેક્નિકલ પ્રોજેક્ટ્સ માટે આપ કોઈપણ સોશિયલ મીડિયા કે ઈમેલ મારફતે સીધો સંપર્ક કરી શકો છો.
                                </p>
                            </div>
                        </div>

                        {/* Right Column: Direct Contacts & Social Links (7 cols) */}
                        <div className="lg:col-span-7 flex flex-col justify-between h-full">
                            {/* Section Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800/80 gap-2 mb-6">
                                <div>
                                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-300 uppercase tracking-wider">
                                        Connect & Contact (સંપર્ક)
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Feel free to reach out for inquiries or collaborations.
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold self-start sm:self-auto">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    Available for Projects
                                </span>
                            </div>

                            {/* Contact Links Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {/* Direct Call */}
                                <a
                                    href="tel:+919773272749"
                                    className="group flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 hover:bg-emerald-600/20 text-white border border-slate-800 hover:border-emerald-500/60 shadow-sm transition-all hover:scale-[1.02]"
                                    title="Direct Call"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Direct Call</span>
                                        <span className="text-xs font-bold text-white truncate block">+91 97732 72749</span>
                                    </div>
                                </a>

                                {/* Direct WhatsApp */}
                                <a
                                    href="https://wa.me/919773272749"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 hover:bg-[#25D366]/20 text-white border border-slate-800 hover:border-[#25D366]/60 shadow-sm transition-all hover:scale-[1.02]"
                                    title="WhatsApp"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] group-hover:bg-[#25D366] group-hover:text-white transition-colors">
                                        <MessageCircle className="w-4 h-4" />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">WhatsApp</span>
                                        <span className="text-xs font-bold text-white truncate block">Chat Directly</span>
                                    </div>
                                </a>

                                {/* Portfolio */}
                                <a
                                    href="https://jainishdabgar.vercel.app/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 hover:bg-sky-600/20 text-white border border-slate-800 hover:border-sky-500/60 shadow-sm transition-all hover:scale-[1.02]"
                                    title="Portfolio"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Portfolio</span>
                                        <span className="text-xs font-bold text-white truncate block">jainishdabgar.vercel.app</span>
                                    </div>
                                </a>

                                {/* LinkedIn */}
                                <a
                                    href="https://www.linkedin.com/in/jainish-dabgar-87474a320/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 hover:bg-[#0A66C2]/20 text-white border border-slate-800 hover:border-[#0A66C2]/60 shadow-sm transition-all hover:scale-[1.02]"
                                    title="LinkedIn"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 border border-[#0A66C2]/20 flex items-center justify-center text-[#0A66C2] group-hover:bg-[#0A66C2] group-hover:text-white transition-colors">
                                        <Linkedin className="w-4 h-4" />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">LinkedIn</span>
                                        <span className="text-xs font-bold text-white truncate block">Jainish Dabgar</span>
                                    </div>
                                </a>

                                {/* GitHub */}
                                <a
                                    href="https://github.com/Jainish-2901"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white border border-slate-800 hover:border-slate-600 shadow-sm transition-all hover:scale-[1.02]"
                                    title="GitHub"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:bg-slate-700 group-hover:text-white transition-colors">
                                        <Github className="w-4 h-4" />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">GitHub</span>
                                        <span className="text-xs font-bold text-white truncate block">@Jainish-2901</span>
                                    </div>
                                </a>

                                {/* Instagram */}
                                <a
                                    href="https://www.instagram.com/dabgar_jainish_2901/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 hover:bg-pink-600/20 text-white border border-slate-800 hover:border-pink-500/60 shadow-sm transition-all hover:scale-[1.02]"
                                    title="Instagram"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:bg-gradient-to-r group-hover:from-[#833ab4] group-hover:via-[#fd1d1d] group-hover:to-[#fcb045] group-hover:text-white transition-colors">
                                        <Instagram className="w-4 h-4" />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Instagram</span>
                                        <span className="text-xs font-bold text-white truncate block">@dabgar_jainish_2901</span>
                                    </div>
                                </a>

                                {/* Email (Full width on sm) */}
                                <a
                                    href="mailto:jainishdabgar2901@gmail.com"
                                    className="sm:col-span-2 md:col-span-3 group flex items-center gap-3 p-3 rounded-xl bg-slate-900/90 hover:bg-rose-600/20 text-white border border-slate-800 hover:border-rose-500/60 shadow-sm transition-all hover:scale-[1.01]"
                                    title="Email"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <div className="text-left overflow-hidden">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Email Inquiry</span>
                                        <span className="text-xs font-bold text-white truncate block">jainishdabgar2901@gmail.com</span>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Full-Width Sub-Footer Bar */}
                    <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
                        <p>© 2026 Dab Cric Auction. All rights reserved.</p>
                        <p className="text-[11px] text-slate-400">
                            Crafted with passion for community cricket by <span className="text-slate-300 font-semibold">Jainish Dabgar</span>.
                        </p>
                    </div>
                </div>

                {/* Developer Image Lightbox Modal */}
                <AnimatePresence>
                    {imageModalOpen && (
                        <div
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
                            onClick={() => setImageModalOpen(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                                className="relative bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden max-w-sm sm:max-w-md w-full p-4 shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => setImageModalOpen(false)}
                                    className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center z-10 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="rounded-2xl overflow-hidden border border-slate-800 aspect-square">
                                    <img
                                        src="/developer.jpg"
                                        alt="Jainish Dabgar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="pt-4 text-center">
                                    <h4 className="text-lg font-black text-white">Jainish Dabgar</h4>
                                    <p className="text-xs text-blue-400 font-semibold mt-0.5">
                                        Full-Stack Developer & UI/UX Designer
                                    </p>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </footer>
        </div>
    );
};

export default LandingPage;
