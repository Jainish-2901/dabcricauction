import React, { useState } from 'react';
import axios from 'axios';
import { X, Trophy, AlertCircle } from 'lucide-react';

const CreateTournamentModal = ({ isOpen, onClose, onCreated, initialData = null, isEdit = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        time: '',
        description: '',
        squadSizeLimit: 25,
        auctionType: 'owner_driven' // Default
    });
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            if (isEdit && initialData) {
                // Parse date to YYYY-MM-DD for input
                let dateStr = '';
                if (initialData.startDate) {
                    const d = new Date(initialData.startDate);
                    dateStr = d.toISOString().split('T')[0];
                }

                setFormData({
                    name: initialData.name,
                    startDate: dateStr,
                    time: initialData.time || '',
                    description: initialData.description || '',
                    squadSizeLimit: initialData.squadSizeLimit || 25,
                    auctionType: initialData.auctionType || 'owner_driven'
                });
            } else {
                setFormData({ name: '', startDate: '', time: '', description: '', squadSizeLimit: 25, auctionType: 'owner_driven' });
            }
        }
    }, [isOpen, isEdit, initialData]);

    if (!isOpen) return null;

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-blue-500" />
                        {isEdit ? 'Edit Tournament' : 'Create New Tournament'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Tournament Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                            placeholder="e.g. IPL Season 2026"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                            <input
                                type="date"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Time</label>
                            <input
                                type="time"
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                value={formData.time}
                                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Squad Size Limit</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                            value={formData.squadSizeLimit}
                            onChange={(e) => setFormData({ ...formData, squadSizeLimit: parseInt(e.target.value) || 25 })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Bidding Mode</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, auctionType: 'owner_driven' })}
                                className={`p-3 rounded-xl border text-left transition-all ${formData.auctionType === 'owner_driven' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                            >
                                <div className="font-bold text-sm mb-1">Team Owners Bid</div>
                                <div className="text-xs opacity-70">Owners login and bid in real-time. Admin manages flow.</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, auctionType: 'admin_driven' })}
                                className={`p-3 rounded-xl border text-left transition-all ${formData.auctionType === 'admin_driven' ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
                            >
                                <div className="font-bold text-sm mb-1">Admin Bids</div>
                                <div className="text-xs opacity-70">Admin places bids on behalf of teams. Offline auction style.</div>
                            </button>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : (isEdit ? 'Update Tournament' : 'Create Tournament')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTournamentModal;
