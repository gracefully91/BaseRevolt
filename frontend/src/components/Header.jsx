import { Link } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">🚗</span>
          <span className="logo-text">Base Revolt</span>
        </Link>

        <nav className="nav">
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}

