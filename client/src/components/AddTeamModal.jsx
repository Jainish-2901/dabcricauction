import React, { useState } from 'react';
import axios from 'axios';
import { X, Shield } from 'lucide-react';

const AddTeamModal = ({ isOpen, onClose, tournamentId, onAdded, initialData = null, isEdit = false }) => {
    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        budget: 100 // Default 100 Cr
    });
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            if (isEdit && initialData) {
                setFormData({
                    name: initialData.name,
                    shortName: initialData.shortName,
                    budget: initialData.budget
                });
            } else {
                setFormData({ name: '', shortName: '', budget: 100 });
            }
        }
    }, [isOpen, isEdit, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await axios.put(`/api/teams/${initialData._id}`, formData);
            } else {
                await axios.post('/api/teams', { ...formData, tournamentId });
            }
            onAdded();
            onClose();
        } catch (err) {
            alert('Failed to save team');
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
                        <Shield className="w-5 h-5 text-green-500" />
                        {isEdit ? 'Edit Team' : 'Add Team'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Team Name</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                            placeholder="e.g. Royal Challengers Bangalore"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Short Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                placeholder="e.g. RCB"
                                value={formData.shortName}
                                onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Budget (Cr)</label>
                            <input
                                type="number"
                                required
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                value={formData.budget}
                                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-semibold shadow-lg shadow-green-500/20 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : (isEdit ? 'Update Team' : 'Create Team')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTeamModal;
