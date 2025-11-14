/*
 * Base Revolt v2.0 - ESP32-CAM Camera Firmware (저가형)
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
 * - ESP32-CAM (AI-Thinker) 개발보드 전용
 * - OV2640 카메라 모듈
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
#include <Preferences.h>

// ==================== 설정 (TODO: 사용자가 수정 필요) ====================
// WiFi 설정
const char* ssid = "YOUR_WIFI_SSID";  // TODO: WiFi 이름으로 변경
const char* password = "YOUR_WIFI_PASSWORD";  // TODO: WiFi 비밀번호로 변경

const char* ws_host = "base-revolt-server.onrender.com";
const int ws_port = 443;
const bool ws_ssl = true;
const char* ws_path = "/";

// 디바이스 ID 설정 (조종 보드와 동일한 ID 사용!)
const char* DEVICE_ID = "CAR01";  // TODO: 조종 보드와 똑같은 ID 사용
const char* DEVICE_ROLE = "camera";
const char* HARDWARE_SPEC = "ESP32-CAM + OV2640";  // 하드웨어 스펙 (수정 불가)

// ==================== ESP32-CAM (AI-Thinker) 카메라 핀 정의 ====================
// AI-Thinker ESP32-CAM 모듈의 표준 핀맵
#define PWDN_GPIO_NUM     32   // Power down 핀
#define RESET_GPIO_NUM    -1   // Reset 핀 (사용 안 함)
#define XCLK_GPIO_NUM      0   // 외부 클럭
#define SIOD_GPIO_NUM     26   // I2C Data (SDA)
#define SIOC_GPIO_NUM     27   // I2C Clock (SCL)

// 카메라 데이터 핀 (OV2640 기준)
#define Y9_GPIO_NUM       35   // D9
#define Y8_GPIO_NUM       34   // D8
#define Y7_GPIO_NUM       39   // D7
#define Y6_GPIO_NUM       36   // D6
#define Y5_GPIO_NUM       21   // D5
#define Y4_GPIO_NUM       19   // D4
#define Y3_GPIO_NUM       18   // D3
#define Y2_GPIO_NUM        5   // D2

#define VSYNC_GPIO_NUM    25   // 수직 동기
#define HREF_GPIO_NUM     23   // 수평 참조
#define PCLK_GPIO_NUM     22   // 픽셀 클럭

/* 
 * 주의: ESP32-CAM 보드마다 핀맵이 다를 수 있습니다!
 * 
 * AI-Thinker ESP32-CAM 표준 핀맵을 사용합니다.
 * 다른 제조사의 ESP32-CAM 모듈을 사용하는 경우 핀맵을 확인하세요.
 */

// ==================== 전역 변수 ====================
WebSocketsClient webSocket;
unsigned long lastFrameTime = 0;
const int frameInterval = 66; // ~15 FPS (1000ms / 15 = 66ms)
bool wsConnected = false;
unsigned long registrationTime = 0;  // 등록 메시지 전송 시간

// 차량 프로필 (NVS에 저장)
Preferences preferences;
String vehicleName;
String vehicleDescription;
String ownerWallet;

// ==================== 함수 선언 ====================
void setupCamera();
void setupWiFi();
void setupWebSocket();
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length);
void sendCameraFrame();
void loadVehicleConfig();
void sendVehicleInfo();
void applyConfigUpdate(JsonObject data);
void sendRegistration();

// ==================== Setup ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== Base Revolt Camera Device (ESP32-CAM) ===");
  Serial.println("Version: 2.0 - Camera Only (Budget Model)");
  Serial.println("Device ID: " + String(DEVICE_ID));
  Serial.println("Role: " + String(DEVICE_ROLE));
  Serial.println("Hardware: " + String(HARDWARE_SPEC));
  
  // 차량 프로필 로드
  loadVehicleConfig();
  
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
  // wsConnected가 true면 이미 등록 완료된 상태
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
  Serial.printf("Target: %s://%s:%d%s\n", ws_ssl ? "wss" : "ws", ws_host, ws_port, ws_path);
  
  // WebSocket 이벤트 핸들러 등록 (begin 전에 등록)
  webSocket.onEvent(webSocketEvent);
  
  // 헤더 설정 (begin 전에 설정)
  webSocket.setExtraHeaders("x-device-type: rc-car");
  
  // 재연결 설정 (begin 전에 설정)
  webSocket.setReconnectInterval(10000);  // 10초로 증가 (안정성)
  
  if (ws_ssl) {
    Serial.println("Attempting SSL connection...");
    Serial.println("⚠️ Note: SSL certificate validation may fail");
    Serial.println("   If connection fails, check WebSocketsClient library version");
    
    // SSL 연결 시도
    webSocket.beginSSL(ws_host, ws_port, ws_path);
    
    // 연결 타임아웃 모니터링 (15초)
    Serial.println("   Waiting up to 15 seconds for SSL handshake...");
  } else {
    Serial.println("Attempting non-SSL connection...");
    webSocket.begin(ws_host, ws_port, ws_path);
  }
  
  Serial.println("WebSocket configured");
  Serial.println("Waiting for connection...");
  Serial.printf("WiFi status: %d (3=connected)\n", WiFi.status());
  
  // 연결 상태 확인 (5초 후)
  delay(5000);
  if (!wsConnected) {
    Serial.println("⚠️ Still not connected after 5 seconds...");
    Serial.println("   Check for WStype_ERROR messages above");
  }
}

// ==================== WebSocket Event Handler ====================
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("❌ WebSocket Disconnected");
      if (payload && length > 0) {
        Serial.printf("   Reason: ");
        for (size_t i = 0; i < length && i < 100; i++) {
          Serial.print((char)payload[i]);
        }
        Serial.println();
      } else {
        Serial.println("   Reason: None (connection closed or failed)");
        Serial.println("   💡 This usually means:");
        Serial.println("      - SSL handshake failed");
        Serial.println("      - Server rejected connection");
        Serial.println("      - Network timeout");
      }
      Serial.printf("   WiFi status: %d\n", WiFi.status());
      Serial.printf("   Free heap: %d bytes\n", ESP.getFreeHeap());
      Serial.println("   🔄 Will retry in 10 seconds...");
      wsConnected = false;
      break;
      
    case WStype_CONNECTED:
      {
        Serial.println("✅ WebSocket Connected");
        Serial.printf("   Server: %s:%d\n", ws_host, ws_port);
        Serial.printf("   My IP: %s\n", WiFi.localIP().toString().c_str());
        
        // 연결이 완전히 설정될 때까지 대기
        Serial.println("⏳ Waiting 500ms for connection to stabilize...");
        delay(500);
        
        // 디바이스 등록 메시지 전송 (v2.0 프로토콜)
        Serial.println("📤 Sending registration message...");
        sendRegistration();
        registrationTime = millis();
        
        // 등록 메시지가 서버에 도착하고 처리될 때까지 충분히 대기
        // 이 시간 동안 loop()는 계속 돌지만 wsConnected가 false라서 프레임 전송 안 함
        Serial.println("⏳ Waiting 2000ms for server to process registration...");
        delay(2000);
        
        // 차량 프로필 정보 전송 (v2.1)
        Serial.println("📤 Sending vehicle profile...");
        sendVehicleInfo();
        delay(500);
        
        // 이제 연결 완료로 표시 - 이제부터 loop()에서 프레임 전송 시작
        wsConnected = true;
        
        Serial.println("✅ Registration complete, starting frame streaming...");
      }
      break;
      
    case WStype_TEXT:
      // 서버 메시지 수신
      Serial.print("ℹ️ Server message: ");
      if (payload && length > 0) {
        String msg = String((char*)payload);
        Serial.println(msg);
        
        // JSON 파싱 시도
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, msg);
        
        if (!error) {
          const char* msgType = doc["type"];
          
          // 차량 설정 업데이트 (v2.1)
          if (msgType && strcmp(msgType, "updateConfig") == 0) {
            Serial.println("📝 Config update received from admin");
            applyConfigUpdate(doc["data"]);
          }
        }
      } else {
        Serial.println("(empty)");
      }
      break;
      
    case WStype_BIN:
      Serial.printf("📦 Binary data received: %d bytes\n", length);
      break;
      
    case WStype_ERROR:
      {
        Serial.println("❌ WebSocket Error");
        if (payload && length > 0) {
          Serial.printf("   Error message: ");
          for (size_t i = 0; i < length && i < 200; i++) {
            Serial.print((char)payload[i]);
          }
          Serial.println();
        } else {
          Serial.println("   Error: Unknown (check SSL certificate or network)");
        }
        Serial.printf("   WiFi status: %d\n", WiFi.status());
        Serial.println("   💡 Possible causes:");
        Serial.println("      1. SSL certificate validation failed");
        Serial.println("      2. Network connectivity issue");
        Serial.println("      3. Server not responding");
        wsConnected = false;
      }
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
  
  Serial.print("📤 Registration payload: ");
  Serial.println(payload);
  Serial.printf("   Payload length: %d bytes\n", payload.length());
  
  // String 대신 const char*로 전송
  bool sent = webSocket.sendTXT(payload.c_str(), payload.length());
  
  Serial.println("✅ Registration message sent:");
  Serial.println(payload);
  Serial.printf("   Send result: %s\n", sent ? "SUCCESS" : "FAILED");
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
  
  // 프레임 크기 설정
  // ESP32-CAM (AI-Thinker) 기본 모델은 PSRAM이 없으므로 QVGA만 사용 가능
  Serial.printf("Free heap before camera init: %d bytes\n", ESP.getFreeHeap());
  Serial.println("Using QVGA (320x240) - ESP32-CAM has no PSRAM");
  
  config.frame_size = FRAMESIZE_QVGA;  // 320x240 (메모리 절약)
  config.jpeg_quality = 20;             // 품질 낮춤 (파일 크기 감소)
  config.fb_count = 1;                   // 싱글 버퍼만
  config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;  // 버퍼가 비어있을 때만 캡처
  
  // 카메라 초기화
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed with error 0x%x\n", err);
    return;
  }
  
  Serial.printf("✅ Camera initialized - Free heap: %d bytes\n", ESP.getFreeHeap());
  
  // 센서 설정 조정
  sensor_t * s = esp_camera_sensor_get();
  if (s != NULL) {
    Serial.printf("Camera sensor PID: 0x%x\n", s->id.PID);
    
    // OV2640 설정
    s->set_vflip(s, 1);
    s->set_hmirror(s, 1);
    
    // 화이트밸런스 자동
    s->set_whitebal(s, 1);
    
    // 밝기 조정
    s->set_brightness(s, 0);
    
    // 대비 조정
    s->set_contrast(s, 0);
    
    Serial.println("✅ Camera sensor configured");
  }
  
  Serial.println("✅ Camera initialized successfully");
}

// ==================== 카메라 프레임 전송 ====================
void sendCameraFrame() {
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("⚠️ Camera capture failed");
    return;
  }
  
  // JPEG 프레임을 바이너리로 전송
  if (wsConnected && fb->len > 0) {
    webSocket.sendBIN(fb->buf, fb->len);
  }
  
  // 프레임 버퍼 해제
  esp_camera_fb_return(fb);
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
  
  bool sent = webSocket.sendTXT(payload.c_str(), payload.length());
  Serial.printf("   Send result: %s\n", sent ? "SUCCESS" : "FAILED");
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

