/*
 * Base Revolt MVP - ESP32-CAM RC Car Firmware
 * 
 * 기능:
 * - WiFi 연결
 * - WebSocket 클라이언트로 서버 연결
 * - 카메라 JPEG 스트리밍
 * - L298N 모터 제어 (양쪽 바퀴 각각 제어)
 * 
 * 회로:
 * - GPIO 12, 13: 좌측 모터 (IN1, IN2)
 * - GPIO 14, 15: 우측 모터 (IN3, IN4)
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include "esp_camera.h"
#include <ArduinoJson.h>

// ==================== 설정 ====================
// WiFi 설정
const char* ssid = "JIN";
const char* password = "J13245678!";

// WebSocket 서버 설정 (Render)
const char* ws_host = "base-revolt-server.onrender.com";
const int ws_port = 443;
const char* ws_path = "/";
const bool ws_ssl = true;

// 모터 제어 핀 (안정적인 핀만 사용)
#define MOTOR_LEFT_IN1  12   // 왼쪽 모터 IN1
#define MOTOR_LEFT_IN2  13   // 왼쪽 모터 IN2
#define MOTOR_RIGHT_IN3 14   // 오른쪽 모터 IN3
#define MOTOR_RIGHT_IN4 15   // 오른쪽 모터 IN4
// ENA/ENB는 점퍼로 HIGH 설정 - 코드에서 제어하지 않음

// 디버깅용 핀 상태 확인
void checkPinStates() {
  Serial.printf("Pin States - IN1:%d, IN2:%d, IN3:%d, IN4:%d\n",
                digitalRead(MOTOR_LEFT_IN1), digitalRead(MOTOR_LEFT_IN2),
                digitalRead(MOTOR_RIGHT_IN3), digitalRead(MOTOR_RIGHT_IN4));
}

// AI-Thinker 모델 카메라 핀 정의
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ==================== 전역 변수 ====================
WebSocketsClient webSocket;
unsigned long lastFrameTime = 0;
const int frameInterval = 66; // ~15 FPS (1000ms / 15 = 66ms)
bool wsConnected = false;

// ==================== 함수 선언 ====================
void setupCamera();
void setupMotors();
void setupWiFi();
void setupWebSocket();
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
void handleMotorCommand(const char* command);
void sendCameraFrame();
void motorStop();
void motorForward();
void motorBackward();
void motorLeft();
void motorRight();
void setDir(bool L1, bool L2, bool R3, bool R4);
void quickSelfTest();

// ==================== Setup ====================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== Base Revolt RC Car Starting ===");
  
  // 모터 핀 초기화
  setupMotors();
  
  // WiFi 연결
  setupWiFi();
  
  // 카메라 초기화
  setupCamera();
  
  // WebSocket 연결
  setupWebSocket();
  
  // 자가진단 테스트 (배선 확인용)
  Serial.println("=== Running Self Test ===");
  quickSelfTest();
  
  Serial.println("=== Setup Complete ===\n");
}

// ==================== Main Loop ====================
void loop() {
  webSocket.loop();
  
  // 카메라 프레임 전송 (15 FPS)
  if (wsConnected && (millis() - lastFrameTime > frameInterval)) {
    sendCameraFrame();
    lastFrameTime = millis();
  }
  
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
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi Connection Failed!");
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
  
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  
  // 장치 식별을 위한 헤더
  webSocket.setExtraHeaders("X-Device-Type: rc-car");
  
  Serial.println("WebSocket setup complete");
}

// ==================== WebSocket Event Handler ====================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected");
      wsConnected = false;
      motorStop(); // 연결 끊기면 정지
      break;
      
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to server");
      wsConnected = true;
      
      // 연결 확인 메시지
      webSocket.sendTXT("{\"type\":\"device\",\"device\":\"rc-car\",\"status\":\"connected\"}");
      break;
      
    case WStype_TEXT:
      {
        Serial.printf("[WS] Received text: %s\n", payload);
        
        // JSON 파싱
        StaticJsonDocument<200> doc;
        DeserializationError error = deserializeJson(doc, payload, length);
        
        if (!error) {
          const char* type = doc["type"];
          
          if (strcmp(type, "control") == 0) {
            const char* command = doc["command"];
            handleMotorCommand(command);
          }
        }
      }
      break;
      
    case WStype_BIN:
      // 바이너리 데이터는 무시
      break;
      
    case WStype_ERROR:
      Serial.println("[WS] Error occurred");
      break;
  }
}

// ==================== 카메라 Setup ====================
void setupCamera() {
  Serial.println("Initializing camera...");
  
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  // 프레임 버퍼 설정
  if(psramFound()){
    config.frame_size = FRAMESIZE_QVGA; // 320x240
    config.jpeg_quality = 12; // 0-63, 낮을수록 고품질
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 15;
    config.fb_count = 1;
  }
  
  // 카메라 초기화
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return;
  }
  
  Serial.println("Camera initialized successfully");
}

// ==================== 카메라 프레임 전송 ====================
void sendCameraFrame() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }
  
  // 바이너리로 전송
  webSocket.sendBIN(fb->buf, fb->len);
  
  esp_camera_fb_return(fb);
}

// ==================== 모터 Setup ====================
void setupMotors() {
  Serial.println("Setting up motors...");
  
  // 모터 핀들을 출력으로 설정 (ENA/ENB는 점퍼로 HIGH)
  pinMode(MOTOR_LEFT_IN1, OUTPUT);
  pinMode(MOTOR_LEFT_IN2, OUTPUT);
  pinMode(MOTOR_RIGHT_IN3, OUTPUT);
  pinMode(MOTOR_RIGHT_IN4, OUTPUT);
  
  // 모든 모터 정지
  motorStop();
  
  Serial.println("Motors initialized (ENA/ENB via jumper)");
}

// ==================== 모터 제어 함수 ====================
void handleMotorCommand(const char* command) {
  Serial.printf("Motor command: %s\n", command);
  
  if (strcmp(command, "forward") == 0) {
    motorForward();
  } else if (strcmp(command, "backward") == 0) {
    motorBackward();
  } else if (strcmp(command, "left") == 0) {
    motorLeft();
  } else if (strcmp(command, "right") == 0) {
    motorRight();
  } else if (strcmp(command, "stop") == 0) {
    motorStop();
  }
}

// ==================== 모터 제어 로직 ====================
void motorStop() {
  // 모든 모터 정지
  digitalWrite(MOTOR_LEFT_IN1, LOW);
  digitalWrite(MOTOR_LEFT_IN2, LOW);
  digitalWrite(MOTOR_RIGHT_IN3, LOW);
  digitalWrite(MOTOR_RIGHT_IN4, LOW);
  
  Serial.println("STOP: All motors stopped");
}

void motorForward() {
  // 전진: (Left Forward) + (Right Forward) - 검증된 로직
  digitalWrite(MOTOR_LEFT_IN1, LOW);
  digitalWrite(MOTOR_LEFT_IN2, HIGH);
  digitalWrite(MOTOR_RIGHT_IN3, HIGH);
  digitalWrite(MOTOR_RIGHT_IN4, LOW);
  
  Serial.println("FORWARD: L(Fwd) + R(Fwd)");
}

void motorBackward() {
  // 후진: (Left Backward) + (Right Backward) - 검증된 로직
  digitalWrite(MOTOR_LEFT_IN1, HIGH);
  digitalWrite(MOTOR_LEFT_IN2, LOW);
  digitalWrite(MOTOR_RIGHT_IN3, LOW);
  digitalWrite(MOTOR_RIGHT_IN4, HIGH);
  
  Serial.println("BACKWARD: L(Bwd) + R(Bwd)");
}

void motorLeft() {
  // 좌회전: (Left Backward) + (Right Forward) - 검증된 로직
  digitalWrite(MOTOR_LEFT_IN1, HIGH);   // Left Backward 로직
  digitalWrite(MOTOR_LEFT_IN2, LOW);
  digitalWrite(MOTOR_RIGHT_IN3, HIGH);  // Right Forward 로직
  digitalWrite(MOTOR_RIGHT_IN4, LOW);
  
  Serial.println("LEFT: L(Bwd) + R(Fwd)");
}

void motorRight() {
  // 우회전: (Left Forward) + (Right Backward) - 검증된 로직
  digitalWrite(MOTOR_LEFT_IN1, LOW);    // Left Forward 로직
  digitalWrite(MOTOR_LEFT_IN2, HIGH);
  digitalWrite(MOTOR_RIGHT_IN3, LOW);   // Right Backward 로직
  digitalWrite(MOTOR_RIGHT_IN4, HIGH);
  
  Serial.println("RIGHT: L(Fwd) + R(Bwd)");
}

// ==================== 새로운 핀 매핑용 함수들 ====================
void setDir(bool L1, bool L2, bool R3, bool R4) {
  digitalWrite(MOTOR_LEFT_IN1, L1);
  digitalWrite(MOTOR_LEFT_IN2, L2);
  digitalWrite(MOTOR_RIGHT_IN3, R3);
  digitalWrite(MOTOR_RIGHT_IN4, R4);
}

void quickSelfTest() {
  Serial.println("=== Quick Self Test ===");
  
  // Left wheel only (Forward)
  Serial.println("Testing Left wheel Forward...");
  setDir(LOW, HIGH, LOW, LOW);
  delay(700);
  
  // Right wheel only (Forward)
  Serial.println("Testing Right wheel Forward...");
  setDir(LOW, LOW, HIGH, LOW);
  delay(700);
  
  // Both Forward
  Serial.println("Testing Both Forward...");
  setDir(LOW, HIGH, HIGH, LOW);
  delay(700);
  
  // Stop
  Serial.println("Stopping...");
  setDir(LOW, LOW, LOW, LOW);
  delay(300);
  
  Serial.println("=== Self Test Complete ===");
}