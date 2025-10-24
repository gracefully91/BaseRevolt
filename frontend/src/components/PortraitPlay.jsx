import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoStream from './VideoStream';
import './PortraitPlay.css';

export default function PortraitPlay({ onRotate }) {
  const navigate = useNavigate();
  const [isDemo, setIsDemo] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [isStableConnected, setIsStableConnected] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5분

  // 타이머
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsDemo(false);
          // 타이머가 끝나면 홈으로 이동
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  // VideoStream에서 실제 연결 상태를 받는 핸들러
  const handleConnectionChange = (connected) => {
    setIsConnected(connected);
    if (connected) {
      setIsStableConnected(true);
    } else {
      setIsStableConnected(false);
    }
  };

  const handleBackHome = () => {
    navigate('/');
  };

  const handleRotate = () => {
    onRotate();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="portrait-play-container">
      {/* 상단바 */}
      <div className="portrait-header">
        <button className="back-button" onClick={handleBackHome}>
          ←Home
        </button>
        <div className="portrait-status-info">
          <div className={`timer ${timeLeft > 300 ? 'timer-blue' : timeLeft > 120 ? 'timer-yellow' : 'timer-red'}`}>
            ⏱️ {formatTime(timeLeft)}
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

      {/* 메인 콘텐츠 */}
      <div className="portrait-content">
        {/* 카메라 영상 (작은 프레임) */}
        <div className="portrait-video-container">
          <div className="portrait-video-frame">
            <VideoStream 
              onConnectionChange={handleConnectionChange}
              isDemo={isDemo}
            />
          </div>
          {/* 연결 상태와 라이브 스트림 정보 */}
          <div className="portrait-video-status-bar">
            <div className="portrait-connection-status">
              {isStableConnected ? (
                <>
                  <span className="blinking-dot">🟢</span> Connected
                </>
              ) : isConnected ? (
                '🟡 Stabilizing connection...'
              ) : (
                '🔴 Connecting...'
              )}
            </div>
            <div className="portrait-live-status">📹 Live Stream</div>
          </div>
        </div>

                {/* 조정 버튼들 (분리된 형태) */}
                <div className="portrait-controls">
                  {/* 왼쪽 - 위아래 버튼 */}
                  <div className="portrait-controls-left">
                    <button className="portrait-control-btn portrait-forward">
                      <span className="portrait-arrow-up">▲</span>
                    </button>
                    <button className="portrait-control-btn portrait-backward">
                      <span className="portrait-arrow-down">▼</span>
                    </button>
                  </div>
                  
                  {/* 오른쪽 - 좌우 버튼 */}
                  <div className="portrait-controls-right">
                    <button className="portrait-control-btn portrait-left">
                      <span className="portrait-arrow-left">◀</span>
                    </button>
                    <button className="portrait-control-btn portrait-right">
                      <span className="portrait-arrow-right">▶</span>
                    </button>
                  </div>
                </div>
      </div>

      {/* 연결 알림 */}
      {!isStableConnected && (
        <div className="portrait-connection-notice">
          <div className="portrait-connection-content">
            <div className="portrait-connection-icon">🔌</div>
            <div className="portrait-connection-text">
              {isConnected ? (
                <div>Stabilizing connection... Please wait 10 seconds</div>
              ) : (
                <>
                  <div>Please wait for RC car to connect...</div>
                  <div>Make sure the hardware is powered on and connected to WiFi</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
