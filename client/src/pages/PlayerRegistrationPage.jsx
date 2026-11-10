import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Trophy,
    CheckCircle2,
    ArrowLeft,
    Upload,
    User,
    Sparkles,
    Award,
    Trash2,
    Lock,
    ExternalLink,
    ChevronDown,
    Activity,
    Calendar,
    Camera,
    Info,
    Crop
} from 'lucide-react';
import ImageCropModal from '../components/ImageCropModal';
import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
    { id: 'Batsman', label: 'Batsman', icon: '🏏', desc: 'Top/Middle order batter' },
    { id: 'Bowler', label: 'Bowler', icon: '🎯', desc: 'Fast or spin specialist' },
    { id: 'All-Rounder', label: 'All-Rounder', icon: '⚡', desc: 'Batting & bowling combo' },
    { id: 'Wicket Keeper', label: 'Wicket Keeper', icon: '🧤', desc: 'Keeper & batsman' }
];

const BATTING_STYLES = ['Right-Hand Bat', 'Left-Hand Bat'];

const BOWLING_STYLES = [
    'Right-Arm Fast',
    'Right-Arm Medium',
    'Right-Arm Off-Spin',
    'Right-Arm Leg-Spin',
    'Left-Arm Fast',
    'Left-Arm Spin',
    'None (Pure Batsman)'
];

const PlayerRegistrationPage = () => {
    const { tournamentId } = useParams();
    const [tournament, setTournament] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [registeredPlayer, setRegisteredPlayer] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);

    // Cricket Form Fields
    const [formData, setFormData] = useState({
        name: '',
        category: 'Batsman',
        battingStyle: 'Right-Hand Bat',
        bowlingStyle: 'Right-Arm Medium',
        basePrice: 20,
        age: '',
        cricHeroesProfileUrl: '',
        image: '',
        matches: '',
        runs: '',
        highestScore: '',
        wickets: '',
        bestBowling: ''
    });

    useEffect(() => {
        fetchTournament();
    }, [tournamentId]);

    useEffect(() => {
        if (tournament?.name) {
            document.title = `${tournament.name} - Official Player Registration | Dab Cric Auction`;
            const ogTitle = document.querySelector('meta[property="og:title"]');
            if (ogTitle) ogTitle.setAttribute('content', `${tournament.name} - Player Registration | Dab Cric Auction`);
            const ogDesc = document.querySelector('meta[property="og:description"]');
            if (ogDesc) ogDesc.setAttribute('content', `Register now for ${tournament.name} on Dab Cric Auction! Submit your player details, playing role, and stats.`);
        } else {
            document.title = 'Player Registration | Dab Cric Auction';
        }
    }, [tournament]);

    const fetchTournament = async () => {
        setLoading(true);
        setErrorMsg('');

        // 1. Try backend API via apiFetch
        try {
            const res = await apiFetch(`/api/tournaments/${tournamentId}`);
            if (res.ok) {
                const data = await res.json();
                setTournament(data);
                if (data.defaultBasePrice) {
                    setFormData(prev => ({ ...prev, basePrice: data.defaultBasePrice }));
                }
                setLoading(false);
                return;
            }
        } catch (apiErr) {
            console.warn('Backend API unreachable for tournament, trying Supabase fallback...', apiErr);
        }

        // 2. Direct Supabase Fallback
        try {
            const { data, error } = await supabase
                .from('tournaments')
                .select('*')
                .eq('_id', tournamentId)
                .single();

            if (!error && data) {
                const mapped = {
                    _id: data._id,
                    name: data.name,
                    status: data.status,
                    registrationOpen: data.registration_open !== false,
                    logo: data.logo || '',
                    startDate: data.start_date || '',
                    squadSizeLimit: data.squad_size_limit || 25
                };
                setTournament(mapped);
            } else {
                setErrorMsg('Tournament not found or registration is currently closed.');
            }
        } catch (supaErr) {
            console.error('Supabase fetch failed:', supaErr);
            setErrorMsg('Unable to load tournament information. Please check your link.');
        } finally {
            setLoading(false);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 8 * 1024 * 1024) {
                alert('File size too large. Please select an image under 8MB.');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setCropImageSrc(reader.result);
                setShowCropModal(true);
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        }
    };

    const handleCropDone = (croppedBase64) => {
        setFormData(prev => ({ ...prev, image: croppedBase64 }));
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, image: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        if (!formData.name.trim()) {
            setErrorMsg('Please enter your full name.');
            return;
        }

        setSubmitting(true);

        const payload = {
            name: formData.name.trim(),
            category: formData.category,
            battingStyle: formData.battingStyle,
            bowlingStyle: formData.bowlingStyle,
            age: Number(formData.age) || null,
            cricHeroesProfileUrl: formData.cricHeroesProfileUrl.trim(),
            image: formData.image,
            stats: {
                matches: Number(formData.matches) || 0,
                runs: Number(formData.runs) || 0,
                highestScore: formData.highestScore || '0',
                wickets: Number(formData.wickets) || 0,
                bestBowling: formData.bestBowling || '-'
            }
        };

        // 1. Try Backend API
        try {
            const res = await apiFetch(`/api/tournaments/${tournamentId}/register-player`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setRegisteredPlayer(data.player);
                setSubmitted(true);
                setSubmitting(false);
                return;
            } else if (res.status === 400 || res.status === 403) {
                const errData = await res.json().catch(() => ({}));
                setErrorMsg(errData.message || 'Registration failed.');
                setSubmitting(false);
                return;
            }
        } catch (apiErr) {
            console.warn('Backend API registration failed, attempting direct Supabase insert...', apiErr);
        }

        // 2. Direct Supabase Cloud Fallback
        try {
            const newPlayerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            const basePrice = Number(formData.basePrice) || 20;

            const record = {
                _id: newPlayerId,
                tournament_id: tournamentId,
                name: payload.name,
                category: payload.category,
                batting_style: payload.battingStyle,
                bowling_style: payload.bowlingStyle,
                age: payload.age,
                cric_heroes_profile_url: payload.cricHeroesProfileUrl,
                image: payload.image,
                base_price: basePrice,
                current_bid: 0,
                sold_price: 0,
                status: 'pending',
                stats: payload.stats,
                is_re_auction: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('players')
                .insert(record)
                .select()
                .single();

            if (error) {
                throw new Error(error.message);
            }

            setRegisteredPlayer({
                _id: record._id,
                name: record.name,
                category: record.category,
                battingStyle: record.batting_style,
                bowlingStyle: record.bowling_style,
                basePrice: record.base_price,
                image: record.image
            });
            setSubmitted(true);
        } catch (supaErr) {
            console.error('Direct Supabase registration failed:', supaErr);
            setErrorMsg(supaErr.message || 'Failed to submit player registration. Please check your connection.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-700">
                <div className="w-12 h-12 rounded-2xl border-4 border-blue-600 border-t-transparent animate-spin mb-4" />
                <h3 className="text-base font-black text-slate-900">Loading Registration Form</h3>
                <p className="text-xs text-slate-500 mt-1">Connecting to tournament pool...</p>
            </div>
        );
    }

    if (submitted && registeredPlayer) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 font-sans selection:bg-blue-600 selection:text-white">
                <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 text-center animate-in fade-in zoom-in-95 duration-200">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-3xl flex items-center justify-center text-emerald-600 mx-auto mb-4 shadow-sm">
                        <CheckCircle2 className="w-9 h-9 sm:w-10 sm:h-10" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black rounded-full uppercase tracking-wider">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Registration Confirmed
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3 mb-1">
                        You're In The Auction!
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mb-6 font-medium">
                        Your player profile has been submitted to <strong>{tournament?.name || 'Tournament'}</strong>.
                    </p>

                    {/* Preview Player Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 mb-6 text-left relative overflow-hidden">
                        <div className="flex items-center gap-3.5">
                            <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                                {registeredPlayer.image ? (
                                    <img src={registeredPlayer.image} alt={registeredPlayer.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-slate-400" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="font-black text-base sm:text-lg text-slate-900 truncate">{registeredPlayer.name}</h3>
                                <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
                                    {registeredPlayer.category}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 truncate">
                                    {registeredPlayer.battingStyle} • {registeredPlayer.bowlingStyle}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200 text-xs">
                            <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">Base Price</span>
                                <p className="font-black text-slate-900 text-sm">₹{registeredPlayer.basePrice} L</p>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                                <span className="text-slate-400 text-[10px] uppercase font-bold block">Status</span>
                                <p className="font-bold text-amber-600 capitalize text-sm">Pending Approval</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                            type="button"
                            onClick={() => {
                                setSubmitted(false);
                                setFormData({
                                    name: '',
                                    category: 'Batsman',
                                    battingStyle: 'Right-Hand Bat',
                                    bowlingStyle: 'Right-Arm Medium',
                                    basePrice: 20,
                                    age: '',
                                    cricHeroesProfileUrl: '',
                                    image: '',
                                    matches: '',
                                    runs: '',
                                    highestScore: '',
                                    wickets: '',
                                    bestBowling: ''
                                });
                            }}
                            className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all active:scale-98"
                        >
                            Register Another Player
                        </button>
                        <Link
                            to={`/auction/${tournamentId}`}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-1.5 active:scale-98"
                        >
                            <span>Watch Live Auction</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (tournament && tournament.registrationOpen === false) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
                <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                        REGISTRATIONS CLOSED
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-3">{tournament.name}</h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-2 font-medium leading-relaxed">
                        Player self-registration is currently closed by the tournament organizer. The registration window has ended.
                    </p>
                    <div className="mt-6 flex flex-col gap-2.5">
                        <Link
                            to={`/auction/${tournamentId}`}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                            <span>Watch Live Auction Stream</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                            to="/"
                            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                        >
                            Go to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 py-4 sm:py-8 px-3 sm:px-6 font-sans selection:bg-blue-600 selection:text-white">
            <div className="max-w-2xl mx-auto">
                {/* Mobile Friendly Header */}
                <header className="mb-4 sm:mb-6 bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                        <img
                            src={tournament?.logo || '/logo.png'}
                            alt="Tournament"
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-contain bg-white border border-slate-200 p-0.5 shadow-2xs shrink-0"
                            onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                        />
                        <div className="min-w-0">
                            <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">
                                {tournament?.name || 'Tournament Registration'}
                            </h1>
                            <div className="flex items-center gap-1.5 text-[11px] text-blue-600 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Official Player Registration</span>
                            </div>
                        </div>
                    </div>

                    <Link
                        to="/"
                        className="px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-bold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all flex items-center gap-1 shrink-0"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Back</span>
                    </Link>
                </header>

                {/* Main Registration Card */}
                <div className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-7 md:p-8 shadow-sm relative overflow-hidden">
                    {/* Top Accent Strip */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

                    {/* Intro Header */}
                    <div className="mb-5 pb-4 border-b border-slate-100">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 border border-blue-200/80 text-blue-700 rounded-full text-[11px] font-black uppercase tracking-wider mb-2">
                            <Sparkles className="w-3 h-3 text-blue-600" /> Cricket Player Profile
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                            Enter Your Cricket Details
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Fill your playing role, batting and bowling specs, and match stats for the auction pool.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Photo Upload & Preview - Mobile Centered Card */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                            <div className="relative group shrink-0">
                                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-2xs">
                                    {formData.image ? (
                                        <img src={formData.image} alt="Player" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-slate-400 p-2">
                                            <Camera className="w-8 h-8 mb-1 text-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">1:1 Photo</span>
                                        </div>
                                    )}
                                </div>
                                {formData.image && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCropImageSrc(formData.image);
                                            setShowCropModal(true);
                                        }}
                                        className="absolute -bottom-1 -right-1 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
                                        title="Crop Image"
                                    >
                                        <Crop className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-slate-800 mb-0.5">
                                    Player Photo (1:1 Frame)
                                </label>
                                <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                                    Clear passport or action photo. Auto-cropped 1:1 for the live auction screen.
                                </p>
                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                    <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-all active:scale-98">
                                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                                        <span>{formData.image ? 'Change Photo' : 'Choose Photo (1:1)'}</span>
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </label>
                                    {formData.image && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all"
                                            title="Remove Image"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Full Name & Age */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Virat Kohli"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-slate-900 text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Age (Years)
                                </label>
                                <input
                                    type="number"
                                    min="14"
                                    max="60"
                                    placeholder="e.g. 24"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                                    value={formData.age}
                                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Interactive Category Selector (Mobile Pill Cards) */}
                        <div>
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-2">
                                Playing Role (Category) <span className="text-rose-500">*</span>
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                                {CATEGORIES.map(cat => {
                                    const selected = formData.category === cat.id;
                                    return (
                                        <button
                                            type="button"
                                            key={cat.id}
                                            onClick={() => setFormData({ ...formData, category: cat.id })}
                                            className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                                                selected
                                                    ? 'bg-blue-50/80 border-blue-600 text-blue-900 shadow-xs ring-1 ring-blue-600/30'
                                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xl">{cat.icon}</span>
                                                {selected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                                            </div>
                                            <div>
                                                <span className="text-xs font-black block leading-tight">{cat.label}</span>
                                                <span className="text-[10px] text-slate-500 block mt-0.5 line-clamp-1">{cat.desc}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Batting & Bowling Specs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Batting Style
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none appearance-none pr-10 cursor-pointer"
                                        value={formData.battingStyle}
                                        onChange={e => setFormData({ ...formData, battingStyle: e.target.value })}
                                    >
                                        {BATTING_STYLES.map(style => (
                                            <option key={style} value={style}>{style}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Bowling Style
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none appearance-none pr-10 cursor-pointer"
                                        value={formData.bowlingStyle}
                                        onChange={e => setFormData({ ...formData, bowlingStyle: e.target.value })}
                                    >
                                        {BOWLING_STYLES.map(style => (
                                            <option key={style} value={style}>{style}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* CricHeroes Profile URL */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                                    CricHeroes Profile URL (Optional)
                                </label>
                                <span className="text-[11px] text-slate-500 font-medium">Link scorecard</span>
                            </div>
                            <input
                                type="url"
                                placeholder="https://cricheroes.in/player-profile/..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-semibold focus:border-blue-600 focus:bg-white focus:outline-none transition-all placeholder:text-slate-400"
                                value={formData.cricHeroesProfileUrl}
                                onChange={e => setFormData({ ...formData, cricHeroesProfileUrl: e.target.value })}
                            />
                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                <Info className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>Paste your public profile link so team owners can view your match stats during the auction.</span>
                            </p>
                        </div>

                        {/* Career Match Stats Card (Mobile Responsive Grid) */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <div className="flex items-center gap-1.5 mb-3">
                                <Activity className="w-4 h-4 text-indigo-600" />
                                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                    Career Match Stats (Optional)
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                <div className="bg-white p-2 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Matches</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-transparent text-sm text-slate-900 focus:outline-none font-bold"
                                        value={formData.matches}
                                        onChange={e => setFormData({ ...formData, matches: e.target.value })}
                                    />
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Runs</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-transparent text-sm text-slate-900 focus:outline-none font-bold"
                                        value={formData.runs}
                                        onChange={e => setFormData({ ...formData, runs: e.target.value })}
                                    />
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Highest</span>
                                    <input
                                        type="text"
                                        placeholder="e.g. 84*"
                                        className="w-full bg-transparent text-sm text-slate-900 focus:outline-none font-bold"
                                        value={formData.highestScore}
                                        onChange={e => setFormData({ ...formData, highestScore: e.target.value })}
                                    />
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Wickets</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-transparent text-sm text-slate-900 focus:outline-none font-bold"
                                        value={formData.wickets}
                                        onChange={e => setFormData({ ...formData, wickets: e.target.value })}
                                    />
                                </div>
                                <div className="bg-white p-2 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Best Bowling</span>
                                    <input
                                        type="text"
                                        placeholder="e.g. 4/18"
                                        className="w-full bg-transparent text-sm text-slate-900 focus:outline-none font-bold"
                                        value={formData.bestBowling}
                                        onChange={e => setFormData({ ...formData, bestBowling: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Submit Action Button */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-blue-500/25 transition-all active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Submitting Player Profile...</span>
                                    </>
                                ) : (
                                    <>
                                        <Award className="w-4 h-4" />
                                        <span>Submit Player Profile for Auction</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* 1:1 Image Crop Modal */}
                <ImageCropModal
                    isOpen={showCropModal}
                    imageSrc={cropImageSrc}
                    onCropComplete={handleCropDone}
                    onClose={() => setShowCropModal(false)}
                    title="Crop Player Photo (1:1 Frame)"
                    outputSize={512}
                />
            </div>
        </div>
    );
};

export default PlayerRegistrationPage;
