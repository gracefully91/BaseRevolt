/*
 * Base Revolt - Standalone ESP32-CAM RC Car (테스트용)
 * 서버 없이 독립적으로 작동하는 버전
 * 
 * 사용법:
 * 1. WiFi 정보 입력
 * 2. 업로드 후 시리얼 모니터에서 IP 확인
 * 3. 브라우저에서 해당 IP 접속
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>

// AI-Thinker ESP32-CAM 모델의 카메라 핀 설정
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

// ================================================================
//               ★ 여기에 자신의 Wi-Fi 정보를 입력하세요 ★
// ================================================================
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
// ================================================================

// L298N 모터 드라이버 핀 설정 (탱크/스키드 스티어링 기준)
#define LEFT_MOTOR_PIN_1  12  // L298N IN1 (왼쪽 모터)
#define LEFT_MOTOR_PIN_2  13  // L298N IN2 (왼쪽 모터)
#define RIGHT_MOTOR_PIN_1 14  // L298N IN3 (오른쪽 모터)
#define RIGHT_MOTOR_PIN_2 15  // L298N IN4 (오른쪽 모터)

// PWM 속도 제어 핀 (선택사항 - L298N ENA, ENB)
#define LEFT_MOTOR_PWM    2   // ENA
#define RIGHT_MOTOR_PWM   4   // ENB

// PWM 설정
const int PWM_FREQ = 1000;      // 1 kHz
const int PWM_RESOLUTION = 8;   // 8-bit (0-255)
const int PWM_CHANNEL_LEFT = 0;
const int PWM_CHANNEL_RIGHT = 1;
int motorSpeed = 200;           // 기본 속도 (0-255)

WebServer server(80);

// 웹 페이지 HTML 코드
const char index_html[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta charset="UTF-8">
  <title>ESP32-CAM RC Car</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      text-align: center; 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; 
      padding: 20px;
      min-height: 100vh;
    }
    h1 { 
      margin: 20px 0; 
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      font-size: 2em;
    }
    #stream-container { 
      margin: 20px auto; 
      border: 5px solid rgba(255,255,255,0.3);
      border-radius: 15px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      overflow: hidden;
      max-width: 640px;
      background: #000;
    }
    #stream {
      width: 100%;
      height: auto;
      display: block;
    }
    #controls { 
      display: grid; 
      grid-template-columns: repeat(3, 1fr); 
      grid-gap: 15px; 
      max-width: 350px; 
      margin: 30px auto;
    }
    button { 
      width: 100%; 
      height: 90px; 
      font-size: 28px; 
      color: white; 
      border: none; 
      border-radius: 15px;
      cursor: pointer;
      touch-action: manipulation;
      transition: all 0.2s;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      font-weight: bold;
    }
    button:active {
      transform: scale(0.95);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }
    .forward { 
      grid-column: 2; 
      background: linear-gradient(135deg, #11998e, #38ef7d);
    }
    .left { 
      grid-column: 1; 
      grid-row: 2; 
      background: linear-gradient(135deg, #2193b0, #6dd5ed);
    }
    .stop { 
      grid-column: 2; 
      grid-row: 2; 
      background: linear-gradient(135deg, #ee0979, #ff6a00);
    }
    .right { 
      grid-column: 3; 
      grid-row: 2; 
      background: linear-gradient(135deg, #2193b0, #6dd5ed);
    }
    .backward { 
      grid-column: 2; 
      grid-row: 3; 
      background: linear-gradient(135deg, #f46b45, #eea849);
    }
    #speed-control {
      max-width: 350px;
      margin: 20px auto;
      background: rgba(255,255,255,0.1);
      padding: 20px;
      border-radius: 15px;
      backdrop-filter: blur(10px);
    }
    #speed-slider {
      width: 100%;
      height: 8px;
      border-radius: 5px;
      background: rgba(255,255,255,0.3);
      outline: none;
      margin: 10px 0;
    }
    #speed-value {
      font-size: 1.5em;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .status {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0,0,0,0.5);
      padding: 10px 20px;
      border-radius: 20px;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="status">🟢 연결됨</div>
  <h1>🚗 ESP32-CAM RC Car</h1>
  
  <div id="stream-container">
    <img id="stream" src="" alt="Camera Stream">
  </div>
  
  <div id="speed-control">
    <div>⚡ 속도: <span id="speed-value">200</span></div>
    <input type="range" id="speed-slider" min="100" max="255" value="200">
  </div>
  
  <div id="controls">
    <button class="forward" onmousedown="sendCommand('forward')" onmouseup="sendCommand('stop')" ontouchstart="sendCommand('forward')" ontouchend="sendCommand('stop')">▲</button>
    <button class="left" onmousedown="sendCommand('left')" onmouseup="sendCommand('stop')" ontouchstart="sendCommand('left')" ontouchend="sendCommand('stop')">◄</button>
    <button class="stop" onclick="sendCommand('stop')">■</button>
    <button class="right" onmousedown="sendCommand('right')" onmouseup="sendCommand('stop')" ontouchstart="sendCommand('right')" ontouchend="sendCommand('stop')">►</button>
    <button class="backward" onmousedown="sendCommand('backward')" onmouseup="sendCommand('stop')" ontouchstart="sendCommand('backward')" ontouchend="sendCommand('stop')">▼</button>
  </div>

<script>
  // 페이지가 로드되면 스트리밍 주소를 img 태그에 설정
  window.onload = function() {
    document.getElementById('stream').src = 'http://' + window.location.hostname + '/stream';
  };

  // 속도 슬라이더
  const speedSlider = document.getElementById('speed-slider');
  const speedValue = document.getElementById('speed-value');
  
  speedSlider.oninput = function() {
    speedValue.textContent = this.value;
    fetch('/speed?value=' + this.value);
  };

  // 터치 이벤트가 기본 동작을 막도록 설정
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('touchstart', (e) => e.preventDefault());
    btn.addEventListener('touchend', (e) => e.preventDefault());
  });

  // 서버로 제어 명령을 보내는 함수
  function sendCommand(command) {
    fetch('/action?go=' + command)
      .catch(err => console.error('명령 전송 실패:', err));
  }
  
  // 키보드 컨트롤
  let keyPressed = {};
  
  document.addEventListener('keydown', (e) => {
    if (keyPressed[e.key]) return;
    keyPressed[e.key] = true;
    
    switch(e.key) {
      case 'ArrowUp': case 'w': sendCommand('forward'); break;
      case 'ArrowDown': case 's': sendCommand('backward'); break;
      case 'ArrowLeft': case 'a': sendCommand('left'); break;
      case 'ArrowRight': case 'd': sendCommand('right'); break;
    }
  });
  
  document.addEventListener('keyup', (e) => {
    keyPressed[e.key] = false;
    sendCommand('stop');
  });
</script>
</body>
</html>
)rawliteral";

// 웹 서버가 영상 스트림을 처리하는 함수
void handleStream() {
  WiFiClient client = server.client();
  String response = "HTTP/1.1 200 OK\r\n";
  response += "Content-Type: multipart/x-mixed-replace; boundary=frame\r\n\r\n";
  server.sendContent(response);

  while (client.connected()) {
    camera_fb_t *fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      break;
    }
    
    client.print("--frame\r\n");
    client.print("Content-Type: image/jpeg\r\n\r\n");
    client.write(fb->buf, fb->len);
    client.print("\r\n");
    esp_camera_fb_return(fb);
    
    // 프레임 레이트 제어 (약 15 FPS)
    delay(66);
  }
}

// 웹 서버가 제어 명령을 처리하는 함수
void handleAction() {
  String command = server.arg("go");
  
  if (command == "forward") {
    digitalWrite(LEFT_MOTOR_PIN_1, HIGH); 
    digitalWrite(LEFT_MOTOR_PIN_2, LOW);
    digitalWrite(RIGHT_MOTOR_PIN_1, HIGH); 
    digitalWrite(RIGHT_MOTOR_PIN_2, LOW);
    ledcWrite(PWM_CHANNEL_LEFT, motorSpeed);
    ledcWrite(PWM_CHANNEL_RIGHT, motorSpeed);
    Serial.println("전진");
    
  } else if (command == "backward") {
    digitalWrite(LEFT_MOTOR_PIN_1, LOW); 
    digitalWrite(LEFT_MOTOR_PIN_2, HIGH);
    digitalWrite(RIGHT_MOTOR_PIN_1, LOW); 
    digitalWrite(RIGHT_MOTOR_PIN_2, HIGH);
    ledcWrite(PWM_CHANNEL_LEFT, motorSpeed);
    ledcWrite(PWM_CHANNEL_RIGHT, motorSpeed);
    Serial.println("후진");
    
  } else if (command == "left") {
    digitalWrite(LEFT_MOTOR_PIN_1, LOW); 
    digitalWrite(LEFT_MOTOR_PIN_2, HIGH);
    digitalWrite(RIGHT_MOTOR_PIN_1, HIGH); 
    digitalWrite(RIGHT_MOTOR_PIN_2, LOW);
    ledcWrite(PWM_CHANNEL_LEFT, motorSpeed);
    ledcWrite(PWM_CHANNEL_RIGHT, motorSpeed);
    Serial.println("좌회전");
    
  } else if (command == "right") {
    digitalWrite(LEFT_MOTOR_PIN_1, HIGH); 
    digitalWrite(LEFT_MOTOR_PIN_2, LOW);
    digitalWrite(RIGHT_MOTOR_PIN_1, LOW); 
    digitalWrite(RIGHT_MOTOR_PIN_2, HIGH);
    ledcWrite(PWM_CHANNEL_LEFT, motorSpeed);
    ledcWrite(PWM_CHANNEL_RIGHT, motorSpeed);
    Serial.println("우회전");
    
  } else if (command == "stop") {
    digitalWrite(LEFT_MOTOR_PIN_1, LOW); 
    digitalWrite(LEFT_MOTOR_PIN_2, LOW);
    digitalWrite(RIGHT_MOTOR_PIN_1, LOW); 
    digitalWrite(RIGHT_MOTOR_PIN_2, LOW);
    ledcWrite(PWM_CHANNEL_LEFT, 0);
    ledcWrite(PWM_CHANNEL_RIGHT, 0);
    Serial.println("정지");
  }
  
  server.send(200, "text/plain", "OK");
}

// 속도 조절 핸들러
void handleSpeed() {
  if (server.hasArg("value")) {
    motorSpeed = server.arg("value").toInt();
    motorSpeed = constrain(motorSpeed, 100, 255);
    Serial.printf("속도 변경: %d\n", motorSpeed);
  }
  server.send(200, "text/plain", "OK");
}

void setup() {
  Serial.begin(115200);
  Serial.setDebugOutput(true);
  Serial.println("\n\n=== ESP32-CAM RC Car (Standalone) ===");

  // 모터 핀을 출력으로 설정
  pinMode(LEFT_MOTOR_PIN_1, OUTPUT);
  pinMode(LEFT_MOTOR_PIN_2, OUTPUT);
  pinMode(RIGHT_MOTOR_PIN_1, OUTPUT);
  pinMode(RIGHT_MOTOR_PIN_2, OUTPUT);

  // PWM 설정
  ledcSetup(PWM_CHANNEL_LEFT, PWM_FREQ, PWM_RESOLUTION);
  ledcSetup(PWM_CHANNEL_RIGHT, PWM_FREQ, PWM_RESOLUTION);
  ledcAttachPin(LEFT_MOTOR_PWM, PWM_CHANNEL_LEFT);
  ledcAttachPin(RIGHT_MOTOR_PWM, PWM_CHANNEL_RIGHT);

  // 카메라 설정
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
  
  // PSRAM 확인 및 설정
  if(psramFound()){
    config.frame_size = FRAMESIZE_QVGA; // 320x240
    config.jpeg_quality = 12; // 0-63 낮을수록 고품질
    config.fb_count = 2;
    Serial.println("PSRAM 발견 - 고품질 설정");
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 15;
    config.fb_count = 1;
    Serial.println("PSRAM 없음 - 기본 설정");
  }

  // 카메라 초기화
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("카메라 초기화 실패: 0x%x\n", err);
    return;
  }
  Serial.println("카메라 초기화 완료!");

  // Wi-Fi 연결
  Serial.printf("Wi-Fi 연결 중: %s\n", ssid);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("\nWi-Fi 연결 실패!");
    return;
  }
  
  Serial.println("\nWi-Fi 연결 성공!");
  Serial.print("카메라 스트림 준비 완료! 접속 주소: http://");
  Serial.println(WiFi.localIP());
  Serial.println("\n브라우저에서 위 주소로 접속하세요!");

  // 웹 서버 경로 설정
  server.on("/", []() { 
    server.send_P(200, "text/html", index_html); 
  });
  server.on("/stream", handleStream);
  server.on("/action", handleAction);
  server.on("/speed", handleSpeed);

  // 웹 서버 시작
  server.begin();
  Serial.println("웹 서버 시작 완료!");
}

void loop() {
  server.handleClient();
  delay(1);
}

