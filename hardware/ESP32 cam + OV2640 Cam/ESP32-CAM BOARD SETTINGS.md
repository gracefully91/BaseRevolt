# ESP32-CAM (AI-Thinker) 보드 설정 가이드

## Arduino IDE 보드 설정

ESP32-CAM 펌웨어를 업로드하기 전에 다음 설정을 확인하세요:

### 1. 보드 선택
- **Tools → Board → ESP32 Arduino → AI Thinker ESP32-CAM**

### 2. 핵심 설정
- **Upload Speed**: `115200`
- **CPU Frequency**: `240MHz (WiFi/BT)`
- **Flash Frequency**: `80MHz`
- **Flash Mode**: `QIO`
- **Flash Size**: `4MB (32Mb)`
- **Partition Scheme**: `Huge APP (3MB No OTA/1MB SPIFFS)`
- **Core Debug Level**: `Info` (또는 `None`)

### 3. 포트 선택
- **Tools → Port → COMx** (ESP32-CAM이 연결된 포트 선택)

### 4. PSRAM 설정
- **PSRAM**: `Disabled` (또는 옵션이 없으면 무시)
  - **ESP32-CAM (AI-Thinker) 기본 모델은 PSRAM이 없습니다**
  - PSRAM 옵션이 보이지 않으면 정상입니다 (이 보드에는 없음)
  - 코드에서 자동으로 PSRAM 감지 후 QVGA (320x240) 해상도 사용
  - PSRAM이 없으므로 VGA 해상도는 사용 불가

### 5. 업로드 방법

ESP32-CAM은 USB 포트가 없으므로 **FTDI 어댑터** 또는 **USB-to-Serial 변환기**가 필요합니다.

#### FTDI 연결 방법:
1. **GPIO 0을 GND에 연결** (부팅 모드 진입)
2. **전원 공급** (5V)
3. **Arduino IDE에서 Upload 클릭**
4. "Connecting..." 메시지가 나타나면 **GPIO 0 연결 해제**
5. 업로드 완료 후 **리셋 버튼** 누르기

#### USB-to-Serial 변환기 연결:
```
FTDI/CP2102 → ESP32-CAM
TX → RX (U0R)
RX → TX (U0T)
GND → GND
5V → 5V
```

### 6. 시리얼 모니터 설정
- **Tools → Serial Monitor**
- **Baud Rate**: `115200`
- **Line ending**: `Both NL & CR` (또는 `Newline`)

### 7. 문제 해결

#### 업로드 실패 시:
1. **GPIO 0이 GND에 연결되어 있는지 확인**
2. **전원 공급 확인** (5V, 최소 500mA)
3. **USB 드라이버 확인** (CP2102, CH340 등)
4. **Upload Speed를 115200으로 낮추기**
5. **FTDI/변환기 연결 재확인**

#### 시리얼 모니터가 깨진 문자 표시:
- **Baud Rate를 115200으로 설정**
- **Line ending 설정 확인**

#### 카메라 초기화 실패:
- **5V 전원 공급 확인** (3.3V는 부족)
- **카메라 모듈 연결 확인** (FPC 케이블)
- **핀맵 확인** (AI-Thinker 표준 핀맵 사용)

### 8. 권장 설정 요약

```
Board: "AI Thinker ESP32-CAM"
Upload Speed: 115200
CPU Frequency: 240MHz (WiFi/BT)
Flash Frequency: 80MHz
Flash Mode: QIO
Flash Size: 4MB (32Mb)
Partition Scheme: Huge APP (3MB No OTA/1MB SPIFFS)
PSRAM: Disabled
Core Debug Level: Info
Port: COMx (사용자 환경에 맞게)
```

### 9. 참고 사항

- **ESP32-CAM (AI-Thinker) 기본 모델은 PSRAM이 없습니다**
- 메모리 제약으로 인해 **QVGA (320x240) 해상도만 사용 가능**
- VGA (640x480) 해상도는 메모리 부족으로 사용 불가
- 코드에서 자동으로 PSRAM 감지 후 적절한 해상도 선택
- 일부 고급 ESP32-CAM 모델은 PSRAM이 있을 수 있지만, 기본 모델은 없음

### 10. 라이브러리 요구사항

다음 라이브러리가 설치되어 있어야 합니다:
- **WebSockets** by Markus Sattler (v2.4.1 이상)
- **ArduinoJson** by Benoit Blanchon (v6.21.0 이상)
- **esp32-camera** (ESP32 보드 패키지에 포함됨)

---

**작성일**: 2025-11-13  
**버전**: v2.0  
**대상 보드**: AI-Thinker ESP32-CAM  
**카메라 모듈**: OV2640

