const assert = require("assert");
const {
    createInitialPlayRoomState,
    applyPlayRoomAction,
    buildPlayRoomView,
    clearInactiveSeats
} = require("../play-room-state.js");

function testRollShouldAccumulatePerUser() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 2
    }, "2026-05-05T10:00:00.000Z");

    room = applyPlayRoomAction(room, {
        type: "roll",
        userId: "u1",
        value: 1
    }, "2026-05-05T10:00:01.000Z");

    room = applyPlayRoomAction(room, {
        type: "roll",
        userId: "u1",
        value: 4
    }, "2026-05-05T10:00:02.000Z");

    assert.strictEqual(room.rollTotals.u1, 5);
    assert.strictEqual(room.seatResults[2], 4);
    assert.strictEqual(room.messages[2].content, "hi 麦序机摇到 4，累计 5");
}

function testClearShouldResetRollTotal() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 2
    }, "2026-05-05T10:00:00.000Z");
    room = applyPlayRoomAction(room, {
        type: "roll",
        userId: "u1",
        value: 3
    }, "2026-05-05T10:00:01.000Z");
    room = applyPlayRoomAction(room, {
        type: "clear-roll-total",
        userId: "u1"
    }, "2026-05-05T10:00:02.000Z");

    assert.strictEqual(room.rollTotals.u1, 0);
    assert.strictEqual(room.messages[2].content, "hi 已清零");
}

function testRollShouldRejectNine() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 2
    }, "2026-05-05T10:00:00.000Z");

    room = applyPlayRoomAction(room, {
        type: "roll",
        userId: "u1",
        value: 9
    }, "2026-05-05T10:00:01.000Z");

    assert.strictEqual(room.seatResults[2], undefined);
    assert.strictEqual(room.rollTotals.u1, 0);
    assert.strictEqual(room.messages.length, 1);
}

function testBuildViewShouldFilterMessagesByJoinTime() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "system-message",
        content: "进入前消息"
    }, "2026-05-05T10:00:00.000Z");
    room = applyPlayRoomAction(room, {
        type: "system-message",
        content: "进入后消息"
    }, "2026-05-05T10:00:10.000Z");

    const view = buildPlayRoomView(room, {
        joinedAt: "2026-05-05T10:00:05.000Z"
    });

    assert.deepStrictEqual(view.messages.map((item) => item.content), ["进入后消息"]);
}

function testSitShouldEvictPreviousSeatOfSameUser() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 2
    }, "2026-05-05T10:00:00.000Z");
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 5
    }, "2026-05-05T10:00:01.000Z");

    assert.strictEqual(room.seats[2], null);
    assert.strictEqual(room.seats[5].userId, "u1");
}

function testClearInactiveSeatsShouldEvictStaleSeatAndRollData() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 2
    }, "2026-05-05T10:00:00.000Z");
    room = applyPlayRoomAction(room, {
        type: "roll",
        userId: "u1",
        value: 4
    }, "2026-05-05T10:00:05.000Z");

    room = clearInactiveSeats(room, {
        now: "2026-05-05T10:02:00.000Z",
        ttlMs: 30 * 1000
    });

    assert.strictEqual(room.seats[2], null);
    assert.strictEqual(room.seatResults[2], undefined);
    assert.strictEqual(room.rollTotals.u1, undefined);
}

function testHeartbeatShouldKeepSeatAlive() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 2
    }, "2026-05-05T10:00:00.000Z");
    room = applyPlayRoomAction(room, {
        type: "heartbeat",
        userId: "u1"
    }, "2026-05-05T10:00:20.000Z");

    room = clearInactiveSeats(room, {
        now: "2026-05-05T10:00:35.000Z",
        ttlMs: 30 * 1000
    });

    assert.strictEqual(room.seats[2] && room.seats[2].userId, "u1");
}

function testRollZeroShouldBeTreatedAsTen() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 2
    }, "2026-05-05T10:00:00.000Z");

    room = applyPlayRoomAction(room, {
        type: "roll",
        userId: "u1",
        value: 0
    }, "2026-05-05T10:00:01.000Z");

    assert.strictEqual(room.rollTotals.u1, 10, "roll 0 should accumulate as 10");
    assert.ok(room.messages[1].content.includes("摇到 10"), "message should display 10 for roll 0");
    assert.ok(room.messages[1].content.includes("累计 10"), "message should show total 10");
}

function testBustWhenTotalExceeds21() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 2
    }, "2026-05-05T10:00:00.000Z");

    // 8 + 8 + 8 = 24 > 21
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 8 }, "2026-05-05T10:00:01.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 8 }, "2026-05-05T10:00:02.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 8 }, "2026-05-05T10:00:03.000Z");

    assert.strictEqual(room.rollTotals.u1, 24, "total should be 24");
    assert.strictEqual(room.bustStatus.u1, "bust", "bust status should be set");
    const bustMsg = room.messages.find((m) => m.content.includes("爆牌"));
    assert.ok(bustMsg, "bust system message should exist");
}

function testWinAtExactly21() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 2
    }, "2026-05-05T10:00:00.000Z");

    // 7 + 7 + 7 = 21
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 7 }, "2026-05-05T10:00:01.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 7 }, "2026-05-05T10:00:02.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 7 }, "2026-05-05T10:00:03.000Z");

    assert.strictEqual(room.rollTotals.u1, 21, "total should be 21");
    assert.strictEqual(room.bustStatus.u1, "win", "win status should be set");
    const winMsg = room.messages.find((m) => m.content.includes("21点"));
    assert.ok(winMsg, "win system message should exist");
}

function testClearShouldResetBustStatus() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 2
    }, "2026-05-05T10:00:00.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 8 }, "2026-05-05T10:00:01.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 8 }, "2026-05-05T10:00:02.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 8 }, "2026-05-05T10:00:03.000Z");
    assert.strictEqual(room.bustStatus.u1, "bust");

    room = applyPlayRoomAction(room, { type: "clear-roll-total", userId: "u1" }, "2026-05-05T10:00:04.000Z");
    assert.ok(!room.bustStatus.u1, "bust status should be cleared after clear-roll-total");
}

function run() {
    testRollShouldAccumulatePerUser();
    testClearShouldResetRollTotal();
    testRollShouldRejectNine();
    testBuildViewShouldFilterMessagesByJoinTime();
    testSitShouldEvictPreviousSeatOfSameUser();
    testClearInactiveSeatsShouldEvictStaleSeatAndRollData();
    testHeartbeatShouldKeepSeatAlive();
    testRollZeroShouldBeTreatedAsTen();
    testBustWhenTotalExceeds21();
    testWinAtExactly21();
    testClearShouldResetBustStatus();
    console.log("test-play-room-state passed");
}

run();