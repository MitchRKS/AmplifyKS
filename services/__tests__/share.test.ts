import { Platform, Share } from 'react-native';

import { shareContent } from '@/services/share';

describe('shareContent', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
    jest.restoreAllMocks();
  });

  it('folds the URL into the shared message rather than passing it separately', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: Share.sharedAction });

    await shareContent({ title: 'HB2018', message: 'Check out HB2018', url: 'https://example.com/hb2018' });

    expect(shareSpy).toHaveBeenCalledWith(
      { title: 'HB2018', message: 'Check out HB2018\nhttps://example.com/hb2018' },
      { dialogTitle: 'HB2018' },
    );
  });

  it('returns "shared" when the native share sheet reports a successful share', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
    await expect(shareContent({ title: 't', message: 'm' })).resolves.toBe('shared');
  });

  it('returns "dismissed" when the user cancels the native share sheet', async () => {
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction });
    await expect(shareContent({ title: 't', message: 'm' })).resolves.toBe('dismissed');
  });

  it('returns "shared" when Share.share resolves with no action (web success case)', async () => {
    // react-native-web's Share.share() delegates to navigator.share(), which
    // resolves with undefined on success — not an action object.
    jest.spyOn(Share, 'share').mockResolvedValue(undefined as never);
    await expect(shareContent({ title: 't', message: 'm' })).resolves.toBe('shared');
  });

  it('falls back to copying to the clipboard on web when Share.share rejects', async () => {
    Platform.OS = 'web';
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('Share is not supported in this browser'));
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const outcome = await shareContent({ title: 't', message: 'Check this out', url: 'https://example.com' });

    expect(outcome).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Check this out\nhttps://example.com');
  });

  it('returns "unavailable" when both Share.share and the clipboard fail', async () => {
    Platform.OS = 'web';
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('unsupported'));
    Object.defineProperty(global.navigator, 'clipboard', {
      value: { writeText: jest.fn().mockRejectedValue(new Error('Document is not focused')) },
      configurable: true,
    });

    await expect(shareContent({ title: 't', message: 'm' })).resolves.toBe('unavailable');
  });

  it('returns "unavailable" on native platforms with no clipboard fallback', async () => {
    Platform.OS = 'ios';
    jest.spyOn(Share, 'share').mockRejectedValue(new Error('cannot share'));
    await expect(shareContent({ title: 't', message: 'm' })).resolves.toBe('unavailable');
  });
});
