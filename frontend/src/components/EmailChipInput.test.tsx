import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailChipInput from "./EmailChipInput";

describe("EmailChipInput", () => {
  it("(a) typing a valid name and email and pressing Enter adds a chip", async () => {
    const onChange = vi.fn();

    render(
      <EmailChipInput
        value={[]}
        onChange={onChange}
      />
    );

    const nameInput = screen.getByTestId("chip-name-input");
    const emailInput = screen.getByTestId("chip-input");

    await userEvent.type(nameInput, "A");
    await userEvent.type(emailInput, "a@x.com{Enter}");

    expect(onChange).toHaveBeenCalledWith([
      {
        name: "A",
        email: "a@x.com",
      },
    ]);
  });

  it("(b) invalid email shows error and does NOT add a chip", async () => {
    const onChange = vi.fn();

    render(
      <EmailChipInput
        value={[]}
        onChange={onChange}
      />
    );

    const nameInput = screen.getByTestId("chip-name-input");
    const emailInput = screen.getByTestId("chip-input");

    await userEvent.type(nameInput, "A");
    await userEvent.type(emailInput, "not-an-email{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("(c) Backspace on empty input removes the last chip", async () => {
    const onChange = vi.fn();

    const accounts = [
      {
        name: "A",
        email: "a@x.com",
      },
      {
        name: "B",
        email: "b@y.com",
      },
    ];

    render(
      <EmailChipInput
        value={accounts}
        onChange={onChange}
      />
    );

    const input = screen.getByTestId("chip-input");

    await userEvent.click(input);
    await userEvent.keyboard("{Backspace}");

    expect(onChange).toHaveBeenCalledWith([
      {
        name: "A",
        email: "a@x.com",
      },
    ]);
  });

  it("(d) duplicate email is rejected silently", async () => {
    const onChange = vi.fn();

    render(
      <EmailChipInput
        value={[
          {
            name: "A",
            email: "a@x.com",
          },
        ]}
        onChange={onChange}
      />
    );

    const nameInput = screen.getByTestId("chip-name-input");
    const emailInput = screen.getByTestId("chip-input");

    await userEvent.type(nameInput, "Another");
    await userEvent.type(emailInput, "a@x.com{Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  it("(e) blank name is rejected", async () => {
    const onChange = vi.fn();

    render(
      <EmailChipInput
        value={[]}
        onChange={onChange}
      />
    );

    const emailInput = screen.getByTestId("chip-input");

    await userEvent.type(emailInput, "a@x.com{Enter}");

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Name is required"
    );
  });
}); 
