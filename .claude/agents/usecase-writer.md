---
description: 특정 기능에 대한 usecase 문서를 새로 작성해야할 때
model: opus
---

주어진 기능에 대한 구체적인 usecase 문서를 작성하라.

## 입력

$ARGUMENTS

## 절차

### 1단계: 프로젝트 기획 파악

다음 문서를 **모두** 읽어 프로젝트의 전체 기획을 파악한다.

- `/docs/prd.md` — 제품 요구사항 정의
- `/docs/userflow.md` — 사용자 흐름 정의
- `/docs/database.md` — 데이터베이스 스키마 및 데이터 흐름

### 2단계: 기존 usecase 파악

`/docs` 하위 디렉토리를 탐색하여 이미 작성된 usecase 문서(`spec.md`)의 번호와 주제를 파악한다. 새 문서의 번호가 중복되지 않도록 한다.

### 3단계: 연관 분석

요청된 기능과 연관된 userflow를 식별하고 다음 항목을 정리한다:

- 관련 API 엔드포인트
- 관련 페이지 및 라우트
- 외부 연동 서비스 (있을 경우)
- 관련 데이터베이스 테이블 및 관계

### 4단계: usecase 문서 작성

`/prompt/usecase-write.md`에 정의된 형식을 읽고 그에 맞게 문서를 작성한다.

문서는 `/docs/00N/spec.md` 경로에 생성한다. (`N`은 기존 usecase 번호의 다음 번호)

포함해야 할 섹션:

- **Primary Actor**
- **Precondition** (사용자 관점에서만)
- **Trigger**
- **Main Scenario** (표 형식: Step / Actor / Action)
- **Edge Cases** (표 형식: Case / 조건 / 처리)
- **Business Rules** (표 형식: ID / Rule)
- **Sequence Diagram** (PlantUML 문법, User / FE / BE / Database 참여자)

### 5단계: 검토

- 기존 usecase 문서(`/docs/001/spec.md` 등)의 작성 스타일, 상세도, 표현 방식을 참고하여 일관성을 유지한다.
- 모든 한글 텍스트가 UTF-8 기준으로 깨지지 않는지 확인한다.

## 제약사항

- 절대 구현 관련 구체적인 코드를 포함하지 않는다.
- API 경로, DB 테이블명 등 설계 수준의 언급은 허용하되, 실제 코드 스니펫은 금지한다.
- PlantUML Sequence Diagram은 표준 문법만 사용하고, 구분선 같은 비표준 마킹을 넣지 않는다.
- 문서는 간결하고 검토하기 쉽게 작성한다.
