import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { base, baseSepolia } from 'wagmi/chains';
import { TICKET_CONTRACT_ADDRESS, TICKET_CONTRACT_ABI } from '../config/contracts';
import PaymentModal from '../components/PaymentModal';
import VehicleSelectionModal from '../components/VehicleSelectionModal';
import WaitingQueueModal from '../components/WaitingQueueModal';
import QueueNotificationModal from '../components/QueueNotificationModal';
import { vehicleManager } from '../utils/vehicleData';
import './Home.css';

function Home() {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVehicleSelection, setShowVehicleSelection] = useState(false);
  const [showWaitingQueue, setShowWaitingQueue] = useState(false);
  const [showQueueNotification, setShowQueueNotification] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [currentUserId] = useState('user-' + Math.random().toString(36).substr(2, 9));
  const [currentUserName] = useState('User' + Math.floor(Math.random() * 1000));
  const [queueNotification, setQueueNotification] = useState(null);
  
  // 티켓 가격 조회
  const { data: ticketPrice } = useReadContract({
    address: TICKET_CONTRACT_ADDRESS,
    abi: TICKET_CONTRACT_ABI,
    functionName: 'ticketPrice',
  });

  // 네트워크에 따른 가격 계산
  const getTicketPrice = () => {
    if (chainId === baseSepolia.id) {
      return { amount: '$5.00', isTestnet: true };
    } else if (chainId === base.id) {
      return { amount: '$0.01', isTestnet: false };
    } else {
      return { amount: '$0.01', isTestnet: false }; // 기본값
    }
  };

  const priceInfo = getTicketPrice();

  // Quick Auth를 사용한 Farcaster 인증
  useEffect(() => {
    const authenticateUser = async () => {
      try {
        setIsLoading(true);
        console.log('🔄 Quick Auth 인증 시도 중...');
        
        // 저장된 토큰 확인
        const savedToken = localStorage.getItem('farcaster-token');
        const tokenExpiry = localStorage.getItem('farcaster-token-expiry');
        
        if (savedToken && tokenExpiry && new Date(tokenExpiry) > new Date()) {
          console.log('✅ 저장된 토큰이 유효함');
          setUser({ fid: 'authenticated', token: savedToken });
          return;
        }
        
        // Farcaster 환경인지 확인
        if (typeof window !== 'undefined' && window.farcaster) {
          // Quick Auth 토큰 가져오기
          const { token } = await sdk.quickAuth.getToken();
          console.log('✅ Quick Auth 토큰 획득:', token ? '성공' : '실패');
          
          if (token) {
            // 토큰을 일주일간 저장
            const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일
            localStorage.setItem('farcaster-token', token);
            localStorage.setItem('farcaster-token-expiry', expiryDate.toISOString());
            
            setUser({ fid: 'authenticated', token });
            console.log('✅ Farcaster 인증 성공 (7일간 유지)');
          } else {
            console.log('❌ Farcaster 인증 실패');
          }
        } else {
          console.log('⚠️ Farcaster 환경이 아님 - 일반 웹 브라우저에서 실행 중');
          // 일반 웹에서는 인증을 건너뛰고 바로 사용 가능하게 함
          setUser({ fid: 'web-user', isWebUser: true });
        }
      } catch (error) {
        console.log('❌ Quick Auth 에러:', error);
        console.log('⚠️ 일반 웹 브라우저에서 실행 중 - 인증 건너뛰기');
        // 에러가 발생하면 일반 웹 사용자로 처리
        setUser({ fid: 'web-user', isWebUser: true });
      } finally {
        setIsLoading(false);
      }
    };

    authenticateUser();
  }, []);

  // 디버깅: 인증 상태 확인
  console.log('Farcaster Auth:', { user, isLoading });
  
  // 디버깅: 지갑 연결 상태 확인
  console.log('Wallet Status:', { isConnected, chainId });

  const handleBuyTicket = () => {
    if (!isConnected) {
      alert('Please connect your wallet first!');
      return;
    }
    // 차량 선택 모달 열기
    setShowVehicleSelection(true);
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
    vehicleManager.selectVehicle(vehicle);
    
    // 차량이 사용 중이거나 대기열이 있는 경우 대기열 모달 표시
    if (vehicle.status === 'busy' || (vehicle.waitingQueue && vehicle.waitingQueue.length > 0)) {
      setShowWaitingQueue(true);
    } else {
      // 바로 사용 가능한 경우 결제 모달 열기
      setShowPaymentModal(true);
    }
  };

  const handleJoinQueue = (vehicleId, userId, userName) => {
    const success = vehicleManager.addToWaitingQueue(vehicleId, userId, userName);
    if (success) {
      alert(`✅ Joined the queue! You'll be notified when it's your turn.`);
      setShowWaitingQueue(false);
    } else {
      alert('❌ Failed to join the queue. Please try again.');
    }
  };

  const handleLeaveQueue = (vehicleId, userId) => {
    const success = vehicleManager.removeFromWaitingQueue(vehicleId, userId);
    if (success) {
      alert('✅ Left the queue successfully.');
    } else {
      alert('❌ Failed to leave the queue. Please try again.');
    }
  };

  const handleQueueClose = () => {
    setShowWaitingQueue(false);
  };

  const handleShowQueue = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowWaitingQueue(true);
  };

  const handleQueueNotificationAccept = () => {
    if (queueNotification) {
      // 대기열에서 제거하고 결제 페이지로 이동
      vehicleManager.removeFromWaitingQueue(selectedVehicle.id, currentUserId);
      setShowQueueNotification(false);
      setShowPaymentModal(true);
    }
  };

  const handleQueueNotificationDecline = () => {
    if (queueNotification) {
      // 대기열에서 제거
      vehicleManager.removeFromWaitingQueue(selectedVehicle.id, currentUserId);
      alert('❌ 대기열에서 제거되었습니다.');
      setShowQueueNotification(false);
    }
  };

  const handleQueueNotificationClose = () => {
    setShowQueueNotification(false);
    setQueueNotification(null);
  };

  const handlePaymentSuccess = (txHash) => {
    console.log('Payment successful! TX:', txHash);
    navigate('/play');
  };

  const handleDemoPlay = () => {
    // Demo mode - play without payment
    navigate('/play?demo=true');
  };

  const handleFarcasterLogout = () => {
    // 저장된 토큰 삭제
    localStorage.removeItem('farcaster-token');
    localStorage.removeItem('farcaster-token-expiry');
    
    // 사용자 상태 초기화
    setUser(null);
    
    console.log('✅ Farcaster 로그아웃 완료');
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="hero-section">
          <h1 className="title">🚗 Base Revolt</h1>
          <p className="subtitle">
            <span className="desktop-only">AR Gaming Platform Connecting Web3 and Reality</span>
            <span className="mobile-only">AR Gaming Platform<br />Connecting Web3 and Reality</span>
          </p>
          <p className="description">
            Control real RC cars remotely from the web,<br />
            Prove ownership with Base blockchain
          </p>
        </div>

        {isConnected && (
          <div className="ticket-section">
            <div className="ticket-card">
              <h2>🎫 Play Ticket</h2>
              <div className="price">
                <span className="amount">{priceInfo.amount}</span>
                <span className="duration">/ 10 min</span>
                {priceInfo.isTestnet && <span className="test-badge testnet">TESTNET</span>}
                {!priceInfo.isTestnet && <span className="test-badge mainnet">MAINNET</span>}
              </div>
              
               <div className="auth-button-container">
                 {isLoading ? (
                   <div className="loading-section">
                     <p className="loading-text">🔄 Farcaster 인증 중...</p>
                   </div>
                 ) : !user ? (
                   <div className="farcaster-login-section">
                     <button 
                       className="login-button"
                       onClick={async () => {
                         try {
                           console.log('🔄 Quick Auth 재시도...');
                           const { token } = await sdk.quickAuth.getToken();
                           if (token) {
                             // 토큰을 일주일간 저장
                             const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7일
                             localStorage.setItem('farcaster-token', token);
                             localStorage.setItem('farcaster-token-expiry', expiryDate.toISOString());
                             
                             setUser({ fid: 'authenticated', token });
                             console.log('✅ Farcaster 인증 성공 (7일간 유지)');
                           }
                         } catch (error) {
                           console.log('❌ Farcaster 인증 실패:', error);
                           console.log('⚠️ 일반 웹 브라우저에서는 Farcaster 인증이 불가능합니다');
                           alert('Farcaster 인증은 Farcaster 앱 내에서만 가능합니다.\n일반 웹 브라우저에서는 지갑 연결만으로 서비스를 이용할 수 있습니다.');
                           // 일반 웹 사용자로 처리
                           setUser({ fid: 'web-user', isWebUser: true });
                         }
                       }}
                     >
                       <img src="/farcaster.png" alt="Farcaster" className="farcaster-logo" />
                       Sign In with Farcaster
                     </button>
                   </div>
                 ) : (
                   <div className="authenticated-section">
                     <button 
                       className="buy-button"
                       onClick={handleBuyTicket}
                     >
                       💳 Buy Ticket
                     </button>
                   </div>
                 )}
               </div>
            </div>

            <div className="info-section">
              <h3>✨ What's Included</h3>
              <ul>
                <li>Real-time video streaming</li>
                <li>Remote RC car control (10 min)</li>
                <li>Blockchain ownership proof</li>
              </ul>
            </div>
          </div>
        )}

        <div className="demo-section">
          <button className="demo-button" onClick={handleDemoPlay}>
            🎮 Try Demo (Free)
          </button>
          <p className="demo-note">
            * Demo mode provides limited features
          </p>
        </div>

        <div className="features-section">
          <h2>🌟 Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📹</div>
              <h3>Real-time Video</h3>
              <p>Watch ESP32-CAM footage in real-time</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎮</div>
              <h3>Remote Control</h3>
              <p>Full RC car control via keyboard/touch</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⛓️</div>
              <h3>Base Blockchain</h3>
              <p>All transactions recorded on Base</p>
            </div>
          </div>
        </div>

        {/* Vehicle Selection Modal */}
        <VehicleSelectionModal
          open={showVehicleSelection}
          onClose={() => setShowVehicleSelection(false)}
          onVehicleSelect={handleVehicleSelect}
          onShowQueue={handleShowQueue}
          vehicles={vehicleManager.getAvailableVehicles()}
        />

        {/* Waiting Queue Modal */}
        <WaitingQueueModal
          open={showWaitingQueue}
          onClose={handleQueueClose}
          vehicle={selectedVehicle}
          userId={currentUserId}
          userName={currentUserName}
          onJoinQueue={handleJoinQueue}
          onLeaveQueue={handleLeaveQueue}
        />

        {/* Queue Notification Modal */}
        <QueueNotificationModal
          open={showQueueNotification}
          onClose={handleQueueNotificationClose}
          notification={queueNotification}
          onAccept={handleQueueNotificationAccept}
          onDecline={handleQueueNotificationDecline}
        />

        {/* Payment Modal */}
        <PaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
          contractAddress={TICKET_CONTRACT_ADDRESS}
          contractABI={TICKET_CONTRACT_ABI}
          ticketPrice={ticketPrice}
          selectedVehicle={selectedVehicle}
        />
        
        {/* Farcaster 로그아웃 버튼 */}
        {user && !user.isWebUser && (
          <div className="logout-section">
            <button 
              className="logout-button"
              onClick={handleFarcasterLogout}
            >
              🚪 Farcaster 로그아웃
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;

