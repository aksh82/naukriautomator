/**
 * TDD tests for App router.
 *
 * Tests router transitions:
 * setup -> run -> results -> setup
 *
 * Created by: Adikarthik Gupta C B
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from "vitest";

import {
  render,
  screen,
} from "@testing-library/react";

import userEvent from "@testing-library/user-event";

import type { JobStreamState } from "./hooks/useJobStream";
import type { RunSummary } from "./screens/RunScreen";

// ------------------------------------------------------------
// Mock startJob
// ------------------------------------------------------------

const mockStartJob = vi
  .fn<[unknown], Promise<{ jobId: string; wsUrl: string }>>()
  .mockResolvedValue({
    jobId: "mock-job-1",
    wsUrl: "/ws/jobs/mock-job-1",
  });

vi.mock("./api/rest", () => ({
  startJob: (req: unknown) => mockStartJob(req),
  stopJob: vi.fn(),
  continueJob: vi.fn(),
  skipJob: vi.fn(),
  downloadTemplate: vi.fn(),
  parseExcel: vi.fn(),
}));

// ------------------------------------------------------------
// Mock useJobStream
// ------------------------------------------------------------

const mockUseJobStream = vi
  .fn<[string | undefined], JobStreamState>();

vi.mock("./hooks/useJobStream", () => ({
  useJobStream: (jobId: string | undefined) =>
    mockUseJobStream(jobId),
}));

// ------------------------------------------------------------
// Stream state helpers
// ------------------------------------------------------------

const emptySummary: RunSummary = {
  ok: 0,
  authFailed: 0,
  requiresManual: 0,
  failed: 0,
  skipped: 0,
};

function idleStreamState(): JobStreamState {
  return {
    events: [],
    byEmail: {},
    summary: {
      ...emptySummary,
      total: 1,
    },
    awaitingManual: null,
    connectionState: "connecting",
  };
}

function completedStreamState(): JobStreamState {
  return {
    events: [],
    byEmail: {},
    summary: {
      ok: 1,
      authFailed: 0,
      requiresManual: 0,
      failed: 0,
      skipped: 0,
      total: 1,
    },
    awaitingManual: null,
    connectionState: "closed",
  };
}

// ------------------------------------------------------------
// Import App AFTER mocks
// ------------------------------------------------------------

const { default: App } = await import("./App");

// ------------------------------------------------------------
// Helper
// ------------------------------------------------------------

/**
 * Fill SetupScreen with all required fields and start the job.
 *
 * Current SetupScreen requires:
 * - Name
 * - Email
 * - Password
 * - Resume folder
 * - Output folder
 */
async function fillAndStart(email: string): Promise<void> {
  await userEvent.click(
    screen.getByRole("tab", {
      name: /enter manually/i,
    })
  );

  // EmailChipInput requires a name AND email.
  await userEvent.type(
    screen.getByTestId("chip-name-input"),
    "A"
  );

  await userEvent.type(
    screen.getByTestId("chip-input"),
    `${email}{Enter}`
  );

  // Password
  await userEvent.type(
    screen.getByTestId("password"),
    "pass123"
  );

  // Resume folder
  await userEvent.type(
    screen.getByTestId("resume-folder"),
    "C:\\resumes"
  );

  // Output folder
  await userEvent.type(
    screen.getByTestId("output-folder"),
    "C:\\runs"
  );

  await userEvent.click(
    screen.getByTestId("start")
  );
}

// ------------------------------------------------------------
// Tests
// ------------------------------------------------------------

describe("App router", () => {
  beforeEach(() => {
    mockStartJob
      .mockReset()
      .mockResolvedValue({
        jobId: "mock-job-1",
        wsUrl: "/ws/jobs/mock-job-1",
      });

    mockUseJobStream
      .mockReset()
      .mockReturnValue(idleStreamState());
  });

  it("shows brand name and byline on initial render", () => {
    render(<App />);

    expect(
      screen.getByText("NAUKRI_AUTOMATOR")
    ).toBeInTheDocument();

    expect(
      screen.getAllByText(/Adikarthik Gupta C B/).length
    ).toBeGreaterThan(0);
  });

  it("initial render shows SetupScreen", () => {
    render(<App />);

    expect(
      screen.getByTestId("start")
    ).toBeInTheDocument();
  });

  it("Stepper starts on 'setup'", () => {
    render(<App />);

    expect(
      screen.getByTestId("step-setup")
    ).toHaveAttribute(
      "data-active",
      "true"
    );

    expect(
      screen.getByTestId("step-run")
    ).toHaveAttribute(
      "data-active",
      "false"
    );
  });

  it("after onStart -> RunScreen is shown and Stepper moves to run", async () => {
    mockUseJobStream.mockReturnValue(
      idleStreamState()
    );

    render(<App />);

    await fillAndStart("a@x.com");

    expect(
      mockStartJob
    ).toHaveBeenCalledOnce();

    await screen.findByTestId("run-screen");

    expect(
      screen.getByTestId("run-screen")
    ).toBeInTheDocument();

    expect(
      screen.getByTestId("step-run")
    ).toHaveAttribute(
      "data-active",
      "true"
    );
  });

  it("after RUN_COMPLETED stream state -> ResultsScreen is shown", async () => {
    mockUseJobStream.mockReturnValue(
      completedStreamState()
    );

    render(<App />);

    await fillAndStart("b@x.com");

    await screen.findByTestId(
      "results-screen"
    );

    expect(
      screen.getByTestId("results-screen")
    ).toBeInTheDocument();

    expect(
      screen.getByTestId("step-results")
    ).toHaveAttribute(
      "data-active",
      "true"
    );
  });

  it("clicking New run from ResultsScreen returns to SetupScreen", async () => {
    mockUseJobStream.mockReturnValue(
      completedStreamState()
    );

    render(<App />);

    await fillAndStart("c@x.com");

    await screen.findByTestId(
      "results-screen"
    );

    await userEvent.click(
      screen.getByTestId("new-run")
    );

    expect(
      screen.getByTestId("start")
    ).toBeInTheDocument();

    expect(
      screen.getByTestId("step-setup")
    ).toHaveAttribute(
      "data-active",
      "true"
    );
  });
});
