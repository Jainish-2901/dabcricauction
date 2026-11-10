import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import { toast } from './toast';

/**
 * Checks for OTA updates using EAS Update / expo-updates.
 * @param showNoUpdateAlert - If true, informs the user if the app is already up to date.
 */
export async function checkForAppUpdates(showNoUpdateAlert = false): Promise<boolean> {
    try {
        if (__DEV__) {
            console.log('[EAS Update] Running in development mode (__DEV__), skipping OTA check.');
            if (showNoUpdateAlert) {
                toast.info('Development Mode', 'OTA Updates are active only in standalone/production builds.');
            }
            return false;
        }

        if (!Updates.isEnabled) {
            console.log('[EAS Update] expo-updates is disabled or not configured.');
            if (showNoUpdateAlert) {
                toast.info('EAS Update', 'Updates are not enabled for this build.');
            }
            return false;
        }

        const check = await Updates.checkForUpdateAsync();

        if (check.isAvailable) {
            console.log('[EAS Update] New update found! Downloading update package...');
            await Updates.fetchUpdateAsync();

            Alert.alert(
                'New Update Available',
                'A new version of Dab Cric Auction has been downloaded. Restart the app now to apply changes?',
                [
                    {
                        text: 'Later',
                        style: 'cancel'
                    },
                    {
                        text: 'Restart Now',
                        onPress: async () => {
                            try {
                                await Updates.reloadAsync();
                            } catch (e) {
                                console.error('[EAS Update] Error reloading:', e);
                            }
                        }
                    }
                ]
            );
            return true;
        } else {
            console.log('[EAS Update] App is already up to date.');
            if (showNoUpdateAlert) {
                toast.success('App Up to Date', 'You are already using the latest version.');
            }
            return false;
        }
    } catch (error: any) {
        console.warn('[EAS Update] Error checking for updates:', error?.message || error);
        if (showNoUpdateAlert) {
            toast.error('Update Check Failed', error?.message || 'Could not check for updates.');
        }
        return false;
    }
}

