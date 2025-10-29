import { createAppKit } from '@reown/appkit/react'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { base, baseSepolia } from 'wagmi/chains'

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
  networks: networks, // 명시적으로 정의된 networks 사용
  themeMode: 'light', // Light 모드로 변경
  themeVariables: {
    '--apkt-color-mix': '#0052FF', // Base 블루
    '--apkt-color-mix-strength': 40,
    '--apkt-z-index': 999999,
  },
  featuredWalletIds: [
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa', // Base (formerly Coinbase Wallet) - 맨 위로
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    'a797aa35c0fadbfc1a53e7f675162ed5226968b44a19ee3d24385c64d1d3c393', // Phantom
  ],
  allWallets: 'SHOW', // 모든 지갑 표시
  features: {
    analytics: true,
    email: false,
    socials: ['farcaster'],
    emailShowWallets: true, // 이메일 섹션에서도 지갑 표시
    swaps: false, // Crypto swaps 비활성화
    onramp: false, // On-ramp (암호화폐 구매) 비활성화
  },
  metadata: {
    name: 'Base Revolt',
    description: 'Farcaster Mini App for Base Revolt',
    url: window.location.origin, // 현재 도메인 사용
    icons: ['https://base-revolt.vercel.app/base-revolt logo.png'],
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
