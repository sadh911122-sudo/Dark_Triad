/**
 * 리더십 진단 관리자 시스템 - 공통 인증 모듈
 * 모든 관리자 페이지에서 공통으로 사용하는 인증 시스템
 */

window.AdminAuth = {
  // 비활성화 타이머 설정 (30분 = 1800초)
  INACTIVITY_TIMEOUT: 30 * 60 * 1000, // 30분 (밀리초)
  WARNING_TIME: 5 * 60 * 1000, // 5분 전 경고 (밀리초)
  
  // 타이머 변수들
  inactivityTimer: null,
  warningTimer: null,
  lastActivity: Date.now(),
  
  /**
   * 인증 상태 확인
   * @returns {Object|null} 관리자 정보 또는 null
   */
  checkAuth: function() {
    const savedAdmin = localStorage.getItem('currentAdmin');
    if (!savedAdmin) {
      this.redirectToLogin('로그인이 필요합니다.');
      return null;
    }
    
    try {
      const admin = JSON.parse(savedAdmin);
      const adminAccounts = JSON.parse(localStorage.getItem('adminAccounts') || '[]');
      const currentAccount = adminAccounts.find(a => a.id === admin.id);
      
      // 계정 상태 확인
      if (!currentAccount) {
        this.redirectToLogin('계정이 삭제되었습니다.');
        return null;
      }
      
      if (currentAccount.status !== 'active') {
        this.redirectToLogin('계정이 비활성화되었습니다.');
        return null;
      }
      
      // 비활성화 타이머 시작
      this.startInactivityTimer();
      
      return admin;
    } catch (error) {
      console.error('인증 정보 파싱 오류:', error);
      this.redirectToLogin('인증 정보가 손상되었습니다.');
      return null;
    }
  },
  
  /**
   * 로그아웃 처리
   */
  logout: function() {
    if (confirm('로그아웃 하시겠습니까?')) {
      this.clearSession();
      window.location.href = 'index.html';
    }
  },
  
  /**
   * 강제 로그아웃 (비활성화 등)
   */
  forceLogout: function(reason = '세션이 만료되었습니다.') {
    this.clearSession();
    alert(reason);
    window.location.href = 'index.html';
  },
  
  /**
   * 세션 정리
   */
  clearSession: function() {
    localStorage.removeItem('currentAdmin');
    this.clearTimers();
  },
  
  /**
   * 로그인 페이지로 리다이렉트
   */
  redirectToLogin: function(message) {
    this.clearSession();
    if (message) alert(message);
    window.location.href = 'index.html';
  },
  
  /**
   * 환영 메시지 업데이트
   */
  updateWelcomeMessage: function() {
    const admin = this.getCurrentAdmin();
    if (admin) {
      const welcomeElement = document.getElementById('adminWelcome');
      if (welcomeElement) {
        welcomeElement.textContent = `${admin.name}님 환영합니다`;
      }
    }
  },
  
  /**
   * 현재 로그인한 관리자 정보 반환
   */
  getCurrentAdmin: function() {
    const savedAdmin = localStorage.getItem('currentAdmin');
    return savedAdmin ? JSON.parse(savedAdmin) : null;
  },
  
  /**
   * 비활성화 타이머 시작
   */
  startInactivityTimer: function() {
    // 기존 타이머 정리
    this.clearTimers();
    
    // 마지막 활동 시간 업데이트
    this.lastActivity = Date.now();
    
    // 경고 타이머 (25분 후)
    this.warningTimer = setTimeout(() => {
      this.showInactivityWarning();
    }, this.INACTIVITY_TIMEOUT - this.WARNING_TIME);
    
    // 강제 로그아웃 타이머 (30분 후)
    this.inactivityTimer = setTimeout(() => {
      this.forceLogout('30분간 비활성 상태로 인해 자동 로그아웃되었습니다.');
    }, this.INACTIVITY_TIMEOUT);
  },
  
  /**
   * 비활성화 경고 표시
   */
  showInactivityWarning: function() {
    const remaining = Math.ceil(this.WARNING_TIME / 1000 / 60); // 분 단위
    const extendSession = confirm(
      `${remaining}분 후 자동 로그아웃됩니다.\n세션을 연장하시겠습니까?`
    );
    
    if (extendSession) {
      this.resetInactivityTimer();
    }
  },
  
  /**
   * 비활성화 타이머 리셋
   */
  resetInactivityTimer: function() {
    this.startInactivityTimer();
  },
  
  /**
   * 활동 감지 (마우스, 키보드, 터치)
   */
  recordActivity: function() {
    const now = Date.now();
    // 1분 이내 중복 활동은 무시 (성능 최적화)
    if (now - this.lastActivity < 60000) return;
    
    this.lastActivity = now;
    this.resetInactivityTimer();
  },
  
  /**
   * 타이머 정리
   */
  clearTimers: function() {
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  },
  
  /**
   * 활동 감지 이벤트 리스너 등록
   */
  setupActivityDetection: function() {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, () => {
        this.recordActivity();
      }, { passive: true });
    });
    
    // 페이지 포커스/블러 감지
    window.addEventListener('focus', () => {
      this.recordActivity();
    });
    
    // 페이지 언로드 시 타이머 정리
    window.addEventListener('beforeunload', () => {
      this.clearTimers();
    });
  },
  
  /**
   * 권한 확인 (역할 기반)
   */
  hasPermission: function(requiredRole = 'admin') {
    const admin = this.getCurrentAdmin();
    if (!admin) return false;
    
    // super_admin은 모든 권한 보유
    if (admin.role === 'super_admin') return true;
    
    // 요청된 권한과 일치하는지 확인
    return admin.role === requiredRole;
  },
  
  /**
   * 권한 부족 시 접근 차단
   */
  requirePermission: function(requiredRole = 'admin', redirectPage = 'index.html') {
    if (!this.hasPermission(requiredRole)) {
      alert('이 기능에 접근할 권한이 없습니다.');
      window.location.href = redirectPage;
      return false;
    }
    return true;
  },
  
  /**
   * 세션 정보 표시 (디버깅용)
   */
  getSessionInfo: function() {
    const admin = this.getCurrentAdmin();
    const timeLeft = this.inactivityTimer ? 
      Math.ceil((this.lastActivity + this.INACTIVITY_TIMEOUT - Date.now()) / 1000 / 60) : 0;
    
    return {
      admin: admin,
      isAuthenticated: !!admin,
      lastActivity: new Date(this.lastActivity).toLocaleString('ko-KR'),
      timeLeftMinutes: timeLeft
    };
  },
  
  /**
   * 초기화 함수 (각 페이지에서 호출)
   */
  init: function() {
    // 인증 확인
    const admin = this.checkAuth();
    if (!admin) return false;
    
    // 환영 메시지 설정
    this.updateWelcomeMessage();
    
    // 활동 감지 시작
    this.setupActivityDetection();
    
    return true;
  }
};

/**
 * 간편 함수들 (하위 호환성)
 */

// 인증 체크 (기존 코드와의 호환성)
function checkAuth() {
  return window.AdminAuth.checkAuth();
}

// 로그아웃 (기존 코드와의 호환성)
function logout() {
  window.AdminAuth.logout();
}

// 권한 확인
function hasPermission(role) {
  return window.AdminAuth.hasPermission(role);
}

// 권한 요구
function requirePermission(role, redirectPage) {
  return window.AdminAuth.requirePermission(role, redirectPage);
}

/**
 * 전역 에러 처리
 */
window.addEventListener('error', function(e) {
  console.error('Auth 시스템 오류:', e.error);
});

/**
 * 콘솔 유틸리티 (개발/디버깅용)
 */
if (typeof console !== 'undefined') {
  console.log('AdminAuth 시스템이 로드되었습니다.');
  console.log('세션 정보 확인: AdminAuth.getSessionInfo()');
}
