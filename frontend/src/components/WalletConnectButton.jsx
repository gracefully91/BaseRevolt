import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { base } from 'wagmi/chains';
import './WalletConnectButton.css';

export default function WalletConnectButton() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showMenu, setShowMenu] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // 지갑 연결
  const handleConnect = async (connector) => {
    try {
      setIsConnecting(true);
      await connect({ connector });
      setShowMenu(false);
    } catch (error) {
      console.error('지갑 연결 실패:', error);
      if (error.message?.includes('User rejected')) {
        alert('지갑 연결이 취소되었습니다.');
      } else {
        alert('지갑 연결에 실패했습니다.');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // 네트워크 전환
  const switchToBase = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${base.id.toString(16)}` }],
        });
      }
    } catch (switchError) {
      // Base 체인이 없으면 추가
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${base.id.toString(16)}`,
              chainName: base.name,
              nativeCurrency: base.nativeCurrency,
              rpcUrls: base.rpcUrls.default.http,
              blockExplorerUrls: [base.blockExplorers.default.url]
            }],
          });
        } catch (addError) {
          console.error('Base 네트워크 추가 실패:', addError);
        }
      }
    }
  };

  // 주소 단축 표시
  const formatAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // 연결되지 않은 경우
  if (!isConnected) {
    return (
      <div className="wallet-connect-container">
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={isConnecting}
          className="connect-button"
        >
          {isConnecting ? '연결 중...' : '🔗 Connect Wallet'}
        </button>

        {showMenu && (
          <div className="wallet-menu">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => handleConnect(connector)}
                disabled={!connector.ready || isConnecting}
                className="wallet-option"
              >
                {connector.name}
                {!connector.ready && ' (설치 필요)'}
              </button>
            ))}
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
          {formatAddress(address)}
        </div>
        <div className="wallet-chain">
          {isBaseChain ? (
            <span className="chain-badge base">Base</span>
          ) : (
            <button onClick={switchToBase} className="chain-badge wrong">
              Wrong Network - Click to Switch
            </button>
          )}
        </div>
      </div>
      
      <button onClick={() => disconnect()} className="disconnect-button">
        Disconnect
      </button>
    </div>
  );
}

