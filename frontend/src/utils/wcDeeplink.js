// wcDeeplink.js - WalletConnect 딥링크 생성 유틸리티

/**
 * 플랫폼 감지
 */
export function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

/**
 * 지갑별 딥링크 후보들을 생성합니다 (우선순위 순서)
 * @param {string} target - 지갑 타입
 * @param {string} wcUri - WalletConnect URI (wc:...)
 * @returns {string[]} 딥링크 URL 배열 (우선순위 순)
 */
export function buildDeeplinkCandidates(target, wcUri) {
  const encodedUri = encodeURIComponent(wcUri);
  const candidates = [];
  
  switch (target) {
    case 'metamask':
      if (isAndroid()) {
        // Android: intent 방식이 가장 확실
        candidates.push(`intent://wc?uri=${encodedUri}#Intent;package=io.metamask;scheme=wc;end;`);
      }
      // Universal link (iOS/Android 모두)
      candidates.push(`https://metamask.app.link/wc?uri=${encodedUri}`);
      // 직접 스킴 (폴백)
      candidates.push(`metamask://wc?uri=${encodedUri}`);
      break;
      
    case 'coinbase':
      if (isAndroid()) {
        candidates.push(`intent://wc?uri=${encodedUri}#Intent;package=org.toshi;scheme=cbwallet;end;`);
      }
      candidates.push(`https://go.cb-w.com/wc?uri=${encodedUri}`);
      candidates.push(`cbwallet://wc?uri=${encodedUri}`);
      break;
      
    case 'trust':
      if (isAndroid()) {
        candidates.push(`intent://wc?uri=${encodedUri}#Intent;package=com.wallet.crypto.trustapp;scheme=trust;end;`);
      }
      candidates.push(`https://link.trustwallet.com/wc?uri=${encodedUri}`);
      candidates.push(`trust://wc?uri=${encodedUri}`);
      break;
      
    case 'phantom':
      if (isAndroid()) {
        candidates.push(`intent://ul/wc-v2?uri=${encodedUri}#Intent;package=app.phantom;scheme=phantom;end;`);
      }
      candidates.push(`https://phantom.app/ul/wc-v2?uri=${encodedUri}`);
      candidates.push(`phantom://ul/wc-v2?uri=${encodedUri}`);
      break;
      
    case 'rainbow':
      if (isAndroid()) {
        candidates.push(`intent://wc?uri=${encodedUri}#Intent;package=me.rainbow;scheme=rainbow;end;`);
      }
      candidates.push(`https://rnbwapp.com/wc?uri=${encodedUri}`);
      candidates.push(`rainbow://wc?uri=${encodedUri}`);
      break;
      
    default:
      console.warn(`Unknown wallet target: ${target}`);
  }
  
  return candidates;
}

/**
 * 딥링크 후보들을 순차적으로 시도합니다
 * @param {string[]} candidates - 딥링크 URL 배열
 * @param {number} delayMs - 각 시도 간 딜레이 (ms)
 */
export function tryDeeplinkCandidates(candidates, delayMs = 300) {
  if (!candidates || candidates.length === 0) {
    console.warn('No deeplink candidates provided');
    return;
  }
  
  console.log(`🔗 Trying ${candidates.length} deeplink candidates:`, candidates);
  
  // 첫 번째 후보를 즉시 시도 (사용자 제스처 콜스택 내)
  try {
    window.location.href = candidates[0];
    console.log('✅ Opened primary deeplink:', candidates[0].substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ Failed to open primary deeplink:', error);
  }
  
  // 나머지 후보들을 순차적으로 시도 (폴백)
  candidates.slice(1).forEach((url, index) => {
    setTimeout(() => {
      try {
        window.location.href = url;
        console.log(`✅ Opened fallback deeplink #${index + 1}:`, url.substring(0, 50) + '...');
      } catch (error) {
        console.error(`❌ Failed to open fallback deeplink #${index + 1}:`, error);
      }
    }, delayMs * (index + 1));
  });
}

/**
 * 단일 딥링크로 지갑 앱을 엽니다 (이전 버전 호환성)
 * @param {string} url - 딥링크 URL
 */
export function openDeeplink(url) {
  try {
    if (!url) {
      console.warn('Empty deeplink URL');
      return;
    }
    
    console.log('🔗 Opening deeplink:', url.substring(0, 50) + '...');
    window.location.href = url;
  } catch (error) {
    console.error('Failed to open deeplink:', error);
  }
}

