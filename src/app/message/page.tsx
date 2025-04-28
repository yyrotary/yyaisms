"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import styles from './message.module.css';

export default function MessagePage() {
  const router = useRouter();
  const [cardData, setCardData] = useState<{
    image: string;
    name: string;
    position: string;
    company: string;
    phone: string;
    mobile: string;
    email: string;
    address: string;
    website: string;
    other: string;
  } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showImageDownload, setShowImageDownload] = useState(false);
  const [showContactSave, setShowContactSave] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const storedData = localStorage.getItem('cardData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log("로드된 명함 데이터:", parsedData.name, parsedData.mobile);
        console.log("이미지 데이터 길이:", parsedData.image ? parsedData.image.length : 0);
        setCardData(parsedData);
      } catch (e) {
        console.error("명함 데이터 파싱 오류:", e);
      }
    }

    // Generate the default message
    if (storedData) {
      const data = JSON.parse(storedData);
      const defaultMessage = generateDefaultMessage(data.name, data.position, data.company);
      setMessageContent(defaultMessage);
    }
  }, []);

  const generateDefaultMessage = (name: string, position: string, company: string = '') => {
    // 직책과 회사 정보 결합
    const positionWithCompany = company 
      ? `${position} (${company})` 
      : position;
    
    return `안녕하세요, ${name} ${positionWithCompany}님,
이번에 영덕법원 조정위원으로 새롭게 위촉된 신치훈입니다.

앞으로 여러 선배님들과 관계자 님들과 함께 조정 업무를 수행하게 되어 매우 영광입니다. 많이 배우고, 함께 성장할 수 있도록 최선을 다하겠습니다.
부족한 점이 많겠지만, 지도와 조언 부탁드립니다.

제 연락처와 명함을 함께 보내드리니, 언제든 편하게 연락 주시면 감사하겠습니다.

감사합니다.
신치훈 드림`;
  };

  const handleSendMessage = async () => {
    if (!cardData || !cardData.mobile) {
      setSendResult({
        success: false,
        message: '휴대전화 번호가 없어 메시지를 보낼 수 없습니다.'
      });
      return;
    }

    // 이미지 체크
    if (!cardData.image || cardData.image.length < 100) {
      setSendResult({
        success: false,
        message: '명함 이미지가 없거나 손상되었습니다. 다시 촬영해주세요.'
      });
      return;
    }

    setIsSending(true);

    try {
      // Clean up phone number - remove any non-digit characters
      const cleanPhoneNumber = cardData.mobile.replace(/[^0-9]/g, '');
      
      // Check if phone number is valid (Korean mobile number)
      if (!cleanPhoneNumber.match(/^01[016789]\d{7,8}$/)) {
        throw new Error('유효하지 않은 전화번호 형식입니다: ' + cardData.mobile);
      }
      
      // 메시지만 발송 - 이미지는 별도 발송
      const messageOnly = messageContent;
      const encodedMessage = encodeURIComponent(messageOnly);
      
      console.log("문자 메시지 발송 준비:", cleanPhoneNumber);
      
      // 문자 앱 열기
      const smsUri = `sms:${cleanPhoneNumber}?body=${encodedMessage}`;
      
      // 모바일 기기별 맞춤 처리
      if (/Android/i.test(navigator.userAgent)) {
        window.location.href = smsUri;
      } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        // iOS에서는 다른 형식 사용
        const iosUri = `sms:${cleanPhoneNumber}&body=${encodedMessage}`;
        window.location.href = iosUri;
      } else {
        // 기타 기기에서는 새 창으로 시도
        window.open(smsUri, '_blank');
      }
      
      // 다운로드 버튼 표시
      setShowImageDownload(true);
      // 연락처 저장 버튼 표시
      setShowContactSave(true);
      
      setTimeout(() => {
        setIsSending(false);
        setSendResult({
          success: true,
          message: `문자 메시지를 발송했습니다. 이제 명함 이미지를 첨부하거나 주소록에 연락처를 저장할 수 있습니다.`
        });
      }, 1000);
    } catch (error) {
      console.error('문자 앱 실행 오류:', error);
      setSendResult({
        success: false,
        message: `문자 앱 실행 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      });
      setIsSending(false);
    }
  };

  const handleSendNamecard = async () => {
    if (!cardData || !cardData.mobile) {
      setSendResult({
        success: false,
        message: '휴대전화 번호가 없어 명함을 보낼 수 없습니다.'
      });
      return;
    }

    // 이미지 체크
    if (!cardData.image || cardData.image.length < 100) {
      setSendResult({
        success: false,
        message: '명함 이미지가 없거나 손상되었습니다. 다시 촬영해주세요.'
      });
      return;
    }

    setIsSending(true);

    try {
      // 먼저 이미지 다운로드 표시
      setShowImageDownload(true);
      
      // 명함을 저장할 수 있는 안내 표시
      setShowContactSave(true);
      
      // Clean up phone number - remove any non-digit characters
      const cleanPhoneNumber = cardData.mobile.replace(/[^0-9]/g, '');
      
      // Check if phone number is valid (Korean mobile number)
      if (!cleanPhoneNumber.match(/^01[016789]\d{7,8}$/)) {
        throw new Error('유효하지 않은 전화번호 형식입니다: ' + cardData.mobile);
      }
      
      // 문자 앱 열기 (내용 없이)
      const smsUri = `sms:${cleanPhoneNumber}`;
      
      // 사용자에게 설명
      alert("명함 이미지를 먼저 저장 후, 문자 앱에서 이미지를 첨부하여 전송하세요.");
      
      // 모바일 기기별 맞춤 처리
      if (/Android/i.test(navigator.userAgent)) {
        window.location.href = smsUri;
      } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = smsUri;
      } else {
        // 기타 기기에서는 새 창으로 시도
        window.open(smsUri, '_blank');
      }
      
      setTimeout(() => {
        setIsSending(false);
        setSendResult({
          success: true,
          message: `문자 앱이 실행되었습니다. 아래 버튼을 이용하여 이미지를 저장한 다음 문자에 첨부해서 보내세요.`
        });
      }, 1000);
    } catch (error) {
      console.error('문자 앱 실행 오류:', error);
      setSendResult({
        success: false,
        message: `문자 앱 실행 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      });
      setIsSending(false);
    }
  };

  const downloadMyCardImage = () => {
    // 내 명함 이미지를 기기에 저장
    try {
      // 이미지 가져오기
      fetch('/shinchihoon.png')
        .then(response => response.blob())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'shinchihoon_namecard.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          alert('내 명함 이미지가 다운로드 되었습니다. 이 이미지를 문자 메시지에 첨부해주세요.');
        })
        .catch(e => {
          console.error('명함 이미지 다운로드 오류:', e);
          alert('명함 이미지 다운로드 중 오류가 발생했습니다.');
        });
    } catch (e) {
      console.error('명함 이미지 다운로드 오류:', e);
      alert('명함 이미지 다운로드 중 오류가 발생했습니다.');
    }
  };

  const downloadContactCardImage = () => {
    // 촬영한 명함 이미지를 기기에 저장
    if (!cardData || !cardData.image) {
      alert('저장할 명함 이미지가 없습니다.');
      return;
    }
    
    try {
      // 데이터 URL에서 Blob 생성
      const fetchBlob = async (dataUrl) => {
        const res = await fetch(dataUrl);
        return res.blob();
      };
      
      fetchBlob(cardData.image)
        .then(blob => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'contact_namecard.jpg';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          alert('촬영한 명함 이미지가 다운로드 되었습니다.');
        })
        .catch(e => {
          console.error('명함 이미지 다운로드 오류:', e);
          alert('명함 이미지 다운로드 중 오류가 발생했습니다.');
        });
    } catch (e) {
      console.error('명함 이미지 다운로드 오류:', e);
      alert('명함 이미지 다운로드 중 오류가 발생했습니다.');
    }
  };

  const saveToContacts = () => {
    if (!cardData) {
      alert('저장할 연락처 정보가 없습니다.');
      return;
    }

    try {
      // vCard 형식으로 연락처 데이터 생성
      const vcard = createVCard(cardData);
      
      // 링크 생성
      const link = document.createElement('a');
      const blob = new Blob([vcard], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      
      link.href = url;
      link.download = `${cardData.name || '연락처'}.vcf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Blob URL 해제
      URL.revokeObjectURL(url);
      
      alert('연락처가 생성되었습니다. 기기의 주소록에 저장할 수 있습니다.');
    } catch (e) {
      console.error('연락처 저장 오류:', e);
      alert('연락처 저장 중 오류가 발생했습니다.');
    }
  };

  const createVCard = (contact: {
    name?: string;
    position?: string;
    company?: string;
    phone?: string;
    mobile?: string;
    email?: string;
    address?: string;
    website?: string;
    other?: string;
    note?: string;
  }) => {
    // vCard 형식으로 데이터 구성
    let vcard = 'BEGIN:VCARD\r\nVERSION:3.0\r\n';
    
    // 이름
    if (contact.name) {
      vcard += `FN:${contact.name}\r\n`;
      vcard += `N:${contact.name};;;;\r\n`;
    }
    
    // 회사
    if (contact.company) {
      vcard += `ORG:${contact.company}\r\n`;
    }
    
    // 직위
    if (contact.position) {
      vcard += `TITLE:${contact.position}\r\n`;
    }
    
    // 전화번호
    if (contact.mobile) {
      vcard += `TEL;TYPE=CELL:${contact.mobile}\r\n`;
    }
    
    if (contact.phone) {
      vcard += `TEL;TYPE=WORK:${contact.phone}\r\n`;
    }
    
    // 이메일
    if (contact.email) {
      vcard += `EMAIL:${contact.email}\r\n`;
    }
    
    // 주소
    if (contact.address) {
      vcard += `ADR;TYPE=WORK:;;${contact.address};;;;\r\n`;
    }
    
    // 웹사이트
    if (contact.website) {
      vcard += `URL:${contact.website}\r\n`;
    }
    
    // 메모
    if (contact.note || contact.other) {
      vcard += `NOTE:${contact.note || contact.other}\r\n`;
    }
    
    vcard += 'END:VCARD';
    return vcard;
  };

  if (!isClient) {
    return <div>Loading...</div>;
  }

  if (!cardData) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>오류</h1>
        <p>명함 정보를 찾을 수 없습니다. 다시 촬영해 주세요.</p>
        <Link href="/camera" className={styles.button}>
          명함 다시 촬영하기
        </Link>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>메시지 보내기</h1>

      <div className={styles.container}>
        <div className={styles.cardInfoSection}>
          <h2>명함 정보</h2>
          <div className={styles.cardInfo}>
            <div className={styles.imageContainer}>
              {cardData.image && (
                <Image 
                  src={cardData.image} 
                  alt="Captured business card" 
                  className={styles.cardImage}
                  width={300}
                  height={200}
                  unoptimized
                />
              )}
            </div>
            
            <div className={styles.infoContainer}>
              <p><strong>이름:</strong> {cardData.name}</p>
              <p><strong>직위:</strong> {cardData.position}</p>
              {cardData.company && <p><strong>회사:</strong> {cardData.company}</p>}
              <p><strong>휴대전화:</strong> {cardData.mobile}</p>
              <p><strong>전화번호:</strong> {cardData.phone}</p>
              <p><strong>이메일:</strong> {cardData.email}</p>
              <p><strong>주소:</strong> {cardData.address}</p>
              {cardData.website && <p><strong>웹사이트:</strong> {cardData.website}</p>}
            </div>
          </div>
          
          <div className={styles.actionSection}>
            <button 
              onClick={saveToContacts} 
              className={styles.contactButton}
            >
              주소록에 저장하기
            </button>
          </div>
        </div>

        <div className={styles.messageSection}>
          <h2>보낼 메시지</h2>
          <div className={styles.myCardPreview}>
            <h3>내 명함</h3>
            <Image 
              src="/shinchihoon.png" 
              alt="내 명함" 
              width={300} 
              height={180} 
              className={styles.myCardImage}
            />
          </div>
          
          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            className={styles.messageInput}
            rows={10}
          />
          
          <div className={styles.sendHelp}>
            <p>💡 <strong>발송 방법 선택:</strong> 문자 메시지와 명함 이미지를 함께 보낼 수 있습니다.</p>
          </div>

          <div className={styles.sendButtons}>
            <button 
              onClick={handleSendMessage} 
              disabled={!cardData.mobile || isSending}
              className={styles.sendButton}
            >
              {isSending ? '전송 중...' : '문자 메시지 보내기'}
            </button>
            
            <button 
              onClick={handleSendNamecard} 
              disabled={!cardData.mobile || isSending}
              className={styles.sendCardButton}
            >
              {isSending ? '전송 중...' : '명함 이미지 먼저 보내기'}
            </button>
          </div>

          {sendResult && (
            <div className={sendResult.success ? styles.success : styles.error}>
              {sendResult.message}
            </div>
          )}

          {showImageDownload && (
            <div className={styles.imageDownloadSection}>
              <h3>이미지 별도 전송</h3>
              <p>다음 이미지를 저장하여 문자 메시지에 첨부해 보내세요:</p>
              <div className={styles.imageButtons}>
                <button onClick={downloadMyCardImage} className={styles.downloadButton}>
                  내 명함 이미지 저장
                </button>
                <button onClick={downloadContactCardImage} className={styles.downloadButton}>
                  촬영한 명함 이미지 저장
                </button>
              </div>
              <div className={styles.imageInstructions}>
                <ol>
                  <li>위 버튼을 눌러 이미지를 기기에 저장합니다.</li>
                  <li>문자 앱에서 <strong>사진 첨부</strong> 기능을 이용해 저장한 이미지를 첨부합니다.</li>
                  <li>저장 위치는 일반적으로 <strong>다운로드</strong> 폴더입니다.</li>
                </ol>
              </div>
            </div>
          )}

          {showContactSave && (
            <div className={styles.contactSaveSection}>
              <h3>주소록에 저장</h3>
              <p>명함 정보를 휴대폰 주소록에 저장할 수 있습니다:</p>
              <button onClick={saveToContacts} className={styles.contactSaveButton}>
                주소록에 연락처 저장하기
              </button>
              <div className={styles.contactInstructions}>
                <ol>
                  <li>버튼을 누르면 .vcf 파일(연락처)이 생성됩니다.</li>
                  <li>파일을 열면 휴대폰의 기본 주소록 앱이 실행됩니다.</li>
                  <li>안내에 따라 연락처를 저장하세요.</li>
                </ol>
              </div>
            </div>
          )}

          {!cardData.mobile && (
            <div className={styles.warning}>
              휴대전화 번호가 추출되지 않아 메시지를 보낼 수 없습니다. 
              <Link href="/camera" className={styles.link}>다시 촬영</Link>하거나 
              수동으로 휴대전화 번호를 입력해주세요.
            </div>
          )}
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <Link href="/camera" className={styles.backButton}>
          다시 촬영하기
        </Link>
        <Link href="/" className={styles.homeButton}>
          홈으로
        </Link>
      </div>
    </main>
  );
} 