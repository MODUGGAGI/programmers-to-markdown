"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
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
type PreviewMode = "markdown" | "preview";

export function ProblemTool() {
  const [url, setUrl] = useState("");
  const [problem, setProblem] = useState<ProblemData>(() => createEmptyProblem());
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [message, setMessage] = useState("프로그래머스 문제 링크를 넣고 자동 추출을 시도하세요.");
  const [missingFields, setMissingFields] = useState<MissingField[]>([]);
  const [failedSinceLastEdit, setFailedSinceLastEdit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("markdown");
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
                  className="mt-auto h-12 cursor-pointer rounded bg-[#e50914] px-7 text-sm font-bold text-white shadow-lg shadow-red-950/40 transition duration-150 hover:-translate-y-0.5 hover:bg-[#ff1824] hover:shadow-[0_0_34px_rgba(229,9,20,0.45)] hover:ring-2 hover:ring-red-400/45 active:translate-y-0 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:ring-0"
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
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded border border-zinc-800 bg-black p-1">
                  {(["markdown", "preview"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPreviewMode(mode)}
                      className={`h-9 cursor-pointer rounded px-3 text-sm font-bold transition ${
                        previewMode === mode
                          ? "bg-zinc-100 text-zinc-950"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                      }`}
                    >
                      {mode === "markdown" ? "Markdown" : "미리보기"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={copyMarkdown}
                  aria-disabled={copyDisabled}
                  className="h-11 cursor-pointer rounded bg-[#e50914] px-6 text-sm font-bold text-white shadow-lg shadow-red-950/40 transition duration-150 hover:-translate-y-0.5 hover:bg-[#ff1824] hover:shadow-[0_0_34px_rgba(229,9,20,0.45)] hover:ring-2 hover:ring-red-400/45 active:translate-y-0 aria-disabled:bg-zinc-700 aria-disabled:text-zinc-400 aria-disabled:shadow-none"
                >
                  {copied ? "복사됨" : "복사"}
                </button>
              </div>
            </div>
            {previewMode === "markdown" ? (
              <textarea
                value={markdown}
                readOnly
                aria-label="Notion Markdown preview"
                className="min-h-[560px] flex-1 resize-none rounded border border-zinc-800 bg-black p-5 font-mono text-sm leading-6 text-zinc-200 outline-none selection:bg-red-500/40"
              />
            ) : (
              <MarkdownPreview markdown={markdown} />
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}

type MarkdownBlock =
  | { type: "heading"; level: 1 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; language: string; text: string }
  | { type: "table"; rows: string[][] }
  | { type: "hr" };

function parseMarkdownPreview(markdown: string): MarkdownBlock[] {
  const lines = markdown.split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const codeStart = trimmed.match(/^(`{3,})(.*)$/);

    if (codeStart) {
      const fence = codeStart[1];
      const language = codeStart[2].trim();
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && lines[index].trim() !== fence) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push({ type: "code", language, text: codeLines.join("\n") });
      index += 1;
      continue;
    }

    if (trimmed === "---") {
      blocks.push({ type: "hr" });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "heading", level: 1, text: trimmed.slice(2).trim() });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "heading", level: 3, text: trimmed.slice(4).trim() });
      index += 1;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }

      const rows = tableLines
        .filter((row) => !/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(row))
        .map((row) =>
          row
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split(/(?<!\\)\|/)
            .map((cell) => cell.replace(/\\\|/g, "|").replace(/<br\s*\/?>/gi, "\n").trim()),
        );

      blocks.push({ type: "table", rows });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }

      blocks.push({ type: "list", items });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const current = lines[index].trim();

      if (
        !current ||
        current === "---" ||
        current.startsWith("# ") ||
        current.startsWith("### ") ||
        current.startsWith("|") ||
        current.startsWith("- ") ||
        /^`{3,}/.test(current)
      ) {
        break;
      }

      paragraphLines.push(current);
      index += 1;
    }

    blocks.push({ type: "paragraph", text: paragraphLines.join("\n") });
  }

  return blocks;
}

function InlineMarkdown({ text }: { text: string }) {
  return <>{renderInlineMarkdown(text)}</>;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  const codePattern = /(`+)([\s\S]*?)\1/g;
  let match: RegExpExecArray | null;

  while ((match = codePattern.exec(text))) {
    if (match.index > cursor) {
      nodes.push(...renderBoldMarkdown(text.slice(cursor, match.index), nodes.length));
    }

    nodes.push(
      <code key={`code-${nodes.length}`} className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-[0.92em] text-zinc-900">
        {match[2].trim()}
      </code>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    nodes.push(...renderBoldMarkdown(text.slice(cursor), nodes.length));
  }

  return nodes;
}

function renderBoldMarkdown(text: string, keyOffset: number): ReactNode[] {
  const nodes: ReactNode[] = [];
  const boldPattern = /\*\*([^*]+)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = boldPattern.exec(text))) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }

    nodes.push(
      <strong key={`bold-${keyOffset}-${nodes.length}`} className="font-bold text-zinc-950">
        {match[1]}
      </strong>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseMarkdownPreview(markdown), [markdown]);

  return (
    <div
      aria-label="Notion rendered preview"
      className="min-h-[560px] flex-1 overflow-auto rounded border border-zinc-800 bg-[#fbfbfa] p-6 text-zinc-900 shadow-inner"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {blocks.map((block, index) => {
          if (block.type === "heading" && block.level === 1) {
            return (
              <h1 key={index} className="mb-1 text-3xl font-bold leading-tight tracking-tight text-zinc-950">
                <InlineMarkdown text={block.text} />
              </h1>
            );
          }

          if (block.type === "heading") {
            return (
              <h3 key={index} className="mt-3 text-xl font-bold leading-snug text-zinc-950">
                <InlineMarkdown text={block.text} />
              </h3>
            );
          }

          if (block.type === "paragraph") {
            return (
              <p key={index} className="whitespace-pre-wrap text-[15px] leading-7 text-zinc-800">
                <InlineMarkdown text={block.text} />
              </p>
            );
          }

          if (block.type === "list") {
            return (
              <ul key={index} className="list-disc space-y-1 pl-6 text-[15px] leading-7 text-zinc-800">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <InlineMarkdown text={item} />
                  </li>
                ))}
              </ul>
            );
          }

          if (block.type === "code") {
            return (
              <pre key={index} className="overflow-auto rounded bg-zinc-100 p-4 font-mono text-sm leading-6 text-zinc-900">
                {block.language ? <span className="mb-2 block text-xs font-bold uppercase text-zinc-500">{block.language}</span> : null}
                <code>{block.text}</code>
              </pre>
            );
          }

          if (block.type === "table") {
            const [header, ...rows] = block.rows;

            return (
              <div key={index} className="overflow-auto rounded border border-zinc-200">
                <table className="w-full min-w-max border-collapse text-left text-sm">
                  {header ? (
                    <thead className="bg-zinc-100 text-zinc-950">
                      <tr>
                        {header.map((cell, cellIndex) => (
                          <th key={cellIndex} className="border-b border-zinc-200 px-3 py-2 font-bold">
                            <InlineMarkdown text={cell} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                  ) : null}
                  <tbody>
                    {rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t border-zinc-100">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="whitespace-pre-wrap px-3 py-2 text-zinc-800">
                            <InlineMarkdown text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return <hr key={index} className="my-2 border-zinc-200" />;
        })}
      </div>
    </div>
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
