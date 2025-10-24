import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import VideoStream from '../components/VideoStream';
import Controller from '../components/Controller';
import PortraitPlay from '../components/PortraitPlay';
import Header from '../components/Header';
import './Play.css';

function Play() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnected } = useAccount();
  
  const isDemo = searchParams.get('demo') === 'true';
  const [isLandscape, setIsLandscape] = useState(false);
  const [showPortrait, setShowPortrait] = useState(false);
  
  // 타이머 (10분 = 600초)
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [isActive, setIsActive] = useState(false);
  
  // RC카 연결 상태
  const [rcCarConnected, setRcCarConnected] = useState(false);
  const [isStableConnected, setIsStableConnected] = useState(false);
  
  useEffect(() => {
    // If not demo and wallet not connected, redirect to home
    if (!isDemo && !isConnected) {
      navigate('/');
      return;
    }
    
    // Start timer
    setIsActive(true);
    
    // Demo 모드에서도 실제 연결 상태를 확인 (시뮬레이션 제거)
    // VideoStream 컴포넌트에서 실제 연결 상태를 받아서 표시
  }, [isDemo, isConnected, navigate]);

  // VideoStream에서 실제 연결 상태를 받는 핸들러
  const handleConnectionChange = (connected) => {
    setRcCarConnected(connected);
    if (connected) {
      setIsStableConnected(true);
    } else {
      setIsStableConnected(false);
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
    if (confirm('End play session and return to home?')) {
      navigate('/');
    }
  };

  const handleRotate = () => {
    setShowPortrait(!showPortrait);
  };
  
  // 세로화면 모드일 때 PortraitPlay 컴포넌트 렌더링
  if (showPortrait) {
    return (
      <>
        <Header />
        <PortraitPlay onRotate={handleRotate} />
      </>
    );
  }

  return (
    <div className={`play-container ${isLandscape ? 'landscape' : 'portrait'}`}>
      {/* Full Screen Video */}
      <div className="video-fullscreen">
        <VideoStream 
          onConnectionChange={handleConnectionChange}
          isDemo={isDemo}
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
              {isStableConnected ? 'RC Car Connected' : rcCarConnected ? 'Stabilizing Connection...' : 'Waiting for RC Car'}
            </div>
            
            <div className={`timer ${timeRemaining > 300 ? 'timer-blue' : timeRemaining > 120 ? 'timer-yellow' : 'timer-red'}`}>
              <span className="timer-icon">⏱️</span>
              <span className="timer-text">{formatTime(timeRemaining)}</span>
            </div>
            
            {isDemo && (
              <div className="demo-badge">
                🎮 Demo Mode
              </div>
            )}
            
            <button className="rotate-button" onClick={handleRotate}>
              <img src="../../asset/rotate.png" alt="Rotate" className="rotate-icon" />
            </button>
          </div>
        </div>
        
        {/* Left Side - Forward/Backward Controls (세로) */}
        <div className="overlay-controls-left">
          <div className="control-group-vertical">
            <button className="control-btn forward-btn">
              <span className="arrow-up">▲</span>
            </button>
            <button className="control-btn backward-btn">
              <span className="arrow-down">▼</span>
            </button>
          </div>
        </div>
        
        {/* Right Side - Left/Right Controls (가로) */}
        <div className="overlay-controls-right">
          <div className="control-group-horizontal">
            <button className="control-btn left-btn">
              <span className="arrow-left">◀</span>
            </button>
            <button className="control-btn right-btn">
              <span className="arrow-right">▶</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Connection Notice */}
      {(!rcCarConnected || isDemo) && (
        <div className="connection-notice">
          <p>🔌 Please wait for RC car to connect...</p>
          <p className="notice-sub">Make sure the hardware is powered on and connected to WiFi</p>
        </div>
      )}
    </div>
  );
}

export default Play;

