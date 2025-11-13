/*
 * Base Revolt - ESP32-S3 Camera Test (Minimal)
 * 
 * 카메라만 테스트하는 최소한의 코드
 * PSRAM 없이도 작동하도록 최소 해상도 사용
 */

#include <WiFi.h>
#include "esp_camera.h"

// ==================== 설정 ====================
const char* ssid = "KT_GiGA_89E9";
const char* password = "ehk2dkg622";

// ==================== ESP32-S3 N16R8 + OV3660 카메라 핀 정의 ====================
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     15
#define SIOD_GPIO_NUM     4
#define SIOC_GPIO_NUM     5

#define Y9_GPIO_NUM       16
#define Y8_GPIO_NUM       17
#define Y7_GPIO_NUM       18
#define Y6_GPIO_NUM       12
#define Y5_GPIO_NUM       10
#define Y4_GPIO_NUM        8
#define Y3_GPIO_NUM        9
#define Y2_GPIO_NUM       11

#define VSYNC_GPIO_NUM     6
#define HREF_GPIO_NUM      7
#define PCLK_GPIO_NUM     13

// ==================== Setup ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n=== ESP32-S3 Camera Test ===");
  
  // WiFi 연결 (선택사항 - 카메라만 테스트)
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ WiFi Connected!");
    Serial.printf("IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("⚠️ WiFi Failed (continuing without WiFi)");
  }
  
  // 카메라 초기화
  Serial.println("\n=== Camera Test ===");
  testCamera();
}

// ==================== Camera Test ====================
void testCamera() {
  Serial.println("Initializing camera...");
  
  // 메모리 상태 확인
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("PSRAM: %s\n", psramFound() ? "YES" : "NO");
  
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
  
  // PSRAM 없을 때 최소 해상도 사용
  const bool hasPsram = psramFound();
  
  if (hasPsram) {
    Serial.println("✅ PSRAM detected - using VGA (640x480)");
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 2;
  } else {
    Serial.println("⚠️ NO PSRAM - trying QVGA (320x240)");
    config.frame_size = FRAMESIZE_QVGA;  // 320x240 - 최소 메모리 사용
    config.jpeg_quality = 20;             // 낮은 품질로 파일 크기 감소
    config.fb_count = 1;                  // 싱글 버퍼만
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
  }
  
  Serial.printf("Free heap before init: %d bytes\n", ESP.getFreeHeap());
  
  // 카메라 초기화
  esp_err_t err = esp_camera_init(&config);
  
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init FAILED: 0x%x\n", err);
    Serial.printf("Free heap after failed init: %d bytes\n", ESP.getFreeHeap());
    
    // 더 작은 해상도로 재시도
    if (config.frame_size != FRAMESIZE_QQVGA) {
      Serial.println("\n🔄 Retrying with QQVGA (160x120)...");
      config.frame_size = FRAMESIZE_QQVGA;  // 160x120 - 매우 작음
      config.jpeg_quality = 25;
      config.fb_count = 1;
      
      err = esp_camera_init(&config);
      if (err != ESP_OK) {
        Serial.printf("❌ Retry also FAILED: 0x%x\n", err);
        Serial.println("\n💡 Troubleshooting:");
        Serial.println("   1. Check board settings: Tools → PSRAM → OPI PSRAM");
        Serial.println("   2. Check camera wiring");
        Serial.println("   3. Check power supply (5V recommended)");
        Serial.println("   4. Try different camera module");
        return;
      }
    } else {
      Serial.println("\n💡 Camera initialization failed completely");
      return;
    }
  }
  
  Serial.println("✅ Camera initialized successfully!");
  Serial.printf("Free heap after init: %d bytes\n", ESP.getFreeHeap());
  
  // 센서 정보 확인
  sensor_t *s = esp_camera_sensor_get();
  if (s != NULL) {
    Serial.printf("Camera sensor PID: 0x%x\n", s->id.PID);
    Serial.printf("Camera sensor VER: 0x%x\n", s->id.VER);
    
    // OV3660 설정
    s->set_vflip(s, 1);
    s->set_hmirror(s, 1);
    s->set_whitebal(s, 1);
    s->set_exposure_ctrl(s, 1);
    s->set_gain_ctrl(s, 1);
    
    Serial.println("✅ Sensor configured");
  }
  
  // 프레임 캡처 테스트
  Serial.println("\n=== Frame Capture Test ===");
  for (int i = 0; i < 5; i++) {
    Serial.printf("Test %d/5: Capturing frame...\n", i + 1);
    
    camera_fb_t *fb = esp_camera_fb_get();
    if (fb) {
      Serial.printf("✅ Frame captured! Size: %d bytes\n", fb->len);
      Serial.printf("   Width: %d, Height: %d\n", fb->width, fb->height);
      Serial.printf("   Format: %d\n", fb->format);
      Serial.printf("   Free heap: %d bytes\n", ESP.getFreeHeap());
      
      esp_camera_fb_return(fb);
      delay(1000);
    } else {
      Serial.println("❌ Frame capture failed!");
      break;
    }
  }
  
  Serial.println("\n✅ Camera test completed!");
}

// ==================== Loop ====================
void loop() {
  // 주기적으로 프레임 캡처 테스트
  delay(5000);
  
  camera_fb_t *fb = esp_camera_fb_get();
  if (fb) {
    Serial.printf("📸 Frame: %d bytes (heap: %d)\n", fb->len, ESP.getFreeHeap());
    esp_camera_fb_return(fb);
  } else {
    Serial.println("⚠️ Frame capture failed");
  }
}

