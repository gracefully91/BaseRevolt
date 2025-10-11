import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { base } from 'wagmi/chains';
import './PaymentModal.css';

export default function PaymentModal({ 
  open, 
  onClose, 
  onSuccess,
  contractAddress,
  contractABI,
  ticketPrice 
}) {
  const { address, isConnected, chain } = useAccount();
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [status, setStatus] = useState('idle'); // idle, fetching, confirming, sending, waiting, done, error
  const [error, setError] = useState(null);
  const [ethPrice, setEthPrice] = useState(null);
  const [priceSource, setPriceSource] = useState('CoinGecko');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countdown, setCountdown] = useState(30);
  const [usdAmount, setUsdAmount] = useState(0.01); // $0.01

  // phrasepool2 스타일: 여러 가격 소스에서 ETH 가격 가져오기
  const fetchEthPrice = async () => {
    const priceSources = [
      // 1. CoinGecko (무료, API Key 불필요)
      async () => {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
          { headers: { 'Accept': 'application/json' } }
        );
        if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);
        const data = await response.json();
        return { price: data.ethereum.usd, source: 'CoinGecko' };
      },
      
      // 2. CryptoCompare (무료, API Key 불필요)
      async () => {
        const response = await fetch(
          'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD'
        );
        if (!response.ok) throw new Error(`CryptoCompare API error: ${response.status}`);
        const data = await response.json();
        return { price: data.USD, source: 'CryptoCompare' };
      },
      
      // 3. Fallback (고정값)
      async () => {
        return { price: 2500, source: 'Fallback' };
      }
    ];

    // 각 가격 소스를 순차적으로 시도
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
        console.warn(`가격 소스 실패: ${error.message}`);
        continue;
      }
    }
    
    // 모든 소스 실패 시 fallback
    setEthPrice(2500);
    setPriceSource('Fallback');
    setLastUpdate(Date.now());
  };

  // 30초 카운트다운 타이머
  useEffect(() => {
    if (!open || !ethPrice) return;

    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // 카운트다운이 끝나면 가격 갱신
          fetchEthPrice();
          return 30; // 30초로 리셋
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownTimer);
  }, [open, ethPrice]);

  // 1단계: ETH 가격 가져오기 (환율 체크) + 초기 로딩
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
      setCountdown(30); // 카운트다운 시작
    };

    initialFetch();
  }, [open]);

  // 2단계: 트랜잭션 확인 상태 추적
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

  // 3단계: 에러 처리
  useEffect(() => {
    if (writeError) {
      if (writeError.message?.includes('User rejected') || 
          writeError.message?.includes('User denied')) {
        setError('거래가 취소되었습니다.');
      } else {
        setError(writeError.message || '거래 실패');
      }
      setStatus('error');
    }
  }, [writeError]);

  // 결제 실행
  const handlePay = async () => {
    if (!isConnected) {
      setError('먼저 지갑을 연결해주세요.');
      setStatus('error');
      return;
    }

    if (chain?.id !== base.id) {
      setError('Base 네트워크로 전환해주세요.');
      setStatus('error');
      return;
    }

    try {
      setStatus('sending');
      setError(null);

      await writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'buyTicket',
        value: actualEthWei, // 실제 환율에 맞춘 ETH 금액
      });

    } catch (err) {
      console.error('결제 에러:', err);
      setError(err.message || '결제 실패');
      setStatus('error');
    }
  };

  if (!open) return null;

  // 실제 환율에 맞춰서 동적으로 ETH 금액 계산
  const usdTargetAmount = 0.01; // $0.01 목표
  const calculatedEthAmount = ethPrice ? (usdTargetAmount / ethPrice).toFixed(8) : '0.00000351';
  const calculatedUsd = ethPrice ? usdTargetAmount.toFixed(4) : '0.01';
  
  // 실제 결제할 ETH 금액 (wei로 변환)
  const actualEthWei = ethPrice ? parseEther(calculatedEthAmount.toString()) : ticketPrice;

  return (
    <div className="payment-modal-overlay">
      <div className="payment-modal">
        <h3 className="payment-modal-title">💳 티켓 구매 확인</h3>
        
        {/* 1단계: 환율 정보 */}
        <div className="payment-info-box">
          <div className="payment-info-row">
            <span className="payment-info-label">결제 금액</span>
            <span className="payment-info-value">
              {calculatedEthAmount} ETH
              {status === 'fetching' && ' (계산중...)'}
            </span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">USD 환산</span>
            <span className="payment-info-value">
              ${calculatedUsd}
            </span>
          </div>
          {ethPrice && (
            <div className="payment-info-note">
              <div>현재 ETH 가격: ${ethPrice.toLocaleString()}</div>
              <div>가격 소스: {priceSource}</div>
              {lastUpdate && (
                <div>
                  업데이트: {new Date(lastUpdate).toLocaleTimeString()}
                </div>
              )}
              <div className="countdown-container">
                <span className="countdown-label">다음 갱신까지:</span>
                <span className={`countdown-timer ${countdown <= 5 ? 'warning' : ''}`}>
                  {countdown}초
                </span>
                {countdown <= 5 && (
                  <span className="countdown-warning">⚠️ 곧 갱신됩니다!</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 2단계: 거래 내역 */}
        <div className="payment-details">
          <div className="payment-detail-item">
            <span className="detail-icon">🎫</span>
            <span className="detail-text">10분 플레이 시간</span>
          </div>
          <div className="payment-detail-item">
            <span className="detail-icon">📹</span>
            <span className="detail-text">실시간 영상 스트리밍</span>
          </div>
          <div className="payment-detail-item">
            <span className="detail-icon">🎮</span>
            <span className="detail-text">완전한 RC카 제어</span>
          </div>
        </div>

        {/* 3단계: 트랜잭션 상태 */}
        {hash && (
          <div className="tx-hash-box">
            <div className="tx-hash-label">트랜잭션 해시</div>
            <a 
              href={`https://basescan.org/tx/${hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-hash-link"
            >
              {hash.slice(0, 10)}...{hash.slice(-8)}
            </a>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="payment-error">
            ❌ {error}
          </div>
        )}

        {/* 성공 메시지 */}
        {status === 'done' && (
          <div className="payment-success">
            ✅ 결제가 완료되었습니다!
          </div>
        )}

        {/* 상태 메시지 */}
        {status === 'fetching' && (
          <div className="payment-status">
            ⏳ 환율 정보를 가져오는 중...
          </div>
        )}
        {status === 'sending' && (
          <div className="payment-status">
            📤 지갑 승인을 기다리는 중...
          </div>
        )}
        {status === 'waiting' && (
          <div className="payment-status">
            ⛓️ 블록체인 확인 중... (30초~1분 소요)
          </div>
        )}

        {/* 버튼 */}
        <div className="payment-actions">
          <button
            className="payment-btn payment-btn-cancel"
            onClick={onClose}
            disabled={status === 'sending' || status === 'waiting'}
          >
            취소
          </button>
          <button
            className="payment-btn payment-btn-pay"
            onClick={handlePay}
            disabled={
              status === 'fetching' || 
              status === 'sending' || 
              status === 'waiting' || 
              status === 'done'
            }
          >
            {status === 'idle' && '💰 결제하기'}
            {status === 'fetching' && '⏳ 준비중...'}
            {status === 'sending' && '📤 전송중...'}
            {status === 'waiting' && '⏳ 확인중...'}
            {status === 'done' && '✅ 완료'}
            {status === 'error' && '🔄 재시도'}
          </button>
        </div>

        <p className="payment-note">
          💡 결제 후 자동으로 플레이 페이지로 이동합니다
        </p>
      </div>
    </div>
  );
}

