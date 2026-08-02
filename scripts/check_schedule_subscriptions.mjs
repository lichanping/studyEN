import { getStore } from "@netlify/blobs";
import nodemailer from "nodemailer";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const scheduleCourseMatch = require("../netlify/functions/schedule-course-match-shared.cjs");

export const ACTIVE_SUBSCRIPTIONS_KEY = "active-subscriptions";
export const SUBSCRIPTION_STORE_NAME = "schedule-subscriptions";
const SUBSCRIPTION_CHECK_INTERVAL_MINUTES = 60;
const MAX_NOTIFY_COUNT = 3;

const DEFAULT_MAIL_TO = "lichanping@126.com";

function isDryRun(env = process.env) {
    return String(env.SCHEDULE_SUBSCRIPTION_DRY_RUN || "").trim().toLowerCase() === "true";
}

function isEmailDisabled(env = process.env) {
    return isDryRun(env)
        || String(env.SCHEDULE_SUBSCRIPTION_DISABLE_EMAIL || "").trim().toLowerCase() === "true";
}

function addMinutes(isoString, minutes) {
    const baseDate = new Date(isoString);
    return new Date(baseDate.getTime() + minutes * 60 * 1000).toISOString();
}

function shouldCheckNow(subscription, nowIso) {
    if (!subscription?.nextCheckAt) return true;
    return new Date(subscription.nextCheckAt).getTime() <= new Date(nowIso).getTime();
}

function parseRecipients(raw) {
    return String(raw || "")
        .split(/[;,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function toHoursText(minutes) {
    const hours = Number(minutes) / 60;
    if (!Number.isFinite(hours) || hours <= 0) return "";
    if (Number.isInteger(hours)) return hours + "小时";
    return hours.toFixed(1).replace(".0", "") + "小时";
}

function formatScheduleDate(value) {
    const date = new Date(String(value || "") + "T00:00:00");
    if (!Number.isFinite(date.getTime())) return String(value || "").trim();
    const weekDay = "日一二三四五六".charAt(date.getDay());
    return (date.getMonth() + 1) + "月" + date.getDate() + "日（周" + weekDay + "）";
}

export function resolveMailRecipients(env = process.env) {
    const configured = parseRecipients(env.SCHEDULE_SUBSCRIPTION_MAIL_TO || env.FX_ALERT_MAIL_TO);
    if (configured.length > 0) return configured;
    return parseRecipients(DEFAULT_MAIL_TO);
}

export function resolveMailFrom(env = process.env) {
    return String(
        env.SCHEDULE_SUBSCRIPTION_MAIL_FROM
        || env.FX_ALERT_MAIL_FROM
        || env.SCHEDULE_SUBSCRIPTION_SMTP_USER
        || env.FX_ALERT_SMTP_USER
        || ""
    ).trim();
}

function resolveSmtpConfig(env = process.env) {
    return {
        host: String(env.SCHEDULE_SUBSCRIPTION_SMTP_HOST || env.FX_ALERT_SMTP_HOST || "").trim(),
        port: Number.parseInt(String(env.SCHEDULE_SUBSCRIPTION_SMTP_PORT || env.FX_ALERT_SMTP_PORT || "587"), 10) || 587,
        secure: String(env.SCHEDULE_SUBSCRIPTION_SMTP_SECURE || env.FX_ALERT_SMTP_SECURE || "false").trim() === "true",
        user: String(env.SCHEDULE_SUBSCRIPTION_SMTP_USER || env.FX_ALERT_SMTP_USER || "").trim(),
        pass: String(env.SCHEDULE_SUBSCRIPTION_SMTP_PASS || env.FX_ALERT_SMTP_PASS || "").trim(),
        from: resolveMailFrom(env),
        recipients: resolveMailRecipients(env)
    };
}

export function buildScheduleRequestText(subscription) {
    const time = String(subscription?.time || "").trim();
    const timeText = time ? " " + time : "";
    const course = String(subscription?.course || "未填写").trim();
    const durationText = toHoursText(subscription?.durationMinutes) || (String(subscription?.durationMinutes || "").trim() + "分钟");
    return "【排课申请】\n" +
        `学员：【${subscription.student}】\n` +
        `时间：${formatScheduleDate(subscription.date)}${timeText}\n` +
        `课程与时长：${course}（${durationText}），谢谢～`;
}

export function buildReminderMessage(subscription, options = {}) {
    const requestText = buildScheduleRequestText(subscription);
    const lines = [
        "以下课程仍未排课，请及时催排：",
        `学生：${subscription.student}`,
        `日期：${subscription.date}`,
        `时长：${subscription.durationMinutes} 分钟`,
        `课程：${subscription.course || "未填写"}`,
        `平台：${subscription.platform}`,
        `订阅编号：${subscription.id}`,
        "",
        "可直接复制下面的申请排课文案：",
        requestText
    ];
    if (options.finalReminder) {
        lines.push(
            "",
            `本订阅已连续提醒 ${MAX_NOTIFY_COUNT} 次仍未检测到排课，系统将自动停止轮询。请手动确认是否需要重新订阅。`
        );
    }
    return lines.join("\n");
}

export function buildResolvedMessage(subscription, state) {
    const stateText = state === "completed" ? "已完成" : "已排课";
    return [
        "已检测到排课状态更新，系统将自动停止订阅。",
        `学生：${subscription.student}`,
        `日期：${subscription.date}`,
        `时长：${subscription.durationMinutes} 分钟`,
        `课程：${subscription.course || "未填写"}`,
        `平台：${subscription.platform}`,
        `当前状态：${stateText}`,
        `订阅编号：${subscription.id}`,
        "",
        "本订阅已自动停止订阅，后续不再轮询。"
    ].join("\n");
}

export async function readSubscriptions(store) {
    const rows = await store.get(ACTIVE_SUBSCRIPTIONS_KEY, { type: "json" });
    return Array.isArray(rows) ? rows : [];
}

export async function writeSubscriptions(store, records) {
    await store.setJSON(ACTIVE_SUBSCRIPTIONS_KEY, Array.isArray(records) ? records : []);
}

export function createGithubActionStore(env = process.env) {
    const siteID = String(env.NETLIFY_SITE_ID || "").trim();
    const token = String(env.NETLIFY_AUTH_TOKEN || "").trim();
    if (!siteID || !token) {
        throw new Error("Missing NETLIFY_SITE_ID or NETLIFY_AUTH_TOKEN");
    }
    return getStore({
        name: SUBSCRIPTION_STORE_NAME,
        siteID,
        token
    });
}

export async function loadBoardRowsForSubscription(subscription) {
    const headers = {
        "accept": "application/json, text/plain, */*",
        "authorization": "Bearer " + subscription.token,
        "x-token-c": subscription.token,
        "x-ua": "ct=2&v=5.0.96"
    };
    if (subscription.userId) {
        headers["x-user-id"] = subscription.userId;
    }

    const boardResp = await fetch("https://apiv2.lxll.com/customer/training/board", {
        method: "GET",
        headers
    });
    if (!boardResp.ok) {
        throw new Error("Board request failed: " + boardResp.status);
    }

    const completedResp = await fetch("https://apiv2.lxll.com/customer/training/orders?pageNumber=1&pageSize=50&status=COMPLETED", {
        method: "GET",
        headers
    });
    if (!completedResp.ok) {
        throw new Error("Completed request failed: " + completedResp.status);
    }

    const boardPayload = await boardResp.json();
    const completedPayload = await completedResp.json();
    const boardRows = Array.isArray(boardPayload?.data) ? boardPayload.data : [];
    const completedRows = Array.isArray(completedPayload?.data?.data) ? completedPayload.data.data : [];
    return boardRows.concat(completedRows);
}

export async function sendSmtpReminderEmail({ subscription, env = process.env, subject, message }) {
    if (isEmailDisabled(env)) {
        console.warn("schedule subscription checker: email disabled by env; skip email for", subscription.id);
        return { skipped: true };
    }

    const smtp = resolveSmtpConfig(env);

    if (!smtp.recipients.length || !smtp.from || !smtp.host || !smtp.user || !smtp.pass) {
        console.warn("schedule subscription checker: SMTP config is incomplete; skip email for", subscription.id);
        return { skipped: true };
    }

    const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
            user: smtp.user,
            pass: smtp.pass
        }
    });

    await transporter.sendMail({
        from: smtp.from,
        to: smtp.recipients,
        subject: subject || `【仍未排课】${subscription.student} ${subscription.date} ${subscription.durationMinutes}分钟`,
        text: message || buildReminderMessage(subscription)
    });

    return { skipped: false };
}

export async function runSubscriptionChecks({
    store,
    nowIso,
    env = process.env,
    fetchBoardRows = loadBoardRowsForSubscription,
    sendReminderEmail = sendSmtpReminderEmail,
    subscriptionIds
}) {
    const now = nowIso || new Date().toISOString();
    const dryRun = isDryRun(env);
    const current = await readSubscriptions(store);
    const scopedIds = Array.isArray(subscriptionIds)
        ? new Set(subscriptionIds.map((item) => String(item || '').trim()).filter(Boolean))
        : null;
    const next = [];
    let resolvedCount = 0;
    let notifiedCount = 0;
    let expiredCount = 0;
    let skippedCount = 0;
    let wouldResolveCount = 0;
    let wouldNotifyCount = 0;
    let wouldExpireCount = 0;

    for (const subscription of current) {
        if (scopedIds && !scopedIds.has(String(subscription?.id || '').trim())) {
            next.push(subscription);
            continue;
        }
        if (!shouldCheckNow(subscription, now)) {
            next.push(subscription);
            continue;
        }

        try {
            const rows = await fetchBoardRows(subscription);
            const index = scheduleCourseMatch.createBoardMatchIndex(rows);
            const state = scheduleCourseMatch.getCourseMatchState(index, {
                student: subscription.student,
                date: subscription.date,
                durationMinutes: subscription.durationMinutes
            });

            if (state !== "none") {
                if (dryRun) {
                    wouldResolveCount += 1;
                    next.push(subscription);
                    continue;
                }
                await sendReminderEmail({
                    subscription,
                    env,
                    nowIso: now,
                    subject: `【已排课】${subscription.student} ${subscription.date} ${subscription.durationMinutes}分钟`,
                    message: buildResolvedMessage(subscription, state)
                });
                resolvedCount += 1;
                continue;
            }

            const previousNotifyCount = Number(subscription.notifyCount) || 0;
            if (previousNotifyCount >= MAX_NOTIFY_COUNT) {
                if (dryRun) {
                    wouldExpireCount += 1;
                    next.push(subscription);
                    continue;
                }
                expiredCount += 1;
                continue;
            }

            const nextNotifyCount = previousNotifyCount + 1;
            const message = buildReminderMessage(subscription, {
                finalReminder: nextNotifyCount >= MAX_NOTIFY_COUNT
            });
            if (dryRun) {
                wouldNotifyCount += 1;
                if (nextNotifyCount >= MAX_NOTIFY_COUNT) {
                    wouldExpireCount += 1;
                }
                next.push(subscription);
                continue;
            }
            await sendReminderEmail({ subscription, env, nowIso: now, message });
            notifiedCount += 1;
            if (nextNotifyCount >= MAX_NOTIFY_COUNT) {
                expiredCount += 1;
                continue;
            }

            next.push({
                ...subscription,
                notifyCount: nextNotifyCount,
                lastNotifiedAt: now,
                nextCheckAt: addMinutes(now, SUBSCRIPTION_CHECK_INTERVAL_MINUTES),
                updatedAt: now,
                lastError: ""
            });
        } catch (error) {
            skippedCount += 1;
            next.push({
                ...subscription,
                ...(dryRun ? {} : {
                    nextCheckAt: addMinutes(now, SUBSCRIPTION_CHECK_INTERVAL_MINUTES),
                    updatedAt: now,
                    lastError: error.message || "unknown"
                })
            });
        }
    }

    if (!dryRun) {
        await writeSubscriptions(store, next);
    }
    return {
        storeKey: ACTIVE_SUBSCRIPTIONS_KEY,
        checkedAt: now,
        dryRun,
        activeCount: dryRun ? current.length : next.length,
        resolvedCount,
        notifiedCount,
        expiredCount,
        skippedCount,
        wouldResolveCount,
        wouldNotifyCount,
        wouldExpireCount
    };
}

async function main() {
    const store = createGithubActionStore();
    const summary = await runSubscriptionChecks({ store, env: process.env });
    console.log(JSON.stringify(summary, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error(error);
        process.exit(1);
    });
}