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
    metaMask(),
    injected(), // 브라우저에 설치된 모든 지갑 (Rabby, Trust Wallet, Frame 등)
    safe(), // Safe 지갑
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: false,
})

