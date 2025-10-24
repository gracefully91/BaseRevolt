import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config } from './config/wagmi';

import '@rainbow-me/rainbowkit/styles.css';

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
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;

