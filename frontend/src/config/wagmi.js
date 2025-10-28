import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { 
  coinbaseWallet, 
  metaMask, 
  injected,
  safe
} from 'wagmi/connectors'

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: 'Base Revolt',
      preference: 'smartWalletOnly',
      version: '4',
    }),
    metaMask({
      // MetaMask 확장 프로그램 우선 사용
      preference: 'extension',
      // 모바일에서는 WalletConnect 사용
      fallback: {
        walletConnect: {
          projectId: import.meta.env.VITE_REOWN_PROJECT_ID,
        },
      },
    }),
    injected(), // 브라우저에 설치된 모든 지갑 (Rabby, Trust Wallet, Frame 등)
    safe(), // Safe 지갑
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: false,
})

