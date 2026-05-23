import React, { useState, useRef } from 'react';
import axios from 'axios';
import { X, Upload, FileText, Download, AlertCircle } from 'lucide-react';

const AddPlayerModal = ({ isOpen, onClose, tournamentId, onAdded, initialData = null, isEdit = false }) => {
    const [mode, setMode] = useState('manual'); // 'manual' or 'csv'
    const [formData, setFormData] = useState({
        name: '', category: 'All-Rounder', basePrice: 20
    });
    const [csvFile, setCsvFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            if (isEdit && initialData) {
                setFormData({
                    name: initialData.name,
                    category: initialData.category,
                    basePrice: initialData.basePrice
                });
                setMode('manual');
            } else {
                setFormData({ name: '', category: 'All-Rounder', basePrice: 20 });
                setMode('manual');
            }
        }
    }, [isOpen, initialData, isEdit]);

    if (!isOpen) return null;

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEdit) {
                await axios.put(`/api/players/${initialData._id}`, formData);
            } else {
                await axios.post('/api/players', { ...formData, tournamentId });
            }
            onAdded();
            onClose();
        } catch (err) {
            alert('Error saving player');
        } finally {
            setLoading(false);
        }
    };

    const handleCsvSubmit = async (e) => {
        e.preventDefault();
        if (!csvFile) {
            alert("Please select a CSV file");
            return;
        }

        setLoading(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            const text = event.target.result;
            const rows = text.split('\n');
            // Assuming header: Name, Category, BasePrice
            // Simple parsing, assuming comma separated

            let successCount = 0;
            let errorCount = 0;

            // Skip header if present (heuristic)
            const startIndex = rows[0].toLowerCase().includes('name') ? 1 : 0;

            for (let i = startIndex; i < rows.length; i++) {
                const row = rows[i].trim();
                if (!row) continue;

                const cols = row.split(',').map(c => c.trim());
                if (cols.length < 1) continue;

                const name = cols[0];
                const category = cols[1] || 'All-Rounder';
                const basePrice = cols[2] || 20;

                if (!name) continue;

                try {
                    await axios.post('/api/players', {
                        name,
                        category,
                        basePrice,
                        tournamentId
                    });
                    successCount++;
                } catch (err) {
                    console.error(`Failed to import ${name}`, err);
                    errorCount++;
                }
            }

            alert(`Import complete. Added: ${successCount}, Failed: ${errorCount}`);
            setLoading(false);
            onAdded();
            onClose();
        };

        reader.onerror = () => {
            alert('Failed to read file');
            setLoading(false);
        };

        reader.readAsText(csvFile);
    };

    const downloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Name,Category,BasePrice\nVirat Kohli,Batsman,200\nJasprit Bumrah,Bowler,200\nHardik Pandya,All-Rounder,150";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "player_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">{isEdit ? 'Edit Player' : 'Add New Player'}</h2>
                    {!isEdit && (
                        <div className="flex gap-4 mt-4 text-sm font-medium border-b border-slate-800">
                            <button
                                onClick={() => setMode('manual')}
                                className={`pb-2 ${mode === 'manual' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                Manual Entry
                            </button>
                            <button
                                onClick={() => setMode('csv')}
                                className={`pb-2 ${mode === 'csv' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-white'}`}
                            >
                                Import from CSV
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-6">
                    {mode === 'manual' ? (
                        <form onSubmit={handleManualSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                                    <select
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
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
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Base Price (Lakhs)</label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                                        value={formData.basePrice}
                                        onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
                                    />
                                </div>
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white mt-4">
                                {loading ? 'Saving...' : (isEdit ? 'Update Player' : 'Add Player')}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleCsvSubmit} className="space-y-4">
                            <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
                                <FileText className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-blue-300 mb-1">
                                        Upload a CSV file with columns: <strong>Name, Category, BasePrice</strong>.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={downloadTemplate}
                                        className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                                    >
                                        <Download className="w-3 h-3" /> Download Template
                                    </button>
                                </div>
                            </div>

                            <div
                                className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500/50 hover:bg-slate-800/50 transition-all cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Upload className="w-8 h-8 mb-2 text-slate-500" />
                                <span className="text-sm font-medium">
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

                            <button type="submit" disabled={loading || !csvFile} className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-white mt-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
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
            </div>
        </div>
    );
};

export default AddPlayerModal;
