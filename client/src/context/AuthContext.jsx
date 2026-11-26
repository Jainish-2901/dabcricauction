import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const savedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
            return savedUser ? JSON.parse(savedUser) : null;
        } catch (e) {
            console.warn('Failed to parse saved user:', e);
            return null;
        }
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Sync check on mount or storage events
        try {
            const savedUser = localStorage.getItem('user');
            if (savedUser && !user) {
                setUser(JSON.parse(savedUser));
            }
        } catch (e) {
            console.warn('Auth sync notice:', e);
        }
    }, []);

    const login = (userData, token) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
    };

    const updateUser = (updatedFields) => {
        setUser(prev => {
            const next = { ...(prev || {}), ...updatedFields };
            localStorage.setItem('user', JSON.stringify(next));
            return next;
        });
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
