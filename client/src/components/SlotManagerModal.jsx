import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Plus, Trash2, Edit2, Layers, Check, ArrowRight, UserCheck, Shield, Sparkles, Search, Filter } from 'lucide-react';
import { getBudgetUnits } from '../utils/currency';
import toast from '../lib/toast';

const SlotManagerModal = ({ isOpen, onClose, tournament, tournamentId, tournamentName, onUpdated }) => {
    const { smallUnit, isKtoL } = getBudgetUnits(tournament);
    const [slots, setSlots] = useState([]);
    const [players, setPlayers] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState(null);

    // Form inputs for creating / editing a slot
    const [editingSlot, setEditingSlot] = useState(null);
    const [newSlotName, setNewSlotName] = useState('');
    const [newSlotRole, setNewSlotRole] = useState('Batsman');
    const [newSlotBasePrice, setNewSlotBasePrice] = useState(isKtoL ? '20' : '100');
    
    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [feedback, setFeedback] = useState('');

    useEffect(() => {
        if (isOpen && tournamentId) {
            setSelectedSlot(null);
            setSlots([]);
            setPlayers([]);
            fetchData();
        } else if (!isOpen) {
            setSelectedSlot(null);
            setEditingSlot(null);
            setNewSlotName('');
            setSlots([]);
            setPlayers([]);
        }
    }, [isOpen, tournamentId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [pRes, sRes] = await Promise.all([
                axios.get(`/api/players/${tournamentId}`),
                axios.get(`/api/tournaments/${tournamentId}/slots`)
            ]);
            setPlayers(pRes.data || []);
            const slotList = sRes.data || [];
            setSlots(slotList);
            // Strictly select slot from this tournament's list only
            setSelectedSlot(prev => {
                if (!prev) return slotList.length > 0 ? slotList[0] : null;
                const stillExists = slotList.find(s => s._id === prev._id);
                return stillExists || (slotList.length > 0 ? slotList[0] : null);
            });
        } catch (err) {
            console.error('Failed to load slots/players', err);
            setSlots([]);
            setSelectedSlot(null);
        } finally {
            setLoading(false);
        }
    };

    const handleStartEditSlot = (slot) => {
        if (!slot || slot.isDefaultUnsold || slot.slotType === 'unsold') return;
        setEditingSlot(slot);
        setNewSlotName(slot.name || '');
        setNewSlotRole(slot.role || 'Batsman');
        setNewSlotBasePrice(String(slot.basePrice ?? (isKtoL ? '20' : '100')));
    };

    const handleCancelEditSlot = () => {
        setEditingSlot(null);
        setNewSlotName('');
        setNewSlotRole('Batsman');
        setNewSlotBasePrice(isKtoL ? '20' : '100');
    };

    const handleSaveSlot = async (e) => {
        e.preventDefault();
        if (!newSlotName.trim()) return;

        setSaving(true);
        try {
            if (editingSlot) {
                const payload = {
                    name: newSlotName.trim(),
                    role: newSlotRole,
                    basePrice: Number(newSlotBasePrice) || (isKtoL ? 20 : 100)
                };
                const res = await axios.put(`/api/tournaments/${tournamentId}/slots/${editingSlot._id}`, payload);
                const updated = res.data.slot;
                setSlots(prev => prev.map(s => (s._id === editingSlot._id ? updated : s)));
                setSelectedSlot(prev => (prev?._id === editingSlot._id ? updated : prev));
                setPlayers(prev => prev.map(p => (
                    p.slotId === editingSlot._id && p.status === 'pending'
                        ? { ...p, basePrice: updated.basePrice, currentBid: updated.basePrice }
                        : p
                )));
                handleCancelEditSlot();
                showNotice(`Slot "${updated.name}" updated — Base Price ₹${updated.basePrice} ${smallUnit}`);
                if (onUpdated) onUpdated();
            } else {
                const payload = {
                    name: newSlotName.trim(),
                    role: newSlotRole,
                    basePrice: Number(newSlotBasePrice) || (isKtoL ? 20 : 100),
                    order: slots.length + 1
                };

                const res = await axios.post(`/api/tournaments/${tournamentId}/slots`, payload);
                const created = res.data.slot;
                setSlots(prev => [...prev, created]);
                setSelectedSlot(created);
                setNewSlotName('');
                showNotice(`Slot "${created.name}" created with base price ₹${created.basePrice} ${smallUnit}`);
                if (onUpdated) onUpdated();
            }
        } catch (err) {
            toast.error(editingSlot ? 'Failed to update slot' : 'Failed to create slot');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSlot = async (slotId) => {
        if (!window.confirm('Delete this slot? Assigned players will keep their base price but be unslotted.')) return;
        try {
            await axios.delete(`/api/tournaments/${tournamentId}/slots/${slotId}`);
            if (editingSlot?._id === slotId) handleCancelEditSlot();
            setSlots(prev => {
                const remaining = prev.filter(s => s._id !== slotId);
                setSelectedSlot(prevSel => (prevSel?._id === slotId ? (remaining[0] || null) : prevSel));
                return remaining;
            });
            setPlayers(prev => prev.map(p => (p.slotId === slotId ? { ...p, slotId: null } : p)));
            showNotice('Slot deleted');
            if (onUpdated) onUpdated();
        } catch (err) {
            toast.error('Failed to delete slot');
        }
    };

    const handleShiftPlayerToSlot = async (player, slot) => {
        try {
            await axios.post(`/api/tournaments/${tournamentId}/slots/${slot._id}/assign-players`, {
                playerIds: [player._id]
            });

            const isUnsoldSlot = slot.isDefaultUnsold || slot.slotType === 'unsold' || slot.basePrice == null;

            // Update local state
            setPlayers(prev => prev.map(p => {
                if (p._id === player._id) {
                    return isUnsoldSlot
                        ? { ...p, slotId: slot._id }
                        : { ...p, slotId: slot._id, basePrice: slot.basePrice, currentBid: slot.basePrice };
                }
                return p;
            }));

            showNotice(
                isUnsoldSlot
                    ? `Shifted "${player.name}" to ${slot.name} — Retains player's own base price (₹${player.basePrice} ${smallUnit})`
                    : `Shifted "${player.name}" to ${slot.name} — Base Price auto-set to ₹${slot.basePrice} ${smallUnit}!`
            );
            if (onUpdated) onUpdated();
        } catch (err) {
            toast.error('Failed to assign player to slot');
        }
    };

    const handleRemoveFromSlot = async (player) => {
        try {
            await axios.put(`/api/players/${player._id}`, { slotId: null });
            setPlayers(prev => prev.map(p => p._id === player._id ? { ...p, slotId: null } : p));
            showNotice(`Removed ${player.name} from slot`);
            if (onUpdated) onUpdated();
        } catch (err) {
            toast.error('Failed to unslot player');
        }
    };

    const showNotice = (msg) => {
        setFeedback(msg);
        setTimeout(() => setFeedback(''), 3500);
    };

    if (!isOpen) return null;

    const assignedPlayers = selectedSlot ? players.filter(p => p.slotId === selectedSlot._id) : [];
    // Strict requirement: A player who is already shifted to ANY slot (p.slotId) MUST NOT show in pending list!
    // Also, Captains (p.isCaptain) and already sold players (p.status === 'sold') are already retained and must not show in pending slots.
    const unassignedPlayers = players.filter(p => {
        if (p.slotId) return false;
        if (p.isCaptain || p.status === 'sold') return false;
        if (roleFilter !== 'ALL' && p.category !== roleFilter) return false;
        if (searchQuery.trim() && !p.name.toLowerCase().includes(searchQuery.toLowerCase().trim())) return false;
        return true;
    });

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-slate-900">Auction Slots & Tier Sets</h2>
                                {tournamentName && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded uppercase">
                                        {tournamentName}
                                    </span>
                                )}
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black rounded uppercase">
                                    Per-Tournament
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                                Configure player slots strictly for {tournamentName || 'this tournament'}.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Feedback Strip */}
                {feedback && (
                    <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <span>{feedback}</span>
                    </div>
                )}

                <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-6">
                    
                    {/* Left Column: Create & List Slots */}
                    <div className="md:col-span-5 space-y-4">
                        {/* Create / Edit Slot Form */}
                        <form onSubmit={handleSaveSlot} className={`p-4 border rounded-2xl space-y-3 ${editingSlot ? 'bg-indigo-50/70 border-indigo-300' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between gap-2">
                                <span className={`text-[11px] font-extrabold uppercase tracking-wider ${editingSlot ? 'text-indigo-800' : 'text-slate-700'}`}>
                                    {editingSlot ? `Edit Slot: ${editingSlot.name}` : 'Create New Slot / Tier Set'}
                                </span>
                                {editingSlot && (
                                    <button
                                        type="button"
                                        onClick={handleCancelEditSlot}
                                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white px-2 py-0.5 rounded-lg border border-slate-200"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Slot Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Marquee Batsmen Tier 1"
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                                    value={newSlotName}
                                    onChange={e => setNewSlotName(e.target.value)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Target Role</label>
                                    <select
                                        className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-900"
                                        value={newSlotRole}
                                        onChange={e => setNewSlotRole(e.target.value)}
                                    >
                                        <option value="Batsman">Batsman</option>
                                        <option value="Bowler">Bowler</option>
                                        <option value="All-Rounder">All-Rounder</option>
                                        <option value="Wicket Keeper">Wicket Keeper</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Slot Base Price ({smallUnit})</label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        placeholder={isKtoL ? "20" : "100"}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                                        value={newSlotBasePrice}
                                        onChange={e => setNewSlotBasePrice(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className={`w-full py-2.5 text-white font-extrabold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 ${editingSlot ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {editingSlot ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                                <span>{editingSlot ? 'Update Slot Details' : 'Add Slot (Sets Base Price)'}</span>
                            </button>
                        </form>

                        {/* Configured Slots List */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                                Active Slots ({slots.length})
                            </span>

                            {slots.length === 0 ? (
                                <p className="text-xs text-slate-400 italic">No slots created yet. Add one above.</p>
                            ) : (
                                slots.map(slot => {
                                    const isSelected = selectedSlot?._id === slot._id;
                                    const count = players.filter(p => p.slotId === slot._id).length;
                                    return (
                                        <div
                                            key={slot._id}
                                            onClick={() => setSelectedSlot(slot)}
                                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                                                isSelected 
                                                    ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-500/10' 
                                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                            }`}
                                        >
                                            <div>
                                                <h4 className="font-black text-xs text-slate-900">{slot.name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${(slot.isDefaultUnsold || slot.slotType === 'unsold' || slot.basePrice == null) ? 'text-amber-700 bg-amber-100/80' : 'text-purple-700 bg-purple-100/70'}`}>
                                                        {(slot.isDefaultUnsold || slot.slotType === 'unsold' || slot.basePrice == null) ? 'Per Player Base' : `₹${slot.basePrice} ${smallUnit} Base`}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500 font-semibold">
                                                        {slot.role} • {count} Players
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                {slot.isDefaultUnsold || slot.slotType === 'unsold' ? (
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-md">
                                                        Default Re-Auction
                                                    </span>
                                                ) : (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleStartEditSlot(slot)}
                                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                                                            title="Edit Slot"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteSlot(slot._id)}
                                                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                                                            title="Delete Slot"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Column: Shift Players into Selected Slot */}
                    <div className="md:col-span-7 flex flex-col space-y-4">
                        {selectedSlot ? (
                            <>
                                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">
                                            ACTIVE SLOT TARGET
                                        </span>
                                        <h3 className="font-black text-slate-900 text-sm">{selectedSlot.name}</h3>
                                        <p className="text-xs text-slate-600 mt-0.5">
                                            {(selectedSlot.isDefaultUnsold || selectedSlot.slotType === 'unsold' || selectedSlot.basePrice == null)
                                                ? 'Base price is NOT auto-set — each player keeps their own base price.'
                                                : <>Shifting players here auto-sets their base price to <strong className="text-purple-800 font-black">₹{selectedSlot.basePrice} {smallUnit}</strong>.</>}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {(selectedSlot.isDefaultUnsold || selectedSlot.slotType === 'unsold' || selectedSlot.basePrice == null) ? (
                                            <span className="text-xs font-black text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg">Per Player</span>
                                        ) : (
                                            <>
                                                <span className="text-2xl font-black text-purple-900">₹{selectedSlot.basePrice}</span>
                                                <span className="text-xs font-bold text-purple-700"> {smallUnit}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Assigned Players in this Slot */}
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                                        Assigned Players in Slot ({assignedPlayers.length})
                                    </h4>
                                    <div className="space-y-1.5 max-h-44 overflow-y-auto">
                                        {assignedPlayers.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-dashed border-slate-200">
                                                No players shifted into this slot yet. Click "+ Shift into Slot" below.
                                            </p>
                                        ) : (
                                            assignedPlayers.map(p => (
                                                <div key={p._id} className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        <span className="font-extrabold text-slate-900">{p.name}</span>
                                                        <span className="text-slate-400">({p.category})</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono font-black text-purple-700">₹{p.basePrice} {smallUnit}</span>
                                                        <button
                                                            onClick={() => handleRemoveFromSlot(p)}
                                                            className="text-slate-400 hover:text-rose-600 text-[11px] font-bold"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Unassigned Pending Players Pool */}
                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                            Pending Players Pool ({unassignedPlayers.length})
                                        </h4>
                                        <span className="text-[10px] text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-bold">
                                            {players.filter(p => p.slotId).length} Already Shifted
                                        </span>
                                    </div>

                                    {/* Search & Role Filter Bar */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="relative flex-1 min-w-[140px]">
                                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder="Search unslotted player..."
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500 focus:bg-white"
                                                value={searchQuery}
                                                onChange={e => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                                            {['ALL', 'Batsman', 'Bowler', 'All-Rounder', 'Wicket Keeper'].map(role => (
                                                <button
                                                    key={role}
                                                    type="button"
                                                    onClick={() => setRoleFilter(role)}
                                                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                                                        roleFilter === role
                                                            ? 'bg-purple-600 text-white shadow-xs'
                                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                    }`}
                                                >
                                                    {role === 'ALL' ? 'All' : role.split(' ')[0]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                                        {unassignedPlayers.length === 0 ? (
                                            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400 italic">
                                                {players.filter(p => !p.slotId && !p.isCaptain && p.status !== 'sold').length === 0 
                                                    ? '🎉 All players have been shifted to slots!' 
                                                    : 'No unassigned players match this search/filter.'}
                                            </div>
                                        ) : (
                                            unassignedPlayers.map(p => (
                                                <div key={p._id} className="p-2.5 bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-purple-300 rounded-xl flex items-center justify-between text-xs transition-all">
                                                    <div>
                                                        <span className="font-bold text-slate-900">{p.name}</span>
                                                        <span className="text-slate-400 text-[11px] ml-1.5">• {p.category}</span>
                                                        <span className="text-slate-400 text-[11px] ml-1.5">• Current: ₹{p.basePrice || 0} {smallUnit}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleShiftPlayerToSlot(p, selectedSlot)}
                                                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-extrabold rounded-lg flex items-center gap-1 shadow-xs transition-all"
                                                    >
                                                        <span>Shift to Slot</span>
                                                        <ArrowRight className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 min-h-[350px]">
                                <div>
                                    <Layers className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                                    <p className="text-sm font-black text-slate-700">
                                        {slots.length === 0 ? 'No Slots Created Yet' : 'No Slot Selected'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                                        {slots.length === 0 
                                            ? 'Fill in the Slot Name and Base Price on the left and click "+ Add Slot" to start creating tier sets.' 
                                            : 'Select a slot on the left to view assigned players and shift new ones.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SlotManagerModal;
