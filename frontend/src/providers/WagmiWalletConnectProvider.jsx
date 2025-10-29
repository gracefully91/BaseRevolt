import { useMemo } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { walletConnect } from 'wagmi/connectors';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

// Project ID from environment variable
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || 
                 import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 
                 '053604b7a282d126e4ae2457a2178783';

export function WagmiWalletConnectProvider({ children }) {
  const config = useMemo(() => {
    console.log('🔧 Creating WalletConnect-only Wagmi config');
    
    return createConfig({
      chains: [base, baseSepolia],
      connectors: [
        walletConnect({
          projectId: projectId,
          showQrModal: false,   // QR 모달은 우리가 직접 제어
          relayUrl: 'wss://relay.walletconnect.com',
          metadata: {
            name: 'Base Revolt',
            description: 'AR Gaming Platform - Control real RC cars',
            url: 'https://base-revolt.vercel.app',
            icons: ['https://base-revolt.vercel.app/base-revolt%20logo.png'],
          },
        })
      ],
      transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
      },
      ssr: false,
    });
  }, []);

  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

