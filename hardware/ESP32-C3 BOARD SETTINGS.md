# ESP32-C3 SuperMini 보드 설정 가이드

## Arduino IDE 보드 설정

ESP32-C3 SuperMini 펌웨어를 업로드하기 전에 다음 설정을 확인하세요:

### 1. 보드 선택
- **Tools → Board → ESP32 Arduino → ESP32C3 Dev Module**

### 2. 핵심 설정
- **Upload Speed**: `921600` (또는 `115200`)
- **CPU Frequency**: `160MHz` (또는 `80MHz`)
- **Flash Frequency**: `80MHz`
- **Flash Mode**: `QIO`
- **Flash Size**: `4MB (32Mb)`
- **Partition Scheme**: `Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)`
- **Core Debug Level**: `Info` (또는 `None`)

### 3. 포트 선택
- **Tools → Port → COMx** (ESP32-C3 SuperMini이 연결된 포트 선택)
- USB-C 케이블로 직접 연결 가능

### 4. 업로드 방법

ESP32-C3 SuperMini은 **USB-C 포트**가 있어서 **USB 케이블로 직접 업로드** 가능합니다.

#### USB 업로드:
1. **USB-C 케이블로 ESP32-C3 SuperMini을 PC에 연결**
2. **Arduino IDE에서 Upload 클릭**
3. 업로드 시작 시 **BOOT 버튼을 누른 상태로 유지**
4. "Connecting..." 메시지가 나타나면 **RESET 버튼 한 번 누르기**
5. 업로드가 시작되면 **BOOT 버튼 놓기**

#### 부팅 모드 진입 실패 시:
- **BOOT 버튼을 누른 상태에서 RESET 버튼 누르기**
- **RESET 버튼을 놓고 BOOT 버튼도 놓기**
- 다시 업로드 시도

### 5. 시리얼 모니터 설정
- **Tools → Serial Monitor**
- **Baud Rate**: `115200`
- **Line ending**: `Both NL & CR` (또는 `Newline`)

### 6. 문제 해결

#### 업로드 실패 시:
1. **BOOT/RESET 버튼 타이밍 확인**
2. **USB 드라이버 확인** (CP2102, CH340 등)
3. **Upload Speed를 115200으로 낮추기**
4. **USB 케이블 교체** (데이터 전송 가능한 케이블)
5. **다른 USB 포트 시도**

#### 시리얼 모니터가 깨진 문자 표시:
- **Baud Rate를 115200으로 설정**
- **Line ending 설정 확인**

#### WiFi 연결 실패:
- **SSID/비밀번호 확인**
- **2.4GHz WiFi만 지원** (5GHz 불가)
- **신호 강도 확인**

#### WebSocket 연결 실패:
- **서버 주소 확인** (도메인만, https:// 제외)
- **서버가 실행 중인지 확인**
- **네트워크 방화벽 확인**

### 7. 권장 설정 요약

```
Board: "ESP32C3 Dev Module"
Upload Speed: 921600 (또는 115200)
CPU Frequency: 160MHz
Flash Frequency: 80MHz
Flash Mode: QIO
Flash Size: 4MB (32Mb)
Partition Scheme: Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)
Core Debug Level: Info
Port: COMx (사용자 환경에 맞게)
```

### 8. 참고 사항

- **ESP32-C3 SuperMini은 RISC-V 코어**를 사용합니다
- **WiFi 지원** (2.4GHz만)
- **USB-C 포트**로 직접 업로드 가능
- **모터 제어 전용** (카메라 없음)
- **ESP32-CAM 또는 ESP32-S3 카메라와 함께 사용 가능**

### 9. 라이브러리 요구사항

다음 라이브러리가 설치되어 있어야 합니다:
- **WebSockets** by Markus Sattler (v2.4.1 이상)
- **ArduinoJson** by Benoit Blanchon (v6.21.0 이상)

### 10. GPIO 핀맵 (ESP32-C3 SuperMini)

```
GPIO 3  → MOTOR_DRIVE_IN1 (구동 모터 IN1)
GPIO 4  → MOTOR_DRIVE_IN2 (구동 모터 IN2)
GPIO 6  → MOTOR_STEER_IN3 (스티어링 모터 IN3)
GPIO 7  → MOTOR_STEER_IN4 (스티어링 모터 IN4)
GPIO 8  → STATUS_LED (상태 표시 LED)
```

### 11. L298N 모터 드라이버 연결

```
ESP32-C3 SuperMini → L298N
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GPIO 3              → IN1 (구동 모터)
GPIO 4              → IN2 (구동 모터)
GPIO 6              → IN3 (스티어링 모터)
GPIO 7              → IN4 (스티어링 모터)
5V                  → 5V (로직 전원)
GND                 → GND

L298N → 모터 & 배터리
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUT1, OUT2          → 구동 모터 (앞뒤 바퀴)
OUT3, OUT4          → 스티어링 모터 (앞바퀴 방향)
VIN (12V)           → 배터리 + (7-12V)
GND                 → 배터리 -
ENA 점퍼            → ON (점퍼 연결)
ENB 점퍼            → ON (점퍼 연결)
```

---

**작성일**: 2025-11-13  
**버전**: v2.0  
**대상 보드**: ESP32-C3 SuperMini  
**용도**: 조종 전용 (모든 카메라 모델과 호환)

