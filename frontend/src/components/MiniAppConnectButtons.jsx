// MiniAppConnectButtons.jsx - Farcaster Mini-App 전용 지갑 연결 버튼

import { useCallback, useState } from 'react';
import { useConnect, useAccount } from 'wagmi';
import { buildDeeplinkCandidates, tryDeeplinkCandidates } from '../utils/wcDeeplink';
import './MiniAppConnectButtons.css';

// 지갑별 메타데이터
const WALLETS = [
  {
    id: 'coinbase',
    name: 'Coinbase Wallet',
    icon: '/coinbase_logo.png',
    target: 'coinbase',
  },
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '/metamask_logo.png',
    target: 'metamask',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: '/rainbow_logo.png',
    target: 'rainbow',
  },
  {
    id: 'trust',
    name: 'Trust Wallet',
    icon: 'https://trustwallet.com/assets/images/media/assets/trust_platform.svg',
    target: 'trust',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: 'https://phantom.app/img/logo.png',
    target: 'phantom',
  },
];

export function MiniAppConnectButtons() {
  const { connectors, connectAsync } = useConnect();
  const { isConnected } = useAccount();
  const [connecting, setConnecting] = useState(null);

  const handleConnect = useCallback(async (wallet) => {
    setConnecting(wallet.id);
    
    try {
      console.log(`🔌 Starting connection for ${wallet.name}...`);
      
      // WalletConnect 커넥터 찾기
      const wcConnector = connectors.find(
        c => c.type === 'walletConnect' || c.id === 'walletConnect'
      );
      
      if (!wcConnector) {
        console.error('❌ WalletConnect connector not found');
        alert('WalletConnect is not available. Please refresh the page.');
        return;
      }
      
      console.log('✅ Found WalletConnect connector:', wcConnector.id);
      
      // display_uri 이벤트 리스너 설정 (사용자 제스처 콜스택 내에서!)
      let deeplinOpened = false;
      const handleMessage = (event) => {
        console.log('📨 WalletConnect event:', event);
        
        if (event?.type === 'display_uri' && event?.data && !deeplinkOpened) {
          deeplinkOpened = true;
          const wcUri = String(event.data);
          console.log('🔗 Got WalletConnect URI:', wcUri.substring(0, 30) + '...');
          
          // 딥링크 후보 생성 및 즉시 실행 (사용자 제스처 콜스택 내!)
          const candidates = buildDeeplinkCandidates(wallet.target, wcUri);
          console.log(`🚀 Opening ${wallet.name} with ${candidates.length} candidates...`);
          
          tryDeeplinkCandidates(candidates);
        }
      };
      
      // 이벤트 리스너 등록
      wcConnector.emitter?.on('message', handleMessage);
      
      try {
        // WalletConnect 연결 시도
        console.log('🔄 Calling connectAsync...');
        await connectAsync({ connector: wcConnector });
        console.log('✅ Connection successful!');
      } catch (error) {
        console.error('❌ Connection error:', error);
        // 사용자가 취소한 경우는 정상
        if (error.message?.includes('User rejected') || error.message?.includes('canceled')) {
          console.log('ℹ️ User canceled connection');
        } else {
          console.error('Connection failed:', error);
        }
      } finally {
        // 이벤트 리스너 정리
        wcConnector.emitter?.off('message', handleMessage);
      }
    } catch (error) {
      console.error(`❌ Error connecting to ${wallet.name}:`, error);
      alert(`Failed to connect to ${wallet.name}. Please try again.`);
    } finally {
      setConnecting(null);
    }
  }, [connectors, connectAsync]);

  // 이미 연결된 경우 아무것도 표시하지 않음
  if (isConnected) {
    return null;
  }

  return (
    <div className="miniapp-connect-container">
      <div className="miniapp-connect-header">
        <h3>📱 Connect Wallet</h3>
        <p>Choose your wallet to connect</p>
      </div>
      
      <div className="miniapp-wallet-grid">
        {WALLETS.map((wallet) => (
          <button
            key={wallet.id}
            onClick={() => handleConnect(wallet)}
            disabled={connecting === wallet.id}
            className={`miniapp-wallet-button ${connecting === wallet.id ? 'connecting' : ''}`}
          >
            <div className="wallet-icon-wrapper">
              <img 
                src={wallet.icon} 
                alt={wallet.name}
                className="wallet-icon"
              />
            </div>
            <div className="wallet-name">
              {connecting === wallet.id ? 'Opening...' : wallet.name}
            </div>
          </button>
        ))}
      </div>
      
      <div className="miniapp-connect-footer">
        <p className="miniapp-hint">
          💡 Tip: Enable "Open supported links" in your wallet app settings for best experience
        </p>
      </div>
    </div>
  );
}

