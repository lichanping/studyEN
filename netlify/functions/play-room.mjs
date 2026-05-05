import { getStore } from "@netlify/blobs";
import playRoomStateApi from "../../play-room-state.js";

const {
    createInitialPlayRoomState,
    applyPlayRoomAction,
    buildPlayRoomView,
    clearInactiveSeats
} = playRoomStateApi;

const PRESENCE_TTL_MS = 30 * 1000;

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
    };
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...corsHeaders()
        }
    });
}

function sanitizeRoomId(value) {
    const text = String(value || "fairy-town").trim();
    if (!text || text.length > 64) return null;
    if (!/^[\w-]+$/.test(text)) return null;
    return text;
}

async function loadRoom(store, roomId) {
    const room = await store.get(`rooms/${roomId}/current`, { type: "json" });
    return room || createInitialPlayRoomState();
}

export default async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("", { status: 204, headers: corsHeaders() });
    }

    let store;
    try {
        store = getStore("play-room");
    } catch (error) {
        console.error("play-room store init failed:", error);
        return jsonResponse({ error: "Storage unavailable" }, 500);
    }

    if (req.method === "GET") {
        const url = new URL(req.url);
        const roomId = sanitizeRoomId(url.searchParams.get("roomId") || "fairy-town");
        const joinedAt = url.searchParams.get("joinedAt") || "";
        if (!roomId) {
            return jsonResponse({ error: "Invalid roomId" }, 400);
        }

        try {
            const rawRoom = await loadRoom(store, roomId);
            const room = clearInactiveSeats(rawRoom, {
                now: new Date().toISOString(),
                ttlMs: PRESENCE_TTL_MS
            });
            if (JSON.stringify(room) !== JSON.stringify(rawRoom)) {
                await store.setJSON(`rooms/${roomId}/current`, room);
            }
            return jsonResponse({
                success: true,
                snapshot: buildPlayRoomView(room, { joinedAt })
            });
        } catch (error) {
            console.error("play-room get failed:", error);
            return jsonResponse({ error: "Failed to load room" }, 500);
        }
    }

    if (req.method === "POST") {
        let body;
        try {
            body = await req.json();
        } catch (_) {
            return jsonResponse({ error: "Invalid JSON body" }, 400);
        }

        const roomId = sanitizeRoomId(body?.roomId || "fairy-town");
        const action = body?.action;
        const joinedAt = body?.joinedAt || "";
        if (!roomId) {
            return jsonResponse({ error: "Invalid roomId" }, 400);
        }
        if (!action || typeof action !== "object") {
            return jsonResponse({ error: "Missing action object" }, 400);
        }

        try {
            const nowIso = new Date().toISOString();
            const currentRoom = clearInactiveSeats(await loadRoom(store, roomId), {
                now: nowIso,
                ttlMs: PRESENCE_TTL_MS
            });
            const nextRoom = clearInactiveSeats(applyPlayRoomAction(currentRoom, action, nowIso), {
                now: nowIso,
                ttlMs: PRESENCE_TTL_MS
            });
            await store.setJSON(`rooms/${roomId}/current`, nextRoom);
            return jsonResponse({
                success: true,
                snapshot: buildPlayRoomView(nextRoom, { joinedAt })
            });
        } catch (error) {
            console.error("play-room post failed:", error);
            return jsonResponse({ error: "Failed to update room" }, 500);
        }
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
};