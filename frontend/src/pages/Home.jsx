import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount, useReadContract } from 'wagmi';
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

  return (
    <div className="home-container">
      <div className="home-content">
        <div className="hero-section">
          <h1 className="title">🚗 Base Revolt</h1>
          <p className="subtitle">AR Gaming Platform Connecting Web3 and Reality</p>
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
                <span className="amount">$0.01</span>
                <span className="duration">/ 10 min</span>
                <span className="test-badge">TEST</span>
              </div>
              
              <button 
                className="buy-button"
                onClick={handleBuyTicket}
              >
                💳 Buy Ticket
              </button>
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
      </div>
    </div>
  );
}

export default Home;

