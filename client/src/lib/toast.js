let listeners = new Set();
let counter = 0;

const notify = (toastItem) => {
    listeners.forEach(fn => {
        try {
            fn(toastItem);
        } catch {}
    });
};

export const subscribeToasts = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

export const toast = {
    show(type, message, duration = 3500) {
        const id = ++counter;
        notify({ id, type, message, duration });
    },
    success(message, duration) {
        this.show('success', message, duration);
    },
    error(message, duration) {
        this.show('error', message, duration);
    },
    warning(message, duration) {
        this.show('warning', message, duration);
    },
    info(message, duration) {
        this.show('info', message, duration);
    }
};

export default toast;

