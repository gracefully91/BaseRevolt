import { Link } from 'react-router-dom';
import WalletConnectButton from './WalletConnectButton';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header-container">
        {/* 로고 */}
        <Link to="/" className="logo">
          <span className="logo-icon">🚙</span>
          <span className="logo-text">Base Revolt</span>
        </Link>

        {/* 체인 선택 + 지갑 버튼 */}
        <div className="header-right">
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}

