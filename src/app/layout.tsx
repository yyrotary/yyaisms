import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "명함 정보 추출 및 문자 발송",
  description: "명함을 촬영하여 정보를 추출하고 연락처로 메시지를 보낼 수 있는 앱입니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <Script id="register-service-worker" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                  .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  })
                  .catch(error => {
                    console.log('ServiceWorker registration failed: ', error);
                  });
              });
            }
          `}
        </Script>
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
} 