import { describe, expect, it } from "vitest";
import { createEmptyProblem, getManualMissingFields, mergeExtractedProblem } from "./problem";

describe("problem editing helpers", () => {
  it("recomputes manual missing fields from the current problem data", () => {
    expect(
      getManualMissingFields(
        createEmptyProblem({
          title: "문제",
          description: "설명",
          constraints: "",
          examples: { headers: ["n"], rows: [[""]] },
        }),
      ),
    ).toEqual(["constraints", "examples.rows"]);
  });

  it("preserves manual values when a partial extraction is missing those fields", () => {
    const current = createEmptyProblem({
      title: "수동 제목",
      description: "수동 설명",
      constraints: "수동 제한",
      examples: { headers: ["manual"], rows: [["value"]] },
    });
    const extracted = createEmptyProblem({
      url: "https://school.programmers.co.kr/learn/courses/30/lessons/12345",
      problemNumber: "12345",
      title: "자동 제목",
      description: "자동 설명",
      constraints: "",
      examples: { headers: [], rows: [] },
    });

    expect(mergeExtractedProblem(current, extracted, ["constraints", "examples.headers", "examples.rows"])).toEqual(
      createEmptyProblem({
        url: "https://school.programmers.co.kr/learn/courses/30/lessons/12345",
        problemNumber: "12345",
        title: "자동 제목",
        description: "자동 설명",
        constraints: "수동 제한",
        examples: { headers: ["manual"], rows: [["value"]] },
      }),
    );
  });

  it("does not carry missing fields from a different previously extracted problem", () => {
    const current = createEmptyProblem({
      url: "https://school.programmers.co.kr/learn/courses/30/lessons/11111",
      problemNumber: "11111",
      title: "이전 문제",
      description: "이전 설명",
      constraints: "이전 제한",
      examples: { headers: ["old"], rows: [["old"]] },
    });
    const extracted = createEmptyProblem({
      url: "https://school.programmers.co.kr/learn/courses/30/lessons/22222",
      problemNumber: "22222",
      title: "새 문제",
      description: "새 설명",
    });

    expect(mergeExtractedProblem(current, extracted, ["constraints", "examples.headers", "examples.rows"])).toEqual(
      createEmptyProblem({
        url: "https://school.programmers.co.kr/learn/courses/30/lessons/22222",
        problemNumber: "22222",
        title: "새 문제",
        description: "새 설명",
      }),
    );
  });

  it("preserves manual values for the same problem when only the URL query differs", () => {
    const current = createEmptyProblem({
      url: "https://school.programmers.co.kr/learn/courses/30/lessons/12345?language=java",
      problemNumber: "12345",
      title: "수동 제목",
      description: "수동 설명",
      constraints: "수동 제한",
      examples: { headers: ["manual"], rows: [["value"]] },
    });
    const extracted = createEmptyProblem({
      url: "https://school.programmers.co.kr/learn/courses/30/lessons/12345",
      problemNumber: "12345",
      title: "자동 제목",
      description: "자동 설명",
    });

    expect(mergeExtractedProblem(current, extracted, ["constraints", "examples.headers", "examples.rows"])).toEqual(
      createEmptyProblem({
        url: "https://school.programmers.co.kr/learn/courses/30/lessons/12345",
        problemNumber: "12345",
        title: "자동 제목",
        description: "자동 설명",
        constraints: "수동 제한",
        examples: { headers: ["manual"], rows: [["value"]] },
      }),
    );
  });
});
