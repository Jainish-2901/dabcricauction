const { withDangerousMod, withMainApplication } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const AUDIO_ROUTER_MODULE_KT = `package com.dabcricauction.app

import android.content.Context
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class AudioRouterModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "AudioRouter"

    @ReactMethod
    fun setSpeakerphoneOn(enabled: Boolean) {
        try {
            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
            audioManager.mode = AudioManager.MODE_IN_COMMUNICATION

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (enabled) {
                    val speaker = audioManager.availableCommunicationDevices.firstOrNull {
                        it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
                    }
                    if (speaker != null) {
                        audioManager.setCommunicationDevice(speaker)
                    }
                } else {
                    val earpiece = audioManager.availableCommunicationDevices.firstOrNull {
                        it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE
                    }
                    if (earpiece != null) {
                        audioManager.setCommunicationDevice(earpiece)
                    } else {
                        audioManager.clearCommunicationDevice()
                    }
                }
            }

            @Suppress("DEPRECATION")
            audioManager.isSpeakerphoneOn = enabled
        } catch (_: Exception) {
        }
    }

    @ReactMethod
    fun reset() {
        try {
            val audioManager = reactApplicationContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                audioManager.clearCommunicationDevice()
            }
            @Suppress("DEPRECATION")
            audioManager.isSpeakerphoneOn = false
            audioManager.mode = AudioManager.MODE_NORMAL
        } catch (_: Exception) {
        }
    }
}
`;

const AUDIO_ROUTER_PACKAGE_KT = `package com.dabcricauction.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AudioRouterPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(AudioRouterModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
`;

module.exports = function withAudioRouter(config) {
    config = withDangerousMod(config, [
        'android',
        async (cfg) => {
            const pkgDir = path.join(
                cfg.modRequest.platformProjectRoot,
                'app',
                'src',
                'main',
                'java',
                'com',
                'dabcricauction',
                'app'
            );
            fs.mkdirSync(pkgDir, { recursive: true });
            fs.writeFileSync(path.join(pkgDir, 'AudioRouterModule.kt'), AUDIO_ROUTER_MODULE_KT, 'utf8');
            fs.writeFileSync(path.join(pkgDir, 'AudioRouterPackage.kt'), AUDIO_ROUTER_PACKAGE_KT, 'utf8');
            return cfg;
        }
    ]);

    config = withMainApplication(config, (cfg) => {
        let contents = cfg.modResults.contents;
        if (!contents.includes('AudioRouterPackage()')) {
            if (contents.includes('PackageList(this).packages.apply {')) {
                contents = contents.replace(
                    'PackageList(this).packages.apply {',
                    'PackageList(this).packages.apply {\n              add(AudioRouterPackage())'
                );
            } else if (contents.includes('packages.apply {')) {
                contents = contents.replace(
                    'packages.apply {',
                    'packages.apply {\n              add(AudioRouterPackage())'
                );
            }
        }
        cfg.modResults.contents = contents;
        return cfg;
    });

    return config;
};
