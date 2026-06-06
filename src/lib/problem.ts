export type ExtractionStatus = "success" | "partial" | "failed";

export type ExampleTable = {
  headers: string[];
  rows: string[][];
};

export type ProblemData = {
  url: string;
  problemNumber: string;
  title: string;
  description: string;
  constraints: string;
  examples: ExampleTable;
  exampleExplanation: string;
};

export type MissingField = keyof ProblemData | "examples.headers" | "examples.rows";

export const MANUAL_REQUIRED_FIELDS: MissingField[] = [
  "title",
  "description",
  "constraints",
  "examples.headers",
  "examples.rows",
];

export type ExtractionResult = {
  status: ExtractionStatus;
  data: ProblemData;
  missingFields: MissingField[];
  message: string;
};

export const EMPTY_PROBLEM: ProblemData = {
  url: "",
  problemNumber: "",
  title: "",
  description: "",
  constraints: "",
  examples: { headers: [], rows: [] },
  exampleExplanation: "",
};

function hasExampleRows(examples: ExampleTable) {
  return examples.rows.length > 0 && examples.rows.some((row) => row.some((cell) => cell.trim()));
}

export function getManualMissingFields(data: ProblemData): MissingField[] {
  const missing: MissingField[] = [];

  if (!data.title.trim()) {
    missing.push("title");
  }

  if (!data.description.trim()) {
    missing.push("description");
  }

  if (!data.constraints.trim()) {
    missing.push("constraints");
  }

  if (data.examples.headers.length === 0) {
    missing.push("examples.headers");
  }

  if (!hasExampleRows(data.examples)) {
    missing.push("examples.rows");
  }

  return missing;
}

export function mergeExtractedProblem(
  current: ProblemData,
  extracted: ProblemData,
  missingFields: MissingField[],
): ProblemData {
  const missing = new Set(missingFields);
  const currentProblemNumber = current.problemNumber.trim();
  const extractedProblemNumber = extracted.problemNumber.trim();
  const currentUrl = current.url.trim();
  const extractedUrl = extracted.url.trim();
  const isDifferentProblem =
    currentProblemNumber && extractedProblemNumber
      ? currentProblemNumber !== extractedProblemNumber
      : Boolean(currentUrl && extractedUrl && currentUrl !== extractedUrl);
  const fallback = isDifferentProblem ? createEmptyProblem() : current;
  const textField = (field: keyof ProblemData) => {
    const value = extracted[field];

    if (typeof value !== "string") {
      return fallback[field];
    }

    return !missing.has(field) && value.trim() ? value : fallback[field];
  };

  const headers =
    !missing.has("examples.headers") && extracted.examples.headers.length > 0
      ? extracted.examples.headers
      : fallback.examples.headers;
  const rows = !missing.has("examples.rows") && hasExampleRows(extracted.examples) ? extracted.examples.rows : fallback.examples.rows;

  return createEmptyProblem({
    url: extracted.url.trim() || fallback.url,
    problemNumber: extracted.problemNumber.trim() || fallback.problemNumber,
    title: textField("title") as string,
    description: textField("description") as string,
    constraints: textField("constraints") as string,
    examples: { headers, rows },
    exampleExplanation: extracted.exampleExplanation.trim() ? extracted.exampleExplanation : fallback.exampleExplanation,
  });
}

export function createEmptyProblem(overrides: Partial<ProblemData> = {}): ProblemData {
  return {
    ...EMPTY_PROBLEM,
    ...overrides,
    examples: overrides.examples
      ? {
          headers: [...overrides.examples.headers],
          rows: overrides.examples.rows.map((row) => [...row]),
        }
      : {
          headers: [...EMPTY_PROBLEM.examples.headers],
          rows: EMPTY_PROBLEM.examples.rows.map((row) => [...row]),
        },
  };
}
