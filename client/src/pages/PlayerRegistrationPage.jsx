import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Trophy, CheckCircle2, ArrowLeft, Upload, User, Sparkles, Award, Trash2, Lock } from 'lucide-react';
import ImageCropModal from '../components/ImageCropModal';

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
        try {
            const res = await axios.get(`/api/tournaments/${tournamentId}`);
            setTournament(res.data);
        } catch (err) {
            console.error('Failed to load tournament info', err);
            setErrorMsg('Tournament not found or registration is currently closed.');
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
        setSubmitting(true);
        setErrorMsg('');

        try {
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

            const res = await axios.post(`/api/tournaments/${tournamentId}/register-player`, payload);
            setRegisteredPlayer(res.data.player);
            setSubmitted(true);
        } catch (err) {
            console.error(err);
            setErrorMsg(err.response?.data?.message || 'Failed to submit player registration.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold text-slate-700">
                Loading Registration Form...
            </div>
        );
    }

    if (submitted && registeredPlayer) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 font-sans">
                <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-4">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black rounded-full uppercase tracking-wider">
                        Registration Confirmed
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 mt-3 mb-1">
                        You're In The Auction!
                    </h2>
                    <p className="text-xs text-slate-500 mb-6 font-medium">
                        Your player profile has been submitted to <strong>{tournament?.name || 'Tournament'}</strong>.
                    </p>

                    {/* Preview Player Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-left relative overflow-hidden">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                                {registeredPlayer.image ? (
                                    <img src={registeredPlayer.image} alt={registeredPlayer.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-slate-400" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-black text-base text-slate-900">{registeredPlayer.name}</h3>
                                <p className="text-xs font-bold text-blue-600">{registeredPlayer.category}</p>
                                <p className="text-[11px] text-slate-500">{registeredPlayer.battingStyle} • {registeredPlayer.bowlingStyle}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200 text-xs">
                            <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold">Base Price</span>
                                <p className="font-black text-slate-900">₹{registeredPlayer.basePrice} L</p>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold">Auction Status</span>
                                <p className="font-bold text-amber-600 capitalize">Pending Approval</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setSubmitted(false);
                                setFormData({
                                    name: '', category: 'Batsman', battingStyle: 'Right-Hand Bat', bowlingStyle: 'Right-Arm Medium',
                                    basePrice: 20, age: '', cricHeroesProfileUrl: '', image: '',
                                    matches: '', runs: '', highestScore: '', wickets: '', bestBowling: ''
                                });
                            }}
                            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all"
                        >
                            Register Another
                        </button>
                        <Link
                            to={`/auction/${tournamentId}`}
                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center"
                        >
                            Watch Live Auction
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (tournament && tournament.registrationOpen === false) {
        return (
            <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4 font-sans">
                <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8" />
                    </div>
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-wider">
                        REGISTRATIONS CLOSED
                    </span>
                    <h2 className="text-xl font-black text-slate-900 mt-3">{tournament.name}</h2>
                    <p className="text-xs text-slate-500 mt-2 font-medium">
                        Player self-registration is currently closed by the tournament organizer. The registration window has ended.
                    </p>
                    <div className="mt-6 flex flex-col gap-2">
                        <Link
                            to={`/auction/${tournamentId}`}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
                        >
                            Watch Live Auction
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
        <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 font-sans">
            <div className="max-w-2xl mx-auto">
                <header className="mb-6 flex justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Dab Cric Auction" className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1 shadow-sm" />
                        <div>
                            <h1 className="text-lg font-black text-slate-900">{tournament?.name || 'Tournament'}</h1>
                            <p className="text-xs text-blue-600 font-bold">Dab Cric Auction • Official Player Registration</p>
                        </div>
                    </div>

                    <Link to="/" className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1">
                        <ArrowLeft className="w-3.5 h-3.5" /> Home
                    </Link>
                </header>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
                    <div className="mb-6 pb-4 border-b border-slate-100">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-bold mb-2">
                            <Sparkles className="w-3 h-3 text-blue-600" /> Cricket Player Profile
                        </span>
                        <h2 className="text-2xl font-black text-slate-900">Enter Your Cricket Details</h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">
                            Fill your playing role, batting and bowling specs, and match stats for the auction pool.
                        </p>
                    </div>

                    {errorMsg && (
                        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-bold">
                            {errorMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Photo Upload & Preview */}
                        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                {formData.image ? (
                                    <img src={formData.image} alt="Player" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-slate-400" />
                                )}
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <label className="block text-xs font-bold text-slate-700 mb-1">Player Photo (1:1 Frame)</label>
                                <p className="text-[11px] text-slate-500 mb-2">Upload a clear passport or action photo (Cropped to 1:1)</p>
                                <div className="flex items-center gap-2 justify-center sm:justify-start">
                                    <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer shadow-2xs transition-all">
                                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                                        <span>{formData.image ? 'Change Photo (1:1)' : 'Choose Image (1:1)'}</span>
                                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                                    </label>
                                    {formData.image && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveImage}
                                            className="p-2 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all"
                                            title="Remove Image"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Rahul Sharma"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Playing Role (Category) *</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:border-blue-600 focus:bg-white focus:outline-none font-semibold"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option value="Batsman">🏏 Batsman</option>
                                    <option value="Bowler">🎯 Bowler</option>
                                    <option value="All-Rounder">⚡ All-Rounder</option>
                                    <option value="Wicket Keeper">🧤 Wicket Keeper</option>
                                </select>
                            </div>
                        </div>

                        {/* Batting & Bowling Specs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Batting Style</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                                    value={formData.battingStyle}
                                    onChange={e => setFormData({ ...formData, battingStyle: e.target.value })}
                                >
                                    <option value="Right-Hand Bat">Right-Hand Bat</option>
                                    <option value="Left-Hand Bat">Left-Hand Bat</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Bowling Style</label>
                                <select
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                                    value={formData.bowlingStyle}
                                    onChange={e => setFormData({ ...formData, bowlingStyle: e.target.value })}
                                >
                                    <option value="Right-Arm Fast">Right-Arm Fast</option>
                                    <option value="Right-Arm Medium">Right-Arm Medium</option>
                                    <option value="Right-Arm Off-Spin">Right-Arm Off-Spin</option>
                                    <option value="Right-Arm Leg-Spin">Right-Arm Leg-Spin</option>
                                    <option value="Left-Arm Fast">Left-Arm Fast</option>
                                    <option value="Left-Arm Spin">Left-Arm Spin</option>
                                    <option value="None">None (Pure Batsman)</option>
                                </select>
                            </div>
                        </div>

                        {/* Age Field */}
                        <div className="max-w-xs">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Age</label>
                            <input
                                type="number"
                                min="14"
                                max="60"
                                placeholder="e.g. 24"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                                value={formData.age}
                                onChange={e => setFormData({ ...formData, age: e.target.value })}
                            />
                        </div>

                        {/* CricHeroes / Profile link */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">CricHeroes Profile URL (Optional)</label>
                            <input
                                type="url"
                                placeholder="https://cricheroes.in/player-profile/..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:border-blue-600 focus:bg-white focus:outline-none"
                                value={formData.cricHeroesProfileUrl}
                                onChange={e => setFormData({ ...formData, cricHeroesProfileUrl: e.target.value })}
                            />
                        </div>

                        {/* Match Stats Box */}
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                            <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">
                                📊 Previous Career Stats (Optional)
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                <div>
                                    <span className="text-[10px] text-slate-500 font-bold block mb-1">Matches</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none font-semibold"
                                        value={formData.matches}
                                        onChange={e => setFormData({ ...formData, matches: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 font-bold block mb-1">Runs</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none font-semibold"
                                        value={formData.runs}
                                        onChange={e => setFormData({ ...formData, runs: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 font-bold block mb-1">Highest Score</span>
                                    <input
                                        type="text"
                                        placeholder="e.g. 84*"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none font-semibold"
                                        value={formData.highestScore}
                                        onChange={e => setFormData({ ...formData, highestScore: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 font-bold block mb-1">Wickets</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none font-semibold"
                                        value={formData.wickets}
                                        onChange={e => setFormData({ ...formData, wickets: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-500 font-bold block mb-1">Best Bowling</span>
                                    <input
                                        type="text"
                                        placeholder="e.g. 4/18"
                                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none font-semibold"
                                        value={formData.bestBowling}
                                        onChange={e => setFormData({ ...formData, bestBowling: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-black text-white text-sm shadow-sm transition-all active:scale-98 disabled:opacity-50"
                        >
                            {submitting ? 'Submitting Registration...' : 'Submit Player Profile for Auction'}
                        </button>
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

