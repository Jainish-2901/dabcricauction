import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Users, Trophy, Settings, LogOut, Shield, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CreateTournamentModal from '../components/CreateTournamentModal';
import AddPlayerModal from '../components/AddPlayerModal';
import AddTeamModal from '../components/AddTeamModal';
import AddUserModal from '../components/AddUserModal';
import { useAuth } from '../context/AuthContext';

const SuperAdminDashboard = () => {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState('tournaments');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [showUserModal, setShowUserModal] = useState(false);

    const [tournaments, setTournaments] = useState([]);
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [users, setUsers] = useState([]); // Managing fetched users

    const [selectedTournament, setSelectedTournament] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTournaments();
    }, []);

    useEffect(() => {
        if (selectedTournament) {
            if (activeTab === 'players') fetchPlayers();
            if (activeTab === 'teams') fetchTeams();
            if (activeTab === 'users') fetchUsers();
        }
    }, [activeTab, selectedTournament]);

    const fetchTournaments = async () => {
        try {
            const res = await axios.get('/api/tournaments');
            if (Array.isArray(res.data)) setTournaments(res.data);
        } catch (err) {
            console.error(err);
            setTournaments([]);
        }
    };

    const fetchPlayers = async () => {
        try {
            const res = await axios.get(`/api/players/${selectedTournament._id}`);
            setPlayers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchTeams = async () => {
        try {
            const res = await axios.get(`/api/teams/${selectedTournament._id}`);
            setTeams(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    // Note: You need a route for fetching users by tournamentId if you want to scope them
    // Assuming we might need to add that route or filter locally if all users returned
    // For now, let's assume /api/auth/users/:tournamentId endpoint exists or generic
    const fetchUsers = async () => {
        try {
            const res = await axios.get(`/api/auth/users/${selectedTournament._id}`);
            setUsers(res.data);
        } catch (err) {
            console.log("Fetch users error", err);
        }
    };

    const handleDelete = async (type, id) => {
        if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) return;
        try {
            if (type === 'tournament') {
                await axios.delete(`/api/tournaments/${id}`);
                fetchTournaments();
                if (selectedTournament?._id === id) setSelectedTournament(null);
            } else if (type === 'player') {
                await axios.delete(`/api/players/${id}`);
                fetchPlayers();
            } else if (type === 'team') {
                await axios.delete(`/api/teams/${id}`);
                fetchTeams();
            } else if (type === 'user') {
                await axios.delete(`/api/auth/users/${id}`);
                fetchUsers();
            }
        } catch (err) {
            alert('Failed to delete item');
            console.error(err);
        }
    };

    const handleManage = (tournament) => {
        setSelectedTournament(tournament);
        setActiveTab('players');
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const [editUser, setEditUser] = useState(null);
    const [editPlayer, setEditPlayer] = useState(null);
    const [editTeam, setEditTeam] = useState(null);
    const [editTournament, setEditTournament] = useState(null);

    const handleEditUser = (user) => {
        setEditUser(user);
        setShowUserModal(true);
    };

    const handleCloseUserModal = () => {
        setEditUser(null);
        setShowUserModal(false);
    };

    const handleEditTournament = (tournament) => {
        setEditTournament(tournament);
        setShowCreateModal(true);
    };

    const handleCloseTournamentModal = () => {
        setEditTournament(null);
        setShowCreateModal(false);
    };

    const handleEditPlayer = (player) => {
        setEditPlayer(player);
        setShowPlayerModal(true);
    };
    const handleClosePlayerModal = () => {
        setEditPlayer(null);
        setShowPlayerModal(false);
    };

    const handleEditTeam = (team) => {
        setEditTeam(team);
        setShowTeamModal(true);
    };
    const handleCloseTeamModal = () => {
        setEditTeam(null);
        setShowTeamModal(false);
    };

    // ... (rest of the file until return)

    return (
        <div className="min-h-screen bg-slate-950 text-white flex font-sans">
            <CreateTournamentModal
                isOpen={showCreateModal}
                onClose={handleCloseTournamentModal}
                onCreated={fetchTournaments}
                initialData={editTournament}
                isEdit={!!editTournament}
            />

            {selectedTournament && (
                <>
                    <AddPlayerModal
                        isOpen={showPlayerModal}
                        onClose={handleClosePlayerModal}
                        tournamentId={selectedTournament._id}
                        onAdded={fetchPlayers}
                        initialData={editPlayer}
                        isEdit={!!editPlayer}
                    />
                    <AddTeamModal
                        isOpen={showTeamModal}
                        onClose={handleCloseTeamModal}
                        tournamentId={selectedTournament._id}
                        onAdded={fetchTeams}
                        initialData={editTeam}
                        isEdit={!!editTeam}
                    />
                    <AddUserModal
                        isOpen={showUserModal}
                        onClose={handleCloseUserModal}
                        tournamentId={selectedTournament._id}
                        onAdded={fetchUsers}
                        initialData={editUser}
                        isEdit={!!editUser}
                    />
                </>
            )}

            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
                <div className="p-6">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">Admin Panel</h2>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <button
                        onClick={() => { setActiveTab('tournaments'); setSelectedTournament(null); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'tournaments' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                    >
                        <Trophy className="w-5 h-5" />
                        Tournaments
                    </button>

                    {selectedTournament && (
                        <>
                            <div className="px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider mt-4">
                                {selectedTournament.name}
                            </div>
                            <button
                                onClick={() => setActiveTab('players')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'players' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                <Users className="w-5 h-5" />
                                Players
                            </button>
                            <button
                                onClick={() => setActiveTab('teams')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'teams' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                <Shield className="w-5 h-5" />
                                Teams
                            </button>
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                            >
                                <Settings className="w-5 h-5" />
                                Users
                            </button>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-xl transition-all">
                        <LogOut className="w-5 h-5" />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto h-screen">
                <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-8 py-6 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-white">
                        {activeTab === 'tournaments' ? 'Manage Tournaments' :
                            activeTab === 'players' ? `Players - ${selectedTournament?.name}` :
                                activeTab === 'teams' ? `Teams - ${selectedTournament?.name}` :
                                    `Users - ${selectedTournament?.name}`}
                    </h1>

                    <div className="flex items-center gap-4">
                        {activeTab === 'tournaments' && (
                            <button onClick={() => { setEditTournament(null); setShowCreateModal(true); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors">
                                <Plus className="w-4 h-4" /> Create Tournament
                            </button>
                        )}
                        {activeTab === 'players' && (
                            <button onClick={() => { setEditPlayer(null); setShowPlayerModal(true); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors">
                                <Plus className="w-4 h-4" /> Add Player
                            </button>
                        )}
                        {activeTab === 'teams' && (
                            <button onClick={() => { setEditTeam(null); setShowTeamModal(true); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors">
                                <Plus className="w-4 h-4" /> Add Team
                            </button>
                        )}
                        {activeTab === 'users' && (
                            <button onClick={() => { setEditUser(null); setShowUserModal(true); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-colors">
                                <Plus className="w-4 h-4" /> Add User
                            </button>
                        )}
                    </div>

                    {/* ... other header buttons */}
                </header>

                <div className="p-8 pb-32">
                    {activeTab === 'tournaments' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {tournaments.length > 0 ? tournaments.map((t) => (
                                <div key={t._id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-500/30 transition-all group relative">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEditTournament(t); }}
                                            className="p-2 bg-slate-800 hover:bg-blue-500/20 hover:text-blue-500 rounded-lg text-slate-500 transition-colors"
                                            title="Edit Tournament"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete('tournament', t._id); }}
                                            className="p-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-500 rounded-lg text-slate-500 transition-colors"
                                            title="Delete Tournament"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-start mb-4 pr-20"> {/* Added right padding to prevent overlap with buttons */}
                                        <div className="flex gap-4">
                                            <div className="w-16 h-16 bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 text-2xl font-bold uppercase">
                                                {t.name.substring(0, 2)}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{t.name}</h3>
                                                <p className="text-slate-400 text-sm">Mode: <span className="text-blue-400 capitalize">{t.auctionType?.replace('_', ' ')}</span></p>
                                                {t.startDate && <p className="text-slate-500 text-xs mt-1">Start: {new Date(t.startDate).toLocaleDateString()} {t.time && `at ${t.time}`}</p>}
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 text-xs rounded-full border ${t.status === 'live' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                                            {t.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                                        <button onClick={() => navigate(`/admin/console/${t._id}`)} className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white font-medium transition-colors">
                                            Open Console
                                        </button>
                                        <button onClick={() => handleManage(t)} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors text-sm">
                                            Manage
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-20 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg">No tournaments found.</p>
                                    <button onClick={() => setShowCreateModal(true)} className="text-blue-400 hover:underline mt-2">Create your first tournament</button>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'players' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {players.length > 0 ? players.map(p => (
                                <div key={p._id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center gap-4 relative group">
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditPlayer(p)}
                                            className="p-1.5 bg-slate-800 hover:bg-blue-500/20 hover:text-blue-500 rounded-lg text-slate-500 transition-colors"
                                        >
                                            <Edit className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete('player', p._id)}
                                            className="p-1.5 bg-slate-800 hover:bg-red-500/20 hover:text-red-500 rounded-lg text-slate-500 transition-colors"
                                            title="Delete Player"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="w-16 h-16 bg-slate-800 rounded-lg overflow-hidden shrink-0">
                                        {p.image ? (
                                            <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-600"><User /></div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{p.name}</h3>
                                        <div className="text-sm text-slate-500">{p.category} • Base: {p.basePrice}L</div>
                                        <div className="text-xs mt-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 w-fit capitalize text-slate-400">
                                            {p.status}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">No players added for this tournament.</div>
                            )}
                        </div>
                    ) : activeTab === 'teams' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {teams.length > 0 ? teams.map(team => (
                                <div key={team._id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative group hover:border-blue-500/20 transition-all">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditTeam(team)}
                                            className="p-2 bg-slate-800 hover:bg-blue-500/20 hover:text-blue-500 rounded-lg text-slate-500 transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete('team', team._id)}
                                            className="p-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-500 rounded-lg text-slate-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{team.name}</h3>
                                            <p className="text-slate-500 text-sm mb-4">{team.shortName}</p>
                                        </div>
                                        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                                            {team.shortName?.substring(0, 2) || 'T'}
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between text-sm">
                                        <div className="text-slate-400">Budget: <span className="text-white">{team.budget} Cr</span></div>
                                        <div className="text-slate-400">Spent: <span className="text-white">{team.spent} Cr</span></div>
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">No teams added for this tournament.</div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {users.length > 0 ? users.map(u => (
                                <div key={u._id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex justify-between items-center group relative">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditUser(u)}
                                            className="p-2 bg-slate-800 hover:bg-blue-500/20 hover:text-blue-500 rounded-lg text-slate-500 transition-colors"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete('user', u._id)}
                                            className="p-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-500 rounded-lg text-slate-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{u.username}</h3>
                                        <p className="text-slate-500 text-sm capitalize">Role: <span className="text-blue-400">{u.role}</span></p>
                                        {u.teamId && (
                                            <p className="text-slate-500 text-xs mt-1">Team: <span className="text-white">{u.teamId.name || u.teamId}</span></p>
                                        )}
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                                        <User size={20} />
                                    </div>
                                </div>
                            )) : (
                                <div className="col-span-full py-10 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                                    No users created for this tournament.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
