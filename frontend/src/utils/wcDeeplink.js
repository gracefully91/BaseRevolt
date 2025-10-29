export const WALLET_DEEPLINKS = {
  metamask: {
    label: 'MetaMask',
    subtitle: 'Mobile & Extension',
    icon: '/metamask_logo.png',
  },
  coinbase: {
    label: 'Coinbase Wallet',
    subtitle: 'Best on Farcaster',
    icon: '/coinbase_logo.png',
  },
  trust: {
    label: 'Trust Wallet',
    subtitle: 'Mobile & Extension',
    icon: '/metamask_logo.png', // 임시
  },
  phantom: {
    label: 'Phantom',
    subtitle: 'EVM Support',
    icon: '/metamask_logo.png', // 임시
  },
  rainbow: {
    label: 'Rainbow',
    subtitle: 'Mobile & Extension',
    icon: '/rainbow_logo.png',
  },
};

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  return /Android/.test(navigator.userAgent);
}

export function buildDeeplinkCandidates(target, wcUri) {
  const e = encodeURIComponent(wcUri);

  if (target === 'metamask') {
    return isAndroid() ? [
      `intent://wc?uri=${e}#Intent;scheme=metamask;package=io.metamask;S.browser_fallback_url=${encodeURIComponent('https://metamask.app.link/wc?uri='+e)};end`,
      `https://metamask.app.link/wc?uri=${e}`,
      `metamask://wc?uri=${e}`,
    ] : [
      `https://metamask.app.link/wc?uri=${e}`,
      `metamask://wc?uri=${e}`,
    ];
  }

  if (target === 'coinbase') {
    return isAndroid() ? [
      `intent://wc?uri=${e}#Intent;scheme=cbwallet;package=org.toshi;S.browser_fallback_url=${encodeURIComponent('https://go.cb-w.com/wc?uri='+e)};end`,
      `https://go.cb-w.com/wc?uri=${e}`,
      `cbwallet://wc?uri=${e}`,
      `coinbase://wc?uri=${e}`,
    ] : [
      `https://go.cb-w.com/wc?uri=${e}`,
      `cbwallet://wc?uri=${e}`,
      `coinbase://wc?uri=${e}`,
    ];
  }

  if (target === 'trust') {
    return isAndroid() ? [
      `intent://wc?uri=${e}#Intent;scheme=trust;package=com.wallet.crypto.trustapp;S.browser_fallback_url=${encodeURIComponent('https://link.trustwallet.com/wc?uri='+e)};end`,
      `https://link.trustwallet.com/wc?uri=${e}`,
      `trust://wc?uri=${e}`,
      `trust://wallet_connect?uri=${e}`,
    ] : [
      `https://link.trustwallet.com/wc?uri=${e}`,
      `trust://wc?uri=${e}`,
      `trust://wallet_connect?uri=${e}`,
    ];
  }

  if (target === 'phantom') {
    return isAndroid() ? [
      `intent://ul/wc-v2?uri=${e}#Intent;scheme=phantom;package=app.phantom;S.browser_fallback_url=${encodeURIComponent('https://phantom.app/ul/wc-v2?uri='+e)};end`,
      `https://phantom.app/ul/wc-v2?uri=${e}`,
      `phantom://ul/wc-v2?uri=${e}`,
    ] : [
      `https://phantom.app/ul/wc-v2?uri=${e}`,
      `phantom://ul/wc-v2?uri=${e}`,
    ];
  }

  if (target === 'rainbow') {
    return isAndroid() ? [
      `intent://wc?uri=${e}#Intent;scheme=rainbow;package=me.rainbow;S.browser_fallback_url=${encodeURIComponent('https://rnbwapp.com/wc?uri='+e)};end`,
      `https://rnbwapp.com/wc?uri=${e}`,
      `rainbow://wc?uri=${e}`,
    ] : [
      `https://rnbwapp.com/wc?uri=${e}`,
      `rainbow://wc?uri=${e}`,
    ];
  }

  return [];
}

export function openDeeplink(url) {
  console.log('🔗 Opening deeplink:', url);
  // 웹뷰에선 _self 전환이 성공률 높음
  window.location.href = url;
}

