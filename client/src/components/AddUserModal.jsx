import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, UserPlus, Lock } from 'lucide-react';

const AddUserModal = ({ isOpen, onClose, tournamentId, onAdded, initialData = null, isEdit = false }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'team_owner',
        teamId: ''
    });
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && tournamentId && tournamentId !== 'superadmin') {
            fetchTeams();
        }
        if (initialData) {
            setFormData({
                username: initialData.username || '',
                password: '', // Don't prefill password
                role: initialData.role || 'team_owner',
                teamId: initialData.teamId?._id || initialData.teamId || ''
            });
        } else {
            setFormData({ username: '', password: '', role: 'team_owner', teamId: '' });
        }
    }, [isOpen, tournamentId, initialData]);

    const fetchTeams = async () => {
        try {
            const res = await axios.get(`/api/teams/${tournamentId}`);
            setTeams(res.data);
        } catch (err) {
            console.error('Failed to fetch teams', err);
        }
    };

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const endpoint = isEdit ? `/api/auth/users/${initialData._id}` : '/api/auth/register';
            const method = isEdit ? 'put' : 'post';

            const payload = { ...formData };
            if (payload.role !== 'team_owner' || payload.teamId === '') {
                delete payload.teamId;
            }

            await axios[method](endpoint, {
                ...payload,
                tournamentId: tournamentId === 'superadmin' ? null : tournamentId
            });
            onAdded();
            onClose();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save user');
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
                        <UserPlus className="w-5 h-5 text-blue-500" />
                        {isEdit ? 'Edit User' : 'Create New User'}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                            placeholder="unique_username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">{isEdit ? 'New Password (leave blank to keep)' : 'Password'}</label>
                        <div className="relative">
                            <input
                                type="text"
                                required={!isEdit}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                placeholder={isEdit ? "Enter new password" : "password123"}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Role</label>
                        <select
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        >
                            <option value="team_owner">Team Owner</option>
                            <option value="auctioneer">Auctioneer</option>
                            {tournamentId === 'superadmin' && <option value="superadmin">Super Admin</option>}
                        </select>
                    </div>

                    {formData.role === 'team_owner' && tournamentId !== 'superadmin' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Assign Team</label>
                            <select
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                value={formData.teamId}
                                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                            >
                                <option value="">Select a Team</option>
                                {teams.map(t => (
                                    <option key={t._id} value={t._id}>{t.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : (isEdit ? 'Update User' : 'Create User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddUserModal;
