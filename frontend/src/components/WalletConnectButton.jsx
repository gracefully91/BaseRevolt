import { useAccount, useDisconnect, useSwitchChain } from 'wagmi'
import { useState } from 'react'
import { 
  Wallet,
  ConnectWallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect
} from '@coinbase/onchainkit/wallet'
// import { NetworkButton } from '@coinbase/onchainkit'
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity'
import { useAppKit } from '@reown/appkit/react'
import { base, baseSepolia } from 'wagmi/chains'
import './WalletConnectButton.css'

export default function WalletConnectButton() {
  const { address, isConnected, chainId } = useAccount()
  const { disconnect } = useDisconnect()
  const { open } = useAppKit()
  const { switchChain } = useSwitchChain()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  if (!isConnected) {
    return (
      <button 
        className="custom-connect-button"
        onClick={() => open()}
      >
        Connect Wallet
      </button>
    )
  }

  // 연결된 상태에서는 OnchainKit UI 사용
  return (
    <div className="wallet-connected-container">
      {/* 체인 선택 드롭다운 */}
      <div className="chain-dropdown">
        <button 
          className="chain-dropdown-button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <img src="/base_logo.png" alt="Base" className="chain-logo" />
        </button>
        {isDropdownOpen && (
          <div className="chain-dropdown-menu">
          <button
            className={`chain-option ${chainId === base.id ? 'active' : ''}`}
            onClick={() => {
              switchChain({ chainId: base.id })
              setIsDropdownOpen(false)
            }}
          >
            <img src="/base_logo.png" alt="Base" className="chain-option-logo" />
            <span>Base</span>
          </button>
          <button
            className={`chain-option ${chainId === baseSepolia.id ? 'active' : ''}`}
            onClick={() => {
              switchChain({ chainId: baseSepolia.id })
              setIsDropdownOpen(false)
            }}
          >
            <img src="/base_logo.png" alt="Base Sepolia" className="chain-option-logo" />
            <span>Base Sepolia</span>
          </button>
          </div>
        )}
      </div>
      
      {/* 지갑 정보 */}
      <Wallet>
        <ConnectWallet>
          <Avatar address={address} className="h-6 w-6" />
          <Name address={address} />
        </ConnectWallet>
        <WalletDropdown>
          <Identity address={address} className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar address={address} />
            <Name address={address} />
            <Address address={address} className="text-gray-500" />
            <EthBalance address={address} />
          </Identity>
          
          <WalletDropdownBasename />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  )
}