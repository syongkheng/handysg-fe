import { ApiError } from "./ApiError";
import { accountApi } from "./account";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

const respond = (status: number, data: unknown) =>
  fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => ({ code: status, status: "x", data }) });

const lastCall = () => {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return { url, method: init.method, body: JSON.parse(init.body), headers: init.headers };
};

describe("accountApi", () => {
  it("requestExport posts the format with the access token and returns the accepted request", async () => {
    respond(202, { requestId: "Rq12abCD", format: "READABLE", sentTo: "t***@gmail.com" });
    await expect(accountApi.requestExport("READABLE", "access-1")).resolves.toEqual({
      requestId: "Rq12abCD",
      format: "READABLE",
      sentTo: "t***@gmail.com",
    });
    const c = lastCall();
    expect(c.url).toBe("http://api.test/account/export");
    expect(c.method).toBe("POST");
    expect(c.body).toEqual({ format: "READABLE" });
    expect(c.headers).toMatchObject({ Authorization: "Bearer access-1" });
  });

  it("startDeletion posts the password with the access token", async () => {
    respond(200, { challengeId: "ch_del1", purpose: "ACCOUNT_DELETE", sentTo: "t***@gmail.com", expiresInSeconds: 600 });
    await expect(accountApi.startDeletion("S3cret!pass", "access-1")).resolves.toMatchObject({ challengeId: "ch_del1" });
    const c = lastCall();
    expect(c.url).toBe("http://api.test/account/delete/start");
    expect(c.body).toEqual({ password: "S3cret!pass" });
    expect(c.headers).toMatchObject({ Authorization: "Bearer access-1" });
  });

  it("confirmDeletion posts the challenge and code with the access token", async () => {
    respond(200, { deleted: true });
    await expect(accountApi.confirmDeletion("ch_del1", "123456", "access-1")).resolves.toEqual({ deleted: true });
    const c = lastCall();
    expect(c.url).toBe("http://api.test/account/delete/confirm");
    expect(c.body).toEqual({ challengeId: "ch_del1", code: "123456" });
    expect(c.headers).toMatchObject({ Authorization: "Bearer access-1" });
  });

  it("sends no Authorization header without a token", async () => {
    respond(401, { code: "unauthorized", message: "Log in first" });
    await expect(accountApi.requestExport("STORED", null)).rejects.toBeInstanceOf(ApiError);
    expect(lastCall().headers.Authorization).toBeUndefined();
  });

  it("surfaces the server's error code (e.g. 429 too_many_requests)", async () => {
    respond(429, { code: "too_many_requests", message: "Slow down" });
    await expect(accountApi.requestExport("STORED", "access-1")).rejects.toMatchObject({ httpStatus: 429, code: "too_many_requests" });
  });
});
