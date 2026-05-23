import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import { Gavel, SkipForward, ArrowRight, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Connect to socket
const socket = io('http://localhost:5001');

const AdminAuctionConsole = () => {
    const { user } = useAuth();
    const { tournamentId } = useParams();
    const navigate = useNavigate();

    const [tournament, setTournament] = useState(null);
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [currentBid, setCurrentBid] = useState(0);
    const [winningTeam, setWinningTeam] = useState(null);

    // Admin Driven Inputs
    const [adminPrice, setAdminPrice] = useState('');

    useEffect(() => {
        fetchData();

        socket.emit('join_auction', tournamentId);

        socket.on('bid_update', (data) => {
            setCurrentBid(data.amount);
            setWinningTeam(data.team); // Assuming team object is sent
        });

        return () => {
            socket.off('bid_update');
        };
    }, [tournamentId]);

    const fetchData = async () => {
        try {
            const [tRes, pRes, teamRes] = await Promise.all([
                axios.get(`/api/tournaments/${tournamentId}`),
                axios.get(`/api/players/${tournamentId}`),
                axios.get(`/api/teams/${tournamentId}`)
            ]);
            setTournament(tRes.data);
            setPlayers(pRes.data);
            setTeams(teamRes.data);

            // Logic to find current unsold player
            const pending = pRes.data.find(p => p.status === 'pending');
            if (pending) {
                setCurrentPlayer(pending);
                setCurrentBid(pending.basePrice);
                socket.emit('select_player', { tournamentId, playerId: pending._id });
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        socket.on('player_sold', () => {
            alert('Player Sold!');
            nextPlayer();
        });

        return () => socket.off('player_sold');
    }, [players, currentPlayer]);

    const handleSellAtCurrentBid = () => {
        if (!currentPlayer || !winningTeam) {
            alert('No active bid to sell!');
            return;
        }
        socket.emit('sell_player', { playerId: currentPlayer._id, tournamentId });
    };

    const handleAdminSell = async (teamId) => {
        if (!currentPlayer) return;
        if (!adminPrice || adminPrice < currentPlayer.basePrice) {
            alert('Invalid Price');
            return;
        }

        // 1. Place Bid (Server will update DB)
        socket.emit('place_bid', {
            playerId: currentPlayer._id,
            tournamentId,
            bidAmount: adminPrice,
            teamId
        });

        // 2. Sell (Server will finalize)
        setTimeout(() => {
            socket.emit('sell_player', {
                playerId: currentPlayer._id,
                tournamentId
            });
        }, 500);
    };

    const handleUnsold = () => {
        // Mark unsold - In real app, send API call to update status to 'unsold'
        // For now, just skip
        nextPlayer();
    };

    const nextPlayer = () => {
        const idx = players.findIndex(p => p._id === currentPlayer._id);
        if (idx !== -1 && idx < players.length - 1) {
            const next = players[idx + 1];
            setCurrentPlayer(next);
            setCurrentBid(next.basePrice);
            setAdminPrice('');
            socket.emit('select_player', { tournamentId, playerId: next._id });
        } else {
            alert('No more players');
        }
    };

    if (!tournament) return <div className="p-10 text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans p-6">
            <header className="flex justify-between items-center mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        Auction Console: {tournament.name}
                    </h1>
                    <p className="text-sm text-slate-400 capitalize">Mode: {tournament.auctionType?.replace('_', ' ')}</p>
                </div>
                <button onClick={() => navigate(user.role === 'auctioneer' ? '/auctioneer/dashboard' : '/admin')} className="px-4 py-2 bg-slate-800 rounded-lg text-sm text-slate-300 hover:text-white">
                    Back to Dashboard
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
                {/* Player Stage */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                        {currentPlayer ? (
                            <>
                                <div className="w-48 h-48 rounded-full border-4 border-slate-800 overflow-hidden mb-6 shadow-2xl relative">
                                    {currentPlayer.image ? (
                                        <img src={currentPlayer.image} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-600">
                                            <User className="w-20 h-20" />
                                        </div>
                                    )}
                                </div>
                                <h2 className="text-4xl font-bold mb-2">{currentPlayer.name}</h2>
                                <div className="flex gap-2 mb-8">
                                    <span className="px-3 py-1 bg-slate-800 rounded-lg text-sm font-medium border border-slate-700">{currentPlayer.category}</span>
                                    <span className="px-3 py-1 bg-slate-800 rounded-lg text-sm font-medium border border-slate-700">Base: {currentPlayer.basePrice} L</span>
                                </div>

                                {/* Bidding Display */}
                                <div className="text-center p-6 bg-slate-950/50 rounded-2xl w-full max-w-md border border-slate-800">
                                    <div className="text-sm text-slate-500 uppercase tracking-widest font-bold mb-2">Current Bid</div>
                                    <div className={`text-6xl font-black tabular-nums tracking-tight ${currentBid > currentPlayer.basePrice ? 'text-green-400' : 'text-slate-400'}`}>
                                        ₹ {currentBid} <span className="text-2xl font-medium text-slate-600">L</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-slate-500">No Pending Players</div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex justify-between items-center">
                        <button onClick={handleUnsold} className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all">
                            Mark Unsold
                        </button>

                        {tournament.auctionType === 'owner_driven' ? (
                            <button onClick={handleSellAtCurrentBid} className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2">
                                <Gavel className="w-5 h-5" /> Sold to Leader
                            </button>
                        ) : (
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    placeholder="Sold Price"
                                    className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white w-32 focus:border-blue-500 focus:outline-none"
                                    value={adminPrice}
                                    onChange={e => setAdminPrice(e.target.value)}
                                />
                                <span className="text-slate-500">Select Team below to Sell</span>
                            </div>
                        )}

                        <button onClick={nextPlayer} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                            Pass / Next <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Sidebar: Teams or History */}
                <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 overflow-y-auto">
                    <h3 className="text-lg font-bold mb-4">{tournament.auctionType === 'admin_driven' ? 'Select Winning Team' : 'Connected Teams'}</h3>

                    <div className="space-y-3">
                        {teams.map(team => (
                            <button
                                key={team._id}
                                onClick={() => tournament.auctionType === 'admin_driven' && handleAdminSell(team._id)}
                                className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${tournament.auctionType === 'admin_driven' ? 'hover:border-blue-500 hover:bg-blue-500/10 cursor-pointer border-slate-800 bg-slate-800/50' : 'border-state-800 bg-slate-800/30 cursor-default'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center font-bold text-sm">
                                        {team.shortName || team.name?.substring(0, 2)}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-sm text-white">{team.name}</div>
                                        <div className="text-xs text-slate-500">Budget: {team.budget} Cr</div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAuctionConsole;
