# 지갑 연결 및 OnchainKit UI 연동 가이드

이 문서는 Reown AppKit을 사용한 지갑 연결과 OnchainKit을 통한 아바타/사용자명 표시를 구현하는 완전한 가이드를 제공합니다.

## 📋 목차

1. [필수 패키지 설치](#필수-패키지-설치)
2. [ReownAppKitProvider 설정](#reownappkitprovider-설정)
3. [App.jsx 설정](#appjsx-설정)
4. [ConnectWalletModal 컴포넌트 생성](#connectwalletmodal-컴포넌트-생성)
5. [WalletConnectButton 컴포넌트 생성](#walletconnectbutton-컴포넌트-생성)
6. [사용 예시](#사용-예시)

---

## 필수 패키지 설치

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi viem @tanstack/react-query
npm install @coinbase/onchainkit
```

---

## ReownAppKitProvider 설정

### `src/providers/ReownAppKitProvider.jsx`

```jsx
import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base, baseSepolia } from 'wagmi/chains'

// 환경 변수에서 프로젝트 ID 가져오기
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 'demo'
const networks = [base, baseSepolia] // Base 메인넷과 테스트넷 모두 지원

// WagmiAdapter 인스턴스 생성 - projectId와 networks를 전달
const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks
})

// QueryClient 설정
const queryClient = new QueryClient()

// AppKit 설정
const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId: import.meta.env.VITE_REOWN_PROJECT_ID || 'demo',
  networks: networks,
  themeMode: 'light', // Light 모드
  themeVariables: {
    '--apkt-color-mix': '#0052FF', // Base 블루
    '--apkt-color-mix-strength': 40,
    '--apkt-z-index': 999999, // 다른 모달 위에 표시되도록 높은 z-index
  },
  featuredWalletIds: [
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Base (formerly Coinbase Wallet)
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393', // Phantom
  ],
  allWallets: 'SHOW', // 모든 지갑 표시
  features: {
    analytics: true,
    email: false,
    socials: ['farcaster'], // Farcaster 소셜 로그인 활성화
    emailShowWallets: true,
    swaps: false,
    onramp: false,
  },
  metadata: {
    name: 'Your App Name',
    description: 'Your App Description',
    url: window.location.origin,
    icons: ['https://your-domain.com/icon.png'],
  },
  enableWalletConnect: true,
  enableInjected: true,
  enableCoinbase: true,
  enableEIP6963: true,
  enableNetworkView: true,
  enableAccountView: true,
})

export function ReownAppKitProvider({ children }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

---

## App.jsx 설정

### `src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base, baseSepolia } from 'wagmi/chains';
import '@coinbase/onchainkit/styles.css'; // 필수: OnchainKit 스타일

import { ReownAppKitProvider } from './providers/ReownAppKitProvider';
import Home from './pages/Home';

function App() {
  return (
    <ReownAppKitProvider> {/* ReownAppKit이 가장 바깥쪽에 있어야 함 */}
      <OnchainKitProvider
        chain={base}
        chains={[base, baseSepolia]}
        config={{
          appearance: {
            name: 'Your App Name',
            logo: '/logo.png',
            mode: 'auto',
            theme: 'base',
          },
        }}
      >
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </OnchainKitProvider>
    </ReownAppKitProvider>
  );
}

export default App;
```

**중요:** `ReownAppKitProvider`는 반드시 `OnchainKitProvider` **바깥쪽**에 있어야 합니다. 순서가 바뀌면 `useAppKit` hook을 사용할 수 없습니다.

---

## ConnectWalletModal 컴포넌트 생성

### `src/components/ConnectWalletModal.jsx`

```jsx
import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useConfig, useConnect, useDisconnect } from 'wagmi';
import { getConnectors } from '@wagmi/core';
import { useIsInMiniApp } from '../hooks/useIsInMiniApp'; // 선택사항: Farcaster 모바일 체크용
import './ConnectWalletModal.css';

// 지갑 딥링크 설정 (선택사항: 모바일 앱에서 지갑 앱 열기용)
const WALLET_DEEPLINKS = {
  'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa': {
    label: 'Base',
    icon: '/base-wallet-icon.png',
    deeplink: 'basewallet://',
  },
  'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96': {
    label: 'MetaMask',
    icon: '/metamask-icon.png',
    deeplink: 'metamask://',
  },
  // ... 다른 지갑들
};

export function ConnectWalletModal({ isOpen, onClose }) {
  const { isInMiniApp } = useIsInMiniApp(); // 선택사항
  const config = useConfig();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  
  const [connecting, setConnecting] = useState(null);

  const handleWalletClick = useCallback(async (walletId) => {
    if (!isOpen) return;
    
    setConnecting(walletId);
    
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
        const cleanup = connector.on?.('message', (msg) => {
          if (msg?.type === 'display_uri' && msg?.data) {
            const wcUri = String(msg.data);
            const wallet = WALLET_DEEPLINKS[walletId];
            if (wallet) {
              // 딥링크로 지갑 앱 열기
              window.location.href = `${wallet.deeplink}wc?uri=${encodeURIComponent(wcUri)}`;
            }
          }
        });

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
    } finally {
      setConnecting(null);
    }
  }, [config, connectAsync, disconnectAsync, isInMiniApp, isOpen, onClose]);

  if (!isOpen) return null;

  const wallets = Object.keys(WALLET_DEEPLINKS);

  const modalContent = (
    <div className="connect-modal-overlay" onClick={onClose}>
      <div className="connect-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Connect Wallet</h2>
            <p className="modal-subtitle">Choose a wallet to continue</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

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
                </div>
                {isConnecting && <div className="wallet-spinner">⏳</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
```

**참고:** `useIsInMiniApp` hook은 Farcaster 모바일 환경 감지용입니다. 필요하지 않다면 제거 가능합니다.

---

## WalletConnectButton 컴포넌트 생성

### `src/components/WalletConnectButton.jsx`

```jsx
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi'
import { useState } from 'react'
import { 
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect
} from '@coinbase/onchainkit/wallet'
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity'
import { useAppKit } from '@reown/appkit/react'
import { base, baseSepolia } from 'wagmi/chains'
import './WalletConnectButton.css'

export default function WalletConnectButton() {
  const { address, isConnected, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useAppKit() // Reown AppKit 모달 열기
  const { switchChain } = useSwitchChain()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  if (!isConnected) {
    return (
      <button 
        className="custom-connect-button"
        onClick={() => open()} // Reown AppKit 모달 열기
      >
        Connect Wallet
      </button>
    )
  }

  // 연결된 상태에서는 OnchainKit UI 사용
  return (
    <div className="wallet-connected-container">
      {/* 체인 선택 드롭다운 (선택사항) */}
      <div className="chain-dropdown">
        <button 
          className="chain-dropdown-button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <img src="/base_logo.png" alt="Base" className="chain-logo" />
        </button>
        {isDropdownOpen && (
          <div className="chain-dropdown-menu">
            <button
              className={`chain-option ${chainId === base.id ? 'active' : ''}`}
              onClick={() => {
                switchChain({ chainId: base.id })
                setIsDropdownOpen(false)
              }}
            >
              <img src="/base_logo.png" alt="Base" className="chain-option-logo" />
              <span>Base</span>
            </button>
            <button
              className={`chain-option ${chainId === baseSepolia.id ? 'active' : ''}`}
              onClick={() => {
                switchChain({ chainId: baseSepolia.id })
                setIsDropdownOpen(false)
              }}
            >
              <img src="/base_logo.png" alt="Base Sepolia" className="chain-option-logo" />
              <span>Base Sepolia</span>
            </button>
          </div>
        )}
      </div>
      
      {/* OnchainKit 지갑 UI */}
      <Wallet>
        {/* 연결 버튼 (클릭 시 드롭다운 열림) */}
        <ConnectWallet>
          {/* Avatar: ENS/PFP 아바타 자동 표시 */}
          <Avatar address={address} className="h-6 w-6" />
          {/* Name: ENS 이름 또는 지갑 주소 표시 */}
          <Name address={address} />
        </ConnectWallet>
        
        {/* 드롭다운 메뉴 */}
        <WalletDropdown>
          {/* Identity: 아바타, 이름, 주소, ETH 잔액 표시 */}
          <Identity address={address} className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar address={address} />
            <Name address={address} />
            <Address address={address} className="text-gray-500" />
            <EthBalance address={address} />
          </Identity>
          
          {/* Base 네트워크 표시 */}
          <WalletDropdownBasename />
          {/* 연결 해제 버튼 */}
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  )
}
```

### 주요 컴포넌트 설명

- **`<Avatar address={address} />`**: 지갑 주소의 ENS 아바타 또는 기본 아바타를 자동으로 표시합니다.
- **`<Name address={address} />`**: ENS 이름이 있으면 표시하고, 없으면 지갑 주소를 표시합니다.
- **`<Address address={address} />`**: 지갑 주소를 표시합니다 (`hasCopyAddressOnClick` prop으로 클릭 시 복사 가능).
- **`<EthBalance address={address} />`**: ETH 잔액을 표시합니다.
- **`<Identity>`**: 위의 모든 컴포넌트를 하나로 묶어서 표시합니다.

---

## 사용 예시

### `src/pages/Home.jsx`

```jsx
import { useAccount } from 'wagmi'
import WalletConnectButton from '../components/WalletConnectButton'

function Home() {
  const { isConnected, address } = useAccount()

  return (
    <div>
      <WalletConnectButton />
      
      {isConnected && (
        <div>
          <p>Connected: {address}</p>
          {/* OnchainKit의 Avatar와 Name이 자동으로 표시됨 */}
        </div>
      )}
    </div>
  )
}
```

---

## 환경 변수 설정

`.env` 파일에 다음을 추가하세요:

```env
VITE_REOWN_PROJECT_ID=your_project_id_from_cloud.reown.com
```

Reown Cloud에서 프로젝트 ID를 발급받으세요: https://cloud.reown.com

---

## 스타일링

OnchainKit은 기본 스타일을 제공하지만, 커스텀 CSS로 오버라이드 가능합니다:

```css
/* src/components/WalletConnectButton.css */
.custom-connect-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
}

.wallet-connected-container {
  display: flex;
  align-items: center;
  gap: 12px;
}
```

---

## 문제 해결

### 에러: "Please call createAppKit before using useAppKit hook"

**원인:** `OnchainKitProvider`가 `ReownAppKitProvider` 바깥쪽에 있습니다.

**해결:** `ReownAppKitProvider`를 가장 바깥쪽에 배치하세요:

```jsx
<ReownAppKitProvider>
  <OnchainKitProvider>
    {/* ... */}
  </OnchainKitProvider>
</ReownAppKitProvider>
```

### 아바타가 표시되지 않음

**원인:** ENS 이름이 없거나 아바타가 설정되지 않았습니다.

**해결:** OnchainKit은 자동으로 기본 아바타를 표시합니다. ENS 이름을 설정하면 자동으로 감지됩니다.

### 지갑 연결이 안됨

**원인:** `VITE_REOWN_PROJECT_ID`가 설정되지 않았습니다.

**해결:** `.env` 파일에 프로젝트 ID를 추가하세요.

---

## 결론

이제 Reown AppKit으로 지갑을 연결하고, OnchainKit으로 아바타와 사용자명을 자동으로 표시할 수 있습니다. 모든 코드를 복사해서 사용하시면 됩니다!

