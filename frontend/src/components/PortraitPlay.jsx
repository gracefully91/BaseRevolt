import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import VideoStream from './VideoStream';
import './PortraitPlay.css';

export default function PortraitPlay({ onRotate, isDemo, timeRemaining, sessionId, setSessionId, sessionTier }) {
  const navigate = useNavigate();
  const [isConnected, setIsConnected] = useState(false);
  const [isStableConnected, setIsStableConnected] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showConnectionNotice, setShowConnectionNotice] = useState(true);
  
  // 제어 명령 전송 함수 (VideoStream에서 설정됨)
  const sendCommandRef = useRef(null);

  // VideoStream에서 실제 연결 상태를 받는 핸들러
  const handleConnectionChange = (connected) => {
    setIsConnected(connected);
    if (connected) {
      setIsStableConnected(true);
      setShowConnectionNotice(false); // 연결되면 알림 숨김
    } else {
      setIsStableConnected(false);
      setShowConnectionNotice(true); // 연결 끊어지면 알림 표시
    }
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
    onRotate();
  };

  const handleConnectionNoticeClick = () => {
    setShowConnectionNotice(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="portrait-exit-modal-overlay">
          <div className="portrait-exit-modal">
            <div className="portrait-exit-modal-header">
              <h3>🚗 End Play Session?</h3>
            </div>
            <div className="portrait-exit-modal-content">
              <p>Are you sure you want to end your play session and return to home?</p>
              <div className="portrait-exit-modal-actions">
                <button className="portrait-exit-cancel-btn" onClick={handleCancelExit}>
                  Cancel
                </button>
                <button className="portrait-exit-confirm-btn" onClick={handleConfirmExit}>
                  End Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="portrait-play-container">
        {/* 상단바 */}
        <div className="portrait-header">
        <button className="back-button" onClick={handleBackHome}>
          ←Home
        </button>
        <div className="portrait-status-info">
          <div className={`timer ${timeRemaining > 300 ? 'timer-blue' : timeRemaining > 120 ? 'timer-yellow' : 'timer-red'}`}>
            ⏱️ {formatTime(timeRemaining)}
          </div>
          {isDemo && (
            <div className="demo-badge">
              🎮 Demo
            </div>
          )}
          <button className="rotate-button" onClick={handleRotate}>
            <img src="/rotate.png" alt="Rotate" className="rotate-icon" />
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
              showControls={false}
              onSendCommand={(fn) => { sendCommandRef.current = fn; }}
              sessionId={sessionId}
              setSessionId={setSessionId}
              sessionTier={sessionTier}
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
                    <button 
                      className="portrait-control-btn portrait-forward"
                      onMouseDown={() => sendCommandRef.current?.('forward')}
                      onMouseUp={() => sendCommandRef.current?.('stop')}
                      onMouseLeave={() => sendCommandRef.current?.('stop')}
                      onTouchStart={() => sendCommandRef.current?.('forward')}
                      onTouchEnd={() => sendCommandRef.current?.('stop')}
                    >
                      <span className="portrait-arrow-up">▲</span>
                    </button>
                    <button 
                      className="portrait-control-btn portrait-backward"
                      onMouseDown={() => sendCommandRef.current?.('backward')}
                      onMouseUp={() => sendCommandRef.current?.('stop')}
                      onMouseLeave={() => sendCommandRef.current?.('stop')}
                      onTouchStart={() => sendCommandRef.current?.('backward')}
                      onTouchEnd={() => sendCommandRef.current?.('stop')}
                    >
                      <span className="portrait-arrow-down">▼</span>
                    </button>
                  </div>
                  
                  {/* 오른쪽 - 좌우 버튼 */}
                  <div className="portrait-controls-right">
                    <button 
                      className="portrait-control-btn portrait-left"
                      onMouseDown={() => sendCommandRef.current?.('left')}
                      onMouseUp={() => sendCommandRef.current?.('stop')}
                      onMouseLeave={() => sendCommandRef.current?.('stop')}
                      onTouchStart={() => sendCommandRef.current?.('left')}
                      onTouchEnd={() => sendCommandRef.current?.('stop')}
                    >
                      <span className="portrait-arrow-left">◀</span>
                    </button>
                    <button 
                      className="portrait-control-btn portrait-right"
                      onMouseDown={() => sendCommandRef.current?.('right')}
                      onMouseUp={() => sendCommandRef.current?.('stop')}
                      onMouseLeave={() => sendCommandRef.current?.('stop')}
                      onTouchStart={() => sendCommandRef.current?.('right')}
                      onTouchEnd={() => sendCommandRef.current?.('stop')}
                    >
                      <span className="portrait-arrow-right">▶</span>
                    </button>
                  </div>
                </div>
      </div>

      {/* 연결 알림 */}
      {!isStableConnected && showConnectionNotice && (
        <div className="portrait-connection-notice" onClick={handleConnectionNoticeClick}>
          <div className="portrait-connection-content">
            <div className="portrait-connection-icon">🔌</div>
            <div className="portrait-connection-text">
              {isConnected ? (
                <div>Stabilizing connection... Please wait 3 seconds</div>
              ) : (
                <>
                  <div>Please wait for RC car to connect...</div>
                  <div>Make sure the hardware is powered on and connected to WiFi</div>
                </>
              )}
              <div className="portrait-notice-click">Tap to dismiss</div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
