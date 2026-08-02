export * from "../netlify/functions/schedule-subscription-checker-shared.mjs";

import {
    createGithubActionStore,
    runSubscriptionChecks
} from "../netlify/functions/schedule-subscription-checker-shared.mjs";

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