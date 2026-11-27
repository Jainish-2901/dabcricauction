import React, { useState, useRef } from 'react';
import axios from 'axios';
import { X, Upload, FileText, Download, ChevronDown, ChevronUp, User, Trash2, Camera } from 'lucide-react';
import ImageCropModal from './ImageCropModal';
import toast from '../lib/toast';
import SafeImage from './SafeImage';
import { getBudgetUnits } from '../utils/currency';

const AddPlayerModal = ({ isOpen, onClose, tournamentId, tournament, onAdded, initialData = null, isEdit = false }) => {
    const { smallUnit, smallName, isKtoL } = getBudgetUnits(tournament);
    const defaultBase = isKtoL ? 20 : 100;
    const [mode, setMode] = useState('manual');
    const [showCricketDetails, setShowCricketDetails] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        category: 'All-Rounder',
        battingStyle: 'Right Handed',
        bowlingStyle: 'Right-arm Fast',
        basePrice: defaultBase,
        mobile: '',
        age: '',
        cricHeroesProfileUrl: '',
        image: '',
        matches: 0,
        runs: 0,
        highestScore: '',
        wickets: 0,
        bestBowling: ''
    });
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [csvFile, setCsvFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            if (isEdit && initialData) {
                setFormData({
                    name: initialData.name || '',
                    category: initialData.category || 'All-Rounder',
                    battingStyle: initialData.battingStyle || 'Right Handed',
                    bowlingStyle: initialData.bowlingStyle || 'Right-arm Fast',
                    basePrice: initialData.basePrice ?? defaultBase,
                    age: initialData.age || '',
                    cricHeroesProfileUrl: initialData.cricHeroesProfileUrl || '',
                    image: initialData.image || '',
                    matches: initialData.stats?.matches || 0,
                    runs: initialData.stats?.runs || 0,
                    highestScore: initialData.stats?.highestScore || '',
                    wickets: initialData.stats?.wickets || 0,
                    bestBowling: initialData.stats?.bestBowling || ''
                });
                setShowCricketDetails(true);
                setMode('manual');
            } else {
                setFormData({
                    name: '',
                    category: 'All-Rounder',
                    battingStyle: 'Right Handed',
                    bowlingStyle: 'Right-arm Fast',
                    basePrice: defaultBase,
                    mobile: '',
                    age: '',
                    cricHeroesProfileUrl: '',
                    image: '',
                    matches: 0,
                    runs: 0,
                    highestScore: '',
                    wickets: 0,
                    bestBowling: ''
                });
                setShowCricketDetails(false);
                setMode('manual');
            }
        }
    }, [isOpen, initialData, isEdit]);

    if (!isOpen) return null;

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 8 * 1024 * 1024) {
            toast.warning('Image size must be less than 8MB');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const dataUrl = reader.result;
            setFormData(prev => ({ ...prev, image: dataUrl }));
            setCropImageSrc(dataUrl);
            setShowCropModal(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCropDone = (croppedBase64) => {
        setFormData(prev => ({ ...prev, image: croppedBase64 }));
    };

    const handleRemoveImage = () => {
        setFormData(prev => ({ ...prev, image: '' }));
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                name: formData.name,
                category: formData.category,
                battingStyle: formData.battingStyle,
                bowlingStyle: formData.bowlingStyle,
                basePrice: Number(formData.basePrice) || 0,
                age: Number(formData.age) || undefined,
                cricHeroesProfileUrl: formData.cricHeroesProfileUrl,
                stats: {
                    matches: Number(formData.matches) || 0,
                    runs: Number(formData.runs) || 0,
                    highestScore: formData.highestScore,
                    wickets: Number(formData.wickets) || 0,
                    bestBowling: formData.bestBowling
                },
                image: formData.image ?? '',
                tournamentId
            };

            if (isEdit && initialData?.isCaptain) {
                payload.isCaptain = true;
                payload.soldPrice = payload.basePrice;
            }

            if (isEdit) {
                await axios.put(`/api/players/${initialData._id}`, payload);
                toast.success('Player updated successfully');
            } else {
                await axios.post('/api/players', payload);
                toast.success('Player added successfully');
            }
            onAdded();
            onClose();
        } catch (err) {
            const msg = err.response?.data?.message || err.message || 'Error saving player';
            toast.error(`Error saving player: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const parseCsvLine = (line, delimiter = ',') => {
        const result = [];
        let insideQuotes = false;
        let entry = '';
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (insideQuotes && line[i + 1] === '"') {
                    entry += '"';
                    i++;
                } else {
                    insideQuotes = !insideQuotes;
                }
            } else if (char === delimiter && !insideQuotes) {
                result.push(entry.trim());
                entry = '';
            } else {
                entry += char;
            }
        }
        result.push(entry.trim());
        return result;
    };

    const normalizeCategory = (raw) => {
        const v = String(raw || '').toLowerCase().trim();
        if (!v) return 'All-Rounder';
        if (v.includes('wicket') || v === 'wk' || v.includes('keeper')) return 'Wicket Keeper';
        if (v.includes('bowl')) return 'Bowler';
        if (v.includes('all')) return 'All-Rounder';
        if (v.includes('bat')) return 'Batsman';
        return raw.trim();
    };

    const handleCsvSubmit = async (e) => {
        e.preventDefault();
        if (!csvFile) {
            toast.warning("Please select a CSV file");
            return;
        }

        setLoading(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const rawText = String(event.target?.result || '').replace(/^\uFEFF/, '');
            const lines = rawText.split(/\r?\n/).filter(l => l.trim().length > 0);
            if (lines.length <= 1) {
                toast.warning("CSV file is empty or only contains header.");
                setLoading(false);
                return;
            }

            const firstLine = lines[0];
            const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.split(';').length > firstLine.split(',').length ? ';' : ',');
            const headerRow = parseCsvLine(firstLine, delimiter).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
            const newPlayers = [];

            // Detect column indices or use default positioning
            const colIndex = {
                name: headerRow.findIndex(h => h.includes('name')),
                category: headerRow.findIndex(h => h.includes('cat') || h.includes('role')),
                battingStyle: headerRow.findIndex(h => h.includes('bat')),
                bowlingStyle: headerRow.findIndex(h => h.includes('bowl')),
                basePrice: headerRow.findIndex(h => h.includes('base') || h.includes('price')),
                mobile: headerRow.findIndex(h => h.includes('mobile') || h.includes('phone')),
                age: headerRow.findIndex(h => h.includes('age')),
                cricHeroesURL: headerRow.findIndex(h => h.includes('crich') || h.includes('url')),
                matches: headerRow.findIndex(h => h.includes('match')),
                runs: headerRow.findIndex(h => h.includes('run')),
                highestScore: headerRow.findIndex(h => h.includes('high')),
                wickets: headerRow.findIndex(h => h.includes('wick') || h.includes('wkt')),
                bestBowling: headerRow.findIndex(h => h.includes('best'))
            };

            for (let i = 1; i < lines.length; i++) {
                const cols = parseCsvLine(lines[i], delimiter);
                if (cols.length === 0 || !cols.some(Boolean)) continue;

                const name = ((colIndex.name !== -1 ? cols[colIndex.name] : cols[0]) || '').trim();
                const rawCat = (colIndex.category !== -1 ? cols[colIndex.category] : cols[1]) || '';
                const category = normalizeCategory(rawCat);
                const rawPrice = colIndex.basePrice !== -1 ? cols[colIndex.basePrice] : cols[2];
                const parsedBase = Number(String(rawPrice ?? '').replace(/[^0-9.]/g, ''));
                const basePrice = (rawPrice !== '' && rawPrice !== undefined && Number.isFinite(parsedBase) && parsedBase >= 0) ? parsedBase : 0;

                if (!name) continue;

                const playerObj = {
                    name,
                    category,
                    basePrice,
                    battingStyle: (colIndex.battingStyle !== -1 ? cols[colIndex.battingStyle] : '') || 'Right Handed',
                    bowlingStyle: (colIndex.bowlingStyle !== -1 ? cols[colIndex.bowlingStyle] : '') || 'Right-arm Fast',
                    mobile: colIndex.mobile !== -1 ? (cols[colIndex.mobile] || '') : '',
                    age: colIndex.age !== -1 && cols[colIndex.age] ? Number(cols[colIndex.age]) : undefined,
                    cricHeroesProfileUrl: colIndex.cricHeroesURL !== -1 ? (cols[colIndex.cricHeroesURL] || '') : '',
                    stats: {
                        matches: colIndex.matches !== -1 && cols[colIndex.matches] ? Number(cols[colIndex.matches]) || 0 : 0,
                        runs: colIndex.runs !== -1 && cols[colIndex.runs] ? Number(cols[colIndex.runs]) || 0 : 0,
                        highestScore: colIndex.highestScore !== -1 ? (cols[colIndex.highestScore] || '') : '',
                        wickets: colIndex.wickets !== -1 && cols[colIndex.wickets] ? Number(cols[colIndex.wickets]) || 0 : 0,
                        bestBowling: colIndex.bestBowling !== -1 ? (cols[colIndex.bestBowling] || '') : ''
                    },
                    tournamentId
                };

                newPlayers.push(playerObj);
            }

            if (newPlayers.length === 0) {
                toast.warning("No valid player rows found in CSV file.");
                setLoading(false);
                return;
            }

            try {
                for (const player of newPlayers) {
                    await axios.post('/api/players', player);
                }
                toast.success(`Imported ${newPlayers.length} players successfully!`);
                onAdded();
                onClose();
            } catch (err) {
                console.error(err);
                toast.error("Failed to import some players");
            } finally {
                setLoading(false);
            }
        };

        reader.onerror = () => {
            toast.error("Failed to read CSV file.");
            setLoading(false);
        };

        reader.readAsText(csvFile);
    };

    const downloadTemplate = () => {
        const headers = 'Name,Category,BattingStyle,BowlingStyle,BasePrice,Age,CricHeroesURL,Matches,Runs,HighestScore,Wickets,BestBowling\n';
        const sample = 'Virat Kohli,Batsman,Right Handed,Right-arm Medium,200,35,https://cricheroes.in/player/1,250,8500,183,4,2/25\n' +
            'Jasprit Bumrah,Bowler,Right Handed,Right-arm Fast,200,30,https://cricheroes.in/player/2,120,250,20,165,5/27\n' +
            'Hardik Pandya,All-Rounder,Right Handed,Right-arm Fast Medium,150,30,https://cricheroes.in/player/3,140,2400,91,65,4/24';
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + sample);
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", "players_feed_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden max-h-[90vh] flex flex-col">
                <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 z-10">
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0">
                    <h2 className="text-lg font-black text-slate-900">{isEdit ? 'Edit Player' : 'Add New Player'}</h2>
                    <p className="text-xs text-slate-500 font-medium">Tournament Cricket Player Management</p>
                    {!isEdit && (
                        <div className="flex gap-4 mt-3 text-xs font-bold border-b border-slate-200">
                            <button
                                onClick={() => setMode('manual')}
                                className={`pb-2.5 ${mode === 'manual' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                Manual Entry
                            </button>
                            <button
                                onClick={() => setMode('csv')}
                                className={`pb-2.5 ${mode === 'csv' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                Import from CSV (Full Feed)
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-6 overflow-y-auto">
                    {mode === 'manual' ? (
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            {/* Profile Image 1:1 Upload */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Player Profile Photo (1:1 Frame)
                                </label>
                                <div className="flex items-center gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                                    <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                        <SafeImage
                                            src={formData.image}
                                            alt="Player"
                                            className="w-full h-full object-cover"
                                            fallback={
                                                <div className="flex flex-col items-center justify-center text-slate-300">
                                                    <User className="w-6 h-6" />
                                                    <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">No Photo</span>
                                                </div>
                                            }
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <label className="cursor-pointer px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs inline-flex items-center gap-1.5 transition-all">
                                                <Camera className="w-3.5 h-3.5 text-blue-600" />
                                                <span>{formData.image ? 'Change Photo (1:1)' : 'Upload Photo (1:1)'}</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleImageChange}
                                                />
                                            </label>
                                            {formData.image && (
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveImage}
                                                    className="p-1.5 text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition-all"
                                                    title="Remove Image"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                                            Select photo to crop in 1:1 square frame.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Rohit Sharma"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Category *</label>
                                    <select
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option>Batsman</option>
                                        <option>Bowler</option>
                                        <option>All-Rounder</option>
                                        <option>Wicket Keeper</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Base Price ({smallName} / ₹{smallUnit}) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder={`e.g. ${defaultBase}`}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white"
                                        value={formData.basePrice}
                                        onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowCricketDetails(!showCricketDetails)}
                                className="w-full flex items-center justify-between py-2 px-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
                            >
                                <span>Cricket Styles & Feed Details (Optional)</span>
                                {showCricketDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {showCricketDetails && (
                                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Batting Style</label>
                                            <select
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                                                value={formData.battingStyle}
                                                onChange={e => setFormData({ ...formData, battingStyle: e.target.value })}
                                            >
                                                <option>Right Handed</option>
                                                <option>Left Handed</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Bowling Style</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Right-arm Fast"
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                                                value={formData.bowlingStyle}
                                                onChange={e => setFormData({ ...formData, bowlingStyle: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Age</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 24"
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                                            value={formData.age}
                                            onChange={e => setFormData({ ...formData, age: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">CricHeroes Profile URL</label>
                                        <input
                                            type="url"
                                            placeholder="https://cricheroes.in/player/..."
                                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs"
                                            value={formData.cricHeroesProfileUrl}
                                            onChange={e => setFormData({ ...formData, cricHeroesProfileUrl: e.target.value })}
                                        />
                                    </div>

                                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Matches</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-900 text-xs text-center"
                                                value={formData.matches}
                                                onChange={e => setFormData({ ...formData, matches: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Runs</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-900 text-xs text-center"
                                                value={formData.runs}
                                                onChange={e => setFormData({ ...formData, runs: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Wickets</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-900 text-xs text-center"
                                                value={formData.wickets}
                                                onChange={e => setFormData({ ...formData, wickets: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">High Score</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 78*"
                                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-900 text-xs text-center"
                                                value={formData.highestScore}
                                                onChange={e => setFormData({ ...formData, highestScore: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-white text-sm mt-4 shadow-sm transition-all">
                                {loading ? 'Saving...' : (isEdit ? 'Update Player' : 'Add Player')}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleCsvSubmit} className="space-y-4">
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
                                <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs text-blue-900 font-medium mb-1">
                                        Upload CSV with all player input feeds (Name, Category, BattingStyle, BowlingStyle, BasePrice, CricHeroes, Stats).
                                    </p>
                                    <button
                                        type="button"
                                        onClick={downloadTemplate}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-1"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Download Full Feed Template CSV
                                    </button>
                                </div>
                            </div>

                            <div
                                className="border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-500 hover:border-blue-500 hover:bg-slate-50 transition-all cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                <span className="text-xs font-bold text-slate-700">
                                    {csvFile ? csvFile.name : "Click to select CSV file"}
                                </span>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".csv"
                                    className="hidden"
                                    onChange={(e) => setCsvFile(e.target.files[0])}
                                />
                            </div>

                            <button type="submit" disabled={loading || !csvFile} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-white text-sm mt-4 flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm transition-all">
                                {loading ? (
                                    <span>Processing...</span>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" /> Import Players
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>

                {/* 1:1 Image Crop Modal */}
                <ImageCropModal
                    isOpen={showCropModal}
                    imageSrc={cropImageSrc}
                    onCropComplete={handleCropDone}
                    onClose={() => setShowCropModal(false)}
                    title={isEdit ? "Crop Player Profile Photo (1:1)" : "Crop New Player Photo (1:1)"}
                    outputSize={512}
                />
            </div>
        </div>
    );
};

export default AddPlayerModal;
