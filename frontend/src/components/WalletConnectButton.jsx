import { useState } from 'react';
import { useAccount, useDisconnect, useConnect } from 'wagmi';
import { base } from 'wagmi/chains';
import { WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import './WalletConnectButton.css';

export default function WalletConnectButton() {
  const { address, isConnected, chain, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { connect, connectors, isPending } = useConnect();
  const [showModal, setShowModal] = useState(false);

  // 디버깅: 연결 상태 확인
  console.log('🔍 지갑 연결 상태:', { 
    address, 
    isConnected, 
    chain, 
    connector: connector?.name,
    connectorId: connector?.id 
  });

  // 연결되지 않은 경우
  if (!isConnected) {
    return (
      <div className="wallet-connect-container">
        {/* 커스텀 Connect Wallet 버튼 */}
        <button 
          onClick={() => setShowModal(true)}
          className="custom-connect-button"
        >
          <span>Connect Wallet</span>
        </button>

        {/* 커스텀 지갑 선택 모달 */}
        {showModal && (
          <div className="custom-wallet-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="custom-wallet-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Connect your wallet</h2>
                <button 
                  className="close-button"
                  onClick={() => setShowModal(false)}
                >
                  ×
                </button>
              </div>
              
              <div className="wallet-grid">
                {connectors.map((connector) => (
                  <button
                    key={connector.id}
                    onClick={() => {
                      connect({ connector });
                      setShowModal(false);
                    }}
                    className="wallet-option"
                    disabled={isPending}
                  >
                    <div className="wallet-icon">
                      {connector.name === 'MetaMask' && <span className="metamask-icon">🦊</span>}
                      {connector.name === 'Coinbase Wallet' && <span className="coinbase-icon">🔵</span>}
                      {connector.name === 'Rabby' && <span className="rabby-icon">🐰</span>}
                      {connector.name === 'Trust Wallet' && <span className="trust-icon">🛡️</span>}
                      {connector.name === 'Frame' && <span className="frame-icon">🟢</span>}
                      {connector.name === 'WalletConnect' && <span className="walletconnect-icon">🔗</span>}
                      {connector.name === 'Safe' && <span className="safe-icon">🛡️</span>}
                      {connector.name === 'Phantom' && <span className="phantom-icon">👻</span>}
                      {connector.name === 'Brave Wallet' && <span className="brave-icon">🦁</span>}
                      {connector.name === 'Opera Wallet' && <span className="opera-icon">🎭</span>}
                      {connector.name === 'Bitget Wallet' && <span className="bitget-icon">🟡</span>}
                      {connector.name === 'BitKeep' && <span className="bitkeep-icon">🟣</span>}
                      {connector.name === 'Crypto.com DeFi Wallet' && <span className="crypto-icon">🔷</span>}
                      {connector.name === 'Blockchain.com' && <span className="blockchain-icon">💎</span>}
                      {connector.name === 'Kresus' && <span className="kresus-icon">🔵</span>}
                      {!['MetaMask', 'Coinbase Wallet', 'Rabby', 'Trust Wallet', 'Frame', 'WalletConnect', 'Safe', 'Phantom', 'Brave Wallet', 'Opera Wallet', 'Bitget Wallet', 'BitKeep', 'Crypto.com DeFi Wallet', 'Blockchain.com', 'Kresus'].includes(connector.name) && 
                        <span className="default-icon">🔗</span>}
                    </div>
                    <span className="wallet-name">{connector.name}</span>
                  </button>
                ))}
              </div>
              
              <div className="modal-footer">
                <p>
                  By connecting a wallet, you agree to our{' '}
                  <a href="#" className="link">Terms of Service</a> and{' '}
                  <a href="#" className="link">Privacy Policy</a>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 연결된 경우
  const isBaseChain = chain?.id === base.id;
  
  return (
    <div className="wallet-connected-container">
      <div className="wallet-info">
        <div className="wallet-address">
          <span className="address-icon">👛</span>
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
        </div>
        <div className="wallet-chain">
          {isBaseChain ? (
            <span className="chain-badge base">
              <span className="chain-icon">🔵</span>
              Base
            </span>
          ) : (
            <span className="chain-badge wrong">
              <span className="chain-icon">⚠️</span>
              Wrong Network
            </span>
          )}
        </div>
      </div>
      
      <WalletDropdown>
        <WalletDropdownDisconnect />
      </WalletDropdown>
      
      {/* 테스트용 강제 연결 해제 버튼 */}
      <button 
        onClick={() => {
          console.log('🔴 강제 연결 해제 시도');
          disconnect();
        }}
        className="force-disconnect-button"
      >
        강제 연결 해제 (테스트)
      </button>
    </div>
  );
}

