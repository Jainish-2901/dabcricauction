import React, { useState } from 'react';
import axios from 'axios';
import { X, Trophy, TrendingUp, Layers, Coins, Plus, Trash2, RotateCcw, Calendar, Clock, Upload, Maximize2, Image as ImageIcon } from 'lucide-react';
import toast from '../lib/toast';
import { useAuth } from '../context/AuthContext';
import { WebDatePickerModal, WebTimePickerModal } from './DateTimePickerModal';
import ImageCropModal from './ImageCropModal';
import SafeImage from './SafeImage';

const DEFAULT_SLABS_L_CR = [
    { from: 0, fromUnit: 'L', upTo: 1, toUnit: 'Cr', increment: 10, incrementUnit: 'L', label: 'Up to ₹1 Cr (100 L)' },
    { from: 1, fromUnit: 'Cr', upTo: 5, toUnit: 'Cr', increment: 25, incrementUnit: 'L', label: '₹1 Cr - ₹5 Cr (500 L)' },
    { from: 5, fromUnit: 'Cr', upTo: 10, toUnit: 'Cr', increment: 50, incrementUnit: 'L', label: '₹5 Cr - ₹10 Cr (1000 L)' },
    { from: 10, fromUnit: 'Cr', upTo: 999999, toUnit: 'Cr', increment: 100, incrementUnit: 'L', label: 'Above ₹10 Cr (> 1000 L)' }
];

const DEFAULT_SLABS_K_L = [
    { from: 0, fromUnit: 'K', upTo: 100, toUnit: 'K', increment: 5, incrementUnit: 'K', label: 'Up to ₹1 L (100 K)' },
    { from: 1, fromUnit: 'L', upTo: 5, toUnit: 'L', increment: 10, incrementUnit: 'K', label: '₹1 L - ₹5 L (500 K)' },
    { from: 5, fromUnit: 'L', upTo: 10, toUnit: 'L', increment: 25, incrementUnit: 'K', label: '₹5 L - ₹10 L (1000 K)' },
    { from: 10, fromUnit: 'L', upTo: 999999, toUnit: 'L', increment: 50, incrementUnit: 'K', label: 'Above ₹10 L (> 1000 K)' }
];

const CreateTournamentModal = ({ isOpen, onClose, onCreated, initialData = null, isEdit = false }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        time: '',
        description: '',
        squadSizeLimit: 25,
        auctionType: 'owner_driven',
        budgetScale: 'L_TO_CR', // 'L_TO_CR' or 'K_TO_L'
        bidIncrementRules: DEFAULT_SLABS_L_CR,
        logo: ''
    });
    const [loading, setLoading] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [showLogoLightbox, setShowLogoLightbox] = useState(false);

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
                const defUnit = scale === 'K_TO_L' ? 'K' : 'L';
                const allowedUnits = scale === 'K_TO_L' ? ['K', 'L'] : ['L', 'Cr'];

                const mappedRules = (initialData.bidIncrementRules && initialData.bidIncrementRules.length > 0)
                    ? initialData.bidIncrementRules.map((r, i, arr) => {
                        const prevUpTo = i > 0 ? (Number(arr[i - 1].upTo) || 0) : 0;
                        let fUnit = r.fromUnit || r.rangeUnit || defUnit;
                        let tUnit = r.toUnit || r.rangeUnit || defUnit;
                        let iUnit = r.incrementUnit || defUnit;
                        if (!allowedUnits.includes(fUnit)) fUnit = defUnit;
                        if (!allowedUnits.includes(tUnit)) tUnit = defUnit;
                        if (!allowedUnits.includes(iUnit)) iUnit = defUnit;
                        return {
                            from: r.from !== undefined ? Number(r.from) : prevUpTo,
                            fromUnit: fUnit,
                            upTo: Number(r.upTo) || 100,
                            toUnit: tUnit,
                            rangeUnit: tUnit,
                            increment: Number(r.increment) || (scale === 'K_TO_L' ? 5 : 10),
                            incrementUnit: iUnit,
                            label: r.label || defaultSlabs[i]?.label || ''
                        };
                    })
                    : defaultSlabs;

                setFormData({
                    name: initialData.name,
                    startDate: dateStr,
                    time: initialData.time || '',
                    description: initialData.description || '',
                    squadSizeLimit: initialData.squadSizeLimit || 25,
                    auctionType: initialData.auctionType || 'owner_driven',
                    budgetScale: scale,
                    bidIncrementRules: mappedRules,
                    logo: initialData.logo || initialData.image || ''
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
                    bidIncrementRules: DEFAULT_SLABS_L_CR,
                    logo: ''
                });
            }
        }
    }, [isOpen, isEdit, initialData]);

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 8 * 1024 * 1024) {
            toast.warning('Tournament logo image size must be less than 8MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setCropImageSrc(reader.result);
            setShowCropModal(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropDone = (croppedBase64) => {
        setFormData(prev => ({ ...prev, logo: croppedBase64 }));
    };

    const handleRemoveLogo = () => {
        setFormData(prev => ({ ...prev, logo: '' }));
    };

    if (!isOpen) return null;

    const handleSwitchBudgetScale = (newScale) => {
        const defaultSlabs = newScale === 'K_TO_L' ? DEFAULT_SLABS_K_L : DEFAULT_SLABS_L_CR;
        const defUnit = newScale === 'K_TO_L' ? 'K' : 'L';
        const allowedUnits = newScale === 'K_TO_L' ? ['K', 'L'] : ['L', 'Cr'];
        const updatedRules = formData.bidIncrementRules.map((r, i) => {
            let fUnit = r.fromUnit || defUnit;
            let tUnit = r.toUnit || defUnit;
            let iUnit = r.incrementUnit || defUnit;
            if (!allowedUnits.includes(fUnit)) fUnit = defUnit;
            if (!allowedUnits.includes(tUnit)) tUnit = defUnit;
            if (!allowedUnits.includes(iUnit)) iUnit = defUnit;
            return {
                ...r,
                fromUnit: fUnit,
                toUnit: tUnit,
                rangeUnit: tUnit,
                incrementUnit: iUnit,
                label: defaultSlabs[i]?.label || ''
            };
        });
        setFormData({
            ...formData,
            budgetScale: newScale,
            bidIncrementRules: updatedRules
        });
    };

    const handleAddSlab = () => {
        const rules = [...formData.bidIncrementRules];
        const last = rules[rules.length - 1];
        const defUnit = formData.budgetScale === 'K_TO_L' ? 'K' : 'L';
        const allowedUnits = formData.budgetScale === 'K_TO_L' ? ['K', 'L'] : ['L', 'Cr'];
        const lastFrom = last ? Number(last.from) || 0 : 0;
        const lastUpTo = (last && Number(last.upTo) < 999999) ? Number(last.upTo) : (lastFrom + 5);
        const newFrom = lastUpTo;
        const newUpTo = newFrom * 2 || 10;
        const newInc = last ? (Number(last.increment) * 2 || 20) : 10;
        let fUnit = last?.toUnit || defUnit;
        let tUnit = last?.toUnit || defUnit;
        let iUnit = last?.incrementUnit || defUnit;
        if (!allowedUnits.includes(fUnit)) fUnit = defUnit;
        if (!allowedUnits.includes(tUnit)) tUnit = defUnit;
        if (!allowedUnits.includes(iUnit)) iUnit = defUnit;

        rules.push({
            from: newFrom,
            fromUnit: fUnit,
            upTo: newUpTo,
            toUnit: tUnit,
            rangeUnit: tUnit,
            increment: newInc,
            incrementUnit: iUnit,
            label: `₹${newFrom} ${fUnit} - ₹${newUpTo} ${tUnit}`
        });
        setFormData({ ...formData, bidIncrementRules: rules });
    };

    const handleRemoveSlab = (idx) => {
        if (formData.bidIncrementRules.length <= 1) {
            toast.warning('At least one slab rule is required.');
            return;
        }
        const updated = formData.bidIncrementRules.filter((_, i) => i !== idx);
        setFormData({ ...formData, bidIncrementRules: updated });
    };

    const handleUpdateSlab = (idx, field, value) => {
        const updated = [...formData.bidIncrementRules];
        updated[idx] = { ...updated[idx], [field]: value };
        if (field === 'toUnit') {
            updated[idx].rangeUnit = value;
        }
        setFormData({ ...formData, bidIncrementRules: updated });
    };

    const handleResetSlabs = () => {
        const defaultSlabs = formData.budgetScale === 'K_TO_L' ? DEFAULT_SLABS_K_L : DEFAULT_SLABS_L_CR;
        setFormData({ ...formData, bidIncrementRules: defaultSlabs });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const defUnit = formData.budgetScale === 'K_TO_L' ? 'K' : 'L';
            const allowedUnits = formData.budgetScale === 'K_TO_L' ? ['K', 'L'] : ['L', 'Cr'];
            const cleanedRules = (formData.bidIncrementRules || []).map((r, i, arr) => {
                const prevUpTo = i > 0 ? (Number(arr[i - 1].upTo) || 0) : 0;
                let fUnit = r.fromUnit || r.rangeUnit || defUnit;
                let tUnit = r.toUnit || r.rangeUnit || defUnit;
                let iUnit = r.incrementUnit || defUnit;
                if (!allowedUnits.includes(fUnit)) fUnit = defUnit;
                if (!allowedUnits.includes(tUnit)) tUnit = defUnit;
                if (!allowedUnits.includes(iUnit)) iUnit = defUnit;
                return {
                    from: r.from !== undefined ? Number(r.from) : prevUpTo,
                    fromUnit: fUnit,
                    upTo: Number(r.upTo) || 100,
                    toUnit: tUnit,
                    rangeUnit: tUnit,
                    increment: Number(r.increment) || (formData.budgetScale === 'K_TO_L' ? 5 : 10),
                    incrementUnit: iUnit,
                    label: r.label || ''
                };
            });
            const submitData = { 
                ...formData, 
                bidIncrementRules: cleanedRules, 
                logo: formData.logo || '',
                createdBy: isEdit ? (initialData?.createdBy || user?._id || user?.id) : (user?._id || user?.id)
            };

            if (isEdit) {
                await axios.put(`/api/tournaments/${initialData._id}`, submitData);
                toast.success('Tournament updated successfully');
            } else {
                await axios.post('/api/tournaments', submitData);
                toast.success('Tournament created successfully');
            }
            onCreated();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error('Failed to save tournament');
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
                    {/* Tournament Logo Upload Section */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                            Tournament Logo
                        </label>
                        <div className="flex items-center gap-3 p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl">
                            <div
                                onClick={() => {
                                    if (formData.logo) setShowLogoLightbox(true);
                                }}
                                className={`w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs relative group ${formData.logo ? 'cursor-pointer hover:ring-2 hover:ring-blue-500' : ''}`}
                                title={formData.logo ? "Click to open full logo" : "No logo uploaded"}
                            >
                                <SafeImage
                                    src={formData.logo}
                                    alt="Tournament Logo Preview"
                                    className="w-full h-full object-contain p-1"
                                    fallback={
                                        <div className="flex flex-col items-center justify-center text-slate-300">
                                            <Trophy className="w-5 h-5 text-slate-400" />
                                            <span className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">No Logo</span>
                                        </div>
                                    }
                                />
                                {formData.logo && (
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                                        <Maximize2 className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 shadow-2xs inline-flex items-center gap-1.5 transition-all">
                                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                                        <span>{formData.logo ? 'Change Logo' : 'Upload Logo'}</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleLogoChange}
                                        />
                                    </label>
                                    {formData.logo && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setShowLogoLightbox(true)}
                                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all"
                                                title="Click to open full image"
                                            >
                                                <Maximize2 className="w-3.5 h-3.5" /> View
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRemoveLogo}
                                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-all"
                                                title="Remove Logo"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Remove
                                            </button>
                                        </>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">
                                    Square PNG, JPG or WebP (max 8MB). Tap thumbnail or View to zoom.
                                </p>
                            </div>
                        </div>
                    </div>

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
                            <button
                                type="button"
                                onClick={() => setShowDatePicker(true)}
                                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer text-left focus:outline-none focus:border-blue-600 focus:bg-white"
                            >
                                <span className={formData.startDate ? 'text-slate-900 font-bold' : 'text-slate-400 font-normal'}>
                                    {formData.startDate || 'Select Date'}
                                </span>
                                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            </button>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">
                                Time
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowTimePicker(true)}
                                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold flex items-center justify-between transition-all cursor-pointer text-left focus:outline-none focus:border-blue-600 focus:bg-white"
                            >
                                <span className={formData.time ? 'text-slate-900 font-bold' : 'text-slate-400 font-normal'}>
                                    {formData.time || 'Select Time'}
                                </span>
                                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            </button>
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
                    <div className="p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                                <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
                                    Bid Increment Slabs (બોલી વધારાના સ્લેબ્સ)
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={handleResetSlabs}
                                    className="text-[10px] text-slate-500 hover:text-slate-800 font-bold bg-white border border-slate-200 hover:bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1 transition-colors shadow-2xs"
                                    title="Reset to recommended default slabs"
                                >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={handleAddSlab}
                                    className="text-[10px] text-blue-700 hover:text-blue-900 font-black bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors shadow-2xs"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add Slab
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-tight">
                            દરેક સ્લેબની રેન્જ (From - To), તેનું યુનિટ ({formData.budgetScale === 'K_TO_L' ? 'K, L' : 'L, Cr'}) અને તેમાં થતો વધારો (+₹ Increment & Unit) જાતે સેટ કરો:
                        </p>

                        <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                            {formData.bidIncrementRules.map((slab, idx) => {
                                const isLast = idx === formData.bidIncrementRules.length - 1;
                                const isUnlimited = Number(slab.upTo) >= 999999;
                                const availableUnits = formData.budgetScale === 'K_TO_L' ? ['K', 'L'] : ['L', 'Cr'];
                                const defaultUnit = formData.budgetScale === 'K_TO_L' ? 'K' : 'L';
                                const fromUnit = availableUnits.includes(slab.fromUnit) ? slab.fromUnit : (availableUnits.includes(slab.rangeUnit) ? slab.rangeUnit : defaultUnit);
                                const toUnit = availableUnits.includes(slab.toUnit) ? slab.toUnit : (availableUnits.includes(slab.rangeUnit) ? slab.rangeUnit : defaultUnit);
                                const incUnit = availableUnits.includes(slab.incrementUnit) ? slab.incrementUnit : defaultUnit;

                                return (
                                    <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2">
                                        {/* Card Header: Slab # & Trash */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-blue-800 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                                                Slab #{idx + 1}
                                            </span>
                                            {formData.bidIncrementRules.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSlab(idx)}
                                                    className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50"
                                                    title="Remove slab"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Section 1: PRICE RANGE */}
                                        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 space-y-2">
                                            <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
                                                PRICE RANGE (પ્રાઈઝ રેન્જ)
                                            </span>
                                            <div className="space-y-1.5">
                                                {/* From Group - Own line */}
                                                <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200">
                                                    <span className="text-[11px] font-black text-slate-500 w-10 pl-1 shrink-0">From</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        className="w-20 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-black text-slate-900 focus:outline-none focus:border-blue-600"
                                                        value={slab.from !== undefined ? slab.from : ''}
                                                        onChange={(e) => handleUpdateSlab(idx, 'from', Number(e.target.value) || 0)}
                                                    />
                                                    <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-md gap-1 border border-slate-200 ml-auto shrink-0">
                                                        {availableUnits.map(u => {
                                                            const isActive = fromUnit === u;
                                                            return (
                                                                <button
                                                                    key={u}
                                                                    type="button"
                                                                    onClick={() => handleUpdateSlab(idx, 'fromUnit', u)}
                                                                    className={`px-2.5 py-0.5 rounded text-[10.5px] font-black transition-all ${
                                                                        isActive
                                                                            ? 'bg-blue-600 text-white shadow-xs'
                                                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                                                    }`}
                                                                >
                                                                    {u}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* To Group - Next line */}
                                                <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200">
                                                    <span className="text-[11px] font-black text-slate-500 w-10 pl-1 shrink-0">To</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder={isLast ? "Above / ∞" : "Max"}
                                                        className="w-20 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-black text-slate-900 focus:outline-none focus:border-blue-600"
                                                        value={isUnlimited ? '' : (slab.upTo !== undefined ? slab.upTo : '')}
                                                        onChange={(e) => {
                                                            const v = e.target.value === '' ? 999999 : Number(e.target.value);
                                                            handleUpdateSlab(idx, 'upTo', isNaN(v) ? 999999 : v);
                                                        }}
                                                    />
                                                    <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-md gap-1 border border-slate-200 ml-auto shrink-0">
                                                        {availableUnits.map(u => {
                                                            const isActive = toUnit === u;
                                                            return (
                                                                <button
                                                                    key={u}
                                                                    type="button"
                                                                    onClick={() => handleUpdateSlab(idx, 'toUnit', u)}
                                                                    className={`px-2.5 py-0.5 rounded text-[10.5px] font-black transition-all ${
                                                                        isActive
                                                                            ? 'bg-blue-600 text-white shadow-xs'
                                                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                                                    }`}
                                                                >
                                                                    {u}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Section 2: INCREMENT */}
                                        <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                                            <span className="text-[9.5px] font-black text-slate-500 uppercase tracking-wider block">
                                                INCREMENT (વધારો +₹)
                                            </span>
                                            <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg border border-slate-200">
                                                <span className="text-[12px] font-black text-emerald-600 w-10 pl-1 shrink-0">+₹</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    required
                                                    className="w-20 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-black text-emerald-700 focus:outline-none focus:border-emerald-600"
                                                    value={slab.increment}
                                                    onChange={(e) => handleUpdateSlab(idx, 'increment', Number(e.target.value) || 0)}
                                                />
                                                <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-md gap-1 border border-slate-200 ml-auto shrink-0">
                                                    {availableUnits.map(u => {
                                                        const isActive = incUnit === u;
                                                        return (
                                                            <button
                                                                key={u}
                                                                type="button"
                                                                onClick={() => handleUpdateSlab(idx, 'incrementUnit', u)}
                                                                className={`px-2.5 py-0.5 rounded text-[10.5px] font-black transition-all ${
                                                                    isActive
                                                                        ? 'bg-emerald-600 text-white shadow-xs'
                                                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                                                }`}
                                                            >
                                                                {u}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
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

            {/* Date & Time Picker Modals */}
            <WebDatePickerModal
                isOpen={showDatePicker}
                currentDate={formData.startDate}
                onSelect={(d) => setFormData(prev => ({ ...prev, startDate: d }))}
                onClose={() => setShowDatePicker(false)}
            />

            <WebTimePickerModal
                isOpen={showTimePicker}
                currentTime={formData.time}
                onSelect={(t) => setFormData(prev => ({ ...prev, time: t }))}
                onClose={() => setShowTimePicker(false)}
            />

            {/* Image Crop Modal */}
            {showCropModal && (
                <ImageCropModal
                    isOpen={showCropModal}
                    imageSrc={cropImageSrc}
                    aspectRatio={1}
                    title="Crop Tournament Logo (1:1 Frame)"
                    onCropComplete={handleCropDone}
                    onCropDone={handleCropDone}
                    onClose={() => {
                        setShowCropModal(false);
                        setCropImageSrc(null);
                    }}
                />
            )}

            {/* Full Screen Logo Lightbox */}
            {showLogoLightbox && formData.logo && (
                <div
                    className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 select-none animate-in fade-in duration-150"
                    onClick={() => setShowLogoLightbox(false)}
                >
                    <div
                        className="w-full max-w-md flex items-center justify-between mb-3 text-white px-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-black uppercase tracking-wider text-blue-400 bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-400/30">
                                Tournament Logo
                            </span>
                            <h3 className="text-base font-bold truncate text-white/90">
                                {formData.name || 'Tournament Logo Preview'}
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowLogoLightbox(false)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-all cursor-pointer shadow-lg hover:rotate-90"
                            title="Close preview (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div
                        className="relative max-w-[90vw] max-h-[75vh] flex items-center justify-center p-2 bg-slate-900/60 rounded-2xl border border-white/10 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={formData.logo}
                            alt={formData.name || 'Tournament Logo'}
                            className="max-w-full max-h-[72vh] w-auto h-auto object-contain rounded-xl"
                        />
                    </div>

                    <p className="mt-3 text-xs text-white/60 font-medium tracking-wide">
                        Click anywhere or press close to exit
                    </p>
                </div>
            )}
        </div>
    );
};

export default CreateTournamentModal;
