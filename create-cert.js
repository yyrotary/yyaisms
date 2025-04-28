const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, 'certificates');

// 인증서 디렉토리가 없으면 생성
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir, { recursive: true });
}

// 자체 서명 인증서 생성
const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, { days: 365 });

// 인증서 저장
fs.writeFileSync(path.join(certDir, 'cert.pem'), pems.cert);
fs.writeFileSync(path.join(certDir, 'key.pem'), pems.private);

console.log('자체 서명 인증서가 생성되었습니다.');
console.log('위치: ' + certDir); 