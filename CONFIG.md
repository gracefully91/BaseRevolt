# ⚙️ Base Revolt 설정 가이드

이 문서는 Base Revolt MVP의 모든 설정을 정리한 참고 자료입니다.

---

## 📝 설정 파일 위치

```
Base Revolt/
├── hardware/esp32_rc_car.ino          # ESP32 설정
├── server/index.js                    # 서버 설정 (없음)
├── frontend/
│   ├── .env                           # 환경 변수 (생성 필요)
│   └── src/config/
│       ├── wagmi.js                   # Wagmi 설정
│       └── contracts.js               # 컨트랙트 설정
└── contracts/TicketSale.sol           # 컨트랙트 파라미터
```

---

## 🔧 1. ESP32 펌웨어 설정

### 파일: `hardware/esp32_rc_car.ino`

#### WiFi 설정
```cpp
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

**변경 필요**: ✅ 필수  
**시기**: 펌웨어 업로드 전  
**값**: 본인의 WiFi SSID와 비밀번호

**⚠️ 주의사항**:
- 2.4GHz WiFi만 지원 (5GHz 불가)
- 공백이나 특수문자 포함 가능
- 대소문자 구분

#### WebSocket 서버 설정
```cpp
const char* ws_host = "your-render-app.onrender.com";
const int ws_port = 443;
const char* ws_path = "/";
const bool ws_ssl = true;
```

**변경 필요**: ✅ 필수 (배포 후)  
**시기**: Render 배포 완료 후  
**값**: Render 배포 URL의 도메인 부분만

**예시**:
- Render URL: `https://base-revolt-server.onrender.com`
- `ws_host`: `"base-revolt-server.onrender.com"`

**로컬 개발**:
```cpp
const char* ws_host = "192.168.1.100";  // 본인 PC IP
const int ws_port = 8080;
const bool ws_ssl = false;
```

#### 모터 핀 설정
```cpp
#define MOTOR_LEFT_IN1  12
#define MOTOR_LEFT_IN2  13
#define MOTOR_RIGHT_IN3 14
#define MOTOR_RIGHT_IN4 15
```

**변경 필요**: ⚠️ 선택 (회로 변경 시만)  
**기본값 사용 권장**

#### 카메라 설정
```cpp
config.frame_size = FRAMESIZE_QVGA;  // 320x240
config.jpeg_quality = 12;             // 0-63 (낮을수록 고품질)
config.fb_count = 2;                  // 프레임 버퍼 수
```

**변경 가능**:
- `FRAMESIZE_QQVGA` (160x120) - 낮은 대역폭
- `FRAMESIZE_QVGA` (320x240) - 권장 ✅
- `FRAMESIZE_VGA` (640x480) - 높은 품질

#### 프레임레이트 설정
```cpp
const int frameInterval = 66;  // ~15 FPS (1000ms / 15)
```

**변경 가능**:
- 33ms = ~30 FPS (높은 대역폭 필요)
- 66ms = ~15 FPS (권장) ✅
- 100ms = ~10 FPS (저속 네트워크)

---

## 🌐 2. 프론트엔드 설정

### 2.1 환경 변수

#### 파일: `frontend/.env` (생성 필요)

```env
VITE_ONCHAINKIT_API_KEY=your_api_key_here
VITE_WS_SERVER_URL=wss://your-render-app.onrender.com
```

**생성 방법**:
```bash
cd frontend
# 텍스트 에디터로 .env 파일 생성
```

**변경 필요**: ✅ 필수  
**시기**: 로컬 개발 또는 Vercel 배포 시

**OnchainKit API Key 발급**:
1. https://portal.cdp.coinbase.com/ 접속
2. 로그인 또는 회원가입
3. "Create API Key" 클릭
4. 복사하여 붙여넣기

**WebSocket URL**:
- 로컬: `ws://localhost:8080`
- Render: `wss://your-app.onrender.com` (wss:// 필수!)

### 2.2 Wagmi 설정

#### 파일: `frontend/src/config/wagmi.js`

```javascript
export const config = createConfig({
  chains: [base],  // Base 메인넷만 사용
  connectors: [
    coinbaseWallet({
      appName: 'Base Revolt',
      preference: 'smartWalletOnly',
    }),
  ],
  transports: {
    [base.id]: http(),
  },
})
```

**변경 필요**: ❌ 기본값 사용  
**변경 가능**:
- `appName`: 앱 이름 변경
- `chains`: 다른 네트워크 추가 (예: baseGoerli)

### 2.3 컨트랙트 설정

#### 파일: `frontend/src/config/contracts.js`

```javascript
export const TICKET_CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000";
export const WS_SERVER_URL = import.meta.env.VITE_WS_SERVER_URL || "wss://your-render-app.onrender.com";
```

**변경 필요**: ✅ 필수  
**시기**: 스마트 컨트랙트 배포 후

**컨트랙트 주소**:
- Remix IDE에서 배포 후 복사
- 예: `0x1234567890abcdef1234567890abcdef12345678`

**ABI**:
- 이미 포함되어 있음 (변경 불필요)
- 컨트랙트 수정 시 Remix에서 새 ABI 복사

---

## 🗄️ 3. 서버 설정

### 파일: `server/index.js`

```javascript
const PORT = process.env.PORT || 8080;
```

**변경 필요**: ❌ 기본값 사용  
**Render**: 자동으로 PORT 환경 변수 설정

**추가 환경 변수 (선택)**:
Render Dashboard → Environment 탭에서 추가 가능

```
NODE_ENV=production
LOG_LEVEL=info
```

---

## 🔗 4. 스마트 컨트랙트 설정

### 파일: `contracts/TicketSale.sol`

```solidity
uint256 public ticketPrice = 0.0002 ether;
```

**변경 필요**: ⚠️ 선택 (환율 변동 시)  
**시기**: 배포 전 또는 배포 후 `updatePrice()` 호출

**가격 계산**:
1. ETH/USD 환율 확인: https://coinmarketcap.com/
2. 계산: `0.5 / ETH가격 = X ETH`
3. Wei 변환: https://eth-converter.com/

**예시**:
- ETH = $2500 → `0.5 / 2500 = 0.0002 ETH`
- ETH = $2000 → `0.5 / 2000 = 0.00025 ETH`

---

## 📊 5. 전체 설정 체크리스트

### 배포 전
- [ ] ESP32: WiFi SSID/비밀번호 설정
- [ ] OnchainKit API Key 발급
- [ ] .env 파일 생성 (로컬 개발)

### Render 배포 후
- [ ] ESP32: `ws_host` 업데이트
- [ ] Frontend: `WS_SERVER_URL` 업데이트

### 스마트 컨트랙트 배포 후
- [ ] Frontend: `TICKET_CONTRACT_ADDRESS` 업데이트
- [ ] 가격 조정 (필요 시)

### Vercel 배포 시
- [ ] 환경 변수 2개 추가:
  - `VITE_ONCHAINKIT_API_KEY`
  - `VITE_WS_SERVER_URL`

---

## 🔍 6. 설정 검증

### ESP32 연결 확인
시리얼 모니터 (115200 baud):
```
WiFi Connected!
IP Address: 192.168.1.xxx
[WS] Connected to server
```

### 서버 상태 확인
브라우저에서 `https://your-render-app.onrender.com`:
```json
{
  "status": "running",
  "clients": {
    "rcCar": "connected",
    "webUsers": 0
  }
}
```

### 프론트엔드 확인
브라우저 콘솔 (F12):
```
✅ WebSocket connected
✅ RC Car connected
```

---

## 🐛 7. 설정 트러블슈팅

### ESP32가 WiFi에 연결 안됨
```cpp
// 디버그: 시리얼 모니터 확인
Serial.println(WiFi.status());
// 0 = WL_IDLE_STATUS
// 3 = WL_CONNECTED
// 6 = WL_DISCONNECTED
```

**해결책**:
- SSID/비밀번호 재확인
- 2.4GHz WiFi인지 확인
- 공유기 재부팅

### ESP32가 서버에 연결 안됨
```cpp
// 디버그: ws_ssl 설정 확인
const bool ws_ssl = true;  // Render는 true
const int ws_port = 443;   // SSL은 443
```

**해결책**:
- Render URL 재확인 (도메인만)
- 방화벽 확인
- 서버 로그 확인

### 프론트엔드 WebSocket 연결 실패
```javascript
// 디버그: URL 확인
console.log(WS_SERVER_URL);  // "wss://..." 확인
```

**해결책**:
- `wss://` 프로토콜 확인 (https 아님!)
- 환경 변수 재확인
- Render 서버 깨우기 (첫 연결 시)

### 지갑 연결 실패
```javascript
// 디버그: API Key 확인
console.log(import.meta.env.VITE_ONCHAINKIT_API_KEY);
```

**해결책**:
- API Key 재확인
- Vercel 환경 변수 확인
- 브라우저 캐시 삭제

### 결제 실패
```javascript
// 디버그: 컨트랙트 주소 확인
console.log(TICKET_CONTRACT_ADDRESS);
```

**해결책**:
- 컨트랙트 주소 재확인
- Base 네트워크 선택 확인
- ETH 잔액 확인

---

## 📋 8. 환경별 설정 요약

### 로컬 개발
```
ESP32:
- ws_host = "192.168.1.xxx" (본인 PC IP)
- ws_port = 8080
- ws_ssl = false

Frontend .env:
- VITE_WS_SERVER_URL=ws://localhost:8080

Server:
- npm start (포트 8080)
```

### 프로덕션
```
ESP32:
- ws_host = "your-app.onrender.com"
- ws_port = 443
- ws_ssl = true

Vercel 환경 변수:
- VITE_ONCHAINKIT_API_KEY=xxx
- VITE_WS_SERVER_URL=wss://your-app.onrender.com

Frontend config:
- TICKET_CONTRACT_ADDRESS=0x...
```

---

## 🔐 9. 보안 설정 (프로덕션)

현재 MVP는 기본 보안만 적용되어 있습니다.

### 프로덕션 강화 권장
```javascript
// 서버: Rate limiting
const rateLimit = require('express-rate-limit');

// 서버: Origin 체크
const allowedOrigins = ['https://your-app.vercel.app'];

// 컨트랙트: Ownable, Pausable
import "@openzeppelin/contracts/access/Ownable.sol";
```

---

## 📚 10. 추가 자료

- [ESP32 핀아웃](https://randomnerdtutorials.com/esp32-pinout-reference-gpios/)
- [Base 네트워크 정보](https://docs.base.org/)
- [OnchainKit 문서](https://onchainkit.xyz/)
- [Wagmi 설정](https://wagmi.sh/core/getting-started)

---

**🔧 설정 완료 시 [DEPLOYMENT.md](DEPLOYMENT.md)로 이동하세요!**

