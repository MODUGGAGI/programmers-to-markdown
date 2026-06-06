# Programmers Markdown

프로그래머스 문제 링크를 Notion에 붙여넣기 좋은 Markdown으로 정리하는 개인용 웹 도구입니다.

## 기능

- 프로그래머스 문제 URL 자동 추출 시도
- 추출 실패 또는 일부 누락 시 같은 화면에서 수동 입력
- 프로그래머스 형식의 문제 설명, 제한사항, 입출력 예 표, 입출력 예 설명을 Markdown으로 생성
- Clipboard API 기반 복사 버튼
- Vercel 배포 가능한 Next.js App Router 구조

## 범위

v1은 Markdown 생성과 복사에 집중합니다.

포함하지 않는 기능:

- Notion API 연동
- Notion 페이지 자동 생성
- 로그인/계정/저장 기능
- AI 풀이 생성
- 코드 실행/채점
- 백준, LeetCode 등 다른 플랫폼 지원

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
npm audit --omit=dev
```

## Vercel 배포

Vercel 계정이 연결된 환경에서 아래 명령으로 배포할 수 있습니다.

```bash
npx vercel
```

프로덕션 배포는 다음 명령을 사용합니다.

```bash
npx vercel --prod
```

별도 환경 변수는 필요하지 않습니다.
