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
  const [hasShared, setHasShared] = useState(false);
  const wsRef = useRef(null);
  const isConnectingRef = useRef(false);
  
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

  // 공유 상태 체크
  const checkShareStatus = () => {
    const sharedTime = localStorage.getItem('base-revolt-shared');
    if (sharedTime) {
      const dayInMs = 24 * 60 * 60 * 1000;
      const isWithin24Hours = Date.now() - parseInt(sharedTime) < dayInMs;
      setHasShared(isWithin24Hours);
    }
  };

  // 웹에서 Farcaster 공유 (PhrasePool 방식)
  const shareToFarcasterWeb = async () => {
    try {
      console.log('🔄 Farcaster 공유 시작 (PhrasePool 방식)...');
      
      // 미리 작성된 텍스트 (Universal Link 포함)
      const text = "🚙 Check out Base Revolt\n\nControl a real RC car from your mini app!\n\n- Base Revolt 🚗\n\nHere's the link :\nhttps://farcaster.xyz/miniapps/nSqoh1xZsxF3/base-revolt";
      const formattedText = text;
      
      // Farcaster compose URL (텍스트에 URL 포함)
      const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(formattedText)}`;
      
      console.log('🔗 Farcaster URL:', farcasterUrl);
      
      // SDK가 있으면 SDK 사용, 없으면 새 창으로 열기
      if (sdk && sdk.actions && sdk.actions.openUrl) {
        try {
          await sdk.actions.openUrl(farcasterUrl);
          console.log('✅ SDK로 Farcaster compose 창 열기 성공');
          
          // 공유 완료 상태 저장
          localStorage.setItem('base-revolt-shared', Date.now().toString());
          setHasShared(true);
        } catch (error) {
          console.log('⚠️ SDK openUrl 실패, 새 탭으로 열기:', error);
          window.open(farcasterUrl, '_blank');
        }
      } else {
        // SDK가 없으면 새 창으로 열기
        const farcasterWindow = window.open(farcasterUrl, 'farcaster-compose', 'width=600,height=700');
        
        if (farcasterWindow) {
          console.log('✅ Farcaster 창 열림');
          
          // 창이 닫히면 공유 완료로 간주
          const checkClosed = setInterval(() => {
            if (farcasterWindow.closed) {
              clearInterval(checkClosed);
              console.log('✅ Farcaster 창 닫힘 - 공유 완료로 간주');
              
              // 공유 완료 상태 저장
              localStorage.setItem('base-revolt-shared', Date.now().toString());
              setHasShared(true);
            }
          }, 1000);
        } else {
          console.log('❌ Farcaster 창 열기 실패');
          console.log('💡 팝업 차단이 활성화되어 있을 수 있습니다.');
        }
      }
      
    } catch (error) {
      console.error('Farcaster 공유 실패:', error);
      console.log('💡 Farcaster 공유에 실패했습니다.');
    }
  };

  // Farcaster API로 포스팅
  const postToFarcaster = async (accessToken) => {
    try {
      const response = await fetch('https://api.warpcast.com/v2/casts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: "🚗 Check out Base Revolt - Drive RC Car remotely!",
          embeds: [{
            url: window.location.origin,
            castId: null
          }]
        })
      });
      
      if (response.ok) {
        console.log('✅ Farcaster 포스트 성공');
      } else {
        console.error('❌ Farcaster 포스트 실패:', response.statusText);
      }
    } catch (error) {
      console.error('Farcaster API error:', error);
    }
  };

  // Farcaster 공유 기능 (환경별 분기)
  const shareToFarcaster = async () => {
    try {
      // Farcaster 환경인지 체크
      const isFarcasterEnv = typeof window !== 'undefined' && (
        window.farcaster || 
        window.location.href.includes('farcaster.xyz') ||
        window.location.href.includes('warpcast.com') ||
        window.location.href.includes('miniapp') ||
        navigator.userAgent.includes('Farcaster') ||
        (sdk && sdk.quickAuth) ||
        (sdk && typeof sdk.quickAuth === 'object')
      );
      
      console.log('🔍 공유 함수 환경 체크:', {
        isFarcasterEnv,
        sdkExists: !!sdk,
        sdkActions: !!sdk?.actions,
        sdkShare: !!sdk?.actions?.share
      });
      
      if (sdk && sdk.actions && sdk.actions.share) {
        // SDK가 있으면 SDK 사용 (앱/웹 모두)
        await sdk.actions.share({
          text: "🚗 Check out Base Revolt - Drive RC Car remotely!",
          url: window.location.origin,
        });
        
        localStorage.setItem('base-revolt-shared', Date.now().toString());
        setHasShared(true);
        console.log('✅ SDK 공유 성공');
      } else {
        // SDK share 함수가 없으면 OAuth 인증 후 API 포스팅 (웹)
        console.log('⚠️ SDK share 함수 없음 - OAuth 사용');
        await shareToFarcasterWeb();
      }
    } catch (error) {
      console.error('Share failed:', error);
      console.log('💡 공유에 실패했습니다.');
    }
  };

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
        
        // Farcaster 환경인지 확인 (여러 방법으로 체크)
        const isFarcasterEnv = typeof window !== 'undefined' && (
          window.farcaster || 
          window.location.href.includes('farcaster.xyz') ||
          window.location.href.includes('warpcast.com') ||
          window.location.href.includes('miniapp') ||
          navigator.userAgent.includes('Farcaster') ||
          // Farcaster SDK가 로드되어 있으면 Farcaster 환경으로 간주
          (sdk && sdk.quickAuth) ||
          // SDK가 존재하고 quickAuth가 있으면 Farcaster 환경
          (sdk && typeof sdk.quickAuth === 'object')
        );
        
        console.log('🔍 Farcaster 환경 체크:', {
          windowFarcaster: !!window.farcaster,
          url: window.location.href,
          userAgent: navigator.userAgent,
          isFarcasterEnv,
          sdkExists: !!sdk,
          sdkQuickAuth: !!sdk?.quickAuth,
          sdkActions: !!sdk?.actions,
          sdkShare: !!sdk?.actions?.share,
          sdkKeys: sdk ? Object.keys(sdk) : 'no sdk'
        });
        
        if (isFarcasterEnv) {
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
          {hasShared ? (
            <button className="demo-button" onClick={handleDemoPlay}>
              🎮 Play Demo (Available!)
            </button>
          ) : (
            <button className="demo-button" onClick={shareToFarcaster}>
              📤 Share to Farcaster
            </button>
          )}
          <p className="demo-note">
            {hasShared ? "* Demo mode provides limited features" : "* Share to unlock demo play"}
          </p>
          <p className="demo-description">
            Share once daily to get 5 minutes of demo play time
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
        
        {/* 하단 버튼 섹션 - Share 버튼과 Farcaster 로그아웃 버튼 */}
        <div className="bottom-buttons-section">
          {/* 작은 공유 버튼 - 항상 공유 버튼으로 유지 */}
          <button className="small-share-button" onClick={shareToFarcaster}>
            📤 Share
          </button>
          
          {/* Farcaster 로그아웃 버튼 */}
          {user && !user.isWebUser && (
            <button 
              className="logout-button"
              onClick={handleFarcasterLogout}
            >
              <img src="/farcaster.png" alt="Farcaster" className="farcaster-logo-small" />
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;

