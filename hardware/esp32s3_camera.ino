/*
 * Base Revolt v2.0 - ESP32-S3 Camera Firmware
 * 
 * 역할: RC카 카메라 전용 (영상 스트리밍만)
 * 
 * 기능:
 * - WiFi 연결
 * - WebSocket 클라이언트로 서버 연결
 * - 디바이스 등록 (role: "camera")
 * - 카메라 JPEG 스트리밍 (15 FPS)
 * 
 * 카메라 핀맵:
 * - ESP32-S3 WROOM 개발보드 전용
 * - OV2640 또는 OV5640 카메라 모듈
 * 
 * 주의:
 * - 모터 제어 코드 전부 제거됨
 * - 영상 스트리밍만 담당
 * - 제어 명령 수신 안 함
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include "esp_camera.h"
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

// 디바이스 ID 설정 (조종 보드와 동일한 ID 사용!)
const char* DEVICE_ID = "CAR01";  // TODO: 조종 보드와 똑같은 ID 사용
const char* DEVICE_ROLE = "camera";

// ==================== ESP32-S3 WROOM 카메라 핀 정의 ====================
// TODO: 실제 사용하는 ESP32-S3 개발보드의 핀맵에 맞게 수정
// 아래는 일반적인 ESP32-S3-CAM 모듈의 핀맵 예시입니다.

#define PWDN_GPIO_NUM     -1   // Power down 핀 (사용 안 함)
#define RESET_GPIO_NUM    -1   // Reset 핀 (사용 안 함)
#define XCLK_GPIO_NUM     10   // 외부 클럭
#define SIOD_GPIO_NUM     40   // I2C Data
#define SIOC_GPIO_NUM     39   // I2C Clock

// 카메라 데이터 핀
#define Y9_GPIO_NUM       48   // D9
#define Y8_GPIO_NUM       46   // D8
#define Y7_GPIO_NUM       8    // D7
#define Y6_GPIO_NUM       7    // D6
#define Y5_GPIO_NUM       4    // D5
#define Y4_GPIO_NUM       41   // D4
#define Y3_GPIO_NUM       40   // D3
#define Y2_GPIO_NUM       39   // D2

#define VSYNC_GPIO_NUM    6    // 수직 동기
#define HREF_GPIO_NUM     42   // 수평 참조
#define PCLK_GPIO_NUM     13   // 픽셀 클럭

/* 
 * 주의: ESP32-S3 보드마다 핀맵이 다를 수 있습니다!
 * 
 * 사용 중인 보드 모델 확인:
 * 1. Freenove ESP32-S3 WROOM CAM
 * 2. Seeed XIAO ESP32-S3 Sense
 * 3. AI-Thinker ESP32-S3-CAM
 * 
 * 각 보드의 정확한 핀맵은 제조사 문서 참고하세요!
 */

// ==================== 전역 변수 ====================
WebSocketsClient webSocket;
unsigned long lastFrameTime = 0;
const int frameInterval = 66; // ~15 FPS (1000ms / 15 = 66ms)
bool wsConnected = false;

// ==================== 함수 선언 ====================
void setupCamera();
void setupWiFi();
void setupWebSocket();
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
void sendCameraFrame();
void sendRegistration();

// ==================== Setup ====================
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== Base Revolt Camera Device (ESP32-S3) ===");
  Serial.println("Version: 2.0 - Camera Only");
  Serial.println("Device ID: " + String(DEVICE_ID));
  Serial.println("Role: " + String(DEVICE_ROLE));
  
  // WiFi 연결
  setupWiFi();
  
  // 카메라 초기화
  setupCamera();
  
  // WebSocket 연결
  setupWebSocket();
  
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
      break;
      
    case WStype_CONNECTED:
      Serial.println("✅ WebSocket Connected");
      wsConnected = true;
      
      // 디바이스 등록 메시지 전송 (v2.0 프로토콜)
      sendRegistration();
      break;
      
    case WStype_TEXT:
      // 서버 메시지 수신 (카메라는 제어 명령 받지 않음)
      Serial.print("ℹ️ Server message: ");
      Serial.println((char*)payload);
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

// ==================== 카메라 초기화 ====================
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
  
  // 프레임 크기 설정 (SVGA = 800x600)
  if(psramFound()){
    config.frame_size = FRAMESIZE_SVGA;  // 800x600
    config.jpeg_quality = 12;            // 0-63 (낮을수록 고화질)
    config.fb_count = 2;                 // 프레임 버퍼 2개 (부드러운 스트리밍)
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }
  
  // 카메라 초기화
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed with error 0x%x\n", err);
    return;
  }
  
  // 센서 설정 조정
  sensor_t * s = esp_camera_sensor_get();
  if (s != NULL) {
    // 수직 반전 (필요 시)
    // s->set_vflip(s, 1);  
    
    // 수평 반전 (필요 시)
    // s->set_hmirror(s, 1);
    
    // 화이트밸런스 자동
    s->set_whitebal(s, 1);
    
    // 자동 노출 활성화
    s->set_exposure_ctrl(s, 1);
    
    // 자동 게인 활성화
    s->set_gain_ctrl(s, 1);
    
    Serial.println("✅ Camera initialized successfully");
  } else {
    Serial.println("⚠️ Failed to get camera sensor");
  }
}

// ==================== 카메라 프레임 전송 ====================
void sendCameraFrame() {
  if (!wsConnected) {
    return;
  }
  
  // 카메라에서 프레임 캡처
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("⚠️ Camera capture failed");
    return;
  }
  
  // WebSocket으로 바이너리 전송
  webSocket.sendBIN(fb->buf, fb->len);
  
  // 프레임 버퍼 반환
  esp_camera_fb_return(fb);
}

