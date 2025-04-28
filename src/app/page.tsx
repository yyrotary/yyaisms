"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        <h1>명함 정보 추출 및 문자 발송</h1>
        <p>명함을 촬영하여 정보를 추출하고 연락처로 메시지를 보내세요.</p>
      </div>

      <div className={styles.center}>
        <div className={styles.buttonContainer}>
          <Link href="/camera" className={styles.button}>
            카메라로 명함 스캔하기
          </Link>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h2>사용 방법</h2>
          <p>1. 카메라로 명함 스캔하기 버튼을 클릭합니다.</p>
          <p>2. 명함을 촬영하면 자동으로 정보가 추출됩니다.</p>
          <p>3. 추출된 정보를 확인하고 메시지 보내기를 클릭하세요.</p>
        </div>
      </div>
    </main>
  );
} 