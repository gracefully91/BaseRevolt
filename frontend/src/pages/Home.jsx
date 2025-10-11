import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract } from 'wagmi';
import { TICKET_CONTRACT_ADDRESS, TICKET_CONTRACT_ABI } from '../config/contracts';
import PaymentModal from '../components/PaymentModal';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // 티켓 가격 조회
  const { data: ticketPrice } = useReadContract({
    address: TICKET_CONTRACT_ADDRESS,
    abi: TICKET_CONTRACT_ABI,
    functionName: 'ticketPrice',
  });

  const handleBuyTicket = () => {
    if (!isConnected) {
      alert('먼저 지갑을 연결해주세요!');
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = (txHash) => {
    console.log('결제 성공! TX:', txHash);
    navigate('/play');
  };

  const handleDemoPlay = () => {
    // 데모 모드로 바로 플레이 (결제 없이)
    navigate('/play?demo=true');
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="hero-section">
          <h1 className="title">🚗 Base Revolt</h1>
          <p className="subtitle">Web3와 현실을 연결하는 AR 게이밍 플랫폼</p>
          <p className="description">
            실제 RC카를 웹에서 원격 조종하고,<br />
            Base 블록체인으로 소유권을 증명하세요
          </p>
        </div>

        {isConnected && (
          <div className="ticket-section">
            <div className="ticket-card">
              <h2>🎫 플레이 티켓</h2>
              <div className="price">
                <span className="amount">$0.01</span>
                <span className="duration">/ 10분</span>
                <span className="test-badge">테스트</span>
              </div>
              
              <button 
                className="buy-button"
                onClick={handleBuyTicket}
              >
                💳 티켓 구매하기
              </button>
            </div>

            <div className="info-section">
              <h3>✨ 포함 사항</h3>
              <ul>
                <li>실시간 영상 스트리밍</li>
                <li>원격 RC카 조종 (10분)</li>
                <li>블록체인 소유권 증명</li>
              </ul>
            </div>
          </div>
        )}

        <div className="demo-section">
          <button className="demo-button" onClick={handleDemoPlay}>
            🎮 데모 체험하기 (무료)
          </button>
          <p className="demo-note">
            * 데모 모드는 제한된 기능만 제공됩니다
          </p>
        </div>

        <div className="features-section">
          <h2>🌟 주요 기능</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📹</div>
              <h3>실시간 영상</h3>
              <p>ESP32-CAM의 영상을 실시간으로 확인</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎮</div>
              <h3>원격 조종</h3>
              <p>키보드/터치로 RC카 완전 제어</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⛓️</div>
              <h3>Base 블록체인</h3>
              <p>모든 거래가 Base에 기록</p>
            </div>
          </div>
        </div>

        {/* 결제 모달 */}
        <PaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          contractAddress={TICKET_CONTRACT_ADDRESS}
          contractABI={TICKET_CONTRACT_ABI}
          ticketPrice={ticketPrice}
        />
      </div>
    </div>
  );
}

export default Home;

