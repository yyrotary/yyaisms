const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

// 자체 서명 인증서가 없는 경우의 대체 옵션
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certificates', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certificates', 'cert.pem')),
};

// 모든 네트워크 인터페이스의 IP 주소 출력
const networkInterfaces = os.networkInterfaces();
console.log('\n사용 가능한 네트워크 인터페이스:');
for (const name of Object.keys(networkInterfaces)) {
  for (const net of networkInterfaces[name]) {
    // IPv4 주소만 표시
    if (net.family === 'IPv4' && !net.internal) {
      console.log(`인터페이스: ${name}, IP 주소: ${net.address}`);
    }
  }
}

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log('\n> Ready on https://localhost:3000');
    console.log('> 모바일에서 접속하려면 https://[컴퓨터IP]:3000 으로 접속하세요.');
    console.log('> 자체 서명 인증서를 사용하므로 브라우저 경고가 표시될 수 있습니다. "고급" 또는 "안전하지 않은 사이트 방문"을 선택하여 진행하세요.');
  });
}); 