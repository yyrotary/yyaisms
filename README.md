# 명함 정보 추출 및 문자 발송 앱

명함을 촬영하여 정보를 추출하고, 추출된 연락처로 메시지를 보낼 수 있는 웹 애플리케이션입니다.

## 주요 기능

1. **명함 촬영 및 정보 추출**
   - 카메라를 통해 명함 촬영
   - OCR 기술을 활용한 명함 정보 자동 추출
   - 추출된 정보 수동 편집 가능

2. **메시지 발송**
   - 추출된 휴대전화번호로 메시지 발송
   - 사용자 정의 메시지 작성 가능
   - 내 명함 이미지 자동 첨부

## 기술 스택

- Next.js
- TypeScript
- Tesseract.js (OCR)
- React Webcam
- Tailwind CSS

## 설치 및 실행 방법

```bash
# 저장소 클론
git clone <repository-url>

# 디렉토리 이동
cd namecard

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 배포

이 애플리케이션은 Vercel을 통해 배포될 예정입니다.
배포 URL: https://yyaisms.vercel.app

## 프로젝트 구조

```
/
├── public/            # 정적 파일 (이미지 등)
├── src/               # 소스 코드
│   ├── app/           # Next.js 앱 디렉토리
│   │   ├── camera/    # 카메라 페이지
│   │   ├── message/   # 메시지 페이지
│   │   └── page.tsx   # 메인 페이지
│   └── components/    # 재사용 가능한 컴포넌트
└── package.json       # 프로젝트 의존성 및 스크립트
```

## 라이선스

[MIT](LICENSE) 