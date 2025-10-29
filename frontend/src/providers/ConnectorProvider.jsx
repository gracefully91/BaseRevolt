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
import { wrapWalletForMiniApp } from '../utils/wrapWalletForMiniApp';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

// Project ID from environment variable (Reown/WalletConnect)
const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '053604b7a282d126e4ae2457a2178783';

export function ConnectorProvider({ children }) {
  const { isInMiniApp, isLoading } = useIsInMiniApp();

  // 미니앱 환경에서만 딥링크 오버라이드 적용
  const wrappedWallets = useMemo(() => {
    if (!isInMiniApp) {
      // 일반 환경: 원본 지갑들 그대로 사용
      return {
        coinbase: coinbaseWallet,
        metamask: metaMaskWallet,
        rainbow: rainbowWallet,
        trust: trustWallet,
        phantom: phantomWallet,
        rabby: rabbyWallet,
        walletconnect: walletConnectWallet,
      };
    }

    // 미니앱 환경: 딥링크 래퍼 적용
    console.log('🔧 Wrapping wallets for Farcaster Mini-App deeplinks');
    return {
      coinbase: wrapWalletForMiniApp(coinbaseWallet, 'coinbase'),
      metamask: wrapWalletForMiniApp(metaMaskWallet, 'metamask'),
      rainbow: wrapWalletForMiniApp(rainbowWallet, 'rainbow'),
      trust: wrapWalletForMiniApp(trustWallet, 'trust'),
      phantom: wrapWalletForMiniApp(phantomWallet, 'phantom'),
      rabby: rabbyWallet, // Rabby는 주로 injected 우선, 필요시 래핑 가능
      walletconnect: walletConnectWallet, // WalletConnect는 기본 QR 유지
    };
  }, [isInMiniApp]);

  // Create connectors based on environment
  const connectors = useMemo(() => {
    console.log('🔧 Creating connectors for environment:', { isInMiniApp, isLoading });

    return connectorsForWallets(
      [
        {
          groupName: 'Recommended',
          wallets: isInMiniApp
            ? [ // Farcaster + wrapped wallets in Mini-App
                farcasterMiniAppWallet,
                wrappedWallets.coinbase,
                wrappedWallets.metamask,
                wrappedWallets.rainbow,
                wrappedWallets.trust,
                wrappedWallets.phantom,
                wrappedWallets.rabby,
                wrappedWallets.walletconnect,
              ]
            : [ // Regular wallets outside Mini-App
                wrappedWallets.coinbase,
                wrappedWallets.metamask,
                wrappedWallets.walletconnect,
                wrappedWallets.rainbow,
                wrappedWallets.phantom,
                wrappedWallets.rabby,
                wrappedWallets.trust,
              ],
        },
      ],
      {
        appName: 'Base Revolt',
        projectId: projectId,
      }
    );
  }, [isInMiniApp, wrappedWallets]);

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
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider locale="en">
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

