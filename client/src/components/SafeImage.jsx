import React, { useState, useEffect } from 'react';

export default function SafeImage({ src, alt = '', className = '', fallback = null, ...props }) {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [src]);

    if (!src || (typeof src === 'string' && !src.trim()) || hasError) {
        return fallback;
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setHasError(true)}
            {...props}
        />
    );
}

