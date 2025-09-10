// config.js - Google Sheets API 설정 (Google Identity Services 적용)
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
window.gis_initialized = false;
window.google_user_signed_in = false;
window.current_access_token = null;
window.tokenClient = null;

// Google API 초기화 함수 (완전히 새로운 방식)
window.initializeGoogleAPI = async function() {
  console.log('Google API 초기화 시작 - GIS 방식 사용');
  
  try {
    // 1. GAPI 로드 및 초기화
    if (typeof gapi === 'undefined') {
      console.log('GAPI 라이브러리 로드 대기 중...');
      await waitForGapi();
    }
    
    // 2. gapi.client 초기화 (auth2 없이)
    await new Promise((resolve, reject) => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            discoveryDocs: [
              window.GOOGLE_CONFIG.DISCOVERY_DOC,
              window.GOOGLE_CONFIG.GMAIL_DISCOVERY_DOC
            ]
          });
          console.log('GAPI client 초기화 완료');
          resolve();
        } catch (error) {
          console.error('GAPI client 초기화 실패:', error);
          reject(error);
        }
      });
    });
    
    // 3. Google Identity Services 초기화
    if (typeof google === 'undefined' || !google.accounts) {
      console.log('Google Identity Services 로드 대기 중...');
      await waitForGIS();
    }
    
    // 4. Token Client 초기화
    window.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: window.GOOGLE_CONFIG.CLIENT_ID,
      scope: window.GOOGLE_CONFIG.SCOPE,
      callback: (response) => {
        if (response.error) {
          console.error('토큰 획득 실패:', response);
          window.google_user_signed_in = false;
          window.current_access_token = null;
        } else {
          console.log('토큰 획득 성공');
          window.google_user_signed_in = true;
          window.current_access_token = response.access_token;
          
          // gapi.client에 토큰 설정
          gapi.client.setToken({
            access_token: response.access_token
          });
        }
      }
    });
    
    window.gapi_loaded = true;
    window.gis_initialized = true;
    console.log('Google API 및 GIS 초기화 완료');
    return true;
    
  } catch (error) {
    console.error('Google API 초기화 실패:', error);
    throw error;
  }
};

// GAPI 로드 대기 함수 (개선됨)
function waitForGapi() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 100; // 10초로 증가
    
    const checkGapi = () => {
      attempts++;
      console.log(`GAPI 로드 확인 중... (${attempts}/${maxAttempts})`);
      
      if (typeof gapi !== 'undefined') {
        console.log('GAPI 로드 완료');
        resolve();
      } else if (attempts >= maxAttempts) {
        console.error('GAPI 로드 타임아웃');
        reject(new Error('GAPI 로드 타임아웃'));
      } else {
        setTimeout(checkGapi, 100);
      }
    };
    
    checkGapi();
  });
}

// Google Identity Services 로드 대기 함수 (개선됨)
function waitForGIS() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 100; // 10초로 증가
    
    const checkGIS = () => {
      attempts++;
      console.log(`GIS 로드 확인 중... (${attempts}/${maxAttempts})`);
      
      if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
        console.log('Google Identity Services 로드 완료');
        resolve();
      } else if (attempts >= maxAttempts) {
        console.error('Google Identity Services 로드 타임아웃');
        reject(new Error('Google Identity Services 로드 타임아웃'));
      } else {
        setTimeout(checkGIS, 100);
      }
    };
    
    checkGIS();
  });
}

// 사용자 로그인 상태 확인
window.isUserSignedIn = function() {
  return window.google_user_signed_in && window.current_access_token;
};

// 사용자 로그인 (Google Identity Services 사용)
window.signInUser = async function() {
  if (!window.gis_initialized) {
    await window.initializeGoogleAPI();
  }
  
  return new Promise((resolve, reject) => {
    try {
      if (!window.tokenClient) {
        reject(new Error('Token client가 초기화되지 않았습니다.'));
        return;
      }
      
      // 기존 콜백을 임시로 저장하고 새로운 콜백 설정
      const originalCallback = window.tokenClient.callback;
      
      window.tokenClient.callback = (response) => {
        // 원래 콜백 복원
        window.tokenClient.callback = originalCallback;
        
        if (response.error) {
          console.error('로그인 실패:', response);
          reject(response);
        } else {
          console.log('로그인 성공');
          // 원래 콜백도 호출
          if (originalCallback) {
            originalCallback(response);
          }
          resolve(response);
        }
      };
      
      // 토큰 요청
      window.tokenClient.requestAccessToken();
      
    } catch (error) {
      console.error('로그인 시도 실패:', error);
      reject(error);
    }
  });
};

// 사용자 로그아웃
window.signOutUser = async function() {
  try {
    if (window.current_access_token) {
      // 토큰 취소
      google.accounts.oauth2.revoke(window.current_access_token, () => {
        console.log('토큰 취소 완료');
      });
      
      // gapi 클라이언트에서 토큰 제거
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

// Google Sheets 데이터 읽기
window.readSheetData = async function(sheetName, range = '') {
  if (!window.gapi_loaded) {
    await window.initializeGoogleAPI();
  }
  
  const fullRange = range ? `${sheetName}!${range}` : sheetName;
  
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: window.GOOGLE_CONFIG.SPREADSHEET_ID,
      range: fullRange,
    });
    
    return response.result.values || [];
  } catch (error) {
    console.error('데이터 읽기 실패:', error);
    window.handleGoogleAPIError(error);
    return [];
  }
};

// Google Sheets 데이터 쓰기
window.writeSheetData = async function(sheetName, range, values) {
  if (!window.gapi_loaded) {
    await window.initializeGoogleAPI();
  }
  
  if (!window.isUserSignedIn()) {
    await window.signInUser();
  }
  
  try {
    const response = await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: window.GOOGLE_CONFIG.SPREADSHEET_ID,
      range: `${sheetName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: values
      }
    });
    
    return response.result;
  } catch (error) {
    console.error('데이터 쓰기 실패:', error);
    window.handleGoogleAPIError(error);
    throw error;
  }
};

// Google Sheets 데이터 추가
window.appendSheetData = async function(sheetName, values) {
  if (!window.gapi_loaded) {
    await window.initializeGoogleAPI();
  }
  
  if (!window.isUserSignedIn()) {
    await window.signInUser();
  }
  
  try {
    const response = await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: window.GOOGLE_CONFIG.SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: values
      }
    });
    
    return response.result;
  } catch (error) {
    console.error('데이터 추가 실패:', error);
    window.handleGoogleAPIError(error);
    throw error;
  }
};

// Gmail 이메일 발송 (GIS 방식)
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

// 진단 결과 이메일 템플릿 생성 (기존과 동일)
window.createResultEmailTemplate = function(participantData, scores) {
  const avgScore = ((parseFloat(scores.narcissism) + parseFloat(scores.machiavellianism) + parseFloat(scores.psychopathy)) / 3).toFixed(1);
  
  // 종합 해석 결정
  let overallInterpretation;
  if (avgScore < 2.0) {
    overallInterpretation = "건강하고 균형잡힌 리더십 성향을 보입니다.";
  } else if (avgScore < 3.0) {
    overallInterpretation = "전반적으로 안정적인 리더십 성향입니다.";
  } else if (avgScore < 4.0) {
    overallInterpretation = "일부 영역에서 주의깊은 자기성찰이 필요합니다.";
  } else {
    overallInterpretation = "즉각적인 개선이 필요한 리더십 성향입니다.";
  }
  
  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Malgun Gothic', Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
    .content { padding: 30px 20px; }
    .score-card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 15px 0; border-left: 4px solid #007bff; }
    .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; }
    .score-item { text-align: center; padding: 15px; background: #e9ecef; border-radius: 8px; }
    .score-value { font-size: 24px; font-weight: bold; color: #007bff; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>리더십 진단 결과</h1>
      <p>${participantData.name}님의 개인별 리포트</p>
    </div>
    
    <div class="content">
      <h2>진단 결과 요약</h2>
      
      <div class="score-grid">
        <div class="score-item">
          <div class="score-value">${scores.narcissism}</div>
          <div>나르시시즘</div>
        </div>
        <div class="score-item">
          <div class="score-value">${scores.machiavellianism}</div>
          <div>마키아벨리즘</div>
        </div>
        <div class="score-item">
          <div class="score-value">${scores.psychopathy}</div>
          <div>사이코패시</div>
        </div>
        <div class="score-item">
          <div class="score-value">${avgScore}</div>
          <div>전체 평균</div>
        </div>
      </div>
      
      <div class="score-card">
        <h3>종합 해석</h3>
        <p>${overallInterpretation}</p>
      </div>
      
      <div class="score-card">
        <h3>발전 방향</h3>
        <h4>일일 실천사항</h4>
        <ul>
          <li>매일 팀원 한 명과 개인적 대화하기</li>
          <li>의사결정 전 5분 숙고하기</li>
          <li>하루 한 번 자기 성찰 시간 갖기</li>
        </ul>
        
        <h4>주간 목표</h4>
        <ul>
          <li>팀원들로부터 피드백 받기</li>
          <li>리더십 관련 책 1권 읽기</li>
          <li>멘토와 코칭 세션 진행하기</li>
        </ul>
        
        <h4>장기 발전 계획</h4>
        <ul>
          <li>360도 피드백 프로그램 참여</li>
          <li>리더십 교육과정 수강</li>
          <li>정기적 심리검사 및 성향 점검</li>
        </ul>
      </div>
      
      <p><strong>참고:</strong> 이 진단 결과는 리더십 개발을 위한 참고 자료로 활용해주시기 바랍니다.</p>
    </div>
    
    <div class="footer">
      <p>본 이메일은 리더십 진단 시스템에서 자동 발송되었습니다.</p>
      <p>진단일: ${new Date().toLocaleDateString('ko-KR')}</p>
    </div>
  </div>
</body>
</html>
  `;
};

// 진단 결과 이메일 발송
window.sendDiagnosisResultEmail = async function(participantData, scores) {
  const subject = `리더십 진단 결과 - ${participantData.name}님`;
  const htmlContent = window.createResultEmailTemplate(participantData, scores);
  
  try {
    const result = await window.sendEmailViaGmail(participantData.email, subject, htmlContent);
    console.log('진단 결과 이메일 발송 성공:', result);
    return result;
  } catch (error) {
    console.error('진단 결과 이메일 발송 실패:', error);
    throw error;
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

// 나머지 함수들 (saveParticipant, getParticipants 등)은 기존과 동일하게 유지
window.saveParticipant = async function(participant) {
  const timestamp = new Date().toISOString();
  const row = [
    participant.id || Date.now(),
    participant.name,
    participant.email,
    participant.organization,
    participant.position,
    participant.code,
    participant.status || 'pending',
    timestamp,
    participant.completedAt || '',
    participant.adminId || 'admin'
  ];
  
  return await window.appendSheetData('participants', [row]);
};

window.getParticipants = async function() {
  try {
    const data = await window.readSheetData('participants', 'A:J');
    if (data.length <= 1) return []; // 헤더만 있는 경우
    
    return data.slice(1).map(row => ({
      id: row[0],
      name: row[1],
      email: row[2],
      organization: row[3],
      position: row[4],
      code: row[5],
      status: row[6],
      createdAt: row[7],
      completedAt: row[8],
      adminId: row[9]
    })).filter(participant => participant.status !== 'deleted'); // 삭제된 참여자 제외
  } catch (error) {
    console.error('참여자 목록 로드 실패:', error);
    return [];
  }
};

window.updateParticipantStatus = async function(code, status, completedAt = null) {
  try {
    const participants = await window.getParticipants();
    const index = participants.findIndex(p => p.code === code);
    
    if (index !== -1) {
      const rowIndex = index + 2; // 헤더 행 + 1-based 인덱스
      const values = [
        [status, completedAt || new Date().toISOString()]
      ];
      
      return await window.writeSheetData('participants', `G${rowIndex}:H${rowIndex}`, values);
    } else {
      console.warn(`참여자 코드 ${code}를 찾을 수 없습니다.`);
    }
  } catch (error) {
    console.error('참여자 상태 업데이트 실패:', error);
    throw error;
  }
};

// 진단 결과 저장
window.saveDiagnosisResult = async function(result) {
  const timestamp = new Date().toISOString();
  const row = [
    result.id || Date.now(),
    result.participantCode,
    result.participantName,
    result.participantEmail,
    result.scores.narcissism,
    result.scores.machiavellianism,
    result.scores.psychopathy,
    result.avgScore,
    timestamp,
    JSON.stringify(result) // 전체 데이터를 JSON으로 저장
  ];
  
  return await window.appendSheetData('results', [row]);
};

window.getDiagnosisResults = async function() {
  try {
    const data = await window.readSheetData('results', 'A:J');
    if (data.length <= 1) return [];
    
    return data.slice(1).map(row => ({
      id: row[0],
      participantCode: row[1],
      participantName: row[2],
      participantEmail: row[3],
      scores: {
        narcissism: parseFloat(row[4]) || 0,
        machiavellianism: parseFloat(row[5]) || 0,
        psychopathy: parseFloat(row[6]) || 0
      },
      avgScore: parseFloat(row[7]) || 0,
      completedAt: row[8],
      fullData: row[9] ? JSON.parse(row[9]) : null
    }));
  } catch (error) {
    console.error('진단 결과 로드 실패:', error);
    return [];
  }
};

// 오류 처리
window.handleGoogleAPIError = function(error) {
  console.error('Google API 오류:', error);
  
  if (error.status === 401) {
    console.warn('인증이 필요합니다. 다시 로그인해주세요.');
  } else if (error.status === 403) {
    console.warn('권한이 없습니다. 스프레드시트 접근 권한을 확인해주세요.');
  } else if (error.status === 404) {
    console.warn('요청한 리소스를 찾을 수 없습니다.');
  } else {
    console.warn('Google API 호출 중 오류가 발생했습니다:', error.message);
  }
};

console.log('config.js 파일 실행 완료 - Google Identity Services 방식으로 구성됨');
