# Claude Command: Commit (No Bot)

<!--
🔄 이 파일은 fe-shared-project에서 자동 동기화됩니다
관리 위치: https://github.com/musinsa/fe-shared-project
⚠️ 이 파일을 직접 수정하지 마세요. 다음 동기화 시 덮어씌워집니다.
-->

@.claude/commands/commit.md

## 차이점

이 명령어는 `/commit` 명령어의 모든 기능을 상속받지만, 다음과 같이 다릅니다:

**❌ AI Co-authored-By를 무조건 추가하지 않습니다!**

**✅ 기여도를 무조건 사용자 100% | AI 0%로 설정합니다!**
- 사람이 직접 작업한 커밋이므로 AI 기여도는 0%로 표시됩니다
- `## 변경사항 (사용자: 100% | AI: 0%)` 형식으로 기록됩니다

## 사용 목적

- 사람이 직접 작업한 커밋을 명시적으로 표시하고 싶을 때 사용합니다
- AI 도구의 도움 없이 작성한 코드임을 명확히 하고 싶을 때 사용합니다

## 사용법

```bash
/commit-no-bot
/commit-no-bot --auto           # 자동으로 commit까지 실행
/commit-no-bot --auto-no-verify # 자동 commit 실행 (사전 검사 제외)
```

모든 옵션과 동작은 `/commit` 명령어와 완전히 동일하며, AI Co-authored-By와 기여도 계산 부분만 다릅니다.
