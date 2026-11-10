import React, { useState, useEffect } from 'react';
import { subscribeToasts } from '../lib/toast';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const STYLES = {
    success: {
        bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
        iconWrap: 'bg-emerald-100 text-emerald-600',
        Icon: CheckCircle2
    },
    error: {
        bg: 'bg-rose-50 border-rose-200 text-rose-900',
        iconWrap: 'bg-rose-100 text-rose-600',
        Icon: AlertCircle
    },
    warning: {
        bg: 'bg-amber-50 border-amber-200 text-amber-900',
        iconWrap: 'bg-amber-100 text-amber-600',
        Icon: AlertTriangle
    },
    info: {
        bg: 'bg-blue-50 border-blue-200 text-blue-900',
        iconWrap: 'bg-blue-100 text-blue-600',
        Icon: Info
    }
};

const ToastContainer = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const unsubscribe = subscribeToasts((newToast) => {
            setToasts(prev => [...prev.slice(-3), newToast]);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== newToast.id));
            }, newToast.duration || 3500);
        });
        return unsubscribe;
    }, []);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:max-w-sm z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map(item => {
                const theme = STYLES[item.type] || STYLES.info;
                const IconComp = theme.Icon;

                return (
                    <div
                        key={item.id}
                        className={`pointer-events-auto flex items-center gap-3 p-3.5 rounded-2xl border shadow-xl shadow-slate-900/10 backdrop-blur-md animate-in slide-in-from-top-3 fade-in duration-200 ${theme.bg}`}
                    >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${theme.iconWrap}`}>
                            <IconComp className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold flex-1 leading-snug">{item.message}</p>
                        <button
                            type="button"
                            onClick={() => setToasts(prev => prev.filter(t => t.id !== item.id))}
                            className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0 cursor-pointer"
                            aria-label="Close"
                        >
                            <X className="w-3.5 h-3.5 opacity-60" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

export default ToastContainer;

