#include <WiFi.h>
#include <HTTPClient.h>
#include <HCSR04.h>

// WiFi credentials
const char* ssid = "Connect";
const char* password = "abdullah";

// Backend server URL
const char* serverName = "https://backend-o178.onrender.com/control-relay";  // Adjust with your backend URL

// Ultrasonic sensor pins
const int trigPin = 5;
const int echoPin = 18;

// Relay pin (connected to the relay module for controlling the water motor)
const int relayPin = 23;  // Adjust based on your wiring

UltraSonicDistanceSensor distanceSensor(trigPin, echoPin);

int distanceCm;
int resetDistance;

// To track the relay status
bool relayStatus = false;  // false means OFF, true means ON

unsigned long previousMillis = 0;
const long interval = 1000;  // Interval to send data (1 second)

void setup() {
  Serial.begin(9600);  // Start the Serial Monitor
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  
  // Wait for connection
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  
  Serial.println("Connected to WiFi!");

  // Set the relay pin as output
  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, LOW);  // Initially, the motor is off
}

void loop() {
  // Get the current time
  unsigned long currentMillis = millis();

  // If the interval has passed
  if (currentMillis - previousMillis >= interval) {
    // Save the last time we sent data
    previousMillis = currentMillis;

    distanceCm = distanceSensor.measureDistanceCm();  // Get the distance from the sensor

    // If the distance is -1 (invalid reading), skip uploading to the cloud
    if (distanceCm == -1) {
      Serial.println("Invalid distance reading, skipping upload");
      return;  // Skip this loop iteration
    }

    // Reset the distance when the tank is empty (distance <= 7 cm)
    if (distanceCm <= 7) {
      resetDistance = 6 - distanceCm;  // Reset the distance when tank is empty
    } else {
      resetDistance = distanceCm;  // Otherwise, use the measured distance
    }

    // Print the distance to Serial Monitor
    Serial.println(resetDistance);

    // Send the data to the backend
    sendDataToBackend(resetDistance, relayStatus);

    // Control water motor based on the distance
    controlWaterMotor(distanceCm);
  }

  // Other code can run here while waiting for the interval to pass
}

void sendDataToBackend(int distance, bool relayStatus) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverName);  // Specify the server URL

    http.addHeader("Content-Type", "application/json");  // Specify content type as JSON

    // Create a JSON body for the POST request
    String jsonPayload = "{\"distance\": " + String(distance) + ", \"relayStatus\": \"" + (relayStatus ? "ON" : "OFF") + "\"}";

    // Send HTTP POST request with the data
    int httpResponseCode = http.POST(jsonPayload);

    // Check for HTTP response code
    if (httpResponseCode > 0) {
      Serial.println("Data sent successfully");
      Serial.println("HTTP Response Code: " + String(httpResponseCode));
    } else {
      Serial.println("Error in sending POST request");
      Serial.println("HTTP Response Code: " + String(httpResponseCode));
    }

    // Close the connection
    http.end();
  } else {
    Serial.println("WiFi not connected");
  }
}

void controlWaterMotor(int distance) {
  if (distance == -1) {
    // If the reading is invalid, do nothing
    return;
  }

  // If the water level is below 12 cm, turn on the motor (start filling)
  if (distance < 12) {
    if (digitalRead(relayPin) == LOW) {
      // If the relay is LOW, it means the motor is off, so we turn it on
      Serial.println("Water level below 12 cm, turning motor ON");
      digitalWrite(relayPin, HIGH);  // Relay ON
      relayStatus = true;  // Update relay status to ON

      // Send the command to the server to turn the relay ON
      sendRelayCommand("ON");
    }
  } 
  // If the water level is at or above 12 cm, turn off the motor (stop filling)
  else if (distance >= 12) {
    if (digitalRead(relayPin) == HIGH) {
      // If the relay is HIGH, it means the motor is on, so we turn it off
      Serial.println("Water level above 12 cm, turning motor OFF");
      digitalWrite(relayPin, LOW);  // Relay OFF
      relayStatus = false;  // Update relay status to OFF

      // Send the command to the server to turn the relay OFF
      sendRelayCommand("OFF");
    }
  }
}

void sendRelayCommand(String action) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverName);  // Specify the server URL

    http.addHeader("Content-Type", "application/json");  // Specify content type as JSON

    // Create a JSON body for the POST request
    String jsonPayload = "{\"action\": \"" + action + "\"}";

    // Send HTTP POST request with the data
    int httpResponseCode = http.POST(jsonPayload);

    // Check for HTTP response code
    if (httpResponseCode > 0) {
      Serial.println("Relay command sent successfully");
      Serial.println("HTTP Response Code: " + String(httpResponseCode));
    } else {
      Serial.println("Error in sending relay command");
      Serial.println("HTTP Response Code: " + String(httpResponseCode));
    }

    // Close the connection
    http.end();
  } else {
    Serial.println("WiFi not connected");
  }
}
