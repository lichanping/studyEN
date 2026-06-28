#!/usr/bin/env node
const fs = require("fs/promises");
const path = require("path");

const DEFAULT_API_BASE = "https://api.lxll.com/request";
const DEFAULT_UA = "ct=2&v=5.0.104";

function printHelp() {
    console.log(`Fetch full reading prepare txt files from LXLL.

This script uses CustomerListCourseBook and CustomerQueryCourseBookPrepareByCourseBookId.
It saves the full prepare content, including English article, Chinese translation,
paragraph summaries, phrases/language points, and article summary.

Required environment variables:
  LXLL_TOKEN_C       Value from browser localStorage key x-course-learn
  LXLL_USER_ID       Teacher/user id for x-user-id header

Required options:
  --course-id <id>
  --student-id <id>
  --output-folder <user_data subfolder or absolute path>

Optional options:
  --course-order-id <id>
  --api-base <url>              Default: ${DEFAULT_API_BASE}
  --is-teacher-trial-order <true|false>  Default: false
  --delay-ms <number>           Default: 80
  --help

Example:
  LXLL_TOKEN_C="..." LXLL_USER_ID="144620" \\
    node scripts/fetch_course_prepare_articles.js \\
      --course-id 676022309355589 \\
      --student-id 474313 \\
      --course-order-id 153532734190083 \\
      --output-folder "!【5.0】【中级】-初阶-阅读50篇"`);
}

function parseArgs(argv) {
    const args = {
        apiBase: DEFAULT_API_BASE,
        isTeacherTrialOrder: false,
        delayMs: 80,
    };

    for (let index = 2; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === "--help" || arg === "-h") {
            args.help = true;
            continue;
        }
        if (!arg.startsWith("--")) {
            throw new Error(`Unexpected argument: ${arg}`);
        }
        const key = arg.slice(2);
        const value = argv[index + 1];
        if (!value || value.startsWith("--")) {
            throw new Error(`Missing value for ${arg}`);
        }
        index += 1;

        if (key === "course-id") args.courseId = value;
        else if (key === "student-id") args.studentId = value;
        else if (key === "course-order-id") args.courseOrderId = value;
        else if (key === "output-folder") args.outputFolder = value;
        else if (key === "api-base") args.apiBase = value.replace(/\/+$/, "");
        else if (key === "is-teacher-trial-order") args.isTeacherTrialOrder = value === "true";
        else if (key === "delay-ms") args.delayMs = Number.parseInt(value, 10);
        else throw new Error(`Unknown option: ${arg}`);
    }

    return args;
}

function requireConfig(args) {
    const missing = [];
    if (!process.env.LXLL_TOKEN_C) missing.push("LXLL_TOKEN_C");
    if (!process.env.LXLL_USER_ID) missing.push("LXLL_USER_ID");
    if (!args.courseId) missing.push("--course-id");
    if (!args.studentId) missing.push("--student-id");
    if (!args.outputFolder) missing.push("--output-folder");
    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(", ")}`);
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeFileName(name) {
    return String(name)
        .replace(/[\\/:*?"<>|]/g, "-")
        .replace(/\s+/g, " ")
        .trim();
}

function decodeHtmlEntities(text) {
    const named = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        apos: "'",
        nbsp: " ",
    };
    return String(text)
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number.parseInt(num, 10)))
        .replace(/&([a-zA-Z]+);/g, (match, name) => Object.prototype.hasOwnProperty.call(named, name) ? named[name] : match);
}

function htmlToText(html) {
    return decodeHtmlEntities(String(html || "")
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<\/p\s*>/gi, "\n")
        .replace(/<\/div\s*>/gi, "\n")
        .replace(/<[^>]+>/g, ""))
        .replace(/\r/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function resolveOutputFolder(outputFolder) {
    if (path.isAbsolute(outputFolder)) return outputFolder;
    return path.resolve(process.cwd(), "user_data", outputFolder);
}

async function postJson(args, endpoint, body) {
    const response = await fetch(`${args.apiBase}/${endpoint}`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-token-c": process.env.LXLL_TOKEN_C,
            "x-user-id": process.env.LXLL_USER_ID,
            "x-ua": DEFAULT_UA,
        },
        body: JSON.stringify(body),
    });

    const text = await response.text();
    let payload;
    try {
        payload = JSON.parse(text);
    } catch (error) {
        throw new Error(`${endpoint} returned non-JSON response: ${text.slice(0, 200)}`);
    }

    if (!response.ok || !payload.success) {
        throw new Error(`${endpoint} failed: HTTP ${response.status} ${text.slice(0, 500)}`);
    }

    return payload.data;
}

async function fetchAndWrite(args) {
    requireConfig(args);

    const outputFolder = resolveOutputFolder(args.outputFolder);
    await fs.mkdir(outputFolder, { recursive: true });

    const courseBooks = await postJson(args, "CustomerListCourseBook", {
        courseId: args.courseId,
        studentId: args.studentId,
        isTeacherTrialOrder: args.isTeacherTrialOrder,
    });

    if (!Array.isArray(courseBooks)) {
        throw new Error("CustomerListCourseBook returned invalid data");
    }

    const sortedBooks = courseBooks.slice().sort((left, right) => Number(left.sorting) - Number(right.sorting));
    let written = 0;

    for (const book of sortedBooks) {
        const html = await postJson(args, "CustomerQueryCourseBookPrepareByCourseBookId", {
            courseBookId: book.courseBookId,
            courseId: book.courseId || args.courseId,
            studentId: args.studentId,
            ...(args.courseOrderId ? { courseOrderId: args.courseOrderId } : {}),
        });

        const text = htmlToText(html);
        if (!text) {
            throw new Error(`Empty prepare content for ${book.name}`);
        }

        const fileName = `${sanitizeFileName(book.name)}.txt`;
        await fs.writeFile(path.join(outputFolder, fileName), `${text}\n`, "utf8");
        written += 1;
        console.log(`Saved: ${fileName}`);
        if (args.delayMs > 0) await sleep(args.delayMs);
    }

    console.log(`Processed ${sortedBooks.length} course books`);
    console.log(`Success: ${written}, Failed: ${sortedBooks.length - written}`);
    console.log(`Output folder: ${outputFolder}`);
}

async function main() {
    const args = parseArgs(process.argv);
    if (args.help) {
        printHelp();
        return;
    }
    await fetchAndWrite(args);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.message || error);
        process.exit(1);
    });
}

module.exports = {
    htmlToText,
    sanitizeFileName,
};
