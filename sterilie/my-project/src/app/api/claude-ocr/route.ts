import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Try multiple ways to get the API key
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 
                      process.env.NEXT_PUBLIC_CLAUDE_API_KEY || 
                      'your-claude-api-key-here';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

// Utility: Extract summary fields from OCR text
function extractSummaryFields(text: string) {
  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
  const serialMatch = text.match(/(Serial\s*No\.?|S\/N|หมายเลขเครื่อง)[:\s]*([A-Za-z0-9\-]+)/i);
  const programMatch = text.match(/(Program|โปรแกรม)[:\s]*([A-Za-z0-9\-]+)/i);
  const tempMatch = text.match(/(Temp(erature)?|อุณหภูมิ)[:\s]*([\d\.]+)\s*[cC]/);
  const timeMatch = text.match(/(Time|เวลาฆ่าเชื้อ|Sterilization Time)[:\s]*([\d:]+)\s*(min|นาที)?/i);
  const operatorMatch = text.match(/(Operator|ผู้ปฏิบัติงาน|ผู้บันทึก)[:\s]*([A-Za-zก-๙\s]+)/i);
  const chemResultMatch = text.match(/(Chemical Result|ผลตรวจทางเคมี)[:\s]*(ผ่าน|ไม่ผ่าน|pass|fail)/i);
  const bioResultMatch = text.match(/(Biological Result|ผลตรวจทางชีวภาพ)[:\s]*(ผ่าน|ไม่ผ่าน|pass|fail)/i);

  return {
    date: dateMatch ? dateMatch[1] : '',
    serial_number: serialMatch ? serialMatch[2] : '',
    program: programMatch ? programMatch[2] : '',
    temperature: tempMatch ? tempMatch[3] : '',
    sterilization_time: timeMatch ? timeMatch[2] : '',
    operator: operatorMatch ? operatorMatch[2].trim() : '',
    chemical_result: chemResultMatch ? chemResultMatch[2] : '',
    biological_result: bioResultMatch ? bioResultMatch[2] : '',
  };
}

export async function POST(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  try {
    const { imageBase64 } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image data provided' }, { 
        status: 400,
        headers 
      });
    }

    // Claude OCR
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'กรุณาอ่านข้อความทั้งหมดที่ปรากฏในรูปภาพนี้และถอดข้อความออกมาให้ครบถ้วนทุกบรรทัด โดยไม่ต้องสรุปหรือเลือกเฉพาะส่วนใดส่วนหนึ่ง (Please extract and transcribe all text from this image exactly as it appears, without summarizing or omitting any part. Return the full raw text.)'
              },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API Error:', response.status, errorData);
      return NextResponse.json({ 
        error: `Claude API error: ${response.status}`,
        details: errorData
      }, { 
        status: response.status,
        headers 
      });
    }

    const data = await response.json();
    const extractedText = data.content[0].text;
    console.log('OCR completed successfully');

    // Extract summary fields from OCR text
    const summary = extractSummaryFields(extractedText);

    // Return only the extracted text (no prefix) and summary (ไม่ต้องมี checkboxResults)
    return NextResponse.json({ text: extractedText, summary }, { headers });
  } catch (error) {
    console.error('OCR API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers 
    });
  }
} 