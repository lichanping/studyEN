(function (globalScope) {
    "use strict";

    var SEAT_COUNT = 9;

    function toIsoString(input) {
        var date = input ? new Date(input) : new Date();
        if (!Number.isFinite(date.getTime())) {
            return new Date().toISOString();
        }
        return date.toISOString();
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function sanitizeText(value, maxLen) {
        return String(value || "").trim().slice(0, maxLen || 64);
    }

    function sanitizeProfile(profile) {
        var input = profile && typeof profile === "object" ? profile : {};
        var gender = sanitizeText(input.gender, 16).toLowerCase();
        return {
            name: sanitizeText(input.name, 24),
            gender: gender === "female" ? "female" : "male",
            avatar: sanitizeText(input.avatar, 2 * 1024 * 1024)
        };
    }

    function sanitizeSeatId(value) {
        var numeric = Number(value);
        if (!Number.isInteger(numeric) || numeric < 0 || numeric >= SEAT_COUNT) return null;
        return numeric;
    }

    function sanitizeRollValue(value) {
        var numeric = Number(value);
        if (!Number.isInteger(numeric) || numeric < 0 || numeric > 9) return null;
        return numeric;
    }

    function createInitialPlayRoomState() {
        return {
            roomId: "fairy-town",
            seats: new Array(SEAT_COUNT).fill(null),
            seatResults: {},
            rollTotals: {},
            messages: [],
            updatedAt: ""
        };
    }

    function appendMessage(room, message) {
        room.messages.push(message);
        if (room.messages.length > 200) {
            room.messages = room.messages.slice(-200);
        }
    }

    function findSeatIdByUserId(room, userId) {
        for (var i = 0; i < room.seats.length; i += 1) {
            if (room.seats[i] && room.seats[i].userId === userId) return i;
        }
        return null;
    }

    function buildMessage(user, content, createdAt, isSystem) {
        return {
            id: createdAt + "__" + Math.random().toString(36).slice(2, 8),
            user: isSystem ? "系统" : sanitizeText(user, 24),
            content: sanitizeText(content, 256),
            isSystem: !!isSystem,
            createdAt: createdAt
        };
    }

    function applyPlayRoomAction(currentRoom, action, nowInput) {
        var room = clone(currentRoom || createInitialPlayRoomState());
        var now = toIsoString(nowInput);
        var input = action && typeof action === "object" ? action : {};
        var type = sanitizeText(input.type, 32);
        var userId = sanitizeText(input.userId, 64);

        if (type === "system-message") {
            appendMessage(room, buildMessage("系统", input.content, now, true));
            room.updatedAt = now;
            return room;
        }

        if (!userId) {
            room.updatedAt = now;
            return room;
        }

        if (type === "sit") {
            var seatId = sanitizeSeatId(input.seatId);
            var profile = sanitizeProfile(input.profile);
            if (seatId === null || !profile.name) {
                room.updatedAt = now;
                return room;
            }
            if (seatId === 0 && profile.name !== "甜歌") {
                room.updatedAt = now;
                return room;
            }
            if (room.seats[seatId] && room.seats[seatId].userId !== userId) {
                room.updatedAt = now;
                return room;
            }

            var previousSeatId = findSeatIdByUserId(room, userId);
            if (previousSeatId !== null) {
                room.seats[previousSeatId] = null;
                delete room.seatResults[previousSeatId];
            }

            room.seats[seatId] = {
                userId: userId,
                profile: profile,
                seatedAt: now
            };
            if (typeof room.rollTotals[userId] !== "number") {
                room.rollTotals[userId] = 0;
            }
            appendMessage(room, buildMessage("系统", profile.name + " 已入座 " + seatId, now, true));
            room.updatedAt = now;
            return room;
        }

        if (type === "leave") {
            var currentSeatId = findSeatIdByUserId(room, userId);
            if (currentSeatId !== null) {
                var currentSeat = room.seats[currentSeatId];
                room.seats[currentSeatId] = null;
                delete room.seatResults[currentSeatId];
                appendMessage(room, buildMessage("系统", currentSeat.profile.name + " 已离座", now, true));
            }
            room.updatedAt = now;
            return room;
        }

        if (type === "roll") {
            var rollSeatId = findSeatIdByUserId(room, userId);
            var rollValue = sanitizeRollValue(input.value);
            if (rollSeatId === null || rollValue === null) {
                room.updatedAt = now;
                return room;
            }
            room.seatResults[rollSeatId] = rollValue;
            room.rollTotals[userId] = (Number(room.rollTotals[userId]) || 0) + rollValue;
            appendMessage(
                room,
                buildMessage(
                    "系统",
                    room.seats[rollSeatId].profile.name + " 麦序机摇到 " + rollValue + "，累计 " + room.rollTotals[userId],
                    now,
                    true
                )
            );
            room.updatedAt = now;
            return room;
        }

        if (type === "clear-roll-total") {
            var clearSeatId = findSeatIdByUserId(room, userId);
            if (clearSeatId !== null) {
                room.rollTotals[userId] = 0;
                delete room.seatResults[clearSeatId];
                appendMessage(room, buildMessage("系统", room.seats[clearSeatId].profile.name + " 已清零", now, true));
            }
            room.updatedAt = now;
            return room;
        }

        if (type === "message") {
            var messageSeatId = findSeatIdByUserId(room, userId);
            var messageContent = sanitizeText(input.content, 256);
            var messageProfile = sanitizeProfile(input.profile);
            var messageUserName = messageSeatId !== null
                ? room.seats[messageSeatId].profile.name
                : messageProfile.name;
            if (messageUserName && messageContent) {
                appendMessage(room, buildMessage(messageUserName, messageContent, now, false));
            }
            room.updatedAt = now;
            return room;
        }

        room.updatedAt = now;
        return room;
    }

    function buildPlayRoomView(roomInput, options) {
        var room = clone(roomInput || createInitialPlayRoomState());
        var joinedAt = options && options.joinedAt ? new Date(options.joinedAt) : null;
        var joinedAtMs = joinedAt && Number.isFinite(joinedAt.getTime()) ? joinedAt.getTime() : null;
        var visibleMessages = room.messages.filter(function (item) {
            if (joinedAtMs === null) return true;
            var createdAtMs = new Date(item.createdAt).getTime();
            return Number.isFinite(createdAtMs) && createdAtMs >= joinedAtMs;
        });

        return {
            roomId: room.roomId,
            seats: room.seats,
            seatResults: room.seatResults,
            rollTotals: room.rollTotals,
            messages: visibleMessages,
            updatedAt: room.updatedAt
        };
    }

    var api = {
        SEAT_COUNT: SEAT_COUNT,
        createInitialPlayRoomState: createInitialPlayRoomState,
        applyPlayRoomAction: applyPlayRoomAction,
        buildPlayRoomView: buildPlayRoomView,
        sanitizeProfile: sanitizeProfile
    };

    globalScope.PlayRoomState = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);