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

function run() {
    testRollShouldAccumulatePerUser();
    testClearShouldResetRollTotal();
    testRollShouldRejectNine();
    testBuildViewShouldFilterMessagesByJoinTime();
    testSitShouldEvictPreviousSeatOfSameUser();
    testClearInactiveSeatsShouldEvictStaleSeatAndRollData();
    testHeartbeatShouldKeepSeatAlive();
    console.log("test-play-room-state passed");
}

run();