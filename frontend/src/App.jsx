import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { sdk } from '@farcaster/miniapp-sdk';
import { config } from './config/wagmi';
import { base } from 'wagmi/chains';
import { useEffect } from 'react';

import '@coinbase/onchainkit/styles.css';
import './styles/onchainkit-custom.css'; // 커스텀 OnchainKit 스타일
import './styles/global.css'; // 전역 스타일

import Header from './components/Header';
import Home from './pages/Home';
import Play from './pages/Play';

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const isPlayPage = location.pathname === '/play';
  
  // Farcaster Mini App SDK 초기화
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // 앱이 완전히 로드된 후 스플래시 화면 숨기기
        await sdk.actions.ready();
        console.log('✅ Farcaster Mini App SDK ready');
      } catch (error) {
        console.warn('⚠️ Farcaster Mini App SDK not available:', error);
        // SDK가 없어도 앱은 정상 작동 (일반 웹 브라우저에서)
      }
    };

    initializeSDK();
  }, []);
  
  return (
    <>
      {!isPlayPage && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play" element={<Play />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
            <OnchainKitProvider
              chain={base}
              config={{
                appearance: {
                  name: 'Base Revolt', // 모달 헤더에 표시될 앱 이름
                  logo: '/base-revolt logo.png', // 모달 헤더 로고
                  mode: 'auto',
                  theme: 'base',
                },
                wallet: {
                  display: 'modal',
                  preference: 'all',
                  termsUrl: 'https://example.com/terms', // 약관 링크
                  privacyUrl: 'https://example.com/privacy', // 개인정보처리방침 링크
                  supportedWallets: {
                    rabby: true, // Rabby 지갑 지원
                    trust: true, // Trust Wallet 지원
                    frame: true, // Frame 지갑 지원
                  },
                },
              }}
            >
          <BrowserRouter
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}
          >
            <AppContent />
          </BrowserRouter>
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

