const { withDangerousMod, withGradleProperties } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Configures Gradle & ProGuard for react-native-webrtc on Expo SDK 58:
 * 1. Disables R8 minification (android.enableMinifyInReleaseBuilds=false) so Jitsi WebRTC
 *    optional JNI references (e.g. org.webrtc.Dav1dDecoder$Natives) do not fail :app:minifyReleaseWithR8.
 * 2. Adds explicit ProGuard keep & dontwarn rules for org.webrtc and WebRTCModule.
 */
module.exports = function withWebRTCProguard(config) {
    config = withGradleProperties(config, (cfg) => {
        const key = 'android.enableMinifyInReleaseBuilds';
        const existing = cfg.modResults.find((item) => item.type === 'property' && item.key === key);
        if (existing) {
            existing.value = 'false';
        } else {
            cfg.modResults.push({ type: 'property', key, value: 'false' });
        }
        return cfg;
    });

    config = withDangerousMod(config, [
        'android',
        async (cfg) => {
            const proguardPath = path.join(cfg.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
            const rules = `
# WebRTC R8 / ProGuard rules
-dontwarn org.webrtc.Dav1dDecoder$Natives
-dontwarn org.webrtc.**
-keep class org.webrtc.** { *; }
-keep class com.oney.WebRTCModule.** { *; }
`;
            let existing = '';
            if (fs.existsSync(proguardPath)) {
                existing = fs.readFileSync(proguardPath, 'utf8');
            }
            if (!existing.includes('Dav1dDecoder$Natives')) {
                fs.writeFileSync(proguardPath, existing + rules, 'utf8');
            }
            return cfg;
        }
    ]);

    return config;
};
