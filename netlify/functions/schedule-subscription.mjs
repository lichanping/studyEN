import { getStore } from "@netlify/blobs";
import { runSubscriptionChecks } from "./schedule-subscription-checker-shared.mjs";

export const ACTIVE_SUBSCRIPTIONS_KEY = "active-subscriptions";
export const SUBSCRIPTION_STORE_NAME = "schedule-subscriptions";
const SUBSCRIPTION_CHECK_INTERVAL_MINUTES = 60;

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function sanitizeText(value, maxLen = 256) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.slice(0, maxLen);
}

function normalizeDurationMinutes(value) {
    const minutes = Number.parseInt(String(value || "").trim(), 10);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

function addMinutes(isoString, minutes) {
    const baseDate = new Date(isoString);
    return new Date(baseDate.getTime() + minutes * 60 * 1000).toISOString();
}

export function buildSubscriptionId(payload) {
    const student = sanitizeText(payload?.student, 64);
    const date = sanitizeText(payload?.date, 32);
    const durationMinutes = normalizeDurationMinutes(payload?.durationMinutes);
    if (!student || !date || !durationMinutes) return "";
    return `${student}__${date}__${durationMinutes}`;
}

export async function readSubscriptions(store) {
    const rows = await store.get(ACTIVE_SUBSCRIPTIONS_KEY, { type: "json" });
    return Array.isArray(rows) ? rows : [];
}

export async function writeSubscriptions(store, records) {
    const safeRecords = Array.isArray(records) ? records : [];
    await store.setJSON(ACTIVE_SUBSCRIPTIONS_KEY, safeRecords);
}

function buildSubscriptionRecord(payload, nowIso, options = {}) {
    const id = buildSubscriptionId(payload);
    const student = sanitizeText(payload?.student, 64);
    const date = sanitizeText(payload?.date, 32);
    const course = sanitizeText(payload?.course, 64);
    const time = sanitizeText(payload?.time, 32);
    const platform = sanitizeText(payload?.platform, 32) || "lixiaolaila";
    const token = sanitizeText(payload?.token, 4096);
    const userId = sanitizeText(payload?.userId, 64);
    const durationMinutes = normalizeDurationMinutes(payload?.durationMinutes);
    const initialCheckDelayMinutes = Number.isFinite(options.initialCheckDelayMinutes)
        ? Math.max(0, Number(options.initialCheckDelayMinutes))
        : SUBSCRIPTION_CHECK_INTERVAL_MINUTES;

    if (!id || !student || !date || !durationMinutes) {
        throw new Error("Missing subscription target fields");
    }
    if (platform !== "lixiaolaila") {
        throw new Error("Only lixiaolaila subscriptions are supported");
    }
    if (!token) {
        throw new Error("Missing lixiaolaila token");
    }

    return {
        id,
        student,
        date,
        durationMinutes,
        course,
        time,
        platform,
        token,
        userId,
        nextCheckAt: addMinutes(nowIso, initialCheckDelayMinutes),
        lastNotifiedAt: "",
        notifyCount: 0,
        createdAt: nowIso,
        updatedAt: nowIso
    };
}

export async function upsertSubscription({ store, nowIso, payload, initialCheckDelayMinutes }) {
    const now = sanitizeText(nowIso, 64) || new Date().toISOString();
    const record = buildSubscriptionRecord(payload, now, { initialCheckDelayMinutes });
    const current = await readSubscriptions(store);
    const next = current.filter((item) => item?.id !== record.id);

    const existing = current.find((item) => item?.id === record.id);
    if (existing) {
        next.push({
            ...existing,
            ...record,
            createdAt: existing.createdAt || now,
            notifyCount: Number(existing.notifyCount) || 0,
            lastNotifiedAt: existing.lastNotifiedAt || ""
        });
    } else {
        next.push(record);
    }

    await writeSubscriptions(store, next);
    return {
        ok: true,
        subscription: next.find((item) => item.id === record.id),
        subscriptions: next
    };
}

export async function subscribeAndRunImmediateCheck({
    store,
    nowIso,
    payload,
    env = process.env,
    fetchBoardRows,
    sendReminderEmail
}) {
    const now = sanitizeText(nowIso, 64) || new Date().toISOString();
    const upserted = await upsertSubscription({
        store,
        nowIso: now,
        payload,
        initialCheckDelayMinutes: 0
    });
    const subscriptionId = upserted?.subscription?.id;
    const summary = await runSubscriptionChecks({
        store,
        nowIso: now,
        env,
        fetchBoardRows,
        sendReminderEmail,
        subscriptions: upserted?.subscriptions,
        subscriptionIds: subscriptionId ? [subscriptionId] : []
    });
    const current = await readSubscriptions(store);
    return {
        ok: true,
        summary,
        subscription: current.find((item) => item?.id === subscriptionId) || null
    };
}

export async function removeSubscription({ store, payload }) {
    const id = sanitizeText(payload?.id, 128) || buildSubscriptionId(payload);
    if (!id) {
        throw new Error("Missing subscription id");
    }

    const current = await readSubscriptions(store);
    const next = current.filter((item) => item?.id !== id);
    await writeSubscriptions(store, next);
    return {
        ok: true,
        removed: current.length !== next.length,
        id
    };
}

export async function getSubscriptionStatus({ store, payload }) {
    const ids = Array.isArray(payload?.ids)
        ? payload.ids.map((item) => sanitizeText(item, 128)).filter(Boolean)
        : [];
    const current = await readSubscriptions(store);
    const activeIdSet = new Set(current.map((item) => sanitizeText(item?.id, 128)).filter(Boolean));
    const activeIds = ids.filter((id) => activeIdSet.has(id));
    const statusById = {};
    ids.forEach((id) => {
        statusById[id] = activeIdSet.has(id) ? "active" : "inactive";
    });
    return {
        ok: true,
        activeIds,
        statusById
    };
}

export function createStore() {
    return getStore(SUBSCRIPTION_STORE_NAME);
}

export default async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("", { status: 204, headers: corsHeaders() });
    }

    if (req.method !== "POST") {
        return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let body;
    try {
        body = await req.json();
    } catch (_) {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const action = sanitizeText(body?.action, 32).toLowerCase();
    const store = createStore();

    try {
        if (action === "unsubscribe") {
            const result = await removeSubscription({
                store,
                payload: body
            });
            return jsonResponse(result, 200);
        }

        if (action === "status") {
            const result = await getSubscriptionStatus({
                store,
                payload: body
            });
            return jsonResponse(result, 200);
        }

        if (action !== "subscribe") {
            return jsonResponse({ error: "Unsupported action" }, 400);
        }

        const result = await subscribeAndRunImmediateCheck({
            store,
            nowIso: new Date().toISOString(),
            payload: body,
            env: process.env
        });
        return jsonResponse(result, 200);
    } catch (error) {
        return jsonResponse({ error: error.message || "Subscription request failed" }, 400);
    }
};