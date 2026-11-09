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
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700 font-medium">Loading Auctioneer Panel...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-6 md:p-12 flex flex-col items-center justify-center relative">
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl w-full relative z-10"
            >
                <header className="flex justify-between items-center mb-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold text-slate-900">Hello, {user?.username}</h1>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Official Auctioneer Console</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-all flex items-center gap-1.5"
                        title="Logout"
                    >
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                </header>

                {tournament ? (
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden">
                        <span className="inline-block px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full mb-4">
                            Assigned Tournament
                        </span>

                        <h2 className="text-3xl font-extrabold text-slate-900 mb-6">
                            {tournament.name}
                        </h2>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Status</p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2.5 h-2.5 rounded-full ${tournament.status === 'live' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                    <span className={`text-base font-extrabold ${tournament.status === 'live' ? 'text-emerald-700' : 'text-slate-700'}`}>
                                        {tournament.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                                <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Auction Type</p>
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-slate-500" />
                                    <span className="text-base font-extrabold text-slate-700 capitalize">
                                        {tournament.auctionType?.replace('_', ' ') || 'Standard'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={enterConsole}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-base shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                        >
                            <PlayCircle className="w-5 h-5" />
                            Launch Auctioneer Console
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-slate-200 border-dashed rounded-3xl p-12 text-center text-slate-500">
                        <Disc className="w-16 h-16 mx-auto mb-4 text-slate-300" />
                        <h3 className="text-xl font-bold mb-2 text-slate-700">No Tournament Assigned</h3>
                        <p className="text-sm">You haven't been assigned to any active tournament yet. Please contact the Super Admin.</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default AuctioneerDashboard;
