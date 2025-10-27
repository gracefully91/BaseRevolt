import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import VideoStream from '../components/VideoStream';
import PortraitPlay from '../components/PortraitPlay';
import Header from '../components/Header';
import './Play.css';

// Wallet 주소를 전역으로 저장 (VideoStream에서 사용)
let globalWalletAddress = null;

// 관리자 지갑 주소
const ADMIN_WALLET = '0xd10d3381C1e824143D22350e9149413310F14F22';

// 관리자 체크 함수
const isAdmin = (wallet) => {
  return wallet && wallet.toLowerCase() === ADMIN_WALLET.toLowerCase();
};

function Play() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnected, address } = useAccount();
  
  // Wallet 주소 저장
  if (address) {
    globalWalletAddress = address;
  }
  
  const isDemo = searchParams.get('demo') === 'true';
  const [isLandscape, setIsLandscape] = useState(false);
  const [showPortrait, setShowPortrait] = useState(false);
  
  // 관리자 상태
  const [isAdminUser, setIsAdminUser] = useState(false);
  
  // 타이머 (10분 = 600초, 데모는 5분 = 300초, 관리자 데모는 무제한)
  const [timeRemaining, setTimeRemaining] = useState(
    isDemo ? (isAdminUser ? 999999 : 300) : 600
  );
  const [isActive, setIsActive] = useState(false);
  
  // 세션 관리
  const [sessionId, setSessionId] = useState(null);
  const [sessionTier, setSessionTier] = useState(isDemo ? 'demo' : 'paid');
  
  // 고정된 wallet ID 생성 (화면 회전 시에도 유지)
  const walletIdRef = useRef(null);
  if (!walletIdRef.current) {
    // 데모 모드에서는 브라우저별 고정 ID 사용 (localStorage 활용)
    if (isDemo) {
      let demoId = localStorage.getItem('base-revolt-demo-id');
      if (!demoId) {
        demoId = 'demo-user-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('base-revolt-demo-id', demoId);
      }
      walletIdRef.current = demoId;
    } else {
      walletIdRef.current = address || 'anonymous-' + Math.random().toString(36).substr(2, 9);
    }
  }
  
  // RC카 연결 상태
  const [rcCarConnected, setRcCarConnected] = useState(false);
  const [isStableConnected, setIsStableConnected] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showConnectionNotice, setShowConnectionNotice] = useState(true);
  
  // 제어 명령 전송 함수 (VideoStream에서 설정됨)
  const sendCommandRef = useRef(null);
  
  useEffect(() => {
    // 관리자 체크
    const adminCheck = isAdmin(address);
    setIsAdminUser(adminCheck);
    
    if (adminCheck) {
      console.log('👑 Admin user detected - unlimited access granted');
    }
    
    // If not demo and wallet not connected, redirect to home
    if (!isDemo && !isConnected) {
      navigate('/');
      return;
    }
    
    // Start timer
    setIsActive(true);
    
    // Demo 모드에서도 실제 연결 상태를 확인 (시뮬레이션 제거)
    // VideoStream 컴포넌트에서 실제 연결 상태를 받아서 표시
  }, [isDemo, isConnected, navigate, address]);

  // 관리자 상태 변경 시 타이머 업데이트
  useEffect(() => {
    if (isDemo && isAdminUser) {
      setTimeRemaining(999999); // 무제한
      console.log('👑 Admin timer set to unlimited');
    } else if (isDemo && !isAdminUser) {
      setTimeRemaining(300); // 5분
    } else {
      setTimeRemaining(600); // 10분
    }
  }, [isAdminUser, isDemo]);

  // VideoStream에서 실제 연결 상태를 받는 핸들러
  const handleConnectionChange = (connected) => {
    setRcCarConnected(connected);
    if (connected) {
      setIsStableConnected(true);
      setShowConnectionNotice(false); // 연결되면 알림 숨김
    } else {
      setIsStableConnected(false);
      setShowConnectionNotice(true); // 연결 끊어지면 알림 표시
    }
  };
  
  // Timer logic
  useEffect(() => {
    let interval = null;
    
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsActive(false);
            alert('⏰ Play time has ended!');
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining, navigate]);
  
  // 시간 포맷팅 (MM:SS)
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleBackHome = () => {
    setShowExitModal(true);
  };

  const handleConfirmExit = () => {
    setShowExitModal(false);
    // 파캐스터/모바일 환경에서 명확한 피드백
    if (navigator.userAgent.includes('Farcaster') || navigator.userAgent.includes('Mobile')) {
      alert('✅ Play session ended. Returning to home...');
    }
    navigate('/');
  };

  const handleCancelExit = () => {
    setShowExitModal(false);
  };

  const handleRotate = () => {
    setShowPortrait(!showPortrait);
  };

  const handleConnectionNoticeClick = () => {
    setShowConnectionNotice(false);
  };
  
  // 세로화면 모드일 때 PortraitPlay 컴포넌트 렌더링
  if (showPortrait) {
    return (
      <>
        <Header />
        <PortraitPlay 
          onRotate={handleRotate} 
          isDemo={isDemo}
          timeRemaining={timeRemaining}
          sessionId={sessionId}
          setSessionId={setSessionId}
          sessionTier={sessionTier}
          walletId={walletIdRef.current}
        />
      </>
    );
  }

  return (
    <>
      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="exit-modal-overlay">
          <div className="exit-modal">
            <div className="exit-modal-header">
              <h3>🚗 End Play Session?</h3>
            </div>
            <div className="exit-modal-content">
              <p>Are you sure you want to end your play session and return to home?</p>
              <div className="exit-modal-actions">
                <button className="exit-cancel-btn" onClick={handleCancelExit}>
                  Cancel
                </button>
                <button className="exit-confirm-btn" onClick={handleConfirmExit}>
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`play-container ${isLandscape ? 'landscape' : 'portrait'}`}>
        {/* Full Screen Video */}
        <div className="video-fullscreen">
          <VideoStream 
            onConnectionChange={handleConnectionChange}
            isDemo={isDemo}
            onSendCommand={(fn) => { sendCommandRef.current = fn; }}
            showControls={!showPortrait}
            sessionId={sessionId}
            setSessionId={setSessionId}
            sessionTier={sessionTier}
            walletId={walletIdRef.current}
          />
        </div>
      
      {/* Transparent Overlay Controls */}
      <div className="play-overlay">
        {/* Top Status Bar */}
        <div className="overlay-status-bar">
          <button className="back-button" onClick={handleBackHome}>
            ←Home
          </button>
          
          <div className="status-info">
            <div className={`rc-status ${isStableConnected ? 'connected' : rcCarConnected ? 'stabilizing' : 'disconnected'}`}>
              <span className="status-dot"></span>
              {isStableConnected ? 'RC Car Ready' : rcCarConnected ? 'Connecting...' : 'Waiting for RC Car'}
            </div>
            
            <div className={`timer ${timeRemaining > 300 ? 'timer-blue' : timeRemaining > 120 ? 'timer-yellow' : 'timer-red'}`}>
              <span className="timer-icon">⏱️</span>
              <span className="timer-text">{formatTime(timeRemaining)}</span>
            </div>
            
            {isDemo && (
              <div className={`demo-badge ${isAdminUser ? 'admin-badge' : ''}`}>
                {isAdminUser ? '👑 Admin Demo' : '🎮 Demo Mode'}
              </div>
            )}
            
            <button className="rotate-button" onClick={handleRotate}>
              <img src="/rotate.png" alt="Rotate" className="rotate-icon" />
            </button>
          </div>
        </div>
        
        {/* Control Buttons - Integrated in VideoStream */}
      </div>
      
      {/* Connection Notice - 더 관대한 조건 */}
      {(!rcCarConnected && !isDemo && showConnectionNotice) && (
        <div className="connection-notice" onClick={handleConnectionNoticeClick}>
          <p>🔌 Please wait for RC car to connect...</p>
          <p className="notice-sub">Make sure the hardware is powered on and connected to WiFi</p>
          <p className="notice-click">Click to dismiss</p>
        </div>
      )}
      </div>
    </>
  );
}

export default Play;

