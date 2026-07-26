const assert = require("assert");
const fs = require("fs");
const path = require("path");

const commonFunctions = fs.readFileSync(path.join(__dirname, "..", "commonFunctions.js"), "utf8");
const loginHtml = fs.readFileSync(path.join(__dirname, "..", "login.html"), "utf8");

assert.ok(
    /LOGIN_VALIDITY_MS\s*=\s*30\s*\*\s*24\s*\*\s*60\s*\*\s*60\s*\*\s*1000/.test(commonFunctions),
    "登录有效期应配置为 30 天"
);

assert.ok(
    commonFunctions.includes("Date.now() - storedLoginTime <= LOGIN_VALIDITY_MS"),
    "登录检查应按 30 天有效期判断，而不是只认当天"
);

assert.ok(
    commonFunctions.includes("localStorage.setItem('loginDate', String(Date.now()))"),
    "登录成功时应保存登录时间戳"
);

assert.ok(
    loginHtml.includes('<form id="loginForm">')
        && loginHtml.includes('document.getElementById("loginForm").addEventListener("submit", (event) => {')
        && loginHtml.includes('event.preventDefault();')
        && loginHtml.includes('commonFunctions.validateLogin();')
        && loginHtml.includes('document.getElementById("login").addEventListener("click", (event) => {')
        && loginHtml.includes('event.preventDefault();')
        && loginHtml.includes('commonFunctions.validateLogin();'),
    "登录页按回车提交表单时应与点击 Login 按钮走同一个 validateLogin 处理器"
);

console.log("test-login-session-expiry passed");
