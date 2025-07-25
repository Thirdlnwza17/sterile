package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// โครงสร้างข้อมูล sterilizer
type SterilizerData struct {
	RawData    string    `json:"raw_data"`
	ReceivedAt time.Time `json:"received_at"`
	Source     string    `json:"source"` // "mock", "serial", "file"
}

func main() {
	apiURL := "http://localhost:3000/api/sterilizer-agent"

	fmt.Println("=== Sterilizer Data Agent ===")
	fmt.Println("1. Mock data (ทุก 10 วินาที)")
	fmt.Println("2. Read from file")
	fmt.Println("3. Manual input")
	fmt.Println("4. Serial port (ต้องติดตั้ง go-serial)")
	fmt.Print("เลือกโหมด (1-4): ")

	var choice string
	fmt.Scanln(&choice)

	switch choice {
	case "1":
		runMockMode(apiURL)
	case "2":
		runFileMode(apiURL)
	case "3":
		runManualMode(apiURL)
	case "4":
		runSerialMode(apiURL)
	default:
		fmt.Println("ใช้โหมด mock เป็นค่าเริ่มต้น")
		runMockMode(apiURL)
	}
}

func runMockMode(apiURL string) {
	fmt.Println("โหมด Mock - ส่งข้อมูลทุก 10 วินาที")
	for {
		mock := SterilizerData{
			RawData:    "MOCKDATA,STERILIZER_01,Standard,134,2.1,2024-07-17T10:00:00,2024-07-17T10:40:00,PASS,ชิติวัฒน์,ชุดผ่าตัดเล็ก",
			ReceivedAt: time.Now(),
			Source:     "mock",
		}
		postToAPI(apiURL, mock)
		fmt.Println("Mock data sent.")
		time.Sleep(10 * time.Second)
	}
}

func runFileMode(apiURL string) {
	fmt.Print("ใส่ชื่อไฟล์ที่เก็บข้อมูล: ")
	var filename string
	fmt.Scanln(&filename)

	file, err := os.Open(filename)
	if err != nil {
		fmt.Printf("ไม่สามารถเปิดไฟล์ %s: %v\n", filename, err)
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line != "" {
			data := SterilizerData{
				RawData:    line,
				ReceivedAt: time.Now(),
				Source:     "file",
			}
			postToAPI(apiURL, data)
			fmt.Printf("ส่งข้อมูล: %s\n", line)
			time.Sleep(2 * time.Second) // รอ 2 วินาทีระหว่างแต่ละบรรทัด
		}
	}
}

func runManualMode(apiURL string) {
	fmt.Println("โหมด Manual - ใส่ข้อมูลด้วยตัวเอง")
	fmt.Println("รูปแบบ: MACHINE_ID,PROGRAM,TEMP,TIME,START_TIME,END_TIME,RESULT,OPERATOR,ITEMS")
	fmt.Println("ตัวอย่าง: STERILIZER_01,Standard,134,2.1,2024-07-17T10:00:00,2024-07-17T10:40:00,PASS,ชิติวัฒน์,ชุดผ่าตัดเล็ก")
	fmt.Println("พิมพ์ 'quit' เพื่อออก")

	scanner := bufio.NewScanner(os.Stdin)
	for {
		fmt.Print("ใส่ข้อมูล: ")
		scanner.Scan()
		input := strings.TrimSpace(scanner.Text())

		if input == "quit" {
			break
		}

		if input != "" {
			data := SterilizerData{
				RawData:    input,
				ReceivedAt: time.Now(),
				Source:     "manual",
			}
			postToAPI(apiURL, data)
			fmt.Println("ข้อมูลถูกส่งแล้ว")
		}
	}
}

func runSerialMode(apiURL string) {
	fmt.Println("โหมด Serial - ต้องติดตั้ง go-serial ก่อน")
	fmt.Println("รันคำสั่ง: go get github.com/tarm/serial")
	fmt.Println("หรือใช้โหมดอื่นแทน")
}

func postToAPI(apiURL string, data SterilizerData) {
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		fmt.Println("JSON marshal error:", err)
		return
	}
	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(jsonBytes))
	if err != nil {
		fmt.Println("POST error:", err)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Printf("API response: %s\n", string(body))
}
