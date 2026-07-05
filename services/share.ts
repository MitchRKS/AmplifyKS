import { Platform, Share } from 'react-native';

export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'unavailable';

interface ShareInput {
  title: string;
  message: string;
  url?: string;
}

// react-native-web's Share.share() delegates to navigator.share() and rejects
// when that's unavailable (many desktop browsers, or non-secure contexts) —
// unlike Alert.alert it doesn't silently no-op, so we can catch the rejection
// and fall back to copying the link to the clipboard instead.
//
// The URL is folded into `message` rather than passed as a separate `url`
// field: Android ignores `url` entirely, and passing both on iOS/web risks
// the link appearing twice in the share sheet.
export async function shareContent({ title, message, url }: ShareInput): Promise<ShareOutcome> {
  const text = url ? `${message}\n${url}` : message;

  try {
    // Web's Share.share() (via navigator.share()) resolves with undefined on
    // success, not an action object, so `result` must be optionally chained.
    const result = await Share.share({ title, message: text }, { dialogTitle: title });
    if (result?.action === Share.dismissedAction) {
      return 'dismissed';
    }
    return 'shared';
  } catch {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        return 'copied';
      } catch {
        return 'unavailable';
      }
    }
    return 'unavailable';
  }
}
