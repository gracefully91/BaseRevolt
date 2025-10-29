// wrapWalletForMiniApp.js - RainbowKit Wallet 래퍼 (모바일 딥링크 자동 오픈)

import { buildDeeplinkCandidates, tryDeeplinkCandidates } from './wcDeeplink';

/**
 * RainbowKit Wallet을 래핑하여 모바일 환경에서 딥링크를 자동으로 엽니다
 * @param {Function} walletFactory - RainbowKit wallet factory function
 * @param {string} target - 지갑 타입 ('metamask' | 'coinbase' | 'trust' | 'phantom' | 'rainbow')
 * @returns {Function} 래핑된 wallet factory
 */
export function wrapWalletForMiniApp(walletFactory, target) {
  return (options) => {
    const wallet = walletFactory(options);
    
    console.log(`🔧 Wrapping wallet for Mini-App: ${target}`);
    
    return {
      ...wallet,
      // 모바일에서 getUri가 호출되는 순간 딥링크로 앱 오픈
      mobile: wallet.mobile ? {
        ...wallet.mobile,
        getUri: (wcUri) => {
          console.log(`📱 Mobile getUri called for ${target}:`, wcUri.substring(0, 30) + '...');
          const candidates = buildDeeplinkCandidates(target, wcUri);
          
          // 딥링크 후보들로 지갑 앱 열기 시도
          tryDeeplinkCandidates(candidates);
          
          // RainbowKit 내부가 문자열을 필요로 하므로 반환 유지
          return wcUri;
        },
      } : undefined,
      
      // QR 코드 탭에서도 동일하게 딥링크 오픈 (선택사항)
      qrCode: wallet.qrCode ? {
        ...wallet.qrCode,
        getUri: (wcUri) => {
          console.log(`🔲 QR getUri called for ${target}:`, wcUri.substring(0, 30) + '...');
          const candidates = buildDeeplinkCandidates(target, wcUri);
          
          // 딥링크 후보들로 지갑 앱 열기 시도
          tryDeeplinkCandidates(candidates);
          
          return wcUri;
        },
        instructions: {
          ...wallet.qrCode.instructions,
          steps: [
            {
              step: 'install',
              title: `Open ${wallet.name} App`,
              description: `The ${wallet.name} app will open automatically to connect.`,
            },
            {
              step: 'scan',
              title: 'Approve Connection',
              description: `Approve the connection request in your ${wallet.name} app.`,
            },
            {
              step: 'refresh',
              title: 'Return to Browser',
              description: 'Return to this page after approving the connection.',
            },
          ],
        },
      } : undefined,
    };
  };
}

