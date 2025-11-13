# ESP32-S3 N16R8 보드 설정 가이드

## Arduino IDE 보드 설정

### 1. 보드 선택
- **Tools → Board → ESP32 Arduino → ESP32S3 Dev Module**

### 2. PSRAM 설정 (중요!)
- **Tools → PSRAM → OPI PSRAM** (또는 **QSPI PSRAM**)
- ❌ `Disabled`가 선택되어 있으면 안 됩니다!

### 3. Partition Scheme
- **Tools → Partition Scheme → Huge APP (3MB No OTA/1MB SPIFFS)**
- 또는 **8M with spiffs (3MB APP/1.5MB SPIFFS)**

### 4. 기타 설정
- **Upload Speed**: 921600 (또는 115200)
- **CPU Frequency**: 240MHz
- **Flash Frequency**: 80MHz
- **Flash Mode**: QIO
- **Flash Size**: 16MB (N16R8의 경우)

## PSRAM 옵션이 보이지 않는 경우

### 해결 방법 1: ESP32 보드 패키지 업데이트
1. **Tools → Board → Boards Manager**
2. "esp32" 검색
3. **esp32 by Espressif Systems** 최신 버전 설치/업데이트
4. Arduino IDE 재시작

### 해결 방법 2: 보드 모델 확인
- 보드에 실제로 "ESP32-S3 N16R8"이라고 표시되어 있는지 확인
- 다른 모델(예: ESP32-S3 N8R2)일 경우 PSRAM이 없을 수 있음

## 확인 방법

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

