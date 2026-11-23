import { authApi, type SgAddress } from "./auth";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

const respond = (status: number, data: unknown) =>
  fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => ({ code: status, status: "x", data }) });
const call = () => {
  const [url, init] = fetchMock.mock.calls[0];
  return { url, method: init.method, body: init.body === undefined ? undefined : JSON.parse(init.body), headers: init.headers, signal: init.signal };
};

const ADDRESS: SgAddress = { postalCode: "560406", line1: "406 ANG MO KIO AVENUE 10", landed: false, floor: "05", unit: "123" };

describe("authApi: saved addresses", () => {
  it("addAddress: POST /address with the address and label, and the token", async () => {
    respond(201, { id: "AdHome01" });
    await expect(authApi.addAddress(ADDRESS, "tok", "Office")).resolves.toEqual({ id: "AdHome01" });
    expect(call()).toMatchObject({ url: "http://api.test/address", method: "POST", body: { address: ADDRESS, label: "Office" } });
    expect(call().headers.Authorization).toBe("Bearer tok");
  });

  it.each([
    ["no label", undefined],
    ["an empty label", ""],
  ])("addAddress: with %s, sends only the address (the server defaults it to Home)", async (_n, label) => {
    respond(201, { id: "AdHome01" });
    await authApi.addAddress(ADDRESS, "tok", label);
    expect(call().body).toEqual({ address: ADDRESS });
  });

  it("updateAddress: PATCH /address/:id (encoded) with the address and label", async () => {
    respond(200, { id: "a/b" });
    await authApi.updateAddress("a/b", ADDRESS, "Mum’s place", "tok");
    expect(call()).toMatchObject({ url: "http://api.test/address/a%2Fb", method: "PATCH", body: { address: ADDRESS, label: "Mum’s place" } });
    expect(call().headers.Authorization).toBe("Bearer tok");
    expect(call().headers["Content-Type"]).toBe("application/json");
  });

  it("updateAddress: a server error comes back as an ApiError", async () => {
    respond(404, { code: "not_found", message: "Address not found." });
    await expect(authApi.updateAddress("AdHome01", ADDRESS, "Home", "tok")).rejects.toMatchObject({ httpStatus: 404, code: "not_found" });
  });

  it("setDefaultAddress: POST /address/:id/default with no body, returning the new list", async () => {
    const list = [{ id: "AdOffc01", isDefault: true }];
    respond(200, list);
    await expect(authApi.setDefaultAddress("AdOffc01", "tok")).resolves.toEqual(list);
    expect(call()).toMatchObject({ url: "http://api.test/address/AdOffc01/default", method: "POST", body: undefined });
    expect(call().headers["Content-Type"]).toBeUndefined();
    expect(call().headers.Authorization).toBe("Bearer tok");
  });

  it("setDefaultAddress: encodes the id", async () => {
    respond(200, []);
    await authApi.setDefaultAddress("a b", "tok");
    expect(call().url).toBe("http://api.test/address/a%20b/default");
  });

  it("listAddresses: GET /address with the token, passing the abort signal on", async () => {
    respond(200, []);
    const controller = new AbortController();
    await expect(authApi.listAddresses("tok", controller.signal)).resolves.toEqual([]);
    expect(call()).toMatchObject({ url: "http://api.test/address", method: "GET", body: undefined });
    expect(call().headers.Authorization).toBe("Bearer tok");
    expect(call().signal).toBeDefined();
  });

  it("listAddresses: aborting the caller's signal aborts the request in flight", async () => {
    let sent: AbortSignal | undefined;
    fetchMock.mockImplementationOnce((_url: string, init: RequestInit) => {
      sent = init.signal ?? undefined;
      // Like real fetch: settle (reject) on abort, so the client clears its timeout.
      return new Promise((_resolve, reject) => sent?.addEventListener("abort", () => reject(new Error("aborted"))));
    });
    const controller = new AbortController();
    const pending = authApi.listAddresses("tok", controller.signal);
    await Promise.resolve();
    expect(sent?.aborted).toBe(false);
    controller.abort();
    expect(sent?.aborted).toBe(true);
    await expect(pending).rejects.toBeDefined();
  });
});
