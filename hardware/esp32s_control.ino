/*
 * Base Revolt v2.0 - ESP-32S Control Firmware (자동차 조종 방식)
 * 
 * 역할: RC카 조종 전용 (모터 제어만)
 * 
 * 기능:
 * - WiFi 연결
 * - WebSocket 클라이언트로 서버 연결
 * - 디바이스 등록 (role: "control")
 * - L298N 모터 제어 (앞뒤 구동 + 좌우 스티어링)
 * 
 * 회로:
 * - GPIO 12, 13: 구동 모터 (앞뒤, IN1, IN2)
 * - GPIO 14, 15: 스티어링 모터 (좌우, IN3, IN4)
 * - ENA/ENB: 점퍼로 HIGH 설정 (또는 PWM 핀 연결)
 * 
 * 조종 방식:
 * - 일반 RC카 방식 (구동 + 스티어링 독립)
 * - W: 전진, S: 후진, A: 좌회전, D: 우회전
 * - Space: 정지 (구동 정지 + 스티어링 중앙)
 * 
 * 주의:
 * - 카메라 관련 코드 전부 제거됨
 * - 영상 스트리밍 없음
 * - 제어 명령만 수신
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// ==================== 설정 (TODO: 사용자가 수정 필요) ====================
// WiFi 설정
const char* ssid = "YOUR_WIFI_SSID";         // TODO: WiFi 이름으로 변경
const char* password = "YOUR_WIFI_PASSWORD"; // TODO: WiFi 비밀번호로 변경

// WebSocket 서버 설정 (Render)
const char* ws_host = "base-revolt-server.onrender.com";  // TODO: Render URL로 변경
const int ws_port = 443;
const char* ws_path = "/";
const bool ws_ssl = true;

// 디바이스 ID 설정 (같은 차량끼리는 동일한 ID 사용)
const char* DEVICE_ID = "CAR01";  // TODO: 여러 대면 CAR02, CAR03... 으로 변경
const char* DEVICE_ROLE = "control";

// 모터 제어 핀 (안정적인 핀만 사용)
#define MOTOR_DRIVE_IN1  12   // 구동 모터 IN1 (전진/후진)
#define MOTOR_DRIVE_IN2  13   // 구동 모터 IN2 (전진/후진)
#define MOTOR_STEER_IN3  14   // 스티어링 모터 IN3 (좌우)
#define MOTOR_STEER_IN4  15   // 스티어링 모터 IN4 (좌우)
// ENA/ENB는 점퍼로 HIGH 설정 - 코드에서 제어하지 않음

// ==================== 전역 변수 ====================
WebSocketsClient webSocket;
bool wsConnected = false;

// 현재 모터 상태 저장 (독립 제어를 위해)
enum DriveState { DRIVE_STOP, DRIVE_FORWARD, DRIVE_BACKWARD };
enum SteerState { STEER_CENTER, STEER_LEFT, STEER_RIGHT };

DriveState currentDrive = DRIVE_STOP;
SteerState currentSteer = STEER_CENTER;

// ==================== 함수 선언 ====================
void setupMotors();
void setupWiFi();
void setupWebSocket();
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
void handleMotorCommand(const char* command);
void driveForward();
void driveBackward();
void driveStop();
void steerLeft();
void steerRight();
void steerCenter();
void updateMotors();
void quickSelfTest();
void sendRegistration();

// ==================== Setup ====================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== Base Revolt Control Device (ESP-32S) ===");
  Serial.println("Version: 2.0 - Control Only");
  Serial.println("Device ID: " + String(DEVICE_ID));
  Serial.println("Role: " + String(DEVICE_ROLE));
  
  // 모터 핀 초기화
  setupMotors();
  
  // WiFi 연결
  setupWiFi();
  
  // WebSocket 연결
  setupWebSocket();
  
  // 자가진단 테스트 (배선 확인용)
  Serial.println("=== Running Motor Self Test ===");
  quickSelfTest();
  
  Serial.println("=== Setup Complete ===\n");
}

// ==================== Main Loop ====================
void loop() {
  webSocket.loop();
  delay(1);
}

// ==================== WiFi Setup ====================
void setupWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
  }
}

// ==================== WebSocket Setup ====================
void setupWebSocket() {
  Serial.println("Setting up WebSocket...");
  
  if (ws_ssl) {
    webSocket.beginSSL(ws_host, ws_port, ws_path);
  } else {
    webSocket.begin(ws_host, ws_port, ws_path);
  }
  
  // WebSocket 이벤트 핸들러 등록
  webSocket.onEvent(webSocketEvent);
  
  // 재연결 설정
  webSocket.setReconnectInterval(5000);
  
  // 헤더 설정 (하위 호환)
  webSocket.setExtraHeaders("x-device-type: rc-car");
  
  Serial.println("WebSocket configured");
}

// ==================== WebSocket Event Handler ====================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("❌ WebSocket Disconnected");
      wsConnected = false;
      // 연결 끊어지면 정지 (구동 멈춤 + 스티어링 중앙)
      driveStop();
      steerCenter();
      break;
      
    case WStype_CONNECTED:
      Serial.println("✅ WebSocket Connected");
      wsConnected = true;
      
      // 디바이스 등록 메시지 전송 (v2.0 프로토콜)
      sendRegistration();
      break;
      
    case WStype_TEXT:
      // 제어 명령 수신
      {
        DynamicJsonDocument doc(256);
        DeserializationError error = deserializeJson(doc, payload);
        
        if (error) {
          Serial.print("❌ JSON parse error: ");
          Serial.println(error.c_str());
          return;
        }
        
        const char* type = doc["type"];
        
        if (strcmp(type, "control") == 0) {
          const char* command = doc["command"];
          Serial.print("🎮 Control command received: ");
          Serial.println(command);
          handleMotorCommand(command);
        } else {
          Serial.print("ℹ️ Server message: ");
          Serial.println((char*)payload);
        }
      }
      break;
      
    case WStype_ERROR:
      Serial.println("❌ WebSocket Error");
      break;
      
    default:
      break;
  }
}

// ==================== 디바이스 등록 ====================
void sendRegistration() {
  DynamicJsonDocument doc(256);
  doc["type"] = "register";
  doc["deviceId"] = DEVICE_ID;
  doc["role"] = DEVICE_ROLE;
  
  String payload;
  serializeJson(doc, payload);
  
  webSocket.sendTXT(payload);
  
  Serial.println("✅ Registration message sent:");
  Serial.println(payload);
}

// ==================== 모터 초기화 ====================
void setupMotors() {
  Serial.println("Initializing motors (Drive + Steering)...");
  
  pinMode(MOTOR_DRIVE_IN1, OUTPUT);
  pinMode(MOTOR_DRIVE_IN2, OUTPUT);
  pinMode(MOTOR_STEER_IN3, OUTPUT);
  pinMode(MOTOR_STEER_IN4, OUTPUT);
  
  // 초기 상태: 정지 + 중앙
  currentDrive = DRIVE_STOP;
  currentSteer = STEER_CENTER;
  updateMotors();
  
  Serial.println("✅ Motors initialized (Drive: STOP, Steer: CENTER)");
}

// ==================== 모터 제어 명령 처리 ====================
void handleMotorCommand(const char* command) {
  if (strcmp(command, "forward") == 0) {
    driveForward();
  } else if (strcmp(command, "backward") == 0) {
    driveBackward();
  } else if (strcmp(command, "left") == 0) {
    steerLeft();
  } else if (strcmp(command, "right") == 0) {
    steerRight();
  } else if (strcmp(command, "stop") == 0) {
    // 정지 = 구동 멈춤 + 스티어링 중앙
    driveStop();
    steerCenter();
  } else {
    Serial.print("⚠️ Unknown command: ");
    Serial.println(command);
  }
}

// ==================== 구동 모터 함수 ====================
void driveForward() {
  currentDrive = DRIVE_FORWARD;
  updateMotors();
  Serial.println("⬆️ DRIVE: FORWARD");
}

void driveBackward() {
  currentDrive = DRIVE_BACKWARD;
  updateMotors();
  Serial.println("⬇️ DRIVE: BACKWARD");
}

void driveStop() {
  currentDrive = DRIVE_STOP;
  updateMotors();
  Serial.println("⏹ DRIVE: STOP");
}

// ==================== 스티어링 모터 함수 ====================
void steerLeft() {
  currentSteer = STEER_LEFT;
  updateMotors();
  Serial.println("⬅️ STEER: LEFT");
}

void steerRight() {
  currentSteer = STEER_RIGHT;
  updateMotors();
  Serial.println("➡️ STEER: RIGHT");
}

void steerCenter() {
  currentSteer = STEER_CENTER;
  updateMotors();
  Serial.println("↕️ STEER: CENTER");
}

// ==================== 모터 상태 업데이트 ====================
void updateMotors() {
  // 구동 모터 (앞뒤) 제어
  if (currentDrive == DRIVE_FORWARD) {
    digitalWrite(MOTOR_DRIVE_IN1, HIGH);
    digitalWrite(MOTOR_DRIVE_IN2, LOW);
  } else if (currentDrive == DRIVE_BACKWARD) {
    digitalWrite(MOTOR_DRIVE_IN1, LOW);
    digitalWrite(MOTOR_DRIVE_IN2, HIGH);
  } else {
    digitalWrite(MOTOR_DRIVE_IN1, LOW);
    digitalWrite(MOTOR_DRIVE_IN2, LOW);
  }
  
  // 스티어링 모터 (좌우) 제어
  if (currentSteer == STEER_LEFT) {
    digitalWrite(MOTOR_STEER_IN3, LOW);
    digitalWrite(MOTOR_STEER_IN4, HIGH);
  } else if (currentSteer == STEER_RIGHT) {
    digitalWrite(MOTOR_STEER_IN3, HIGH);
    digitalWrite(MOTOR_STEER_IN4, LOW);
  } else {
    // 중앙 위치 (모터 정지)
    digitalWrite(MOTOR_STEER_IN3, LOW);
    digitalWrite(MOTOR_STEER_IN4, LOW);
  }
}

// ==================== 자가진단 테스트 ====================
void quickSelfTest() {
  Serial.println("Testing motors (Drive + Steering)...");
  
  // 구동 테스트: 전진
  Serial.println("→ Drive: Forward");
  driveForward();
  delay(500);
  driveStop();
  delay(500);
  
  // 구동 테스트: 후진
  Serial.println("→ Drive: Backward");
  driveBackward();
  delay(500);
  driveStop();
  delay(500);
  
  // 스티어링 테스트: 좌
  Serial.println("→ Steer: Left");
  steerLeft();
  delay(300);
  steerCenter();
  delay(500);
  
  // 스티어링 테스트: 우
  Serial.println("→ Steer: Right");
  steerRight();
  delay(300);
  steerCenter();
  delay(500);
  
  // 복합 테스트: 전진 + 좌회전
  Serial.println("→ Forward + Left");
  driveForward();
  steerLeft();
  delay(500);
  driveStop();
  steerCenter();
  
  Serial.println("✅ Self test complete!");
}

