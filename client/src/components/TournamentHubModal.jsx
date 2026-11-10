import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    X,
    PlayCircle,
    Eye,
    FileText,
    Key,
    Edit,
    Copy,
    Check,
    Users,
    Shield,
    ExternalLink,
    Layers,
    Trash2,
    Trophy,
    Flag
} from 'lucide-react';
import toast from '../lib/toast';

const TournamentHubModal = ({
    isOpen,
    onClose,
    tournament,
    onEditTournament,
    onManageRoster,
    onOpenCredentials,
    onOpenSlots,
    onDeleteTournament,
    onToggleStatus
}) => {
    const navigate = useNavigate();
    const [copiedPublic, setCopiedPublic] = useState(false);
    const [copiedForm, setCopiedForm] = useState(false);
    const [isRegOpen, setIsRegOpen] = useState(tournament?.registrationOpen !== false);
    const [togglingReg, setTogglingReg] = useState(false);

    useEffect(() => {
        setIsRegOpen(tournament?.registrationOpen !== false);
    }, [tournament?.registrationOpen]);

    const handleToggleRegistration = async (e) => {
        e.stopPropagation();
        try {
            setTogglingReg(true);
            const nextState = !isRegOpen;
            await axios.put(`/api/tournaments/${tournament._id}`, { registrationOpen: nextState });
            setIsRegOpen(nextState);
            tournament.registrationOpen = nextState;
            toast.success(`Player entry form is now ${nextState ? 'OPEN' : 'CLOSED'}`);
            if (onEditTournament) onEditTournament(tournament);
        } catch (err) {
            toast.error('Failed to toggle registration: ' + (err.response?.data?.message || err.message));
        } finally {
            setTogglingReg(false);
        }
    };

    if (!isOpen || !tournament) return null;

    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    const publicAuctionUrl = `${baseUrl}/auction/${tournament._id}`;
    const playerRegistrationUrl = `${baseUrl}/register-player/${tournament._id}`;

    const handleCopyPublic = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(publicAuctionUrl);
        setCopiedPublic(true);
        toast.success('Live Auction URL copied to clipboard!');
        setTimeout(() => setCopiedPublic(false), 2000);
    };

    const handleCopyForm = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(playerRegistrationUrl);
        setCopiedForm(true);
        toast.success('Registration Form URL copied to clipboard!');
        setTimeout(() => setCopiedForm(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs font-sans overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-xl shadow-2xl relative my-auto flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header Banner - Fixed */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-b border-slate-200 flex justify-between items-start shrink-0">
                    <div>
                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider mb-1.5 inline-block ${
                            tournament.status === 'live' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'
                        }`}>
                            {tournament.status === 'live' && '● '} {tournament.status?.toUpperCase() || 'UPCOMING'}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">{tournament.name}</h2>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                            Mode: <span className="text-slate-800 capitalize font-bold">{tournament.auctionType?.replace('_', ' ') || 'Classic'}</span> • Max Squad: {tournament.squadSizeLimit || 25}
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/50 transition-colors"
                        title="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tournament Actions Grid - Scrollable */}
                <div className="p-4 sm:p-5 space-y-2.5 overflow-y-auto flex-1">
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                        Select Tournament Operation
                    </p>

                    {/* 1. Auction Console (Primary Call-to-action) */}
                    <button
                        onClick={() => {
                            onClose();
                            navigate(`/admin/console/${tournament._id}`);
                        }}
                        className="w-full p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-between shadow-sm transition-all group"
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                                <PlayCircle className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-black text-sm text-white">Enter Auction Console</h3>
                                <p className="text-xs text-blue-100 font-medium">Control live bidding, random draw, hammer & rollback</p>
                            </div>
                        </div>
                        <span className="text-xs font-black bg-white/20 px-3 py-1 rounded-lg group-hover:translate-x-1 transition-transform">
                            Launch &rarr;
                        </span>
                    </button>

                    {/* 2. Share Public Live View */}
                    <div className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                                <Eye className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="font-extrabold text-xs text-slate-900">Share Public Live View</h4>
                                <p className="text-[11px] text-slate-500">Live audience & projector broadcast link</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleCopyPublic}
                                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
                            >
                                {copiedPublic ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedPublic ? 'Copied!' : 'Copy Link'}
                            </button>
                            <a
                                href={publicAuctionUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                                title="Open in new tab"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* 3. Share Player Registration Form */}
                    <div className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-2xl flex flex-col gap-2.5 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-xs text-slate-900">Player Self-Registration Link</h4>
                                    <p className="text-[11px] text-slate-500">Share link for players to fill cricket form themselves</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleCopyForm}
                                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all"
                                >
                                    {copiedForm ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                    {copiedForm ? 'Copied!' : 'Copy Form'}
                                </button>
                                <a
                                    href={playerRegistrationUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg"
                                    title="Open registration form"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        {/* Open / Close Registration Toggle */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                            <span className="text-[11px] font-bold text-slate-600">Player Registration Status:</span>
                            <button
                                type="button"
                                onClick={handleToggleRegistration}
                                disabled={togglingReg}
                                className={`px-2.5 py-1 rounded-lg font-black text-[10px] tracking-wider uppercase transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                                    isRegOpen
                                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                        : 'bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300'
                                }`}
                                title="Click to toggle player registration open or closed"
                            >
                                <span className={`w-2 h-2 rounded-full ${isRegOpen ? 'bg-emerald-600 animate-pulse' : 'bg-rose-600'}`} />
                                <span>{isRegOpen ? 'OPEN (Click to Close)' : 'CLOSED (Click to Open)'}</span>
                            </button>
                        </div>
                    </div>

                    {/* 4. Manage Credentials (Auctioneer & Team Owners) */}
                    <button
                        onClick={() => {
                            onClose();
                            onOpenCredentials(tournament);
                        }}
                        className="w-full p-3.5 bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 rounded-2xl flex items-center justify-between transition-all"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                                <Key className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                                <h4 className="font-extrabold text-xs text-slate-900">Manage Credentials</h4>
                                <p className="text-[11px] text-slate-500">Set Auctioneer & Team Owners login usernames/passwords</p>
                            </div>
                        </div>
                        <span className="text-xs font-bold text-amber-700 bg-amber-100/70 px-2.5 py-1 rounded-lg">
                            Configure &rarr;
                        </span>
                    </button>

                    {/* 5. Roster Management (Teams & Players) & Slots */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                            onClick={() => {
                                onClose();
                                onManageRoster(tournament);
                            }}
                            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-2 text-left transition-colors"
                        >
                            <Users className="w-4 h-4 text-blue-600" />
                            <div>
                                <h4 className="font-extrabold text-xs text-slate-900">Teams & Players</h4>
                                <p className="text-[10px] text-slate-400">View roster & squads</p>
                            </div>
                        </button>

                        <button
                            onClick={() => {
                                onClose();
                                onOpenSlots(tournament);
                            }}
                            className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-2 text-left transition-colors"
                        >
                            <Layers className="w-4 h-4 text-indigo-600" />
                            <div>
                                <h4 className="font-extrabold text-xs text-slate-900">Slots & Custom Sets</h4>
                                <p className="text-[10px] text-slate-400">Define player pools</p>
                            </div>
                        </button>
                    </div>

                    {/* 6. Auction Final Completion Toggle */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 mt-1">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
                                <Trophy className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="font-extrabold text-xs text-slate-900">
                                    {tournament.status === 'completed' ? '🏆 Auction Completed' : 'Conclude / End Auction'}
                                </h4>
                                <p className="text-[11px] text-slate-500">
                                    {tournament.status === 'completed' 
                                        ? 'Auction is officially marked as concluded' 
                                        : 'Finalize bidding and mark tournament as Completed'}
                                </p>
                            </div>
                        </div>
                        <div>
                            {tournament.status === 'completed' ? (
                                <button
                                    onClick={() => onToggleStatus && onToggleStatus(tournament, 'active')}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
                                >
                                    🔄 Reopen
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        if (window.confirm('Are you sure you want to officially end this auction? Status will be updated to Completed.')) {
                                            onToggleStatus && onToggleStatus(tournament, 'completed');
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all"
                                >
                                    <Flag className="w-3.5 h-3.5" /> End Auction
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer with Edit Details and Delete Tournament */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                    <button
                        onClick={() => {
                            onClose();
                            onEditTournament(tournament);
                        }}
                        className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
                    >
                        <Edit className="w-3.5 h-3.5" /> Edit Info
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                onClose();
                                onDeleteTournament && onDeleteTournament(tournament);
                            }}
                            className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl flex items-center gap-1.5 transition-colors"
                            title="Delete Tournament Permanently"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> Delete Tournament
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs hover:bg-slate-100 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TournamentHubModal;

