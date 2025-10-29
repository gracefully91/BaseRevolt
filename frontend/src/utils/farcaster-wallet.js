import { createConnector } from 'wagmi';
import { farcasterMiniApp } from './farcaster-connector';

/**
 * Farcaster MiniApp wallet configuration for RainbowKit
 * This creates a wallet entry that can be used in the RainbowKit wallet list
 */
export const farcasterMiniAppWallet = () => ({
  id: 'farcaster-miniapp',
  name: 'Farcaster',
  iconUrl: 'https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/055c25d6-7fe7-4a49-abf9-49772021cf00/original',
  iconBackground: '#8A63D2',
  downloadUrls: {
    mobile: 'https://warpcast.com/~/mobile',
    ios: 'https://apps.apple.com/us/app/farcaster/id1459603075',
    android: 'https://play.google.com/store/apps/details?id=com.farcaster.mobile',
    qrCode: 'https://warpcast.com/~/mobile',
  },
  mobile: {
    getUri: (uri) => uri,
  },
  qrCode: {
    getUri: (uri) => uri,
    instructions: {
      learnMoreUrl: 'https://docs.farcaster.xyz/',
      steps: [
        {
          description: 'Open the Farcaster app on your mobile device to connect your wallet.',
          step: 'install',
          title: 'Open Farcaster App',
        },
        {
          description: 'Navigate to this frame within the Farcaster app to establish connection.',
          step: 'scan',
          title: 'Connect in App',
        },
      ],
    },
  },
  extension: {
    instructions: {
      learnMoreUrl: 'https://docs.farcaster.xyz/',
      steps: [
        {
          description: 'Farcaster wallet works best within the Farcaster mobile app.',
          step: 'install',
          title: 'Use Farcaster App',
        },
        {
          description: 'Open this application within the Farcaster mobile app for the best experience.',
          step: 'create',
          title: 'Access via Mobile',
        },
        {
          description: 'Refresh the page if you are now using the Farcaster app.',
          step: 'refresh',
          title: 'Refresh Browser',
        },
      ],
    },
  },
  createConnector: (walletDetails) => {
    const connector = farcasterMiniApp();

    return createConnector((config) => {
      return {
        ...connector(config),
        ...walletDetails,
      };
    });
  },
});

