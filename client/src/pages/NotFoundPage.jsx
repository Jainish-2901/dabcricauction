import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Home,
    ArrowLeft,
    Smartphone,
    LogIn,
    Radio,
    HelpCircle,
    Trophy,
    AlertCircle
} from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="relative min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
            <PublicHeader />

            <main className="flex-1 flex items-center justify-center py-12 sm:py-20 px-4">
                <div className="max-w-xl w-full text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-300 text-rose-800 text-xs font-black uppercase tracking-wider mb-6 shadow-2xs">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Error 404 • Page Not Found</span>
                    </div>

                    {/* Big 404 Number Graphic */}
                    <div className="relative mb-6">
                        <span className="text-8xl sm:text-9xl font-black text-slate-950 tracking-tighter block select-none">
                            4<span className="text-blue-600">0</span>4
                        </span>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-sm sm:text-base font-black uppercase tracking-widest text-slate-400/40 bg-slate-50 px-4 py-1 rounded-full border border-slate-200">
                                OUT OF THE STADIUM
                            </span>
                        </div>
                    </div>

                    {/* Heading & Cricket Themed Description */}
                    <h1 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight mb-3">
                        Clean Bowled! This Page Doesn't Exist
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed max-w-md mx-auto mb-8">
                        The auction room, tournament pavilion, or URL you're searching for is either unsold, retired hurt, or has been moved to a new pitch.
                    </p>

                    {/* Quick Action Navigation Grid */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-8">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs border border-slate-300 shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Go Back</span>
                        </button>

                        <Link
                            to="/"
                            className="w-full sm:flex-1 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <Home className="w-4 h-4" />
                            <span>Return to Home</span>
                        </Link>
                    </div>

                    {/* Alternative Helpful Links Box */}
                    <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-300 shadow-2xs max-w-md mx-auto text-left">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-950 block mb-2.5">
                            Looking for one of these pages?
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                            <Link
                                to="/download"
                                className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-900 border border-slate-200 flex items-center gap-2 transition-colors"
                            >
                                <Smartphone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span className="truncate">Download APK</span>
                            </Link>

                            <Link
                                to="/login"
                                className="p-2 rounded-xl bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-900 border border-slate-200 flex items-center gap-2 transition-colors"
                            >
                                <LogIn className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span className="truncate">Sign In Console</span>
                            </Link>

                            <Link
                                to="/about"
                                className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-900 border border-slate-200 flex items-center gap-2 transition-colors"
                            >
                                <Trophy className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                <span className="truncate">About Us</span>
                            </Link>

                            <Link
                                to="/"
                                className="p-2 rounded-xl bg-slate-50 hover:bg-violet-50 hover:text-violet-700 text-slate-900 border border-slate-200 flex items-center gap-2 transition-colors"
                            >
                                <Radio className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                                <span className="truncate">Spectate Live</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <PublicFooter />
        </div>
    );
}
