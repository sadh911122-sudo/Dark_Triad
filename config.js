// config.js - Google Apps Script 웹앱 연동 버전
console.log('config.js 파일 실행 시작');

// Google Apps Script 웹앱 URL (배포 후 여기에 입력)
window.GAS_WEB_APP_URL = 'YOUR_DEPLOYED_WEB_APP_URL_HERE';

// 전역 스코프에 GOOGLE_CONFIG 선언
window.GOOGLE_CONFIG = {
  // 스프레드시트 ID 
  SPREADSHEET_ID: '1uH564W7nLynLx0bMIU_nKjYVj9tA9urvBDbwe-jV5W0'
};

console.log('GOOGLE_CONFIG 선언 완료:', window.GOOGLE_CONFIG);

// Google Apps Script 웹앱 호출 함수
window.callGoogleAppsScript = async function(action, data) {
  try {
    console.log(`Google Apps Script 호출: ${action}`, data);
    
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
    console.log(`Google Apps Script 응답:`, result);
    
    return result;
  } catch (error) {
    console.error('Google Apps Script 호출 실패:', error);
    throw error;
  }
};

// 초기화 함수 (단순화)
window.initializeGoogleAPI = async function() {
  console.log('Google Apps Script 연동 모드로 초기화');
  
  // 웹앱 URL이 설정되었는지 확인
  if (window.GAS_WEB_APP_URL === 'YOUR_DEPLOYED_WEB_APP_URL_HERE') {
    throw new Error('Google Apps Script 웹앱 URL이 설정되지 않았습니다.');
  }
  
  // 간단한 연결 테스트
  try {
    // 테스트 호출 (실제로는 아무것도 하지 않음)
    console.log('Google Apps Script 연결 테스트 중...');
    return true;
  } catch (error) {
    console.error('Google Apps Script 연결 실패:', error);
    throw error;
  }
};

// 사용자 로그인 상태 확인 (항상 true 반환)
window.isUserSignedIn = function() {
  return true; // Google Apps Script는 별도 로그인 불필요
};

// 사용자 로그인 (더미 함수)
window.signInUser = async function() {
  console.log('Google Apps Script 모드에서는 별도 로그인이 불필요합니다.');
  return { success: true };
};

// 사용자 로그아웃 (더미 함수)
window.signOutUser = async function() {
  console.log('Google Apps Script 모드에서는 별도 로그아웃이 불필요합니다.');
  return { success: true };
};

// 참여자 저장 (Google Apps Script 호출)
window.saveParticipant = async function(participant) {
  try {
    const result = await window.callGoogleAppsScript('addParticipant', {
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

// 참여자 목록 조회 (Google Sheets에서 직접 읽기 - 추후 구현)
window.getParticipants = async function() {
  try {
    // 현재는 localStorage 사용, 추후 Google Apps Script로 구현 가능
    const participants = JSON.parse(localStorage.getItem('participants') || '[]');
    return participants.filter(p => p.status !== 'deleted');
  } catch (error) {
    console.error('참여자 목록 로드 실패:', error);
    return [];
  }
};

// 참여자 상태 업데이트 (추후 Google Apps Script로 구현)
window.updateParticipantStatus = async function(code, status, completedAt = null) {
  try {
    // 현재는 localStorage 사용
    const participants = JSON.parse(localStorage.getItem('participants') || '[]');
    const index = participants.findIndex(p => p.code === code);
    
    if (index !== -1) {
      participants[index].status = status;
      participants[index].completedAt = completedAt || new Date().toISOString();
      localStorage.setItem('participants', JSON.stringify(participants));
      console.log(`참여자 ${code} 상태 업데이트: ${status}`);
    }
  } catch (error) {
    console.error('참여자 상태 업데이트 실패:', error);
  }
};

// 진단 결과 저장 (Google Apps Script 호출)
window.saveDiagnosisResult = async function(result) {
  try {
    const gasResult = await window.callGoogleAppsScript('saveDiagnosisResult', {
      resultData: {
        id: result.id || Date.now(),
        participantCode: result.participantCode,
        participantName: result.participantName,
        participantEmail: result.participantEmail,
        scores: result.scores,
        avgScore: result.avgScore,
        answers: result.answers,
        questions: result.questions,
        completedAt: result.completedAt || new Date().toISOString()
      }
    });
    
    if (gasResult.success) {
      console.log('진단 결과 저장 완료');
      return gasResult;
    } else {
      throw new Error(gasResult.message);
    }
  } catch (error) {
    console.error('진단 결과 저장 실패:', error);
    // 실패 시 localStorage에 백업
    const results = JSON.parse(localStorage.getItem('diagnosisResults') || '[]');
    results.push(result);
    localStorage.setItem('diagnosisResults', JSON.stringify(results));
    throw error;
  }
};

// 진단 결과 조회 (추후 Google Apps Script로 구현)
window.getDiagnosisResults = async function() {
  try {
    // 현재는 localStorage 사용
    const results = JSON.parse(localStorage.getItem('diagnosisResults') || '[]');
    return results;
  } catch (error) {
    console.error('진단 결과 로드 실패:', error);
    return [];
  }
};

// 진단 결과 이메일 발송 (Google Apps Script 호출)
window.sendDiagnosisResultEmail = async function(participantData, scores) {
  try {
    const result = await window.callGoogleAppsScript('sendResultEmail', {
      participantData: {
        name: participantData.name,
        email: participantData.email
      },
      scores: {
        narcissism: scores.narcissism,
        machiavellianism: scores.machiavellianism,
        psychopathy: scores.psychopathy
      }
    });
    
    if (result.success) {
      console.log('진단 결과 이메일 발송 완료');
      return result;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('진단 결과 이메일 발송 실패:', error);
    throw error;
  }
};

// 참여코드 이메일 발송 함수 (saveParticipant에서 자동 호출됨)
window.sendParticipationCodeEmail = async function(participantData) {
  // Google Apps Script의 addParticipant 함수에서 자동으로 이메일 발송하므로
  // 여기서는 별도 처리 불필요
  console.log('참여코드 이메일은 saveParticipant에서 자동 발송됩니다.');
  return { success: true, message: '이메일 발송 예정' };
};

// 오류 처리
window.handleGoogleAPIError = function(error) {
  console.error('Google Apps Script 오류:', error);
  
  if (error.message.includes('fetch')) {
    console.warn('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
  } else if (error.message.includes('URL')) {
    console.warn('Google Apps Script 웹앱 URL을 확인해주세요.');
  } else {
    console.warn('Google Apps Script 호출 중 오류가 발생했습니다:', error.message);
  }
};

// 연결 테스트 함수
window.testGoogleAppsScript = async function() {
  try {
    console.log('Google Apps Script 연결 테스트 시작');
    
    if (window.GAS_WEB_APP_URL === 'YOUR_DEPLOYED_WEB_APP_URL_HERE') {
      throw new Error('웹앱 URL을 먼저 설정해주세요');
    }
    
    // 테스트 참여자 데이터
    const testParticipant = {
      name: '테스트 참여자',
      email: 'test@example.com',
      organization: '테스트 회사',
      position: '테스트 직책',
      code: 'LDT-TEST' + Date.now().toString().substr(-4)
    };
    
    console.log('테스트 참여자 추가 중...', testParticipant);
    const result = await window.saveParticipant(testParticipant);
    
    if (result.success) {
      console.log('✅ Google Apps Script 연결 테스트 성공!');
      console.log('참여자가 추가되고 이메일이 발송되었습니다.');
      return true;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ Google Apps Script 연결 테스트 실패:', error);
    return false;
  }
};

console.log('config.js 파일 실행 완료 - Google Apps Script 연동 모드');
console.log('테스트 방법: 콘솔에서 testGoogleAppsScript() 실행');
