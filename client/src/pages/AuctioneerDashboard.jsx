import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, LogOut, Disc, PlayCircle, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const AuctioneerDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.tournamentId) {
            fetchTournament();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchTournament = async () => {
        try {
            const res = await axios.get(`/api/tournaments/${user.tournamentId}`);
            setTournament(res.data);
        } catch (err) {
            console.error("Failed to fetch tournament", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const enterConsole = () => {
        navigate(`/admin/console/${tournament._id}`);
    };

    if (loading) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 bg-blue-900/5 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl w-full relative z-10"
            >
                <header className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Hello, {user?.username}</h1>
                            <p className="text-slate-400">Auctioneer Panel</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-all"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </header>

                {tournament ? (
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-32 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-all duration-700" />

                        <div className="relative z-10">
                            <span className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider rounded-full mb-6">
                                Assigned Tournament
                            </span>

                            <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-4">
                                {tournament.name}
                            </h2>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${tournament.status === 'live' ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                                        <span className={`text-lg font-bold ${tournament.status === 'live' ? 'text-green-400' : 'text-slate-300'}`}>
                                            {tournament.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                                    <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Mode</p>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-slate-400" />
                                        <span className="text-lg font-bold text-slate-300 capitalize">
                                            {tournament.auctionType?.replace('_', ' ') || 'Standard'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={enterConsole}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-3 group/btn"
                            >
                                <PlayCircle className="w-6 h-6 group-hover/btn:scale-110 transition-transform" />
                                Enter Auction Console
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-slate-800 border-dashed rounded-3xl p-12 text-center text-slate-500">
                        <Disc className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-semibold mb-2 text-slate-400">No Tournament Assigned</h3>
                        <p>You haven't been assigned to any tournament yet. Please contact the Super Admin.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default AuctioneerDashboard;
