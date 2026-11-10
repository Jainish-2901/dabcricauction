import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    X, Key, Plus, Trash2, Edit2, Copy, Check, Users, Award, 
    Eye, EyeOff, Save, AlertCircle, Sparkles, Crown, ChevronDown, ChevronUp,
    Upload, User, Image as ImageIcon
} from 'lucide-react';
import ImageCropModal from './ImageCropModal';
import toast from '../lib/toast';

const ManageCredentialsModal = ({ 
    isOpen, 
    onClose, 
    onUpdated,
    tournament, 
    tournaments = [], 
    onSelectTournament, 
    teams = [] 
}) => {
    const [activeTournament, setActiveTournament] = useState(tournament);
    const [credentialsList, setCredentialsList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [feedbackMsg, setFeedbackMsg] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [copiedAll, setCopiedAll] = useState(false);
    const [showPasswords, setShowPasswords] = useState({});

    // Inline Add / Edit Drawer state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState('add'); // 'add' | 'edit'
    const [activeCredId, setActiveCredId] = useState(null);
    const [formRole, setFormRole] = useState('team_owner');
    const [formTeamId, setFormTeamId] = useState('');
    const [formUsername, setFormUsername] = useState('');
    const [formPassword, setFormPassword] = useState('');

    // Captain / Player Profile Details for Team Owner
    const [showCricketDetails, setShowCricketDetails] = useState(false);
    const [captainName, setCaptainName] = useState('');
    const [captainPhoto, setCaptainPhoto] = useState('');
    const [captainCropSrc, setCaptainCropSrc] = useState(null);
    const [showCaptainCropModal, setShowCaptainCropModal] = useState(false);
    const [category, setCategory] = useState('All-Rounder');
    const [battingStyle, setBattingStyle] = useState('Right Handed');
    const [bowlingStyle, setBowlingStyle] = useState('Right-arm Medium');
    const [captainPrice, setCaptainPrice] = useState('15');
    const [age, setAge] = useState('28');
    const [cricHeroesProfileUrl, setCricHeroesProfileUrl] = useState('');
    const [matches, setMatches] = useState('0');
    const [runs, setRuns] = useState('0');
    const [highestScore, setHighestScore] = useState('');
    const [wickets, setWickets] = useState('0');
    const [bestBowling, setBestBowling] = useState('');

    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState('');

    useEffect(() => {
        if (tournament) {
            setActiveTournament(tournament);
        } else if (tournaments.length > 0 && !activeTournament) {
            setActiveTournament(tournaments[0]);
        }
    }, [tournament, tournaments]);

    useEffect(() => {
        if (isOpen && activeTournament?._id) {
            fetchCredentials();
        }
    }, [isOpen, activeTournament?._id]);

    const fetchCredentials = async () => {
        if (!activeTournament?._id) return;
        setLoading(true);
        setFormError('');
        try {
            const res = await axios.get(`/api/tournaments/${activeTournament._id}/credentials`);
            const data = res.data;

            if (data.credentials && Array.isArray(data.credentials)) {
                setCredentialsList(data.credentials);
            } else {
                const list = [];
                if (data.auctioneer) {
                    list.push({
                        _id: data.auctioneer.userId || 'auc_default',
                        username: data.auctioneer.username,
                        plainPassword: data.auctioneer.plainPassword,
                        role: 'auctioneer',
                        teamName: 'Official Auctioneer',
                        shortName: 'AUCTION'
                    });
                }
                if (data.teamOwners && Array.isArray(data.teamOwners)) {
                    data.teamOwners.forEach(t => {
                        list.push({
                            _id: t.userId || ('owner_' + t.teamId),
                            username: t.username,
                            plainPassword: t.plainPassword,
                            role: 'team_owner',
                            teamId: t.teamId,
                            teamName: t.teamName,
                            shortName: t.shortName,
                            isCaptain: true,
                            captainName: t.username
                        });
                    });
                }
                setCredentialsList(list);
            }
        } catch (err) {
            console.error('Failed to load credentials', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setFormMode('add');
        setActiveCredId(null);
        setFormRole('team_owner');
        setFormTeamId(teams[0]?._id || '');
        setFormUsername('');
        setFormPassword('');
        setCaptainName('');
        setCaptainPhoto('');
        setCategory('All-Rounder');
        setBattingStyle('Right Handed');
        setBowlingStyle('Right-arm Medium');
        setCaptainPrice('15');
        setAge('28');
        setCricHeroesProfileUrl('');
        setMatches('0');
        setRuns('0');
        setHighestScore('');
        setWickets('0');
        setBestBowling('');
        setShowCricketDetails(true);
        setFormError('');
        setIsFormOpen(true);
    };

    const handleOpenEdit = (cred) => {
        setFormMode('edit');
        setActiveCredId(cred._id);
        setFormRole(cred.role);
        setFormTeamId(cred.teamId || '');
        setFormUsername(cred.username);
        setFormPassword(cred.plainPassword || '');
        setCaptainName(cred.captainName || cred.username || '');
        setCaptainPhoto(cred.captainPhoto || cred.image || '');
        setCategory(cred.category || 'All-Rounder');
        setBattingStyle(cred.battingStyle || 'Right Handed');
        setBowlingStyle(cred.bowlingStyle || 'Right-arm Medium');
        setCaptainPrice((cred.captainPrice || 15).toString());
        setAge((cred.age || 28).toString());
        setCricHeroesProfileUrl(cred.cricHeroesProfileUrl || '');
        setMatches(cred.stats?.matches?.toString() || '0');
        setRuns(cred.stats?.runs?.toString() || '0');
        setHighestScore(cred.stats?.highestScore || '');
        setWickets(cred.stats?.wickets?.toString() || '0');
        setBestBowling(cred.stats?.bestBowling || '');
        setShowCricketDetails(false);
        setFormError('');
        setIsFormOpen(true);
    };

    const handleCaptainPhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 8 * 1024 * 1024) {
            toast.warning('Captain photo size must be less than 8MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;
            setCaptainPhoto(dataUrl);
            setCaptainCropSrc(dataUrl);
            setShowCaptainCropModal(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCaptainCropDone = (croppedBase64) => {
        setCaptainPhoto(croppedBase64);
    };

    const handleRemoveCaptainPhoto = () => {
        setCaptainPhoto('');
    };

    const handleDelete = async (userId, credName) => {
        if (!window.confirm(`Are you sure you want to delete login credentials for "${credName}"? Associated captain player will also be removed.`)) {
            return;
        }

        try {
            await axios.delete(`/api/tournaments/${activeTournament._id}/credentials/${userId}`);
            setCredentialsList(prev => prev.filter(c => c._id !== userId));
            showNotice('Credential and captain profile removed');
            if (onUpdated) onUpdated();
        } catch (err) {
            toast.error('Failed to delete credential: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleSaveForm = async (e) => {
        e.preventDefault();
        if (!formUsername.trim() || !formPassword.trim()) {
            setFormError('Username and password are required');
            return;
        }

        if (formRole === 'team_owner' && !formTeamId) {
            setFormError('Please select a team to assign this Owner & Captain to.');
            return;
        }

        setFormSaving(true);
        setFormError('');

        const payload = {
            role: formRole,
            teamId: formRole === 'team_owner' ? formTeamId : null,
            username: formUsername.trim(),
            password: formPassword.trim(),
            captainName: formRole === 'team_owner' ? (captainName || formUsername).trim() : undefined,
            captainPhoto: formRole === 'team_owner' ? (captainPhoto || '').trim() : undefined,
            category: formRole === 'team_owner' ? category : undefined,
            battingStyle: formRole === 'team_owner' ? battingStyle : undefined,
            bowlingStyle: formRole === 'team_owner' ? bowlingStyle : undefined,
            captainPrice: formRole === 'team_owner' ? (Number(captainPrice) || 0) : 0,
            age: formRole === 'team_owner' ? (Number(age) || 28) : undefined,
            cricHeroesProfileUrl: formRole === 'team_owner' ? cricHeroesProfileUrl.trim() : undefined,
            stats: formRole === 'team_owner' ? {
                matches: Number(matches) || 0,
                runs: Number(runs) || 0,
                highestScore: highestScore.trim(),
                wickets: Number(wickets) || 0,
                bestBowling: bestBowling.trim()
            } : undefined
        };

        try {
            if (formMode === 'add') {
                await axios.post(`/api/tournaments/${activeTournament._id}/credentials/add`, payload);
                showNotice('Team Owner credential & Captain player profile created successfully');
            } else {
                await axios.put(`/api/tournaments/${activeTournament._id}/credentials/${activeCredId}`, payload);
                showNotice('Credential updated successfully');
            }
            setIsFormOpen(false);
            fetchCredentials();
            if (onUpdated) onUpdated();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Operation failed. Username may already exist.');
        } finally {
            setFormSaving(false);
        }
    };

    const showNotice = (msg) => {
        setFeedbackMsg(msg);
        setTimeout(() => setFeedbackMsg(''), 3500);
    };

    const togglePasswordVisibility = (id) => {
        setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCopySingle = (key, text) => {
        navigator.clipboard.writeText(text);
        setCopiedId(key);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleCopyAll = () => {
        let text = `🏏 Dab Cric Auction Official Credentials\n`;
        text += `Tournament: ${activeTournament?.name || 'Tournament'}\n`;
        text += `====================================\n\n`;

        credentialsList.forEach(c => {
            const roleLabel = c.role === 'auctioneer' ? '👑 Official Auctioneer' : `🏏 ${c.teamName || 'Team Owner'}`;
            text += `${roleLabel} (Captain: ${c.captainName || c.username}):\n`;
            text += `  • Username: ${c.username}\n`;
            text += `  • Password: ${c.plainPassword || '••••••••'}\n\n`;
        });

        text += `====================================\n`;
        text += `🌐 Web Portal: ${import.meta.env.VITE_APP_URL || window.location.origin}/login\n`;
        text += `📱 Mobile App: Use matching credentials`;

        navigator.clipboard.writeText(text);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 3000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-sans">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                            <Key className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-slate-900">Tournament Credentials & Captain Manager</h2>
                                <span className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-black uppercase rounded-md tracking-wider">
                                    Owner = Captain
                                </span>
                            </div>
                            <p className="text-slate-500 text-xs font-medium">
                                Manage logins for Auctioneer & Team Owners for <strong className="text-slate-700">{activeTournament?.name}</strong>
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Subheader Action Bar with Tournament Selector */}
                <div className="px-6 py-3.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        {tournaments && tournaments.length > 0 && (
                            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                                <span className="text-[10px] font-black uppercase text-slate-400">Tournament:</span>
                                <select
                                    value={activeTournament?._id || ''}
                                    onChange={(e) => {
                                        const match = tournaments.find(t => t._id === e.target.value);
                                        if (match) {
                                            setActiveTournament(match);
                                            if (onSelectTournament) onSelectTournament(match);
                                        }
                                    }}
                                    className="bg-transparent text-xs font-black text-slate-900 focus:outline-none cursor-pointer"
                                >
                                    {tournaments.map(t => (
                                        <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                            <span>Total Logins: <strong className="text-slate-900">{credentialsList.length}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Captains / Owners: <strong className="text-blue-700">{credentialsList.filter(c => c.role === 'team_owner').length}</strong></span>
                            <span className="text-slate-300">•</span>
                            <span>Auctioneers: <strong className="text-amber-700">{credentialsList.filter(c => c.role === 'auctioneer').length}</strong></span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleCopyAll}
                            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                            {copiedAll ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                            <span>{copiedAll ? 'Copied Summary' : 'Share WhatsApp'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenAdd}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm shadow-blue-600/30 transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Owner & Captain</span>
                        </button>
                    </div>
                </div>

                {/* Feedback Toast */}
                {feedbackMsg && (
                    <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2 animate-in fade-in">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>{feedbackMsg}</span>
                    </div>
                )}

                {/* Content Area */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center py-16 text-slate-400 font-bold text-sm">
                            Loading credentials...
                        </div>
                    ) : credentialsList.length === 0 ? (
                        <div className="text-center py-16 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                            <Key className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                            <h3 className="font-black text-slate-700 text-base mb-1">No credentials configured yet</h3>
                            <p className="text-slate-500 text-xs mb-4">Click "Add Owner & Captain" to create credentials and enroll them as team captain.</p>
                            <button
                                onClick={handleOpenAdd}
                                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add First Owner & Captain
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {credentialsList.map((cred) => {
                                const isVisible = !!showPasswords[cred._id];
                                const isAuc = cred.role === 'auctioneer';
                                return (
                                    <div 
                                        key={cred._id}
                                        className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2">
                                                    {cred.captainPhoto ? (
                                                        <img 
                                                            src={cred.captainPhoto} 
                                                            alt={cred.captainName || 'Captain'} 
                                                            className="w-8 h-8 rounded-xl object-cover border border-amber-300 shadow-2xs shrink-0" 
                                                        />
                                                    ) : (
                                                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                                            isAuc ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                            {isAuc ? <Award className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                                                        </span>
                                                    )}
                                                    <div>
                                                        <h4 className="font-black text-sm text-slate-900 leading-tight">
                                                            {cred.teamName || (isAuc ? 'Official Auctioneer' : 'Team Owner')}
                                                        </h4>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className={`inline-block text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                                isAuc ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
                                                            }`}>
                                                                {isAuc ? 'Auctioneer Console' : `Team: ${cred.shortName || 'Assigned'}`}
                                                            </span>
                                                            {!isAuc && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                                                                    <Crown className="w-3 h-3 text-amber-600" /> Captain ({cred.captainName || cred.username})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={() => handleOpenEdit(cred)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Edit Credential & Captain Profile"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(cred._id, cred.username)}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        title="Delete Credential"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Credentials Pill Box */}
                                            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Username</span>
                                                    <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                                                        <span>{cred.username}</span>
                                                        <button
                                                            onClick={() => handleCopySingle(cred._id + '_u', cred.username)}
                                                            className="text-slate-400 hover:text-blue-600 p-0.5"
                                                            title="Copy username"
                                                        >
                                                            {copiedId === cred._id + '_u' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                                                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Password</span>
                                                    <div className="flex items-center gap-1 font-mono font-bold text-slate-800">
                                                        <span>{isVisible ? (cred.plainPassword || 'Not Set') : '••••••••'}</span>
                                                        <button
                                                            onClick={() => togglePasswordVisibility(cred._id)}
                                                            className="text-slate-400 hover:text-slate-700 p-0.5"
                                                            title={isVisible ? 'Hide password' : 'Show password'}
                                                        >
                                                            {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleCopySingle(cred._id + '_p', cred.plainPassword || '')}
                                                            className="text-slate-400 hover:text-blue-600 p-0.5"
                                                            title="Copy password"
                                                        >
                                                            {copiedId === cred._id + '_p' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Inline Add / Edit Drawer Modal */}
                {isFormOpen && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-20 overflow-y-auto">
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 w-full max-w-xl shadow-2xl animate-in zoom-in-95 max-h-[90vh] flex flex-col my-auto">
                            <div className="flex justify-between items-center mb-4 shrink-0">
                                <div>
                                    <h3 className="font-black text-slate-900 text-base">
                                        {formMode === 'add' ? 'Add Owner & Captain Login' : 'Edit Credential & Captain Profile'}
                                    </h3>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        Team owners are automatically added to the players roster as team captain.
                                    </p>
                                </div>
                                <button onClick={() => setIsFormOpen(false)} className="p-1 text-slate-400 hover:text-slate-700">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {formError && (
                                <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-bold flex items-center gap-2 shrink-0">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <form onSubmit={handleSaveForm} className="space-y-4 overflow-y-auto flex-1 pr-1">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">Role Type</label>
                                        <select
                                            value={formRole}
                                            onChange={(e) => setFormRole(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                                        >
                                            <option value="team_owner">🏏 Team Owner & Captain</option>
                                            <option value="auctioneer">👑 Official Auctioneer</option>
                                        </select>
                                    </div>

                                    {formRole === 'team_owner' && (
                                        <div>
                                            <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">Assign to Team *</label>
                                            <select
                                                value={formTeamId}
                                                onChange={(e) => setFormTeamId(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                                                required
                                            >
                                                <option value="">-- Choose Team --</option>
                                                {teams.map(t => (
                                                    <option key={t._id || t.id} value={t._id || t.id}>
                                                        {t.name} ({t.shortName || 'TM'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Username & Password */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">Login Username *</label>
                                        <input
                                            type="text"
                                            value={formUsername}
                                            onChange={(e) => setFormUsername(e.target.value)}
                                            placeholder="e.g. owner_rcb or captain_vk"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">Login Password *</label>
                                        <input
                                            type="text"
                                            value={formPassword}
                                            onChange={(e) => setFormPassword(e.target.value)}
                                            placeholder="Enter secure password"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* CAPTAIN PLAYER DETAILS (Required when role is team_owner) */}
                                {formRole === 'team_owner' && (
                                    <div className="p-4 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Crown className="w-4 h-4 text-amber-600" />
                                            <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                                                Captain Player Profile (Auto-Added to Roster #1)
                                            </span>
                                        </div>

                                        {/* Captain Photo Upload */}
                                        <div>
                                            <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Captain Photo</label>
                                            <div className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-xl">
                                                <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                                                    {captainPhoto ? (
                                                        <img src={captainPhoto} alt="Captain" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <label className="cursor-pointer px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 inline-flex items-center gap-1">
                                                            <Upload className="w-3 h-3 text-blue-600" />
                                                            <span>{captainPhoto ? 'Change' : 'Upload'}</span>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={handleCaptainPhotoChange}
                                                            />
                                                        </label>
                                                        {captainPhoto && (
                                                            <button
                                                                type="button"
                                                                onClick={handleRemoveCaptainPhoto}
                                                                className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
                                                            >
                                                                <Trash2 className="w-3 h-3" /> Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] text-slate-400 block mt-0.5">Auto-uploaded to Cloudinary</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Captain Full Name *</label>
                                                <input
                                                    type="text"
                                                    value={captainName}
                                                    onChange={(e) => setCaptainName(e.target.value)}
                                                    placeholder="e.g. Virat Kohli (or Owner Name)"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Playing Role *</label>
                                                <select
                                                    value={category}
                                                    onChange={(e) => setCategory(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                                                >
                                                    <option>Batsman</option>
                                                    <option>Bowler</option>
                                                    <option>All-Rounder</option>
                                                    <option>Wicket Keeper</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2.5">
                                            <div>
                                                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Batting Style</label>
                                                <select
                                                    value={battingStyle}
                                                    onChange={(e) => setBattingStyle(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                                                >
                                                    <option>Right Handed</option>
                                                    <option>Left Handed</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Bowling Style</label>
                                                <input
                                                    type="text"
                                                    value={bowlingStyle}
                                                    onChange={(e) => setBowlingStyle(e.target.value)}
                                                    placeholder="Right-arm Medium"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Captain Retained (₹ Cr)</label>
                                                <input
                                                    type="number"
                                                    value={captainPrice}
                                                    onChange={(e) => setCaptainPrice(e.target.value)}
                                                    placeholder="15"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-black text-amber-900"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2.5">
                                            <div>
                                                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">Age</label>
                                                <input
                                                    type="number"
                                                    value={age}
                                                    onChange={(e) => setAge(e.target.value)}
                                                    placeholder="28"
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-extrabold uppercase text-slate-600 mb-1">CricHeroes URL</label>
                                                <input
                                                    type="url"
                                                    value={cricHeroesProfileUrl}
                                                    onChange={(e) => setCricHeroesProfileUrl(e.target.value)}
                                                    placeholder="https://..."
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900"
                                                />
                                            </div>
                                        </div>

                                        {/* Expandable Cricket Stats */}
                                        <button
                                            type="button"
                                            onClick={() => setShowCricketDetails(!showCricketDetails)}
                                            className="w-full flex items-center justify-between text-[11px] font-bold text-amber-800 pt-1"
                                        >
                                            <span>Career Cricket Stats (Optional)</span>
                                            {showCricketDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                        </button>

                                        {showCricketDetails && (
                                            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-amber-200/60">
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Matches</label>
                                                    <input
                                                        type="number"
                                                        value={matches}
                                                        onChange={(e) => setMatches(e.target.value)}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Runs</label>
                                                    <input
                                                        type="number"
                                                        value={runs}
                                                        onChange={(e) => setRuns(e.target.value)}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-500 uppercase">Wickets</label>
                                                    <input
                                                        type="number"
                                                        value={wickets}
                                                        onChange={(e) => setWickets(e.target.value)}
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-bold text-slate-500 uppercase">High Score</label>
                                                    <input
                                                        type="text"
                                                        value={highestScore}
                                                        onChange={(e) => setHighestScore(e.target.value)}
                                                        placeholder="78*"
                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-center"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-3 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormOpen(false)}
                                        className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formSaving}
                                        className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm flex items-center justify-center gap-1.5"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        <span>{formSaving ? 'Saving...' : (formMode === 'add' ? 'Create & Add Captain' : 'Update Profile')}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Captain Photo Crop Modal */}
                <ImageCropModal
                    isOpen={showCaptainCropModal}
                    imageSrc={captainCropSrc}
                    onCropComplete={handleCaptainCropDone}
                    onClose={() => setShowCaptainCropModal(false)}
                    title="Crop Captain Picture (1:1 Frame)"
                    outputSize={512}
                />
            </div>
        </div>
    );
};

export default ManageCredentialsModal;
