import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { 
  coinbaseWallet, 
  metaMask, 
  walletConnect,
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
    metaMask(),
    walletConnect({
      projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // WalletConnect 프로젝트 ID 필요
    }),
    injected(), // 브라우저에 설치된 모든 지갑 (Rabby, Trust Wallet, Frame 등)
    safe(), // Safe 지갑
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: false,
  // 자동 재연결 완전 비활성화
  reconnect: false,
  // 저장된 연결 정보 무시
  storage: null,
})

