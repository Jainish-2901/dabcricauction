import React from 'react';
import { Link } from 'react-router-dom';
import {
    Smartphone,
    Globe,
    Linkedin,
    Github,
    Instagram,
    Mail,
    Phone,
    Download,
    Shield,
    FileText,
    Info,
    Trophy,
    MessageCircle
} from 'lucide-react';
import SafeImage from './SafeImage';

const APK_URL = "https://github.com/Jainish-2901/dabcricauction/releases/download/v1.3.0/dab-cric-auction-v1.3.0.apk";

export default function PublicFooter() {
    return (
        <footer className="relative z-10 bg-slate-950 text-slate-100 pt-14 pb-8 border-t border-slate-800/80 font-sans">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* 4-Column Footer Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 pb-12 border-b border-slate-800">
                    {/* Col 1: Brand Info */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <SafeImage
                                src="/logo.png"
                                alt="Dab Cric Auction Logo"
                                className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-800 p-0.5 shadow-sm"
                                previewable={true}
                                previewTitle="Dab Cric Auction Official Logo"
                            />
                            <div>
                                <span className="text-lg font-black tracking-tight text-white block">
                                    Dab Cric <span className="text-blue-500">Auction</span>
                                </span>
                                <span className="text-[11px] text-slate-300 font-semibold">
                                    Real-time Cloud Auction Platform
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                            Enterprise-grade live cricket auction suite for Premier Leagues, Box Cricket tournaments, and Club championships with sub-second WebSocket bidding and Supabase sync.
                        </p>
                        <div className="pt-1">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Version 1.3.0 Live
                            </span>
                        </div>
                    </div>

                    {/* Col 2: Navigation Links */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                            Quick Navigation
                        </h4>
                        <ul className="space-y-2 text-xs font-bold text-slate-300">
                            <li>
                                <Link to="/" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                    <span>•</span> Home
                                </Link>
                            </li>
                            <li>
                                <Link to="/about" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                    <span>•</span> About Us & Architecture
                                </Link>
                            </li>
                            <li>
                                <Link to="/download" className="hover:text-indigo-400 text-indigo-300 font-bold transition-colors flex items-center gap-1.5">
                                    <span>•</span> Download Android App (APK)
                                </Link>
                            </li>
                            <li>
                                <Link to="/login" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                    <span>•</span> Sign In / Admin Console
                                </Link>
                            </li>
                            <li>
                                <Link to="/register" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                    <span>•</span> Register New Host
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Col 3: Android App & Compliance */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                            Mobile App & Legal
                        </h4>
                        <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
                            <div className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-bold text-white">Android APK v1.3.0</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-tight font-medium">
                                Standalone installation for Android phones. Ultra-fast real-time keypad for team owners.
                            </p>
                            <a
                                href={APK_URL}
                                download="dab-cric-auction-v1.3.0.apk"
                                className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white rounded-lg text-[11px] font-black shadow-xs transition-all"
                            >
                                <Download className="w-3.5 h-3.5" /> Download APK (~130 MB)
                            </a>
                        </div>
                        <ul className="space-y-1.5 text-xs font-bold text-slate-300 pt-1">
                            <li>
                                <Link to="/privacy" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-slate-400" /> Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link to="/terms" className="hover:text-blue-400 transition-colors flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Terms & Conditions
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Col 4: Developer & Contact */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-200">
                            Developer & Contact
                        </h4>

                        {/* Developer Picture & Info Card */}
                        <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center gap-3 shadow-inner">
                            <div className="relative group shrink-0">
                                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-blue-500/50 shadow-md bg-slate-800">
                                    <SafeImage
                                        src="/developer.jpg"
                                        alt="Jainish Dabgar"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        previewable={true}
                                        previewTitle="Jainish Dabgar - Lead Architect & Developer"
                                    />
                                </div>
                                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" title="Active Developer" />
                            </div>
                            <div className="min-w-0">
                                <h5 className="text-sm font-black text-white truncate">Jainish Dabgar</h5>
                                <p className="text-[11px] text-blue-400 font-bold truncate">Lead Architect & Developer</p>
                                <p className="text-[10px] text-slate-300 font-medium truncate">Full-Stack & UI/UX Designer</p>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs text-slate-300 font-medium pt-1">
                            <a
                                href="tel:+919773272749"
                                className="flex items-center gap-2 hover:text-white transition-colors"
                            >
                                <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                <span>+91 97732 72749</span>
                            </a>
                            <a
                                href="mailto:jainishdabgar2901@gmail.com"
                                className="flex items-center gap-2 hover:text-white transition-colors"
                            >
                                <Mail className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span className="truncate">jainishdabgar2901@gmail.com</span>
                            </a>
                        </div>

                        {/* Social Icons */}
                        <div className="flex items-center gap-2 pt-2">
                            <a
                                href="https://wa.me/919773272749"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-[#25D366] hover:text-white flex items-center justify-center text-slate-300 border border-slate-800 transition-colors"
                                title="WhatsApp"
                            >
                                <MessageCircle className="w-4 h-4" />
                            </a>
                            <a
                                href="https://jainishdabgar.vercel.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-blue-600 hover:text-white flex items-center justify-center text-slate-300 border border-slate-800 transition-colors"
                                title="Portfolio"
                            >
                                <Globe className="w-4 h-4" />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/jainish-dabgar-87474a320/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-[#0A66C2] hover:text-white flex items-center justify-center text-slate-300 border border-slate-800 transition-colors"
                                title="LinkedIn"
                            >
                                <Linkedin className="w-4 h-4" />
                            </a>
                            <a
                                href="https://github.com/Jainish-2901"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-700 hover:text-white flex items-center justify-center text-slate-300 border border-slate-800 transition-colors"
                                title="GitHub"
                            >
                                <Github className="w-4 h-4" />
                            </a>
                            <a
                                href="https://www.instagram.com/dabgar_jainish_2901/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-pink-600 hover:text-white flex items-center justify-center text-slate-300 border border-slate-800 transition-colors"
                                title="Instagram"
                            >
                                <Instagram className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </div>

                {/* Sub Footer Bar */}
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-medium">
                    <p>© 2026 Dab Cric Auction Pro. All rights reserved.</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-300 font-medium">
                        <SafeImage
                            src="/developer.jpg"
                            alt="Jainish Dabgar"
                            className="w-4 h-4 rounded-full object-cover border border-slate-700"
                            previewable={true}
                            previewTitle="Jainish Dabgar"
                        />
                        <span>Built for cricket enthusiasts across India by <strong className="text-white font-bold">Jainish Dabgar</strong>.</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
