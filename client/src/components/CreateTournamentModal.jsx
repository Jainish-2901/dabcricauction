import React, { useState } from 'react';
import axios from 'axios';
import { X, Trophy, TrendingUp, Layers, Coins } from 'lucide-react';

const DEFAULT_SLABS_L_CR = [
    { upTo: 100, increment: 10, label: 'Up to ₹1 Cr (100 L)' },
    { upTo: 500, increment: 25, label: '₹1 Cr - ₹5 Cr (500 L)' },
    { upTo: 1000, increment: 50, label: '₹5 Cr - ₹10 Cr (1000 L)' },
    { upTo: 999999, increment: 100, label: 'Above ₹10 Cr (> 1000 L)' }
];

const DEFAULT_SLABS_K_L = [
    { upTo: 100, increment: 10, label: 'Up to ₹1 L (100 K)' },
    { upTo: 500, increment: 25, label: '₹1 L - ₹5 L (500 K)' },
    { upTo: 1000, increment: 50, label: '₹5 L - ₹10 L (1000 K)' },
    { upTo: 999999, increment: 100, label: 'Above ₹10 L (> 1000 K)' }
];

const CreateTournamentModal = ({ isOpen, onClose, onCreated, initialData = null, isEdit = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        time: '',
        description: '',
        squadSizeLimit: 25,
        auctionType: 'owner_driven',
        budgetScale: 'L_TO_CR', // 'L_TO_CR' or 'K_TO_L'
        bidIncrementRules: DEFAULT_SLABS_L_CR
    });
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            if (isEdit && initialData) {
                let dateStr = '';
                if (initialData.startDate) {
                    const d = new Date(initialData.startDate);
                    dateStr = d.toISOString().split('T')[0];
                }

                const scale = initialData.budgetScale === 'K_TO_L' ? 'K_TO_L' : 'L_TO_CR';
                const defaultSlabs = scale === 'K_TO_L' ? DEFAULT_SLABS_K_L : DEFAULT_SLABS_L_CR;

                setFormData({
                    name: initialData.name,
                    startDate: dateStr,
                    time: initialData.time || '',
                    description: initialData.description || '',
                    squadSizeLimit: initialData.squadSizeLimit || 25,
                    auctionType: initialData.auctionType || 'owner_driven',
                    budgetScale: scale,
                    bidIncrementRules: (initialData.bidIncrementRules && initialData.bidIncrementRules.length > 0)
                        ? initialData.bidIncrementRules.map((r, i) => ({
                            upTo: r.upTo,
                            increment: r.increment,
                            label: defaultSlabs[i]?.label || `Up to ₹${r.upTo} ${scale === 'K_TO_L' ? 'K' : 'L'}`
                        }))
                        : defaultSlabs
                });
            } else {
                setFormData({
                    name: '',
                    startDate: '',
                    time: '',
                    description: '',
                    squadSizeLimit: 25,
                    auctionType: 'owner_driven',
                    budgetScale: 'L_TO_CR',
                    bidIncrementRules: DEFAULT_SLABS_L_CR
                });
            }
        }
    }, [isOpen, isEdit, initialData]);

    if (!isOpen) return null;

    const handleSwitchBudgetScale = (newScale) => {
        const defaultSlabs = newScale === 'K_TO_L' ? DEFAULT_SLABS_K_L : DEFAULT_SLABS_L_CR;
        const updatedRules = formData.bidIncrementRules.map((r, i) => ({
            ...r,
            label: defaultSlabs[i]?.label || `Up to ₹${r.upTo} ${newScale === 'K_TO_L' ? 'K' : 'L'}`
        }));
        setFormData({
            ...formData,
            budgetScale: newScale,
            bidIncrementRules: updatedRules
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await axios.put(`/api/tournaments/${initialData._id}`, formData);
            } else {
                await axios.post('/api/tournaments', formData);
            }
            onCreated();
            onClose();
        } catch (err) {
            console.error(err);
            alert('Failed to save tournament');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl relative my-auto flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
                {/* Header - Fixed at Top */}
                <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <Trophy className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-black text-slate-900 leading-tight">
                                {isEdit ? 'Edit Tournament' : 'Create New Tournament'}
                            </h2>
                            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-tight">
                                Set tournament rules and bidding format
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form - Smooth Scrollable Body */}
                <form id="tournament-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 text-xs">
                    <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                            Tournament Name *
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 sm:py-2 text-slate-900 text-xs font-semibold focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                            placeholder="e.g. IPL Season 2026"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div>
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                Start Date
                            </label>
                            <input
                                type="date"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                Time
                            </label>
                            <input
                                type="time"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                Squad Size Limit per Team *
                            </label>
                            <span className="text-[9px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-extrabold border border-blue-100">
                                Fixed by Admin
                            </span>
                        </div>
                        <input
                            type="number"
                            required
                            min="5"
                            max="50"
                            placeholder="e.g. 15, 18 or 25"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-slate-900 text-xs font-black focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                            value={formData.squadSizeLimit}
                            onChange={(e) => setFormData({ ...formData, squadSizeLimit: parseInt(e.target.value) || '' })}
                        />
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">
                            Strict roster capacity. Teams cannot buy players once limit is reached.
                        </p>
                    </div>

                    {/* Currency / Budget Scale */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                Auction Scale & Currency Unit *
                            </label>
                            <span className="text-[9px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded font-extrabold border border-purple-200">
                                {formData.budgetScale === 'K_TO_L' ? 'Thousands → Lakhs' : 'Lakhs → Crores'}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => handleSwitchBudgetScale('K_TO_L')}
                                className={`p-2 rounded-xl border text-left transition-all ${
                                    formData.budgetScale === 'K_TO_L'
                                        ? 'bg-purple-50/90 border-purple-500 text-purple-950 ring-1 ring-purple-500/30'
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-[11px] text-slate-900">Thousands to Lakhs</span>
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-purple-200/80 text-purple-900">K → L</span>
                                </div>
                                <div className="text-[9.5px] text-slate-500 leading-tight mt-1">
                                    Bids in <span className="font-bold text-purple-700">Thousands (K)</span>, Purse in <span className="font-bold text-purple-700">Lakhs (L)</span>. (Local / Club scale)
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleSwitchBudgetScale('L_TO_CR')}
                                className={`p-2 rounded-xl border text-left transition-all ${
                                    formData.budgetScale === 'L_TO_CR'
                                        ? 'bg-blue-50/90 border-blue-500 text-blue-950 ring-1 ring-blue-500/30'
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-[11px] text-slate-900">Lakhs to Crores</span>
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-200/80 text-blue-900">L → Cr</span>
                                </div>
                                <div className="text-[9.5px] text-slate-500 leading-tight mt-1">
                                    Bids in <span className="font-bold text-blue-700">Lakhs (L)</span>, Purse in <span className="font-bold text-blue-700">Crores (Cr)</span>. (Standard IPL scale)
                                </div>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                            Bidding Mode
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, auctionType: 'owner_driven' })}
                                className={`p-2 rounded-xl border text-left transition-all ${formData.auctionType === 'owner_driven' ? 'bg-blue-50/80 border-blue-500 text-blue-900 ring-1 ring-blue-500/30' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                            >
                                <div className="font-extrabold text-[11px] text-slate-900">Team Owners Bid</div>
                                <div className="text-[9.5px] text-slate-500 leading-tight mt-0.5">Real-time mobile & web bids.</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, auctionType: 'admin_driven' })}
                                className={`p-2 rounded-xl border text-left transition-all ${formData.auctionType === 'admin_driven' ? 'bg-blue-50/80 border-blue-500 text-blue-900 ring-1 ring-blue-500/30' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                            >
                                <div className="font-extrabold text-[11px] text-slate-900">Admin Bids</div>
                                <div className="text-[9.5px] text-slate-500 leading-tight mt-0.5">Auctioneer enters bids manually.</div>
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Bid Increment Slabs Section */}
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-wider">
                                    Bid Increment Slabs
                                </span>
                            </div>
                            <span className="text-[9px] text-blue-700 font-extrabold bg-blue-100/70 px-1.5 py-0.5 rounded">
                                Dynamic Rules
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-tight">
                            Configure how much bid increases at each price tier:
                        </p>

                        <div className="grid grid-cols-2 gap-2">
                            {formData.bidIncrementRules.map((slab, idx) => (
                                <div key={idx} className="p-1.5 sm:p-2 bg-white border border-slate-200 rounded-lg">
                                    <span className="block text-[9.5px] font-extrabold text-slate-600 truncate mb-1">
                                        {slab.label}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[11px] font-bold text-slate-400">+₹</span>
                                        <input
                                            type="number"
                                            required
                                            min="1"
                                            max="500"
                                            className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-xs font-black text-slate-900 focus:outline-none focus:border-blue-600"
                                            value={slab.increment}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 0;
                                                const updated = [...formData.bidIncrementRules];
                                                updated[idx] = { ...updated[idx], increment: val };
                                                setFormData({ ...formData, bidIncrementRules: updated });
                                            }}
                                        />
                                        <span className="text-[10px] font-bold text-slate-500">
                                            {formData.budgetScale === 'K_TO_L' ? 'K' : 'L'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </form>

                {/* Footer - Fixed at Bottom */}
                <div className="p-3 sm:p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="tournament-form"
                        disabled={loading}
                        className="py-2 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-xs transition-all disabled:opacity-50 text-xs active:scale-98"
                    >
                        {loading ? 'Saving...' : (isEdit ? 'Update Tournament' : 'Create Tournament')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTournamentModal;
