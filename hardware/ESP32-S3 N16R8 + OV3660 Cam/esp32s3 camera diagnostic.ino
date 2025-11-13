/*
 * Base Revolt - ESP32-S3 Camera Diagnostic Tool
 * 
 * 카메라 하드웨어 문제 진단용 코드
 * I2C 통신, 핀 상태, 전원 등을 단계별로 확인
 */

#include <WiFi.h>
#include <Wire.h>
#include "esp_camera.h"

// ==================== 설정 ====================
const char* ssid = "KT_GiGA_89E9";
const char* password = "ehk2dkg622";

// ==================== ESP32-S3 N16R8 + OV3660 카메라 핀 정의 ====================
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     15
#define SIOD_GPIO_NUM     4   // I2C SDA
#define SIOC_GPIO_NUM     5   // I2C SCL

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

// OV3660 I2C 주소 (일반적으로 0x3C 또는 0x78)
// OV3660-75mm-2764v1 모듈의 경우 0x3C 또는 0x78 사용
#define CAMERA_I2C_ADDR_1    0x3C
#define CAMERA_I2C_ADDR_2    0x78

// ==================== Setup ====================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════╗");
  Serial.println("║  ESP32-S3 Camera Diagnostic Tool  ║");
  Serial.println("╚════════════════════════════════════╝");
  Serial.println();
  
  // 1. 시스템 정보
  printSystemInfo();
  
  // 2. PSRAM 확인 (중요!)
  if (!psramFound()) {
    Serial.println("⚠️⚠️⚠️ WARNING: PSRAM NOT DETECTED! ⚠️⚠️⚠️");
    Serial.println("ESP32-S3 N16R8 should have PSRAM!");
    Serial.println();
    Serial.println("💡 Arduino IDE Board Settings:");
    Serial.println("   Tools → Board → ESP32S3 Dev Module");
    Serial.println("   Tools → PSRAM → OPI PSRAM (or QSPI PSRAM)");
    Serial.println("   Tools → Partition Scheme → Huge APP");
    Serial.println();
    Serial.println("   If PSRAM option is missing:");
    Serial.println("   1. Update ESP32 board package");
    Serial.println("   2. Check if board is actually ESP32-S3 N16R8");
    Serial.println();
  }
  
  // 3. 핀 상태 확인
  checkPins();
  
  // 4. I2C 통신 테스트 (중요!)
  testI2C();
  
  // 5. 카메라 초기화 시도 (여러 설정으로)
  testCameraInit();
  
  Serial.println("\n=== Diagnostic Complete ===");
  Serial.println("\n📋 Summary:");
  Serial.printf("   PSRAM: %s\n", psramFound() ? "✅ YES" : "❌ NO (CHECK BOARD SETTINGS!)");
  Serial.printf("   Free Heap: %d bytes\n", ESP.getFreeHeap());
  Serial.println();
}

void loop() {
  delay(10000);
  Serial.println("\n--- Periodic Check ---");
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("PSRAM: %s\n", psramFound() ? "YES" : "NO");
}

// ==================== System Info ====================
void printSystemInfo() {
  Serial.println("=== System Information ===");
  Serial.printf("Chip Model: %s\n", ESP.getChipModel());
  Serial.printf("Chip Revision: %d\n", ESP.getChipRevision());
  Serial.printf("CPU Frequency: %d MHz\n", ESP.getCpuFreqMHz());
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("Total heap: %d bytes\n", ESP.getHeapSize());
  Serial.printf("PSRAM: %s\n", psramFound() ? "YES" : "NO");
  if (psramFound()) {
    Serial.printf("Free PSRAM: %d bytes\n", ESP.getFreePsram());
    Serial.printf("Total PSRAM: %d bytes\n", ESP.getPsramSize());
  }
  Serial.println();
}

// ==================== Pin Check ====================
void checkPins() {
  Serial.println("=== Pin Status Check ===");
  
  // 카메라 핀 리스트
  struct {
    const char* name;
    int pin;
  } pins[] = {
    {"XCLK", XCLK_GPIO_NUM},
    {"SDA (SIOD)", SIOD_GPIO_NUM},
    {"SCL (SIOC)", SIOC_GPIO_NUM},
    {"VSYNC", VSYNC_GPIO_NUM},
    {"HREF", HREF_GPIO_NUM},
    {"PCLK", PCLK_GPIO_NUM},
    {"D0 (Y2)", Y2_GPIO_NUM},
    {"D1 (Y3)", Y3_GPIO_NUM},
    {"D2 (Y4)", Y4_GPIO_NUM},
    {"D3 (Y5)", Y5_GPIO_NUM},
    {"D4 (Y6)", Y6_GPIO_NUM},
    {"D5 (Y7)", Y7_GPIO_NUM},
    {"D6 (Y8)", Y8_GPIO_NUM},
    {"D7 (Y9)", Y9_GPIO_NUM},
  };
  
  for (int i = 0; i < sizeof(pins)/sizeof(pins[0]); i++) {
    if (pins[i].pin >= 0) {
      pinMode(pins[i].pin, INPUT_PULLUP);
      delay(10);
      int state = digitalRead(pins[i].pin);
      Serial.printf("  %-12s (GPIO %2d): %s\n", 
                    pins[i].name, 
                    pins[i].pin, 
                    state == HIGH ? "HIGH" : "LOW");
    }
  }
  Serial.println();
}

// ==================== I2C Test ====================
void testI2C() {
  Serial.println("=== I2C Communication Test ===");
  
  Wire.begin(SIOD_GPIO_NUM, SIOC_GPIO_NUM);  // SDA, SCL
  delay(100);
  
  Serial.println("Scanning I2C bus...");
  int found = 0;
  
  for (byte addr = 0x08; addr < 0x78; addr++) {
    Wire.beginTransmission(addr);
    byte error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.printf("  ✅ I2C device found at address 0x%02X\n", addr);
      found++;
      
      // OV3660-75mm-2764v1는 보통 0x3C 또는 0x78
      if (addr == CAMERA_I2C_ADDR_1 || addr == CAMERA_I2C_ADDR_2) {
        Serial.printf("     ⭐ This is likely the OV3660 camera sensor!\n");
        Serial.printf("     → OV3660-75mm-2764v1 detected\n");
        
        // I2C 레지스터 읽기 시도 (PID 확인)
        Wire.beginTransmission(addr);
        Wire.write(0x0A);  // PID High register
        Wire.endTransmission();
        Wire.requestFrom(addr, (uint8_t)2);
        if (Wire.available() >= 2) {
          uint16_t pid = (Wire.read() << 8) | Wire.read();
          Serial.printf("     → Sensor PID: 0x%04X (expected: 0x3660)\n", pid);
        }
      }
    } else if (error == 4) {
      Serial.printf("  ⚠️  Unknown error at address 0x%02X\n", addr);
    }
  }
  
  if (found == 0) {
    Serial.println("  ❌ No I2C devices found!");
    Serial.println("  💡 Check:");
    Serial.println("     1. SDA/SCL wiring (GPIO 4/5)");
    Serial.println("     2. Pull-up resistors (보통 카메라 모듈에 내장)");
    Serial.println("     3. Power supply to camera module");
  } else {
    Serial.printf("  Found %d I2C device(s)\n", found);
  }
  Serial.println();
}

// ==================== Camera Init Test ====================
void testCameraInit() {
  Serial.println("=== Camera Initialization Test ===");
  
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
  
  // 여러 해상도로 시도
  framesize_t sizes[] = {
    FRAMESIZE_QQVGA,  // 160x120 - 가장 작음
    FRAMESIZE_QCIF,   // 176x144
    FRAMESIZE_QVGA,   // 320x240
    FRAMESIZE_CIF,    // 400x296
    FRAMESIZE_VGA     // 640x480
  };
  
  const char* sizeNames[] = {
    "QQVGA (160x120)",
    "QCIF (176x144)",
    "QVGA (320x240)",
    "CIF (400x296)",
    "VGA (640x480)"
  };
  
  bool success = false;
  
  for (int i = 0; i < sizeof(sizes)/sizeof(sizes[0]); i++) {
    Serial.printf("\n--- Test %d: %s ---\n", i + 1, sizeNames[i]);
    
    config.frame_size = sizes[i];
    config.jpeg_quality = 20;
    config.fb_count = 1;  // 싱글 버퍼만
    config.grab_mode = CAMERA_GRAB_WHEN_EMPTY;
    
    Serial.printf("Free heap before: %d bytes\n", ESP.getFreeHeap());
    
    esp_err_t err = esp_camera_init(&config);
    
    if (err == ESP_OK) {
      Serial.printf("✅ SUCCESS with %s!\n", sizeNames[i]);
      
      // 센서 정보 확인
      sensor_t *s = esp_camera_sensor_get();
      if (s != NULL) {
        Serial.printf("  Sensor PID: 0x%04X\n", s->id.PID);
        Serial.printf("  Sensor VER: 0x%04X\n", s->id.VER);
        
        // OV3660-75mm-2764v1는 PID가 0x3660
        if (s->id.PID == 0x3660) {
          Serial.println("  ✅ OV3660-75mm-2764v1 sensor detected!");
          Serial.println("  ✅ Sensor is properly initialized");
        } else {
          Serial.printf("  ⚠️  Sensor PID: 0x%04X (expected 0x3660 for OV3660)\n", s->id.PID);
          Serial.println("  💡 This might be a different camera module");
        }
      }
      
      // 프레임 캡처 테스트
      Serial.println("  Testing frame capture...");
      camera_fb_t *fb = esp_camera_fb_get();
      if (fb) {
        Serial.printf("  ✅ Frame captured! Size: %d bytes\n", fb->len);
        Serial.printf("     Width: %d, Height: %d\n", fb->width, fb->height);
        esp_camera_fb_return(fb);
      } else {
        Serial.println("  ❌ Frame capture failed");
      }
      
      esp_camera_deinit();
      success = true;
      break;
      
    } else {
      Serial.printf("❌ FAILED: 0x%x\n", err);
      Serial.printf("Free heap after: %d bytes\n", ESP.getFreeHeap());
      
      // 에러 코드 해석
      if (err == 0x105) {
        Serial.println("  💡 Error 0x105: I2C communication failed");
        Serial.println("     → Check SDA/SCL wiring (GPIO 4/5)");
      } else if (err == 0x20001) {
        Serial.println("  💡 Error 0x20001: DMA configuration failed");
        Serial.println("     → Not enough memory or PSRAM not enabled");
      } else if (err == 0xffffffff) {
        Serial.println("  💡 Error 0xffffffff: General failure");
        Serial.println("     → Check wiring, power, or camera module");
      }
    }
    
    delay(500);
  }
  
  if (!success) {
    Serial.println("\n❌ All camera initialization attempts failed!");
    Serial.println("\n💡 Troubleshooting Checklist:");
    Serial.println("   [ ] Check board settings: Tools → PSRAM → OPI PSRAM");
    Serial.println("   [ ] Check camera module power (5V recommended)");
    Serial.println("   [ ] Check all camera wiring connections");
    Serial.println("   [ ] Verify SDA/SCL pins (GPIO 4/5)");
    Serial.println("   [ ] Check if camera module is compatible");
    Serial.println("   [ ] Try different camera module");
    Serial.println("   [ ] Check FPC cable connection (if applicable)");
  }
  
  Serial.println();
}

