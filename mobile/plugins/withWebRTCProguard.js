const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Adds ProGuard / R8 keep & dontwarn rules for org.webrtc and com.oney.WebRTCModule
 * so release APK minification (:app:minifyReleaseWithR8) succeeds cleanly.
 */
module.exports = function withWebRTCProguard(config) {
    return withDangerousMod(config, [
        'android',
        async (cfg) => {
            const proguardPath = path.join(cfg.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
            const rules = `
# WebRTC R8 / ProGuard rules
-dontwarn org.webrtc.**
-keep class org.webrtc.** { *; }
-keep class com.oney.WebRTCModule.** { *; }
`;
            let existing = '';
            if (fs.existsSync(proguardPath)) {
                existing = fs.readFileSync(proguardPath, 'utf8');
            }
            if (!existing.includes('-dontwarn org.webrtc.**')) {
                fs.writeFileSync(proguardPath, existing + rules, 'utf8');
            }
            return cfg;
        }
    ]);
};
