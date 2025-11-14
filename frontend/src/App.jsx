import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { sdk } from '@farcaster/miniapp-sdk';
import { base, baseSepolia } from 'wagmi/chains';
import { useEffect } from 'react';

import '@coinbase/onchainkit/styles.css';
import './styles/onchainkit-custom.css'; // 커스텀 OnchainKit 스타일
import './styles/wallet-glow.css'; // 지갑 버튼 빛나는 효과
import './styles/wallet-modal-responsive.css'; // ConnectWallet 모달 미니앱 최적화

import { ReownAppKitProvider } from './providers/ReownAppKitProvider';
import Header from './components/Header';
import Home from './pages/Home';
import Play from './pages/Play';
import AdminVehicles from './pages/AdminVehicles';

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
        <Route path="/admin/vehicles" element={<AdminVehicles />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <ReownAppKitProvider>
      <OnchainKitProvider
        chain={base}
        chains={[base, baseSepolia]}
        config={{
          appearance: {
            name: 'Base Revolt',
            logo: '/base-revolt logo.png',
            mode: 'auto',
            theme: 'base',
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
    </ReownAppKitProvider>
  );
}

export default App;


