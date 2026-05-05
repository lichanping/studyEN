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
        if (!Number.isInteger(numeric) || numeric < 0 || numeric > 8) return null;
        return numeric;
    }

    function sanitizePassword(value) {
        return sanitizeText(value, 16);
    }

    function effectiveRollValue(rawValue) {
        return rawValue === 0 ? 10 : rawValue;
    }

    function toTimeMs(value) {
        var ts = new Date(value).getTime();
        return Number.isFinite(ts) ? ts : null;
    }

    function clearSeatByUserId(room, userId) {
        var seatId = findSeatIdByUserId(room, userId);
        if (seatId === null) return;
        room.seats[seatId] = null;
        delete room.seatResults[seatId];
        delete room.rollTotals[userId];
        if (room.bustStatus) delete room.bustStatus[userId];
    }

    function ensureRoomAccess(room) {
        if (!room.roomAccess || typeof room.roomAccess !== "object") {
            room.roomAccess = {};
        }
        if (typeof room.roomAccess.passwordEnabled !== "boolean") {
            room.roomAccess.passwordEnabled = false;
        }
        if (typeof room.roomAccess.passwordValue !== "string") {
            room.roomAccess.passwordValue = "";
        }
        if (!room.roomAccess.allowedUserIds || typeof room.roomAccess.allowedUserIds !== "object") {
            room.roomAccess.allowedUserIds = {};
        }
        if (!room.roomAccess.lastErrorByUserId || typeof room.roomAccess.lastErrorByUserId !== "object") {
            room.roomAccess.lastErrorByUserId = {};
        }
    }

    function hasRoomAccess(room, userId) {
        ensureRoomAccess(room);
        if (!room.roomAccess.passwordEnabled) return true;
        return !!room.roomAccess.allowedUserIds[userId];
    }

    function isSweetOwner(room, userId) {
        var bossSeat = room.seats && room.seats[0];
        return !!(bossSeat && bossSeat.userId === userId && bossSeat.profile && bossSeat.profile.name === "甜歌");
    }

    function createInitialPlayRoomState() {
        return {
            roomId: "fairy-town",
            seats: new Array(SEAT_COUNT).fill(null),
            seatResults: {},
            rollTotals: {},
            bustStatus: {},
            roomAccess: {
                passwordEnabled: false,
                passwordValue: "",
                allowedUserIds: {},
                lastErrorByUserId: {}
            },
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
        ensureRoomAccess(room);
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

        if (type === "set-room-password") {
            if (!isSweetOwner(room, userId)) {
                room.updatedAt = now;
                return room;
            }
            var enabled = !!input.enabled;
            if (!enabled) {
                room.roomAccess.passwordEnabled = false;
                room.roomAccess.passwordValue = "";
                room.roomAccess.allowedUserIds = {};
                room.roomAccess.lastErrorByUserId = {};
                appendMessage(room, buildMessage("系统", "房间密码已关闭", now, true));
                room.updatedAt = now;
                return room;
            }

            var password = sanitizePassword(input.password);
            if (!password) {
                room.updatedAt = now;
                return room;
            }

            room.roomAccess.passwordEnabled = true;
            room.roomAccess.passwordValue = password;
            room.roomAccess.allowedUserIds = {};
            room.roomAccess.allowedUserIds[userId] = true;
            room.roomAccess.lastErrorByUserId = {};
            appendMessage(room, buildMessage("系统", "房间密码已开启", now, true));
            room.updatedAt = now;
            return room;
        }

        if (type === "join-room") {
            if (!room.roomAccess.passwordEnabled) {
                room.roomAccess.allowedUserIds[userId] = true;
                delete room.roomAccess.lastErrorByUserId[userId];
                room.updatedAt = now;
                return room;
            }

            var joinedPassword = sanitizePassword(input.password);
            if (joinedPassword && joinedPassword === room.roomAccess.passwordValue) {
                room.roomAccess.allowedUserIds[userId] = true;
                delete room.roomAccess.lastErrorByUserId[userId];
            } else {
                room.roomAccess.lastErrorByUserId[userId] = "密码错误";
            }
            room.updatedAt = now;
            return room;
        }

        var requiresAccess = type === "sit"
            || type === "roll"
            || type === "clear-roll-total"
            || type === "message"
            || type === "heartbeat";
        if (requiresAccess && !hasRoomAccess(room, userId)) {
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
                seatedAt: now,
                lastSeenAt: now
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
            var effectiveValue = effectiveRollValue(rollValue);
            room.seatResults[rollSeatId] = effectiveValue;
            room.rollTotals[userId] = (Number(room.rollTotals[userId]) || 0) + effectiveValue;
            room.seats[rollSeatId].lastSeenAt = now;
            var rollName = room.seats[rollSeatId].profile.name;
            var rollTotal = room.rollTotals[userId];
            appendMessage(
                room,
                buildMessage(
                    "系统",
                    rollName + " 麦序机摇到 " + effectiveValue + "，累计 " + rollTotal,
                    now,
                    true
                )
            );
            if (rollTotal > 21) {
                if (!room.bustStatus) room.bustStatus = {};
                room.bustStatus[userId] = "bust";
                appendMessage(room, buildMessage("系统", rollName + " 爆牌了！累计 " + rollTotal + "，超过21点 💥", now, true));
            } else if (rollTotal === 21) {
                if (!room.bustStatus) room.bustStatus = {};
                room.bustStatus[userId] = "win";
                appendMessage(room, buildMessage("系统", rollName + " 恭喜！正好21点，最高分！🎉", now, true));
            } else {
                if (room.bustStatus) delete room.bustStatus[userId];
            }
            room.updatedAt = now;
            return room;
        }

        if (type === "clear-roll-total") {
            var clearSeatId = findSeatIdByUserId(room, userId);
            if (clearSeatId !== null) {
                room.rollTotals[userId] = 0;
                delete room.seatResults[clearSeatId];
                if (room.bustStatus) delete room.bustStatus[userId];
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
            if (messageSeatId !== null) {
                room.seats[messageSeatId].lastSeenAt = now;
            }
            room.updatedAt = now;
            return room;
        }

        if (type === "heartbeat") {
            var heartbeatSeatId = findSeatIdByUserId(room, userId);
            if (heartbeatSeatId !== null) {
                room.seats[heartbeatSeatId].lastSeenAt = now;
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
            bustStatus: room.bustStatus || {},
            roomAccess: {
                passwordEnabled: !!(room.roomAccess && room.roomAccess.passwordEnabled),
                accessGranted: !!(sanitizeText(options && options.userId, 64) && hasRoomAccess(room, sanitizeText(options && options.userId, 64))),
                authError: sanitizeText(
                    room.roomAccess
                    && room.roomAccess.lastErrorByUserId
                    && room.roomAccess.lastErrorByUserId[sanitizeText(options && options.userId, 64)],
                    64
                )
            },
            messages: visibleMessages,
            updatedAt: room.updatedAt
        };
    }

    function clearInactiveSeats(roomInput, options) {
        var room = clone(roomInput || createInitialPlayRoomState());
        var nowMs = toTimeMs(options && options.now ? options.now : new Date().toISOString());
        var ttlMs = Number(options && options.ttlMs);
        var timeoutMs = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 30 * 1000;
        if (nowMs === null) return room;

        for (var i = 0; i < room.seats.length; i += 1) {
            var seat = room.seats[i];
            if (!seat || !seat.userId) continue;
            var lastSeenMs = toTimeMs(seat.lastSeenAt || seat.seatedAt);
            if (lastSeenMs === null) {
                clearSeatByUserId(room, seat.userId);
                continue;
            }
            if (nowMs - lastSeenMs > timeoutMs) {
                clearSeatByUserId(room, seat.userId);
            }
        }

        return room;
    }

    var api = {
        SEAT_COUNT: SEAT_COUNT,
        createInitialPlayRoomState: createInitialPlayRoomState,
        applyPlayRoomAction: applyPlayRoomAction,
        buildPlayRoomView: buildPlayRoomView,
        clearInactiveSeats: clearInactiveSeats,
        sanitizeProfile: sanitizeProfile
    };

    globalScope.PlayRoomState = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);