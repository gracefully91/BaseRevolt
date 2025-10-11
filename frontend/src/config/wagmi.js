import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { injected, coinbaseWallet, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base],
  connectors: [
    injected(), // MetaMask 등 브라우저 지갑
    coinbaseWallet({
      appName: 'Base Revolt',
      appLogoUrl: 'https://base-revolt.vercel.app/icon.png',
    }),
    // WalletConnect는 프로젝트 ID가 있을 때만
    // walletConnect({
    //   projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
    // }),
  ],
  transports: {
    [base.id]: http(),
  },
})

