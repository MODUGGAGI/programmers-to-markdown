import { describe, expect, it } from "vitest";
import { parseProgrammersHtml } from "./programmers-parser";
import { parseProgrammersUrl } from "./programmers-url";

describe("parseProgrammersUrl", () => {
  it("extracts the problem number from a Programmers lesson URL", () => {
    expect(parseProgrammersUrl("https://school.programmers.co.kr/learn/courses/30/lessons/12901?language=java")).toEqual({
      normalizedUrl: "https://school.programmers.co.kr/learn/courses/30/lessons/12901?language=java",
      problemNumber: "12901",
    });
  });

  it("rejects non-Programmers URLs", () => {
    expect(parseProgrammersUrl("https://example.com/learn/courses/30/lessons/12901")).toBeNull();
  });

  it("rejects lesson URLs with unexpected suffixes", () => {
    expect(parseProgrammersUrl("https://school.programmers.co.kr/learn/courses/30/lessons/12901abc")).toBeNull();
    expect(parseProgrammersUrl("https://school.programmers.co.kr/learn/courses/30/lessons/12901/extra")).toBeNull();
  });
});

describe("parseProgrammersHtml", () => {
  it("parses title, sections, and examples from representative HTML", () => {
    const result = parseProgrammersHtml(
      `
      <html>
        <head><title>코딩테스트 연습 - 두 수의 합</title></head>
        <body>
          <h2>두 수의 합</h2>
          <h5>문제 설명</h5>
          <p>정수 a와 b가 주어집니다.</p>
          <h5>제한사항</h5>
          <ul>
            <li>a와 b는 1 이상 100 이하입니다.</li>
          </ul>
          <h5>입출력 예</h5>
          <table>
            <tr><th>a</th><th>b</th><th>result</th></tr>
            <tr><td>1</td><td>2</td><td>3</td></tr>
          </table>
          <h5>입출력 예 설명</h5>
          <p>1과 2를 더하면 3입니다.</p>
        </body>
      </html>
      `,
      "https://school.programmers.co.kr/learn/courses/30/lessons/12901",
    );

    expect(result.status).toBe("success");
    expect(result.data.problemNumber).toBe("12901");
    expect(result.data.title).toBe("두 수의 합");
    expect(result.data.description).toContain("정수 a와 b");
    expect(result.data.constraints).toContain("a와 b는 1 이상");
    expect(result.data.examples).toEqual({
      headers: ["a", "b", "result"],
      rows: [["1", "2", "3"]],
    });
    expect(result.data.exampleExplanation).toContain("1과 2를 더하면 3");
  });

  it("does not leak nested later sections into the problem description", () => {
    const result = parseProgrammersHtml(
      `
      <html>
        <head><title>코딩테스트 연습 - 정수 삼각형</title></head>
        <body>
          <h2>정수 삼각형</h2>
          <h6>문제 설명</h6>
          <div class="markdown">
            <p>꼭대기에서 바닥까지 이어지는 경로 중 합이 가장 큰 경우를 찾습니다.</p>
            <p>최댓값을 return 하도록 solution 함수를 완성하세요.</p>
            <h5>제한사항</h5>
            <ul>
              <li>삼각형의 높이는 1 이상 500 이하입니다.</li>
            </ul>
            <h5>입출력 예</h5>
            <table>
              <tr><th>triangle</th><th>result</th></tr>
              <tr><td>[[7], [3, 8]]</td><td>15</td></tr>
            </table>
          </div>
        </body>
      </html>
      `,
      "https://school.programmers.co.kr/learn/courses/30/lessons/43105",
    );

    expect(result.data.description).toContain("꼭대기에서 바닥까지");
    expect(result.data.description).not.toContain("제한사항");
    expect(result.data.description).not.toContain("입출력 예");
    expect(result.data.constraints).toContain("삼각형의 높이는 1 이상");
    expect(result.data.examples).toEqual({
      headers: ["triangle", "result"],
      rows: [["[[7], [3, 8]]", "15"]],
    });
  });

  it("parses challenge pages whose description container starts with an inner problem title", () => {
    const result = parseProgrammersHtml(
      `
      <html>
        <head><title>코딩테스트 연습 - 실패율 | 프로그래머스 스쿨</title></head>
        <body>
          <span class="challenge-title">실패율</span>
          <div class="guide-section-description">
            <h6 class="guide-section-title">문제 설명</h6>
            <div class="markdown solarized-dark">
              <h2>실패율</h2>
              <p>슈퍼 게임 개발자 오렐리는 큰 고민에 빠졌다.</p>
              <p>실패율이 높은 스테이지부터 내림차순으로 return 하도록 solution 함수를 완성하라.</p>
              <h5>제한사항</h5>
              <ul>
                <li>스테이지의 개수 N은 <code>1</code> 이상 <code>500</code> 이하의 자연수이다.</li>
              </ul>
              <h5>입출력 예</h5>
              <table class="table">
                <thead>
                  <tr><th>N</th><th>stages</th><th>result</th></tr>
                </thead>
                <tbody>
                  <tr><td>5</td><td>[2, 1, 2, 6, 2, 4, 3, 3]</td><td>[3, 4, 2, 1, 5]</td></tr>
                </tbody>
              </table>
              <h5>입출력 예 설명</h5>
              <p>입출력 예 #1<br>1번 스테이지에는 총 8명의 사용자가 도전했다.</p>
            </div>
          </div>
        </body>
      </html>
      `,
      "https://school.programmers.co.kr/learn/courses/30/lessons/42889",
    );

    expect(result.status).toBe("success");
    expect(result.data.title).toBe("실패율");
    expect(result.data.description).toContain("슈퍼 게임 개발자 오렐리");
    expect(result.data.description).toContain("solution 함수를 완성하라");
    expect(result.data.description).not.toContain("제한사항");
    expect(result.data.description).not.toContain("입출력 예");
    expect(result.data.constraints).toContain("`1` 이상 `500` 이하");
    expect(result.data.examples).toEqual({
      headers: ["N", "stages", "result"],
      rows: [["5", "[2, 1, 2, 6, 2, 4, 3, 3]", "[3, 4, 2, 1, 5]"]],
    });
    expect(result.data.exampleExplanation).toContain("입출력 예 #1");
  });

  it("keeps problem images as markdown image links", () => {
    const result = parseProgrammersHtml(
      `
      <html>
        <head><title>코딩테스트 연습 - 그림 문제</title></head>
        <body>
          <h2>그림 문제</h2>
          <h5>문제 설명</h5>
          <div>
            <p>아래 그림을 참고하세요.</p>
            <img src="/assets/problem.png" alt="예시 그림" />
            <p>그림과 같은 결과를 return 하세요.</p>
          </div>
          <h5>제한사항</h5>
          <p>n은 1 이상입니다.</p>
          <h5>입출력 예</h5>
          <table>
            <tr><th>n</th><th>result</th></tr>
            <tr><td>1</td><td>1</td></tr>
          </table>
        </body>
      </html>
      `,
      "https://school.programmers.co.kr/learn/courses/30/lessons/99999",
    );

    expect(result.data.description).toContain("아래 그림을 참고하세요.");
    expect(result.data.description).toContain("![예시 그림](<https://school.programmers.co.kr/assets/problem.png>)");
    expect(result.data.description).toContain("그림과 같은 결과");
  });

  it("drops unsupported image URL schemes", () => {
    const result = parseProgrammersHtml(
      `
      <html>
        <head><title>코딩테스트 연습 - 그림 문제</title></head>
        <body>
          <h2>그림 문제</h2>
          <h5>문제 설명</h5>
          <p>이미지 전</p>
          <img src="javascript:alert(1)" alt="bad] label" />
          <p>이미지 후</p>
          <h5>제한사항</h5>
          <p>n은 1 이상입니다.</p>
          <h5>입출력 예</h5>
          <table>
            <tr><th>n</th><th>result</th></tr>
            <tr><td>1</td><td>1</td></tr>
          </table>
        </body>
      </html>
      `,
      "https://school.programmers.co.kr/learn/courses/30/lessons/99999",
    );

    expect(result.data.description).toContain("이미지 전");
    expect(result.data.description).toContain("이미지 후");
    expect(result.data.description).not.toContain("javascript:");
    expect(result.data.description).not.toContain("bad]");
  });

  it("keeps preformatted formula examples as text code blocks and bold labels", () => {
    const result = parseProgrammersHtml(
      `
      <html>
        <head><title>코딩테스트 연습 - 타겟 넘버</title></head>
        <body>
          <h2>타겟 넘버</h2>
          <h5>문제 설명</h5>
          <div>
            <p>다음 다섯 방법을 쓸 수 있습니다.</p>
            <div class="highlight">
              <pre class="codehilite"><code>-1+1+1+1+1 = 3
${"```"}existing fence${"```"}
+1-1+1+1+1 = 3</code></pre>
            </div>
            <p>방법의 수를 return 하도록 solution 함수를 작성해주세요.</p>
          </div>
          <h5>제한사항</h5>
          <p>숫자의 개수는 2개 이상입니다.</p>
          <h5>입출력 예</h5>
          <table>
            <tr><th>numbers</th><th>target</th><th>return</th></tr>
            <tr><td>[1, 1, 1, 1, 1]</td><td>3</td><td>5</td></tr>
          </table>
          <h5>입출력 예 설명</h5>
          <p><strong>입출력 예 #1</strong></p>
          <p>문제 예시와 같습니다.</p>
          <p><strong>입출력 예 #2</strong></p>
          <div class="highlight">
            <pre class="codehilite"><code>+4+1-2+1 = 4
+4-1+2-1 = 4</code></pre>
          </div>
        </body>
      </html>
      `,
      "https://school.programmers.co.kr/learn/courses/30/lessons/43165",
    );

    expect(result.data.description).toContain("````text\n-1+1+1+1+1 = 3\n```existing fence```\n+1-1+1+1+1 = 3\n````");
    expect(result.data.exampleExplanation).toContain("**입출력 예 #1**");
    expect(result.data.exampleExplanation).toContain("**입출력 예 #2**");
    expect(result.data.exampleExplanation).toContain("```text\n+4+1-2+1 = 4\n+4-1+2-1 = 4\n```");
  });

  it("keeps inline code markup as markdown backticks", () => {
    const result = parseProgrammersHtml(
      `
      <html>
        <head><title>코딩테스트 연습 - 충돌위험 찾기</title></head>
        <body>
          <h2>충돌위험 찾기</h2>
          <h5>문제 설명</h5>
          <p>로봇의 이동을 확인합니다.</p>
          <h5>제한사항</h5>
          <ul>
            <li>2 ≤ <code>points</code>의 길이 = <code>n</code> ≤ 100
              <ul>
                <li><code>points[i]</code>는 <code>i + 1</code>번 포인트의 [<code>r 좌표</code>, <code>c 좌표</code>]를 나타냅니다.</li>
                <li>1 ≤ <code>r</code> ≤ 100</li>
              </ul>
            </li>
          </ul>
          <h5>입출력 예</h5>
          <table>
            <tr><th>points</th><th>routes</th><th>result</th></tr>
            <tr><td>[[3, 2]]</td><td>[[1]]</td><td>0</td></tr>
          </table>
        </body>
      </html>
      `,
      "https://school.programmers.co.kr/learn/courses/30/lessons/340211",
    );

    expect(result.data.constraints).toContain("`points`");
    expect(result.data.constraints).toContain("`n`");
    expect(result.data.constraints).toContain("`points[i]`는 `i + 1`번 포인트의 [`r 좌표`, `c 좌표`]");
    expect(result.data.constraints).toContain("1 ≤ `r` ≤ 100");
  });

  it("uses a safe inline code delimiter when code text contains backticks", () => {
    const result = parseProgrammersHtml(
      `
      <html>
        <head><title>코딩테스트 연습 - 백틱 문제</title></head>
        <body>
          <h2>백틱 문제</h2>
          <h5>문제 설명</h5>
          <p><code>a${"`"}b</code> 값을 확인합니다.</p>
          <h5>제한사항</h5>
          <p>n은 1 이상입니다.</p>
          <h5>입출력 예</h5>
          <table>
            <tr><th>n</th><th>result</th></tr>
            <tr><td>1</td><td>1</td></tr>
          </table>
        </body>
      </html>
      `,
      "https://school.programmers.co.kr/learn/courses/30/lessons/99999",
    );

    expect(result.data.description).toContain("`` a`b `` 값을 확인합니다.");
  });
});
