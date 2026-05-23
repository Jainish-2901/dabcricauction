import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';
import { User } from 'lucide-react';

const socket = io('http://localhost:5001');

const PublicAuctionView = () => {
    const { tournamentId } = useParams();
    const [tournament, setTournament] = useState(null);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [currentBid, setCurrentBid] = useState(0);
    const [currentLeadTeam, setCurrentLeadTeam] = useState(null);
    const [bidHistory, setBidHistory] = useState([]);
    const [soldLog, setSoldLog] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        fetchTournamentData();

        socket.on('connect', () => setIsConnected(true));
        socket.emit('join_auction', tournamentId);

        socket.on('new_player', (player) => {
            setCurrentPlayer(player);
            setCurrentBid(player.basePrice);
            setCurrentLeadTeam(null);
            setBidHistory([]); // Clear history for new player
        });

        socket.on('bid_update', (data) => {
            setCurrentBid(data.amount);
            setCurrentLeadTeam(data.team);
            setBidHistory(prev => [{
                team: data.team,
                amount: data.amount,
                time: new Date()
            }, ...prev]);
        });

        socket.on('player_sold', (data) => {
            setSoldLog(prev => [{
                player: data.player,
                team: data.team,
                price: data.player.soldPrice || data.player.currentBid
            }, ...prev]);
            setCurrentPlayer(null);
        });

        return () => {
            socket.off('new_player');
            socket.off('bid_update');
            socket.off('player_sold');
            socket.off('connect');
        };
    }, [tournamentId]);

    const fetchTournamentData = async () => {
        try {
            const res = await axios.get(`/api/tournaments/${tournamentId}`);
            setTournament(res.data);

            if (res.data.currentBiddingPlayerId) {
                // Fetch the active player if exists
                const pRes = await axios.get(`/api/players/${tournamentId}`);
                const active = pRes.data.find(p => p._id === res.data.currentBiddingPlayerId);
                if (active) {
                    setCurrentPlayer(active);
                    setCurrentBid(active.currentBid || active.basePrice);
                    if (active.currentLeadTeamId) {
                        // We might need to fetch team details if not populated, 
                        // but standard populate in Player model might handle it? 
                        // If not, we might need a separate fetch or find in a teams list.
                        // For now, let's assume we can get it or handle it gracefully.
                        // Actually, let's fetch teams to be safe.
                        fetchTeams(active.currentLeadTeamId);
                    }
                }
            }
        } catch (err) {
            console.error("Failed to load auction data", err);
        }
    };

    const fetchTeams = async (leadTeamId) => {
        try {
            // If leadTeamId is just an ID, we need to find the team object.
            // But 'currentLeadTeamId' in player might be ObjectId.
            const tRes = await axios.get(`/api/teams/${tournamentId}`);
            const lead = tRes.data.find(t => t._id === leadTeamId);
            if (lead) setCurrentLeadTeam(lead);
        } catch (e) { console.error(e); }
    }


    if (!tournament) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading Auction...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-8">
            {/* Header */}
            <header className="flex justify-between items-center mb-10 max-w-7xl mx-auto">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        {tournament.name}
                    </h1>
                    <p className="text-slate-500 text-sm">Live Auction Feed</p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-red-400 font-mono text-xs font-bold tracking-wider uppercase">
                        {isConnected ? 'Live Connected' : 'Connecting...'}
                    </span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
                {/* Main Player Card */}
                <div className="lg:col-span-8">
                    <div className="relative bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 overflow-hidden shadow-2xl shadow-blue-900/10 min-h-[500px] flex flex-col justify-center">

                        {currentPlayer ? (
                            <>
                                <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-9xl text-white select-none pointer-events-none">
                                    {currentPlayer.name.substring(0, 2)}
                                </div>

                                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
                                    <div className="w-48 h-48 md:w-64 md:h-64 rounded-full border-4 border-slate-800 p-2 shadow-2xl bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden">
                                        {currentPlayer.image ? (
                                            <img src={currentPlayer.image} alt={currentPlayer.name} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-600"><User className="w-20 h-20" /></div>
                                        )}
                                    </div>

                                    <div className="flex-1 text-center md:text-left pt-4">
                                        <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider mb-4">
                                            {currentPlayer.category}
                                        </div>
                                        <h2 className="text-4xl md:text-6xl font-bold mb-2 tracking-tight">{currentPlayer.name}</h2>
                                        {/* <p className="text-xl text-slate-400 mb-8 font-light">{currentPlayer.role} • {currentPlayer.style}</p> */}

                                        <div className="grid grid-cols-3 gap-4 mb-4 mt-6">
                                            {/* Dynamic stats can go here if part of player model, currently just category/basePrice available in minimal model */}
                                            <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
                                                <div className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-2">Base Price</div>
                                                <div className="text-2xl font-bold">₹ {currentPlayer.basePrice} L</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Bidding Area */}
                                <div className="mt-8 border-t border-slate-800 pt-8">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                        <div>
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Current Bid</p>
                                            <div className="text-6xl font-black text-green-400 tabular-nums tracking-tight animate-in fade-in slide-in-from-bottom-2">
                                                ₹ {currentBid} <span className="text-2xl text-green-500/50">L</span>
                                            </div>
                                        </div>

                                        {currentLeadTeam ? (
                                            <div className="flex items-center gap-6 bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-400 uppercase font-bold mb-1">Winning Team</p>
                                                    <p className="text-xl font-bold text-white leading-none">{currentLeadTeam.name}</p>
                                                </div>
                                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-indigo-500/20 border border-white/10 overflow-hidden">
                                                    {currentLeadTeam.logo ? <img src={currentLeadTeam.logo} className="w-full h-full object-cover" /> : (currentLeadTeam.shortName || 'TM')}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-4 opacity-50">
                                                Waiting for bids...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center opacity-50 py-20">
                                <h2 className="text-3xl font-bold text-slate-600 mb-2">Waiting for next player...</h2>
                                <p className="text-slate-500">The auctioneer is selecting the next player.</p>
                            </div>
                        )}
                    </div>

                    {/* Live Ticker - Sold Log */}
                    {soldLog.length > 0 && (
                        <div className="mt-8 overflow-hidden relative group">
                            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10" />
                            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10" />
                            <div className="flex gap-4 animate-scroll whitespace-nowrap overflow-x-auto pb-4">
                                {soldLog.map((log, i) => (
                                    <div key={i} className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 px-4 py-2 rounded-full text-sm text-slate-400 min-w-max">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                                        <strong>Sold:</strong> {log.player.name} to {log.team.name} for ₹ {log.price} L
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar - Recent Activity */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Recent Bids */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-[500px] flex flex-col shadow-xl">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            Bid History
                        </h3>
                        {bidHistory.length > 0 ? (
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                {bidHistory.map((bid, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-800/50 rounded-xl hover:bg-slate-800/50 transition-colors animate-in slide-in-from-right-2 fade-in duration-300">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-lg bg-slate-700 overflow-hidden">
                                                {bid.team?.logo ? <img src={bid.team.logo} className="w-full h-full object-cover" /> : (bid.team?.shortName || 'TM')}
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-200 block text-sm">{bid.team?.name || 'Unknown Team'}</span>
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{bid.time.toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                        <span className="font-mono text-green-400 font-bold">₹ {bid.amount} L</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-600 italic">
                                No bids yet.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicAuctionView;
