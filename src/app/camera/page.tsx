"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import Webcam from 'react-webcam';
import { useRouter } from 'next/navigation';
import styles from './camera.module.css';
import axios from 'axios';
import { extractBusinessCardInfo, preprocessImage } from '@/utils/geminiApi';

export default function CameraPage() {
  const webcamRef = useRef<Webcam>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const router = useRouter();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isZooming, setIsZooming] = useState(false);
  const [isFocusing, setIsFocusing] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{x: number, y: number} | null>(null);
  const [showFocusIndicator, setShowFocusIndicator] = useState(false);
  const [focusPosition, setFocusPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const focusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [extractedData, setExtractedData] = useState<{
    name: string;
    position: string;
    company: string;
    phone: string;
    mobile: string;
    email: string;
    address: string;
    website: string;
    other: string;
  }>({
    name: '',
    position: '',
    company: '',
    phone: '',
    mobile: '',
    email: '',
    address: '',
    website: '',
    other: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [isVerticalCard, setIsVerticalCard] = useState(false);
  const [isHighQuality, setIsHighQuality] = useState<boolean>(true);
  const [flashMode, setFlashMode] = useState<string>('auto');
  const [flashAvailable, setFlashAvailable] = useState<boolean>(false);
  const [currentFacingMode, setCurrentFacingMode] = useState<'environment' | 'user'>('environment');
  const [streamActive, setStreamActive] = useState(true);

  // 모바일 기기 감지
  useEffect(() => {
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  // 카메라 권한 요청 및 카메라 목록 가져오기
  useEffect(() => {
    async function requestCameraPermission() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment'
          }
        });
        
        // 카메라 기능 확인
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        
        // 플래시 지원 여부 확인
        if ('torch' in capabilities) {
          setFlashAvailable(true);
          console.log('플래시(토치) 기능이 지원됩니다');
        }
        
        // 카메라 권한 획득 후 사용 가능한 카메라 목록 가져오기
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('사용 가능한 카메라:', videoDevices);
        setAvailableCameras(videoDevices);
        
        // 'camera2 0'이 포함된 카메라를 우선적으로 선택
        const camera2Device = videoDevices.find(device => 
          device.label.toLowerCase().includes('camera2 0')
        );
        
        if (camera2Device) {
          console.log('Camera2 0 발견:', camera2Device.label);
          setSelectedCamera(camera2Device.deviceId);
          setCurrentFacingMode('environment');
        } else {
          // 후면 카메라 우선 탐색 (기존 로직 유지)
          const findBestCamera = () => {
            // 최적 카메라 탐색 함수
            const findCameraByKeywords = (keywords: string[]) => {
              for (const keyword of keywords) {
                const found = videoDevices.find(device => 
                  device.label.toLowerCase().includes(keyword.toLowerCase())
                );
                if (found) return found;
              }
              return null;
            };
            
            // 키워드 우선순위
            const keywordGroups = [
              ['facing back', 'back camera'], // 명시적인 후면 카메라 표시
              ['back', '후면', 'environment'], // 일반적인 후면 카메라 표시
              ['0', 'camera 0', 'camera2 0'], // 일부 기기에서 후면 카메라 인덱스
              ['1', 'camera 1', 'camera2 1']  // 또 다른 가능한 인덱스
            ];
            
            // 각 키워드 그룹에 대해 카메라 검색
            for (const keywords of keywordGroups) {
              const found = findCameraByKeywords(keywords);
              if (found) return found;
            }
            
            // 적합한 카메라가 없으면 첫 번째 카메라 사용
            return videoDevices[0];
          };
          
          // 최적의 카메라 선택 및 설정
          if (videoDevices.length > 0) {
            const bestCamera = findBestCamera();
            console.log('선택된 최적 카메라:', bestCamera?.label);
            if (bestCamera) {
              setSelectedCamera(bestCamera.deviceId);
            } else {
              setSelectedCamera(videoDevices[0].deviceId);
            }
          }
        }
        
        // 스트림 해제
        stream.getTracks().forEach(track => track.stop());
        setCameraPermission(true);
      } catch (err) {
        console.error("카메라 접근이 거부되었습니다:", err);
        setCameraPermission(false);
      }
    }

    requestCameraPermission();
  }, [isMobile]);

  // 플래시 제어 함수
  const toggleFlash = useCallback(() => {
    if (!videoRef.current || !videoRef.current.srcObject) return;
    
    const stream = videoRef.current.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    
    try {
      // 현재 설정 확인
      const settings = track.getSettings();
      const capabilities = track.getCapabilities();
      
      // 플래시 지원 확인
      if (!('torch' in capabilities)) {
        console.log('이 카메라는 플래시를 지원하지 않습니다');
        return;
      }
      
      // 플래시 모드 변경
      const newMode = flashMode === 'off' ? 'on' : 'off';
      
      // 플래시 설정 적용
      const constraints = {
        advanced: [{ }] as any
      };
      
      constraints.advanced[0].torch = newMode === 'on';
      
      track.applyConstraints(constraints)
      .then(() => {
        setFlashMode(newMode);
        console.log(`플래시 모드 변경: ${newMode}`);
      })
      .catch(e => {
        console.error('플래시 제어 실패:', e);
      });
    } catch (e) {
      console.error('플래시 기능 접근 오류:', e);
    }
  }, [flashMode]);

  // 웹캠 레퍼런스 연결 및 비디오 엘리먼트 접근
  useEffect(() => {
    if (webcamRef.current && webcamRef.current.video) {
      videoRef.current = webcamRef.current.video;

      // 비디오 스트림이 로드된 후 기능 확인
      const checkCapabilities = () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          
          try {
            const capabilities = track.getCapabilities();
            // 플래시 지원 여부 다시 확인
            if ('torch' in capabilities) {
              setFlashAvailable(true);
            } else {
              setFlashAvailable(false);
            }
          } catch (e) {
            console.log('카메라 기능 확인 오류:', e);
          }
        }
      };
      
      // 비디오 로드 완료 시 호출
      videoRef.current.onloadedmetadata = checkCapabilities;

      // 비디오 요소에 터치/클릭 이벤트 리스너 추가
      const video = videoRef.current;
      
      const handleTouchOrClick = (e: MouseEvent | TouchEvent) => {
        if (!videoRef.current) return;
        
        const videoRect = videoRef.current.getBoundingClientRect();
        let clientX: number, clientY: number;
        
        if ('touches' in e) {
          // 터치 이벤트
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
          // 스크롤이나 다른 동작 방지
          e.preventDefault();
        } else {
          // 마우스 이벤트
          clientX = e.clientX;
          clientY = e.clientY;
        }
        
        // 비디오 안에서의 상대 위치 계산
        const x = (clientX - videoRect.left) / videoRect.width;
        const y = (clientY - videoRect.top) / videoRect.height;
        
        // 포커스 위치 설정 및 표시
        setFocusPosition({ x: clientX - videoRect.left, y: clientY - videoRect.top });
        setShowFocusIndicator(true);
        setIsFocusing(true);
        
        // 이전 타임아웃 제거
        if (focusTimeoutRef.current) {
          clearTimeout(focusTimeoutRef.current);
        }
        
        // 포커스 표시 시간 설정
        focusTimeoutRef.current = setTimeout(() => {
          setShowFocusIndicator(false);
          setIsFocusing(false);
        }, 1500);
        
        // 실제 장치가 포커스를 지원하는 경우 실행
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          const track = stream.getVideoTracks()[0];
          
          try {
            const capabilities = track.getCapabilities();
            
            // 연속 자동 초점 먼저 활성화 (더 나은 기본 포커싱을 위해)
            const focusConstraints = {
              advanced: [{ }] as any
            };
            
            // 타입스크립트 오류 방지를 위한 any 타입 사용
            focusConstraints.advanced[0].focusMode = "continuous";
            
            track.applyConstraints(focusConstraints)
              .catch(err => console.log('자동 포커스 설정 실패:', err));
            
            // 포커스 모드 확인 및 설정 - 장치가 지원하는 경우에만 시도
            if (capabilities.focusMode && capabilities.focusMode.includes('manual')) {
              // 포커스 영역 확장을 위한 주변 포인트 계산 (더 정확한 포커싱)
              const pointSize = 0.05; // 포인트 크기 (5%)
              const points = [
                { x, y }, // 중앙 포인트
                { x: Math.max(0, x - pointSize), y }, // 왼쪽
                { x: Math.min(1, x + pointSize), y }, // 오른쪽
                { x, y: Math.max(0, y - pointSize) }, // 위
                { x, y: Math.min(1, y + pointSize) } // 아래
              ];
              
              // 0.5초 후에 수동 포커스 시도 (자동 포커스가 대략적으로 맞춘 후)
              setTimeout(() => {
                try {
                  const constraints = {
                    advanced: [{ }] as any
                  };
                  
                  constraints.advanced[0].focusMode = "manual";
                  constraints.advanced[0].pointsOfInterest = points;
                  
                  setFocusPoint({ x, y });
                  
                  track.applyConstraints(constraints)
                    .then(() => {
                      console.log('포커스 설정 성공');
                      
                      // 1초 후에 다시 연속 자동 포커스로 전환 (미세 조정을 위해)
                      setTimeout(() => {
                        const continuousFocusConstraints = {
                          advanced: [{ }] as any
                        };
                        continuousFocusConstraints.advanced[0].focusMode = "continuous";
                        
                        track.applyConstraints(continuousFocusConstraints)
                          .catch(err => console.log('자동 포커스 전환 실패:', err));
                      }, 1000);
                    })
                    .catch(e => {
                      console.log('포커스 설정 실패:', e);
                      // 자동 포커스로 대체
                      const autoFocusConstraints = {
                        advanced: [{ }] as any
                      };
                      autoFocusConstraints.advanced[0].focusMode = "continuous";
                      
                      track.applyConstraints(autoFocusConstraints)
                        .catch(err => console.log('자동 포커스 설정 실패:', err));
                    });
                } catch (focusError) {
                  console.log('수동 포커스 적용 중 오류:', focusError);
                  // 오류 발생 시 자동 포커스만 유지
                }
              }, 500);
            } else {
              console.log('이 장치는 수동 포커스를 지원하지 않습니다. 자동 포커스만 사용합니다.');
            }
            
            // 밝기 최적화 시도 - 지원되는 경우에만
            if (('brightness' in capabilities && capabilities.brightness.min != null) || 
                ('exposureMode' in capabilities && capabilities.exposureMode.includes('continuous'))) {
              try {
                const brightnessConstraints = {
                  advanced: [{ }] as any
                };
                
                brightnessConstraints.advanced[0].exposureMode = "continuous";
                
                // 노출 보정값은 지원되는 경우에만 설정 (일부 장치는 지원하지 않음)
                if ('exposureCompensation' in capabilities) {
                  brightnessConstraints.advanced[0].exposureCompensation = 0.5; // 약간 밝게 조정
                }
                
                track.applyConstraints(brightnessConstraints)
                  .catch(err => console.log('밝기 최적화 실패:', err));
              } catch (err) {
                console.log('밝기 조정이 지원되지 않습니다:', err);
              }
            }
          } catch (e) {
            console.log('카메라 기능 접근 오류:', e);
            // 오류 발생 시에도 포커스 표시기는 유지
          }
        }
      };
      
      // 터치/클릭 이벤트 등록
      video.addEventListener('click', handleTouchOrClick);
      video.addEventListener('touchstart', handleTouchOrClick);
      
      // 줌 제스처 처리를 위한 변수
      let initialDistance = 0;
      let initialZoom = zoomLevel;
      let lastTapTime = 0;
      let zoomPointX = 0;
      let zoomPointY = 0;
      
      const handleTouchStart = (e: TouchEvent) => {
        // 더블 탭 감지 (빠른 줌인/아웃)
        const currentTime = new Date().getTime();
        const tapLength = currentTime - lastTapTime;
        
        if (e.touches.length === 1 && tapLength < 300 && tapLength > 0) {
          // 더블 탭 감지됨 - 줌 토글
          e.preventDefault();
          
          const touch = e.touches[0];
          const videoRect = videoRef.current?.getBoundingClientRect();
          
          if (videoRect) {
            // 더블 탭 위치를 중심으로 줌
            zoomPointX = (touch.clientX - videoRect.left) / videoRect.width;
            zoomPointY = (touch.clientY - videoRect.top) / videoRect.height;
            
            if (zoomLevel > 1.5) {
              // 줌 아웃
              setZoomLevel(1);
            } else {
              // 줌 인
              setZoomLevel(2.5);
            }
          }
          
          lastTapTime = 0;
        } else if (e.touches.length === 1) {
          // 싱글 탭 기록
          lastTapTime = currentTime;
        }
        
        // 핀치 줌 처리
        if (e.touches.length === 2) {
          initialDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          initialZoom = zoomLevel;
          
          // 핀치 중심점 계산
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          
          const videoRect = videoRef.current?.getBoundingClientRect();
          if (videoRect) {
            zoomPointX = (midX - videoRect.left) / videoRect.width;
            zoomPointY = (midY - videoRect.top) / videoRect.height;
          }
          
          setIsZooming(true);
          e.preventDefault();
        }
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          
          const currentDistance = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          
          if (initialDistance > 0) {
            const distanceRatio = currentDistance / initialDistance;
            
            // 부드러운 줌 효과를 위한 감쇠 계수
            const dampingFactor = 0.2;
            const targetZoom = Math.max(1, Math.min(4, initialZoom * distanceRatio));
            const newZoom = zoomLevel + (targetZoom - zoomLevel) * dampingFactor;
            
            setZoomLevel(newZoom);
          }
        }
      };
      
      const handleTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
          setIsZooming(false);
          
          // 줌 레벨 스냅 - 더 자연스러운 사용자 경험을 위해
          const roundedZoom = Math.round(zoomLevel * 2) / 2; // 0.5 단위로 반올림
          if (Math.abs(roundedZoom - zoomLevel) < 0.25) {
            setZoomLevel(roundedZoom);
          }
        }
      };
      
      video.addEventListener('touchstart', handleTouchStart, { passive: false });
      video.addEventListener('touchmove', handleTouchMove, { passive: false });
      video.addEventListener('touchend', handleTouchEnd);
      
      return () => {
        video.removeEventListener('click', handleTouchOrClick);
        video.removeEventListener('touchstart', handleTouchOrClick);
        video.removeEventListener('touchstart', handleTouchStart);
        video.removeEventListener('touchmove', handleTouchMove);
        video.removeEventListener('touchend', handleTouchEnd);
        if (focusTimeoutRef.current) {
          clearTimeout(focusTimeoutRef.current);
        }
      };
    }
  }, [webcamRef.current, zoomLevel]);

  // streamActive 상태가 변경될 때 스트림 재시작
  useEffect(() => {
    if (streamActive === false && webcamRef.current) {
      // 잠시 후 스트림 재활성화
      const timer = setTimeout(() => {
        setStreamActive(true);
        console.log('카메라 스트림 재시작');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [streamActive]);

  // 줌 레벨 조정 함수
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 1));
  };

  // 카메라 변경 함수
  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCameraId = e.target.value;
    setSelectedCamera(newCameraId);
    
    // 선택된 카메라 정보 찾기
    const selectedCameraInfo = availableCameras.find(camera => camera.deviceId === newCameraId);
    
    if (selectedCameraInfo) {
      const label = selectedCameraInfo.label.toLowerCase();
      // 카메라 라벨에 따라 facing mode 설정
      if (label.includes('back') || label.includes('후면') || label.includes('environment')) {
        setCurrentFacingMode('environment');
      } else if (label.includes('front') || label.includes('전면') || label.includes('user')) {
        setCurrentFacingMode('user');
      }
    }
    
    // 스트림 재시작을 위해 streamActive 상태 업데이트
    setStreamActive(false);
  };

  const captureImage = useCallback(() => {
    setIsCapturing(true);
    setError(null); // 오류 메시지 초기화
    
    if (webcamRef.current) {
      // 고품질 이미지 옵션을 사용하는 경우
      const webcam = webcamRef.current;
      const video = webcam.video as HTMLVideoElement;
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (video && context) {
        // 원본 비디오 크기 획득
        const { videoWidth, videoHeight } = video;
        
        // 캔버스 크기 설정
        canvas.width = videoWidth;
        canvas.height = videoHeight;
        
        // 비디오 프레임을 캔버스에 그리기
        context.drawImage(video, 0, 0, videoWidth, videoHeight);
        
        // 가이드라인에 맞추어 명함 영역 계산
        let cropWidth, cropHeight, cropX, cropY;
        
        // 명함 비율 조정 (가로형/세로형)
        const cardRatio = isVerticalCard ? 1.7 : 0.55; // 세로형 비율: 높이/너비=1.7, 가로형 비율: 높이/너비=0.55
        
        if (isVerticalCard) {
          // 세로형 명함 (세로 길이가 더 김)
          cropWidth = Math.min(videoWidth * 0.6, videoHeight / cardRatio * 0.8);
          cropHeight = cropWidth * cardRatio;
        } else {
          // 가로형 명함 (가로 길이가 더 김)
          cropWidth = Math.min(videoWidth * 0.85, videoHeight / cardRatio * 0.8);
          cropHeight = cropWidth * cardRatio;
        }
        
        // 중앙 위치 계산 - 세로 위치를 약간 위로 조정 (화면 중앙보다 약간 위에 크롭)
        cropX = (videoWidth - cropWidth) / 2;
        cropY = (videoHeight - cropHeight) / 2 - videoHeight * 0.05; // 5% 위로 이동
        
        // 크롭 좌표가 캔버스를 벗어나지 않도록 보정
        cropX = Math.max(0, cropX);
        cropY = Math.max(0, cropY);
        
        // 이미지 크기도 보정
        if (cropX + cropWidth > videoWidth) {
          cropWidth = videoWidth - cropX;
        }
        if (cropY + cropHeight > videoHeight) {
          cropHeight = videoHeight - cropY;
        }
        
        // 명함 영역만 크롭한 이미지 데이터 생성
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropWidth;
        cropCanvas.height = cropHeight;
        
        const cropContext = cropCanvas.getContext('2d');
        
        if (cropContext) {
          // 원본 이미지에서 명함 영역만 크롭
          cropContext.drawImage(
            canvas, 
            cropX, cropY, cropWidth, cropHeight,
            0, 0, cropWidth, cropHeight
          );
          
          // 크롭된 이미지를 데이터 URL로 변환
          const quality = isHighQuality ? 0.95 : 0.8;
          const imageSrc = cropCanvas.toDataURL('image/jpeg', quality);
          
          setCapturedImage(imageSrc);
          
          // 이미지 처리 로직 (Gemini OCR 등)
          if (imageSrc) {
            setProcessingImage(true);
            console.log('명함 이미지 크롭 및 처리 시작');
            
            // 이미지 전처리 및 Gemini API 호출
            preprocessImage(imageSrc)
              .then(enhancedImage => {
                console.log('이미지 전처리 완료, Gemini API 호출 준비');
                // Gemini API로 이미지 분석
                return extractBusinessCardInfo(enhancedImage, isVerticalCard);
              })
              .then(cardInfo => {
                console.log("Gemini 추출 정보:", cardInfo);
                
                // 추출된 정보가 없는지 확인
                const isEmpty = Object.values(cardInfo).every(
                  value => !value || value === '' || value.startsWith('추출 실패')
                );
                
                if (isEmpty) {
                  setError("명함 정보를 추출할 수 없습니다. 더 선명한 사진을 촬영해 주세요.");
                } else if (cardInfo.other && cardInfo.other.startsWith('추출 실패')) {
                  // 오류 메시지가 있지만 일부 데이터는 추출된 경우
                  setError("일부 정보만 추출했습니다: " + cardInfo.other);
                }
                
                setExtractedData(cardInfo);
                setProcessingImage(false);
                setIsCapturing(false);
              })
              .catch(err => {
                console.error("이미지 처리 중 오류:", err);
                setError("텍스트 인식 중 오류가 발생했습니다: " + (err.message || '알 수 없는 오류'));
                setProcessingImage(false);
                setIsCapturing(false);
              });
          }
        }
      }
    }
  }, [webcamRef, isVerticalCard, isHighQuality]);

  const retakePhoto = () => {
    setCapturedImage(null);
    setExtractedData({
      name: '',
      position: '',
      company: '',
      phone: '',
      mobile: '',
      email: '',
      address: '',
      website: '',
      other: '',
    });
    setError(null);
  };

  const handleSaveAndSend = () => {
    // 크롭된 이미지 데이터가 있는지 확인 (문자열 길이로 대략적인 체크)
    if (!capturedImage || capturedImage.length < 100) {
      setError("명함 이미지가 올바르게 캡처되지 않았습니다. 다시 촬영해 주세요.");
      return;
    }
    
    // 모든 추출된 데이터를 localStorage에 저장
    localStorage.setItem('cardData', JSON.stringify({
      image: capturedImage,  // 이미지 데이터 URI
      name: extractedData.name,
      position: extractedData.position,
      company: extractedData.company,
      phone: extractedData.phone,
      mobile: extractedData.mobile,
      email: extractedData.email,
      address: extractedData.address,
      website: extractedData.website,
      other: extractedData.other
    }));
    
    console.log("명함 데이터 저장됨, 이미지 크기:", capturedImage.length);
    
    // 메시지 페이지로 이동
    router.push('/message');
  };

  const switchCamera = async () => {
    try {
      if (availableCameras.length <= 1) {
        console.log('사용 가능한 카메라가 없습니다.');
        return;
      }

      // 현재 선택된 카메라 인덱스 찾기
      const currentIndex = availableCameras.findIndex(
        (camera) => camera.deviceId === selectedCamera
      );
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      const nextCamera = availableCameras[nextIndex];
      
      setSelectedCamera(nextCamera.deviceId);
      
      // 카메라 전환 시 facing mode 업데이트
      const label = nextCamera.label.toLowerCase();
      if (label.includes('back') || label.includes('후면') || label.includes('environment')) {
        setCurrentFacingMode('environment');
      } else if (label.includes('front') || label.includes('전면') || label.includes('user')) {
        setCurrentFacingMode('user');
      }
      
      // 스트림 재시작을 위해 streamActive를 false로 설정
      setStreamActive(false);
      
      console.log('카메라 전환: ', nextCamera.label);
    } catch (error) {
      console.error('카메라 전환 중 오류 발생:', error);
    }
  };

  // 카메라 권한 없는 경우 안내 메시지 표시
  if (cameraPermission === false) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>카메라 접근 권한이 필요합니다</h1>
        <p>이 기능을 사용하려면 카메라 접근 권한을 허용해야 합니다.</p>
        <p>브라우저 설정에서 카메라 권한을 허용한 후 다시 시도해주세요.</p>
        <Link href="/" className={styles.backButton}>
          메인으로 돌아가기
        </Link>
      </main>
    );
  }

  // 권한 확인 중인 경우 로딩 표시
  if (cameraPermission === null) {
    return (
      <main className={styles.main}>
        <h1 className={styles.title}>카메라 권한을 확인 중입니다...</h1>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>명함 촬영</h1>
      
      {!capturedImage ? (
        <div className={styles.cameraContainer}>
          {availableCameras.length > 1 && (
            <div className={styles.cameraSelect}>
              <select 
                value={selectedCamera} 
                onChange={handleCameraChange}
                className={styles.selectCamera}
              >
                {availableCameras.map((camera, index) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `카메라 ${index + 1}`}
                  </option>
                ))}
              </select>
              <div className={styles.cameraInfo}>
                <p>
                  <strong>현재 카메라:</strong> {
                    currentFacingMode === 'environment' 
                    ? '후면 (Facing back)' 
                    : '전면 (Facing front)'
                  }
                </p>
                <p><strong>인식 팁:</strong> 후면 카메라가 명함 인식에 더 효과적입니다.</p>
                <p><strong>화질이 좋지 않나요?</strong> 다른 카메라로 전환해 보세요.</p>
              </div>
            </div>
          )}
          
          <div className={styles.optionsContainer}>
            <div className={styles.cardOrientationToggle}>
              <label>
                <input
                  type="checkbox"
                  checked={isVerticalCard}
                  onChange={() => setIsVerticalCard(!isVerticalCard)}
                />
                세로형 명함
              </label>
            </div>
            <div className={styles.cardOrientationToggle}>
              <label>
                <input
                  type="checkbox"
                  checked={isHighQuality}
                  onChange={() => setIsHighQuality(!isHighQuality)}
                />
                고품질 이미지
              </label>
            </div>
          </div>
          
          <div 
            className={styles.webcamWrapper}
            style={{ 
              position: 'relative', 
              overflow: 'hidden',
              width: '100%',
              maxWidth: '640px',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className={styles.webcam}
              videoConstraints={{
                deviceId: selectedCamera,
                facingMode: selectedCamera ? undefined : "environment", // 모바일에서 후면 카메라 사용
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              }}
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center',
                width: '100%',
                height: 'auto',
                transitionProperty: 'transform',
                transitionDuration: isZooming ? '0s' : '0.3s',
                transitionTimingFunction: 'ease-out'
              }}
            />
            
            {/* 포커스 표시기 */}
            {showFocusIndicator && (
              <div 
                className={styles.focusIndicator}
                style={{
                  position: 'absolute',
                  top: `${focusPosition.y}px`,
                  left: `${focusPosition.x}px`,
                  transform: 'translate(-50%, -50%)',
                  width: '60px',
                  height: '60px',
                  border: '2px solid #fff',
                  borderRadius: '50%',
                  boxShadow: '0 0 0 2px rgba(81, 203, 238, 0.7)',
                  animation: 'pulse 1.5s ease-out',
                  pointerEvents: 'none'
                }}
              ></div>
            )}
            
            {/* 가이드 라인 - 명함 위치 안내 */}
            <div className={styles.cardGuide}>
              <div 
                className={styles.cardGuideInner}
                style={{
                  width: isVerticalCard ? '55%' : '85%',
                  height: isVerticalCard ? '85%' : '53%',
                }}
              ></div>
            </div>
            
            {/* 터치 지시 안내 */}
            <div className={styles.touchInstruction}>
              화면을 터치하여 초점을 맞추세요
            </div>
            
            {/* 플래시 제어 버튼 */}
            {flashAvailable && (
              <button 
                onClick={toggleFlash}
                className={styles.flashButton}
                aria-label="플래시 제어"
              >
                {flashMode === 'on' ? '💡' : '🔦'}
              </button>
            )}
          </div>
          
          <div className={styles.controlsContainer}>
            <div className={styles.zoomControls}>
              <button 
                onClick={handleZoomOut} 
                className={styles.zoomButton}
                disabled={zoomLevel <= 1}
              >
                -
              </button>
              <span className={styles.zoomLevel}>{zoomLevel.toFixed(1)}x</span>
              <button 
                onClick={handleZoomIn} 
                className={styles.zoomButton}
                disabled={zoomLevel >= 4}
              >
                +
              </button>
            </div>
            
            <button 
              onClick={captureImage} 
              disabled={isCapturing || processingImage}
              className={styles.captureButton}
            >
              {isCapturing || processingImage ? '처리 중...' : '촬영하기'}
            </button>
          </div>
          
          <div className={styles.instructions}>
            <p>✓ 명함을 가이드 영역 안에 위치시키세요</p>
            <p>✓ 화면을 터치하여 명함에 초점을 맞추세요</p>
            <p>✓ 줌 버튼으로 확대/축소할 수 있습니다</p>
            <p>✓ 세로형 명함은 체크박스를 선택하세요</p>
            <p>✓ 밝은 환경에서 촬영하면 인식률이 높아집니다</p>
          </div>
          
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.resultContainer}>
          <div className={styles.imagePreview}>
            <img src={capturedImage} alt="Captured business card" />
          </div>
          
          <div className={styles.extractedInfo}>
            <h2>추출된 정보</h2>
            <div className={styles.formGroup}>
              <label>이름:</label>
              <input 
                type="text" 
                value={extractedData.name} 
                onChange={(e) => setExtractedData({...extractedData, name: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>직위:</label>
              <input 
                type="text" 
                value={extractedData.position} 
                onChange={(e) => setExtractedData({...extractedData, position: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>회사:</label>
              <input 
                type="text" 
                value={extractedData.company} 
                onChange={(e) => setExtractedData({...extractedData, company: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>전화번호:</label>
              <input 
                type="text" 
                value={extractedData.phone} 
                onChange={(e) => setExtractedData({...extractedData, phone: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>휴대전화:</label>
              <input 
                type="text" 
                value={extractedData.mobile} 
                onChange={(e) => setExtractedData({...extractedData, mobile: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>이메일:</label>
              <input 
                type="text" 
                value={extractedData.email} 
                onChange={(e) => setExtractedData({...extractedData, email: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>주소:</label>
              <input 
                type="text" 
                value={extractedData.address} 
                onChange={(e) => setExtractedData({...extractedData, address: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>웹사이트:</label>
              <input 
                type="text" 
                value={extractedData.website} 
                onChange={(e) => setExtractedData({...extractedData, website: e.target.value})}
              />
            </div>
            <div className={styles.formGroup}>
              <label>기타:</label>
              <textarea 
                value={extractedData.other} 
                onChange={(e) => setExtractedData({...extractedData, other: e.target.value})}
              />
            </div>
            
            <div className={styles.buttonGroup}>
              <button onClick={retakePhoto} className={styles.retakeButton}>다시 촬영</button>
              <button onClick={handleSaveAndSend} className={styles.sendButton}>저장 및 메시지 작성</button>
            </div>
            
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}
          </div>
        </div>
      )}
      
      <Link href="/" className={styles.backButton}>
        메인으로 돌아가기
      </Link>
    </main>
  );
} 