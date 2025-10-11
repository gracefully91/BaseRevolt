# ESP32-CAM RC Car 펌웨어

## 필요한 하드웨어
- ESP32-CAM (AI-Thinker 모델)
- L298N 모터 드라이버
- RC카 섀시 (2개의 DC 모터)
- 5V 전원 공급 장치

## 회로 연결

### ESP32-CAM → L298N
- GPIO 12 → IN1 (좌측 모터)
- GPIO 13 → IN2 (좌측 모터)
- GPIO 14 → IN3 (우측 모터)
- GPIO 15 → IN4 (우측 모터)
- 5V → VCC
- GND → GND

### L298N → DC 모터
- OUT1, OUT2 → 좌측 모터
- OUT3, OUT4 → 우측 모터

### 전원
- ESP32-CAM: 5V 전원 (3.3V 사용 금지!)
- L298N: 별도 배터리 (7-12V)

## Arduino IDE 설정

### 1. 보드 매니저 설정
1. `파일` → `환경설정` → `추가 보드 매니저 URLs`에 추가:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```

2. `도구` → `보드` → `보드 매니저`에서 "esp32" 검색 후 설치

### 2. 필요한 라이브러리 설치
`스케치` → `라이브러리 포함하기` → `라이브러리 관리`에서 다음 설치:
- **WebSockets** by Markus Sattler (v2.3.6 이상)
- **ArduinoJson** by Benoit Blanchon (v6.21.0 이상)

### 3. 보드 설정
- 보드: "AI Thinker ESP32-CAM"
- Upload Speed: 115200
- Flash Frequency: 80MHz
- Flash Mode: QIO
- Partition Scheme: "Huge APP (3MB No OTA)"

## 업로드 방법

### 1. FTDI 연결 (초기 업로드)
ESP32-CAM에는 USB 포트가 없으므로 FTDI 어댑터 필요:
- FTDI TX → ESP32 RX (U0R)
- FTDI RX → ESP32 TX (U0T)
- FTDI GND → ESP32 GND
- FTDI 5V → ESP32 5V

### 2. 부팅 모드 진입
- GPIO 0을 GND에 연결
- 전원 재인가 (리셋 버튼)
- 업로드 시작
- 업로드 완료 후 GPIO 0 분리
- 다시 리셋

### 3. 코드 수정
`esp32_rc_car.ino` 파일에서 다음을 수정:
```cpp
const char* ssid = "YOUR_WIFI_SSID";        // 본인 WiFi SSID
const char* password = "YOUR_WIFI_PASSWORD"; // 본인 WiFi 비밀번호
const char* ws_host = "your-render-app.onrender.com"; // Render 배포 후 주소
```

## 시리얼 모니터 확인
- Baud Rate: 115200
- 연결 상태, IP 주소, WebSocket 연결 상태 확인 가능

## 트러블슈팅

### 카메라 초기화 실패
- 5V 전원 확인 (3.3V는 부족)
- 연결 재확인
- 보드 리셋

### WiFi 연결 실패
- SSID/비밀번호 재확인
- 2.4GHz WiFi만 지원 (5GHz 불가)

### WebSocket 연결 실패
- 서버 주소 확인
- 서버가 실행 중인지 확인
- 네트워크 방화벽 확인

### 모터 작동 안함
- L298N 연결 재확인
- 전원 공급 확인
- 모터 극성 바꿔보기

