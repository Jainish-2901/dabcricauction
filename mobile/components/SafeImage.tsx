import React, { useState, useEffect } from 'react';
import {
    Image,
    ImageProps,
    Modal,
    TouchableOpacity,
    View,
    Text,
    StyleSheet,
    Pressable,
    SafeAreaView,
    Platform,
    StatusBar
} from 'react-native';
import { X } from 'lucide-react-native';

interface SafeImageProps extends Omit<ImageProps, 'source'> {
    uri?: string | null;
    fallback?: React.ReactNode;
    previewable?: boolean;
    previewTitle?: string;
}

export default function SafeImage({
    uri,
    fallback = null,
    style,
    previewable = false,
    previewTitle = '',
    ...props
}: SafeImageProps) {
    const [hasError, setHasError] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setHasError(false);
    }, [uri]);

    if (!uri || !uri.trim() || hasError) {
        return <>{fallback}</>;
    }

    const imageElement = (
        <Image
            source={{ uri }}
            style={style}
            onError={() => setHasError(true)}
            {...props}
        />
    );

    if (!previewable) {
        return imageElement;
    }

    const flatStyle = (StyleSheet.flatten(style) || {}) as any;
    const wrapperStyle = {
        width: flatStyle.width ?? '100%',
        height: flatStyle.height ?? '100%',
        borderRadius: flatStyle.borderRadius,
        margin: flatStyle.margin,
        marginTop: flatStyle.marginTop,
        marginBottom: flatStyle.marginBottom,
        marginLeft: flatStyle.marginLeft,
        marginRight: flatStyle.marginRight,
        marginHorizontal: flatStyle.marginHorizontal,
        marginVertical: flatStyle.marginVertical,
        overflow: 'hidden' as const,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    };

    return (
        <>
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setIsOpen(true)}
                style={wrapperStyle}
            >
                {imageElement}
            </TouchableOpacity>

            <Modal
                visible={isOpen}
                transparent={true}
                animationType="fade"
                statusBarTranslucent={true}
                onRequestClose={() => setIsOpen(false)}
            >
                <View style={styles.modalBackdrop}>
                    <SafeAreaView style={styles.safeArea}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.titleContainer}>
                                <Text style={styles.badgeText}>PHOTO PREVIEW</Text>
                                {!!previewTitle && (
                                    <Text style={styles.headerTitle} numberOfLines={1}>
                                        {previewTitle}
                                    </Text>
                                )}
                            </View>
                            <TouchableOpacity
                                style={styles.closeBtn}
                                onPress={() => setIsOpen(false)}
                                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            >
                                <X size={22} color="#ffffff" />
                            </TouchableOpacity>
                        </View>

                        {/* Image Container */}
                        <Pressable
                            style={styles.imageContainer}
                            onPress={() => setIsOpen(false)}
                        >
                            <Image
                                source={{ uri }}
                                style={styles.fullImage}
                                resizeMode="contain"
                            />
                        </Pressable>

                        {/* Footer hint */}
                        <Text style={styles.hintText}>Tap anywhere or tap ✕ to close</Text>
                    </SafeAreaView>
                </View>
            </Modal>
        </>
    );
}

const STATUSBAR_OFFSET = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 16 : 16;

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.94)',
        justifyContent: 'center',
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between',
        paddingTop: STATUSBAR_OFFSET,
        paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    titleContainer: {
        flex: 1,
        marginRight: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#60a5fa',
        letterSpacing: 1,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff',
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    imageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    hintText: {
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        paddingBottom: 8,
    },
});


