import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, UserPlus, Lock } from 'lucide-react';
import toast from '../lib/toast';

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
                password: '',
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
            toast.success(isEdit ? 'User updated successfully' : 'User added successfully');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-xl relative overflow-hidden">
                <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1">
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-900">
                            {isEdit ? 'Edit User Account' : 'Create New User Account'}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">Assign roles, teams, and login credentials</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Username</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white"
                            placeholder="unique_username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{isEdit ? 'New Password (leave blank to keep current)' : 'Password'}</label>
                        <div className="relative">
                            <input
                                type="text"
                                required={!isEdit}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white"
                                placeholder={isEdit ? "Enter new password" : "password123"}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                            <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Role</label>
                        <select
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
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
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Assign Team</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 text-sm focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
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

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm transition-all disabled:opacity-50 text-sm"
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
