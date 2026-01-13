/**
 * 보안 오버레이 HTML 템플릿
 * HMR 모드에서 보안 이슈 발견 시 브라우저에 표시됩니다.
 * ESLint 에러 스타일과 유사한 하단 패널 디자인
 */
export const OVERLAY_TEMPLATE = `
<style>
  #vite-security-overlay {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: 50vh;
    max-height: 800px;
    background: rgba(24, 24, 27, 0.98);
    border-top: 2px solid #ef4444;
    z-index: 99999;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace;
    animation: slideUp 0.25s ease-out;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.4);
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  #vite-security-overlay .security-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    background: rgba(239, 68, 68, 0.15);
    border-bottom: 1px solid rgba(239, 68, 68, 0.3);
    flex-shrink: 0;
  }

  #vite-security-overlay .security-title-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  #vite-security-overlay .security-icon {
    font-size: 16px;
  }

  #vite-security-overlay .security-panel-title {
    color: #fca5a5;
    font-weight: 600;
    font-size: 13px;
  }

  #vite-security-overlay .security-count {
    background: #ef4444;
    color: white;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
  }

  #vite-security-overlay .security-close {
    background: transparent;
    border: none;
    color: #a1a1aa;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 14px;
    line-height: 1;
    border-radius: 4px;
    transition: all 0.15s;
  }

  #vite-security-overlay .security-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  #vite-security-overlay .security-list {
    flex: 1;
    overflow-y: auto;
    padding: 0;
  }

  #vite-security-overlay .security-item {
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  #vite-security-overlay .security-item:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  #vite-security-overlay .security-item-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }

  #vite-security-overlay .security-item-title {
    color: #fca5a5;
    font-weight: 600;
    font-size: 13px;
  }

  #vite-security-overlay .security-severity {
    background: rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
  }

  #vite-security-overlay .security-message {
    color: #a1a1aa;
    font-size: 12px;
    line-height: 1.5;
    margin-bottom: 6px;
  }

  #vite-security-overlay .security-location {
    color: #71717a;
    font-size: 11px;
    word-break: break-all;
  }

  #vite-security-overlay .security-code {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    color: #fbbf24;
    margin-top: 8px;
    overflow-x: auto;
    white-space: pre;
  }
</style>
<div id="vite-security-overlay">
  <div class="security-header">
    <div class="security-title-wrapper">
      <span class="security-icon">🔒</span>
      <span class="security-panel-title">Security Issues</span>
      <span class="security-count">{{count}}</span>
    </div>
    <button class="security-close" onclick="document.getElementById('vite-security-overlay-wrapper').remove()">✕ Close</button>
  </div>
  <div class="security-list">
    {{issues}}
  </div>
</div>
`;

/**
 * 개별 이슈 아이템 템플릿
 */
export const ISSUE_ITEM_TEMPLATE = `
<div class="security-item">
  <div class="security-item-header">
    <span class="security-item-title">{{title}}</span>
    <span class="security-severity">{{severity}}</span>
  </div>
  <div class="security-message">{{message}}</div>
  <div class="security-location">{{location}}</div>
  {{#if code}}
  <div class="security-code">{{code}}</div>
  {{/if}}
</div>
`;

/**
 * 오버레이 주입을 위한 클라이언트 스크립트
 */
export const OVERLAY_CLIENT_SCRIPT = `
(function() {
  // 보안 이슈 저장소
  const securityIssues = [];

  // WebSocket 메시지 가로채기 - Vite가 생성하는 모든 WebSocket의 메시지 수신
  const OriginalWebSocket = window.WebSocket;
  window.WebSocket = function(url, protocols) {
    const ws = new OriginalWebSocket(url, protocols);

    // vite-hmr 프로토콜 WebSocket만 메시지 리스너 추가
    if (protocols === 'vite-hmr' || (Array.isArray(protocols) && protocols.includes('vite-hmr'))) {
      ws.addEventListener('message', function(event) {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'custom' && payload.event === 'vite-security:issue') {
            addSecurityIssue(payload.data);
          } else if (payload.type === 'custom' && payload.event === 'vite-security:clear') {
            clearSecurityOverlay();
          }
        } catch (e) {
          // JSON 파싱 실패는 무시
        }
      });
    }

    return ws;
  };
  // 프로토타입 체인 유지
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

  // 이슈 추가 및 오버레이 렌더링
  function addSecurityIssue(issue) {
    // 중복 체크 (같은 파일, 같은 라인, 같은 제목)
    const isDuplicate = securityIssues.some(
      (i) => i.filePath === issue.filePath && i.line === issue.line && i.title === issue.title
    );
    if (!isDuplicate) {
      securityIssues.push(issue);
    }
    renderOverlay();
  }

  // 오버레이 렌더링
  function renderOverlay() {
    try {
      // 기존 오버레이 제거
      const existing = document.getElementById('vite-security-overlay-wrapper');
      if (existing) {
        existing.remove();
      }

      if (securityIssues.length === 0) return;

      // 개별 이슈 HTML 생성
      const issuesHtml = securityIssues.map((issue) => {
        return ISSUE_ITEM_TEMPLATE
          .replace('{{title}}', escapeHtml(issue.title))
          .replace('{{severity}}', escapeHtml(issue.severity.toUpperCase()))
          .replace('{{message}}', escapeHtml(issue.description))
          .replace('{{location}}', escapeHtml(issue.filePath + ':' + issue.line + ':' + issue.column))
          .replace('{{#if code}}', issue.code ? '' : '<!--')
          .replace('{{/if}}', issue.code ? '' : '-->')
          .replace('{{code}}', issue.code ? escapeHtml(issue.code) : '');
      }).join('');

      // 전체 오버레이 HTML 생성
      const html = OVERLAY_TEMPLATE
        .replace('{{count}}', securityIssues.length.toString())
        .replace('{{issues}}', issuesHtml);

      // DOM에 삽입
      const wrapper = document.createElement('div');
      wrapper.id = 'vite-security-overlay-wrapper';
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper);
    } catch (e) {
      console.error('[vite-plugin-security] Error in renderOverlay:', e);
    }
  }

  function clearSecurityOverlay() {
    securityIssues.length = 0;
    const existing = document.getElementById('vite-security-overlay-wrapper');
    if (existing) {
      existing.remove();
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 템플릿 저장
  const OVERLAY_TEMPLATE = \`${OVERLAY_TEMPLATE.replace(/`/g, '\\`')}\`;
  const ISSUE_ITEM_TEMPLATE = \`${ISSUE_ITEM_TEMPLATE.replace(/`/g, '\\`')}\`;
})();
`;

/**
 * 오버레이 데이터 타입
 */
export type OverlayData = {
  title: string;
  severity: string;
  description: string;
  filePath: string;
  line: number;
  column: number;
  code?: string;
};
