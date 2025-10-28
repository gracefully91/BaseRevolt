import { useState, useEffect } from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { parseEther } from 'viem';
import { base, baseSepolia } from 'wagmi/chains';
import './PaymentModal.css';

export default function PaymentModal({ 
  open, 
  onClose, 
  onSuccess,
  contractAddress, // Recipient wallet address
  contractABI,
  ticketPrice,
  selectedVehicle = null
}) {
  const { address, isConnected, chain } = useAccount();
  const { sendTransaction, data: hash, error: writeError } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [status, setStatus] = useState('idle'); // idle, fetching, confirming, sending, waiting, done, error
  const [error, setError] = useState(null);
  const [ethPrice, setEthPrice] = useState(null);
  const [priceSource, setPriceSource] = useState('CoinGecko');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [usdAmount, setUsdAmount] = useState(0.01); // $0.01 for mainnet, $5 for testnet

  // Fetch ETH price from multiple sources
  const fetchEthPrice = async () => {
    const priceSources = [
      // 1. CoinGecko (Free, no API Key required)
      async () => {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
          { headers: { 'Accept': 'application/json' } }
        );
        if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
        const data = await response.json();
        return { price: data.ethereum.usd, source: 'CoinGecko' };
      },
      
      // 2. CryptoCompare (Free, no API Key required)
      async () => {
        const response = await fetch(
          'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD'
        );
        if (!response.ok) throw new Error(`CryptoCompare API error: ${response.status}`);
        const data = await response.json();
        return { price: data.USD, source: 'CryptoCompare' };
      },
      
      // 3. Fallback (Fixed value)
      async () => {
        return { price: 2500, source: 'Fallback' };
      }
    ];

    // Try each price source sequentially
    for (const source of priceSources) {
      try {
        const result = await source();
        if (result.price > 0) {
          setEthPrice(result.price);
          setPriceSource(result.source);
          setLastUpdate(Date.now());
          return result;
        }
      } catch (error) {
        console.warn(`Price source failed: ${error.message}`);
        continue;
      }
    }
    
    // Fallback if all sources fail
    setEthPrice(2500);
    setPriceSource('Fallback');
    setLastUpdate(Date.now());
  };

  // 30-second countdown timer
  useEffect(() => {
    if (!open || !ethPrice) return;

    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Refresh price when countdown ends
          fetchEthPrice();
          return 30; // Reset to 30 seconds
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [open, ethPrice]);

  // Step 1: Fetch ETH price (exchange rate check) + initial loading
  useEffect(() => {
    if (!open) {
      setStatus('idle');
      setError(null);
      setCountdown(30);
      return;
    }

    const initialFetch = async () => {
      setStatus('fetching');
      await fetchEthPrice();
      setStatus('idle');
      setCountdown(30); // Start countdown
    };

    initialFetch();
  }, [open]);

  // Step 2: Track transaction confirmation status
  useEffect(() => {
    if (isConfirming) {
      setStatus('waiting');
    }
    if (isConfirmed) {
      setStatus('done');
      setTimeout(() => {
        onSuccess?.(hash);
        onClose();
      }, 2000);
    }
  }, [isConfirming, isConfirmed, hash, onSuccess, onClose]);

  // Step 3: Error handling
  useEffect(() => {
    if (writeError) {
      if (writeError.message?.includes('User rejected') || 
          writeError.message?.includes('User denied')) {
        setError('Transaction canceled');
      } else {
        setError(writeError.message || 'Transaction failed');
      }
      setStatus('error');
    }
  }, [writeError]);

  // Execute payment
  const handlePay = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      setStatus('error');
      return;
    }

    // 현재 연결된 네트워크가 Base 또는 Base Sepolia인지 확인
    if (chain?.id !== base.id && chain?.id !== baseSepolia.id) {
      setError('Please switch to Base network or Base Sepolia testnet');
      setStatus('error');
      return;
    }

    try {
      setStatus('sending');
      setError(null);

      // Simple ETH transfer (without smart contract)
      await sendTransaction({
        to: contractAddress, // Recipient wallet address
        value: actualEthWei, // ETH amount based on actual exchange rate
      });

    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment failed');
      setStatus('error');
    }
  };

  if (!open) return null;

  // Calculate ETH amount dynamically based on actual exchange rate
  const isTestnet = chain?.id === baseSepolia.id;
  const usdTargetAmount = isTestnet ? 1.00 : 4.99; // $1 for testnet, $4.99 for mainnet
  const calculatedEthAmount = ethPrice ? (usdTargetAmount / ethPrice).toFixed(8) : (isTestnet ? '0.001' : '0.00000351');
  const calculatedUsd = ethPrice ? usdTargetAmount.toFixed(2) : (isTestnet ? '1.00' : '4.99');
  
  // Actual ETH amount to pay (converted to wei)
  const actualEthWei = ethPrice ? parseEther(calculatedEthAmount.toString()) : ticketPrice;

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <h3 className="payment-modal-title">💳 Confirm Purchase</h3>
        
        {/* Step 1: Exchange rate info */}
        <div className="payment-info-box">
          <div className="payment-info-row">
            <span className="payment-info-label">Payment Amount</span>
            <span className="payment-info-value">
              {calculatedEthAmount} ETH
              {status === 'fetching' && ' (Calculating...)'}
            </span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">USD Equivalent</span>
            <span className="payment-info-value">
              ${calculatedUsd}
            </span>
          </div>
          {ethPrice && (
            <div className="payment-info-note">
              <div>Current ETH Price: ${ethPrice.toLocaleString()}</div>
              <div className="price-source-row">
                <span>Price Source: {priceSource}</span>
                <span className="separator">•</span>
                {lastUpdate && (
                  <span>Last Update: {new Date(lastUpdate).toLocaleTimeString()}</span>
                )}
              </div>
              <div className="countdown-container">
                <span className="countdown-label">Next refresh in:</span>
                <span className={`countdown-timer ${countdown <= 5 ? 'warning' : ''}`}>
                  {countdown}s
                </span>
                {countdown <= 5 && (
                  <span className="countdown-warning">⚠️ Refreshing soon!</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Transaction details */}
        <div className="payment-details">
          {selectedVehicle && (
            <div className="payment-detail-item vehicle-info">
              <span className="detail-icon">🚗</span>
              <div className="vehicle-detail-content">
                <span className="detail-text">Vehicle: {selectedVehicle.name}</span>
                <span className="vehicle-status-badge">
                  {selectedVehicle.status === 'available' ? '🟢 Available' : 
                   selectedVehicle.status === 'busy' ? '🔴 In Use' : 
                   '🟡 Maintenance'}
                </span>
              </div>
            </div>
          )}
          <div className="payment-detail-item">
            <span className="detail-icon">🎫</span>
            <span className="detail-text">Play Time: 10 minutes</span>
          </div>
          <div className="payment-detail-item">
            <span className="detail-icon">🔗</span>
            <span className="detail-text">
              Network: {isTestnet ? 'Base Sepolia (Testnet)' : 'Base Mainnet'}
            </span>
          </div>
          <div className="payment-detail-item">
            <span className="detail-icon">👤</span>
            <span className="detail-text">Buyer: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Wallet not connected'}</span>
          </div>
        </div>

        {/* Step 3: Transaction status */}
        {hash && (
          <div className="tx-hash-box">
            <div className="tx-hash-label">Transaction Hash:</div>
            <a 
              href={isTestnet 
                ? `https://sepolia.basescan.org/tx/${hash}` 
                : `https://basescan.org/tx/${hash}`
              } 
              target="_blank" 
              rel="noopener noreferrer"
              className="tx-hash-link"
            >
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </a>
            <div className="tx-network-info">
              View on {isTestnet ? 'BaseScan Testnet' : 'BaseScan'}
            </div>
          </div>
        )}

        {error && (
          <div className="payment-error">
            ❌ {error}
          </div>
        )}

        {status === 'waiting' && (
          <div className="payment-status">
            ⏳ Confirming transaction... (max 1 minute)
          </div>
        )}

        {status === 'done' && (
          <div className="payment-success">
            ✅ Payment successful! Redirecting to play page...
          </div>
        )}

        <div className="payment-actions">
          <button 
            className="payment-btn payment-btn-cancel" 
            onClick={onClose} 
            disabled={status === 'sending' || status === 'waiting' || status === 'done'}
          >
            Cancel
          </button>
          
          {/* Skip Payment for Local Testing - Only show in development */}
          {process.env.NODE_ENV === 'development' && (
            <button
              className="payment-btn payment-btn-skip"
              onClick={() => {
                console.log('🚀 Skipping payment for local testing');
                onSuccess('0x0000000000000000000000000000000000000000000000000000000000000000');
              }}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                marginRight: '10px'
              }}
            >
              🚀 Skip Payment (Local Test)
            </button>
          )}
          
          <button
            className="payment-btn payment-btn-pay"
            onClick={handlePay}
            disabled={status === 'fetching' || status === 'sending' || status === 'waiting' || status === 'done' || !ethPrice}
          >
            {status === 'fetching' && 'Calculating rate...'}
            {status === 'idle' && '💰 Pay Now'}
            {status === 'sending' && 'Waiting for wallet...'}
            {status === 'waiting' && 'Confirming...'}
            {status === 'done' && 'Complete!'}
            {status === 'error' && 'Retry'}
          </button>
        </div>

        <p className="payment-note">
          * Exchange rate updates every 30 seconds
          <br />
          * Actual ETH amount sent varies based on exchange rate
        </p>
      </div>
    </div>
  );
}
