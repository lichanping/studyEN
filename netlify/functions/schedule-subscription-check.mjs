import { runSubscriptionChecks } from "./schedule-subscription-checker-shared.mjs";
import { createStore } from "./schedule-subscription.mjs";

export const config = {
    schedule: "@hourly"
};

export default async () => {
    const summary = await runSubscriptionChecks({
        store: createStore(),
        nowIso: new Date().toISOString(),
        env: process.env
    });

    console.log(JSON.stringify(summary, null, 2));
    return new Response(JSON.stringify(summary), {
        status: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        }
    });
};