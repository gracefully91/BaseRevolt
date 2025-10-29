import { useState, useEffect } from 'react';

export function useMobileWalletDetection() {
  const [isMobile, setIsMobile] = useState(false);
  const [userAgent, setUserAgent] = useState('');

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setUserAgent(ua);
    
    // 모바일 디바이스 감지
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileDevice = mobileRegex.test(ua);
    
    // 터치 스크린 감지
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // 화면 크기 기반 감지 (작은 화면)
    const isSmallScreen = window.innerWidth <= 768;
    
    setIsMobile(isMobileDevice || (hasTouchScreen && isSmallScreen));
    
    console.log('📱 Mobile detection:', {
      userAgent: ua,
      isMobileDevice,
      hasTouchScreen,
      isSmallScreen,
      finalIsMobile: isMobileDevice || (hasTouchScreen && isSmallScreen)
    });
  }, []);

  // 지갑 앱 설치 여부 확인
  const checkWalletInstalled = (walletName) => {
    switch (walletName.toLowerCase()) {
      case 'metamask':
        return window.ethereum?.isMetaMask || false;
      case 'coinbase':
        return window.ethereum?.isCoinbaseWallet || false;
      case 'rainbow':
        return window.ethereum?.isRainbow || false;
      case 'phantom':
        return window.phantom?.ethereum || false;
      case 'rabby':
        return window.ethereum?.isRabby || false;
      case 'trust':
        return window.ethereum?.isTrust || false;
      default:
        return false;
    }
  };

  // 모바일에서 지갑 앱으로 딥링크 시도
  const openWalletApp = (walletName) => {
    if (!isMobile) return false;

    const deepLinks = {
      metamask: 'metamask://dapp/',
      coinbase: 'cbwallet://dapp/',
      rainbow: 'rainbow://dapp/',
      phantom: 'phantom://dapp/',
      rabby: 'rabby://dapp/',
      trust: 'trust://dapp/',
    };

    const deepLink = deepLinks[walletName.toLowerCase()];
    if (deepLink) {
      const currentUrl = window.location.href;
      const fullDeepLink = `${deepLink}${currentUrl}`;
      
      console.log(`🔗 Opening ${walletName} app:`, fullDeepLink);
      
      // 딥링크 시도
      window.location.href = fullDeepLink;
      
      // 3초 후 앱이 열리지 않으면 앱스토어로 이동
      setTimeout(() => {
        const appStoreLinks = {
          metamask: 'https://metamask.app.link/dapp/',
          coinbase: 'https://go.cb-w.com/dapp/',
          rainbow: 'https://rainbow.me/app',
          phantom: 'https://phantom.app/download',
          rabby: 'https://rabby.io/download',
          trust: 'https://trustwallet.com/download',
        };
        
        const appStoreLink = appStoreLinks[walletName.toLowerCase()];
        if (appStoreLink) {
          console.log(`📱 Redirecting to app store for ${walletName}`);
          window.open(appStoreLink, '_blank');
        }
      }, 3000);
      
      return true;
    }
    
    return false;
  };

  return {
    isMobile,
    userAgent,
    checkWalletInstalled,
    openWalletApp,
  };
}
