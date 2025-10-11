# 🚀 Base Revolt MVP 배포 가이드

이 문서는 Base Revolt를 처음부터 끝까지 배포하는 완전한 가이드입니다.

## 📋 준비물 체크리스트

### 하드웨어
- [ ] ESP32-CAM 모듈
- [ ] L298N 모터 드라이버
- [ ] RC카 섀시 (DC 모터 2개)
- [ ] FTDI USB 어댑터
- [ ] 배터리 (7-12V)
- [ ] 점퍼 케이블

### 소프트웨어
- [ ] Arduino IDE 설치
- [ ] Git 설치
- [ ] Node.js 설치 (v18 이상)
- [ ] MetaMask 브라우저 확장

### 계정
- [ ] GitHub 계정
- [ ] Render 계정 (무료)
- [ ] Vercel 계정 (무료)
- [ ] Coinbase Developer Portal 계정

### 자금
- [ ] Base ETH (~$10, 가스비 + 테스트용)

---

## 🔢 배포 순서 (중요!)

반드시 이 순서대로 진행하세요:

```
1. GitHub 리포지토리 생성
   ↓
2. Render: WebSocket 서버 배포
   ↓
3. Remix: 스마트 컨트랙트 배포 (Base 메인넷)
   ↓
4. Coinbase: OnchainKit API Key 발급
   ↓
5. Arduino: ESP32 펌웨어 업로드
   ↓
6. Vercel: 프론트엔드 배포
   ↓
7. 통합 테스트
```

---

## 📝 단계별 가이드

### 1단계: GitHub 리포지토리 생성

#### 1.1 새 리포지토리 생성
```bash
cd "Base Revolt"
git init
git add .
git commit -m "Initial commit: Base Revolt MVP"
```

#### 1.2 GitHub에 푸시
```bash
# GitHub에서 새 리포지토리 생성 후
git remote add origin https://github.com/YOUR_USERNAME/base-revolt.git
git branch -M main
git push -u origin main
```

---

### 2단계: Render 서버 배포

#### 2.1 Render 접속
https://render.com → Sign Up (GitHub 연동)

#### 2.2 새 Web Service 생성

1. Dashboard → **"New +"** → **"Web Service"**
2. GitHub 리포지토리 연결
3. 설정 입력:

| 항목 | 값 |
|------|-----|
| Name | `base-revolt-server` |
| Region | Singapore (또는 가장 가까운 곳) |
| Branch | `main` |
| Root Directory | `server` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | **Free** |

4. **"Create Web Service"** 클릭

#### 2.3 배포 완료 대기
- 2-3분 소요
- Logs 탭에서 진행 상황 확인
- "Your service is live 🎉" 메시지 확인

#### 2.4 URL 복사 및 저장
- 상단에 표시된 URL 복사
- 예: `https://base-revolt-server.onrender.com`
- **메모장에 저장** (나중에 사용)

#### 2.5 동작 확인
브라우저에서 `https://base-revolt-server.onrender.com` 접속

다음과 같은 JSON이 보이면 성공:
```json
{
  "status": "running",
  "service": "Base Revolt WebSocket Server",
  "clients": {
    "rcCar": "disconnected",
    "webUsers": 0
  }
}
```

✅ **2단계 완료!** Render URL을 메모했는지 확인하세요.

---

### 3단계: 스마트 컨트랙트 배포

#### 3.1 MetaMask에 Base 네트워크 추가

1. MetaMask 열기
2. 네트워크 드롭다운 → **"네트워크 추가"**
3. 다음 정보 입력:

| 항목 | 값 |
|------|-----|
| Network Name | Base Mainnet |
| RPC URL | `https://mainnet.base.org` |
| Chain ID | `8453` |
| Currency Symbol | ETH |
| Block Explorer | `https://basescan.org` |

4. **"저장"** 클릭

#### 3.2 Base ETH 준비

**방법 1: Coinbase에서 브릿지**
- Coinbase 앱/웹 → Base 네트워크 선택 → 전송

**방법 2: Base 공식 브릿지**
- https://bridge.base.org 접속
- Ethereum → Base로 브릿지 (최소 ~$10)

**필요 금액**: ~$5-10 (컨트랙트 배포 + 가스비)

#### 3.3 Remix IDE에서 배포

1. **Remix IDE 접속**: https://remix.ethereum.org

2. **파일 생성**:
   - 좌측 File Explorer → **"contracts"** 폴더 생성
   - **"TicketSale.sol"** 파일 생성
   - `contracts/TicketSale.sol` 내용 복사 붙여넣기

3. **컴파일**:
   - 좌측 **"Solidity Compiler"** 탭
   - Compiler: **0.8.20** 이상 선택
   - **"Compile TicketSale.sol"** 클릭
   - 녹색 체크 표시 확인

4. **배포**:
   - 좌측 **"Deploy & Run Transactions"** 탭
   - Environment: **"Injected Provider - MetaMask"** 선택
   - MetaMask 팝업 → Base Mainnet 선택 → 연결 승인
   - Contract: **"TicketSale"** 선택
   - **"Deploy"** 클릭
   - MetaMask 팝업 → 가스비 확인 → 승인

5. **배포 완료 대기**:
   - 하단 콘솔에 트랜잭션 확인
   - 30초~1분 소요

6. **컨트랙트 주소 복사**:
   - 하단 Deployed Contracts에서 주소 복사
   - 예: `0x1234567890abcdef1234567890abcdef12345678`
   - **메모장에 저장**

#### 3.4 (선택) 가격 조정

현재 기본값은 `0.0002 ETH`입니다. 실제 $0.5에 맞추려면:

1. ETH/USD 환율 확인: https://coinmarketcap.com/
2. 가격 계산: `0.5 / ETH가격 = X ETH`
3. Wei로 변환: https://eth-converter.com/
4. Remix에서 `updatePrice(새로운가격)` 함수 호출

**예시**: ETH가 $2500일 때
- `0.5 / 2500 = 0.0002 ETH`
- `0.0002 ETH = 200000000000000 wei`

✅ **3단계 완료!** 컨트랙트 주소를 메모했는지 확인하세요.

---

### 4단계: OnchainKit API Key 발급

#### 4.1 Coinbase Developer Portal 접속
https://portal.cdp.coinbase.com/

#### 4.2 로그인 또는 회원가입

#### 4.3 API Key 생성
1. **"Projects"** 또는 **"Create Project"** 클릭
2. 프로젝트 이름: `Base Revolt`
3. **"Create API Key"** 클릭
4. API Key 복사 (한 번만 표시됨!)
5. **메모장에 저장**

✅ **4단계 완료!** API Key를 안전하게 저장했는지 확인하세요.

---

### 5단계: ESP32 펌웨어 업로드

#### 5.1 Arduino IDE 설정

**ESP32 보드 매니저 추가**:
1. Arduino IDE → **파일** → **환경설정**
2. "추가 보드 매니저 URLs"에 추가:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. **도구** → **보드** → **보드 매니저**
4. "esp32" 검색 → **설치**

**라이브러리 설치**:
1. **스케치** → **라이브러리 포함하기** → **라이브러리 관리**
2. 다음 라이브러리 설치:
   - **WebSockets** by Markus Sattler
   - **ArduinoJson** by Benoit Blanchon

#### 5.2 코드 수정

`hardware/esp32_rc_car.ino` 파일을 열고 다음 수정:

```cpp
// WiFi 설정
const char* ssid = "YOUR_WIFI_SSID";           // ← 본인 WiFi 이름
const char* password = "YOUR_WIFI_PASSWORD";    // ← 본인 WiFi 비밀번호

// WebSocket 서버 설정
const char* ws_host = "base-revolt-server.onrender.com";  // ← Render URL (도메인만)
const int ws_port = 443;
const char* ws_path = "/";
const bool ws_ssl = true;
```

**⚠️ 주의**: `ws_host`는 도메인만 입력 (`https://` 제외)

#### 5.3 하드웨어 연결

**ESP32-CAM ↔ FTDI 연결**:
```
FTDI          ESP32-CAM
TX      →     RX (U0R)
RX      →     TX (U0T)
GND     →     GND
5V      →     5V
```

**부팅 모드 진입** (업로드 시만):
- GPIO 0 핀을 GND에 연결
- 전원 재인가 또는 리셋 버튼

#### 5.4 업로드

1. **도구** → **보드** → **ESP32 Arduino** → **AI Thinker ESP32-CAM**
2. **도구** → **포트** → USB 포트 선택
3. **업로드** 버튼 클릭 (→)
4. "Connecting..." 메시지 나오면 리셋 버튼 누르기
5. 업로드 완료 대기 (1-2분)

#### 5.5 업로드 후

- GPIO 0과 GND 연결 **제거**
- 리셋 버튼 누르기
- 시리얼 모니터 열기 (115200 baud)

#### 5.6 동작 확인

시리얼 모니터에서 다음 메시지 확인:
```
=== Base Revolt RC Car Starting ===
Connecting to WiFi: YOUR_WIFI_SSID
WiFi Connected!
IP Address: 192.168.1.xxx
Camera initialized successfully
Motors initialized
Setting up WebSocket...
[WS] Connected to server
```

✅ **5단계 완료!** ESP32가 WiFi와 서버에 연결되었습니다.

---

### 6단계: Vercel 프론트엔드 배포

#### 6.1 설정 파일 업데이트

**frontend/src/config/contracts.js** 수정:
```javascript
// 3단계에서 복사한 컨트랙트 주소
export const TICKET_CONTRACT_ADDRESS = "0x1234..."; 

// 2단계에서 복사한 Render URL (wss:// 사용!)
export const WS_SERVER_URL = "wss://base-revolt-server.onrender.com";
```

**변경사항 커밋**:
```bash
git add frontend/src/config/contracts.js
git commit -m "Update contract address and WebSocket URL"
git push
```

#### 6.2 Vercel 접속
https://vercel.com → Sign Up (GitHub 연동)

#### 6.3 프로젝트 Import

1. Dashboard → **"Add New..."** → **"Project"**
2. GitHub 리포지토리 선택: `base-revolt`
3. **"Import"** 클릭

#### 6.4 프로젝트 설정

| 항목 | 값 |
|------|-----|
| Framework Preset | **Vite** |
| Root Directory | `frontend` |
| Build Command | `npm run build` (자동 설정됨) |
| Output Directory | `dist` (자동 설정됨) |

#### 6.5 환경 변수 추가

**"Environment Variables"** 섹션에서:

| Name | Value |
|------|-------|
| `VITE_ONCHAINKIT_API_KEY` | 4단계에서 복사한 API Key |
| `VITE_WS_SERVER_URL` | `wss://base-revolt-server.onrender.com` |

#### 6.6 배포

1. **"Deploy"** 클릭
2. 배포 진행 (2-3분)
3. 배포 완료 시 **"Visit"** 클릭

#### 6.7 배포 URL 확인
- 예: `https://base-revolt.vercel.app`
- **메모장에 저장**

✅ **6단계 완료!** 웹앱이 배포되었습니다!

---

### 7단계: 통합 테스트

#### 7.1 RC카 하드웨어 조립

**ESP32-CAM + L298N 연결**:
```
ESP32-CAM          L298N
GPIO 12    →      IN1 (좌측 모터)
GPIO 13    →      IN2 (좌측 모터)
GPIO 14    →      IN3 (우측 모터)
GPIO 15    →      IN4 (우측 모터)
5V         →      VCC
GND        →      GND
```

**L298N + 모터 연결**:
```
L298N              RC카 모터
OUT1, OUT2  →     좌측 DC 모터
OUT3, OUT4  →     우측 DC 모터
```

**전원**:
- ESP32-CAM: 5V 전원 (배터리 또는 USB)
- L298N: 7-12V 배터리

#### 7.2 웹앱 테스트

1. **웹앱 접속**: `https://base-revolt.vercel.app`
2. **지갑 연결**: "Connect Wallet" 클릭
3. **RC카 상태 확인**: 상단에 "RC카 연결됨" 표시 확인
4. **데모 모드 테스트**: "데모 체험하기" 클릭 → UI 확인
5. **홈으로 복귀**

#### 7.3 결제 테스트

1. **MetaMask Base 전환**: Base Mainnet 선택
2. **티켓 구매**: "티켓 구매하기" ($0.5)
3. **트랜잭션 승인**: MetaMask에서 확인
4. **플레이 페이지 이동**: 자동으로 이동

#### 7.4 조종 테스트

1. **영상 확인**: RC카 카메라 영상이 보이는지
2. **키보드 조종**:
   - W (전진)
   - S (후진)
   - A (좌회전)
   - D (우회전)
3. **터치 조종**: 화면 버튼 클릭
4. **RC카 동작 확인**: 실제로 움직이는지

#### 7.5 타이머 확인
- 10분 카운트다운 작동하는지
- 시간 종료 시 홈으로 이동하는지

---

## ✅ 배포 완료 체크리스트

- [ ] Render 서버 배포 완료
- [ ] 서버 상태 확인 (https://your-render-url.com)
- [ ] 스마트 컨트랙트 Base 메인넷 배포
- [ ] Basescan에서 컨트랙트 확인
- [ ] OnchainKit API Key 발급
- [ ] ESP32 펌웨어 업로드 완료
- [ ] ESP32 WiFi 연결 확인
- [ ] ESP32 WebSocket 연결 확인
- [ ] RC카 하드웨어 조립 완료
- [ ] Vercel 프론트엔드 배포
- [ ] 웹앱 접속 확인
- [ ] 지갑 연결 테스트
- [ ] 티켓 구매 테스트
- [ ] RC카 조종 테스트
- [ ] 영상 스트림 확인

---

## 🐛 문제 해결

### ESP32가 WiFi에 연결 안됨
- SSID/비밀번호 재확인
- 2.4GHz WiFi인지 확인 (5GHz 불가)
- 공유기 가까이에서 테스트

### ESP32가 서버에 연결 안됨
- Render URL이 올바른지 확인 (도메인만)
- `ws_ssl = true` 설정 확인
- 방화벽 확인

### 웹에서 RC카가 안보임
- Render 서버가 Running 상태인지
- ESP32가 서버에 연결되었는지
- 시리얼 모니터로 ESP32 로그 확인

### 모터가 안움직임
- L298N 연결 재확인
- 모터 극성 바꿔보기
- 배터리 전압 확인

### 지갑 연결 안됨
- MetaMask Base 네트워크 선택
- OnchainKit API Key 확인

### 결제 실패
- Base ETH 잔액 확인
- 컨트랙트 주소 재확인
- 네트워크가 Base Mainnet인지 확인

---

## 📞 지원

문제가 계속되면:
- GitHub Issues: [링크]
- Discord: [링크]
- Email: [이메일]

---

## 🎉 축하합니다!

Base Revolt MVP 배포 완료! 🚀

이제 친구들에게 자랑하고 RC카를 조종해보세요!

**다음 단계**:
- AR 기능 추가
- 멀티플레이어 구현
- NFT 소유권 시스템
- 글로벌 아레나 확장

**Let's Revolt! 🚗🚙**

