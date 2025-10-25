# 🚗 Base Revolt

> **AR Gaming Platform Connecting Web3 and Reality**

Base Revolt is a full-stack Web3 application that enables real-time remote control of physical RC cars via web browser, powered by Base blockchain for payment processing and ownership verification.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue)](https://base-revolt.vercel.app)
[![Base Network](https://img.shields.io/badge/Network-Base-blue)](https://base.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## ✅ Proof of Deployment (Base Testnet)

- **Network:** Base Sepolia (testnet)
- **Tx Hash:** [`0x8cdf57d3...b62aa8`](https://sepolia.basescan.org/tx/0x8cdf57d3296911edbc9631871f961cc5b2d23213d1db2033af502fcd98b62aa8)
- **Block:** 32801960 · **Status:** ✅ Success
- **Timestamp:** 2025-10-25 06:03:28 UTC
- **From:** `0xd10d3381C1e824143D22350e9149413310F14F22`
- **To:** `0xF45222d623B0081C658b284e2fCb85d5E7B1d3b3`
- **Amount:** 5.0 ETH (testnet)

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
- RainbowKit for seamless wallet connections
- Support for MetaMask, Coinbase Wallet, WalletConnect
- Smart wallet compatibility
- Network switching prompts

#### Farcaster Social Login
- Sign in with Farcaster account
- Social + Onchain identity integration
- QR code authentication via Warpcast
- 7-day session persistence

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

### ✅ MVP (Current - Q4 2024)
- [x] ESP32-CAM video streaming (15 FPS)
- [x] Remote RC car control (keyboard + touch)
- [x] Portrait/landscape mode support
- [x] Base blockchain payment system
- [x] 10-minute play timer
- [x] Multi-network support (Mainnet + Testnet)
- [x] Farcaster social login
- [x] Farcaster Mini App integration
- [x] Local demo mode

### 🚧 Phase 2 (Q1 2025)
- [ ] AR overlay items in video feed
- [ ] Multiple RC car fleet management
- [ ] Vehicle selection modal with status indicators
- [ ] Queue system for busy vehicles
- [ ] Enhanced video quality (30 FPS, 720p)

### 🔮 Phase 3 (Q2 2025)
- [ ] Multiplayer racing mode
- [ ] NFT ownership for RC cars
- [ ] Leaderboard & achievements
- [ ] Custom tracks & obstacles

### 🌟 Phase 4 (Q3 2025+)
- [ ] Builder mode (create custom tracks)
- [ ] C2E (Create-to-Earn) rewards
- [ ] Global arena competitions
- [ ] Mobile AR integration (ARKit/ARCore)

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

---

## 🏆 Hackathon Submission

### Category
**Base Track** - Onchain Builder Hackathon

### Judging Criteria
- ✅ **Proof of Deployment**: Verified testnet transaction
- ✅ **Innovation**: Real-world hardware + Web3 integration
- ✅ **Technical Execution**: Full-stack implementation
- ✅ **Social + Onchain**: Farcaster login integration
- ✅ **Multi-network**: Mainnet & Testnet support
- ✅ **User Experience**: Cross-platform responsive design

---

**🚗 Let's Revolt! Drive the future of Web3 gaming. 🚙**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project?template=https://github.com/gracefully91/BaseRevolt)
