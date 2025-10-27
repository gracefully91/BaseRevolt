import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import './Header.css';

export default function Header() {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const [showModal, setShowModal] = useState(false);

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">🚗</span>
          <span className="logo-text">Base Revolt</span>
        </Link>

        <nav className="nav">
          {!isConnected ? (
            <button 
              onClick={() => setShowModal(true)}
              className="header-connect-button"
            >
              <span>Connect Wallet</span>
            </button>
          ) : (
            <div className="connected-wallet">
              <span className="wallet-status">Connected</span>
            </div>
          )}

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
        </nav>
      </div>
    </header>
  );
}

