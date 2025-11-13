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
const char* ssid = "KT_GiGA_89E9";  // TODO: WiFi 이름으로 변경
const char* password = "ehk2dkg622";  // TODO: WiFi 비밀번호로 변경

const char* ws_host = "base-revolt-server.onrender.com";
const int ws_port = 443;
const bool ws_ssl = true;

const char* ws_path = "/";

// 디바이스 ID 설정 (조종 보드와 동일한 ID 사용!)
const char* DEVICE_ID = "CAR01";  // TODO: 조종 보드와 똑같은 ID 사용
const char* DEVICE_ROLE = "camera";

// ==================== ESP32-S3 WROOM 카메라 핀 정의 ====================
// TODO: 실제 사용하는 ESP32-S3 개발보드의 핀맵에 맞게 수정
// 아래는 일반적인 ESP32-S3-CAM 모듈의 핀맵 예시입니다.
  
#define PWDN_GPIO_NUM     -1   // Power down 핀 (사용 안 함)
#define RESET_GPIO_NUM    -1   // Reset 핀 (사용 안 함)
#define XCLK_GPIO_NUM     15   // 외부 클럭
#define SIOD_GPIO_NUM     4    // I2C Data (SDA)
#define SIOC_GPIO_NUM     5    // I2C Clock (SCL)

// 카메라 데이터 핀 (ESP32-S3 N16R8 + OV3660 기준)
#define Y9_GPIO_NUM       16   // D9
#define Y8_GPIO_NUM       17   // D8
#define Y7_GPIO_NUM       18   // D7
#define Y6_GPIO_NUM       12   // D6
#define Y5_GPIO_NUM       10   // D5
#define Y4_GPIO_NUM        8   // D4
#define Y3_GPIO_NUM        9   // D3
#define Y2_GPIO_NUM       11   // D2

#define VSYNC_GPIO_NUM     6   // 수직 동기
#define HREF_GPIO_NUM      7   // 수평 참조
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
bool deviceRegistered = false;  // 디바이스 등록 완료 여부
unsigned long registrationTime = 0;  // 등록 메시지 전송 시간

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
    // 참고: ESP32 WebSocketsClient는 기본적으로 SSL 인증서를 검증합니다
    // Render 서버의 인증서가 검증되지 않으면 연결이 실패할 수 있습니다
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
      deviceRegistered = false;  // 재연결 시 다시 등록 필요
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
        
        // 이제 연결 완료로 표시 - 이제부터 loop()에서 프레임 전송 시작
        wsConnected = true;
        
        Serial.println("✅ Registration complete, starting frame streaming...");
      }
      break;
      
    case WStype_TEXT:
      // 서버 메시지 수신 (카메라는 제어 명령 받지 않음)
      Serial.print("ℹ️ Server message: ");
      if (payload && length > 0) {
        String msg = String((char*)payload);
        Serial.println(msg);
        
        // 등록 확인 (서버가 등록을 받았는지 확인)
        // 참고: 서버는 등록 후 응답을 보내지 않지만, 연결이 유지되면 등록 성공으로 간주
        if (!deviceRegistered && (millis() - registrationTime > 500)) {
          // 등록 메시지 전송 후 500ms 경과 시 등록 완료로 간주
          deviceRegistered = true;
          Serial.println("✅ Device registration confirmed (connection stable)");
          Serial.println("▶️ Starting frame streaming...");
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
      
    case WStype_FRAGMENT_TEXT_START:
      Serial.println("📝 Text fragment start");
      break;
      
    case WStype_FRAGMENT_BIN_START:
      Serial.println("📦 Binary fragment start");
      break;
      
    case WStype_FRAGMENT:
      Serial.printf("📄 Fragment: %d bytes\n", length);
      break;
      
    case WStype_FRAGMENT_FIN:
      Serial.println("✅ Fragment complete");
      break;
      
    case WStype_PING:
      Serial.println("🏓 Ping received");
      break;
      
    case WStype_PONG:
      Serial.println("🏓 Pong received");
      break;
      
    default:
      Serial.printf("ℹ️ Unknown event type: %d\n", type);
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
  
  bool sent = webSocket.sendTXT(payload);
  
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
  
  // 프레임 크기 설정 (PSRAM 여부에 따라 조정)
  const bool hasPsram = psramFound();
  Serial.printf("PSRAM detected: %s\n", hasPsram ? "yes" : "no");
  Serial.printf("Free heap before camera init: %d bytes\n", ESP.getFreeHeap());

  if (hasPsram) {
    // PSRAM 있으면 VGA (640x480) 사용
    Serial.println("✅ PSRAM detected - using VGA (640x480)");
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 2;  // 더블 버퍼
  } else {
    // PSRAM 없으면 더 작은 해상도 사용
    Serial.println("⚠️ No PSRAM detected - using QQVGA (160x120)");
    config.frame_size = FRAMESIZE_QQVGA;  // 160x120 (최소 메모리 사용)
    config.jpeg_quality = 20;             // 품질 낮춤 (파일 크기 감소)
    config.fb_count = 1;                   // 싱글 버퍼만
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;  // 버퍼가 비어있을 때만 캡처
  }
  
  // 카메라 초기화
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed with error 0x%x\n", err);
    Serial.printf("Free heap after failed init: %d bytes\n", ESP.getFreeHeap());
    Serial.println("💡 Try: 1) Enable PSRAM in board settings, 2) Reduce frame size, 3) Check wiring");
    return;
  }
  
  Serial.printf("✅ Camera initialized - Free heap: %d bytes\n", ESP.getFreeHeap());
  
  // 센서 설정 조정
  sensor_t * s = esp_camera_sensor_get();
  if (s != NULL) {
    Serial.printf("Camera sensor PID: 0x%x\n", s->id.PID);
    
    // OV3660은 기본적으로 상하/좌우가 반전되어 있을 수 있음
    s->set_vflip(s, 1);
    s->set_hmirror(s, 1);
    
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

