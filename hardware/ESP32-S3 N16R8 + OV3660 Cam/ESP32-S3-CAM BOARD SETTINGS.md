# ESP32-S3 N16R8 보드 설정 가이드

## Arduino IDE 보드 설정

ESP32-S3 N16R8 펌웨어를 업로드하기 전에 다음 설정을 확인하세요:

### 1. 보드 선택
- **Tools → Board → ESP32 Arduino → ESP32S3 Dev Module**

### 2. 핵심 설정
- **USB CDC On Boot**: `Enabled` (시리얼 모니터 사용)
- **USB DFU On Boot**: `Disabled`
- **USB Firmware MSC On Boot**: `Disabled`
- **USB Mode**: `Hardware CDC and JTAG`
- **CPU Frequency**: `240MHz (WiFi/BT)`
- **Flash Size**: `16MB (128Mb)` (N16R8의 경우)
- **Partition Scheme**: `Huge APP (3MB No OTA/1MB SPIFFS)`
- **PSRAM**: `OPI PSRAM` (중요!)
- **Arduino Runs On**: `Core 1`
- **Events Run On**: `Core 1`
- **Flash Mode**: `QIO`
- **Flash Frequency**: `80MHz`
- **Upload Speed**: `921600` (또는 `115200`)

### 3. 포트 선택
- **Tools → Port → COMx** (ESP32-S3이 연결된 포트 선택)
- USB로 직접 연결 가능 (USB CDC 지원)

### 4. PSRAM 설정 (중요!)

ESP32-S3 N16R8은 **8MB PSRAM**을 가지고 있으므로 반드시 활성화해야 합니다:

- **PSRAM**: `OPI PSRAM` 선택
- PSRAM이 활성화되지 않으면 카메라 초기화 실패 가능
- 시리얼 모니터에서 `PSRAM detected: yes` 확인

### 5. 업로드 방법

ESP32-S3은 USB 포트가 있어서 **USB 케이블로 직접 업로드** 가능합니다.

#### USB 업로드:
1. **USB 케이블로 ESP32-S3을 PC에 연결**
2. **Arduino IDE에서 Upload 클릭**
3. 업로드 시작 시 **BOOT 버튼을 누른 상태로 유지**
4. "Connecting..." 메시지가 나타나면 **RESET 버튼 한 번 누르기**
5. 업로드가 시작되면 **BOOT 버튼 놓기**

#### 부팅 모드 진입 실패 시:
- **BOOT 버튼을 누른 상태에서 RESET 버튼 누르기**
- **RESET 버튼을 놓고 BOOT 버튼도 놓기**
- 다시 업로드 시도

### 6. 시리얼 모니터 설정
- **Tools → Serial Monitor**
- **Baud Rate**: `115200`
- **Line ending**: `Both NL & CR` (또는 `Newline`)

### 7. 문제 해결

#### 업로드 실패 시:
1. **BOOT/RESET 버튼 타이밍 확인**
2. **USB 드라이버 확인** (CP2102, CH340 등)
3. **Upload Speed를 115200으로 낮추기**
4. **USB 케이블 교체** (데이터 전송 가능한 케이블)
5. **다른 USB 포트 시도**

#### PSRAM이 감지되지 않을 때:
- **Tools → PSRAM → OPI PSRAM** 선택 확인
- ❌ `Disabled`가 선택되어 있으면 안 됩니다!
- 보드에 실제로 "ESP32-S3 N16R8"이라고 표시되어 있는지 확인
- 다른 모델(예: ESP32-S3 N8R2)일 경우 PSRAM이 없을 수 있음

#### PSRAM 옵션이 보이지 않는 경우:

**해결 방법 1: ESP32 보드 패키지 업데이트**
1. **Tools → Board → Boards Manager**
2. "esp32" 검색
3. **esp32 by Espressif Systems** 최신 버전 설치/업데이트
4. Arduino IDE 재시작

**해결 방법 2: 보드 모델 확인**
- 보드에 실제로 "ESP32-S3 N16R8"이라고 표시되어 있는지 확인
- 다른 모델(예: ESP32-S3 N8R2)일 경우 PSRAM이 없을 수 있음

**확인 방법:**
업로드 후 시리얼 모니터에서:
```
PSRAM: YES  ← 이렇게 나와야 함
Free PSRAM: XXXXX bytes
Total PSRAM: XXXXX bytes
```

만약 `PSRAM: NO`가 나오면:
1. 보드 설정에서 PSRAM 옵션 확인
2. ESP32 보드 패키지 업데이트
3. 보드 모델 재확인

#### 카메라 초기화 실패:
- **PSRAM 설정 확인** (OPI PSRAM 활성화)
- **카메라 핀맵 확인** (OV3660 기준)
- **FPC 케이블 연결 확인**
- **전원 공급 확인** (5V, 최소 2A 권장)

#### 시리얼 모니터가 깨진 문자 표시:
- **Baud Rate를 115200으로 설정**
- **USB CDC On Boot: Enabled** 확인

### 8. 권장 설정 요약

```
Board: "ESP32S3 Dev Module"
USB CDC On Boot: Enabled
CPU Frequency: 240MHz (WiFi/BT)
Flash Size: 16MB (128Mb)
Partition Scheme: Huge APP (3MB No OTA/1MB SPIFFS)
PSRAM: OPI PSRAM
Arduino Runs On: Core 1
Events Run On: Core 1
Flash Mode: QIO
Flash Frequency: 80MHz
Upload Speed: 921600 (또는 115200)
Port: COMx (사용자 환경에 맞게)
```

### 9. 참고 사항

- **ESP32-S3 N16R8은 8MB PSRAM**을 가지고 있어 고해상도 카메라 스트리밍 가능
- PSRAM이 활성화되면 VGA (640x480) 해상도 사용
- PSRAM이 없으면 QVGA (320x240) 또는 QQVGA (160x120) 사용

### 10. 라이브러리 요구사항

다음 라이브러리가 설치되어 있어야 합니다:
- **WebSockets** by Markus Sattler (v2.4.1 이상)
- **ArduinoJson** by Benoit Blanchon (v6.21.0 이상)
- **esp32-camera** (ESP32 보드 패키지에 포함됨)

---

**작성일**: 2025-11-13  
**버전**: v2.0  
**대상 보드**: ESP32-S3 N16R8  
**카메라 모듈**: OV3660-75mm-2764v1

