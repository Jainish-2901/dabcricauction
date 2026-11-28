import React from 'react';
import { Mic, MicOff, ShieldAlert } from 'lucide-react';

const MicrophoneButton = ({
    isMicOn,
    isAdminMuted,
    disabled,
    onClick,
    size = 'md'
}) => {
    const isEffectiveOn = isMicOn && !isAdminMuted;

    const sizeClasses =
        size === 'sm'
            ? 'px-3 py-1.5 text-xs gap-1.5'
            : 'px-4 py-2 text-xs sm:text-sm gap-2';

    if (isAdminMuted) {
        return (
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                title="Muted by Admin"
                className={`inline-flex items-center justify-center rounded-xl font-bold transition-all border bg-rose-50 border-rose-200 text-rose-700 cursor-not-allowed ${sizeClasses}`}
            >
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
                <span>Muted by Admin</span>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`inline-flex items-center justify-center rounded-xl font-bold transition-all cursor-pointer border shadow-2xs ${sizeClasses} ${
                isEffectiveOn
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
        >
            {isEffectiveOn ? (
                <>
                    <Mic className="w-4 h-4 shrink-0" />
                    <span>Mic ON</span>
                </>
            ) : (
                <>
                    <MicOff className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>Mic OFF</span>
                </>
            )}
        </button>
    );
};

export default MicrophoneButton;
