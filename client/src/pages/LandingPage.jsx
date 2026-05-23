import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Trophy, Users, Activity } from 'lucide-react';
import axios from 'axios';

const LandingPage = () => {
    const navigate = useNavigate();
    const [tournaments, setTournaments] = useState([]);

    useEffect(() => {
        fetchTournaments();
    }, []);

    const fetchTournaments = async () => {
        try {
            const res = await axios.get('/api/tournaments');
            setTournaments(res.data);
        } catch (err) {
            console.error("Failed to fetch tournaments", err);
        }
    };

    return (
        <div className="relative min-h-screen bg-slate-950 text-white overflow-hidden font-sans">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -right-[10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[100px]" />
            </div>

            <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto backdrop-blur-sm bg-slate-900/30 rounded-b-2xl border-b border-white/5 sticky top-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center">
                        <Trophy className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        CricAuction
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <Link to="/login" className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700/50 transition-all text-sm font-medium text-slate-300 hover:text-white">
                        Admin Login
                    </Link>
                </div>
            </nav>

            <main className="relative z-10 container mx-auto px-4 pt-20 pb-32 flex flex-col items-center text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium tracking-wide">
                        PREMIER AUCTION PLATFORM
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                    className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight"
                >
                    Build Your <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400 animate-gradient">
                        Dream Team
                    </span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed"
                >
                    The most advanced platform for managing cricket tournaments and conducting professional live player auctions with real-time bidding.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto"
                >
                    <button
                        onClick={() => document.getElementById('active-auctions').scrollIntoView({ behavior: 'smooth' })}
                        className="group px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
                    >
                        Watch Live Auctions
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </motion.div>

                {/* Stats / Features Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full max-w-5xl"
                >
                    {[
                        { label: 'Real-time Bidding', icon: Activity, desc: 'Instant updates with zero latency sockets' },
                        { label: 'Team Management', icon: Users, desc: 'Complete roster and budget control' },
                        { label: 'Tournament Stats', icon: Trophy, desc: 'Live tracking of sold players and stats' }
                    ].map((item, idx) => (
                        <div key={idx} className="p-6 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm text-left hover:border-blue-500/30 transition-colors">
                            <item.icon className="w-8 h-8 text-blue-400 mb-4" />
                            <h3 className="text-lg font-semibold text-white mb-2">{item.label}</h3>
                            <p className="text-slate-400 text-sm">{item.desc}</p>
                        </div>
                    ))}
                </motion.div>
            </main>

            <section id="active-auctions" className="relative z-10 container mx-auto px-4 py-24 border-t border-white/5">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Active Tournaments</h2>
                        <p className="text-slate-400">Join or watch live bidding events occurring right now.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {tournaments.length > 0 ? tournaments.map((t) => (
                        <div key={t._id} className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer"
                            onClick={() => navigate(`/auction/${t._id}`)}
                        >
                            <div className="h-48 bg-slate-800 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10" />
                                {/* Placeholder for Tournament Image - Could be dynamic if added later */}
                                <div className="absolute inset-0 bg-blue-900/20 group-hover:scale-105 transition-transform duration-700" />
                                <div className="absolute bottom-4 left-4 z-20">
                                    <span className={`px-2 py-1 text-xs rounded-md font-medium flex items-center gap-1 ${t.status === 'live' ? 'bg-green-500/20 text-green-400 border border-green-500/20' : 'bg-slate-500/20 text-slate-400 border border-slate-500/20'}`}>
                                        {t.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                                        {t.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{t.name}</h3>
                                <div className="flex justify-between items-center text-slate-400 text-sm mb-4">
                                    <span>{new Date(t.startDate).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span className="capitalize">{t.auctionType?.replace('_', ' ')}</span>
                                </div>
                                <div className="w-full h-px bg-slate-800 mb-4" />
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-500 text-sm">{t.time ? `Starts at ${t.time}` : 'TBA'}</span>
                                    <span className="text-blue-400 text-sm font-medium">View &rarr;</span>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full py-16 text-center text-slate-500 bg-slate-900/30 rounded-2xl border border-white/5 border-dashed">
                            No active tournaments found at the moment.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
