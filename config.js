// config.js - Google Sheets API 설정
// 실제 사용시 YOUR_XXXXX 부분을 실제 값으로 교체하세요

const GOOGLE_CONFIG = {
  // OAuth 클라이언트 ID
  CLIENT_ID: '697465063139-3kful1btdams4k3fle4cn7l5haje7dmf.apps.googleusercontent.com',
  
  // 스프레드시트 ID 
  SPREADSHEET_ID: '1uH564W7nLynLx0bMIU_nKjYVj9tA9urvBDbwe-jV5W0',
  
  // API 범위
  SCOPE: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
  
  // Discovery 문서
  DISCOVERY_DOC: 'https://sheets.googleapis.com/$discovery/rest?version=v4',
};

// Google API 로드 및 초기화
let gapi_loaded = false;
let auth_initialized = false;

async function initializeGoogleAPI() {
  if (typeof gapi === 'undefined') {
    // gapi 라이브러리 동적 로드
    await loadScript('https://apis.google.com/js/api.js');
  }
  
  return new Promise((resolve, reject) => {
    gapi.load('client:auth2', async () => {
      try {
        await gapi.client.init({
          clientId: GOOGLE_CONFIG.CLIENT_ID,
          scope: GOOGLE_CONFIG.SCOPE,
          discoveryDocs: [GOOGLE_CONFIG.DISCOVERY_DOC]
        });
        
        gapi_loaded = true;
        auth_initialized = true;
        resolve(true);
      } catch (error) {
        console.error('Google API 초기화 실패:', error);
        reject(error);
      }
    });
  });
}

// 스크립트 동적 로드 함수
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Google Sheets 데이터 읽기
async function readSheetData(sheetName, range = '') {
  if (!gapi_loaded) {
    await initializeGoogleAPI();
  }
  
  const fullRange = range ? `${sheetName}!${range}` : sheetName;
  
  try {
    const response = await gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
      range: fullRange,
    });
    
    return response.result.values || [];
  } catch (error) {
    console.error('데이터 읽기 실패:', error);
    return [];
  }
}

// Google Sheets 데이터 쓰기
async function writeSheetData(sheetName, range, values) {
  if (!gapi_loaded) {
    await initializeGoogleAPI();
  }
  
  try {
    const response = await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
      range: `${sheetName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: values
      }
    });
    
    return response.result;
  } catch (error) {
    console.error('데이터 쓰기 실패:', error);
    throw error;
  }
}

// Google Sheets 데이터 추가
async function appendSheetData(sheetName, values) {
  if (!gapi_loaded) {
    await initializeGoogleAPI();
  }
  
  try {
    const response = await gapi.client.sheets.spreadsheets.values.append({
      spreadsheetId: GOOGLE_CONFIG.SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: values
      }
    });
    
    return response.result;
  } catch (error) {
    console.error('데이터 추가 실패:', error);
    throw error;
  }
}

// 사용자 로그인 확인
function isUserSignedIn() {
  if (!gapi_loaded || !gapi.auth2) return false;
  const authInstance = gapi.auth2.getAuthInstance();
  return authInstance && authInstance.isSignedIn.get();
}

// 사용자 로그인
async function signInUser() {
  if (!gapi_loaded) {
    await initializeGoogleAPI();
  }
  
  const authInstance = gapi.auth2.getAuthInstance();
  return authInstance.signIn();
}

// 사용자 로그아웃
async function signOutUser() {
  if (gapi_loaded && gapi.auth2) {
    const authInstance = gapi.auth2.getAuthInstance();
    return authInstance.signOut();
  }
}

// 참여자 관련 함수들
async function saveParticipant(participant) {
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
  
  return await appendSheetData('participants', [row]);
}

async function getParticipants() {
  const data = await readSheetData('participants', 'A:J');
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
  }));
}

async function updateParticipantStatus(code, status, completedAt = null) {
  const participants = await getParticipants();
  const index = participants.findIndex(p => p.code === code);
  
  if (index !== -1) {
    const rowIndex = index + 2; // 헤더 행 + 1-based 인덱스
    const values = [
      [status, completedAt || new Date().toISOString()]
    ];
    
    return await writeSheetData('participants', `G${rowIndex}:H${rowIndex}`, values);
  }
}

// 진단 결과 저장
async function saveDiagnosisResult(result) {
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
  
  return await appendSheetData('results', [row]);
}

async function getDiagnosisResults() {
  const data = await readSheetData('results', 'A:J');
  if (data.length <= 1) return [];
  
  return data.slice(1).map(row => ({
    id: row[0],
    participantCode: row[1],
    participantName: row[2],
    participantEmail: row[3],
    scores: {
      narcissism: parseFloat(row[4]),
      machiavellianism: parseFloat(row[5]),
      psychopathy: parseFloat(row[6])
    },
    avgScore: parseFloat(row[7]),
    completedAt: row[8],
    fullData: row[9] ? JSON.parse(row[9]) : null
  }));
}

// 오류 처리
function handleGoogleAPIError(error) {
  console.error('Google API 오류:', error);
  
  if (error.status === 401) {
    alert('인증이 필요합니다. 다시 로그인해주세요.');
    signInUser();
  } else if (error.status === 403) {
    alert('권한이 없습니다. 스프레드시트 접근 권한을 확인해주세요.');
  } else {
    alert('데이터 저장 중 오류가 발생했습니다: ' + error.message);
  }
}
