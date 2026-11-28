import React from 'react';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';

const VoiceConnectionStatus = ({ status, participantCount = 0, error }) => {
    const statusMap = {
        connected: {
            bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
            dot: 'bg-emerald-500 animate-pulse',
            icon: Wifi,
            label: `Live Audio • ${participantCount} Connected`
        },
        connecting: {
            bg: 'bg-amber-50 border-amber-200 text-amber-700',
            dot: 'bg-amber-500 animate-ping',
            icon: Loader2,
            label: 'Connecting Voice...'
        },
        error: {
            bg: 'bg-rose-50 border-rose-200 text-rose-700',
            dot: 'bg-rose-500',
            icon: AlertCircle,
            label: 'Voice Error'
        },
        disconnected: {
            bg: 'bg-slate-100 border-slate-200 text-slate-600',
            dot: 'bg-slate-400',
            icon: WifiOff,
            label: 'Voice Offline'
        }
    };

    const current = statusMap[status] || statusMap.disconnected;
    const Icon = current.icon;

    return (
        <div className="space-y-1.5">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${current.bg}`}>
                <span className={`w-2 h-2 rounded-full ${current.dot}`} />
                <Icon className={`w-3.5 h-3.5 ${status === 'connecting' ? 'animate-spin' : ''}`} />
                <span>{current.label}</span>
            </div>
            {error && (
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
};

export default VoiceConnectionStatus;
