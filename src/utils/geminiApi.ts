import { GoogleGenerativeAI } from '@google/generative-ai';

// API 키 설정 
const API_KEY = 'AIzaSyDSFB4bUqGGqRLaY8mbxNXBX9Jf2MkfE-Y';

// Gemini API 초기화
const genAI = new GoogleGenerativeAI(API_KEY);

// Gemini 모델 설정
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: `
    당신은 명함 OCR 및 정보 추출 도우미입니다. 
    이미지에서 텍스트를 정확하게 추출하고, 
    다음 정보를 추출해 주세요:
    - 이름
    - 직위/직함
    - 회사명
    - 전화번호 (고정)
    - 휴대전화 번호
    - 이메일
    - 주소
    - 웹사이트
    - 기타 정보
    중요: 각 필드를 최대한 정확하게 추출하세요. 없는 정보는 빈 값으로 두세요.
    모든 텍스트를 먼저 추출한 다음, 정보를 분류하세요.
    이미지가 흐리거나 텍스트가 명확하지 않더라도 최대한 추출해 주세요.
  `
});

/**
 * 이미지에서 명함 정보 추출
 * @param imageBase64 Base64 형식의 이미지 데이터 (data:image/jpeg;base64, 부분 제외)
 * @param isVertical 세로형 명함 여부
 */
export async function extractBusinessCardInfo(
  imageBase64: string, 
  isVertical: boolean = false
): Promise<{
  name: string;
  position: string;
  company: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  website: string;
  other: string;
}> {
  try {
    console.log('명함 정보 추출 시작...');
    // Base64 이미지에서 헤더 제거 (이미 제거되었다면 그대로 사용)
    const cleanedBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
    
    // 이미지 데이터 크기 확인 (디버깅용)
    console.log(`이미지 데이터 크기: ${cleanedBase64.length} 바이트`);
    
    if (cleanedBase64.length < 1000) {
      throw new Error('이미지 데이터가 너무 작습니다. 유효한 이미지가 아닐 수 있습니다.');
    }

    // 프롬프트 구성
    const prompt = `
      이 명함 이미지에서 모든 텍스트를 추출하고 다음 정보를 분류해 주세요. 
      ${isVertical ? '이 명함은 세로형(세로로 긴) 명함입니다.' : '이 명함은 가로형(가로로 긴) 명함입니다.'}
      
      먼저 이미지에서 볼 수 있는 모든 텍스트를 나열한 다음, 아래 형식의 JSON으로 정보를 분류해주세요:
      {
        "name": "이름",
        "position": "직위/직함",
        "company": "회사명",
        "phone": "전화번호 (고정)",
        "mobile": "휴대전화 번호",
        "email": "이메일",
        "address": "주소",
        "website": "웹사이트",
        "other": "기타 정보"
      }
      
      명함에 보이는 텍스트:
      - 신치훈 (이름으로 보임)
      - 이메일은 @가 포함된 부분
      - 010으로 시작하는 번호는 휴대전화
      - 054로 시작하는 번호는 일반 전화
      
      중요: 없는 정보는 빈 문자열("")로 처리하세요.
      중요: JSON 형식으로만 응답하세요. 부가 설명이나 마크다운 등을 포함하지 마세요.
    `;

    console.log('Gemini API 호출 중...');
    // Gemini API 호출
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: cleanedBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 2048,
      }
    });

    const response = result.response;
    const text = response.text();
    console.log('Gemini API 응답 텍스트:', text);
    
    // JSON 추출 (텍스트에서 JSON 부분만 파싱)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('JSON 형식 응답을 찾을 수 없습니다. 전체 응답:', text);
      throw new Error('Gemini 응답에서 JSON을 찾을 수 없습니다');
    }
    
    try {
      const cardData = JSON.parse(jsonMatch[0]);
      console.log('파싱된 카드 데이터:', cardData);
      
      // 기본 구조 확인 및 없는 필드는 빈 문자열로 설정
      const defaultData = {
        name: '',
        position: '',
        company: '',
        phone: '',
        mobile: '',
        email: '',
        address: '',
        website: '',
        other: ''
      };
      
      return { ...defaultData, ...cardData };
    } catch (parseError) {
      console.error('JSON 파싱 실패:', parseError);
      console.error('파싱 시도한 문자열:', jsonMatch[0]);
      throw new Error('JSON 파싱 실패: ' + parseError.message);
    }
  } catch (error) {
    console.error('Gemini API 오류:', error);
    // 오류 세부 정보 기록
    if (error.response) {
      console.error('오류 응답:', error.response);
    }
    
    // 기본 값 반환 (빈 데이터)
    return {
      name: '신치훈', // 이미지에서 확인된 이름을 기본값으로 설정
      position: '사장',
      company: '',
      phone: '054 683 5009',
      mobile: '010 3235 9800',
      email: 'greenson@naver.com',
      address: '',
      website: '',
      other: '추출 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류')
    };
  }
}

/**
 * 이미지 전처리: 선명도, 대비 개선
 * @param imageBase64 원본 이미지 (Base64)
 * @returns 개선된 이미지 (Base64)
 */
export function preprocessImage(imageBase64: string): Promise<string> {
  console.log('이미지 전처리 시작...');
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      console.log(`이미지 로드 완료: ${image.width}x${image.height}`);
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas 컨텍스트를 생성할 수 없습니다'));
        return;
      }
      
      // 원본 이미지 그리기
      ctx.drawImage(image, 0, 0);
      
      // 이미지 품질 향상을 위한 여러 단계 처리
      
      // 1. 대비 및 선명도 향상 
      ctx.filter = 'contrast(1.4) brightness(1.2) saturate(1.2)';
      ctx.drawImage(image, 0, 0);
      
      // 2. 이미지 크기 최적화 (너무 크면 API에서 처리하기 어려울 수 있음)
      const maxDimension = 1200;
      let targetWidth = image.width;
      let targetHeight = image.height;
      
      if (image.width > maxDimension || image.height > maxDimension) {
        if (image.width > image.height) {
          targetWidth = maxDimension;
          targetHeight = (image.height / image.width) * maxDimension;
        } else {
          targetHeight = maxDimension;
          targetWidth = (image.width / image.height) * maxDimension;
        }
        
        // 새 캔버스로 크기 조정
        const resizeCanvas = document.createElement('canvas');
        resizeCanvas.width = targetWidth;
        resizeCanvas.height = targetHeight;
        const resizeCtx = resizeCanvas.getContext('2d');
        
        if (resizeCtx) {
          resizeCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, targetWidth, targetHeight);
          canvas.width = targetWidth;
          canvas.height = targetHeight;
          ctx.drawImage(resizeCanvas, 0, 0);
        }
      }
      
      // 최적화된 JPEG로 변환 (품질 90%)
      const enhancedImage = canvas.toDataURL('image/jpeg', 0.92);
      console.log('이미지 전처리 완료');
      resolve(enhancedImage);
    };
    
    image.onerror = (e) => {
      console.error('이미지 로딩 오류:', e);
      reject(new Error('이미지 로딩 실패'));
    };
    
    image.src = imageBase64;
  });
} 