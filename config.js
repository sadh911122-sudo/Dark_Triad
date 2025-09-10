// config.js - Google Sheets API 설정 (수정된 버전)
console.log('config.js 파일 실행 시작');

// 전역 스코프에 GOOGLE_CONFIG 선언
window.GOOGLE_CONFIG = {
  // OAuth 클라이언트 ID
  CLIENT_ID: '697465063139-3kful1btdams4k3fle4cn7l5haje7dmf.apps.googleusercontent.com',
  
  // 스프레드시트 ID 
  SPREADSHEET_ID: '1uH564W7nLynLx0bMIU_nKjYVj9tA9urvBDbwe-jV5W0',
  
  // API 범위 (Gmail API 추가)
  SCOPE: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/gmail.send',
  
  // Discovery 문서
  DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
  GMAIL_DISCOVERY_DOC: 'https://gmail.googleapis.com/$discovery/rest?version=v1'
};

console.log('GOOGLE_CONFIG 선언 완료:', window.GOOGLE_CONFIG);

// 전역 변수들
window.gapi_loaded = false;
window.auth_initialized = false;
window.google_user_signed_in = false;
window.current_access_token = null;

// 스크립트 동적 로드 함수
window.loadScript = function(src) {
  return new Promise((resolve, reject) => {
    // 이미 로드된 스크립트인지 확인
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// Google API 초기화 함수 (수정됨)
window.initializeGoogleAPI = async function() {
  console.log('Google API 초기화 시작');
  
  // Google API 스크립트 로드
  if (typeof gapi === 'undefined') {
    console.log('gapi 라이브러리 로드 중...');
    await window.loadScript('https://apis.google.com/js/api.js');
  }
  
  // Google Identity Services 로드
  if (typeof google === 'undefined' || !google.accounts) {
    console.log('Google Identity Services 로드 중...');
    await window.loadScript('https://accounts.google.com/gsi/client');
  }
  
  return new Promise((resolve, reject) => {
    gapi.load('client', async () => {
      try {
        await gapi.client.init({
  clientId: window.GOOGLE_CONFIG.CLIENT_ID,
  scope: window.GOOGLE_CONFIG.SCOPE,
  discoveryDocs: [
    window.GOOGLE_CONFIG.DISCOVERY_DOC, 
    window.GOOGLE_CONFIG.GMAIL_DISCOVERY_DOC
  ]
});        
        window.gapi_loaded = true;
        window.auth_initialized = true;
        console.log('Google API 초기화 성공');
        resolve(true);
      } catch (error) {
        console.error('Google API 초기화 실패:', error);
        reject(error);
      }
    });
  });
};

// 사용자 로그인 상태 확인 (수정됨)
window.isUserSignedIn = function() {
  return window.google_user_signed_in && window.current_access_token;
};

// 사용자 로그인 (Google Identity Services 사용)
window.signInUser = async function() {
  if (!window.gapi_loaded) {
    await window.initializeGoogleAPI();
  }
  
  return new Promise((resolve, reject) => {
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: window.GOOGLE_CONFIG.CLIENT_ID,
        scope: window.GOOGLE_CONFIG.SCOPE,
        callback: (response) => {
          if (response.error) {
            console.error('로그인 실패:', response);
            reject(response);
          } else {
            window.google_user_signed_in = true;
            window.current_access_token = response.access_token;
            
            // gapi 클라이언트에 토큰 설정
            gapi.client.setToken({
              access_token: response.access_token
            });
            
            console.log('로그인 성공');
            resolve(response);
          }
        }
      });
      
      tokenClient.requestAccessToken();
    } catch (error) {
      console.error('로그인 시도 실패:', error);
      reject(error);
    }
  });
};

// 사용자 로그아웃 (수정됨)
window.signOutUser = async function() {
  try {
    if (window.current_access_token) {
      // 토큰 해제
      google.accounts.oauth2.revoke(window.current_access_token);
      gapi.client.setToken(null);
    }
    
    window.google_user_signed_in = false;
    window.current_access_token = null;
    console.log('로그아웃 성공');
  } catch (error) {
    console.error('로그아웃 실패:', error);
    throw error;
  }
};

// Gmail 이메일 발송 (인코딩 개선)
window.sendEmailViaGmail = async function(to, subject, htmlContent) {
  if (!window.gapi_loaded) {
    await window.initializeGoogleAPI();
  }
  
  if (!window.isUserSignedIn()) {
    await window.signInUser();
  }
  
  try {
    // 이메일 메시지 구성 (UTF-8 인코딩 개선)
    const email = [
      'Content-Type: text/html; charset="UTF-8"\n',
      'MIME-Version: 1.0\n',
      'Content-Transfer-Encoding: 7bit\n',
      `To: ${to}\n`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=\n\n`,
      htmlContent
    ].join('');
    
    // Base64 URL-safe 인코딩
    const encodedEmail = btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    const response = await gapi.client.gmail.users.messages.send({
      userId: 'me',
      resource: {
        raw: encodedEmail
      }
    });
    
    console.log('Gmail 발송 성공:', response);
    return response.result;
  } catch (error) {
    console.error('Gmail 발송 실패:', error);
    
    // Gmail API 특정 오류 처리
    if (error.status === 403) {
      throw new Error('Gmail 발송 권한이 없습니다. Gmail API 사용 권한을 확인해주세요.');
    } else if (error.status === 400) {
      throw new Error('이메일 형식이 올바르지 않습니다.');
    } else if (error.status === 401) {
      // 토큰 만료 시 재로그인 시도
      await window.signInUser();
      throw new Error('인증이 만료되어 다시 로그인했습니다. 다시 시도해주세요.');
    } else {
      throw new Error(`이메일 발송 실패: ${error.message}`);
    }
  }
};

// 참여 코드 이메일 발송 (경로 수정)
window.sendParticipationCodeEmail = async function(participantData) {
  const subject = `리더십 진단 참여 안내 - ${participantData.name}님`;
  
  // GitHub Pages 경로 처리 개선
  const currentPath = window.location.pathname;
  const isInAdminFolder = currentPath.includes('/Dark_Triad_admin/');
  const basePath = isInAdminFolder ? 
    window.location.origin + currentPath.substring(0, currentPath.lastIndexOf('/')) : 
    window.location.origin + '/Dark_Triad_admin';
  
  const diagnosisLink = `${basePath}/diagnosis.html?code=${participantData.code}`;
  
  // 나머지 이메일 템플릿 코드는 동일...
  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Malgun Gothic', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .code-box { background: #f8f9fa; border: 2px dashed #007bff; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .code { font-size: 24px; font-weight: bold; color: #007bff; font-family: monospace; }
    .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>리더십 진단 참여 안내</h1>
      <p>${participantData.name}님께 보내는 개인별 초대장</p>
    </div>
    
    <div class="content">
      <h2>안녕하세요, ${participantData.name}님!</h2>
      <p>리더십 다크 트라이어드 진단에 참여해주셔서 감사합니다.</p>
      
      <div class="code-box">
        <p><strong>귀하의 참여코드</strong></p>
        <div class="code">${participantData.code}</div>
      </div>
      
      <p><strong>진단 참여 방법:</strong></p>
      <ol>
        <li>아래 링크를 클릭하거나 진단 사이트에 접속하세요</li>
        <li>참여코드를 입력하세요: <strong>${participantData.code}</strong></li>
        <li>27개 문항에 솔직하게 답변해주세요 (약 10분 소요)</li>
        <li>진단 완료 후 즉시 결과를 확인하실 수 있습니다</li>
      </ol>
      
      <div style="text-align: center;">
        <a href="${diagnosisLink}" class="button">진단 시작하기</a>
      </div>
      
      <p><strong>주의사항:</strong></p>
      <ul>
        <li>정확한 결과를 위해 솔직하게 답변해주세요</li>
        <li>한 번 제출하면 수정할 수 없습니다</li>
        <li>진단 결과는 이메일로도 발송됩니다</li>
      </ul>
    </div>
    
    <div class="footer">
      <p>문의사항이 있으시면 관리자에게 연락해주세요.</p>
      <p>발송일: ${new Date().toLocaleDateString('ko-KR')}</p>
    </div>
  </div>
</body>
</html>
  `;
  
  try {
    const result = await window.sendEmailViaGmail(participantData.email, subject, htmlContent);
    console.log('참여코드 이메일 발송 성공:', result);
    return result;
  } catch (error) {
    console.error('참여코드 이메일 발송 실패:', error);
    throw error;
  }
};

// 기존의 다른 함수들 (saveParticipant, getParticipants 등)은 그대로 유지...

console.log('config.js 파일 실행 완료 - 수정된 인증 방식 적용됨');
