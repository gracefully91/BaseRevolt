import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { base, baseSepolia } from 'wagmi/chains';
import { TICKET_CONTRACT_ADDRESS, TICKET_CONTRACT_ABI, WS_SERVER_URL } from '../config/contracts';
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
  const [queueStatus, setQueueStatus] = useState(null);
  const wsRef = useRef(null);
  const isConnectingRef = useRef(false);
  
  // 공유 관련 상태
  const [hasSharedToday, setHasSharedToday] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // 티켓 가격 조회
  const { data: ticketPrice } = useReadContract({
    address: TICKET_CONTRACT_ADDRESS,
    abi: TICKET_CONTRACT_ABI,
    functionName: 'ticketPrice',
  });

  // 네트워크에 따른 가격 계산
  const getTicketPrice = () => {
    if (chainId === baseSepolia.id) {
      return { amount: '$1.00', isTestnet: true };
    } else if (chainId === base.id) {
      return { amount: '$4.99', isTestnet: false };
    } else {
      return { amount: '$4.99', isTestnet: false }; // 기본값
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

  // 공유 상태 체크
  useEffect(() => {
    const checkShareStatus = () => {
      const today = new Date().toDateString();
      const lastShareDate = localStorage.getItem('base-revolt-last-share');
      const sharedToday = lastShareDate === today;
      setHasSharedToday(sharedToday);
    };
    
    checkShareStatus();
  }, []);

  // 디버깅: 인증 상태 확인 (필요시만)
  // console.log('Farcaster Auth:', { user, isLoading });
  // console.log('Wallet Status:', { isConnected, chainId });

  // Vehicle Selection 모달이 열릴 때만 WebSocket 연결
  useEffect(() => {
    if (!showVehicleSelection) {
      // 모달이 닫히면 연결 정리
      if (wsRef.current) {
        console.log('🧹 Closing WebSocket connection (modal closed)');
        wsRef.current.close();
        wsRef.current = null;
        isConnectingRef.current = false;
      }
      return;
    }

    // 이미 연결 시도했거나 연결 중이면 재시도 안 함
    if (isConnectingRef.current) {
      console.log('⏳ WebSocket connection already attempted');
      return;
    }
    
    if (wsRef.current) {
      console.log('✅ WebSocket connection already attempted');
      return;
    }

    isConnectingRef.current = true;
    console.log('🔌 Connecting to WebSocket for queue status...');
    
    try {
      const ws = new WebSocket(WS_SERVER_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ WebSocket connected for queue status');
        isConnectingRef.current = false;
        // 대기열 상태 요청
        ws.send(JSON.stringify({
          type: 'getQueueStatus',
          carId: 'car01'
        }));
      };

      ws.onmessage = (event) => {
        // 바이너리 데이터(비디오 프레임)는 무시
        if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
          return;
        }
        
        try {
          const data = JSON.parse(event.data);
          
          // 대기열 상태 업데이트
          if (data.type === 'queueStatus' || data.type === 'queueUpdate') {
            console.log('📊 Queue status received:', data.status);
            setQueueStatus(data.status);
            
            // vehicleManager 업데이트
            updateVehicleFromQueueStatus(data.status);
          }
        } catch (e) {
          console.error('Error parsing queue message:', e);
        }
      };

      ws.onclose = () => {
        console.log('❌ WebSocket disconnected');
        wsRef.current = null;
        isConnectingRef.current = false;
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket connection failed');
        isConnectingRef.current = false;
        // 서버가 꺼져있으면 연결하지 않음
        ws.close();
      };
    } catch (error) {
      console.error('❌ WebSocket connection error:', error);
      isConnectingRef.current = false;
    }
  }, [showVehicleSelection]);

  // 서버 대기열 상태로 차량 정보 업데이트
  const updateVehicleFromQueueStatus = (status) => {
    const vehicle = vehicleManager.getVehicleById('car-001');
    if (!vehicle) return;

    // 현재 사용자 정보 업데이트
    if (status.currentUser) {
      vehicle.currentUser = {
        name: status.currentUser.wallet,
        tier: status.currentUser.tier
      };
      vehicle.status = 'busy';
    } else {
      vehicle.currentUser = null;
      vehicle.status = 'available';
    }

    // 대기열 정보 업데이트
    vehicle.waitingQueue = status.queue.map(item => ({
      id: item.wallet,
      walletAddress: item.wallet,
      name: item.wallet,
      queuePosition: item.position,
      estimatedWaitTime: item.estimatedWaitTime,
      tier: item.tier
    }));

    vehicle.estimatedWaitTime = status.queue.length > 0 
      ? status.queue[0].estimatedWaitTime 
      : 0;
  };

  // 새로고침 함수
  const refreshQueueStatus = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('🔄 Requesting queue status refresh...');
      wsRef.current.send(JSON.stringify({
        type: 'getQueueStatus',
        carId: 'car01'
      }));
    }
  };

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

  // OG 이미지 생성 함수
  const generateOGImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    
    // 배경 그라데이션
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);
    
    // 제목
    ctx.fillStyle = 'white';
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Base Revolt', 600, 200);
    
    // 부제목
    ctx.font = '36px Arial';
    ctx.fillText('Remote Control RC Car on Base Blockchain', 600, 280);
    
    // 특징들
    ctx.font = '28px Arial';
    ctx.fillText('🎮 Real-time Control  📹 Live Video  ⛓️ Blockchain', 600, 350);
    
    // 가격 정보
    ctx.font = 'bold 48px Arial';
    ctx.fillText(priceInfo.amount, 600, 450);
    
    // 네트워크 배지
    ctx.fillStyle = priceInfo.isTestnet ? '#ff9800' : '#0052ff';
    ctx.fillRect(500, 480, 200, 40);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(priceInfo.isTestnet ? 'TESTNET' : 'MAINNET', 600, 505);
    
    return canvas.toDataURL('image/png');
  };

  // 공유 함수
  const handleShare = async () => {
    if (hasSharedToday) {
      // 이미 공유했으면 데모 플레이
      navigate('/play?demo=true');
      return;
    }
    
    setIsSharing(true);
    
    try {
      // preview.png를 기본 이미지로 사용
      let shareImage = '/preview.png';
      
      // Farcaster 환경에서는 동적 OG 이미지도 함께 사용
      if (typeof window !== 'undefined' && window.farcaster) {
        const ogImage = generateOGImage();
        
        // 첫 번째 공유: 동적 OG 이미지
        await sdk.actions.share({
          text: `🎮 Check out Base Revolt! Control a real RC car remotely on Base blockchain!\n\n✨ Features:\n• Real-time video streaming\n• Remote RC car control\n• Blockchain ownership proof\n\nTry it now: ${window.location.origin}`,
          image: ogImage
        });
        
        // 두 번째 공유: preview.png
        await sdk.actions.share({
          text: `🎮 Base Revolt - Remote Control RC Car on Base Blockchain!\n\nTry it now: ${window.location.origin}`,
          image: shareImage
        });
      } else {
        // 일반 웹에서 Web Share API 사용
        const shareData = {
          title: 'Base Revolt - Remote Control RC Car',
          text: '🎮 Control a real RC car remotely on Base blockchain! Real-time video streaming and blockchain ownership proof.',
          url: window.location.origin,
          image: shareImage
        };
        
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          // 폴백: URL 복사
          await navigator.clipboard.writeText(window.location.origin);
          alert('🔗 URL copied to clipboard! Share it with your friends!');
        }
      }
      
      // 공유 완료 처리
      const today = new Date().toDateString();
      localStorage.setItem('base-revolt-last-share', today);
      setHasSharedToday(true);
      
      // 잠시 후 데모 플레이로 이동
      setTimeout(() => {
        navigate('/play?demo=true');
      }, 1000);
      
    } catch (error) {
      console.error('Share error:', error);
      // 에러가 발생해도 데모 플레이 허용
      navigate('/play?demo=true');
    } finally {
      setIsSharing(false);
    }
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
                {!priceInfo.isTestnet && <span className="test-badge base">BASE</span>}
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
          <button 
            className={`demo-button ${hasSharedToday ? 'demo-play-button' : 'share-button'}`} 
            onClick={hasSharedToday ? handleDemoPlay : handleShare}
            disabled={isSharing}
          >
            {isSharing ? '🔄 Sharing...' : 
             hasSharedToday ? '🎮 Try Demo (Free)' : 
             '📤 Share to Play Demo'}
          </button>
          <p className="demo-note">
            {hasSharedToday ? 
              '* Demo mode provides limited features' : 
              '* Share once to unlock free demo play'}
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
          vehicles={vehicleManager.getVehicles()}
          onRefresh={async () => {
            // 서버에서 실시간 대기열 상태 가져오기
            await refreshQueueStatus();
            // 잠시 대기 후 UI 업데이트
            return new Promise(resolve => {
              setTimeout(() => {
                setShowVehicleSelection(false);
                setTimeout(() => {
                  setShowVehicleSelection(true);
                  resolve();
                }, 0);
              }, 500);
            });
          }}
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

