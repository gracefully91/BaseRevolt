import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { AuthKitProvider } from '@farcaster/auth-kit';
import { config } from './config/wagmi';

import '@rainbow-me/rainbowkit/styles.css';
import '@farcaster/auth-kit/styles.css';

import Header from './components/Header';
import Home from './pages/Home';
import Play from './pages/Play';

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const isPlayPage = location.pathname === '/play';
  
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
  const authConfig = {
    rpcUrl: 'https://mainnet.optimism.io',
    domain: window.location.host,
    siweUri: window.location.origin,
    relay: 'https://relay.farcaster.xyz',
    // 7일간 세션 유지
    expirationTime: 7 * 24 * 60 * 60 * 1000, // 7일 (밀리초)
  };

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthKitProvider config={authConfig}>
          <RainbowKitProvider locale="en-US">
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AppContent />
            </BrowserRouter>
          </RainbowKitProvider>
        </AuthKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

