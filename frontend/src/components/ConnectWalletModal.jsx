import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useConfig, useConnect, useDisconnect } from 'wagmi';
import { getConnectors } from '@wagmi/core';
import { useIsInMiniApp } from '../hooks/useIsInMiniApp';
import { WALLET_DEEPLINKS, buildDeeplinkCandidates, openDeeplink } from '../utils/wcDeeplink';
import './ConnectWalletModal.css';

export function ConnectWalletModal({ isOpen, onClose }) {
  const { isInMiniApp } = useIsInMiniApp();
  const config = useConfig();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  
  const [connecting, setConnecting] = useState(null);
  const [showRetry, setShowRetry] = useState(false);
  const [currentWcUri, setCurrentWcUri] = useState(null);
  const [currentTarget, setCurrentTarget] = useState(null);

  const handleWalletClick = useCallback(async (walletId) => {
    if (!isOpen) return;
    
    console.log(`📱 Connecting to ${walletId}...`);
    setConnecting(walletId);
    setShowRetry(false);
    
    try {
      // 기존 연결 정리
      await disconnectAsync().catch(() => {});
      
      // WalletConnect 커넥터 찾기
      const connector = getConnectors(config).find(c => c.type === 'walletConnect');
      if (!connector) {
        throw new Error('WalletConnect connector not found');
      }

      // Farcaster 모바일 환경: display_uri 즉시 딥링크
      if (isInMiniApp && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        console.log('🎯 Farcaster Mobile: Setting up deep link interception');
        
        const cleanup = connector.on?.('message', (msg) => {
          if (msg?.type === 'display_uri' && msg?.data) {
            const wcUri = String(msg.data);
            console.log('🔗 display_uri received:', wcUri.substring(0, 50) + '...');
            
            setCurrentWcUri(wcUri);
            setCurrentTarget(walletId);
            
            const candidates = buildDeeplinkCandidates(walletId, wcUri);
            if (candidates.length) {
              try {
                openDeeplink(candidates[0]);
              } catch (err) {
                console.error('❌ Deeplink failed:', err);
                setShowRetry(true);
              }
            } else {
              setShowRetry(true);
            }
          }
        });

        // 연결 시도
        await connectAsync({ connector });
        
        cleanup?.();
        onClose();
      } else {
        // 일반 환경: 표준 연결
        await connectAsync({ connector });
        onClose();
      }
    } catch (error) {
      console.error('❌ Connection failed:', error);
      setShowRetry(true);
    } finally {
      setConnecting(null);
    }
  }, [config, connectAsync, disconnectAsync, isInMiniApp, isOpen, onClose]);

  const handleRetryDeeplink = useCallback(() => {
    if (!currentWcUri || !currentTarget) return;
    
    const candidates = buildDeeplinkCandidates(currentTarget, currentWcUri);
    if (candidates.length) {
      openDeeplink(candidates[0]);
    }
  }, [currentWcUri, currentTarget]);

  const handleCopyUri = useCallback(() => {
    if (!currentWcUri) return;
    navigator.clipboard.writeText(currentWcUri);
    alert('WalletConnect URI copied!');
  }, [currentWcUri]);

  if (!isOpen) return null;

  const wallets = Object.keys(WALLET_DEEPLINKS);

  const modalContent = (
    <div className="connect-modal-overlay" onClick={onClose}>
      <div className="connect-modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Connect Wallet</h2>
            <p className="modal-subtitle">Choose a wallet to continue on Base</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Wallet List */}
        <div className="wallet-list">
          {wallets.map((walletId) => {
            const wallet = WALLET_DEEPLINKS[walletId];
            const isConnecting = connecting === walletId;
            
            return (
              <button
                key={walletId}
                className="wallet-item"
                disabled={isConnecting}
                onClick={() => handleWalletClick(walletId)}
              >
                <div className="wallet-icon">
                  <img src={wallet.icon} alt={wallet.label} />
                </div>
                <div className="wallet-info">
                  <div className="wallet-label">{wallet.label}</div>
                  <div className="wallet-subtitle">{wallet.subtitle}</div>
                </div>
                {isConnecting && <div className="wallet-spinner">⏳</div>}
              </button>
            );
          })}
        </div>

        {/* Retry Bar (Farcaster Mobile Only) */}
        {showRetry && isInMiniApp && (
          <div className="retry-bar">
            <p className="retry-message">Couldn't open the app.</p>
            <div className="retry-actions">
              <button className="retry-button primary" onClick={handleRetryDeeplink}>
                🔗 Try Again
              </button>
              <button className="retry-button" onClick={handleCopyUri}>
                📋 Copy URI
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <p className="modal-terms">
            By connecting your wallet, you agree to our{' '}
            <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
          </p>
          <p className="modal-credit">UX by WalletConnect / Reown</p>
        </div>
      </div>
    </div>
  );

  // Portal을 사용해서 body에 직접 렌더링
  return createPortal(modalContent, document.body);
}

