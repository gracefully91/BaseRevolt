import { useState, useEffect } from 'react';
import { useAccount, useDisconnect, useConnect, useSwitchChain } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import './WalletConnectButton.css';

export default function WalletConnectButton() {
  const { address, isConnected, chain, connector } = useAccount();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const [showChainDropdown, setShowChainDropdown] = useState(false);

  // 지갑 연결 시 자동으로 Base Mainnet으로 전환 (선택적)
  // 주석 처리: 사용자가 수동으로 네트워크 선택하도록 함
  // useEffect(() => {
  //   if (isConnected && chain && chain.id !== base.id && typeof switchChain === 'function') {
  //     console.log('🔄 Base Mainnet으로 자동 전환 중...');
  //     try {
  //       const result = switchChain({ chainId: base.id });
  //       if (result && typeof result.then === 'function') {
  //         result
  //           .then(() => console.log('✅ Base Mainnet으로 자동 전환 완료'))
  //           .catch((error) => {
  //             console.warn('⚠️ Base Mainnet 자동 전환 실패:', error);
  //           });
  //       }
  //     } catch (error) {
  //       console.warn('⚠️ switchChain 호출 실패:', error);
  //     }
  //   }
  // }, [isConnected, chain]);

  // 디버깅: 연결 상태 확인 (필요시만)
  // console.log('🔍 지갑 연결 상태:', { 
  //   address, 
  //   isConnected, 
  //   chain, 
  //   connector: connector?.name,
  //   connectorId: connector?.id 
  // });

  // 체인 변경 함수들
  const switchToBase = async () => {
    try {
      await switchChain({ chainId: base.id });
      console.log('✅ Base 메인넷으로 변경 완료');
      setShowChainDropdown(false);
    } catch (error) {
      console.error('❌ Base 메인넷 변경 실패:', error);
    }
  };

  const switchToBaseSepolia = async () => {
    try {
      await switchChain({ chainId: baseSepolia.id });
      console.log('✅ Base Sepolia 테스트넷으로 변경 완료');
      setShowChainDropdown(false);
    } catch (error) {
      console.error('❌ Base Sepolia 변경 실패:', error);
    }
  };

  // 현재 체인 정보 가져오기
  const getCurrentChainInfo = () => {
    if (chain?.id === base.id) {
      return { icon: '🔵', name: 'Base Mainnet', id: base.id };
    } else if (chain?.id === baseSepolia.id) {
      return { icon: '🧪', name: 'Base Sepolia', id: baseSepolia.id };
    }
    return { icon: '❓', name: 'Unknown Network', id: chain?.id };
  };

  const currentChain = getCurrentChainInfo();

  // 연결되지 않은 경우 - RainbowKit ConnectButton 사용 (지갑 선택 UI 제공)
  if (!isConnected) {
    return (
      <div className="wallet-connect-container custom-wallet-button">
        <ConnectButton 
          chainStatus="icon"
          showBalance={false}
          accountStatus="address"
        />
      </div>
    );
  }

  // 연결된 경우 - OnchainKit Wallet 컴포넌트 사용
  const isBaseChain = chain?.id === base.id;
  
  return (
    <div className="wallet-connected-container">
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address className="text-gray-500" />
            <EthBalance />
          </Identity>
          
          {/* 체인 변경 섹션 - 개선된 UI */}
          <div className="chain-switch-section">
            <div className="current-chain-display" onClick={() => setShowChainDropdown(!showChainDropdown)}>
              <div className="current-chain-info">
                <span className="chain-icon">{currentChain.icon}</span>
                <span className="chain-name">{currentChain.name}</span>
              </div>
              <div className="chain-dropdown-toggle">
                <span className={`dropdown-arrow ${showChainDropdown ? 'open' : ''}`}>▼</span>
              </div>
            </div>
            
            {showChainDropdown && (
              <div className="chain-dropdown">
                <button
                  onClick={switchToBase}
                  disabled={isSwitchingChain || chain?.id === base.id}
                  className={`chain-option ${chain?.id === base.id ? 'active' : ''}`}
                >
                  <span className="chain-icon">🔵</span>
                  <span className="chain-name">Base Mainnet</span>
                  {chain?.id === base.id && <span className="current-badge">Current</span>}
                </button>
                <button
                  onClick={switchToBaseSepolia}
                  disabled={isSwitchingChain || chain?.id === baseSepolia.id}
                  className={`chain-option ${chain?.id === baseSepolia.id ? 'active' : ''}`}
                >
                  <span className="chain-icon">🧪</span>
                  <span className="chain-name">Base Sepolia</span>
                  {chain?.id === baseSepolia.id && <span className="current-badge">Current</span>}
                </button>
              </div>
            )}
          </div>
          
          <WalletDropdownBasename />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
      
      {/* 네트워크 상태 표시 */}
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

