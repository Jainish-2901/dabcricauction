import React, { useState, useEffect, useRef } from 'react';
import { Gavel, Users, Wallet, Shield, LogOut, ArrowUpCircle, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io('http://localhost:5001');

const OwnerDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [teamData, setTeamData] = useState(null);
    const [squad, setSquad] = useState([]);
    const [otherTeams, setOtherTeams] = useState([]);
    const [tournament, setTournament] = useState(null);

    // Auction State
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [currentBid, setCurrentBid] = useState(0);
    const [currentLeadTeam, setCurrentLeadTeam] = useState(null);
    const [isMyTurn, setIsMyTurn] = useState(false);
    const lastBidTime = useRef(0);

    useEffect(() => {
        if (user?.teamId) {
            fetchTeamData();
            fetchSquad();
        }
        if (user?.tournamentId) {
            fetchTournament();
            fetchOtherTeams();

            // Socket setup
            socket.emit('join_auction', user.tournamentId);

            socket.on('new_player', (player) => {
                setCurrentPlayer(player);
                setCurrentBid(player.basePrice);
                setCurrentLeadTeam(null);
            });

            socket.on('bid_update', (data) => {
                setCurrentBid(data.amount);
                setCurrentLeadTeam(data.team);
            });

            socket.on('player_sold', (data) => {
                const myTeamId = typeof user.teamId === 'object' ? user.teamId._id : user.teamId;

                // Always fetch my data if I was involved, or just fetch all to be safe
                if (data.team._id === myTeamId) {
                    fetchTeamData();
                    fetchSquad();
                } else {
                    // Update purse of competitors
                    fetchTeamData();
                }
                setCurrentPlayer(null);
            });
        }

        return () => {
            socket.off('new_player');
            socket.off('bid_update');
            socket.off('player_sold');
        };
    }, [user]);

    const fetchTournament = async () => {
        try {
            const res = await axios.get(`/api/tournaments/${user.tournamentId}`);
            setTournament(res.data);
        } catch (err) {
            console.error("Failed to fetch tournament", err);
        }
    };

    const fetchTeamData = async () => {
        try {
            const teamId = typeof user.teamId === 'object' ? user.teamId._id : user.teamId;
            // Fetch fresh team data
            const allTeamsRes = await axios.get(`/api/teams/${user.tournamentId}`);
            const myTeam = allTeamsRes.data.find(t => t._id === teamId);
            setTeamData(myTeam);
            setOtherTeams(allTeamsRes.data.filter(t => t._id !== teamId));
        } catch (err) {
            console.error("Failed to fetch team data", err);
        }
    };

    const fetchSquad = async () => {
        try {
            const teamId = typeof user.teamId === 'object' ? user.teamId._id : user.teamId;
            const res = await axios.get(`/api/players/${user.tournamentId}`);
            const mySquad = res.data.filter(p => p.soldToTeamId === teamId);
            setSquad(mySquad);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchOtherTeams = async () => {
        // Handled in fetchTeamData
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const placeBid = (increment) => {
        if (!currentPlayer || !teamData) return;

        const newBid = currentBid + increment;

        // Basic Validations
        if (newBid > (teamData.budget - teamData.spent)) {
            alert("Insufficient Budget!");
            return;
        }

        if (tournament && squad.length >= (tournament.squadSizeLimit || 25)) {
            alert("Squad Full!");
            return;
        }

        // Anti-spam / Debounce
        const now = Date.now();
        if (now - lastBidTime.current < 500) return;
        lastBidTime.current = now;

        const teamId = typeof user.teamId === 'object' ? user.teamId._id : user.teamId;

        socket.emit('place_bid', {
            playerId: currentPlayer._id,
            tournamentId: user.tournamentId,
            bidAmount: newBid,
            teamId: teamId
        });
    };

    if (!user?.teamId) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">No Team Assigned</div>;
    if (!teamData) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Team Data...</div>;

    const remainingPurse = teamData.budget - teamData.spent;
    const myTeamId = typeof user.teamId === 'object' ? user.teamId._id : user.teamId;
    const isLeading = currentLeadTeam === myTeamId || currentLeadTeam?._id === myTeamId;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-6">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-900/20 uppercase overflow-hidden">
                        {teamData.logo ? (
                            <img src={teamData.logo} alt={teamData.name} className="w-full h-full object-cover" />
                        ) : (
                            teamData.shortName || teamData.name?.substring(0, 2)
                        )}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{teamData.name}</h1>
                        <p className="text-sm text-slate-400 flex items-center gap-2">
                            <Shield className="w-3 h-3" /> Owner Dashboard
                        </p>
                    </div>
                </div>

                <div className="flex gap-4 md:gap-12 w-full md:w-auto justify-between md:justify-end bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 items-center">
                    <div className="text-center md:text-right">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Purse Remaining</p>
                        <p className="text-2xl md:text-3xl font-black text-green-400 tabular-nums">₹ {remainingPurse} <span className="text-lg text-green-500/50">Cr</span></p>
                    </div>
                    <div className="w-px bg-slate-800 mx-2 hidden md:block h-10" />
                    <div className="text-center md:text-right">
                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Squad Size</p>
                        <p className="text-2xl md:text-3xl font-bold tabular-nums">{squad.length} <span className="text-lg text-slate-600">/ {tournament?.squadSizeLimit || 25}</span></p>
                    </div>
                    <button onClick={handleLogout} className="ml-4 p-3 bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-all" title="Logout">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Live Auction Feed - Center Stage */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl flex flex-col items-center justify-center min-h-[400px]">
                        <div className="absolute top-0 right-0 p-6 z-10">
                            <span className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full text-xs font-bold animate-pulse">
                                <span className="w-2 h-2 bg-red-500 rounded-full" />
                                LIVE AUCTION
                            </span>
                        </div>

                        {currentPlayer ? (
                            <div className="w-full max-w-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                <div className="w-40 h-40 rounded-full border-4 border-slate-800 overflow-hidden mb-6 shadow-2xl relative group">
                                    {currentPlayer.image ? (
                                        <img src={currentPlayer.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600"><User className="w-16 h-16" /></div>
                                    )}
                                </div>
                                <h2 className="text-4xl font-bold mb-2 text-white">{currentPlayer.name}</h2>
                                <div className="flex gap-3 mb-8">
                                    <span className="px-3 py-1 bg-slate-800 rounded-lg text-sm font-medium border border-slate-700 text-slate-400">{currentPlayer.category}</span>
                                    <span className="px-3 py-1 bg-slate-800 rounded-lg text-sm font-medium border border-slate-700 text-slate-400">Base: {currentPlayer.basePrice} L</span>
                                </div>

                                {/* Bid Status & Controls */}
                                <div className={`w-full p-6 rounded-2xl border ${isLeading ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-950/50 border-slate-800'} transition-all duration-300`}>

                                    <div className="text-center mb-6">
                                        <div className="text-sm text-slate-500 uppercase tracking-widest font-bold mb-2">Current Highest Bid</div>
                                        <div className={`text-5xl font-black tabular-nums tracking-tight ${isLeading ? 'text-green-500' : 'text-white'}`}>
                                            ₹ {currentBid} <span className="text-xl font-medium text-slate-600">L</span>
                                        </div>
                                        {currentLeadTeam && (
                                            <div className={`mt-2 text-sm font-bold ${isLeading ? 'text-green-400' : 'text-slate-400'}`}>
                                                {isLeading ? 'You are leading!' : `Held by: ${currentLeadTeam.name || 'Competitor'}`}
                                            </div>
                                        )}
                                    </div>

                                    {tournament?.auctionType === 'admin_driven' ? (
                                        <div className="text-center py-6 px-4 bg-blue-500/5 rounded-xl border border-blue-500/20 italic text-blue-400">
                                            This is an Admin-driven auction. The auctioneer will place bids on your behalf.
                                        </div>
                                    ) : (
                                        <>
                                            {!isLeading && (
                                                <div className="grid grid-cols-3 gap-3">
                                                    <button onClick={() => placeBid(20)} className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-lg transition-all flex flex-col items-center border border-slate-700">
                                                        <span className="text-xs text-slate-400 uppercase">Bid</span>
                                                        <span className="text-lg">+20 L</span>
                                                    </button>
                                                    <button onClick={() => placeBid(50)} className="py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex flex-col items-center">
                                                        <span className="text-xs text-blue-200 uppercase">Bid</span>
                                                        <span className="text-xl">+50 L</span>
                                                    </button>
                                                    <button onClick={() => placeBid(100)} className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow-lg transition-all flex flex-col items-center border border-slate-700">
                                                        <span className="text-xs text-slate-400 uppercase">Bid</span>
                                                        <span className="text-lg">+1 Cr</span>
                                                    </button>
                                                </div>
                                            )}
                                            {isLeading && (
                                                <div className="text-center py-4 text-green-500 font-bold bg-green-500/10 rounded-xl border border-green-500/20 animate-pulse">
                                                    You currently hold the highest bid!
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center opacity-50">
                                <Gavel className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                                <h2 className="text-2xl font-bold text-slate-500">Waiting for Auctioneer...</h2>
                                <p className="text-slate-600">The next player will appear here when the auction starts.</p>
                            </div>
                        )}
                    </div>

                    {/* My Squad */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-400" />
                                My Squad
                            </h3>
                            <div className="text-sm text-slate-400 hidden sm:block">
                                Current Squad Information
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-slate-950 text-slate-500 uppercase tracking-wider text-xs font-bold">
                                    <tr>
                                        <th className="p-4 rounded-tl-xl border-b border-slate-800">Player</th>
                                        <th className="p-4 border-b border-slate-800">Role</th>
                                        <th className="p-4 rounded-tr-xl text-right border-b border-slate-800">Price</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {squad.length > 0 ? squad.map(p => (
                                        <tr key={p._id} className="hover:bg-slate-800/30 transition-colors group">
                                            <td className="p-4 font-medium flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                                                    {p.image ? <img src={p.image} className="w-full h-full object-cover" /> : null}
                                                </div>
                                                <span className="group-hover:text-blue-400 transition-colors">{p.name}</span>
                                            </td>
                                            <td className="p-4 text-slate-400">{p.category}</td>
                                            <td className="p-4 text-right font-mono text-slate-300 font-bold">₹ {p.soldPrice} L</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="3" className="p-8 text-center text-slate-500 italic">No players purchased yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar - Competitors */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                        <h3 className="font-bold mb-6 flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-green-400" />
                            Team Purses
                        </h3>
                        <div className="space-y-3">
                            {otherTeams.map(t => (
                                <div key={t._id} className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-800/50 rounded-2xl hover:bg-slate-800/80 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-lg bg-slate-700 uppercase overflow-hidden">
                                            {t.logo ? (
                                                <img src={t.logo} alt={t.name} className="w-full h-full object-cover" />
                                            ) : (
                                                t.shortName?.substring(0, 3) || t.name.substring(0, 2)
                                            )}
                                        </div>
                                        <div>
                                            <span className="font-bold text-sm block">{t.name}</span>
                                        </div>
                                    </div>
                                    <span className="font-mono text-green-400 font-bold text-sm bg-green-500/10 px-2 py-1 rounded-md border border-green-500/20">₹ {t.budget - t.spent} Cr</span>
                                </div>
                            ))}
                            {otherTeams.length === 0 && <div className="text-center text-slate-500">No other teams.</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OwnerDashboard;
