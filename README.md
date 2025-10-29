# 🚗 Base Revolt

> **AR Gaming Platform Connecting Web3 and Reality**

Base Revolt is a full-stack Web3 application that enables real-time remote control of physical RC cars via web browser, powered by Base blockchain for payment processing and ownership verification.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue)](https://base-revolt.vercel.app)
[![Base Network](https://img.shields.io/badge/Network-Base-blue)](https://base.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-Open%20Source-green)](https://github.com/gracefully91/BaseRevolt)

---

## 📹 Demo Video

**🎬 Watch the complete demo:** [YouTube Video](https://youtube.com/watch?v=YOUR_VIDEO_ID) *(Add your video link here)*

Video includes:
- Project introduction and problem statement
- Architecture overview
- Live demonstration of full user flow
- Technical highlights and innovation showcase

---

## ✅ Proof of Deployment (Base Testnet)

**Quick Reference:**
- **Network:** Base Sepolia (testnet)
- **Tx Hash:** [`0x8cdf57d3...b62aa8`](https://sepolia.basescan.org/tx/0x8cdf57d3296911edbc9631871f961cc5b2d23213d1db2033af502fcd98b62aa8)
- **Status:** ✅ Success · **Block:** 32801960
- **Full Details:** See [Hackathon Submission](#-hackathon-submission) section below

---

## 🎯 Overview

Base Revolt transforms onchain ownership into real-world motion. Users connect their Base wallet, purchase play tickets with crypto, and control actual RC cars with live video streaming - all through a web browser.

### Key Features

- 🎮 **Real-time RC Car Control** - WASD/Arrow keys or touch controls
- 📹 **Live Video Streaming** - ESP32-CAM 15 FPS video feed
- 💰 **Base Blockchain Payment** - $0.01 mainnet / $5.00 testnet tickets
- 🔗 **Farcaster Integration** - Social + Onchain login experience
- 📱 **Cross-platform** - Desktop, mobile, portrait/landscape modes
- ⛓️ **Multi-network Support** - Base Mainnet & Base Sepolia testnet
- 🎨 **Farcaster Mini App** - Integrated as a Frame mini app

---

## 📋 Table of Contents

1. [Architecture](#architecture)
2. [Technology Stack](#technology-stack)
3. [Quick Start](#quick-start)
4. [Deployment Guide](#deployment-guide)
5. [Features](#features)
6. [Roadmap](#roadmap)

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Web Browser   │ ← User Interface (React + Wagmi + RainbowKit)
└────────┬────────┘
         │ WebSocket
┌────────▼────────┐
│  Node.js Server │ ← WebSocket Relay (Render.com)
└────────┬────────┘
         │ WebSocket
┌────────▼────────┐
│   ESP32-CAM     │ ← RC Car Hardware (Real Device)
│   + L298N       │
│   + DC Motors   │
└─────────────────┘

┌─────────────────┐
│  Base Network   │ ← Payment & Ownership
│  Smart Contract │
└─────────────────┘
```

### Project Structure

```
Base Revolt/
├── hardware/              # ESP32-CAM firmware (Arduino)
│   ├── esp32_rc_car.ino  # Main firmware code
│   └── README.md
├── server/               # WebSocket relay server (Node.js)
│   ├── index.js
│   ├── package.json
│   └── render.yaml       # Render deployment config
├── contracts/            # Smart contracts (Solidity)
│   ├── TicketSale.sol
│   └── README.md
└── frontend/             # React web application
    ├── src/
    │   ├── pages/
    │   ├── components/
    │   └── config/
    ├── public/
    │   ├── manifest.json  # Farcaster mini app manifest
    │   └── icon.png
    ├── package.json
    └── vite.config.js
```

---

## 🛠️ Technology Stack

### Hardware
- **ESP32-CAM** - Video streaming & WiFi communication
- **L298N Motor Driver** - DC motor control
- **RC Car Chassis** - 2-wheel drive platform
- **DC Motors (2x)** - Left/Right wheel motors

### Backend
- **Node.js** - WebSocket relay server
- **ws** - WebSocket library
- **Render.com** - Free server hosting

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool & dev server
- **Wagmi** - React hooks for Ethereum
- **RainbowKit** - Wallet connection UI
- **@farcaster/auth-kit** - Farcaster social login
- **Viem** - Ethereum interactions
- **React Router** - Client-side routing
- **Vercel** - Frontend hosting

### Blockchain
- **Solidity** - Smart contract language
- **Base Mainnet** - L2 blockchain (production)
- **Base Sepolia** - L2 testnet (testing)
- **Remix IDE** - Contract deployment

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ & npm
- Arduino IDE (for ESP32)
- MetaMask or Coinbase Wallet
- Base ETH (mainnet or testnet)

### 1️⃣ Hardware Setup

**Required Components:**
- ESP32-CAM module ($10)
- L298N motor driver ($5)
- RC car chassis with 2 DC motors ($15)
- FTDI USB adapter ($5)
- 7-12V battery pack ($10)
- Jumper wires ($3)

**Wiring Diagram:**
```
ESP32-CAM Pin    →    L298N Pin
─────────────────────────────────
GPIO 12          →    IN1 (Left Motor)
GPIO 13          →    IN2 (Left Motor)
GPIO 14          →    IN3 (Right Motor)
GPIO 15          →    IN4 (Right Motor)
GPIO 2           →    ENA (Left Enable)
GPIO 4           →    ENB (Right Enable)
5V               →    5V
GND              →    GND
```

Detailed guide: [hardware/README.md](hardware/README.md)

### 2️⃣ Deploy WebSocket Server (Render)

1. Sign up at https://render.com
2. Create **New Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Environment**: Node
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click **Deploy**
6. Copy the deployed URL (e.g., `https://base-revolt-server.onrender.com`)

### 3️⃣ Deploy Smart Contract (Base)

1. Open [Remix IDE](https://remix.ethereum.org)
2. Copy `contracts/TicketSale.sol`
3. Compile with Solidity 0.8.20
4. Switch MetaMask to **Base Network**
5. Deploy contract
6. Copy deployed contract address

### 4️⃣ Upload ESP32 Firmware

1. Install **Arduino IDE**
2. Install ESP32 board support
3. Install required libraries:
   - WebSockets by Markus Sattler
   - ArduinoJson by Benoit Blanchon
4. Open `hardware/esp32_rc_car.ino`
5. Update WiFi & WebSocket settings:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* ws_host = "base-revolt-server.onrender.com";
   ```
6. Connect ESP32 via FTDI and upload

### 5️⃣ Deploy Frontend (Vercel)

1. Update `frontend/src/config/contracts.js`:
   ```javascript
   export const TICKET_CONTRACT_ADDRESS = "0x..."; // Your contract
   export const WS_SERVER_URL = "wss://base-revolt-server.onrender.com";
   ```
2. Sign up at https://vercel.com
3. Import GitHub repository
4. Configure:
   - **Framework**: Vite
   - **Root Directory**: `frontend`
5. Add environment variable:
   - `VITE_WS_SERVER_URL`: `wss://base-revolt-server.onrender.com`
6. Click **Deploy**

---

## 🎮 How to Use

### 1. Open Web App
Visit your Vercel deployment URL (e.g., `https://base-revolt.vercel.app`)

### 2. Sign In with Farcaster (Optional)
Click **"Sign in with Farcaster"** for social login integration

### 3. Connect Wallet
Click **"Connect Wallet"** → Connect with RainbowKit

### 4. Select Network
- **Base Mainnet**: Real payments ($0.01 per ticket)
- **Base Sepolia**: Test payments ($5.00 testnet ETH)

### 5. Purchase Ticket
Click **"Buy Ticket"** → Confirm payment → 10 minutes of play time

### 6. Control RC Car
- **Keyboard**: W/A/S/D or Arrow keys
- **Touch**: On-screen buttons (mobile)
- **Live Video**: Real-time camera feed from ESP32-CAM
- **Screen Rotation**: Toggle portrait/landscape modes

### 7. Demo Mode
Click **"Try Demo"** to explore UI without payment (hardware connection required for actual control)

---

## 🌟 Features

### Web3 Integration

#### Multi-Network Support
- **Base Mainnet** - Production environment ($0.01 tickets)
- **Base Sepolia** - Testnet for development ($5.00 test tickets)
- Automatic network detection and price adjustment
- Dynamic ETH/USD conversion with real-time pricing

#### Wallet Integration
- **Reown AppKit (WalletConnect)** - Primary wallet connection infrastructure
  - Uses `@reown/appkit` and `@reown/appkit-adapter-wagmi` for wallet connection
  - Configured with WagmiProvider and QueryClient for React Query integration
  - Supports Base Mainnet and Base Sepolia testnet
  - Custom ConnectWalletModal component for Farcaster mobile deep linking
  - Features WalletConnect deep link interception for mobile wallets (Base, MetaMask, Rainbow, Trust, Phantom)
- **OnchainKit Integration** - Wallet UI with avatar and username display
  - Uses `@coinbase/onchainkit` for wallet UI components
  - **Basenames Support**: Name component automatically displays Base Account names (via ENS)
  - **Base Account Integration**: Avatar component shows ENS/PFP avatars for Base Accounts
  - Avatar component displays ENS/PFP avatars automatically
  - Name component shows ENS names or wallet addresses
  - Identity component combines Avatar, Name, Address, and ETH balance
  - WalletDropdown provides account management UI
  - **Easy Onboarding**: Makes it easy for anyone to get onchain with Base Account display
- Support for MetaMask, Coinbase Wallet, WalletConnect, and all EIP-6963 compatible wallets
- Smart wallet compatibility
- Network switching prompts

#### Farcaster Social Login & Sharing
- **Farcaster Authentication**
  - Uses `@farcaster/miniapp-sdk` for Quick Auth integration
  - `sdk.quickAuth.getToken()` provides 7-day persistent authentication tokens
  - Token stored in localStorage with expiry tracking
  - Falls back gracefully for non-Farcaster environments
- **Farcaster Sharing (Embed Messages)**
  - Uses `sdk.actions.composeCast()` to create embed messages
  - Embeds Mini App Universal Link: `https://farcaster.xyz/miniapps/nSqoh1xZsxF3/base-revolt`
  - Automatically generates rich embed cards with image and action button
  - Tracks share status via localStorage and Warpcast API verification
  - 24-hour demo access after sharing
  - Falls back to web URL method if SDK unavailable

### Session Management & Queue System

#### Session Control
- **Paid Sessions**: 10 minutes of exclusive play time ($4.99)
- **Demo Sessions**: 5 minutes of free play (once per 24 hours)
- **Heartbeat Monitoring**: Auto-disconnect inactive users (10s timeout)
- **Session Validation**: All control commands require valid session ID
- **Auto-expiration**: Sessions end automatically after time limit

#### Priority System
- **Paid User Preemption**: Paid users can take over demo sessions with 5-second warning
- **Fair Queuing**: Same-tier users wait in FIFO order
- **Demo Quota**: One free session per wallet per day
- **Session Extension**: Same wallet can extend paid sessions

#### Queue Management
- **Real-time Queue Status**: Live updates of waiting users and positions
- **Automatic Assignment**: Next user gets control when session ends
- **Estimated Wait Time**: Dynamic calculation based on current session
- **Queue Notifications**: Users notified when it's their turn
- **Leave Queue**: Users can exit queue anytime

#### WebSocket Events
```javascript
// Session flow
requestSession → sessionGranted/sessionDenied
heartbeat (every 3s)
control (with sessionId validation)
endSession → auto-assign next in queue

// Queue flow  
joinQueue → queueJoined
queueUpdate (real-time broadcast)
getQueueStatus → queueStatus
leaveQueue → queueLeft
```

### Hardware Control

#### Real-time Communication
- WebSocket for low-latency commands (<50ms)
- Binary video streaming (JPEG frames)
- 15 FPS live camera feed
- Bidirectional control signals

#### RC Car Control
- **Forward/Backward**: Dual motor synchronization
- **Left/Right**: Differential wheel rotation
- **Stop**: Emergency brake on all motors
- **Speed Control**: PWM motor speed regulation (80/255)

### User Experience

#### Cross-Platform UI
- **Desktop**: Keyboard controls (WASD/Arrows)
- **Mobile**: Touch controls with responsive buttons
- **Portrait Mode**: Vertical layout optimization
- **Landscape Mode**: Full-width video display

#### Real-time Status
- Connection indicators (WebSocket, RC Car)
- 10-minute play timer with MM:SS display
- FPS counter for video stream quality
- Transaction confirmation with block explorer links

#### Farcaster Mini App
- Integrated as Farcaster Frame
- Manifest at `/manifest.json`
- Custom splash screen and icon
- Deep linking support

---

## 🗺️ Roadmap

### ✅ MVP (Current - Q4 2025)
- [x] ESP32-CAM video streaming (15 FPS)
- [x] Remote RC car control (keyboard + touch)
- [x] Portrait/landscape mode support
- [x] Base blockchain payment system
- [x] 10-minute play timer
- [x] Multi-network support (Mainnet + Testnet)
- [x] Farcaster social login
- [x] Farcaster Mini App integration
- [x] Local demo mode

### ✅ Phase 2 (Completed - Q1 2026)
- [x] Session management system
- [x] Queue system for busy vehicles
- [x] Paid user priority (preemption)
- [x] Demo quota system (once per day)
- [x] Heartbeat monitoring
- [ ] AR overlay items in video feed
- [ ] Multiple RC car fleet management
- [ ] Vehicle selection modal with status indicators
- [ ] Enhanced video quality (30 FPS, 720p)

### 🔮 Phase 3 (Q2 2026)
- [ ] Multiplayer racing mode
- [ ] NFT ownership for RC cars
- [ ] Leaderboard & achievements
- [ ] Custom tracks & obstacles

### 🌟 Phase 4 (Q3 2026+)
- [ ] Builder mode (create custom tracks)
- [ ] C2E (Create-to-Earn) rewards
- [ ] Global arena competitions
- [ ] Mobile AR integration (ARKit/ARCore)
- [ ] **Onchain Spectator System** - Live viewing with verifiable onchain engagement

#### 📺 Onchain Spectator System (Planned)

Base Revolt is evolving beyond player interaction to create a fully onchain spectator economy. In the next phase, viewers will not only watch races in real time but also participate, support, and earn through verifiable onchain actions — all without introducing gambling elements.

**Key Features:**

🎫 **Spectator NFT Tickets**
- Each live match generates ERC-721 "Spectator Ticket" NFTs
- Grants access to exclusive camera views, replays, and in-race chat
- Each mint is an onchain transaction, ensuring measurable engagement

💙 **Support Staking**
- Spectators can stake ETH or tokens to show support for players/teams
- Post-match rewards include "Supporter Badge" NFTs and sponsor pool distributions
- Creates additional onchain activity (stake → reward claim) without gambling risk

🎁 **Sponsored Raffle Rewards**
- Ticket holders automatically enter raffles sponsored by community partners
- Winners receive collectible NFTs, physical merch, or in-game credits
- All draws and claims are recorded on-chain for transparency

**Transaction Flow:**
Each live race generates multiple verifiable onchain events:
- `mintTicket()` → spectator NFT minting
- `stakeSupport()` → player support action
- `claimReward()` → post-match distribution
- `transferNFT()` → collectible trading

This design allows **2-5 verifiable transactions per participant**, scaling network activity while maintaining complete transparency and avoiding regulatory risk.

**Vision:**
By combining real hardware, AR-enhanced competition, and onchain spectator interactions, Base Revolt becomes not just a racing game but a living Base-powered arena where every cheer, stake, and reward is transparently recorded on-chain.

---

## 📊 Testnet Transactions

All testnet transactions are verifiable on Base Sepolia:

- **Latest Test Tx**: [`0x8cdf57d3296911edbc9631871f961cc5b2d23213d1db2033af502fcd98b62aa8`](https://sepolia.basescan.org/tx/0x8cdf57d3296911edbc9631871f961cc5b2d23213d1db2033af502fcd98b62aa8)
- **Test Payment Amount**: 5.0 ETH (testnet)
- **Recipient Wallet**: `0xF45222d623B0081C658b284e2fCb85d5E7B1d3b3`

---

## 🐛 Troubleshooting

### Hardware Issues

**Q: Camera initialization failed**
- Check 5V power supply (3.3V insufficient)
- Verify camera cable connection
- Try power cycle

**Q: WiFi connection failed**
- Use 2.4GHz WiFi only (5GHz not supported)
- Check SSID/password in firmware
- Verify router settings

**Q: WebSocket connection timeout**
- Confirm Render URL uses `wss://`
- Check server deployment status
- Verify firewall settings

### Frontend Issues

**Q: Wallet connection rejected**
- Ensure Base network is added to wallet
- Check network RPC settings
- Try different wallet provider

**Q: Payment transaction failed**
- Verify sufficient Base ETH balance
- Check contract address in config
- Confirm correct network selected

**Q: Video stream not displaying**
- Verify RC car is powered on
- Check WebSocket connection status
- Confirm ESP32 uploaded successfully

**Q: Farcaster login not working**
- Check Optimism RPC configuration
- Verify Farcaster account is active
- Try clearing browser cache

### Server Issues

**Q: Render server sleeping**
- Free tier sleeps after 15 minutes inactivity
- First connection wakes server (30s delay)
- Consider upgrading for 24/7 uptime

---

## 💡 Development Tips

### Local Development

**Run server locally:**
```bash
cd server
npm install
npm start
# Server running on ws://localhost:8080
```

**Run frontend locally:**
```bash
cd frontend
npm install
npm run dev
# App running on http://localhost:3000
```

**Test Mode:**
- Development environment shows "Skip Payment" button
- Production requires actual blockchain payment

**ESP32 Local Testing:**
- Update `ws_host` to your local IP
- Example: `192.168.1.100:8080`
- Disable SSL for local connections

### Cost Optimization

- **Render Free Tier**: 750 hours/month (sufficient for MVP)
- **Vercel Free Tier**: 100GB bandwidth/month
- **Base Gas Fees**: ~$0.001 per transaction
- **Total Monthly Cost**: ~$0 (free tiers + minimal gas)

---

## 📚 Resources

### Official Documentation
- [ESP32-CAM Guide](https://randomnerdtutorials.com/esp32-cam-video-streaming-face-recognition-arduino-ide/)
- [Base Network Docs](https://docs.base.org/)
- [Wagmi Documentation](https://wagmi.sh/)
- [RainbowKit Docs](https://www.rainbowkit.com/)
- [Farcaster Docs](https://docs.farcaster.xyz/)

### Community
- [Base Discord](https://discord.gg/buildonbase)
- [GitHub Issues](https://github.com/gracefully91/BaseRevolt/issues)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 👤 Author

**Base Revolt Team**
- Solo developer project
- Built for Base Onchain Builder Hackathon
- Farcaster FID: 1107308
- GitHub: https://github.com/gracefully91/BaseRevolt
- Live Demo: https://base-revolt.vercel.app

---

## 🏆 Hackathon Submission

### Category
**Base Track** - Onchain Builder Hackathon

### 📹 Demo Video
**Video Link:** [YouTube/Demo Video](https://youtube.com/watch?v=YOUR_VIDEO_ID) *(Coming soon)*

**Video Contents:**
- 🎬 **Intro** (0:00-0:15) - Project overview and team introduction
- 🎯 **Problem Statement** (0:15-0:30) - Bridging Web3 and physical world
- 💡 **Solution** (0:30-1:00) - Real-time RC car control via Base blockchain
- 🏗️ **Architecture Overview** (1:00-1:30) - Full-stack system design
- 🎮 **Live Demo** (1:30-2:30) - Complete user flow demonstration

### 📹 Demo Video
**Video Link:** [YouTube/Demo Video](https://youtube.com/watch?v=YOUR_VIDEO_ID) *(Coming soon)*

**Video Contents:**
- 🎬 **Intro** (0:00-0:15) - Project overview and team introduction
- 🎯 **Problem Statement** (0:15-0:30) - Bridging Web3 and physical world
- 💡 **Solution** (0:30-1:00) - Real-time RC car control via Base blockchain
- 🏗️ **Architecture Overview** (1:00-1:30) - Full-stack system design
- 🎮 **Live Demo** (1:30-2:30) - Complete user flow demonstration

### ✅ Submission Requirements
- ✅ **One project per team**: Solo developer project
- ✅ **Publicly accessible URL**: https://base-revolt.vercel.app
- ✅ **Open-source GitHub repository**: https://github.com/gracefully91/BaseRevolt
- ✅ **Demo video (1+ minutes)**: See video link above
- ✅ **Basenames/Base Account integration**: Using OnchainKit with Name/Avatar components for Base Account display
- ✅ **Proof of Deployment**: Base Sepolia testnet transaction verified
- ✅ **1+ transactions on Base testnet**: Transaction hash provided below

### 📊 Proof of Deployment (Base Testnet)

**Transaction Details:**
- **Network:** Base Sepolia (testnet)
- **Tx Hash:** [`0x8cdf57d3...b62aa8`](https://sepolia.basescan.org/tx/0x8cdf57d3296911edbc9631871f961cc5b2d23213d1db2033af502fcd98b62aa8)
- **Block:** 32801960 · **Status:** ✅ Success
- **Timestamp:** 2025-10-25 06:03:28 UTC
- **Contract Address:** `0xF45222d623B0081C658b284e2fCb85d5E7B1d3b3`
- **Payment Amount:** 5.0 ETH (testnet)

### 🎯 Project Highlights

**Built on Base:**
- Smart contract deployed on Base Sepolia testnet
- Payment processing via Base blockchain
- Multi-network support (Base Mainnet + Base Sepolia)
- All transactions verified on BaseScan

**Technical Implementation:**
- Real-time RC car control via WebSocket
- Live video streaming (15 FPS ESP32-CAM feed)
- Blockchain payments with smart contract integration
- Cross-platform support (Desktop, mobile, Farcaster Mini App)

**Unique Value Proposition:**
Base Revolt uniquely bridges Web3 and physical hardware by enabling users to control real RC cars through blockchain payments. This first-of-its-kind integration combines ESP32-CAM hardware, Base blockchain, and WebSocket relay to create a seamless onchain-to-physical experience.

**Target Users:**
- Web3 gaming enthusiasts seeking unique onchain experiences
- IoT/DIY hobbyists interested in practical blockchain applications
- Blockchain developers exploring Web3 + hardware integration

**User Experience:**
Designed for accessibility - anyone can connect their wallet and start controlling RC cars. OnchainKit integration displays ENS names/avatars automatically, making it easy for users to get onchain. Demo mode with social sharing lowers the barrier to entry, while the Farcaster Mini App provides native mobile experience.

**Innovation Impact:**
- Novel approach combining Web3 with physical hardware
- Full-stack technical complexity (React + Node.js + ESP32 + Smart Contracts)
- Seamless user onboarding with wallet connection
- Social integration via Farcaster Mini App with viral sharing mechanics

---

**🚗 Let's Revolt! Drive the future of Web3 gaming. 🚙**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/gracefully91/BaseRevolt)

---
---

# 🚙 Base Revolt (한국어)

> **Web3와 현실을 연결하는 AR 게이밍 플랫폼**

Base Revolt는 웹 브라우저를 통해 실제 RC 카를 원격 제어할 수 있는 풀스택 Web3 애플리케이션입니다. Base 블록체인을 활용한 결제 처리 및 소유권 검증 기능을 제공합니다.

[![라이브 데모](https://img.shields.io/badge/Live-Demo-blue)](https://base-revolt.vercel.app)
[![Base Network](https://img.shields.io/badge/Network-Base-blue)](https://base.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 개요

Base Revolt는 온체인 소유권을 현실 세계의 움직임으로 변환합니다. 사용자는 Base 지갑을 연결하고, 암호화폐로 플레이 티켓을 구매하며, 실시간 비디오 스트리밍과 함께 실제 RC 카를 제어할 수 있습니다 - 모두 웹 브라우저에서 가능합니다.

### 주요 기능

- 🎮 **실시간 RC 카 제어** - WASD/방향키 또는 터치 컨트롤
- 📹 **실시간 비디오 스트리밍** - ESP32-CAM 15 FPS 비디오 피드
- 💰 **Base 블록체인 결제** - 메인넷 $4.99 / 테스트넷 $1.00 티켓
- 🔗 **Farcaster 통합** - 소셜 + 온체인 로그인 경험
- 📱 **크로스 플랫폼** - 데스크톱, 모바일, 세로/가로 모드 지원
- ⛓️ **멀티 네트워크 지원** - Base 메인넷 & Base Sepolia 테스트넷
- 🎨 **Farcaster Mini App** - Frame 미니 앱으로 통합
- 👥 **세션 관리 & 대기열 시스템** - 공정한 사용자 관리

---

## 🏗️ 아키텍처

```
┌─────────────────┐
│   웹 브라우저    │ ← 사용자 인터페이스 (React + Wagmi + OnchainKit)
└────────┬────────┘
         │ WebSocket
┌────────▼────────┐
│  Node.js 서버   │ ← WebSocket 릴레이 (Render.com)
│  세션 관리       │ ← 대기열 시스템
└────────┬────────┘
         │ WebSocket
┌────────▼────────┐
│   ESP32-CAM     │ ← RC 카 하드웨어 (실제 장치)
│   + L298N       │
│   + DC 모터     │
└─────────────────┘

┌─────────────────┐
│  Base 네트워크   │ ← 결제 & 소유권
│  스마트 컨트랙트 │
└─────────────────┘
```

---

## 🛠️ 기술 스택

### 하드웨어
- **ESP32-CAM** - 비디오 스트리밍 & WiFi 통신
- **L298N 모터 드라이버** - DC 모터 제어
- **RC 카 섀시** - 2륜 구동 플랫폼
- **DC 모터 (2개)** - 좌우 바퀴 모터

### 백엔드
- **Node.js** - WebSocket 릴레이 서버
- **ws** - WebSocket 라이브러리
- **세션 관리** - UUID 기반 세션 추적
- **대기열 시스템** - 우선순위 큐 구현
- **Render.com** - 무료 서버 호스팅

### 프론트엔드
- **React 19** - UI 프레임워크
- **Vite** - 빌드 도구 & 개발 서버
- **Wagmi** - Ethereum용 React 훅
- **Reown AppKit** - WalletConnect 기반 지갑 연결 인프라
- **OnchainKit** - Coinbase 지갑 UI 라이브러리 (아바타/사용자명 표시)
- **@farcaster/miniapp-sdk** - Farcaster Mini App SDK (공유 및 인증)
- **Viem** - Ethereum 상호작용
- **React Router** - 클라이언트 사이드 라우팅
- **Vercel** - 프론트엔드 호스팅

### 블록체인
- **Solidity** - 스마트 컨트랙트 언어
- **Base Mainnet** - L2 블록체인 (프로덕션)
- **Base Sepolia** - L2 테스트넷 (테스팅)
- **Remix IDE** - 컨트랙트 배포

---

## 🌟 핵심 기능 상세

### 세션 관리 & 대기열 시스템

#### 세션 제어
- **유료 세션**: 10분 독점 플레이 시간 ($4.99)
- **데모 세션**: 5분 무료 플레이 (24시간당 1회)
- **하트비트 모니터링**: 비활성 사용자 자동 연결 해제 (10초 타임아웃)
- **세션 검증**: 모든 제어 명령은 유효한 세션 ID 필요
- **자동 만료**: 시간 제한 후 세션 자동 종료

#### 우선순위 시스템
- **유료 사용자 선점**: 유료 사용자는 5초 경고와 함께 데모 세션 인수 가능
- **공정한 대기열**: 동일 등급 사용자는 선입선출 순서로 대기
- **데모 할당량**: 지갑당 하루 1회 무료 세션
- **세션 연장**: 동일 지갑은 유료 세션 연장 가능

#### 대기열 관리
- **실시간 대기열 상태**: 대기 중인 사용자와 위치 실시간 업데이트
- **자동 할당**: 세션 종료 시 다음 사용자에게 자동 제어권 부여
- **예상 대기 시간**: 현재 세션 기반 동적 계산
- **대기열 알림**: 사용자 차례가 되면 알림 받음
- **대기열 나가기**: 사용자는 언제든지 대기열 이탈 가능

#### WebSocket 이벤트
```javascript
// 세션 흐름
requestSession → sessionGranted/sessionDenied
heartbeat (3초마다)
control (sessionId 검증 포함)
endSession → 다음 대기자에게 자동 할당

// 대기열 흐름
joinQueue → queueJoined
queueUpdate (실시간 브로드캐스트)
getQueueStatus → queueStatus
leaveQueue → queueLeft
```

#### 세션 구현 세부사항
```javascript
// 서버 측 세션 관리
activeSessions = Map<carId, {
  sessionId: UUID,
  wallet: string,
  tier: 'paid' | 'demo',
  expiresAt: timestamp,
  ws: WebSocket,
  heartbeatTimeout: Timer
}>

// 대기열 구조
waitingQueues = Map<carId, [{
  wallet: string,
  tier: 'paid' | 'demo',
  ws: WebSocket,
  joinedAt: timestamp
}]>

// 데모 할당량 추적
demoQuota = Map<wallet, {
  usedAt: timestamp,
  expiresAt: timestamp (24시간 후)
}>
```

### 하드웨어 제어

#### 실시간 통신
- 저지연 명령을 위한 WebSocket (<50ms)
- 바이너리 비디오 스트리밍 (JPEG 프레임)
- 15 FPS 라이브 카메라 피드
- 양방향 제어 신호

#### RC 카 제어
- **전진/후진**: 듀얼 모터 동기화
- **좌/우**: 차등 바퀴 회전
- **정지**: 모든 모터 긴급 제동
- **속도 제어**: PWM 모터 속도 조절 (80/255)

### 사용자 경험

#### 크로스 플랫폼 UI
- **데스크톱**: 키보드 컨트롤 (WASD/화살표)
- **모바일**: 반응형 버튼으로 터치 컨트롤
- **세로 모드**: 세로 레이아웃 최적화
- **가로 모드**: 전폭 비디오 디스플레이

#### 실시간 상태
- 연결 표시기 (WebSocket, RC 카)
- MM:SS 표시가 있는 10분 플레이 타이머
- 비디오 스트림 품질을 위한 FPS 카운터
- 블록 탐색기 링크가 있는 거래 확인

---

## 🚀 빠른 시작

### 전제 조건

- Node.js 18+ & npm
- Arduino IDE (ESP32용)
- MetaMask 또는 Coinbase Wallet
- Base ETH (메인넷 또는 테스트넷)

### 1️⃣ 하드웨어 설정

**필수 구성 요소:**
- ESP32-CAM 모듈 ($10)
- L298N 모터 드라이버 ($5)
- 2개의 DC 모터가 있는 RC 카 섀시 ($15)
- FTDI USB 어댑터 ($5)
- 7-12V 배터리 팩 ($10)
- 점퍼 와이어 ($3)

**배선도:**
```
ESP32-CAM 핀    →    L298N 핀
─────────────────────────────────
GPIO 12          →    IN1 (왼쪽 모터)
GPIO 13          →    IN2 (왼쪽 모터)
GPIO 14          →    IN3 (오른쪽 모터)
GPIO 15          →    IN4 (오른쪽 모터)
GPIO 2           →    ENA (왼쪽 활성화)
GPIO 4           →    ENB (오른쪽 활성화)
5V               →    5V
GND              →    GND
```

자세한 가이드: [hardware/README.md](hardware/README.md)

### 2️⃣ WebSocket 서버 배포 (Render)

1. https://render.com 에서 가입
2. **New Web Service** 생성
3. GitHub 리포지토리 연결
4. 설정:
   - **Environment**: Node
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. **Deploy** 클릭
6. 배포된 URL 복사 (예: `https://base-revolt-server.onrender.com`)

### 3️⃣ 스마트 컨트랙트 배포 (Base)

1. [Remix IDE](https://remix.ethereum.org) 열기
2. `contracts/TicketSale.sol` 복사
3. Solidity 0.8.20으로 컴파일
4. MetaMask를 **Base Network**로 전환
5. 컨트랙트 배포
6. 배포된 컨트랙트 주소 복사

### 4️⃣ ESP32 펌웨어 업로드

1. **Arduino IDE** 설치
2. ESP32 보드 지원 설치
3. 필수 라이브러리 설치:
   - WebSockets by Markus Sattler
   - ArduinoJson by Benoit Blanchon
4. `hardware/esp32_rc_car.ino` 열기
5. WiFi & WebSocket 설정 업데이트:
   ```cpp
   const char* ssid = "YOUR_WIFI_SSID";
   const char* password = "YOUR_WIFI_PASSWORD";
   const char* ws_host = "base-revolt-server.onrender.com";
   ```
6. FTDI로 ESP32 연결 및 업로드

### 5️⃣ 프론트엔드 배포 (Vercel)

1. `frontend/src/config/contracts.js` 업데이트:
   ```javascript
   export const TICKET_CONTRACT_ADDRESS = "0x..."; // 귀하의 컨트랙트
   export const WS_SERVER_URL = "wss://base-revolt-server.onrender.com";
   ```
2. https://vercel.com 에서 가입
3. GitHub 리포지토리 가져오기
4. 설정:
   - **Framework**: Vite
   - **Root Directory**: `frontend`
5. 환경 변수 추가:
   - `VITE_WS_SERVER_URL`: `wss://base-revolt-server.onrender.com`
6. **Deploy** 클릭

---

## 🎮 사용 방법

### 1. 웹 앱 열기
Vercel 배포 URL 방문 (예: `https://base-revolt.vercel.app`)

### 2. Farcaster로 로그인 (선택사항)
소셜 로그인 통합을 위해 **"Sign in with Farcaster"** 클릭

### 3. 지갑 연결
**"Connect Wallet"** 클릭 → Reown AppKit 모달에서 지갑 선택 → OnchainKit UI에 아바타/사용자명 자동 표시

### 4. 네트워크 선택
- **Base Mainnet**: 실제 결제 ($4.99)
- **Base Sepolia**: 테스트 결제 ($1.00 테스트넷 ETH)

### 5. 티켓 구매
**"Buy Ticket"** 클릭 → 결제 확인 → 10분 플레이 시간

### 6. RC 카 제어
- **키보드**: W/A/S/D 또는 화살표 키
- **터치**: 화면 버튼 (모바일)
- **라이브 비디오**: ESP32-CAM의 실시간 카메라 피드
- **화면 회전**: 세로/가로 모드 전환

### 7. 데모 모드
결제 없이 UI 탐색을 위해 **"Try Demo"** 클릭 (실제 제어는 하드웨어 연결 필요)

---

## 🗺️ 로드맵

### ✅ MVP (현재 - 2025 Q4)
- [x] ESP32-CAM 비디오 스트리밍 (15 FPS)
- [x] 원격 RC 카 제어 (키보드 + 터치)
- [x] 세로/가로 모드 지원
- [x] Base 블록체인 결제 시스템
- [x] 10분 플레이 타이머
- [x] 멀티 네트워크 지원 (메인넷 + 테스트넷)
- [x] Farcaster 소셜 로그인
- [x] Farcaster Mini App 통합
- [x] 로컬 데모 모드

### ✅ Phase 2 (완료 - 2026 Q1)
- [x] 세션 관리 시스템
- [x] 사용 중인 차량을 위한 대기열 시스템
- [x] 유료 사용자 우선순위 (선점)
- [x] 데모 할당량 시스템 (하루 1회)
- [x] 하트비트 모니터링
- [ ] 비디오 피드의 AR 오버레이 아이템
- [ ] 다중 RC 카 플릿 관리
- [ ] 상태 표시기가 있는 차량 선택 모달
- [ ] 향상된 비디오 품질 (30 FPS, 720p)

### 🔮 Phase 3 (2026 Q2)
- [ ] 멀티플레이어 레이싱 모드
- [ ] RC 카용 NFT 소유권
- [ ] 리더보드 & 업적
- [ ] 커스텀 트랙 & 장애물

### 🌟 Phase 4 (2026 Q3+)
- [ ] 빌더 모드 (커스텀 트랙 생성)
- [ ] C2E (Create-to-Earn) 보상
- [ ] 글로벌 아레나 대회
- [ ] 모바일 AR 통합 (ARKit/ARCore)
- [ ] **온체인 관전자 시스템** - 실시간 시청 및 검증 가능한 온체인 참여

#### 📺 온체인 관전자 시스템 (계획 중)

Base Revolt는 플레이어 상호작용을 넘어 완전한 온체인 관전자 경제를 구축하기 위해 발전하고 있습니다. 다음 단계에서는 관전자들이 실시간으로 레이스를 시청할 뿐만 아니라 검증 가능한 온체인 액션을 통해 참여하고, 지원하며, 수익을 얻을 수 있습니다 — 도박 요소 없이.

**주요 기능:**

🎫 **관전자 NFT 티켓**
- 각 라이브 매치마다 ERC-721 "관전자 티켓" NFT 생성
- 독점 카메라 뷰, 리플레이, 레이스 내 채팅 접근 권한 부여
- 각 민팅은 온체인 트랜잭션으로 측정 가능한 참여 보장

💙 **지원 스테이킹**
- 관전자들이 플레이어/팀을 지원하기 위해 ETH 또는 토큰 스테이킹 가능
- 경기 후 "서포터 배지" NFT 및 스폰서 풀 분배 보상
- 도박 위험 없이 추가 온체인 활동 생성 (스테이킹 → 보상 청구)

🎁 **후원 추첨 보상**
- 티켓 보유자는 커뮤니티 파트너의 후원 추첨에 자동 참여
- 당첨자는 수집용 NFT, 물리적 상품 또는 게임 내 크레딧 수령
- 모든 추첨 및 청구는 블록체인에 기록되어 투명성 보장

**트랜잭션 흐름:**
각 라이브 레이스는 여러 검증 가능한 온체인 이벤트를 생성합니다:
- `mintTicket()` → 관전자 NFT 민팅
- `stakeSupport()` → 플레이어 지원 액션
- `claimReward()` → 경기 후 분배
- `transferNFT()` → 수집품 거래

이 설계는 **참가자당 2-5개의 검증 가능한 트랜잭션**을 허용하여 규제 위험 없이 네트워크 활동을 확장하고 완전한 투명성을 유지합니다.

**비전:**
실제 하드웨어, AR 강화 경쟁, 온체인 관전자 상호작용을 결합함으로써 Base Revolt는 단순한 레이싱 게임을 넘어 모든 응원, 스테이킹, 보상이 투명하게 온체인에 기록되는 살아있는 Base 구동 아레나가 됩니다.

---

## 🐛 문제 해결

### 하드웨어 문제

**Q: 카메라 초기화 실패**
- 5V 전원 공급 확인 (3.3V 불충분)
- 카메라 케이블 연결 확인
- 전원 재시작 시도

**Q: WiFi 연결 실패**
- 2.4GHz WiFi만 사용 (5GHz 지원 안됨)
- 펌웨어의 SSID/비밀번호 확인
- 라우터 설정 확인

**Q: WebSocket 연결 시간 초과**
- Render URL이 `wss://`를 사용하는지 확인
- 서버 배포 상태 확인
- 방화벽 설정 확인

### 프론트엔드 문제

**Q: 지갑 연결 거부**
- Base 네트워크가 지갑에 추가되었는지 확인
- 네트워크 RPC 설정 확인
- 다른 지갑 제공자 시도

**Q: 결제 거래 실패**
- Base ETH 잔액이 충분한지 확인
- 설정의 컨트랙트 주소 확인
- 올바른 네트워크가 선택되었는지 확인

**Q: 비디오 스트림이 표시되지 않음**
- RC 카의 전원이 켜져 있는지 확인
- WebSocket 연결 상태 확인
- ESP32가 성공적으로 업로드되었는지 확인

### 서버 문제

**Q: Render 서버 슬립 모드**
- 무료 티어는 15분 비활성화 후 슬립
- 첫 번째 연결이 서버를 깨움 (30초 지연)
- 24/7 가동을 위해 업그레이드 고려

---

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

---

## 👤 제작자

**Base Revolt 팀**
- 솔로 개발자 프로젝트
- Base Onchain Builder Hackathon을 위해 제작
- Farcaster FID: 1107308

---

**🚙 Let's Revolt! Web3 게이밍의 미래를 운전하세요. 🚗**
