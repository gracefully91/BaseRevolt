# 📊 Base Revolt MVP - 프로젝트 요약

## 🎯 프로젝트 개요

**Base Revolt**는 ESP32-CAM 기반 RC카를 웹에서 실시간으로 조종하고, Base 블록체인으로 플레이 티켓을 구매하는 Web3 + IoT 통합 플랫폼입니다.

### 핵심 가치 제안
- **실물 연동**: 디지털 자산이 현실 세계의 물리적 객체와 연결
- **블록체인 소유권**: Base 메인넷에서 투명한 거래 기록
- **실시간 제어**: WebSocket 기반 저지연 원격 조종

---

## 🛠️ 기술 아키텍처

```
┌─────────────────┐
│  웹 브라우저     │  React + OnchainKit
│  (Vercel)       │  지갑 연결 + 결제 + 조종 UI
└────────┬────────┘
         │ WSS
         │
┌────────▼────────┐
│  WebSocket      │  Node.js + ws
│  서버 (Render)  │  영상/제어 신호 중계
└────────┬────────┘
         │ WiFi
         │
┌────────▼────────┐
│  ESP32-CAM      │  C++ (Arduino)
│  RC카           │  카메라 + 모터 제어
└─────────────────┘

         │
         │ Ethereum JSON-RPC
         │
┌────────▼────────┐
│  Base Mainnet   │  Solidity
│  스마트 컨트랙트 │  티켓 판매 로직
└─────────────────┘
```

---

## 📦 프로젝트 구조

```
Base Revolt/
├── hardware/               # ESP32-CAM 펌웨어 (Arduino/C++)
│   ├── esp32_rc_car.ino   # 메인 펌웨어
│   └── README.md          # 하드웨어 가이드
│
├── server/                # WebSocket 서버 (Node.js)
│   ├── index.js           # 서버 로직
│   ├── package.json
│   ├── render.yaml        # Render 배포 설정
│   └── README.md
│
├── contracts/             # 스마트 컨트랙트 (Solidity)
│   ├── TicketSale.sol     # 티켓 판매 컨트랙트
│   └── README.md
│
├── frontend/              # 웹 앱 (React)
│   ├── src/
│   │   ├── pages/         # 페이지 컴포넌트
│   │   │   ├── Home.jsx   # 홈/결제 페이지
│   │   │   └── Play.jsx   # 조종 페이지
│   │   ├── components/    # 재사용 컴포넌트
│   │   │   ├── VideoStream.jsx
│   │   │   └── Controller.jsx
│   │   └── config/        # 설정 파일
│   │       ├── wagmi.js
│   │       └── contracts.js
│   ├── package.json
│   ├── vite.config.js
│   └── README.md
│
├── README.md              # 메인 문서
├── DEPLOYMENT.md          # 배포 가이드
├── QUICKSTART.md          # 빠른 시작
└── SUMMARY.md             # 이 파일
```

---

## 🔑 핵심 기능

### 1. 지갑 연결 (OnchainKit)
- Coinbase Smart Wallet 지원
- Base 메인넷 자동 전환
- 원클릭 지갑 생성

### 2. 티켓 구매
- $0.5 = 10분 플레이 시간
- Base 메인넷 스마트 컨트랙트
- 즉시 결제 확인

### 3. 실시간 영상
- ESP32-CAM 카메라
- JPEG 스트리밍 (320x240, ~15 FPS)
- Canvas 렌더링

### 4. 원격 조종
- 키보드 제어 (W/A/S/D, 방향키)
- 터치 제어 (모바일)
- 실시간 WebSocket 통신

### 5. 타이머
- 10분 카운트다운
- 자동 세션 종료

---

## 💰 비용 분석

### 하드웨어 (1회 구매)
| 부품 | 가격 |
|------|------|
| ESP32-CAM | $10 |
| L298N | $5 |
| RC카 섀시 | $15 |
| FTDI | $5 |
| 배터리 | $10 |
| 케이블 | $3 |
| **총합** | **$48** |

### 운영 비용 (월)
| 서비스 | 플랜 | 비용 |
|--------|------|------|
| Render | Free | $0 |
| Vercel | Free | $0 |
| Base 가스비 | 변동 | ~$5 |
| **총합** | | **~$5/월** |

### 수익 모델
- 티켓 판매: $0.5/10분
- 손익분기점: 10회 플레이/월 ($5)
- 확장 가능: 여러 대의 RC카 운영

---

## 📊 기술 스택 세부

### 프론트엔드
- **React 18**: UI 프레임워크
- **Vite**: 빌드 도구 (빠른 HMR)
- **OnchainKit**: Coinbase Web3 SDK
- **Wagmi**: Ethereum React Hooks
- **React Router**: 라우팅
- **TanStack Query**: 상태 관리

### 백엔드
- **Node.js**: 런타임
- **ws**: WebSocket 서버
- **Express**: HTTP 서버 (헬스체크)

### 하드웨어
- **ESP32-CAM**: WiFi + 카메라
- **L298N**: H-브릿지 모터 드라이버
- **Arduino**: 개발 환경
- **WebSockets Library**: ESP32 WebSocket
- **ArduinoJson**: JSON 파싱

### 블록체인
- **Solidity 0.8.20**: 스마트 컨트랙트
- **Base Mainnet**: L2 블록체인 (체인 ID: 8453)
- **Remix IDE**: 배포 도구

### 배포
- **Vercel**: 프론트엔드 호스팅
- **Render**: WebSocket 서버 호스팅
- **GitHub**: 버전 관리

---

## 🚀 배포 플로우

```
1. GitHub 리포지토리 생성
   ↓
2. Render: WebSocket 서버 배포
   - URL 획득: wss://xxx.onrender.com
   ↓
3. Remix: 스마트 컨트랙트 배포
   - 컨트랙트 주소 획득: 0x...
   ↓
4. Coinbase: OnchainKit API Key
   - API Key 획득
   ↓
5. Arduino: ESP32 펌웨어 업로드
   - WiFi + WebSocket URL 설정
   ↓
6. Vercel: 프론트엔드 배포
   - 환경 변수 설정
   ↓
7. 통합 테스트
   ✅ 완료!
```

---

## 📈 성능 지표

### 예상 성능
- **영상 지연**: ~500ms (WiFi 환경에 따라)
- **제어 지연**: ~100ms
- **프레임레이트**: ~15 FPS
- **영상 해상도**: 320x240 (QVGA)
- **동시 접속**: 웹 사용자 무제한, RC카 1대

### 최적화 가능성
- 해상도 조정: QQVGA (160x120) ~ VGA (640x480)
- FPS 조정: 10~30 FPS
- 압축률 조정: JPEG quality

---

## 🔒 보안 고려사항

### 현재 구현 (MVP)
- ✅ HTTPS/WSS 암호화
- ✅ 스마트 컨트랙트 기본 보안
- ✅ 클라이언트 사이드 타이머
- ⚠️ 티켓 검증 없음 (이벤트만 기록)
- ⚠️ RC카 접근 제어 없음

### 프로덕션 권장사항
- [ ] 티켓 NFT 발행 및 검증
- [ ] JWT 인증
- [ ] Rate limiting
- [ ] 컨트랙트 감사
- [ ] 접근 제어 (1 티켓 = 1 세션)

---

## 📝 라이센스

MIT License - 자유롭게 사용, 수정, 배포 가능

---

## 🎯 로드맵

### MVP (완료)
- [x] ESP32-CAM 영상 스트리밍
- [x] 원격 조종 (키보드/터치)
- [x] Base 결제 시스템
- [x] 웹 UI

### Phase 2 (계획)
- [ ] AR 오버레이
- [ ] 멀티플레이어 레이싱
- [ ] NFT 소유권 증명
- [ ] 리더보드

### Phase 3 (미래)
- [ ] Builder Mode
- [ ] AI 미션
- [ ] C2E 생태계
- [ ] 글로벌 확장

---

## 🌟 차별점

| 비교 항목 | 경쟁사 | Base Revolt |
|-----------|--------|-------------|
| 실물 연동 | ❌ 가상만 | ✅ 실제 RC카 |
| 블록체인 | ❌ 또는 폐쇄형 | ✅ Base L2 |
| 접근성 | ⚠️ 높은 진입장벽 | ✅ $48 하드웨어 |
| 확장성 | ⚠️ 제한적 | ✅ 오픈 소스 |
| 실시간 | ⚠️ 시뮬레이션 | ✅ 실제 물리 |

---

## 📞 지원 및 커뮤니티

- **GitHub Issues**: 버그 리포트, 기능 제안
- **Discord**: 커뮤니티 논의 (준비 중)
- **Twitter**: 업데이트 공지 (준비 중)

---

## 👥 기여 방법

1. Fork 리포지토리
2. Feature 브랜치 생성
3. 변경사항 커밋
4. Pull Request 생성

**환영하는 기여:**
- 버그 수정
- 문서 개선
- 새로운 기능
- 번역
- 테스트

---

## 📚 참고 자료

### 공식 문서
- [ESP32-CAM Tutorial](https://randomnerdtutorials.com/esp32-cam-video-streaming-face-recognition-arduino-ide/)
- [OnchainKit Docs](https://onchainkit.xyz/)
- [Base Network](https://base.org/)
- [Wagmi Docs](https://wagmi.sh/)

### 관련 기술
- [WebRTC](https://webrtc.org/) - 미래 개선안
- [MQTT](https://mqtt.org/) - 대안 프로토콜
- [Arduino](https://www.arduino.cc/)

---

## 🎓 학습 가치

이 프로젝트를 통해 배울 수 있는 것:
- ✅ Web3 통합 (Wagmi, OnchainKit)
- ✅ WebSocket 실시간 통신
- ✅ IoT 하드웨어 제어 (ESP32)
- ✅ 스마트 컨트랙트 개발
- ✅ 풀스택 개발 (React + Node.js)
- ✅ 클라우드 배포 (Vercel + Render)

---

## 🏆 성공 지표 (KPI)

### MVP 목표
- [ ] 10명의 초기 사용자
- [ ] 100회 티켓 판매
- [ ] 10시간 누적 플레이 시간
- [ ] 0 크리티컬 버그

### Phase 2 목표
- [ ] 100명 사용자
- [ ] 10대 RC카 운영
- [ ] 커뮤니티 100명

---

## 💡 비즈니스 모델

### 수익원
1. **티켓 판매**: $0.5/10분
2. **하드웨어 키트**: $99 (조립 완제품)
3. **프리미엄**: $9.99/월 (무제한 플레이)
4. **스폰서십**: 아레나 브랜딩
5. **NFT**: RC카 소유권 증명서

### 시장 규모
- **RC 취미 시장**: $2B+ (글로벌)
- **Web3 게이밍**: $10B+ (성장 중)
- **IoT**: $500B+ (전체)

---

## 🔮 미래 비전

**Base Revolt의 최종 목표:**

> "Web3 자산이 현실 세계와 상호작용하는 새로운 경험 창조"

- 🏎️ 글로벌 레이싱 리그
- 🏗️ 협력형 샌드박스 빌딩
- 🤖 AI 기반 자율주행 미션
- 🌍 물리적 메타버스 구축

---

**📊 마지막 업데이트**: 2025년 10월 10일  
**📦 버전**: 1.0.0 (MVP)  
**👨‍💻 개발자**: 1인 개발 + Cursor AI  
**⚡ 개발 시간**: 24시간 (예상)

---

**🚗 Let's Revolt! 🚙**

