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

function testSitAndRollShouldNotMixAcrossUsers() {
    let room = createInitialPlayRoomState();

    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u1",
        profile: { name: "A", gender: "female" },
        seatId: 1
    }, "2026-05-05T09:00:00.000Z");
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u2",
        profile: { name: "B", gender: "male" },
        seatId: 2
    }, "2026-05-05T09:00:01.000Z");

    room = applyPlayRoomAction(room, { type: "roll", userId: "u1", value: 4 }, "2026-05-05T09:00:02.000Z");
    room = applyPlayRoomAction(room, { type: "roll", userId: "u2", value: 6 }, "2026-05-05T09:00:03.000Z");

    assert.strictEqual(room.seats[1] && room.seats[1].userId, "u1");
    assert.strictEqual(room.seats[2] && room.seats[2].userId, "u2");
    assert.strictEqual(room.rollTotals.u1, 4, "u1 total should remain independent");
    assert.strictEqual(room.rollTotals.u2, 6, "u2 total should remain independent");
    assert.strictEqual(room.seatResults[1], 4, "seat 1 result should belong to u1");
    assert.strictEqual(room.seatResults[2], 6, "seat 2 result should belong to u2");
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

function testShouldBlockFurtherRollAfterBustOrWinUntilClear() {
    let bustRoom = createInitialPlayRoomState();
    bustRoom = applyPlayRoomAction(bustRoom, {
        type: "sit",
        userId: "u1",
        profile: { name: "hi", gender: "female" },
        seatId: 2
    }, "2026-05-05T10:00:00.000Z");
    bustRoom = applyPlayRoomAction(bustRoom, { type: "roll", userId: "u1", value: 8 }, "2026-05-05T10:00:01.000Z");
    bustRoom = applyPlayRoomAction(bustRoom, { type: "roll", userId: "u1", value: 8 }, "2026-05-05T10:00:02.000Z");
    bustRoom = applyPlayRoomAction(bustRoom, { type: "roll", userId: "u1", value: 8 }, "2026-05-05T10:00:03.000Z");
    assert.strictEqual(bustRoom.rollTotals.u1, 24);
    assert.strictEqual(bustRoom.bustStatus.u1, "bust");

    const bustMessagesBefore = bustRoom.messages.length;
    bustRoom = applyPlayRoomAction(bustRoom, { type: "roll", userId: "u1", value: 1 }, "2026-05-05T10:00:04.000Z");
    assert.strictEqual(bustRoom.rollTotals.u1, 24, "should keep total unchanged after bust");
    assert.strictEqual(bustRoom.messages.length, bustMessagesBefore, "should not append roll message after bust");

    bustRoom = applyPlayRoomAction(bustRoom, { type: "clear-roll-total", userId: "u1" }, "2026-05-05T10:00:05.000Z");
    assert.strictEqual(bustRoom.rollTotals.u1, 0, "clear should reset total after bust");
    bustRoom = applyPlayRoomAction(bustRoom, { type: "roll", userId: "u1", value: 2 }, "2026-05-05T10:00:06.000Z");
    assert.strictEqual(bustRoom.rollTotals.u1, 2, "roll should work again after clear");

    let winRoom = createInitialPlayRoomState();
    winRoom = applyPlayRoomAction(winRoom, {
        type: "sit",
        userId: "u2",
        profile: { name: "ok", gender: "female" },
        seatId: 3
    }, "2026-05-05T11:00:00.000Z");
    winRoom = applyPlayRoomAction(winRoom, { type: "roll", userId: "u2", value: 7 }, "2026-05-05T11:00:01.000Z");
    winRoom = applyPlayRoomAction(winRoom, { type: "roll", userId: "u2", value: 7 }, "2026-05-05T11:00:02.000Z");
    winRoom = applyPlayRoomAction(winRoom, { type: "roll", userId: "u2", value: 7 }, "2026-05-05T11:00:03.000Z");
    assert.strictEqual(winRoom.rollTotals.u2, 21);
    assert.strictEqual(winRoom.bustStatus.u2, "win");

    const winMessagesBefore = winRoom.messages.length;
    winRoom = applyPlayRoomAction(winRoom, { type: "roll", userId: "u2", value: 1 }, "2026-05-05T11:00:04.000Z");
    assert.strictEqual(winRoom.rollTotals.u2, 21, "should keep total unchanged after win");
    assert.strictEqual(winRoom.messages.length, winMessagesBefore, "should not append roll message after win");
}

function testOnlySweetOwnerCanSetRoomPassword() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "owner",
        profile: { name: "甜歌", gender: "female" },
        seatId: 0
    }, "2026-05-06T10:00:00.000Z");

    room = applyPlayRoomAction(room, {
        type: "set-room-password",
        userId: "owner",
        profile: { name: "甜歌", gender: "female" },
        enabled: true,
        password: "2580"
    }, "2026-05-06T10:00:01.000Z");

    assert.strictEqual(room.roomAccess && room.roomAccess.passwordEnabled, true, "owner should enable password");
    assert.strictEqual(room.roomAccess && room.roomAccess.passwordValue, "2580", "owner should set password");

    const before = JSON.stringify(room.roomAccess || {});
    room = applyPlayRoomAction(room, {
        type: "set-room-password",
        userId: "u2",
        profile: { name: "卡通", gender: "male" },
        enabled: true,
        password: "9999"
    }, "2026-05-06T10:00:02.000Z");
    const after = JSON.stringify(room.roomAccess || {});

    assert.strictEqual(after, before, "non-owner should not change room password");
}

function testPasswordEnabledShouldBlockSitUntilJoinRoomSuccess() {
    let room = createInitialPlayRoomState();
    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "owner",
        profile: { name: "甜歌", gender: "female" },
        seatId: 0
    }, "2026-05-06T10:10:00.000Z");
    room = applyPlayRoomAction(room, {
        type: "set-room-password",
        userId: "owner",
        profile: { name: "甜歌", gender: "female" },
        enabled: true,
        password: "1234"
    }, "2026-05-06T10:10:01.000Z");

    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u2",
        profile: { name: "卡通", gender: "male" },
        seatId: 2
    }, "2026-05-06T10:10:02.000Z");
    assert.strictEqual(room.seats[2], null, "user should be blocked before password verification");

    room = applyPlayRoomAction(room, {
        type: "join-room",
        userId: "u2",
        profile: { name: "卡通", gender: "male" },
        password: "1111"
    }, "2026-05-06T10:10:03.000Z");
    assert.strictEqual(room.roomAccess && room.roomAccess.lastErrorByUserId && room.roomAccess.lastErrorByUserId.u2, "密码错误", "wrong password should set error");

    room = applyPlayRoomAction(room, {
        type: "join-room",
        userId: "u2",
        profile: { name: "卡通", gender: "male" },
        password: "1234"
    }, "2026-05-06T10:10:04.000Z");

    room = applyPlayRoomAction(room, {
        type: "sit",
        userId: "u2",
        profile: { name: "卡通", gender: "male" },
        seatId: 2
    }, "2026-05-06T10:10:05.000Z");

    assert.strictEqual(room.seats[2] && room.seats[2].userId, "u2", "user should be allowed after password verification");
}

function run() {
    testRollShouldAccumulatePerUser();
    testClearShouldResetRollTotal();
    testRollShouldRejectNine();
    testBuildViewShouldFilterMessagesByJoinTime();
    testSitShouldEvictPreviousSeatOfSameUser();
    testSitAndRollShouldNotMixAcrossUsers();
    testClearInactiveSeatsShouldEvictStaleSeatAndRollData();
    testHeartbeatShouldKeepSeatAlive();
    testRollZeroShouldBeTreatedAsTen();
    testBustWhenTotalExceeds21();
    testWinAtExactly21();
    testClearShouldResetBustStatus();
    testShouldBlockFurtherRollAfterBustOrWinUntilClear();
    testOnlySweetOwnerCanSetRoomPassword();
    testPasswordEnabledShouldBlockSitUntilJoinRoomSuccess();
    console.log("test-play-room-state passed");
}

run();