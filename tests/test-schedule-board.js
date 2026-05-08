const assert = require("assert");
const path = require("path");
const { pathToFileURL } = require("url");

async function loadHandler() {
    const fileUrl = pathToFileURL(path.resolve(__dirname, "../netlify/functions/schedule-board.mjs")).href;
    const mod = await import(fileUrl);
    return mod.default;
}

async function testCompletedModeShouldForwardPageParams() {
    const handler = await loadHandler();
    const originalFetch = global.fetch;

    let calledUrl = "";
    global.fetch = async (url) => {
        calledUrl = String(url);
        return new Response(JSON.stringify({ data: { data: [], total: 0, pageSize: 50 } }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    };

    const req = {
        method: "POST",
        url: "https://example.test/.netlify/functions/schedule-board?mode=completed&pageNumber=3&pageSize=100",
        json: async () => ({ token: "test-token", userId: "u1" })
    };

    await handler(req);

    assert.strictEqual(
        calledUrl,
        "https://apiv2.lxll.com/customer/training/orders?pageNumber=3&pageSize=100&status=COMPLETED",
        "mode=completed should forward pageNumber/pageSize from query"
    );

    global.fetch = originalFetch;
}

async function testCompletedModeShouldFallbackToDefaultPageParams() {
    const handler = await loadHandler();
    const originalFetch = global.fetch;

    let calledUrl = "";
    global.fetch = async (url) => {
        calledUrl = String(url);
        return new Response(JSON.stringify({ data: { data: [], total: 0, pageSize: 50 } }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    };

    const req = {
        method: "POST",
        url: "https://example.test/.netlify/functions/schedule-board?mode=completed&pageNumber=0&pageSize=-1",
        json: async () => ({ token: "test-token", userId: "u1" })
    };

    await handler(req);

    assert.strictEqual(
        calledUrl,
        "https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=50&status=COMPLETED",
        "invalid page params should fallback to default values"
    );

    global.fetch = originalFetch;
}

async function testAntiForgettingListShouldUseTeacherRecordEndpoint() {
    const handler = await loadHandler();
    const originalFetch = global.fetch;

    let calledUrl = "";
    global.fetch = async (url) => {
        calledUrl = String(url);

        return new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    };

    const req = {
        method: "POST",
        url: "https://example.test/.netlify/functions/schedule-board",
        json: async () => ({
            token: "test-token",
            userId: "u1",
            mode: "anti-forgetting-list",
            studentName: "陈怡睿",
            startDate: "2026-05-08",
            endDate: "2026-06-07"
        })
    };

    const resp = await handler(req);
    const body = await resp.json();

    assert.strictEqual(resp.status, 200, "api2 request should succeed via teacher record endpoint");
    assert.strictEqual(
        calledUrl,
        "https://apiv2.lxll.com/customer/anti-forget/record/teacher",
        "api2 should use production anti-forget teacher record endpoint"
    );
    assert.deepStrictEqual(body, { data: [] });

    global.fetch = originalFetch;
}

async function run() {
    await testCompletedModeShouldForwardPageParams();
    await testCompletedModeShouldFallbackToDefaultPageParams();
    await testAntiForgettingListShouldUseTeacherRecordEndpoint();
    console.log("test-schedule-board passed");
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
