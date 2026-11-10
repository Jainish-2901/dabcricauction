import React, { useState, useEffect } from 'react';
import { 
    Plus, Trash2, Edit, Users, Trophy, Settings, LogOut, Shield, 
    User, Layers, PlayCircle, Key, Eye, FileText, ExternalLink, Copy, Check,
    Sparkles, Radio, ChevronRight, Activity, ArrowRight, Crown, X, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CreateTournamentModal from '../components/CreateTournamentModal';
import AddPlayerModal from '../components/AddPlayerModal';
import AddTeamModal from '../components/AddTeamModal';
import AddUserModal from '../components/AddUserModal';
import SlotManagerModal from '../components/SlotManagerModal';
import TournamentHubModal from '../components/TournamentHubModal';
import ManageCredentialsModal from '../components/ManageCredentialsModal';
import { useAuth } from '../context/AuthContext';
import { getBudgetUnits } from '../utils/currency';
import toast from '../lib/toast';
import SafeImage from '../components/SafeImage';

const SuperAdminDashboard = () => {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('tournaments');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showSlotModal, setShowSlotModal] = useState(false);
    const [showHubModal, setShowHubModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [selectedTeamForRoster, setSelectedTeamForRoster] = useState(null);

    const [tournaments, setTournaments] = useState([]);
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]);

    const [selectedTournament, setSelectedTournament] = useState(null);
    const [hubTournament, setHubTournament] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const navigate = useNavigate();

    const { largeUnit, smallUnit } = getBudgetUnits(selectedTournament);

    const retainedCaptains = (teams || [])
        .filter(t => t.isOwnerCaptain)
        .map(t => {
            const user = (users || []).find(u => ((u.teamId?._id || u.teamId) === (t._id || t.id)) && u.role === 'team_owner');
            const alreadyInPlayers = (players || []).find(
                p => (p.isCaptain || String(p._id || '').startsWith('pl_cap_')) && (p.soldToTeamId === t._id || p.soldToTeamId === t.id)
            );
            if (alreadyInPlayers) return null;

            return {
                _id: `owner_cap_${t._id}`,
                name: t.captainName || user?.captainName || user?.name || user?.username || `${t.name} Captain`,
                image: t.captainPhoto || user?.captainPhoto || '',
                category: user?.category || 'Captain (All-Rounder)',
                battingStyle: user?.battingStyle || 'Right-Hand Bat',
                bowlingStyle: user?.bowlingStyle || 'Right-Arm Medium',
                basePrice: t.captainPrice || 15,
                soldPrice: t.captainPrice || 15,
                status: 'retained',
                isCaptain: true,
                isDirectOwnerCaptain: true,
                soldToTeamId: t._id,
                soldToTeamName: t.name,
                teamCode: t.shortName,
                cricHeroesProfileUrl: user?.cricHeroesProfileUrl || '',
                age: user?.age || ''
            };
        })
        .filter(Boolean);

    const allDisplayPlayers = [...retainedCaptains, ...(players || [])];

    useEffect(() => {
        fetchTournaments();
    }, []);

    useEffect(() => {
        if (selectedTournament) {
            fetchPlayers();
            fetchTeams();
            fetchUsers();
        }
    }, [activeTab, selectedTournament]);

    const fetchTournaments = async () => {
        try {
            const res = await axios.get('/api/tournaments');
            if (Array.isArray(res.data)) {
                setTournaments(res.data);
                if (!selectedTournament && res.data.length > 0) {
                    setSelectedTournament(res.data[0]);
                }
            }
        } catch (err) {
            console.error(err);
            setTournaments([]);
        }
    };

    const fetchPlayers = async () => {
        if (!selectedTournament) return;
        try {
            const res = await axios.get(`/api/players/${selectedTournament._id}`);
            setPlayers(res.data || []);
        } catch (err) {
            console.error(err);
            setPlayers([]);
        }
    };

    const fetchTeams = async () => {
        if (!selectedTournament) return;
        try {
            const res = await axios.get(`/api/teams/${selectedTournament._id}`);
            setTeams(res.data || []);
        } catch (err) {
            console.error(err);
            setTeams([]);
        }
    };

    const fetchUsers = async () => {
        if (!selectedTournament) return;
        try {
            const res = await axios.get(`/api/auth/users/${selectedTournament._id}`);
            setUsers(res.data || []);
        } catch (err) {
            console.log("Fetch users error", err);
        }
    };

    const handleDelete = async (type, id, itemName = '') => {
        const confirmMsg = type === 'tournament'
            ? `Are you sure you want to permanently delete tournament "${itemName || id}"?\n\nThis will permanently delete the tournament, all its teams, players, credentials, and slots. This action cannot be undone.`
            : 'Are you sure you want to delete this item? This action cannot be undone.';

        if (!window.confirm(confirmMsg)) return;
        try {
            if (type === 'tournament') {
                await axios.delete(`/api/tournaments/${id}`);
                fetchTournaments();
                if (selectedTournament?._id === id) setSelectedTournament(null);
            } else if (type === 'player') {
                await axios.delete(`/api/players/${id}`);
                fetchPlayers();
                fetchTeams();
                fetchUsers();
            } else if (type === 'team') {
                await axios.delete(`/api/teams/${id}`);
                fetchTeams();
            } else if (type === 'user') {
                await axios.delete(`/api/auth/users/${id}`);
                fetchUsers();
            }
        } catch (err) {
            toast.error('Failed to delete item: ' + (err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const handleOpenHub = (tournament) => {
        setHubTournament(tournament);
        setSelectedTournament(tournament);
        setShowHubModal(true);
    };

    const handleManageRoster = (tournament) => {
        setSelectedTournament(tournament);
        setActiveTab('players');
    };

    const handleOpenCredentials = (tournament) => {
        setHubTournament(tournament);
        setSelectedTournament(tournament);
        // Ensure teams are loaded for credentials
        axios.get(`/api/teams/${tournament._id}`).then(res => setTeams(res.data || [])).catch(() => {});
        setShowCredentialsModal(true);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const [editUser, setEditUser] = useState(null);
    const [editPlayer, setEditPlayer] = useState(null);
    const [editTeam, setEditTeam] = useState(null);
    const [editTournament, setEditTournament] = useState(null);

    const handleEditTournament = (tournament) => {
        setEditTournament(tournament);
        setShowCreateModal(true);
    };

    const handleToggleTournamentStatus = async (e, t) => {
        if (e) e.stopPropagation();
        // Cycle status: active -> completed -> inactive -> active
        const newStatus = (t.status === 'active' || t.status === 'live') 
            ? 'completed' 
            : t.status === 'completed' 
            ? 'inactive' 
            : 'active';
        try {
            await axios.put(`/api/tournaments/${t._id}`, { status: newStatus });
            fetchTournaments();
            if (hubTournament?._id === t._id) {
                setHubTournament(prev => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (err) {
            toast.error('Failed to update tournament status');
        }
    };

    const handleExportCSV = (tournamentId) => {
        window.open(`/api/tournaments/${tournamentId}/export-players-csv`, '_blank');
    };

    const handleExportSummaryCSV = (tournamentId) => {
        window.open(`/api/tournaments/${tournamentId}/export-teams-summary-csv`, '_blank');
    };

    const handleCopy = (e, text, id) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success('Copied to clipboard!');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const liveCount = tournaments.filter(t => t.status === 'live' || t.status === 'active').length;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
            <CreateTournamentModal
                isOpen={showCreateModal}
                onClose={() => { setEditTournament(null); setShowCreateModal(false); }}
                onCreated={fetchTournaments}
                initialData={editTournament}
                isEdit={!!editTournament}
            />

            {/* Hub Modal on Tournament Click */}
            <TournamentHubModal
                isOpen={showHubModal}
                onClose={() => setShowHubModal(false)}
                tournament={hubTournament}
                onEditTournament={handleEditTournament}
                onManageRoster={handleManageRoster}
                onOpenCredentials={handleOpenCredentials}
                onOpenSlots={(t) => { setSelectedTournament(t); setShowSlotModal(true); }}
                onDeleteTournament={(t) => handleDelete('tournament', t._id, t.name)}
                onToggleStatus={async (t, status) => {
                    try {
                        await axios.put(`/api/tournaments/${t._id}`, { status });
                        fetchTournaments();
                        setHubTournament(prev => prev ? { ...prev, status } : null);
                        toast.success('Tournament status updated');
                    } catch (e) {
                        toast.error('Failed to update tournament status');
                    }
                }}
            />

            {/* Manage Credentials Modal with full CRUD & Tournament Switcher */}
            <ManageCredentialsModal
                isOpen={showCredentialsModal}
                onClose={() => {
                    setShowCredentialsModal(false);
                    fetchTeams();
                    fetchPlayers();
                    fetchUsers();
                }}
                onUpdated={() => {
                    fetchTeams();
                    fetchPlayers();
                    fetchUsers();
                }}
                tournament={hubTournament || selectedTournament}
                tournaments={tournaments}
                onSelectTournament={(t) => {
                    setSelectedTournament(t);
                    setHubTournament(t);
                }}
                teams={teams}
            />

            {/* Team Squad & Sold Prices Modal */}
            {selectedTeamForRoster && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm overflow-hidden border border-slate-100 shrink-0">
                                    <SafeImage
                                        src={selectedTeamForRoster.logo}
                                        alt={selectedTeamForRoster.name}
                                        className="w-full h-full object-contain bg-white p-1"
                                        fallback={selectedTeamForRoster.shortName || selectedTeamForRoster.name.substring(0, 3).toUpperCase()}
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-black text-slate-900">{selectedTeamForRoster.name}</h3>
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-md uppercase">
                                            {selectedTeamForRoster.shortName}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                        Tournament Squad Roster & Acquisition Sold Prices
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedTeamForRoster(null)}
                                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Financial Snapshot */}
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 bg-white rounded-2xl border border-slate-200/80">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Budget</span>
                                <div className="text-base font-black text-slate-900 mt-0.5">₹{selectedTeamForRoster.budget || 100} {largeUnit}</div>
                            </div>
                            <div className="p-3 bg-white rounded-2xl border border-slate-200/80">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Spent</span>
                                <div className="text-base font-black text-rose-600 mt-0.5">₹{selectedTeamForRoster.spent || 0} {largeUnit}</div>
                            </div>
                            <div className="p-3 bg-white rounded-2xl border border-slate-200/80">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining Purse</span>
                                <div className="text-base font-black text-emerald-600 mt-0.5">
                                    ₹{Math.max(0, (selectedTeamForRoster.budget || 100) - (selectedTeamForRoster.spent || 0)).toFixed(2)} {largeUnit}
                                </div>
                            </div>
                            <div className="p-3 bg-white rounded-2xl border border-slate-200/80">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Squad Size</span>
                                <div className="text-base font-black text-blue-600 mt-0.5">
                                    {players.filter(p => (p.soldToTeamId === selectedTeamForRoster._id || p.soldToTeamId === selectedTeamForRoster.id) && !p.isCaptain && !String(p._id || '').startsWith('pl_cap_')).length + (selectedTeamForRoster.isOwnerCaptain ? 1 : 0)} / {selectedTournament?.squadSizeLimit || 25}
                                </div>
                            </div>
                        </div>

                        {/* Squad Players List */}
                        <div className="p-6 overflow-y-auto space-y-3 flex-1">
                            {/* Retained Owner-Captain row if applicable */}
                            {selectedTeamForRoster.isOwnerCaptain && (() => {
                                const ownerUser = users.find(u => ((u.teamId?._id || u.teamId) === (selectedTeamForRoster._id || selectedTeamForRoster.id)) && u.role === 'team_owner');
                                const capName = selectedTeamForRoster.captainName || ownerUser?.captainName || ownerUser?.name || ownerUser?.username || 'Team Owner & Captain';
                                return (
                                    <div className="p-4 bg-amber-50/80 border border-amber-300 rounded-2xl flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs overflow-hidden shrink-0">
                                                <SafeImage
                                                    src={selectedTeamForRoster.captainPhoto || ownerUser?.captainPhoto}
                                                    alt={capName}
                                                    className="w-full h-full object-cover"
                                                    fallback={<Crown className="w-5 h-5" />}
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs font-bold text-amber-700 uppercase">Captain:</span>
                                                    <h4 className="text-sm font-black text-slate-900">
                                                        {capName}
                                                    </h4>
                                                    <span className="px-2 py-0.5 bg-amber-200/80 text-amber-900 text-[10px] font-black rounded-md">
                                                        👑 DIRECT RETAINED
                                                    </span>
                                                </div>
                                                <span className="text-xs text-amber-800 font-semibold">
                                                    Direct Squad Allocation • Auto-Deducted from Team Budget
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-amber-700 uppercase block">Retention Fee</span>
                                            <div className="text-sm font-black text-amber-900">₹{selectedTeamForRoster.captainPrice || 0}{smallUnit}</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Acquired Players via Auction */}
                            {(() => {
                                const teamSquad = players.filter(p => 
                                    (p.soldToTeamId === selectedTeamForRoster._id || p.soldToTeamId === selectedTeamForRoster.id || (selectedTeamForRoster.players && selectedTeamForRoster.players.includes(p._id))) &&
                                    !p.isCaptain
                                );

                                if (teamSquad.length === 0 && !selectedTeamForRoster.isOwnerCaptain) {
                                    return (
                                        <div className="py-12 text-center text-slate-400">
                                            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                            <p className="font-bold text-sm text-slate-600">No players acquired yet.</p>
                                            <p className="text-xs text-slate-400 mt-1">Players bought during the live auction will appear here with their sold price.</p>
                                        </div>
                                    );
                                }

                                return teamSquad.map((player, idx) => (
                                    <div key={player._id || idx} className="p-3.5 bg-white border border-slate-200/90 rounded-2xl flex items-center justify-between shadow-2xs hover:border-blue-300 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                                                <SafeImage
                                                    src={player.image}
                                                    alt={player.name}
                                                    className="w-full h-full object-cover"
                                                    fallback={<User className="w-5 h-5 text-slate-400" />}
                                                />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-slate-900">{player.name}</h4>
                                                <div className="text-xs text-slate-500 font-semibold mt-0.5">
                                                    {player.category} • {player.battingStyle || 'Right-Hand Bat'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-right">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Base Price</span>
                                                <div className="text-xs font-bold text-slate-600">₹{player.basePrice || 0}{smallUnit}</div>
                                            </div>
                                            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                                                <span className="text-[9px] font-black text-emerald-700 uppercase block">Sold Price</span>
                                                <div className="text-sm font-black text-emerald-700">₹{player.soldPrice || player.currentBid || 0}{smallUnit}</div>
                                            </div>
                                            {player.cricHeroesProfileUrl && (
                                                <a
                                                    href={player.cricHeroesProfileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl text-xs font-bold"
                                                    title="View CricHeroes Profile"
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-3xl">
                            <span className="text-xs text-slate-500 font-semibold">
                                Total Acquired: {players.filter(p => p.soldToTeamId === selectedTeamForRoster._id || p.soldToTeamId === selectedTeamForRoster.id).length} players
                            </span>
                            <button
                                onClick={() => setSelectedTeamForRoster(null)}
                                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {selectedTournament && (
                <>
                    <AddPlayerModal
                        isOpen={showPlayerModal}
                        onClose={() => { setEditPlayer(null); setShowPlayerModal(false); }}
                        tournamentId={selectedTournament._id}
                        onAdded={() => {
                            fetchPlayers();
                            fetchTeams();
                            fetchUsers();
                        }}
                        initialData={editPlayer}
                        isEdit={!!editPlayer}
                    />
                    <AddTeamModal
                        isOpen={showTeamModal}
                        onClose={() => { setEditTeam(null); setShowTeamModal(false); }}
                        tournamentId={selectedTournament._id}
                        tournament={selectedTournament}
                        onAdded={() => {
                            fetchTeams();
                            fetchPlayers();
                            fetchUsers();
                        }}
                        initialData={editTeam}
                        isEdit={!!editTeam}
                    />
                    <AddUserModal
                        isOpen={showUserModal}
                        onClose={() => { setEditUser(null); setShowUserModal(false); }}
                        tournamentId={selectedTournament._id}
                        onAdded={fetchUsers}
                        initialData={editUser}
                        isEdit={!!editUser}
                    />
                    <SlotManagerModal
                        isOpen={showSlotModal}
                        onClose={() => setShowSlotModal(false)}
                        tournament={selectedTournament}
                        tournamentId={selectedTournament._id}
                        tournamentName={selectedTournament?.name}
                        onUpdated={fetchPlayers}
                    />
                </>
            )}

            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-slate-200/90 flex flex-col shrink-0 shadow-xs">
                {/* Brand Header */}
                <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                    <img src="/logo.png" alt="Dab Cric Auction" className="w-10 h-10 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-sm" />
                    <div>
                        <h2 className="text-base font-black text-slate-900 tracking-tight leading-tight">Dab Cric Auction</h2>
                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Executive Portal
                        </span>
                    </div>
                </div>

                {/* Primary Navigation */}
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    <button
                        onClick={() => { setActiveTab('tournaments'); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-extrabold text-xs transition-all ${
                            activeTab === 'tournaments' 
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30' 
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Trophy className="w-4 h-4" />
                            <span>Tournaments Hub</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            activeTab === 'tournaments' ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                            {tournaments.length}
                        </span>
                    </button>

                    {/* Active Tournament Scoped Section */}
                    {selectedTournament && (
                        <div className="pt-4 mt-3 border-t border-slate-100">
                            <div className="px-3 pb-2 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    ACTIVE TOURNAMENT
                                </span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl mb-3">
                                <h4 className="font-extrabold text-xs text-slate-900 truncate" title={selectedTournament.name}>
                                    {selectedTournament.name}
                                </h4>
                                <p className="text-[11px] text-slate-500 font-medium capitalize mt-0.5">
                                    {selectedTournament.status} • {selectedTournament.auctionType?.replace('_', ' ') || 'owner driven'}
                                </p>
                            </div>

                            <div className="space-y-1">
                                <button
                                    onClick={() => { setActiveTab('teams'); fetchTeams(); }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                                        activeTab === 'teams' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'text-slate-600 hover:bg-slate-100/70'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Shield className="w-4 h-4 text-blue-600" />
                                        <span>Teams Roster</span>
                                    </div>
                                    <span className="text-[10px] font-extrabold text-slate-400">({teams.length})</span>
                                </button>

                                <button
                                    onClick={() => { setActiveTab('players'); fetchPlayers(); }}
                                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                                        activeTab === 'players' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'text-slate-600 hover:bg-slate-100/70'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Users className="w-4 h-4 text-blue-600" />
                                        <span>Players Pool</span>
                                    </div>
                                    <span className="text-[10px] font-extrabold text-slate-400">({allDisplayPlayers.length})</span>
                                </button>

                                <button
                                    onClick={() => setShowSlotModal(true)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all text-purple-900 bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/70"
                                >
                                    <Layers className="w-4 h-4 text-purple-600" />
                                    <span>Manage Slots / Sets</span>
                                </button>

                                <button
                                    onClick={() => handleOpenCredentials(selectedTournament)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all text-amber-900 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/70"
                                >
                                    <Key className="w-4 h-4 text-amber-600" />
                                    <span>Manage Credentials</span>
                                </button>

                                <button
                                    onClick={() => navigate(`/admin/console/${selectedTournament._id}`)}
                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all text-emerald-900 bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/70"
                                >
                                    <PlayCircle className="w-4 h-4 text-emerald-600" />
                                    <span>Open Auction Console</span>
                                </button>
                            </div>
                        </div>
                    )}
                </nav>

                {/* Logout Footer */}
                <div className="p-4 border-t border-slate-100">
                    <button 
                        onClick={handleLogout} 
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all font-bold text-xs"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto h-screen bg-slate-50 flex flex-col">
                {/* Executive Topbar */}
                <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200/90 px-8 py-4 flex justify-between items-center shadow-2xs">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                {activeTab === 'tournaments' ? 'Operations Overview' : selectedTournament?.name}
                            </span>
                            {selectedTournament && activeTab !== 'tournaments' && (
                                <span className="px-2 py-0.5 bg-blue-100/70 text-blue-800 text-[10px] font-extrabold rounded-md uppercase">
                                    Per-Tournament Scoped
                                </span>
                            )}
                        </div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight">
                            {activeTab === 'tournaments' ? 'Tournament Control Hub' :
                                activeTab === 'players' ? `Auction Players Pool (${allDisplayPlayers.length})` :
                                    `Tournament Teams (${teams.length})`}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        {activeTab === 'tournaments' && (
                            <button 
                                onClick={() => { setEditTournament(null); setShowCreateModal(true); }} 
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-sm shadow-blue-600/30 transition-all"
                            >
                                <Plus className="w-4 h-4" /> Create Tournament
                            </button>
                        )}
                        {activeTab === 'players' && selectedTournament && (
                            <button 
                                onClick={() => { setEditPlayer(null); setShowPlayerModal(true); }} 
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-sm shadow-blue-600/30 transition-all"
                            >
                                <Plus className="w-4 h-4" /> Add Player to Tournament
                            </button>
                        )}
                        {activeTab === 'teams' && selectedTournament && (
                            <button 
                                onClick={() => { setEditTeam(null); setShowTeamModal(true); }} 
                                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-sm shadow-blue-600/30 transition-all"
                            >
                                <Plus className="w-4 h-4" /> Register Team
                            </button>
                        )}
                    </div>
                </header>

                <div className="p-8 pb-32 flex-1 max-w-7xl w-full mx-auto">
                    {/* Top KPI Metrics (when viewing tournaments) */}
                    {activeTab === 'tournaments' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Tournaments</span>
                                    <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Trophy className="w-4 h-4" />
                                    </span>
                                </div>
                                <div className="text-3xl font-black text-slate-900">{tournaments.length}</div>
                                <p className="text-[11px] text-slate-500 font-semibold mt-1">Organized events</p>
                            </div>

                            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Live Broadcasts</span>
                                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                        <Radio className="w-4 h-4" />
                                    </span>
                                </div>
                                <div className="text-3xl font-black text-emerald-600">{liveCount}</div>
                                <p className="text-[11px] text-emerald-700 font-semibold mt-1">Real-time auction rooms</p>
                            </div>

                            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Active Teams</span>
                                    <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                        <Shield className="w-4 h-4" />
                                    </span>
                                </div>
                                <div className="text-3xl font-black text-slate-900">{teams.length}</div>
                                <p className="text-[11px] text-slate-500 font-semibold mt-1">In active tournament</p>
                            </div>

                            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-slate-400 text-xs font-black uppercase tracking-wider">Players Pool</span>
                                    <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Users className="w-4 h-4" />
                                    </span>
                                </div>
                                <div className="text-3xl font-black text-slate-900">{allDisplayPlayers.length}</div>
                                <p className="text-[11px] text-slate-500 font-semibold mt-1">Including retained captains</p>
                            </div>
                        </div>
                    )}

                    {/* TOURNAMENTS GRID */}
                    {activeTab === 'tournaments' ? (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                    All Tournaments ({tournaments.length})
                                </h2>
                                <span className="text-xs text-slate-500 font-medium">Click card to launch Action Hub</span>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {tournaments.length > 0 ? tournaments.map((t) => {
                                    const isSelected = selectedTournament?._id === t._id;
                                    return (
                                        <div
                                            key={t._id}
                                            onClick={() => handleOpenHub(t)}
                                            className={`bg-white border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between ${
                                                isSelected ? 'border-blue-400 ring-2 ring-blue-500/10' : 'border-slate-200/90 hover:border-slate-300'
                                            }`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex gap-3.5 items-center">
                                                        <div className="w-12 h-12 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-base font-black shadow-xs">
                                                            {t.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                                                {t.name}
                                                            </h3>
                                                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                                <span className="text-xs text-slate-500 font-semibold capitalize">
                                                                    {t.auctionType?.replace('_', ' ') || 'owner driven'} • Squad Limit: {t.squadSizeLimit || 25}
                                                                </span>
                                                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${
                                                                    t.budgetScale === 'K_TO_L' 
                                                                        ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                                                }`}>
                                                                    {t.budgetScale === 'K_TO_L' ? 'K → L (Club)' : 'L → Cr (IPL)'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleToggleTournamentStatus(e, t)}
                                                            className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-full border transition-all ${
                                                                t.status === 'completed'
                                                                    ? 'bg-purple-100 text-purple-900 border-purple-300 hover:bg-slate-100 hover:text-slate-700'
                                                                    : (t.status === 'active' || t.status === 'live')
                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-purple-50 hover:text-purple-800 hover:border-purple-300' 
                                                                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300'
                                                            }`}
                                                            title="Click to toggle status: Active -> Completed -> Inactive"
                                                        >
                                                            {t.status === 'completed' ? '🏆 COMPLETED' : (t.status === 'active' || t.status === 'live') ? '● ACTIVE' : '○ INACTIVE'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete('tournament', t._id, t.name);
                                                            }}
                                                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                                            title="Delete Tournament Permanently"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Links Box */}
                                                <div className="grid grid-cols-2 gap-2 my-4 pt-4 border-t border-slate-100">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCopy(e, `${import.meta.env.VITE_APP_URL || window.location.origin}/auction/${t._id}`, `pub_${t._id}`)}
                                                        className="p-3 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200/80 rounded-xl text-left transition-colors"
                                                    >
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-0.5">
                                                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span>Public Live Stream</span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            {copiedId === `pub_${t._id}` ? '✓ Copied Link' : 'Copy live stream URL'}
                                                        </span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleCopy(e, `${import.meta.env.VITE_APP_URL || window.location.origin}/register-player/${t._id}`, `reg_${t._id}`)}
                                                        className="p-3 bg-slate-50 hover:bg-purple-50 hover:border-purple-200 border border-slate-200/80 rounded-xl text-left transition-colors"
                                                    >
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-0.5">
                                                            <FileText className="w-3.5 h-3.5 text-purple-600" />
                                                            <span>Player Self-Form</span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-500 font-medium">
                                                            {copiedId === `reg_${t._id}` ? '✓ Copied Link' : 'Copy nomination URL'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Action Buttons Row */}
                                            <div className="flex items-center gap-2 pt-3 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                                <button
                                                    onClick={() => navigate(`/admin/console/${t._id}`)}
                                                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-extrabold text-xs shadow-sm shadow-blue-600/25 transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <PlayCircle className="w-4 h-4" />
                                                    <span>Console</span>
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedTournament(t); setShowSlotModal(true); }}
                                                    className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-purple-900 font-extrabold text-xs transition-all flex items-center gap-1.5"
                                                    title="Manage Slots / Tiers for this tournament"
                                                >
                                                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                                                    <span>Slots</span>
                                                </button>
                                                <button
                                                    onClick={() => handleOpenCredentials(t)}
                                                    className="px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-900 font-extrabold text-xs transition-all flex items-center gap-1.5"
                                                    title="Manage Auctioneer & Owner Credentials"
                                                >
                                                    <Key className="w-3.5 h-3.5 text-amber-600" />
                                                    <span>Credentials</span>
                                                </button>
                                                <button
                                                    onClick={() => handleOpenHub(t)}
                                                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                                                >
                                                    Action Hub →
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="col-span-full py-16 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 border-dashed">
                                        <Trophy className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                        <p className="text-base font-bold text-slate-700">No tournaments created yet.</p>
                                        <button onClick={() => setShowCreateModal(true)} className="text-blue-600 hover:underline text-xs font-bold mt-2 inline-block">Create your first tournament</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'players' ? (
                        /* PLAYERS DIRECTORY - STRICTLY PER TOURNAMENT */
                        <div>
                            {/* Tournament Context Header */}
                            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOURNAMENT SCOPE</span>
                                        <h3 className="text-sm font-black text-slate-900">{selectedTournament?.name}</h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                                        value={selectedTournament?._id || ''}
                                        onChange={(e) => {
                                            const match = tournaments.find(t => t._id === e.target.value);
                                            if (match) setSelectedTournament(match);
                                        }}
                                    >
                                        {tournaments.map(t => (
                                            <option key={t._id} value={t._id}>{t.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => handleExportCSV(selectedTournament._id)}
                                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                                        title="Download complete players feed in CSV"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-slate-500" /> Export CSV
                                    </button>
                                    <button
                                        onClick={() => setShowSlotModal(true)}
                                        className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                                        title="Create Slots/Sets and shift players to auto-set base price"
                                    >
                                        <Layers className="w-3.5 h-3.5 text-purple-600" /> Manage Slots
                                    </button>
                                    <button
                                        onClick={() => setShowPlayerModal(true)}
                                        className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Player
                                    </button>
                                </div>
                            </div>

                            {/* Player Cards (Including Retained Owner-Captains) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {allDisplayPlayers.length > 0 ? allDisplayPlayers.map(p => {
                                    const isCap = p.isCaptain || p.isDirectOwnerCaptain;
                                    return (
                                        <div 
                                            key={p._id} 
                                            className={`p-4 rounded-2xl flex items-center gap-4 relative group shadow-xs transition-all ${
                                                isCap 
                                                    ? 'bg-amber-50/50 border-2 border-amber-300 shadow-amber-500/5' 
                                                    : 'bg-white border border-slate-200/90 hover:border-blue-300'
                                            }`}
                                        >
                                            <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center ${
                                                isCap ? 'bg-amber-100 border-amber-300' : 'bg-slate-100 border-slate-200'
                                            }`}>
                                                <SafeImage
                                                    src={p.image}
                                                    className="w-full h-full object-cover"
                                                    alt={p.name}
                                                    fallback={isCap ? <Crown className="w-8 h-8 text-amber-600" /> : <User size={24} className="text-slate-400" />}
                                                />
                                            </div>
                                                    <div className="flex-1 pr-6">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <h3 className="font-black text-slate-900 text-sm">{p.name}</h3>
                                                            {isCap && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-200/80 text-amber-900 text-[9px] font-black rounded-md border border-amber-300">
                                                                    <Crown className="w-2.5 h-2.5 text-amber-700" /> OWNER & CAPTAIN
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-500 font-bold mt-0.5">
                                                            {p.category} • {isCap ? `Fee: ₹${p.soldPrice || p.basePrice}${smallUnit}` : `Base: ₹${p.basePrice}${smallUnit}`}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400 font-medium mt-0.5">{p.battingStyle || 'Right-Hand Bat'}</div>
                                                        
                                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${
                                                                isCap 
                                                                    ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                                                    : p.status === 'sold' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                                                    : p.status === 'unsold' ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                                                                    : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                                {isCap 
                                                                    ? `🚫 NOT IN AUCTION (DIRECT SQUAD)` 
                                                                    : `${p.status} ${p.soldPrice ? `(₹${p.soldPrice}${smallUnit})` : ''}`}
                                                            </span>
                                                            {(p.soldToTeamName || (p.soldToTeamId && teams.find(t => t._id === p.soldToTeamId)?.name)) && (
                                                                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                                                    {p.soldToTeamName || teams.find(t => t._id === p.soldToTeamId)?.name}
                                                                </span>
                                                            )}
                                                            {p.cricHeroesProfileUrl && (
                                                                <a 
                                                                    href={p.cricHeroesProfileUrl} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-[10px] text-blue-600 hover:underline font-bold"
                                                                >
                                                                    CricHeroes ↗
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 absolute top-3 right-3">
                                                        <button
                                                            onClick={() => { setEditPlayer(p); setShowPlayerModal(true); }}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title={isCap ? "Edit Captain Profile & Photo" : "Edit Player Details"}
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete('player', p._id, p.name)}
                                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title={isCap ? "Remove Captain Profile" : "Delete Player"}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div className="col-span-full py-16 text-center text-slate-500 bg-white border border-dashed border-slate-200 rounded-3xl">
                                                <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                                <p className="font-extrabold text-slate-700 text-sm">No players added for {selectedTournament?.name} yet.</p>
                                                <p className="text-xs text-slate-400 mt-1">Players can fill the self-registration form or admin can add manually.</p>
                                            </div>
                                        )}
                                    </div>
                        </div>
                    ) : (
                        /* TEAMS DIRECTORY & ROSTER - STRICTLY PER TOURNAMENT */
                        <div>
                            {/* Tournament Context Header with CSV Export */}
                            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-black">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TOURNAMENT SCOPE</span>
                                        <h3 className="text-sm font-black text-slate-900">{selectedTournament?.name}</h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <select
                                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                                        value={selectedTournament?._id || ''}
                                        onChange={(e) => {
                                            const match = tournaments.find(t => t._id === e.target.value);
                                            if (match) setSelectedTournament(match);
                                        }}
                                    >
                                        {tournaments.map(t => (
                                            <option key={t._id} value={t._id}>{t.name}</option>
                                        ))}
                                    </select>

                                    {/* Export Summary CSV button */}
                                    <button
                                        onClick={() => handleExportSummaryCSV(selectedTournament._id)}
                                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all"
                                        title="Export Teams, Sold Prices & Unsold Players Summary to CSV"
                                    >
                                        <FileText className="w-3.5 h-3.5" /> Export Auction Summary CSV
                                    </button>

                                    <button
                                        onClick={() => setShowTeamModal(true)}
                                        className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Team
                                    </button>
                                </div>
                            </div>

                            {/* Team Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {teams.length > 0 ? teams.map(team => {
                                    const teamAcquired = players.filter(p => (p.soldToTeamId === team._id || p.soldToTeamId === team.id) && !p.isCaptain && !String(p._id || '').startsWith('pl_cap_'));
                                    const remainingPurse = Math.max(0, (team.budget || 100) - (team.spent || 0)).toFixed(2);
                                    const squadCount = teamAcquired.length + (team.isOwnerCaptain ? 1 : 0);
                                    const ownerUser = users.find(u => ((u.teamId?._id || u.teamId) === (team._id || team.id)) && u.role === 'team_owner');
                                    const resolvedCapName = team.captainName || ownerUser?.captainName || ownerUser?.name || ownerUser?.username;

                                    return (
                                        <div 
                                            key={team._id} 
                                            onClick={() => setSelectedTeamForRoster(team)}
                                            className="bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-md p-5 rounded-3xl relative shadow-xs transition-all flex flex-col justify-between cursor-pointer group"
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs overflow-hidden border border-slate-100">
                                                            <SafeImage
                                                                src={team.logo}
                                                                alt={team.name}
                                                                className="w-full h-full object-contain bg-white p-1"
                                                                fallback={team.shortName || team.name?.substring(0, 3).toUpperCase()}
                                                            />
                                                        </div>
                                                        <div>
                                                            <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                                                {team.name}
                                                            </h3>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-[10px] font-black rounded-md uppercase tracking-wider">
                                                                    Code: {team.shortName}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditTeam(team);
                                                                setShowTeamModal(true);
                                                            }}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                            title="Edit Team & Captain"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDelete('team', team._id);
                                                            }}
                                                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                            title="Delete Team"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Prominent Captain Name Banner */}
                                                {team.isOwnerCaptain && (
                                                    <div className="mt-2.5 px-3 py-2 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center justify-between">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <SafeImage
                                                                src={team.captainPhoto || ownerUser?.captainPhoto}
                                                                alt="Captain"
                                                                className="w-6 h-6 rounded-full object-cover border border-amber-300 shrink-0"
                                                                fallback={<Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                                                            />
                                                            <span className="text-[11px] font-bold text-amber-700 shrink-0">Captain:</span>
                                                            <span className="text-xs font-black text-amber-950 truncate">{resolvedCapName || 'Captain'}</span>
                                                        </div>
                                                        <span className="text-[10px] font-black text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md shrink-0">
                                                            ₹{team.captainPrice || 0}{smallUnit} Retained
                                                        </span>
                                                    </div>
                                                )}

                                                {/* 3-Column Financial & Squad Grid */}
                                                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
                                                    <div className="p-2.5 bg-slate-50 rounded-2xl">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Budget</span>
                                                        <p className="font-black text-xs text-slate-900 mt-0.5">₹{team.budget || 100} {largeUnit}</p>
                                                    </div>
                                                    <div className="p-2.5 bg-slate-50 rounded-2xl">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Spent</span>
                                                        <p className="font-black text-xs text-rose-600 mt-0.5">₹{team.spent || 0} {largeUnit}</p>
                                                    </div>
                                                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
                                                        <span className="text-[10px] font-bold text-emerald-600 uppercase">Remaining</span>
                                                        <p className="font-black text-xs text-emerald-700 mt-0.5">₹{remainingPurse} {largeUnit}</p>
                                                    </div>
                                                </div>

                                                {/* Squad size & Owner Captain note */}
                                                <div className="mt-3 px-3 py-2 bg-slate-50/70 rounded-xl flex items-center justify-between text-xs">
                                                    <span className="text-slate-500 font-semibold">Squad Players:</span>
                                                    <span className="font-black text-slate-800">
                                                        {squadCount} / {selectedTournament?.squadSizeLimit || 25}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Card Action Row */}
                                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                                <span className="text-xs font-black text-blue-600 group-hover:text-blue-700 flex items-center gap-1">
                                                    View Squad & Sold Prices →
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenCredentials(selectedTournament);
                                                    }}
                                                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                                                >
                                                    Manage Login
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }) : (
                                    <div className="col-span-full py-16 text-center text-slate-500 bg-white border border-dashed border-slate-200 rounded-3xl">
                                        <Shield className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                                        <p className="font-extrabold text-slate-700 text-sm">No teams registered for {selectedTournament?.name} yet.</p>
                                        <p className="text-xs text-slate-400 mt-1">Register teams so owners can participate in live bidding.</p>
                                    </div>
                                )}
                            </div>

                            {/* UNSOLD PLAYERS SECTION */}
                            <div className="mt-10 pt-8 border-t border-slate-200/80">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                                                Unsold Players Pool ({players.filter(p => p.status === 'unsold').length})
                                            </h3>
                                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black rounded-full">
                                                Eligible for Re-Auction
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                                            Players who did not receive bids during initial auction rounds.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleExportCSV(selectedTournament._id)}
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all"
                                        >
                                            <FileText className="w-3.5 h-3.5 text-slate-500" /> Export CSV
                                        </button>
                                        <button
                                            onClick={() => navigate(`/admin/console/${selectedTournament._id}`)}
                                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                                        >
                                            <PlayCircle className="w-3.5 h-3.5" /> Open Console to Re-Auction
                                        </button>
                                    </div>
                                </div>

                                {players.filter(p => p.status === 'unsold').length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {players.filter(p => p.status === 'unsold').map(p => (
                                            <div key={p._id} className="bg-white border border-rose-100 p-3.5 rounded-2xl flex items-center justify-between shadow-2xs hover:border-rose-300 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 overflow-hidden shrink-0 flex items-center justify-center">
                                                        <SafeImage
                                                            src={p.image}
                                                            alt={p.name}
                                                            className="w-full h-full object-cover"
                                                            fallback={<User className="w-4 h-4 text-rose-400" />}
                                                        />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-900">{p.name}</h4>
                                                        <div className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                                            {p.category} • Base: ₹{p.basePrice || 0}{smallUnit}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-black rounded-md border border-rose-200 uppercase">
                                                        Unsold
                                                    </span>
                                                    {p.cricHeroesProfileUrl && (
                                                        <a
                                                            href={p.cricHeroesProfileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:underline text-[10px] font-bold"
                                                        >
                                                            CricHeroes ↗
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-8 bg-white border border-slate-200 border-dashed rounded-2xl text-center text-slate-400">
                                        <p className="text-xs font-bold text-slate-600">No unsold players currently in this tournament.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
