import { useMemo } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  rainbowWallet,
  phantomWallet,
  rabbyWallet,
  trustWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { useIsInMiniApp } from '../hooks/useIsInMiniApp';
import { farcasterMiniAppWallet } from '../utils/farcaster-wallet';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

// Project ID from environment variable (Reown/WalletConnect)
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '053604b7a282d126e4ae2457a2178783';

export function ConnectorProvider({ children }) {
  const { isInMiniApp, isLoading } = useIsInMiniApp();

  // Create connectors based on environment
  const connectors = useMemo(() => {
    console.log('🔧 Creating connectors for environment:', { isInMiniApp, isLoading });

    return connectorsForWallets(
      [
        {
          groupName: 'Recommended',
          wallets: isInMiniApp
            ? [ // Farcaster + regular wallets in Mini-App
                farcasterMiniAppWallet,
                coinbaseWallet,
                metaMaskWallet,
                walletConnectWallet,
                rainbowWallet,
                phantomWallet,
                rabbyWallet,
                trustWallet,
              ]
            : [ // Regular wallets outside Mini-App
                coinbaseWallet,
                metaMaskWallet,
                walletConnectWallet,
                rainbowWallet,
                phantomWallet,
                rabbyWallet,
                trustWallet,
              ],
        },
      ],
      {
        appName: 'Base Revolt',
        projectId: projectId,
      }
    );
  }, [isInMiniApp]);

  // Create Wagmi config with dynamic connectors
  const config = useMemo(() => {
    const cfg = createConfig({
      chains: [base, baseSepolia],
      connectors,
      transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
      },
      ssr: false,
      multiInjectedProviderDiscovery: false, // Prevent connector conflicts
    });

    console.log('⚙️ Wagmi config created:', {
      chains: cfg.chains.map(c => c.name),
      connectorCount: cfg.connectors.length,
      isInMiniApp,
    });

    return cfg;
  }, [connectors, isInMiniApp]);

  // Show loading state while detecting environment
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <div style={{ color: 'white', fontSize: '1.2rem' }}>
          🔄 Loading...
        </div>
      </div>
    );
  }

  return (
    <WagmiProvider config={config} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          locale="en"
          appInfo={{
            appName: 'Base Revolt',
            learnMoreUrl: 'https://base-revolt.vercel.app',
          }}
          initialChain={base}
          showRecentTransactions={true}
          modalSize="compact"
          coolMode={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

