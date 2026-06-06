# Programmers Markdown

프로그래머스 문제 링크를 Notion 학습 기록에 붙여넣기 좋은 Markdown으로 변환하는 웹 도구입니다.

- 배포 URL: https://programmers-to-markdown.vercel.app
- GitHub: https://github.com/MODUGGAGI/programmers-to-markdown

## 주요 기능

- 프로그래머스 문제 URL로 문제 정보 자동 추출
- 자동 추출 실패 또는 일부 누락 시 수동 입력으로 계속 작성
- 프로그래머스 문제 형식에 맞춘 Markdown 생성
- `Markdown` 원문 보기와 `미리보기` 전환
- Notion에 붙여넣었을 때의 결과를 미리 확인하는 렌더링 preview
- Clipboard API 기반 복사 버튼
- Vercel 배포 가능한 Next.js App Router 구조

## 변환 형식

생성되는 Markdown은 개인 Notion 알고리즘 기록 템플릿에 맞춰 아래 순서로 구성됩니다.

````markdown
# 문제 제목
- 문제 번호: 00000
- 문제 링크: https://school.programmers.co.kr/learn/courses/30/lessons/00000

### 문제 설명

### 제한사항

### 입출력 예

### 입출력 예 설명

---
### 처음에 내가 짠 코드
```java

```
- 잘못된 부분
### 답 코드
```java

```
### 배운 점 기록
````

## 프로그래머스 전용 처리

백준처럼 `입력` / `출력` 섹션이 따로 없는 프로그래머스 문제 형식을 기준으로 동작합니다.

- `입출력 예`는 프로그래머스 표를 Markdown table로 변환합니다.
- `입출력 예 설명`은 표 아래 설명만 분리해서 담습니다.
- 제한사항과 설명 안의 인라인 코드 표기는 `` `code` `` 형태로 유지합니다.
- `입출력 예 #1` 같은 강조 문구는 `**bold**` 형태로 유지합니다.
- 여러 줄 수식/예시는 `text` 코드블록으로 보존합니다.
- 문제에 포함된 이미지는 Markdown image 문법으로 변환합니다.
- 자동 추출 결과가 완벽하지 않아도 수동 필드에서 바로 수정할 수 있습니다.

## API

자동 추출은 하나의 Route Handler로 처리합니다.

```http
POST /api/extract
Content-Type: application/json
```

Request:

```json
{
  "url": "https://school.programmers.co.kr/learn/courses/30/lessons/43165"
}
```

Response:

```ts
{
  status: "success" | "partial" | "failed";
  data: ProblemData;
  missingFields: string[];
  message: string;
}
```

## 기술 스택

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- cheerio
- Vitest
- Vercel

## 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 검증

```bash
npm test
npm run lint
npm run build
```

## Vercel 배포

프로젝트가 Vercel에 연결된 상태라면 production 배포는 아래 명령으로 실행할 수 있습니다.

```bash
npx vercel build --prod --yes
npx vercel deploy --prebuilt --prod --yes
```

별도 환경 변수는 필요하지 않습니다.

## v1 범위

v1은 Markdown 생성과 복사 경험에 집중합니다.

포함하지 않는 기능:

- Notion API 연동
- Notion 페이지 자동 생성
- 로그인/계정/저장 기능
- AI 풀이 생성
- 코드 실행/채점
- 백준, LeetCode 등 다른 플랫폼 지원
