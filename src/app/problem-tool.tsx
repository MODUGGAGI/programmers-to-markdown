"use client";

import { useMemo, useState } from "react";
import { examplesToMarkdownTable, generateNotionMarkdown, markdownTableToExamples } from "@/lib/markdown";
import {
  createEmptyProblem,
  getManualMissingFields,
  mergeExtractedProblem,
  type ExtractionResult,
  type MissingField,
  type ProblemData,
} from "@/lib/problem";

type RequestState = "idle" | "loading" | "success" | "partial" | "failed";

export function ProblemTool() {
  const [url, setUrl] = useState("");
  const [problem, setProblem] = useState<ProblemData>(() => createEmptyProblem());
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("프로그래머스 문제 링크를 넣고 자동 추출을 시도하세요.");
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [failedSinceLastEdit, setFailedSinceLastEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const markdown = useMemo(() => generateNotionMarkdown(problem), [problem]);
  const exampleTable = useMemo(() => examplesToMarkdownTable(problem.examples), [problem.examples]);
  const hasMissingRequiredField = getManualMissingFields(problem).length > 0;
  const copyDisabled = hasMissingRequiredField || failedSinceLastEdit;

  const patchProblem = (patch: Partial<ProblemData>) => {
    const next = createEmptyProblem({ ...problem, ...patch });

    setProblem(next);
    setMissingFields(getManualMissingFields(next));
    setFailedSinceLastEdit(false);
    setCopied(false);
  };

  const hasMissingField = (...fields: MissingField[]) => fields.some((field) => missingFields.includes(field));

  const extract = async () => {
    setRequestState("loading");
    setMessage("프로그래머스 페이지에서 문제 정보를 가져오는 중입니다.");
    setCopied(false);

    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const result = (await response.json()) as ExtractionResult;

      if (result.status === "success") {
        setProblem(result.data);
      } else if (result.status === "partial") {
        setProblem((current) => mergeExtractedProblem(current, result.data, result.missingFields));
      }

      setMissingFields(result.missingFields);
      setFailedSinceLastEdit(result.status === "failed");
      setRequestState(result.status);
      setMessage(result.message);
    } catch {
      setMissingFields([]);
      setFailedSinceLastEdit(true);
      setRequestState("failed");
      setMessage("자동 추출에 실패했습니다. 아래 입력칸에 직접 붙여넣어도 Markdown을 만들 수 있습니다.");
    }
  };

  const copyMarkdown = async () => {
    if (copyDisabled) {
      setCopied(false);
      setMessage(
        failedSinceLastEdit
          ? "자동 추출 실패 후 이전 내용이 남아있을 수 있습니다. 필요한 내용을 직접 확인하거나 수정한 뒤 복사해주세요."
          : "필수 입력칸을 채운 뒤 복사할 수 있습니다.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setMessage("Markdown을 복사했습니다. Notion 페이지 본문에 붙여넣으면 됩니다.");
    } catch {
      setCopied(false);
      setMessage("브라우저가 자동 복사를 막았습니다. Markdown 영역을 직접 선택해 복사해주세요.");
    }
  };

  const statusClass =
    requestState === "success"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : requestState === "partial"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
        : requestState === "failed"
          ? "border-red-500/40 bg-red-500/10 text-red-200"
          : "border-zinc-700 bg-zinc-900/80 text-zinc-300";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#050505] text-zinc-50">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_16%_0%,rgba(229,9,20,0.28),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_32%),linear-gradient(180deg,#050505_0%,#080808_48%,#000_100%)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(90deg,rgba(0,0,0,0.18),transparent_28%,rgba(0,0,0,0.45)),radial-gradient(circle_at_78%_18%,rgba(115,115,115,0.14),transparent_28%)]" />

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-5 sm:px-8 lg:px-12">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-14 items-center justify-center text-3xl font-black tracking-tight text-[#e50914]">
              PM
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Programmers Markdown</h1>
              <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-red-500">
                Algorithm note generator
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#e50914] px-5 py-2 text-sm font-bold text-white shadow-[0_0_32px_rgba(229,9,20,0.24)]">
              추출
            </span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-5 py-2 text-sm font-semibold text-zinc-300">
              수동 편집
            </span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-5 py-2 text-sm font-semibold text-zinc-300">
              Notion 미리보기
            </span>
            <span className="ml-0 rounded-full border border-zinc-700 bg-zinc-950/80 px-5 py-2 text-sm font-semibold text-zinc-400 sm:ml-3">
              Vercel-ready
            </span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.85fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <section className="relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl shadow-black/60 sm:p-7">
              <div className="absolute inset-y-0 right-0 w-2/5 bg-[radial-gradient(circle_at_70%_32%,rgba(229,9,20,0.25),transparent_44%)]" />
              <div className="relative max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#e50914]">Algorithm Studio</p>
                <h2 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                  Programmers Markdown
                </h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["자동 추출 대기", "Java 기록", "Notion 복사"].map((label) => (
                    <span key={label} className="rounded-full border border-zinc-700 bg-black/50 px-4 py-2 text-sm font-semibold text-zinc-300">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-[#111113]/95 p-4 shadow-2xl shadow-black/50 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex flex-1 flex-col gap-2">
                  <span className="text-sm font-bold text-zinc-200">프로그래머스 URL</span>
                  <div className="relative">
                    <input
                      value={url}
                      onChange={(event) => setUrl(event.target.value)}
                      placeholder="https://school.programmers.co.kr/learn/courses/.../lessons/..."
                      className="h-12 w-full rounded border border-zinc-700 bg-black px-4 pr-11 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#e50914] focus:ring-2 focus:ring-[#e50914]/25"
                    />
                    {url ? (
                      <button
                        type="button"
                        aria-label="URL 지우기"
                        onClick={() => {
                          setUrl("");
                          setCopied(false);
                        }}
                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-lg font-bold text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#e50914]/35"
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                </label>
                <button
                  type="button"
                  onClick={extract}
                  disabled={requestState === "loading"}
                  className="mt-auto h-12 rounded bg-[#e50914] px-7 text-sm font-bold text-white shadow-lg shadow-red-950/40 transition hover:bg-[#f6121d] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
                >
                  {requestState === "loading" ? "추출 중" : "자동 추출"}
                </button>
              </div>

              <div className={`rounded border px-4 py-3 text-sm font-medium ${statusClass}`} role="status" aria-live="polite">
                {message}
              </div>

              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <Field label="문제 번호" value={problem.problemNumber} onChange={(value) => patchProblem({ problemNumber: value })} />
                <Field label="이름" value={problem.title} missing={hasMissingField("title")} onChange={(value) => patchProblem({ title: value })} />
              </div>

              <TextArea
                label="문제 설명"
                value={problem.description}
                rows={7}
                missing={hasMissingField("description")}
                onChange={(value) => patchProblem({ description: value })}
              />
              <TextArea
                label="제한사항"
                value={problem.constraints}
                rows={5}
                missing={hasMissingField("constraints")}
                onChange={(value) => patchProblem({ constraints: value })}
              />
              <TextArea
                label="입출력 예"
                value={exampleTable}
                rows={6}
                missing={hasMissingField("examples.headers", "examples.rows")}
                placeholder={"| a | b | result |\n| --- | --- | --- |\n| 5 | 24 | \"TUE\" |"}
                onChange={(value) => patchProblem({ examples: markdownTableToExamples(value) })}
              />
              <TextArea
                label="입출력 예 설명"
                value={problem.exampleExplanation}
                rows={5}
                onChange={(value) => patchProblem({ exampleExplanation: value })}
              />
            </div>
          </div>

          <aside className="flex min-h-[760px] min-w-0 flex-col gap-4 rounded-lg border border-zinc-800 bg-[#0d0d0f]/95 p-4 shadow-2xl shadow-black/60 sm:p-5 lg:sticky lg:top-5 lg:max-h-[calc(100vh-40px)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">Notion Markdown</h2>
                <p className="mt-1 text-sm text-zinc-500">붙여넣기 전에 결과를 어두운 코드뷰로 확인</p>
              </div>
              <button
                type="button"
                onClick={copyMarkdown}
                aria-disabled={copyDisabled}
                className="h-11 cursor-pointer rounded bg-[#e50914] px-6 text-sm font-bold text-white shadow-lg shadow-red-950/40 transition hover:bg-[#f6121d] aria-disabled:bg-zinc-700 aria-disabled:text-zinc-400 aria-disabled:shadow-none"
              >
                {copied ? "복사됨" : "복사"}
              </button>
            </div>
            <textarea
              value={markdown}
              readOnly
              aria-label="Notion Markdown preview"
              className="min-h-[560px] flex-1 resize-none rounded border border-zinc-800 bg-black p-5 font-mono text-sm leading-6 text-zinc-200 outline-none selection:bg-red-500/40"
            />
          </aside>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, missing, onChange }: { label: string; value: string; missing?: boolean; onChange: (value: string) => void }) {
  const inputId = `field-${label.replace(/\s+/g, "-")}`;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="text-sm font-bold text-zinc-300">
          {label}
        </label>
        {missing ? <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">확인 필요</span> : null}
      </div>
      <input
        id={inputId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded border border-zinc-700 bg-black px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#e50914] focus:ring-2 focus:ring-[#e50914]/25"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  rows,
  placeholder,
  missing,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  placeholder?: string;
  missing?: boolean;
  onChange: (value: string) => void;
}) {
  const inputId = `textarea-${label.replace(/\s+/g, "-")}`;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="text-sm font-bold text-zinc-300">
          {label}
        </label>
        {missing ? <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-200">확인 필요</span> : null}
      </div>
      <textarea
        id={inputId}
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="resize-y rounded border border-zinc-700 bg-black px-4 py-3 text-sm leading-6 text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-[#e50914] focus:ring-2 focus:ring-[#e50914]/25"
      />
    </div>
  );
}
