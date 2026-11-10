import React, { useState, useEffect } from 'react';
import { Image, ImageProps } from 'react-native';

interface SafeImageProps extends Omit<ImageProps, 'source'> {
    uri?: string | null;
    fallback?: React.ReactNode;
}

export default function SafeImage({ uri, fallback = null, style, ...props }: SafeImageProps) {
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [uri]);

    if (!uri || !uri.trim() || hasError) {
        return <>{fallback}</>;
    }

    return (
        <Image
            source={{ uri }}
            style={style}
            onError={() => setHasError(true)}
            {...props}
        />
    );
}

