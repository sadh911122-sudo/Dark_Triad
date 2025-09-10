// config.js - 스프레드시트 직접 연결 방식
console.log('config.js 파일 실행 시작 - 스프레드시트 직접 연결 방식');

// 스프레드시트 Apps Script 웹앱 URL (배포 후 여기에 입력)
window.GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxXJRisypVsiIZ1dokyOsiv4Ow8zYpxYJU2HAso3biQ0F47AS_bHxW0IqAxBFN3Yal9rA/exec';

// 설정 정보
window.GOOGLE_CONFIG = {
  SPREADSHEET_ID: '1uH564W7nLynLx0bMIU_nKjYVj9tA9urvBDbwe-jV5W0'
};

console.log('GOOGLE_CONFIG 선언 완료:', window.GOOGLE_CONFIG);

// 스프레드시트 Apps Script 호출 함수
window.callSpreadsheetScript = async function(action, data) {
  try {
    console.log(`스프레드시트 스크립트 호출: ${action}`, data);
    
    if (window.GAS_WEB_APP_URL === 'YOUR_SPREADSHEET_WEBAPP_URL_HERE') {
      throw new Error('스프레드시트 웹앱 URL을 먼저 설정해주세요');
    }
    
    const response = await fetch(window.GAS_WEB_APP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: action,
        ...data
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log(`스프레드시트 스크립트 응답:`, result);
    
    return result;
  } catch (error) {
    console.error('스프레드시트 스크립트 호출 실패:', error);
    throw error;
  }
};

// 초기화 함수 (단순화)
window.initializeGoogleAPI = async function() {
  console.log('스프레드시트 직접 연결 모드로 초기화');
  
  // 웹앱 URL이 설정되었는지 확인
  if (window.GAS_WEB_APP_URL === 'YOUR_SPREADSHEET_WEBAPP_URL_HERE') {
    throw new Error('스프레드시트 웹앱 URL이 설정되지 않았습니다.');
  }
  
  // 연결 테스트
  try {
    console.log('스프레드시트 연결 테스트 중...');
    const testResult = await window.callSpreadsheetScript('test', {});
    if (testResult.success) {
      console.log('스프레드시트 연결 성공:', testResult.message);
      return true;
    } else {
      throw new Error(testResult.message);
    }
  } catch (error) {
    console.error('스프레드시트 연결 실패:', error);
    throw error;
  }
};

// 사용자 로그인 상태 확인 (항상 true 반환)
window.isUserSignedIn = function() {
  return true; // 스프레드시트 Apps Script는 별도 로그인 불필요
};

// 사용자 로그인 (더미 함수)
window.signInUser = async function() {
  console.log('스프레드시트 모드에서는 별도 로그인이 불필요합니다.');
  return { success: true };
};

// 사용자 로그아웃 (더미 함수)
window.signOutUser = async function() {
  console.log('스프레드시트 모드에서는 별도 로그아웃이 불필요합니다.');
  return { success: true };
};

// 참여자 저장 (스프레드시트 스크립트 호출)
window.saveParticipant = async function(participant) {
  try {
    const result = await window.callSpreadsheetScript('addParticipant', {
      participantData: {
        id: participant.id || Date.now(),
        name: participant.name,
        email: participant.email,
        organization: participant.organization || '',
        position: participant.position || '',
        code: participant.code,
        status: participant.status || 'pending',
        adminId: participant.adminId || 'admin'
      }
    });
    
    if (result.success) {
      console.log('참여자 저장 및 이메일 발송 완료');
      return result;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('참여자 저장 실패:', error);
    throw error;
  }
};

// 참여자 목록 조회 (스프레드시트 스크립트 호출)
window.getParticipants = async function() {
  try {
    const result = await window.callSpreadsheetScript('getParticipants', {});
    
    if (result.success) {
      return result.data || [];
    } else {
      console.error('참여자 목록 조회 실패:', result.message);
      return [];
    }
  } catch (error) {
    console.error('참여자 목록 조회 실패:', error);
    return [];
  }
};

// 참여자 상태 업데이트 (로컬 저장소 사용 - 추후 스프레드시트 연동 가능)
window.updateParticipantStatus = async function(code, status, completedAt = null) {
  try {
    // 현재는 로컬 저장소 사용 (추후 스프레드시트 함수 추가 가능)
    const participants = JSON.parse(localStorage.getItem('participants') || '[]');
    const index = participants.findIndex(p => p.code === code);
    
    if (index !== -1) {
      participants[index].status = status;
      participants[index].completedAt = completedAt || new Date().toISOString();
      localStorage.setItem('participants', JSON.stringify(participants));
