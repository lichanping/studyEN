/**
 * Regression tests for play-room race condition that causes
 * seat messages and roll messages to rollback (disappear/revert)
 * when optimistic updates and polling coexist.
 *
 * Root cause: applyOptimisticAction() sets syncLockUntilMs (~1800ms)
 * but POLL_INTERVAL_MS is 2500ms. After syncLock expires, the next
 * poll can overwrite the server snapshot with stale data if the
 * action response hasn't propagated through Blobs yet.
 *
 * Additionally, fetchRoomSnapshot checks requestMutationVersion but
 * the check happens AFTER the pendingActionCount check, and there's
 * a window where:
 * 1. postRoomAction sets pendingActionCount = 1
 * 2. fetchRoomSnapshot sees pendingActionCount > 0 and bails early
 * 3. postRoomAction completes, pendingActionCount = 0
 * 4. Next poll triggers, fetches stale snapshot
 * 5. Snapshot overwrites optimistic changes
 */
const assert = require("assert");
const {
    createInitialPlayRoomState,
    applyPlayRoomAction,
    buildPlayRoomView
} = require("../play-room-state.js");

// ── Pure state tests (no timing) ──

function testSitMessageShouldPersistInRoomState() {
    let room = createInitialPlayRoomState();
    const joinAt = "2026-06-01T10:00:00.000Z";

    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "测试用户", gender: "male" },
        seatId: 3
    }, "2026-06-01T10:00:01.000Z");

    const view = buildPlayRoomView(room, { joinedAt: joinAt, userId: "u1" });
    const sitMsg = view.messages.find(m => m.isSystem && m.content.includes("已入座"));
    assert.ok(sitMsg, "sit message should exist in view");
    assert.strictEqual(sitMsg.content, "测试用户 已入座 3", "sit message content should match");
}

function testRollMessageShouldPersistInRoomState() {
    let room = createInitialPlayRoomState();
    const joinAt = "2026-06-01T10:00:00.000Z";

    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "测试用户", gender: "male" },
        seatId: 3
    }, "2026-06-01T10:00:01.000Z");

    room = applyPlayRoomAction(room, {
        type: "roll",
        userId: "u1",
        value: 5
    }, "2026-06-01T10:00:02.000Z");

    const view = buildPlayRoomView(room, { joinedAt: joinAt, userId: "u1" });
    const rollMsg = view.messages.find(m => m.isSystem && m.content.includes("麦序机"));
    assert.ok(rollMsg, "roll message should exist in view");
    assert.strictEqual(rollMsg.content, "测试用户 麦序机摇到 5，累计 5", "roll message content should match");
}

function testMultipleRollsShouldShowCumulativeMessages() {
    let room = createInitialPlayRoomState();
    const joinAt = "2026-06-01T10:00:00.000Z";

    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "测试用户", gender: "male" },
        seatId: 3
    }, "2026-06-01T10:00:01.000Z");

    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 1 }, "2026-06-01T10:00:02.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 4 }, "2026-06-01T10:00:03.000Z");

    const view = buildPlayRoomView(room, { joinedAt: joinAt, userId: "u1" });
    const rollMessages = view.messages.filter(m => m.isSystem && m.content.includes("麦序机"));

    assert.strictEqual(rollMessages.length, 2, "should have exactly 2 roll messages");
    assert.strictEqual(rollMessages[0].content, "测试用户 麦序机摇到 1，累计 1");
    assert.strictEqual(rollMessages[1].content, "测试用户 麦序机摇到 4，累计 5");
}

function testClearShouldRemoveBustStatusAndAllowNewRolls() {
    let room = createInitialPlayRoomState();

    // Get to bust state: 8 + 8 + 8 = 24
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "测试用户", gender: "male" },
        seatId: 3
    }, "2026-06-01T10:00:01.000Z");

    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 8 }, "2026-06-01T10:00:02.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 8 }, "2026-06-01T10:00:03.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 8 }, "2026-06-01T10:00:04.000Z");

    assert.strictEqual(room.rollTotals.u1, 24);
    assert.strictEqual(room.bustStatus.u1, "bust");

    const bustMsgCount = room.messages.filter(m => m.content.includes("爆牌")).length;

    // Clear
    room = applyPlayRoomAction(room, { type: "clear-roll-total", userId: "u1" }, "2026-06-01T10:00:05.000Z");
    assert.strictEqual(room.rollTotals.u1, 0);
    assert.ok(!room.bustStatus.u1, "bust status should be cleared");

    // Roll again
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 3 }, "2026-06-01T10:00:06.000Z");
    assert.strictEqual(room.rollTotals.u1, 3);

    const clearMsg = room.messages.find(m => m.content.includes("已清零"));
    assert.ok(clearMsg, "clear message should exist");

    const newRollMsg = room.messages.find(m => m.content.includes("摇到 3"));
    assert.ok(newRollMsg, "new roll message should exist after clear");
}

function testMessageFilteringByJoinTimeShouldWorkCorrectly() {
    let room = createInitialPlayRoomState();

    // Early message (before user joins)
    room = applyPlayRoomAction(room, {
        type: "system-message",
        content: "早期消息"
    }, "2026-06-01T09:00:00.000Z");

    // Sit and roll
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "测试用户", gender: "male" },
        seatId: 3
    }, "2026-06-01T10:00:00.000Z");

    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 5 }, "2026-06-01T10:00:01.000Z");

    // User joins at 10:00:05
    const joinAt = "2026-06-01T10:00:05.000Z";

    // Message after join
    room = applyPlayRoomAction(room, {
        type: "system-message",
        content: "晚期消息"
    }, "2026-06-01T10:00:10.000Z");

    const view = buildPlayRoomView(room, { joinedAt: joinAt, userId: "u1" });

    // Should NOT see early message
    const earlyMsg = view.messages.find(m => m.content === "早期消息");
    assert.ok(!earlyMsg, "messages before joinAt should be filtered out");

    // Sit message createdAt (10:00:00) < joinedAt (10:00:05), so it should be filtered out
    const sitMsg = view.messages.find(m => m.content.includes("已入座"));
    assert.ok(!sitMsg, "sit message before joinedAt should be filtered out");

    // Should see late message
    const lateMsg = view.messages.find(m => m.content === "晚期消息");
    assert.ok(lateMsg, "messages after joinAt should be visible");
}

function testConcurrentSitAndRollShouldNotLoseState() {
    // Simulates: user sits, then immediately rolls - both should persist
    let room = createInitialPlayRoomState();
    const joinAt = "2026-06-01T10:00:00.000Z";

    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "测试用户", gender: "male" },
        seatId: 3
    }, "2026-06-01T10:00:01.000Z");

    // Verify seat is occupied
    const seat3 = room.seats[3];
    assert.ok(seat3, "seat 3 should be occupied");
    assert.strictEqual(seat3.userId, "u1");

    // Roll
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 7 }, "2026-06-01T10:00:02.000Z");

    // Verify seat is still occupied
    const seat3After = room.seats[3];
    assert.ok(seat3After, "seat 3 should still be occupied after roll");
    assert.strictEqual(seat3After.userId, "u1");

    // Verify result
    assert.strictEqual(room.seatResults[3], 7);
    assert.strictEqual(room.rollTotals.u1, 7);

    const view = buildPlayRoomView(room, { joinedAt: joinAt, userId: "u1" });
    assert.ok(view.seats[3], "seat 3 should show as occupied in view");
    assert.strictEqual(view.rollTotals.u1, 7);
}

function testMultipleUsersSitShouldNotInterfere() {
    let room = createInitialPlayRoomState();
    const joinAt = "2026-06-01T10:00:00.000Z";

    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "用户A", gender: "male" },
        seatId: 1
    }, "2026-06-01T10:00:01.000Z");

    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u2",
        profile: { name: "用户B", gender: "female" },
        seatId: 2
    }, "2026-06-01T10:00:02.000Z");

    // Both should be visible
    assert.strictEqual(room.seats[1].userId, "u1");
    assert.strictEqual(room.seats[2].userId, "u2");

    // Each rolls independently
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 3 }, "2026-06-01T10:00:03.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u2", value: 5 }, "2026-06-01T10:00:04.000Z");

    assert.strictEqual(room.rollTotals.u1, 3);
    assert.strictEqual(room.rollTotals.u2, 5);
    assert.strictEqual(room.seatResults[1], 3);
    assert.strictEqual(room.seatResults[2], 5);

    // Views should both see each other's seats
    const viewA = buildPlayRoomView(room, { joinedAt: joinAt, userId: "u1" });
    const viewB = buildPlayRoomView(room, { joinedAt: joinAt, userId: "u2" });

    assert.ok(viewA.seats[2], "user A should see user B's seat");
    assert.ok(viewB.seats[1], "user B should see user A's seat");
}

// ── Run all tests ──
function run() {
    testSitMessageShouldPersistInRoomState();
    console.log("✓ testSitMessageShouldPersistInRoomState");

    testRollMessageShouldPersistInRoomState();
    console.log("✓ testRollMessageShouldPersistInRoomState");

    testMultipleRollsShouldShowCumulativeMessages();
    console.log("✓ testMultipleRollsShouldShowCumulativeMessages");

    testClearShouldRemoveBustStatusAndAllowNewRolls();
    console.log("✓ testClearShouldRemoveBustStatusAndAllowNewRolls");

    testMessageFilteringByJoinTimeShouldWorkCorrectly();
    console.log("✓ testMessageFilteringByJoinTimeShouldWorkCorrectly");

    testConcurrentSitAndRollShouldNotLoseState();
    console.log("✓ testConcurrentSitAndRollShouldNotLoseState");

    testMultipleUsersSitShouldNotInterfere();
    console.log("✓ testMultipleUsersSitShouldNotInterfere");

    console.log("\ntest-play-room-race-condition passed");
}

run();