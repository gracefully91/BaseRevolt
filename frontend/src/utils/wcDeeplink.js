// wcDeeplink.js - WalletConnect 딥링크 생성 유틸리티

/**
 * 지갑 앱의 딥링크를 생성합니다
 * @param {string} target - 지갑 타입 ('metamask' | 'coinbase' | 'trust' | 'phantom' | 'rainbow')
 * @param {string} wcUri - WalletConnect URI (wc:...)
 * @returns {string} 딥링크 URL
 */
export function buildDeeplink(target, wcUri) {
  const encodedUri = encodeURIComponent(wcUri);
  
  switch (target) {
    case 'metamask':
      // MetaMask universal link
      return `https://metamask.app.link/wc?uri=${encodedUri}`;
      
    case 'coinbase':
      // Coinbase Wallet universal link
      return `https://go.cb-w.com/wc?uri=${encodedUri}`;
      
    case 'trust':
      // Trust Wallet universal link
      return `https://link.trustwallet.com/wc?uri=${encodedUri}`;
      
    case 'phantom':
      // Phantom EVM 모드 (WalletConnect v2)
      return `https://phantom.app/ul/wc-v2?uri=${encodedUri}`;
      
    case 'rainbow':
      // Rainbow Wallet universal link
      return `https://rnbwapp.com/wc?uri=${encodedUri}`;
      
    default:
      console.warn(`Unknown wallet target: ${target}`);
      return '';
  }
}

/**
 * 딥링크로 지갑 앱을 엽니다
 * @param {string} url - 딥링크 URL
 */
export function openDeeplink(url) {
  try {
    if (!url) {
      console.warn('Empty deeplink URL');
      return;
    }
    
    console.log('🔗 Opening deeplink:', url.substring(0, 50) + '...');
    
    // 웹뷰 환경에서는 _self로 열어야 전환 성공률이 높음
    window.location.href = url;
  } catch (error) {
    console.error('Failed to open deeplink:', error);
  }
}

