import React, { useState } from 'react';
import axios from 'axios';
import { X, Shield, Award, Calculator, Upload, Trash2, Image as ImageIcon, Crop, User } from 'lucide-react';
import { getBudgetUnits } from '../utils/currency';
import ImageCropModal from './ImageCropModal';
import toast from '../lib/toast';
import SafeImage from './SafeImage';

const AddTeamModal = ({ isOpen, onClose, tournamentId, tournament = null, onAdded, initialData = null, isEdit = false }) => {
    const { largeUnit, smallUnit } = getBudgetUnits(tournament);
    const defaultBudget = largeUnit === 'L' ? 10 : 100;

    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        budget: defaultBudget,
        logo: '',
        isOwnerCaptain: false,
        captainName: '',
        captainPrice: 0,
        captainPhoto: ''
    });
    const [loading, setLoading] = useState(false);
    const [cropImageSrc, setCropImageSrc] = useState(null);
    const [showCropModal, setShowCropModal] = useState(false);
    const [captainCropSrc, setCaptainCropSrc] = useState(null);
    const [showCaptainCropModal, setShowCaptainCropModal] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            if (isEdit && initialData) {
                setFormData({
                    name: initialData.name || '',
                    shortName: initialData.shortName || '',
                    budget: initialData.budget || 100,
                    logo: initialData.logo || initialData.image || '',
                    isOwnerCaptain: !!initialData.isOwnerCaptain,
                    captainName: initialData.captainName || '',
                    captainPrice: initialData.captainPrice || 0,
                    captainPhoto: initialData.captainPhoto || initialData.captainImage || ''
                });
            } else {
                setFormData({
                    name: '',
                    shortName: '',
                    budget: defaultBudget,
                    logo: '',
                    isOwnerCaptain: false,
                    captainName: '',
                    captainPrice: 0,
                    captainPhoto: ''
                });
            }
        }
    }, [isOpen, isEdit, initialData, defaultBudget]);

    if (!isOpen) return null;

    const budgetNum = Number(formData.budget) || 0;
    const captainNum = formData.isOwnerCaptain ? (Number(formData.captainPrice) || 0) : 0;
    const effectivePurse = Math.max(0, budgetNum - captainNum);

    const handleLogoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 8 * 1024 * 1024) {
            toast.warning('Logo image size must be less than 8MB');
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
            setFormData(prev => ({ ...prev, captainPhoto: dataUrl }));
            setCaptainCropSrc(dataUrl);
            setShowCaptainCropModal(true);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleCaptainCropDone = (croppedBase64) => {
        setFormData(prev => ({ ...prev, captainPhoto: croppedBase64 }));
    };

    const handleRemoveCaptainPhoto = () => {
        setFormData(prev => ({ ...prev, captainPhoto: '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                logo: formData.logo || '',
                budget: budgetNum,
                captainName: formData.isOwnerCaptain ? (formData.captainName || '').trim() : '',
                captainPrice: captainNum,
                captainPhoto: formData.isOwnerCaptain ? (formData.captainPhoto || '').trim() : '',
                isOwnerCaptain: formData.isOwnerCaptain,
                tournamentId
            };

            if (isEdit) {
                await axios.put(`/api/teams/${initialData._id}`, payload);
                toast.success('Team updated successfully');
            } else {
                await axios.post('/api/teams', payload);
                toast.success('Team added successfully');
            }
            onAdded();
            onClose();
        } catch (err) {
            toast.error('Failed to save team: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs font-sans">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-xl relative overflow-hidden">
                <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1">
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900">
                            {isEdit ? 'Edit Team Configuration' : 'Register New Team'}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">Configure team logo, purse and owner-captain allocation</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    {/* Team Logo Upload Section */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Team Logo / Image
                        </label>
                        <div className="flex items-center gap-3.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                <SafeImage
                                    src={formData.logo}
                                    alt="Team Logo Preview"
                                    className="w-full h-full object-contain p-1"
                                    fallback={
                                        <div className="flex flex-col items-center justify-center text-slate-300">
                                            <ImageIcon className="w-6 h-6" />
                                            <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">No Logo</span>
                                        </div>
                                    }
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <label className="cursor-pointer px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs inline-flex items-center gap-1.5 transition-all">
                                        <Upload className="w-3.5 h-3.5 text-blue-600" />
                                        <span>{formData.logo ? 'Change Image' : 'Upload Logo'}</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={handleLogoChange}
                                        />
                                    </label>
                                    {formData.logo && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveLogo}
                                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Remove
                                        </button>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium mt-1.5">
                                    Square PNG or JPG recommended (max 2MB)
                                </p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Team Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
                            placeholder="e.g. Royal Challengers Bengaluru"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Short Code</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white font-semibold uppercase"
                                placeholder="e.g. RCB"
                                value={formData.shortName}
                                onChange={(e) => setFormData({ ...formData, shortName: e.target.value.toUpperCase() })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                Purse Budget (₹ {largeUnit})
                            </label>
                            <input
                                type="number"
                                required
                                min="1"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white font-semibold"
                                placeholder={`e.g. ${defaultBudget}`}
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Captain Deduction Toggle */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={formData.isOwnerCaptain}
                                onChange={(e) => setFormData({ ...formData, isOwnerCaptain: e.target.checked })}
                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                                <Award className="w-4 h-4 text-amber-600" />
                                <span>Team Owner is Playing as Captain</span>
                            </div>
                        </label>

                        {formData.isOwnerCaptain && (
                            <div className="pt-2 border-t border-slate-200/80 space-y-3">
                                <div>
                                    <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">
                                        Captain / Owner Full Name
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Pranav Dabgar"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs font-bold focus:border-blue-600 focus:outline-none"
                                        value={formData.captainName || ''}
                                        onChange={(e) => setFormData({ ...formData, captainName: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* Captain Photo Upload Section */}
                                <div>
                                    <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1.5">
                                        Captain Profile Photo
                                    </label>
                                    <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-2xl">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                                            <SafeImage
                                                src={formData.captainPhoto}
                                                alt="Captain Photo"
                                                className="w-full h-full object-cover"
                                                fallback={
                                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                                        <User className="w-6 h-6" />
                                                        <span className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase">No Pic</span>
                                                    </div>
                                                }
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <label className="cursor-pointer px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 shadow-2xs inline-flex items-center gap-1.5 transition-all">
                                                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                                                    <span>{formData.captainPhoto ? 'Change Photo' : 'Upload Pic'}</span>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={handleCaptainPhotoChange}
                                                    />
                                                </label>
                                                {formData.captainPhoto && (
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveCaptainPhoto}
                                                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-all"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Remove
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-medium mt-1">
                                                Captain face picture (auto-uploaded to Cloudinary)
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-extrabold uppercase text-slate-600 mb-1">
                                        Captain Retained Base Amount (to minus from purse in ₹{largeUnit})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        placeholder="e.g. 15"
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs font-bold focus:border-blue-600 focus:outline-none"
                                        value={formData.captainPrice}
                                        onChange={(e) => setFormData({ ...formData, captainPrice: e.target.value })}
                                        required
                                    />
                                </div>

                                {/* Live Calculation Strip */}
                                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-600 flex items-center gap-1">
                                        <Calculator className="w-3.5 h-3.5 text-blue-600" />
                                        Remaining Live Auction Purse:
                                    </span>
                                    <span className="text-emerald-700 font-extrabold font-mono text-sm">
                                        ₹{effectivePurse} {largeUnit} / Pts
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-50 text-sm"
                        >
                            {loading ? 'Saving...' : (isEdit ? 'Update Team' : 'Create Team')}
                        </button>
                    </div>
                </form>

                {/* 1:1 Image Crop Modal */}
                <ImageCropModal
                    isOpen={showCropModal}
                    imageSrc={cropImageSrc}
                    onCropComplete={handleCropDone}
                    onClose={() => setShowCropModal(false)}
                    title="Crop Team Logo (1:1 Frame)"
                    outputSize={512}
                />

                {/* 1:1 Captain Photo Crop Modal */}
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

export default AddTeamModal;
