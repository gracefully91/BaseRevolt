/*
 * Base Revolt v2.0 - ESP32-C3 SuperMini Control Firmware
 * 
 * 역할: RC카 조종 전용 (모터 제어만) - 모든 카메라 모델과 호환
 * 
 * 기능:
 * - WiFi 연결
 * - WebSocket 클라이언트로 서버 연결
 * - 디바이스 등록 (role: "control")
 * - L298N 모터 제어 (앞뒤 구동 + 좌우 스티어링)
 * 
 * 회로:
 * - GPIO 3, 4: 구동 모터 (앞뒤, IN1, IN2)
 * - GPIO 6, 7: 스티어링 모터 (좌우, IN3, IN4)
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
 * - ESP32-CAM 또는 ESP32-S3 카메라와 함께 사용 가능
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

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
const char* HARDWARE_SPEC = "ESP32-C3";  // 하드웨어 스펙 (수정 불가)

// 모터 제어 핀 (ESP32-C3 SuperMini 기준)
#define MOTOR_DRIVE_IN1  3    // 구동 모터 IN1 (전진/후진) - GPIO3
#define MOTOR_DRIVE_IN2  4    // 구동 모터 IN2 (전진/후진) - GPIO4
#define MOTOR_STEER_IN3  6    // 스티어링 모터 IN3 (좌회전) - GPIO6
#define MOTOR_STEER_IN4  7    // 스티어링 모터 IN4 (우회전) - GPIO7
#define STATUS_LED_PIN   8    // 상태 표시 LED - GPIO8
// ENA/ENB는 점퍼로 HIGH 설정 - 코드에서 제어하지 않음

// ==================== 전역 변수 ====================
WebSocketsClient webSocket;
bool wsConnected = false;

// 차량 프로필 (NVS에 저장)
Preferences preferences;
String vehicleName;
String vehicleDescription;
String ownerWallet;

// 현재 모터 상태 저장 (독립 제어를 위해)
enum DriveState { DRIVE_STOP, DRIVE_FORWARD, DRIVE_BACKWARD };
enum SteerState { STEER_CENTER, STEER_LEFT, STEER_RIGHT };

DriveState currentDrive = DRIVE_STOP;
SteerState currentSteer = STEER_CENTER;

bool ledOn = false;
unsigned long ledOffTime = 0;

// ==================== 함수 선언 ====================
void setupMotors();
void setupStatusLed();
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
void loadVehicleConfig();
void sendVehicleInfo();
void applyConfigUpdate(JsonObject data);
void triggerStatusLed();
void updateStatusLed();

// ==================== Setup ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== Base Revolt Control Device (ESP32-C3 SuperMini) ===");
  Serial.println("Version: 2.0 - Control Only (Universal)");
  Serial.println("Device ID: " + String(DEVICE_ID));
  Serial.println("Role: " + String(DEVICE_ROLE));
  Serial.println("Hardware: " + String(HARDWARE_SPEC));
  
  // 차량 프로필 로드
  loadVehicleConfig();
  
  // 모터 핀 초기화
  setupMotors();
  setupStatusLed();
  
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
  updateStatusLed();
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
      
      // 차량 프로필 정보 전송 (v2.1)
      delay(500);
      Serial.println("📤 Sending vehicle profile...");
      sendVehicleInfo();
      break;
      
    case WStype_TEXT:
      // 제어 명령 수신
      {
        DynamicJsonDocument doc(512);
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
        } else if (strcmp(type, "updateConfig") == 0) {
          Serial.println("📝 Config update received from admin");
          applyConfigUpdate(doc["data"]);
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

// ==================== 차량 프로필 관리 (v2.1) ====================

// NVS에서 차량 설정 로드
void loadVehicleConfig() {
  Serial.println("📂 Loading vehicle config from NVS...");
  
  preferences.begin("vehicle", false);  // Read-write mode
  
  vehicleName = preferences.getString("name", "");
  vehicleDescription = preferences.getString("desc", "");
  ownerWallet = preferences.getString("owner", "");
  
  // 기본값 설정 (비어있으면)
  if (vehicleName == "") {
    vehicleName = String(DEVICE_ID);
    Serial.println("  ⚠️ No name found, using device ID as default");
  }
  
  preferences.end();
  
  Serial.println("✅ Vehicle config loaded:");
  Serial.println("  Name: " + vehicleName);
  Serial.println("  Description: " + vehicleDescription);
  Serial.println("  Owner: " + ownerWallet);
}

// 서버에 차량 프로필 정보 전송
void sendVehicleInfo() {
  DynamicJsonDocument doc(512);
  doc["type"] = "vehicleInfo";
  doc["id"] = DEVICE_ID;
  doc["hardwareSpec"] = HARDWARE_SPEC;
  doc["name"] = vehicleName;
  doc["description"] = vehicleDescription;
  doc["ownerWallet"] = ownerWallet;
  doc["status"] = "online";
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.print("📤 Vehicle info payload: ");
  Serial.println(payload);
  
  webSocket.sendTXT(payload);
  Serial.println("   Vehicle info sent");
}

// 서버로부터 받은 설정 업데이트 적용
void applyConfigUpdate(JsonObject data) {
  preferences.begin("vehicle", false);
  
  bool updated = false;
  
  if (data.containsKey("name")) {
    vehicleName = data["name"].as<String>();
    preferences.putString("name", vehicleName);
    Serial.println("  ✏️ Name updated: " + vehicleName);
    updated = true;
  }
  
  if (data.containsKey("description")) {
    vehicleDescription = data["description"].as<String>();
    preferences.putString("desc", vehicleDescription);
    Serial.println("  ✏️ Description updated: " + vehicleDescription);
    updated = true;
  }
  
  if (data.containsKey("ownerWallet")) {
    ownerWallet = data["ownerWallet"].as<String>();
    preferences.putString("owner", ownerWallet);
    Serial.println("  ✏️ Owner wallet updated: " + ownerWallet);
    updated = true;
  }
  
  preferences.end();
  
  if (updated) {
    Serial.println("✅ Config saved to NVS");
    
    // 확인용으로 서버에 업데이트된 정보 재전송
    delay(500);
    sendVehicleInfo();
  } else {
    Serial.println("  ⚠️ No fields to update");
  }
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

void setupStatusLed() {
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(STATUS_LED_PIN, LOW);
  ledOn = false;
  ledOffTime = 0;
  Serial.println("✅ Status LED initialized (GPIO8)");
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
  triggerStatusLed();
  Serial.println("⬆️ DRIVE: FORWARD");
}

void driveBackward() {
  currentDrive = DRIVE_BACKWARD;
  updateMotors();
  triggerStatusLed();
  Serial.println("⬇️ DRIVE: BACKWARD");
}

void driveStop() {
  currentDrive = DRIVE_STOP;
  updateMotors();
  triggerStatusLed();
  Serial.println("⏹ DRIVE: STOP");
}

// ==================== 스티어링 모터 함수 ====================
void steerLeft() {
  currentSteer = STEER_LEFT;
  updateMotors();
  triggerStatusLed();
  Serial.println("⬅️ STEER: LEFT");
}

void steerRight() {
  currentSteer = STEER_RIGHT;
  updateMotors();
  triggerStatusLed();
  Serial.println("➡️ STEER: RIGHT");
}

void steerCenter() {
  currentSteer = STEER_CENTER;
  updateMotors();
  triggerStatusLed();
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
  Serial.println("Starting motor self-test...");
  delay(1000);
  
  // 1. 구동 전진
  Serial.println("1. Testing DRIVE FORWARD...");
  driveForward();
  delay(500);
  driveStop();
  delay(300);
  
  // 2. 구동 후진
  Serial.println("2. Testing DRIVE BACKWARD...");
  driveBackward();
  delay(500);
  driveStop();
  delay(300);
  
  // 3. 스티어링 좌
  Serial.println("3. Testing STEER LEFT...");
  steerLeft();
  delay(300);
  steerCenter();
  delay(300);
  
  // 4. 스티어링 우
  Serial.println("4. Testing STEER RIGHT...");
  steerRight();
  delay(300);
  steerCenter();
  delay(300);
  
  // 5. 복합 테스트 (전진 + 좌회전)
  Serial.println("5. Testing COMBINED (Forward + Left)...");
  driveForward();
  steerLeft();
  delay(500);
  driveStop();
  steerCenter();
  delay(300);
  
  Serial.println("✅ Self-test complete!");
}

// ==================== 상태 LED 제어 ====================
void triggerStatusLed() {
  digitalWrite(STATUS_LED_PIN, HIGH);
  ledOn = true;
  ledOffTime = millis() + 100;  // 100ms 후 꺼짐
}

void updateStatusLed() {
  if (ledOn && millis() >= ledOffTime) {
    digitalWrite(STATUS_LED_PIN, LOW);
    ledOn = false;
  }
}

