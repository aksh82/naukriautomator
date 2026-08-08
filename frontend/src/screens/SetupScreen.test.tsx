/**
 * TDD – RED tests written first, then SetupScreen implemented to make them GREEN.
 *
 * Created by: Adikarthik Gupta C B
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import SetupScreen from "./SetupScreen";

const BASE = "http://127.0.0.1:5000";

// MSW intercepts for template download assertion and parse-excel
const server = setupServer(
  http.get(`${BASE}/api/template`, () =>
    new HttpResponse(
      new Uint8Array([0x50, 0x4b]).buffer as ArrayBuffer,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      }
    )
  ),

  http.post(`${BASE}/api/parse-excel`, () =>
    HttpResponse.json([], { status: 200 })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

afterEach(() => server.resetHandlers());

afterAll(() => server.close());

function fillPassword(pw: string) {
  const field = screen.getByTestId("password") as HTMLInputElement;
  return userEvent.type(field, pw);
}

async function addEmailManually(email: string) {
  // Switch to "Enter manually" tab
  await userEvent.click(
    screen.getByRole("tab", { name: /enter manually/i })
  );

  // EmailChipInput requires BOTH name and email
  const nameInput = screen.getByTestId("chip-name-input");
  const emailInput = screen.getByTestId("chip-input");

  await userEvent.type(nameInput, "A");
  await userEvent.type(emailInput, `${email}{Enter}`);
}

async function setOutputFolder(path: string) {
  const folderField = screen.getByTestId("output-folder");

  // In tests window.electronAPI is undefined, so the field is editable
  await userEvent.clear(folderField);
  await userEvent.type(folderField, path);
}

async function setResumeFolder(path: string) {
  const folderField = screen.getByTestId("resume-folder");

  await userEvent.clear(folderField);
  await userEvent.type(folderField, path);
}

describe("SetupScreen", () => {
  it("Start button is disabled when no emails are present", async () => {
    const onStart = vi.fn();

    render(<SetupScreen onStart={onStart} />);

    const startBtn = screen.getByTestId("start");

    expect(startBtn).toBeDisabled();
  });

  it("Start button is disabled when password is blank (even with emails)", async () => {
    const onStart = vi.fn();

    render(<SetupScreen onStart={onStart} />);

    await addEmailManually("a@x.com");
    await setResumeFolder("C:\\resumes");
    await setOutputFolder("C:\\out");

    const startBtn = screen.getByTestId("start");

    expect(startBtn).toBeDisabled();
  });

  it("Start button is disabled when output folder is blank (emails + password filled)", async () => {
    const onStart = vi.fn();

    render(<SetupScreen onStart={onStart} />);

    await addEmailManually("a@x.com");
    await fillPassword("pass123");
    await setResumeFolder("C:\\resumes");

    // Leave output folder empty
    const startBtn = screen.getByTestId("start");

    expect(startBtn).toBeDisabled();
  });

  it("Start button is disabled when resume folder is blank", async () => {
    const onStart = vi.fn();

    render(<SetupScreen onStart={onStart} />);

    await addEmailManually("a@x.com");
    await fillPassword("pass123");
    await setOutputFolder("C:\\out");

    // Leave resume folder empty
    const startBtn = screen.getByTestId("start");

    expect(startBtn).toBeDisabled();
  });

  it("turning on manual-login forces headless=false AND disables the headless toggle", async () => {
    const onStart = vi.fn();

    render(<SetupScreen onStart={onStart} />);

    await addEmailManually("a@x.com");
    await fillPassword("pass123");
    await setResumeFolder("C:\\resumes");
    await setOutputFolder("C:\\out");

    const manualLoginToggle = screen.getByRole("checkbox", {
      name: /log in manually/i,
    });

    await userEvent.click(manualLoginToggle);

    const headlessToggle = screen.getByRole("checkbox", {
      name: /run browser visibly/i,
    });

    expect(headlessToggle).toBeDisabled();

    await userEvent.click(screen.getByTestId("start"));

    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false,
        manualLogin: true,
      })
    );
  });

  it("Download Excel template click triggers GET /api/template", async () => {
    server.use(
      http.get(`${BASE}/api/template`, () =>
        new HttpResponse(
          new Uint8Array([0x50, 0x4b]).buffer as ArrayBuffer,
          {
            status: 200,
            headers: {
              "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
          }
        )
      )
    );

    render(<SetupScreen onStart={vi.fn()} />);

    const link = screen.getByRole("button", {
      name: /download excel template/i,
    });

    // downloadTemplate creates a hidden <a>
    // and appends it to the document.
    const appendSpy = vi.spyOn(document.body, "appendChild");

    await userEvent.click(link);

    expect(appendSpy).toHaveBeenCalled();

    appendSpy.mockRestore();
  });

  it("clicking Start with valid inputs emits the correct payload", async () => {
    const onStart = vi.fn();

    render(<SetupScreen onStart={onStart} />);

    await addEmailManually("a@x.com");
    await fillPassword("MyPass1");
    await setResumeFolder("C:\\resumes");
    await setOutputFolder("C:\\runs");

    await userEvent.click(screen.getByTestId("start"));

    expect(onStart).toHaveBeenCalledOnce();

    expect(onStart).toHaveBeenCalledWith({
      accounts: [
        {
          email: "a@x.com",
          name: "A",
        },
      ],
      password: "MyPass1",
      headless: false,
      manualLogin: false,
      outputFolder: "C:\\runs",
      resumeFolderPath: "C:\\resumes",
    });
  });
});
