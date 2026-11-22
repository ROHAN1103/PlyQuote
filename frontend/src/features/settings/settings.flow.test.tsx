import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetCsrfToken } from "@/lib/api";
import { apiError, installBackend, jsonResponse, renderApp, type Handler } from "@/test/utils";
import type { Company } from "./types";

const fetchMock = vi.fn();

const company = (over: Partial<Company> = {}): Company => ({
  id: "c1", name: "Acme Interiors", address: "12 Mount Road", phone: "+91 98765 43210", email: "hello@acme.in",
  gstin: "33ABCDE1234F1Z5", has_logo: false, logo_version: null,
  defaults: {
    currency: "INR", gst: { enabled: true, rate: "0.1800", prices_include_tax: false }, quotation_validity_days: 30,
    payment_terms: "50% advance", terms_and_conditions: "", document_footer: "", signature: { name: "", designation: "" },
    show_material_breakdown_to_customer: false,
  }, ...over,
});
const get = (c: Company): Handler => (r) => (r.method === "GET" && r.path === "/settings/company" ? jsonResponse(200, c) : undefined);

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  resetCsrfToken();
});

describe("Settings page", () => {
  it("loads company details and shows the GST rate as a percentage", async () => {
    installBackend(fetchMock, get(company()));
    renderApp("/settings");
    expect(await screen.findByDisplayValue("Acme Interiors")).toBeInTheDocument();
    expect(screen.getByLabelText(/GST rate/)).toHaveValue("18");
    expect(screen.getByLabelText("Charge GST on quotations")).toBeChecked();
    expect(screen.getByLabelText(/Valid for/)).toHaveValue("30");
  });

  it("keeps Save disabled until something changes", async () => {
    installBackend(fetchMock, get(company()));
    renderApp("/settings");
    const save = await screen.findByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Document footer", { exact: false }), "Thank you");
    expect(save).toBeEnabled();
  });

  it("saves, converting the percentage back to an exact fraction string", async () => {
    const calls = installBackend(fetchMock, get(company()), (r) =>
      r.method === "PUT" && r.path === "/settings/company" ? jsonResponse(200, company({ name: "Acme Studio" })) : undefined);
    renderApp("/settings");
    const name = await screen.findByDisplayValue("Acme Interiors");
    await userEvent.clear(name);
    await userEvent.type(name, "Acme Studio");
    const rate = screen.getByLabelText(/GST rate/);
    await userEvent.clear(rate);
    await userEvent.type(rate, "5.5");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    const body = calls.find((c) => c.method === "PUT")!.body;
    expect(body.name).toBe("Acme Studio");
    expect(body.defaults.gst).toEqual({ enabled: true, rate: "0.055", prices_include_tax: false });
    expect(body.defaults.quotation_validity_days).toBe(30);
    expect(body.email).toBe("hello@acme.in");
  });

  it("will not save with GST on but no rate", async () => {
    const calls = installBackend(fetchMock, get(company()));
    renderApp("/settings");
    await userEvent.clear(await screen.findByLabelText(/GST rate/));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Enter the GST rate as a percentage, e.g. 18.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
  });

  it("hides the rate fields when GST is off, and saves a null rate if none was entered", async () => {
    const off = company({ defaults: { ...company().defaults, gst: { enabled: false, rate: null, prices_include_tax: false } } });
    const calls = installBackend(fetchMock, get(off), (r) => (r.method === "PUT" ? jsonResponse(200, off) : undefined));
    renderApp("/settings");
    await screen.findByDisplayValue("Acme Interiors");
    expect(screen.queryByLabelText(/GST rate/)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Phone", { exact: false }), "1");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(calls.some((c) => c.method === "PUT")).toBe(true));
    expect(calls.find((c) => c.method === "PUT")!.body.defaults.gst).toEqual({ enabled: false, rate: null, prices_include_tax: false });
  });

  it("validates GSTIN, email and validity days", async () => {
    const calls = installBackend(fetchMock, get(company()));
    renderApp("/settings");
    const gstin = await screen.findByLabelText(/GSTIN/);
    await userEvent.clear(gstin);
    await userEvent.type(gstin, "BADGSTIN");
    const email = screen.getByLabelText(/Email/);
    await userEvent.clear(email);
    await userEvent.type(email, "nope");
    const days = screen.getByLabelText(/Valid for/);
    await userEvent.clear(days);
    await userEvent.type(days, "999");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/valid 15-character GSTIN/)).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter between 1 and 365 days.")).toBeInTheDocument();
    expect(calls.some((c) => c.method === "PUT")).toBe(false);
  });

  it("shows a server rejection at the top of the form", async () => {
    installBackend(fetchMock, get(company()), (r) =>
      r.method === "PUT" ? apiError(422, "validation_error", "Some fields are invalid.", [{ field: "defaults.gst", message: "Enter a GST rate, or turn GST off." }]) : undefined);
    renderApp("/settings");
    await userEvent.type(await screen.findByLabelText(/Document footer/), "x");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter a GST rate, or turn GST off.");
  });
});

describe("Logo", () => {
  it("uploads a chosen image as multipart form data and shows it", async () => {
    let current = company();
    const calls = installBackend(fetchMock, (r) => (r.method === "GET" && r.path === "/settings/company" ? jsonResponse(200, current) : undefined),
      (r) => {
        if (r.method === "POST" && r.path === "/settings/company/logo") {
          current = company({ has_logo: true, logo_version: "123" });
          return jsonResponse(200, current);
        }
      });
    renderApp("/settings");
    await screen.findByText("No logo yet");
    const file = new File([new Uint8Array([1, 2, 3])], "logo.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Logo file"), file);
    await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.path === "/settings/company/logo")).toBe(true));
    const post = calls.find((c) => c.path === "/settings/company/logo")!;
    expect(post.body).toBeInstanceOf(FormData);
    expect((post.body as FormData).get("file")).toBeInstanceOf(File);
    const img = await screen.findByAltText("Acme Interiors logo");
    expect(img).toHaveAttribute("src", "/api/v1/settings/company/logo?v=123");
  });

  it("rejects the wrong file type and oversized files before uploading", async () => {
    const calls = installBackend(fetchMock, get(company()));
    renderApp("/settings");
    await screen.findByText("No logo yet");
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(screen.getByLabelText("Logo file"), new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" }));
    expect(await screen.findByText("Choose a PNG, JPEG or WebP image.")).toBeInTheDocument();
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("Logo file"), big);
    expect(await screen.findByText(/over 2 MB/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });

  it("shows the server's reason when an upload is refused", async () => {
    installBackend(fetchMock, get(company()), (r) =>
      r.method === "POST" ? apiError(422, "invalid_image", "That file isn't a valid image.") : undefined);
    renderApp("/settings");
    await screen.findByText("No logo yet");
    await userEvent.upload(screen.getByLabelText("Logo file"), new File(["x"], "a.png", { type: "image/png" }));
    expect(await screen.findByText("That file isn't a valid image.")).toBeInTheDocument();
  });

  it("removes the logo after confirmation", async () => {
    const calls = installBackend(fetchMock, get(company({ has_logo: true, logo_version: "1" })), (r) =>
      r.method === "DELETE" ? jsonResponse(200, company()) : undefined);
    renderApp("/settings");
    await userEvent.click(await screen.findByRole("button", { name: /remove/i }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(await screen.findByRole("button", { name: "Remove", hidden: false }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.path === "/settings/company/logo")).toBe(true));
  });
});
