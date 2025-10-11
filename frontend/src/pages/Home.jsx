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
      alert('Please connect your wallet first!');
      return;
    }
    setShowPaymentModal(true);
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

        {/* Payment Modal */}
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

