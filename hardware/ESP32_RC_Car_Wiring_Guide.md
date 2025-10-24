# ESP32 RC Car 하드웨어 연결 가이드

## 📋 필요한 부품

### 필수 부품
- **ESP32-CAM** (WiFi + 카메라)
- **L298N 모터 드라이버** (듀얼 H-브리지)
- **DC 모터 2개** (바퀴용)
- **서보 모터 1개** (조향용)
- **RC카 섀시** (바디)
- **배터리** (7.4V ~ 12V)
- **점퍼 와이어** (M-M, M-F)
- **브레드보드** (선택사항)

### 추가 부품 (선택사항)
- **LED** (상태 표시용)
- **부저** (알림용)
- **스위치** (전원용)

## 🔌 ESP32-CAM 핀 배치

```
ESP32-CAM 핀 배치:
┌─────────────────┐
│ 3V3  GND  GPIO0 │
│ 5V   GPIO1 GPIO2│
│ GND  GPIO3 GPIO4│
│ GPIO5 GPIO6 GPIO7│
│ GPIO8 GPIO9 GPIO10│
│ GPIO11 GPIO12 GPIO13│
│ GPIO14 GPIO15 GPIO16│
└─────────────────┘
```

## 🔗 L298N 모터 드라이버 연결

### L298N 핀 설명
- **VCC**: 전원 입력 (5V)
- **GND**: 그라운드
- **IN1, IN2**: 모터 A 제어 핀
- **IN3, IN4**: 모터 B 제어 핀
- **ENA, ENB**: 모터 속도 제어 (PWM)
- **OUT1, OUT2**: 모터 A 연결
- **OUT3, OUT4**: 모터 B 연결

## 🚗 RC카 연결 다이어그램

```
                    ESP32-CAM
                    ┌─────────┐
                    │ 3V3  GND│
                    │ 5V   GPIO0│
                    │ GND  GPIO1│
                    │ GPIO2 GPIO3│ ← 서보 모터 (조향)
                    │ GPIO4 GPIO5│ ← L298N IN1, IN2
                    │ GPIO6 GPIO7│ ← L298N IN3, IN4
                    │ GPIO8 GPIO9│ ← L298N ENA, ENB
                    └─────────┘
                         │
                    ┌────┴────┐
                    │  L298N  │
                    │  드라이버 │
                    └────┬────┘
                         │
                    ┌────┴────┐
                    │  DC모터  │
                    │  (바퀴)  │
                    └─────────┘
```

## 📝 상세 연결 방법

### 1. 전원 연결
```
배터리 (+) → L298N VCC
배터리 (-) → L298N GND
ESP32-CAM 5V → L298N VCC (공통)
ESP32-CAM GND → L298N GND (공통)
```

### 2. 모터 연결
```
왼쪽 바퀴 모터:
- 모터 (+) → L298N OUT1
- 모터 (-) → L298N OUT2

오른쪽 바퀴 모터:
- 모터 (+) → L298N OUT3
- 모터 (-) → L298N OUT4
```

### 3. 제어 신호 연결
```
ESP32-CAM → L298N
GPIO4 → IN1 (왼쪽 모터 방향)
GPIO5 → IN2 (왼쪽 모터 방향)
GPIO6 → IN3 (오른쪽 모터 방향)
GPIO7 → IN4 (오른쪽 모터 방향)
GPIO8 → ENA (왼쪽 모터 속도)
GPIO9 → ENB (오른쪽 모터 속도)
```

### 4. 서보 모터 연결 (조향)
```
서보 모터:
- 빨간선 (+) → ESP32-CAM 5V
- 검은선 (-) → ESP32-CAM GND
- 노란선 (신호) → ESP32-CAM GPIO2
```

## 🎮 모터 제어 로직

### 기본 동작
```cpp
// 앞으로
digitalWrite(IN1, HIGH);
digitalWrite(IN2, LOW);
digitalWrite(IN3, HIGH);
digitalWrite(IN4, LOW);

// 뒤로
digitalWrite(IN1, LOW);
digitalWrite(IN2, HIGH);
digitalWrite(IN3, LOW);
digitalWrite(IN4, HIGH);

// 왼쪽 (왼쪽 모터 느리게)
analogWrite(ENA, 150);  // 왼쪽 모터 속도
analogWrite(ENB, 255);  // 오른쪽 모터 속도

// 오른쪽 (오른쪽 모터 느리게)
analogWrite(ENA, 255);  // 왼쪽 모터 속도
analogWrite(ENB, 150);  // 오른쪽 모터 속도

// 정지
digitalWrite(IN1, LOW);
digitalWrite(IN2, LOW);
digitalWrite(IN3, LOW);
digitalWrite(IN4, LOW);
```

## ⚡ 전원 관리

### 배터리 선택
- **7.4V (2S Li-Po)**: 권장, 안정적
- **11.1V (3S Li-Po)**: 고속, 주의 필요
- **12V (납축전지)**: 무거움, 안정적

### 전압 분배
```
배터리 7.4V → L298N (모터용)
배터리 7.4V → 5V 레귤레이터 → ESP32-CAM
```

## 🔧 조립 순서

### 1단계: 섀시 준비
1. RC카 섀시에 모터 장착
2. 바퀴 연결
3. 서보 모터 장착 (조향용)

### 2단계: 전자 부품 배치
1. ESP32-CAM 고정
2. L298N 드라이버 고정
3. 배터리 공간 확보

### 3단계: 배선
1. 전원선 연결
2. 모터선 연결
3. 제어선 연결
4. 서보 모터 연결

### 4단계: 테스트
1. 전원 공급
2. WiFi 연결 확인
3. 모터 동작 테스트
4. 서보 모터 테스트

## ⚠️ 주의사항

### 전기적 주의사항
- **극성 확인**: 모터 연결 시 +/- 구분
- **전압 확인**: ESP32-CAM은 5V 이하
- **접지**: 모든 GND를 공통으로 연결

### 기계적 주의사항
- **모터 고정**: 진동으로 인한 접촉 불량 방지
- **배선 정리**: 움직임에 의한 선 끊김 방지
- **무게 분산**: 배터리 위치로 무게 중심 조절

### 소프트웨어 주의사항
- **PWM 주파수**: 모터 드라이버에 맞는 주파수 설정
- **안전 코드**: 긴급 정지 기능 구현
- **배터리 모니터링**: 전압 체크 기능

## 🛠️ 문제 해결

### 모터가 안 움직일 때
1. 전원 연결 확인
2. 모터 극성 확인
3. 제어 신호 확인
4. L298N 점퍼 확인

### 서보 모터가 안 움직일 때
1. 서보 모터 전원 확인
2. 신호선 연결 확인
3. PWM 신호 확인

### WiFi 연결 안 될 때
1. SSID/비밀번호 확인
2. 신호 강도 확인
3. ESP32-CAM 안테나 확인

## 📱 소프트웨어 설정

### Arduino IDE 설정
```cpp
// 핀 정의
#define SERVO_PIN 2
#define IN1_PIN 4
#define IN2_PIN 5
#define IN3_PIN 6
#define IN4_PIN 7
#define ENA_PIN 8
#define ENB_PIN 9

// WiFi 설정
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* ws_host = "base-revolt-server.onrender.com";
```

### WebSocket 서버 설정
```cpp
// 서버 연결
WebSocketsClient webSocket;
webSocket.begin(ws_host, 80, "/");
```

## 🎯 완성 체크리스트

- [ ] ESP32-CAM 전원 공급
- [ ] WiFi 연결 성공
- [ ] 모터 정방향/역방향 동작
- [ ] 서보 모터 좌우 조향
- [ ] WebSocket 서버 연결
- [ ] 카메라 스트리밍
- [ ] 원격 제어 동작

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 배선도 재확인
2. 전원 공급 확인
3. 소프트웨어 로그 확인
4. 하드웨어 연결 확인

---

**주의**: 이 가이드는 교육 목적으로 작성되었습니다. 실제 제작 시 안전 수칙을 준수하세요.
