import { ApiError, CLIENT_ERROR } from "./ApiError";
import { api, request } from "./client";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

const respond = (status: number, body: unknown) =>
  fetchMock.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (body === undefined) throw new SyntaxError("Unexpected end of JSON");
      return body;
    },
  });

const caught = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error("expected the request to fail");
};

describe("request", () => {
  it("returns the envelope's data on success", async () => {
    respond(200, { code: 200, status: "Ok", data: { status: "ok", color: "绿" } });
    await expect(api.get("/connectivity")).resolves.toEqual({ status: "ok", color: "绿" });
  });

  it("joins the base URL and path, with or without a leading slash", async () => {
    respond(200, { data: 1 });
    respond(200, { data: 2 });
    await api.get("/a");
    await api.get("b");
    expect(fetchMock.mock.calls[0][0]).toBe("http://api.test/a");
    expect(fetchMock.mock.calls[1][0]).toBe("http://api.test/b");
  });

  it("sends a JSON body with the right headers on POST", async () => {
    respond(201, { data: { id: "aZ3kP9qL" } });
    await api.post("/auth/login", { username: "tan" });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ username: "tan" }));
    expect(init.headers).toMatchObject({ Accept: "application/json", "Content-Type": "application/json" });
  });

  it("sends no body or Content-Type on GET", async () => {
    respond(200, { data: null });
    await api.get("/x");
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBeUndefined();
    expect(init.headers["Content-Type"]).toBeUndefined();
  });

  it("turns a backend 4xx into an ApiError with its code, message and field", async () => {
    respond(400, { code: 400, status: "InvalidRequestException", data: { code: "invalid_request", message: "Username is required", fieldName: "username" } });
    const err = await caught(api.post("/auth/register", {}));
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ httpStatus: 400, code: "invalid_request", message: "Username is required", fieldName: "username" });
  });

  it("keeps the backend's generic 500 message", async () => {
    respond(500, { code: 500, status: "Ko", data: "Failed to load connectivity stats" });
    expect(await caught(api.get("/connectivity"))).toMatchObject({ httpStatus: 500, code: CLIENT_ERROR.server, message: "Failed to load connectivity stats" });
  });

  it("reports a non-JSON error page (e.g. a proxy 502) as a bad response", async () => {
    respond(502, undefined);
    expect(await caught(api.get("/x"))).toMatchObject({ httpStatus: 502, code: CLIENT_ERROR.badResponse });
  });

  it("reports a 200 without an envelope as a bad response", async () => {
    respond(200, "<html>");
    expect(await caught(api.get("/x"))).toMatchObject({ httpStatus: 200, code: CLIENT_ERROR.badResponse });
  });

  it("turns a fetch failure into a network error with status 0", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    const err = await caught(api.get("/x"));
    expect(err).toMatchObject({ httpStatus: 0, code: CLIENT_ERROR.network });
    expect(err.isNetworkError).toBe(true);
  });

  it("times out a request that never answers", async () => {
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) =>
        new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    expect(await caught(request("GET", "/slow", { timeoutMs: 20 }))).toMatchObject({ httpStatus: 0, code: CLIENT_ERROR.timeout });
  });

  it("cancels straight away when the caller's signal is already aborted", async () => {
    const abortErr = new Error("aborted");
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) =>
      init.signal?.aborted ? Promise.reject(abortErr) : Promise.resolve({ ok: true, status: 200, json: async () => ({ data: "sent" }) }),
    );
    const controller = new AbortController();
    controller.abort();
    await expect(request("GET", "/x", { signal: controller.signal })).rejects.toBe(abortErr);
  });

  it("lets a caller's abort through as-is instead of calling it a network error", async () => {
    const abortErr = new Error("aborted");
    fetchMock.mockImplementationOnce(
      (_url: string, init: RequestInit) => new Promise((_, reject) => init.signal?.addEventListener("abort", () => reject(abortErr))),
    );
    const controller = new AbortController();
    const p = request("GET", "/x", { signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toBe(abortErr);
  });
});
