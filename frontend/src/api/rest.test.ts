import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  startJob,
  stopJob,
  continueJob,
  skipJob,
  parseExcel,
} from "./rest";
import type { StartJobResponse, ParsedEmailRow } from "./types";

// In Vite development/test mode, rest.ts uses relative URLs.
// Therefore MSW handlers must also use relative paths.
const server = setupServer(
  http.post("/api/jobs", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;

    const response: StartJobResponse = {
      jobId: "test-job-1",
      wsUrl: "ws://127.0.0.1:8080/ws/jobs/test-job-1",
    };

    // Validate required fields.
    if (!body.accounts || !body.password) {
      return HttpResponse.json(
        { error: "missing fields" },
        { status: 400 }
      );
    }

    return HttpResponse.json(response, { status: 200 });
  }),

  http.post("/api/jobs/:id/stop", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/jobs/:id/continue", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/jobs/:id/skip", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/parse-excel", () => {
    const rows: ParsedEmailRow[] = [
      {
        email: "alice@example.com",
        name: "Alice",
        rowIndex: 1,
      },
      {
        email: "bob@example.com",
        name: "Bob",
        rowIndex: 2,
      },
    ];

    return HttpResponse.json(rows, { status: 200 });
  })
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

describe("REST client", () => {
  it("startJob sends correct payload and returns StartJobResponse", async () => {
    const result = await startJob({
      accounts: [
        {
          email: "alice@example.com",
          name: "Alice",
        },
      ],
      password: "secret123",
      headless: true,
      manualLogin: false,
      outputFolder: "/tmp/out",
      resumeFolderPath: "/tmp/resumes",
    });

    expect(result.jobId).toBe("test-job-1");
    expect(result.wsUrl).toContain("test-job-1");
    expect(result.wsUrl).toContain("8080");
  });

  it("startJob throws on missing required fields (server returns 400)", async () => {
    server.use(
      http.post("/api/jobs", () =>
        HttpResponse.json(
          { error: "missing fields" },
          { status: 400 }
        )
      )
    );

    await expect(
      startJob({
        accounts: [],
        password: "",
        headless: false,
        manualLogin: false,
        outputFolder: "",
        resumeFolderPath: "",
      })
    ).rejects.toThrow("startJob failed: 400");
  });

  it("stopJob calls POST /api/jobs/:id/stop", async () => {
    await expect(
      stopJob("test-job-1")
    ).resolves.toBeUndefined();
  });

  it("continueJob calls POST /api/jobs/:id/continue", async () => {
    await expect(
      continueJob("test-job-1")
    ).resolves.toBeUndefined();
  });

  it("skipJob calls POST /api/jobs/:id/skip", async () => {
    await expect(
      skipJob("test-job-1")
    ).resolves.toBeUndefined();
  });

  it("parseExcel POSTs multipart and returns ParsedEmailRow[]", async () => {
    const file = new File(
      ["dummy xlsx content"],
      "emails.xlsx",
      {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );

    const rows = await parseExcel(file);

    expect(rows).toHaveLength(2);
    expect(rows[0].email).toBe("alice@example.com");
    expect(rows[1].email).toBe("bob@example.com");
  });
});
 
