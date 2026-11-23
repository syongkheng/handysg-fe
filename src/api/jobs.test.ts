import { jobsApi } from "./jobs";

const fetchMock = jest.fn();
beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

const respond = (status: number, data: unknown) =>
  fetchMock.mockResolvedValueOnce({ ok: status >= 200 && status < 300, status, json: async () => ({ code: status, status: "x", data }) });
const call = () => {
  const [url, init] = fetchMock.mock.calls[0];
  return { url, method: init.method, body: init.body === undefined ? undefined : JSON.parse(init.body), headers: init.headers };
};

describe("jobsApi", () => {
  it("options: GET /jobs/options with the token", async () => {
    respond(200, { callOutFeeCents: 100 });
    await expect(jobsApi.options("tok")).resolves.toEqual({ callOutFeeCents: 100 });
    expect(call()).toMatchObject({ url: "http://api.test/jobs/options", method: "GET", body: undefined });
    expect(call().headers.Authorization).toBe("Bearer tok");
  });

  it("post: POST /jobs with the input", async () => {
    respond(201, { id: "Jb12abCD" });
    const input = { trade: "PLUMBER" as const, description: "Leaking pipe.", urgency: "SCHEDULED" as const, scheduledDate: "2030-01-08", timeSlot: "MORNING" as const, addressId: "Ad12abCD" };
    await expect(jobsApi.post(input, "tok")).resolves.toEqual({ id: "Jb12abCD" });
    expect(call()).toMatchObject({ url: "http://api.test/jobs", method: "POST", body: input });
  });

  it("list: GET /jobs", async () => {
    respond(200, []);
    await expect(jobsApi.list("tok")).resolves.toEqual([]);
    expect(call()).toMatchObject({ url: "http://api.test/jobs", method: "GET" });
  });

  it("get: GET /jobs/:id, encoding the id", async () => {
    respond(200, { id: "a/b" });
    await jobsApi.get("a/b", "tok");
    expect(call()).toMatchObject({ url: "http://api.test/jobs/a%2Fb", method: "GET" });
  });

  it("update: PATCH /jobs/:id with only the changes", async () => {
    respond(200, { id: "Jb12abCD" });
    await jobsApi.update("Jb12abCD", { description: "New text here." }, "tok");
    expect(call()).toMatchObject({ url: "http://api.test/jobs/Jb12abCD", method: "PATCH", body: { description: "New text here." } });
    expect(call().headers["Content-Type"]).toBe("application/json");
  });

  it("update: a 409 (already accepted) comes back as an ApiError", async () => {
    respond(409, { code: "job_not_open", message: "A technician has already accepted this job." });
    await expect(jobsApi.update("Jb12abCD", { addressId: "x" }, "tok")).rejects.toMatchObject({ httpStatus: 409, code: "job_not_open" });
  });

  it("cancel: POST /jobs/:id/cancel with no body", async () => {
    respond(200, { id: "Jb12abCD", status: "CANCELLED" });
    await jobsApi.cancel("Jb12abCD", "tok");
    expect(call()).toMatchObject({ url: "http://api.test/jobs/Jb12abCD/cancel", method: "POST", body: undefined });
    expect(call().headers["Content-Type"]).toBeUndefined();
  });
});
