import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import VideoStream from '../components/VideoStream';
import Controller from '../components/Controller';
import './Play.css';

function Play() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnected } = useAccount();
  
  const isDemo = searchParams.get('demo') === 'true';
  
  // 타이머 (10분 = 600초)
  const [timeRemaining, setTimeRemaining] = useState(600);
  const [isActive, setIsActive] = useState(false);
  
  // RC카 연결 상태
  const [rcCarConnected, setRcCarConnected] = useState(false);
  
  useEffect(() => {
    // 데모가 아니고 지갑도 연결 안 되어 있으면 홈으로
    if (!isDemo && !isConnected) {
      navigate('/');
      return;
    }
    
    // 타이머 시작
    setIsActive(true);
  }, [isDemo, isConnected, navigate]);
  
  // 타이머 로직
  useEffect(() => {
    let interval = null;
    
    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsActive(false);
            alert('⏰ 플레이 시간이 종료되었습니다!');
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
    if (confirm('플레이를 종료하고 홈으로 돌아가시겠습니까?')) {
      navigate('/');
    }
  };
  
  return (
    <div className="play-container">
      {/* 헤더 */}
      <div className="play-header">
        <button className="back-button" onClick={handleBackHome}>
          ← 홈으로
        </button>
        
        <div className="status-bar">
          <div className={`rc-status ${rcCarConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {rcCarConnected ? 'RC카 연결됨' : 'RC카 연결 대기중'}
          </div>
          
          <div className="timer">
            <span className="timer-icon">⏱️</span>
            <span className="timer-text">{formatTime(timeRemaining)}</span>
          </div>
          
          {isDemo && (
            <div className="demo-badge">
              🎮 데모 모드
            </div>
          )}
        </div>
      </div>
      
      {/* 메인 컨텐츠 */}
      <div className="play-content">
        {/* 영상 스트림 */}
        <div className="video-section">
          <VideoStream 
            onConnectionChange={setRcCarConnected}
            isDemo={isDemo}
          />
        </div>
        
        {/* 컨트롤러 */}
        <div className="controller-section">
          <Controller 
            rcCarConnected={rcCarConnected}
            isDemo={isDemo}
          />
        </div>
      </div>
      
      {/* 안내 메시지 */}
      {!rcCarConnected && (
        <div className="connection-notice">
          <p>🔌 RC카가 연결될 때까지 기다려주세요...</p>
          <p className="notice-sub">하드웨어가 켜져있고 WiFi에 연결되어 있는지 확인하세요</p>
        </div>
      )}
    </div>
  );
}

export default Play;

