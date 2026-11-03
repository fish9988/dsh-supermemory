window.__ModuleLoader__.load({id:"dsh-supermemory",factory:(require)=>{var module={exports:{}};var exports=module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.jsx
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(client_exports);

// src/core.mjs
var PACKAGE_ID = "dsh-supermemory";
var ENTRY_ID = "supermemory";
var KEY_REF = "SUPERMEMORY_API_KEY";
var ROUTE_PREFIX = "/api/dsh-supermemory.";
var ENDPOINTS = ["status", "check", "setKey", "tags", "memories", "search", "add", "update", "forget", "profile", "preview", "models", "extractNow", "clearTag"];
var DEFAULT_TAG = "dsh_personal";
var DEFAULT_ENTITY_CONTEXT = [
  "Conversations between one Chinese-speaking user and an AI assistant inside DeepSeek Harness (a desktop coding/writing agent).",
  "Remember durable facts about the user: identity, preferences (language, tone, formatting), ongoing projects and their goals, deadlines, people they work with, tools and environment, and decisions they made.",
  "Ignore transient task details, code, file contents, tool output, and anything said only by the assistant.",
  "Never store secrets such as API keys, passwords or tokens.",
  'Write each memory in Simplified Chinese, followed by " | EN: " and a short English translation.'
].join(" ");
var SCOPES = [
  ["global", "\u6240\u6709\u5DE5\u4F5C\u533A\u5171\u7528", "\u6240\u6709\u4F1A\u8BDD\u7684\u8BB0\u5FC6\u653E\u5728\u540C\u4E00\u4E2A\u8BB0\u5FC6\u5E93\u91CC\uFF0C\u8DE8\u5DE5\u4F5C\u533A\u4E92\u901A\u3002\u9002\u5408\u4E2A\u4EBA\u4F7F\u7528\u3002"],
  ["workspace", "\u6309\u5DE5\u4F5C\u533A\u5206\u5F00", "\u6BCF\u4E2A\u5DE5\u4F5C\u533A\u4E00\u4E2A\u8BB0\u5FC6\u5E93\uFF1B\u53EC\u56DE\u65F6\u540C\u65F6\u67E5\u5F53\u524D\u5DE5\u4F5C\u533A\u548C\u201C\u5168\u5C40\u201D\u8BB0\u5FC6\u5E93\u3002\u9002\u5408\u591A\u4E2A\u4E92\u4E0D\u76F8\u5173\u7684\u9879\u76EE\u3002"]
];
var SETTING_FIELDS = {
  enabled: { kind: "bool", default: true },
  autoRecall: { kind: "bool", default: true },
  recallProfile: { kind: "bool", default: true },
  recallLimit: { kind: "int", min: 1, max: 20, default: 6 },
  recallThreshold: { kind: "int", min: 20, max: 90, default: 60 },
  recallChunks: { kind: "bool", default: true },
  recallTimeoutSec: { kind: "int", min: 1, max: 15, default: 5 },
  captureConversations: { kind: "bool", default: true },
  captureAssistant: { kind: "bool", default: true },
  modelExtraction: { kind: "bool", default: true },
  extractProvider: { kind: "string", default: "" },
  extractModel: { kind: "string", default: "" },
  extractDelaySec: { kind: "int", min: 10, max: 1800, default: 90 },
  scope: { kind: "enum", values: SCOPES.map((x) => x[0]), default: "global" },
  containerTag: { kind: "string", default: DEFAULT_TAG },
  excludeWorkspaces: { kind: "string", default: "" },
  entityContext: { kind: "string", default: DEFAULT_ENTITY_CONTEXT },
  baseURL: { kind: "string", default: "" }
};
var DEFAULT_SETTINGS = Object.freeze(Object.fromEntries(Object.entries(SETTING_FIELDS).map(([k, f]) => [k, f.default])));
function normalizeSettings(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const [k, f] of Object.entries(SETTING_FIELDS)) {
    const v = src[k];
    switch (f.kind) {
      case "enum":
        out[k] = f.values.includes(v) ? v : f.default;
        break;
      case "bool":
        out[k] = typeof v === "boolean" ? v : f.default;
        break;
      case "int": {
        const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
        out[k] = Number.isFinite(n) ? Math.min(f.max, Math.max(f.min, Math.round(n))) : f.default;
        break;
      }
      default:
        out[k] = typeof v === "string" ? v.trim().slice(0, k === "entityContext" ? 1500 : 4e3) : f.default;
    }
  }
  out.containerTag = sanitizeTag(out.containerTag) || DEFAULT_TAG;
  if (!out.entityContext) out.entityContext = DEFAULT_ENTITY_CONTEXT;
  return out;
}
function sanitizeTag(value) {
  const t = String(value ?? "").trim();
  return /^[A-Za-z0-9._-]{1,100}$/.test(t) ? t : "";
}
var MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
var TEMPORAL_PATTERNS = [
  /\d{4}\s*[-/.年]\s*\d{1,2}\s*[-/.月]\s*\d{1,2}\s*[日号]?/g,
  /\d{4}\s*年(?:\s*\d{1,2}\s*月)?/g,
  /\d{1,2}\s*月\s*\d{1,2}\s*[日号]/g,
  /\d{1,2}\s*[日号]/g,
  /\d{1,2}\s*月(?:份)?/g,
  /(?:最近|近期|近来|近日|这几天|这两天|这些天|前几天|前些天|前阵子|这阵子|今天|今日|昨天|昨日|前天|明天|明日|后天|今晚|昨晚|明晚|今早|今年|去年|明年|前年|刚才|刚刚|目前|当前|现在|以前|之前|过去|将来|未来|以后)/g,
  /(?:本|这|上|下|上上|下下)(?:个)?(?:周末|周|星期|礼拜|月|季度)/g,
  /(?:前|后|过去|未来)?\s*\d+\s*(?:天|周|个月|年)(?:前|后|内|以来)?/g,
  new RegExp(String.raw`\b(?:on\s+|by\s+|in\s+)?(?:(?:${MONTHS})\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?|\d{1,2}(?:st|nd|rd|th)?\s+(?:${MONTHS})\b\.?(?:,?\s*\d{4})?)`, "gi"),
  /\b\d+\s+(?:days?|weeks?|months?|years?)\s+(?:ago|later)\b/gi,
  /\b(?:recently|lately|today|tonight|yesterday|tomorrow|nowadays|currently|earlier|previously|ago)\b/gi,
  /\b(?:this|last|next|past|coming)\s+(?:week(?:end)?|month|year|quarter|few\s+days|days|weeks|months)\b/gi,
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g
];
function createHttpCall(fetchImpl) {
  return async (endpoint, payload, signal) => {
    if (!ENDPOINTS.includes(endpoint)) return { ok: false, code: "bad-request", message: `\u672A\u77E5\u64CD\u4F5C\uFF1A${endpoint}` };
    let res;
    try {
      res = await fetchImpl(ROUTE_PREFIX.slice(1) + endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload ?? {}),
        cache: "no-store",
        signal
      });
    } catch (e) {
      if (signal?.aborted) return { ok: false, code: "aborted", message: "\u5DF2\u53D6\u6D88" };
      return { ok: false, code: "network", message: `\u65E0\u6CD5\u8FDE\u63A5\u8BB0\u5FC6\u670D\u52A1\uFF1A${e?.message || e}` };
    }
    let data;
    try {
      data = await res.json();
    } catch {
      data = void 0;
    }
    if (data && typeof data === "object" && typeof data.ok === "boolean") return data;
    return { ok: false, code: "http", message: `Supermemory \u63D2\u4EF6\u670D\u52A1\u4E0D\u53EF\u7528\uFF08HTTP ${res.status}\uFF09\uFF0C\u8BF7\u786E\u8BA4\u63D2\u4EF6\u5DF2\u542F\u7528\u5E76\u91CD\u542F DSH` };
  };
}

// src/ui/components.jsx
var import_react = require("react");

// src/ui/ui.css
var ui_default = "/* Supermemory \u957F\u671F\u8BB0\u5FC6\u8BBE\u7F6E\u9875\u3002\u53EA\u7528 --dsw-* \u4E3B\u9898\u53D8\u91CF\uFF1B\u884C\u6837\u5F0F\u540C settings-general / Exa \u641C\u7D22\u3002 */\n.dsm-page { color: var(--dsw-alias-label-primary); }\n.dsm-section-title { margin: 24px 0 0; font-size: 14px; line-height: 20px; font-weight: 500; color: var(--dsw-alias-label-secondary); }\n.dsm-section-title:first-child { margin-top: 0; }\n.dsm-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 16px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }\n.dsm-row-block { flex-direction: column; align-items: stretch; gap: 10px; }\n.dsm-row-text { min-width: 0; }\n.dsm-row-title { display: flex; align-items: center; gap: 8px; font-size: 14px; line-height: 20px; }\n.dsm-row-desc { margin-top: 4px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); }\n.dsm-row-ctl { flex: none; display: flex; align-items: center; gap: 8px; }\n.dsm-badge { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 12px; line-height: 18px; background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-secondary); white-space: nowrap; }\n.dsm-badge.is-ok { color: var(--dsw-alias-state-success-primary); }\n.dsm-badge.is-warn { color: var(--dsw-alias-state-error-primary); }\n\n.dsm-status { display: flex; flex-direction: column; gap: 4px; margin-top: 12px; padding: 12px 14px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-module-platform); font-size: 13px; line-height: 20px; }\n.dsm-status-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }\n.dsm-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--dsw-alias-label-tertiary); }\n.dsm-dot.is-ok { background: var(--dsw-alias-state-success-primary); }\n.dsm-dot.is-warn { background: var(--dsw-alias-state-error-primary); }\n.dsm-muted { color: var(--dsw-alias-label-tertiary); font-size: 12px; line-height: 18px; overflow-wrap: anywhere; }\n\n.dsm-input {\n  box-sizing: border-box; width: 100%; height: 38px; padding: 0 12px;\n  border: 0.5px solid var(--dsw-alias-border-l4); border-radius: var(--dsw-radius-md);\n  background: var(--dsw-specific-input-major, var(--dsw-alias-bg-layer-3)); font: inherit; font-size: 14px; line-height: 22px; color: var(--dsw-alias-label-primary);\n}\n.dsm-input::placeholder { color: var(--dsw-alias-label-tertiary); }\n.dsm-input:focus-visible { outline: none; border-color: var(--dsw-alias-state-business-primary); }\n.dsm-input:disabled { color: var(--dsw-alias-label-tertiary); }\n.dsm-inline { display: flex; gap: 8px; align-items: center; }\n.dsm-inline .dsm-input { flex: 1; min-width: 0; }\n.dsm-select {\n  max-width: 260px; height: 36px; padding: 0 10px; border: none; border-radius: var(--dsw-radius-md);\n  background: var(--dsw-alias-bg-module-platform); font: inherit; font-size: 14px; color: var(--dsw-alias-label-primary); cursor: pointer;\n}\n.dsm-select option { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }\n.dsm-num { display: inline-flex; align-items: center; gap: 8px; }\n.dsm-input-num { width: 92px; height: 36px; text-align: center; background: var(--dsw-alias-bg-module-platform); border-color: transparent; }\n.dsm-unit { font-size: 13px; color: var(--dsw-alias-label-tertiary); }\n\n.dsm-switch {\n  box-sizing: border-box; position: relative; flex: 0 0 auto; width: 36px; height: 20px; padding: 2px;\n  border: 0; border-radius: 999px; background: var(--dsw-alias-border-l3); cursor: pointer;\n}\n.dsm-switch[aria-checked='true'] { background: var(--dsw-alias-brand-primary); }\n.dsm-switch:disabled { cursor: default; opacity: .5; }\n.dsm-thumb { display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--dsw-alias-switch-thumb); transition: transform 120ms ease; }\n.dsm-switch[aria-checked='true'] .dsm-thumb { transform: translateX(16px); background: var(--dsw-alias-label-primary-foreground); }\n\n.dsm-btn {\n  box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 4px; height: 36px; padding: 0 14px;\n  border: none; border-radius: var(--dsw-radius-md); cursor: pointer; font: inherit; font-size: 14px; line-height: 22px;\n  color: var(--dsw-alias-label-primary); background: transparent; white-space: nowrap;\n}\n.dsm-btn:disabled { cursor: not-allowed; opacity: .4; }\n.dsm-primary { background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }\n.dsm-primary:hover:not(:disabled) { background: var(--dsw-alias-button-primary-hover); }\n.dsm-outline { border: 0.5px solid var(--dsw-alias-border-l3); }\n.dsm-outline:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }\n.dsm-btn:focus-visible, .dsm-switch:focus-visible, .dsm-select:focus-visible {\n  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 1px;\n}\n\n.dsm-foot { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 16px 0 4px; flex-wrap: wrap; }\n.dsm-msg { flex: 1; min-width: 8rem; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-tertiary); overflow-wrap: anywhere; }\n.dsm-msg.is-ok { color: var(--dsw-alias-state-success-primary); }\n.dsm-msg.is-error { color: var(--dsw-alias-state-error-primary); }\n\n.dsm-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }\n@media (prefers-reduced-motion: reduce) { .dsm-thumb { transition: none; } }\n@media (max-width: 560px) { .dsm-row { flex-direction: column; align-items: stretch; gap: 10px; } .dsm-select { max-width: none; width: 100%; } }\n\n.dsm-msg.is-warn { color: var(--dsw-alias-state-warn-primary, var(--dsw-alias-state-error-primary)); }\n.dsm-pad { padding: 12px 0; margin: 0; }\n.dsm-pending { margin-top: 4px; justify-content: space-between; }\n.dsm-sm { height: 28px; padding: 0 10px; font-size: 13px; }\n.dsm-ghost:hover:not(:disabled) { background: var(--dsw-alias-interactive-bg-hover); }\n.dsm-ghost { color: var(--dsw-alias-label-secondary); }\n.dsm-danger { background: var(--dsw-alias-state-error-primary); color: var(--dsw-alias-label-primary-foreground); }\n.dsm-danger:hover:not(:disabled) { opacity: .9; }\n.dsm-textarea { height: auto; min-height: 64px; padding: 8px 12px; line-height: 20px; resize: vertical; }\n.dsm-input.is-invalid { border-color: var(--dsw-alias-state-error-primary); }\n.dsm-check { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--dsw-alias-label-secondary); white-space: nowrap; cursor: pointer; }\n.dsm-check input { accent-color: var(--dsw-alias-brand-primary); }\n\n.dsm-disclosure {\n  display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; padding: 4px 0; border: 0; background: transparent;\n  font: inherit; font-size: 14px; color: var(--dsw-alias-label-secondary); cursor: pointer;\n}\n.dsm-disclosure:hover { color: var(--dsw-alias-label-primary); }\n.dsm-disclosure:focus-visible, .dsm-seg-btn:focus-visible, .dsm-check input:focus-visible {\n  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary)); outline-offset: 1px;\n}\n.dsm-caret { display: inline-block; width: 12px; font-size: 11px; }\n\n.dsm-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; }\n.dsm-toolbar .dsm-select { flex: 1 1 200px; min-width: 0; max-width: 340px; }\n.dsm-seg { display: inline-flex; padding: 2px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-module-platform); }\n.dsm-seg-btn { height: 28px; padding: 0 12px; border: 0; border-radius: calc(var(--dsw-radius-md) - 2px); background: transparent; font: inherit; font-size: 13px; color: var(--dsw-alias-label-secondary); cursor: pointer; }\n.dsm-seg-btn.is-on { background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-interactive-bg-hover)); color: var(--dsw-alias-label-primary); }\n.dsm-search { margin-top: 10px; }\n\n.dsm-editor { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; padding: 12px; border-radius: var(--dsw-radius-md); background: var(--dsw-alias-bg-module-platform); }\n.dsm-editor .dsm-inline { justify-content: flex-end; }\n.dsm-editor .dsm-msg { text-align: right; }\n\n.dsm-list-wrap { margin-top: 10px; }\n.dsm-list-wrap[aria-busy='true'] .dsm-mems { opacity: .6; }\n.dsm-mems { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }\n.dsm-mem { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2); }\n.dsm-mem:last-child { border-bottom: 0; }\n.dsm-mem .dsm-editor { flex: 1; margin-top: 0; }\n.dsm-mem-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }\n.dsm-mem-text { font-size: 14px; line-height: 21px; overflow-wrap: anywhere; }\n.dsm-mem-text .dsm-badge { margin-right: 6px; vertical-align: 1px; }\n.dsm-mem-title { color: var(--dsw-alias-label-secondary); margin-right: 4px; }\n.dsm-mem-actions { flex: none; display: flex; gap: 4px; opacity: .85; }\n.dsm-mem:hover .dsm-mem-actions, .dsm-mem:focus-within .dsm-mem-actions { opacity: 1; }\n.dsm-pager { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 0 4px; }\n\n.dsm-profile { padding: 4px 0 8px; }\n.dsm-profile h5 { margin: 12px 0 4px; font-size: 13px; font-weight: 500; color: var(--dsw-alias-label-secondary); }\n.dsm-profile ul { margin: 0; padding-left: 20px; font-size: 14px; line-height: 22px; }\n\n.dsm-pre {\n  margin: 8px 0 0; padding: 12px; max-height: 320px; overflow: auto; border-radius: var(--dsw-radius-md);\n  background: var(--dsw-alias-bg-module-platform); font-family: ui-monospace, SFMono-Regular, Consolas, monospace;\n  font-size: 12px; line-height: 18px; white-space: pre-wrap; overflow-wrap: anywhere; color: var(--dsw-alias-label-secondary);\n}\n\n.dsm-activity { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; }\n.dsm-activity li { display: grid; grid-template-columns: 72px 1fr auto; gap: 10px; align-items: baseline; padding: 6px 0; border-bottom: 0.5px solid var(--dsw-alias-border-l2); font-size: 13px; line-height: 19px; }\n.dsm-activity li:last-child { border-bottom: 0; }\n.dsm-act-kind { color: var(--dsw-alias-label-tertiary); font-size: 12px; }\n.dsm-act-text { min-width: 0; overflow-wrap: anywhere; }\n.dsm-act-time { color: var(--dsw-alias-label-tertiary); font-size: 12px; white-space: nowrap; }\n.dsm-activity li.is-error .dsm-act-text { color: var(--dsw-alias-state-error-primary); }\n@media (max-width: 560px) { .dsm-mem { flex-direction: column; } .dsm-activity li { grid-template-columns: 1fr; gap: 2px; } }\n.dsm-danger-zone { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; padding-top: 12px; border-top: 0.5px solid var(--dsw-alias-border-l2); }\n";

// src/ui/components.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var SUMMARY = "\u8BA9\u6A21\u578B\u8BB0\u4F4F\u4F60\uFF1A\u8DE8\u4F1A\u8BDD\u7684\u957F\u671F\u8BB0\u5FC6\uFF0C\u81EA\u52A8\u53EC\u56DE\u3001\u81EA\u52A8\u6574\u7406\uFF0C\u53EF\u968F\u65F6\u67E5\u770B\u548C\u5220\u9664\u3002";
var cx = (...a) => a.filter(Boolean).join(" ");
var SOURCE_LABEL = { file: "DSH \u51ED\u636E\u5E93", env: "\u7CFB\u7EDF\u73AF\u5883\u53D8\u91CF", "user-env": "~/.dsh/.env", "project-env": "\u9879\u76EE .env" };
var KIND_LABEL = { recall: "\u53EC\u56DE", upload: "\u4FDD\u5B58\u5BF9\u8BDD", extract: "\u6574\u7406\u8BB0\u5FC6", tool: "\u6A21\u578B\u5DE5\u5177", manual: "\u624B\u52A8" };
function ago(at) {
  const t = typeof at === "string" ? Date.parse(at) : at;
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1e3));
  if (s < 60) return "\u521A\u521A";
  if (s < 3600) return `${Math.round(s / 60)} \u5206\u949F\u524D`;
  if (s < 86400) return `${Math.round(s / 3600)} \u5C0F\u65F6\u524D`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} \u5929\u524D`;
  return new Date(t).toLocaleDateString();
}
function Row({ title, desc, children, htmlFor }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-row-text", children: [
      htmlFor ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsm-row-title", htmlFor, children: title }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsm-row-title", children: title }),
      desc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsm-row-desc", children: desc }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsm-row-ctl", children })
  ] });
}
function BlockRow({ title, desc, htmlFor, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-row dsm-row-block", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-row-text", children: [
      htmlFor ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsm-row-title", htmlFor, children: title }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsm-row-title", children: title }),
      desc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsm-row-desc", children: desc }) : null
    ] }),
    children
  ] });
}
function Toggle({ checked, onChange, label, disabled }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", role: "switch", "aria-checked": checked, "aria-label": label, className: "dsm-switch", disabled, onClick: () => onChange(!checked), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-thumb" }) });
}
function NumberBox({ id, field, value, onChange, unit, disabled }) {
  const f = SETTING_FIELDS[field];
  const [text, setText] = (0, import_react.useState)(String(value));
  (0, import_react.useEffect)(() => setText(String(value)), [value]);
  const commit = () => {
    const n = Number(text);
    if (text.trim() && Number.isFinite(n)) onChange(Math.min(f.max, Math.max(f.min, Math.round(n))));
    else setText(String(value));
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsm-num", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "input",
      {
        id,
        className: "dsm-input dsm-input-num",
        inputMode: "numeric",
        value: text,
        disabled,
        onChange: (e) => setText(e.target.value),
        onBlur: commit,
        onKeyDown: (e) => {
          if (e.key === "Enter") commit();
        },
        "aria-describedby": `${id}-range`
      }
    ),
    unit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-unit", children: unit }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { id: `${id}-range`, className: "dsm-sr", children: [
      "\u8303\u56F4 ",
      f.min,
      " \u5230 ",
      f.max
    ] })
  ] });
}
function Msg({ msg, fallback }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cx("dsm-msg", msg?.kind && `is-${msg.kind}`), role: "status", "aria-live": "polite", children: msg?.text || fallback || "" });
}
function StatusSection({ call, status, refresh }) {
  const uid = (0, import_react.useId)();
  const [key, setKey] = (0, import_react.useState)("");
  const [msg, setMsg] = (0, import_react.useState)({ kind: "", text: "" });
  const [check, setCheck] = (0, import_react.useState)(null);
  const [flush, setFlush] = (0, import_react.useState)({ kind: "", text: "" });
  const k = status?.key;
  const busy = msg.kind === "busy";
  const runCheck = (0, import_react.useCallback)(async () => {
    setCheck({ phase: "busy" });
    const r = await call("check", {});
    setCheck(r?.ok ? { phase: "ok", ...r } : { phase: "error", message: r?.message || "\u8FDE\u63A5\u5931\u8D25" });
  }, [call]);
  const configured = !!k?.configured;
  (0, import_react.useEffect)(() => {
    if (configured) runCheck();
    else setCheck(null);
  }, [configured, runCheck]);
  async function save(payload, okText) {
    setMsg({ kind: "busy", text: payload.clear ? "\u6B63\u5728\u6E05\u9664\u2026" : "\u6B63\u5728\u9A8C\u8BC1\u5E76\u4FDD\u5B58\u2026" });
    const r = await call("setKey", payload);
    if (r?.ok) {
      setKey("");
      setMsg({ kind: r.warning ? "warn" : "ok", text: r.warning || okText });
      refresh(r);
    } else setMsg({ kind: "error", text: r?.message || "\u4FDD\u5B58\u5931\u8D25" });
  }
  async function extractNow() {
    setFlush({ kind: "busy", text: "\u6B63\u5728\u6574\u7406\u2026\uFF08\u4F1A\u8C03\u7528\u6A21\u578B\uFF0C\u53EF\u80FD\u9700\u8981\u51E0\u5341\u79D2\uFF09" });
    const r = await call("extractNow", {});
    if (!r?.ok) setFlush({ kind: "error", text: r?.message || "\u6574\u7406\u5931\u8D25" });
    else if (!r.sessions) setFlush({ kind: "ok", text: "\u6CA1\u6709\u7B49\u5F85\u6574\u7406\u7684\u5BF9\u8BDD" });
    else setFlush({ kind: r.errors.length ? "warn" : "ok", text: `\u5DF2\u6574\u7406 ${r.sessions} \u4E2A\u5BF9\u8BDD\uFF1A\u65B0\u589E ${r.added}\u3001\u66F4\u65B0 ${r.updated}\u3001\u5220\u9664 ${r.deleted} \u6761\u8BB0\u5FC6${r.errors.length ? `\uFF1B${r.errors[0]}` : ""}` });
    refresh();
  }
  const s = status?.settings;
  const st = status?.stats;
  const on = status?.ok && s?.enabled && configured;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsm-status", role: "status", children: status == null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-muted", children: "\u6B63\u5728\u8BFB\u53D6\u72B6\u6001\u2026" }) : status.ok === false ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-status-line", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-dot is-warn" }),
      status.message
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-status-line", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cx("dsm-dot", on && check?.phase !== "error" ? "is-ok" : "is-warn") }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: !s.enabled ? "\u957F\u671F\u8BB0\u5FC6\u5DF2\u5173\u95ED" : !configured ? "\u8FD8\u6CA1\u6709\u586B\u5199 Supermemory API key" : check?.phase === "error" ? `\u8FDE\u63A5\u5931\u8D25\uFF1A${check.message}` : check?.phase === "ok" ? `\u5DF2\u8FDE\u63A5 Supermemory\uFF08${(check.ms / 1e3).toFixed(1)} \u79D2\uFF09\xB7 \u8BB0\u5FC6\u5E93\u300C${s.containerTag}\u300D\u73B0\u6709 ${check.memories} \u6761\u8BB0\u5FC6\u3001${check.documents} \u6BB5\u5BF9\u8BDD` : "\u6B63\u5728\u8FDE\u63A5 Supermemory\u2026" })
      ] }),
      st ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-muted", children: [
        "\u672C\u6B21\u542F\u52A8\u4EE5\u6765\uFF1A\u53EC\u56DE ",
        st.recalls,
        " \u6B21 \xB7 \u4FDD\u5B58\u5BF9\u8BDD ",
        st.uploads,
        " \u6B21 \xB7 \u6574\u7406 ",
        st.extractions,
        " \u6B21\uFF08\u65B0\u589E ",
        st.added,
        "\u3001\u66F4\u65B0 ",
        st.updated,
        "\u3001\u5220\u9664 ",
        st.deleted,
        "\uFF09\xB7 \u6A21\u578B\u8C03\u7528\u8BB0\u5FC6\u5DE5\u5177 ",
        st.toolCalls,
        " \u6B21",
        st.errors ? ` \xB7 \u51FA\u9519 ${st.errors} \u6B21` : ""
      ] }) : null,
      status.pending || status.extracting ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-inline dsm-pending", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-muted", children: status.extracting ? `\u6B63\u5728\u6574\u7406 ${status.extracting} \u4E2A\u5BF9\u8BDD\u2026` : `${status.pending} \u4E2A\u5BF9\u8BDD\u7B49\u5F85\u6574\u7406\uFF08\u5BF9\u8BDD\u505C\u4E0B ${s.extractDelaySec} \u79D2\u540E\u81EA\u52A8\u8FDB\u884C\uFF09` }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline dsm-sm", disabled: flush.kind === "busy" || !configured, onClick: extractNow, children: "\u7ACB\u5373\u6574\u7406" })
      ] }) : null,
      flush.text ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Msg, { msg: flush }) : null
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      BlockRow,
      {
        title: "API Key",
        htmlFor: `${uid}-key`,
        desc: `\u4FDD\u5B58\u5728 DSH \u51ED\u636E\u5E93\uFF08${KEY_REF}\uFF09\uFF0C\u4E0D\u5199\u5165\u8BBE\u7F6E\u6587\u4EF6\uFF0C\u4E5F\u4E0D\u4F1A\u663E\u793A\u51FA\u6765\u3002\u4FDD\u5B58\u524D\u4F1A\u5148\u5411 Supermemory \u9A8C\u8BC1\u3002\u5728 console.supermemory.ai \u7684 API Keys \u9875\u9762\u83B7\u53D6\u3002`,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-inline", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                id: `${uid}-key`,
                className: "dsm-input",
                type: "password",
                autoComplete: "off",
                spellCheck: false,
                placeholder: configured ? `\u5DF2\u914D\u7F6E\uFF08\u6765\u81EA${SOURCE_LABEL[k.source] || k.source || "\u51ED\u636E"}\uFF09\uFF0C\u8F93\u5165\u65B0 key \u53EF\u66FF\u6362` : "\u7C98\u8D34 Supermemory API key\uFF08sm_ \u5F00\u5934\uFF09",
                value: key,
                disabled: busy || k?.writable === false,
                onChange: (e) => {
                  setKey(e.target.value);
                  setMsg({ kind: "", text: "" });
                },
                onKeyDown: (e) => {
                  if (e.key === "Enter" && key.trim()) save({ key }, "\u5DF2\u9A8C\u8BC1\u5E76\u4FDD\u5B58 API key");
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cx("dsm-badge", configured ? "is-ok" : ""), children: configured ? "\u5DF2\u914D\u7F6E" : "\u672A\u914D\u7F6E" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-inline", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Msg, { msg, fallback: k?.writable === false ? "\u8FD9\u4E2A key \u6765\u81EA\u7CFB\u7EDF\u73AF\u5883\u53D8\u91CF\uFF0C\u53EA\u80FD\u5728\u7CFB\u7EDF\u91CC\u4FEE\u6539" : "" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline", disabled: !configured || check?.phase === "busy", onClick: runCheck, children: check?.phase === "busy" ? "\u6D4B\u8BD5\u4E2D\u2026" : "\u6D4B\u8BD5\u8FDE\u63A5" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "dsm-btn dsm-outline",
                disabled: busy || !configured || k?.writable === false || k?.source !== "file",
                onClick: () => save({ clear: true }, "\u5DF2\u6E05\u9664 API key"),
                children: "\u6E05\u9664"
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                type: "button",
                className: "dsm-btn dsm-primary",
                disabled: busy || !key.trim() || k?.writable === false,
                onClick: () => save({ key }, "\u5DF2\u9A8C\u8BC1\u5E76\u4FDD\u5B58 API key"),
                children: "\u4FDD\u5B58 Key"
              }
            )
          ] })
        ]
      }
    )
  ] });
}
function ModelSelect({ id, call, draft, patch, disabled }) {
  const [models, setModels] = (0, import_react.useState)({ state: "loading", groups: [] });
  (0, import_react.useEffect)(() => {
    let alive = true;
    call("models", {}).then((r) => {
      if (alive) setModels(r?.ok ? { state: "ready", groups: r.groups } : { state: "error", groups: [] });
    }).catch(() => {
      if (alive) setModels({ state: "error", groups: [] });
    });
    return () => {
      alive = false;
    };
  }, [call]);
  const value = draft.extractProvider ? JSON.stringify([draft.extractProvider, draft.extractModel]) : "";
  const known = !draft.extractProvider || models.groups.some((g) => g.id === draft.extractProvider && g.models.some((m) => m.id === draft.extractModel));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "select",
    {
      id,
      className: "dsm-select",
      value,
      disabled,
      onChange: (e) => {
        const v = e.target.value;
        if (!v) patch({ extractProvider: "", extractModel: "" });
        else {
          const [p, m] = JSON.parse(v);
          patch({ extractProvider: p, extractModel: m });
        }
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u8DDF\u968F\u4F1A\u8BDD\u6A21\u578B" }),
        !known ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value, children: [
          draft.extractProvider,
          " / ",
          draft.extractModel,
          "\uFF08\u5F53\u524D\u4E0D\u53EF\u7528\uFF09"
        ] }) : null,
        models.groups.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("optgroup", { label: g.name, children: g.models.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: JSON.stringify([g.id, m.id]), children: m.name }, m.id)) }, g.id))
      ]
    }
  );
}
function SettingsSection({ call, form, draft, setDraft, saved, writable }) {
  const uid = (0, import_react.useId)();
  const [msg, setMsg] = (0, import_react.useState)({ kind: "", text: "" });
  const [advanced, setAdvanced] = (0, import_react.useState)(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const patch = (p) => {
    setDraft((d) => normalizeSettings({ ...d, ...p }));
    setMsg({ kind: "", text: "" });
  };
  const off = !writable || !draft.enabled;
  const [tagText, setTagText] = (0, import_react.useState)(draft.containerTag);
  (0, import_react.useEffect)(() => setTagText(draft.containerTag), [draft.containerTag]);
  const tagValid = !!sanitizeTag(tagText);
  async function save() {
    setMsg({ kind: "busy", text: "\u6B63\u5728\u4FDD\u5B58\u2026" });
    try {
      for (const k of Object.keys(SETTING_FIELDS)) {
        if (draft[k] === saved[k]) continue;
        if (!await form.set(k, draft[k])) throw new Error(`DSH \u6CA1\u6709\u63A5\u53D7\u201C${k}\u201D\u7684\u4FEE\u6539`);
      }
      setMsg({ kind: "ok", text: "\u5DF2\u4FDD\u5B58\uFF0C\u7ACB\u5373\u751F\u6548" });
    } catch (e) {
      setMsg({ kind: "error", text: String(e?.message || e) });
    }
  }
  const scopeDesc = SCOPES.find((x) => x[0] === draft.scope)?.[2];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u542F\u7528\u957F\u671F\u8BB0\u5FC6", desc: "\u5173\u95ED\u540E\u4E0D\u518D\u53EC\u56DE\u3001\u4FDD\u5B58\u6216\u6574\u7406\u8BB0\u5FC6\uFF0C\u6A21\u578B\u7684\u8BB0\u5FC6\u5DE5\u5177\u4E5F\u4F1A\u63D0\u793A\u5DF2\u5173\u95ED\u3002\u5DF2\u6709\u8BB0\u5FC6\u4E0D\u53D7\u5F71\u54CD\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, { label: "\u542F\u7528\u957F\u671F\u8BB0\u5FC6", checked: draft.enabled, disabled: !writable, onChange: (v) => patch({ enabled: v }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "dsm-section-title", children: "\u53EC\u56DE\uFF1A\u56DE\u7B54\u524D\u5148\u60F3\u8D77\u76F8\u5173\u7684\u4E8B" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u81EA\u52A8\u53EC\u56DE", desc: "\u6BCF\u6B21\u4F60\u53D1\u9001\u6D88\u606F\u65F6\uFF0C\u7528\u8FD9\u6761\u6D88\u606F\u68C0\u7D22\u8BB0\u5FC6\uFF0C\u628A\u76F8\u5173\u5185\u5BB9\u4F5C\u4E3A\u4E00\u6761\u6298\u53E0\u7684\u300CSupermemory\u300D\u4E0A\u4E0B\u6587\u4EA4\u7ED9\u6A21\u578B\u3002\u5B50\u4EE3\u7406\u4E0D\u53EC\u56DE\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, { label: "\u81EA\u52A8\u53EC\u56DE", checked: draft.autoRecall, disabled: off, onChange: (v) => patch({ autoRecall: v }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u9644\u5E26\u7528\u6237\u753B\u50CF", desc: "\u6BCF\u4E2A\u4F1A\u8BDD\u7B2C\u4E00\u6B21\u53EC\u56DE\u65F6\uFF0C\u9644\u4E0A Supermemory \u6C47\u603B\u7684\u957F\u671F\u753B\u50CF\uFF08\u8EAB\u4EFD\u3001\u504F\u597D\u7B49\uFF09\u3002\u540C\u4E00\u4F1A\u8BDD\u4E0D\u91CD\u590D\u9644\u5E26\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, { label: "\u9644\u5E26\u7528\u6237\u753B\u50CF", checked: draft.recallProfile, disabled: off || !draft.autoRecall, onChange: (v) => patch({ recallProfile: v }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u9644\u5E26\u5386\u53F2\u5BF9\u8BDD\u7247\u6BB5", desc: "\u9664\u4E86\u63D0\u70BC\u51FA\u7684\u8BB0\u5FC6\uFF0C\u4E5F\u68C0\u7D22\u4EE5\u524D\u5BF9\u8BDD\u7684\u539F\u6587\u7247\u6BB5\uFF08\u6765\u81EA\u201C\u4FDD\u5B58\u5BF9\u8BDD\u539F\u6587\u201D\uFF09\u3002\u5F53\u524D\u4F1A\u8BDD\u81EA\u5DF1\u7684\u7247\u6BB5\u4F1A\u88AB\u6392\u9664\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, { label: "\u9644\u5E26\u5386\u53F2\u5BF9\u8BDD\u7247\u6BB5", checked: draft.recallChunks, disabled: off || !draft.autoRecall, onChange: (v) => patch({ recallChunks: v }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u6700\u591A\u53EC\u56DE", desc: "\u6BCF\u6B21\u6700\u591A\u6CE8\u5165\u591A\u5C11\u6761\u8BB0\u5FC6\u548C\u7247\u6BB5\u3002\u8D8A\u591A\u6A21\u578B\u77E5\u9053\u5F97\u8D8A\u591A\uFF0C\u4E5F\u8D8A\u5360\u4E0A\u4E0B\u6587\u3002", htmlFor: `${uid}-limit`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberBox, { id: `${uid}-limit`, field: "recallLimit", value: draft.recallLimit, unit: "\u6761", disabled: off || !draft.autoRecall, onChange: (v) => patch({ recallLimit: v }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u76F8\u5173\u5EA6\u95E8\u69DB", desc: "\u53EA\u53EC\u56DE\u76F8\u5173\u5EA6\u4E0D\u4F4E\u4E8E\u8BE5\u503C\u7684\u5185\u5BB9\uFF080\u2013100\uFF09\u3002\u5B9E\u6D4B\u4E2D\u6587\u63D0\u95EE\u5BF9\u76F8\u5173\u8BB0\u5FC6\u7EA6 66\u201378 \u5206\u3001\u65E0\u5173\u5185\u5BB9\u7EA6 52\u201359 \u5206\uFF0C\u9ED8\u8BA4 60\u3002", htmlFor: `${uid}-th`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberBox, { id: `${uid}-th`, field: "recallThreshold", value: draft.recallThreshold, unit: "\u5206", disabled: off || !draft.autoRecall, onChange: (v) => patch({ recallThreshold: v }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u53EC\u56DE\u8D85\u65F6", desc: "\u8D85\u8FC7\u8FD9\u4E2A\u65F6\u95F4\u5C31\u4E0D\u7B49\u4E86\uFF0C\u76F4\u63A5\u53D1\u9001\uFF08\u4E0D\u5F71\u54CD\u5BF9\u8BDD\uFF09\u3002\u56FD\u5185\u76F4\u8FDE\u4E00\u822C 0.5\u20132 \u79D2\u3002", htmlFor: `${uid}-to`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberBox, { id: `${uid}-to`, field: "recallTimeoutSec", value: draft.recallTimeoutSec, unit: "\u79D2", disabled: off || !draft.autoRecall, onChange: (v) => patch({ recallTimeoutSec: v }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "dsm-section-title", children: "\u4FDD\u5B58\uFF1A\u5BF9\u8BDD\u7ED3\u675F\u540E\u81EA\u52A8\u8BB0\u4F4F" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u4FDD\u5B58\u5BF9\u8BDD\u539F\u6587", desc: "\u6BCF\u8F6E\u5BF9\u8BDD\u7ED3\u675F\u7EA6 15 \u79D2\u540E\uFF0C\u628A\u6574\u6BB5\u5BF9\u8BDD\uFF08\u5DF2\u9690\u53BB\u7591\u4F3C\u5BC6\u94A5\uFF09\u4E0A\u4F20\u4E3A\u53EF\u68C0\u7D22\u7684\u7247\u6BB5\u3002\u540C\u4E00\u4F1A\u8BDD\u4F1A\u8986\u76D6\u66F4\u65B0\uFF0C\u4E0D\u4F1A\u91CD\u590D\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, { label: "\u4FDD\u5B58\u5BF9\u8BDD\u539F\u6587", checked: draft.captureConversations, disabled: off, onChange: (v) => patch({ captureConversations: v }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u7528 DSH \u6A21\u578B\u6574\u7406\u8BB0\u5FC6", desc: "\u5BF9\u8BDD\u505C\u4E0B\u4E00\u6BB5\u65F6\u95F4\u540E\uFF0C\u7528\u4E0B\u9762\u9009\u62E9\u7684\u6A21\u578B\u4ECE\u65B0\u5185\u5BB9\u91CC\u63D0\u70BC\u5173\u4E8E\u4F60\u7684\u957F\u671F\u4E8B\u5B9E\uFF0C\u5E76\u4E0E\u5DF2\u6709\u8BB0\u5FC6\u6BD4\u5BF9\u540E\u65B0\u589E\u3001\u66F4\u65B0\u6216\u5220\u9664\u3002\u6BCF\u6B21\u7EA6\u6D88\u8017\u51E0\u5343 token\u3002\u5173\u95ED\u540E\u6539\u7531 Supermemory \u670D\u52A1\u5668\u63D0\u53D6\uFF08\u5B9E\u6D4B\u514D\u8D39\u8D26\u6237\u4E0A\u5F88\u6162\u6216\u4E0D\u4EA7\u51FA\uFF09\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, { label: "\u7528 DSH \u6A21\u578B\u6574\u7406\u8BB0\u5FC6", checked: draft.modelExtraction, disabled: off || !draft.captureConversations, onChange: (v) => patch({ modelExtraction: v }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u6574\u7406\u7528\u7684\u6A21\u578B", desc: "\u5EFA\u8BAE\u9009\u4E00\u4E2A\u4FBF\u5B9C\u3001\u5FEB\u901F\u7684\u975E\u63A8\u7406\u6A21\u578B\uFF08\u5982 Flash \u7C7B\uFF09\u3002\u9ED8\u8BA4\u8DDF\u968F\u4F1A\u8BDD\u6A21\u578B\uFF1B\u5B83\u4E0D\u53EF\u7528\u65F6\u4F9D\u6B21\u6539\u7528 DSH \u9ED8\u8BA4\u6A21\u578B\u548C\u5176\u4ED6\u53EF\u7528\u6A21\u578B\u3002", htmlFor: `${uid}-model`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModelSelect, { id: `${uid}-model`, call, draft, patch, disabled: off || !draft.captureConversations || !draft.modelExtraction }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u505C\u4E0B\u591A\u4E45\u540E\u6574\u7406", desc: "\u5BF9\u8BDD\u505C\u4E0B\u8FD9\u4E48\u4E45\u6CA1\u6709\u65B0\u6D88\u606F\u624D\u6574\u7406\uFF0C\u907F\u514D\u6BCF\u8F6E\u90FD\u8C03\u7528\u6A21\u578B\u3002\u9000\u51FA DSH \u65F6\u6CA1\u6574\u7406\u5B8C\u7684\uFF0C\u4E0B\u6B21\u542F\u52A8\u540E\u81EA\u52A8\u8865\u4E0A\u3002", htmlFor: `${uid}-delay`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NumberBox, { id: `${uid}-delay`, field: "extractDelaySec", value: draft.extractDelaySec, unit: "\u79D2", disabled: off || !draft.captureConversations || !draft.modelExtraction, onChange: (v) => patch({ extractDelaySec: v }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "dsm-section-title", children: "\u9690\u79C1" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u5305\u542B\u52A9\u624B\u7684\u56DE\u7B54", desc: "\u5173\u95ED\u540E\u53EA\u4E0A\u4F20\u548C\u5206\u6790\u4F60\u81EA\u5DF1\u8BF4\u7684\u8BDD\uFF0C\u52A9\u624B\u7684\u56DE\u7B54\u4E0D\u51FA\u672C\u673A\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, { label: "\u5305\u542B\u52A9\u624B\u7684\u56DE\u7B54", checked: draft.captureAssistant, disabled: off, onChange: (v) => patch({ captureAssistant: v }) }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockRow, { title: "\u4E0D\u4F7F\u7528\u8BB0\u5FC6\u7684\u5DE5\u4F5C\u533A", htmlFor: `${uid}-ex`, desc: "\u6BCF\u884C\u4E00\u4E2A\u8DEF\u5F84\u6216\u8DEF\u5F84\u7247\u6BB5\uFF08\u4E0D\u533A\u5206\u5927\u5C0F\u5199\u548C\u659C\u6760\u65B9\u5411\uFF09\u3002\u5339\u914D\u7684\u5DE5\u4F5C\u533A\u91CC\u4E0D\u53EC\u56DE\u3001\u4E0D\u4FDD\u5B58\u3001\u4E0D\u6574\u7406\uFF0C\u8BB0\u5FC6\u5DE5\u5177\u4E5F\u4E0D\u53EF\u7528\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "textarea",
      {
        id: `${uid}-ex`,
        className: "dsm-input dsm-textarea",
        rows: 3,
        value: draft.excludeWorkspaces,
        disabled: off,
        spellCheck: false,
        placeholder: "\u4F8B\u5982\uFF1A\nC:/work/\u5BA2\u6237A\n\u673A\u5BC6",
        onChange: (e) => patch({ excludeWorkspaces: e.target.value })
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: "dsm-disclosure", "aria-expanded": advanced, onClick: () => setAdvanced((v) => !v), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-caret", "aria-hidden": "true", children: advanced ? "\u25BE" : "\u25B8" }),
      "\u9AD8\u7EA7\u8BBE\u7F6E"
    ] }),
    advanced ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Row, { title: "\u8BB0\u5FC6\u8303\u56F4", desc: scopeDesc, htmlFor: `${uid}-scope`, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { id: `${uid}-scope`, className: "dsm-select", value: draft.scope, disabled: off, onChange: (e) => patch({ scope: e.target.value }), children: SCOPES.map(([v, l]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: v, children: l }, v)) }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockRow, { title: "\u8BB0\u5FC6\u5E93\u540D\u79F0\uFF08\u5BB9\u5668\u6807\u7B7E\uFF09", htmlFor: `${uid}-tag`, desc: tagValid ? `Supermemory \u91CC\u7684\u5BB9\u5668\u6807\u7B7E\uFF0C\u9ED8\u8BA4 dsh_personal\u3002\u6539\u540D\u76F8\u5F53\u4E8E\u6362\u4E00\u4E2A\u65B0\u7684\u7A7A\u8BB0\u5FC6\u5E93\uFF0C\u65E7\u8BB0\u5FC6\u4ECD\u4FDD\u7559\u5728\u539F\u6807\u7B7E\u4E0B\u3002` : "\u53EA\u80FD\u5305\u542B\u5B57\u6BCD\u3001\u6570\u5B57\u3001-\u3001_ \u548C .\uFF0C\u6700\u591A 100 \u4E2A\u5B57\u7B26\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          id: `${uid}-tag`,
          className: cx("dsm-input", !tagValid && "is-invalid"),
          value: tagText,
          disabled: off,
          spellCheck: false,
          "aria-invalid": !tagValid,
          onChange: (e) => {
            setTagText(e.target.value);
            if (sanitizeTag(e.target.value)) patch({ containerTag: e.target.value.trim() });
          }
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockRow, { title: "\u670D\u52A1\u5668\u63D0\u53D6\u8BF4\u660E\uFF08entity context\uFF09", htmlFor: `${uid}-ec`, desc: "\u53EA\u5728\u5173\u95ED\u201C\u7528 DSH \u6A21\u578B\u6574\u7406\u8BB0\u5FC6\u201D\u3001\u6539\u7531 Supermemory \u670D\u52A1\u5668\u63D0\u53D6\u65F6\u4F7F\u7528\uFF0C\u544A\u8BC9\u670D\u52A1\u5668\u8BE5\u8BB0\u4F4F\u4EC0\u4E48\u3002\u6700\u591A 1500 \u5B57\u7B26\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "textarea",
        {
          id: `${uid}-ec`,
          className: "dsm-input dsm-textarea",
          rows: 4,
          value: draft.entityContext,
          disabled: off,
          maxLength: 1500,
          onChange: (e) => patch({ entityContext: e.target.value || DEFAULT_ENTITY_CONTEXT })
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BlockRow, { title: "\u63A5\u53E3\u5730\u5740", htmlFor: `${uid}-base`, desc: "\u7559\u7A7A\u4F7F\u7528\u5B98\u65B9\u5730\u5740 https://api.supermemory.ai\uFF1B\u53EA\u6709\u81EA\u5EFA\u6216\u4EE3\u7406\u65F6\u624D\u9700\u8981\u4FEE\u6539\u3002", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          id: `${uid}-base`,
          className: "dsm-input",
          value: draft.baseURL,
          disabled: off,
          placeholder: "https://api.supermemory.ai",
          spellCheck: false,
          onChange: (e) => patch({ baseURL: e.target.value })
        }
      ) })
    ] }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-foot", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Msg, { msg, fallback: dirty ? "\u6709\u672A\u4FDD\u5B58\u7684\u4FEE\u6539\uFF08\u4E0B\u65B9\u201C\u8BD5\u4E00\u8BD5\u201D\u4F1A\u4F7F\u7528\u5F53\u524D\u586B\u5199\u7684\u503C\uFF09" : "" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline", disabled: !writable || JSON.stringify(draft) === JSON.stringify(DEFAULT_SETTINGS), onClick: () => {
        setDraft(normalizeSettings(DEFAULT_SETTINGS));
        setMsg({ kind: "", text: "" });
      }, children: "\u6062\u590D\u9ED8\u8BA4" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline", disabled: !dirty || msg.kind === "busy", onClick: () => {
        setDraft(saved);
        setMsg({ kind: "", text: "" });
      }, children: "\u64A4\u9500" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-primary", disabled: !writable || !dirty || msg.kind === "busy", onClick: save, children: "\u4FDD\u5B58" })
    ] })
  ] });
}
function MemoryEditor({ initial, onSubmit, onCancel, submitText, showStatic }) {
  const uid = (0, import_react.useId)();
  const [text, setText] = (0, import_react.useState)(initial?.text ?? "");
  const [english, setEnglish] = (0, import_react.useState)(initial?.english ?? "");
  const [isStatic, setStatic] = (0, import_react.useState)(!!initial?.isStatic);
  const [msg, setMsg] = (0, import_react.useState)({ kind: "", text: "" });
  async function submit() {
    setMsg({ kind: "busy", text: "\u6B63\u5728\u4FDD\u5B58\u2026" });
    const r = await onSubmit({ memory: text.trim(), english: english.trim(), isStatic });
    if (r?.ok) {
      setMsg({ kind: "", text: "" });
      if (!initial) {
        setText("");
        setEnglish("");
        setStatic(false);
      }
    } else setMsg({ kind: "error", text: r?.message || "\u4FDD\u5B58\u5931\u8D25" });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-editor", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsm-sr", htmlFor: `${uid}-t`, children: "\u8BB0\u5FC6\u5185\u5BB9" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "textarea",
      {
        id: `${uid}-t`,
        className: "dsm-input dsm-textarea",
        rows: 2,
        maxLength: 1e3,
        value: text,
        placeholder: "\u4E00\u53E5\u5173\u4E8E\u4F60\u7684\u4E8B\u5B9E\uFF0C\u4F8B\u5982\uFF1A\u7528\u6237\u7684\u8BBA\u6587\u521D\u7A3F\u622A\u6B62\u65E5\u671F\u662F 2026-10-20\u3002",
        onChange: (e) => setText(e.target.value)
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsm-sr", htmlFor: `${uid}-e`, children: "\u82F1\u6587\u91CA\u4E49" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { id: `${uid}-e`, className: "dsm-input", value: english, maxLength: 400, placeholder: "\u82F1\u6587\u91CA\u4E49\uFF08\u53EF\u9009\uFF0C\u80FD\u63D0\u9AD8\u68C0\u7D22\u51C6\u786E\u5EA6\uFF1B\u4E0D\u586B\u4F1A\u81EA\u52A8\u52A0\u6807\u8BB0\uFF09", onChange: (e) => setEnglish(e.target.value) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-inline", children: [
      showStatic ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dsm-check", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: isStatic, onChange: (e) => setStatic(e.target.checked) }),
        "\u957F\u671F\u4E0D\u53D8\uFF08\u8EAB\u4EFD\u3001\u56FA\u5B9A\u504F\u597D\uFF09"
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Msg, { msg }),
      onCancel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline dsm-sm", onClick: onCancel, children: "\u53D6\u6D88" }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-primary dsm-sm", disabled: !text.trim() || msg.kind === "busy", onClick: submit, children: submitText })
    ] })
  ] });
}
function MemoryItem({ item, tag, call, onChanged }) {
  const [mode, setMode] = (0, import_react.useState)("view");
  const [msg, setMsg] = (0, import_react.useState)({ kind: "", text: "" });
  async function forget() {
    setMsg({ kind: "busy", text: "\u6B63\u5728\u5220\u9664\u2026" });
    const r = await call("forget", { tag, ids: [item.id] });
    if (r?.ok) onChanged({ removed: item.id });
    else {
      setMode("view");
      setMsg({ kind: "error", text: r?.message || "\u5220\u9664\u5931\u8D25" });
    }
  }
  if (mode === "edit") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { className: "dsm-mem", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      MemoryEditor,
      {
        initial: item,
        submitText: "\u4FDD\u5B58\u4FEE\u6539",
        onCancel: () => setMode("view"),
        onSubmit: async (v) => {
          const r = await call("update", { tag, id: item.id, memory: v.memory, english: v.english });
          if (r?.ok) {
            setMode("view");
            onChanged({ updated: true });
          }
          return r;
        }
      }
    ) });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: "dsm-mem", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-mem-main", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-mem-text", children: [
        item.kind === "chunk" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-badge", children: "\u5BF9\u8BDD\u7247\u6BB5" }) : null,
        item.isStatic ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-badge is-ok", children: "\u957F\u671F" }) : null,
        item.title ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsm-mem-title", children: [
          "\u300A",
          item.title,
          "\u300B"
        ] }) : null,
        item.text
      ] }),
      item.english ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsm-muted", children: item.english }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-muted", children: [
        item.updatedAt ? ago(item.updatedAt) : "",
        item.version > 1 ? ` \xB7 \u7B2C ${item.version} \u7248` : "",
        typeof item.similarity === "number" && item.similarity > 0 ? ` \xB7 \u76F8\u5173\u5EA6 ${Math.round(item.similarity * 100)}` : "",
        item.metadata?.via === "tool" ? " \xB7 \u6A21\u578B\u4FDD\u5B58" : item.metadata?.via === "settings" ? " \xB7 \u624B\u52A8\u6DFB\u52A0" : item.metadata?.source === "dsh" ? " \xB7 \u81EA\u52A8\u6574\u7406" : ""
      ] }),
      msg.text ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Msg, { msg }) : null
    ] }),
    item.kind !== "chunk" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsm-mem-actions", children: mode === "confirm" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-danger dsm-sm", disabled: msg.kind === "busy", onClick: forget, children: "\u786E\u8BA4\u5220\u9664" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline dsm-sm", onClick: () => setMode("view"), children: "\u53D6\u6D88" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-ghost dsm-sm", "aria-label": `\u7F16\u8F91\uFF1A${item.text}`, onClick: () => setMode("edit"), children: "\u7F16\u8F91" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-ghost dsm-sm", "aria-label": `\u5220\u9664\uFF1A${item.text}`, onClick: () => setMode("confirm"), children: "\u5220\u9664" })
    ] }) }) : null
  ] });
}
function LibrarySection({ call, status }) {
  const uid = (0, import_react.useId)();
  const current = status?.settings?.containerTag;
  const [tags, setTags] = (0, import_react.useState)({ phase: "idle", list: [] });
  const [tag, setTag] = (0, import_react.useState)("");
  const [view, setView] = (0, import_react.useState)("list");
  const [q, setQ] = (0, import_react.useState)("");
  const [page, setPage] = (0, import_react.useState)(1);
  const [data, setData] = (0, import_react.useState)({ phase: "idle" });
  const [adding, setAdding] = (0, import_react.useState)(false);
  const [nonce, setNonce] = (0, import_react.useState)(0);
  const configured = !!status?.key?.configured;
  const loadTags = (0, import_react.useCallback)(async () => {
    setTags((t) => ({ ...t, phase: "busy" }));
    const r = await call("tags", {});
    setTags(r?.ok ? { phase: "ok", list: r.tags } : { phase: "error", list: [], message: r?.message });
  }, [call]);
  (0, import_react.useEffect)(() => {
    if (configured) loadTags();
  }, [configured, loadTags]);
  (0, import_react.useEffect)(() => {
    if (current && !tag) setTag(current);
  }, [current, tag]);
  const activeTag = tag || current;
  (0, import_react.useEffect)(() => {
    if (!configured || !activeTag) return;
    let alive = true;
    setData((d) => ({ ...d, phase: "busy" }));
    const req = view === "profile" ? call("profile", { tag: activeTag }) : view === "search" ? call("search", { tag: activeTag, q, chunks: true, threshold: 0.3 }) : call("memories", { tag: activeTag, page, limit: 20 });
    req.then((r) => {
      if (alive) setData(r?.ok ? { phase: "ok", ...r } : { phase: "error", message: r?.message || "\u8BFB\u53D6\u5931\u8D25" });
    });
    return () => {
      alive = false;
    };
  }, [configured, activeTag, view, page, nonce, call]);
  const options = (0, import_react.useMemo)(() => {
    const list = [...tags.list];
    if (activeTag && !list.some((t) => t.tag === activeTag)) list.unshift({ tag: activeTag, memoryCount: 0, documentCount: 0, ours: true, workspace: "" });
    return list.sort((a, b) => b.ours - a.ours || (b.tag === current) - (a.tag === current) || a.tag.localeCompare(b.tag));
  }, [tags.list, activeTag, current]);
  if (!configured) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "dsm-section-title", children: "\u8BB0\u5FC6\u5E93" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsm-muted dsm-pad", children: "\u586B\u5199 API key \u540E\u53EF\u4EE5\u5728\u8FD9\u91CC\u67E5\u770B\u3001\u641C\u7D22\u3001\u6DFB\u52A0\u3001\u4FEE\u6539\u548C\u5220\u9664\u8BB0\u5FC6\u3002" })
  ] });
  const items = view === "search" ? data.results : view === "list" ? data.entries : null;
  const runSearch = () => {
    if (q.trim()) {
      setView("search");
      setNonce((n) => n + 1);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "dsm-section-title", children: "\u8BB0\u5FC6\u5E93" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsm-sr", htmlFor: `${uid}-tag`, children: "\u8BB0\u5FC6\u5E93" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { id: `${uid}-tag`, className: "dsm-select", value: activeTag, onChange: (e) => {
        setTag(e.target.value);
        setPage(1);
      }, children: options.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", { value: t.tag, children: [
        t.tag === current ? "\u2605 " : "",
        t.workspace ? `\u5DE5\u4F5C\u533A\u300C${t.workspace}\u300D` : t.tag,
        "\uFF08",
        t.memoryCount,
        " \u6761\uFF09"
      ] }, t.tag)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsm-seg", role: "tablist", "aria-label": "\u89C6\u56FE", children: [["list", "\u5168\u90E8\u8BB0\u5FC6"], ["profile", "\u7528\u6237\u753B\u50CF"]].map(([v, l]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", role: "tab", "aria-selected": view === v, className: cx("dsm-seg-btn", view === v && "is-on"), onClick: () => {
        setView(v);
        setPage(1);
      }, children: l }, v)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline dsm-sm", onClick: () => {
        loadTags();
        setNonce((n) => n + 1);
      }, disabled: data.phase === "busy", children: "\u5237\u65B0" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline dsm-sm", "aria-expanded": adding, onClick: () => setAdding((v) => !v), children: adding ? "\u6536\u8D77" : "\u6DFB\u52A0\u8BB0\u5FC6" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-inline dsm-search", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dsm-sr", htmlFor: `${uid}-q`, children: "\u641C\u7D22\u8BB0\u5FC6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          id: `${uid}-q`,
          className: "dsm-input",
          value: q,
          placeholder: "\u641C\u7D22\u8BB0\u5FC6\u548C\u5BF9\u8BDD\u7247\u6BB5\uFF08\u652F\u6301\u4E2D\u6587\u3001\u82F1\u6587\uFF09",
          maxLength: 500,
          onChange: (e) => setQ(e.target.value),
          onKeyDown: (e) => {
            if (e.key === "Enter") runSearch();
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline", disabled: !q.trim(), onClick: runSearch, children: "\u641C\u7D22" }),
      view === "search" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-ghost", onClick: () => {
        setView("list");
        setQ("");
      }, children: "\u6E05\u9664" }) : null
    ] }),
    adding ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      MemoryEditor,
      {
        submitText: "\u6DFB\u52A0",
        showStatic: true,
        onCancel: () => setAdding(false),
        onSubmit: async (v) => {
          const r = await call("add", { tag: activeTag, ...v });
          if (r?.ok) {
            setAdding(false);
            setView("list");
            setPage(1);
            setNonce((n) => n + 1);
            loadTags();
          }
          return r;
        }
      }
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-list-wrap", "aria-busy": data.phase === "busy", children: [
      data.phase === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsm-msg is-error", role: "alert", children: data.message }) : null,
      data.phase === "busy" && !items && view !== "profile" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsm-muted dsm-pad", children: "\u6B63\u5728\u8BFB\u53D6\u2026" }) : null,
      view === "profile" && data.phase === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-profile", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsm-muted", children: "Supermemory \u6839\u636E\u5DF2\u6709\u8BB0\u5FC6\u81EA\u52A8\u6C47\u603B\u7684\u753B\u50CF\u3002\u957F\u671F\u90E8\u5206\u6765\u81EA\u6807\u8BB0\u4E3A\u201C\u957F\u671F\u4E0D\u53D8\u201D\u7684\u8BB0\u5FC6\uFF0C\u8FD1\u671F\u90E8\u5206\u662F\u6700\u8FD1\u7684\u52A8\u6001\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h5", { children: "\u957F\u671F" }),
        data.static?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: data.static.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: t }, i)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsm-muted", children: "\u6682\u65E0" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h5", { children: "\u8FD1\u671F" }),
        data.dynamic?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { children: data.dynamic.map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: t }, i)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsm-muted", children: "\u6682\u65E0" })
      ] }) : null,
      items ? items.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "dsm-mems", children: items.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        MemoryItem,
        {
          item: it,
          tag: activeTag,
          call,
          onChanged: (c) => {
            if (c.removed) setData((d) => ({ ...d, entries: d.entries?.filter((x) => x.id !== c.removed), results: d.results?.filter((x) => x.id !== c.removed) }));
            else setNonce((n) => n + 1);
          }
        },
        it.id
      )) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsm-muted dsm-pad", children: view === "search" ? "\u6CA1\u6709\u627E\u5230\u76F8\u5173\u5185\u5BB9\u3002" : "\u8FD9\u4E2A\u8BB0\u5FC6\u5E93\u8FD8\u662F\u7A7A\u7684\u3002\u548C\u6A21\u578B\u804A\u51E0\u8F6E\uFF0C\u6216\u8005\u8BF4\u201C\u8BB0\u4F4F\u2026\u2026\u201D\uFF0C\u8BB0\u5FC6\u5C31\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC\u3002" }) : null,
      view === "list" && data.phase === "ok" && data.totalPages > 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-pager", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline dsm-sm", disabled: page <= 1, onClick: () => setPage((p) => p - 1), children: "\u4E0A\u4E00\u9875" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsm-muted", children: [
          "\u7B2C ",
          data.page,
          " / ",
          data.totalPages,
          " \u9875\uFF0C\u5171 ",
          data.total,
          " \u6761"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline dsm-sm", disabled: page >= data.totalPages, onClick: () => setPage((p) => p + 1), children: "\u4E0B\u4E00\u9875" })
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ClearTag, { call, tag: activeTag, count: options.find((t) => t.tag === activeTag), onCleared: () => {
      setPage(1);
      setView("list");
      setNonce((n) => n + 1);
      loadTags();
    } })
  ] });
}
function ClearTag({ call, tag, count, onCleared }) {
  const [phase, setPhase] = (0, import_react.useState)("idle");
  const [msg, setMsg] = (0, import_react.useState)({ kind: "", text: "" });
  (0, import_react.useEffect)(() => {
    setPhase("idle");
    setMsg({ kind: "", text: "" });
  }, [tag]);
  async function clear() {
    setPhase("busy");
    setMsg({ kind: "busy", text: "\u6B63\u5728\u6E05\u7A7A\u2026" });
    const r = await call("clearTag", { tag, confirm: tag });
    setPhase("idle");
    if (r?.ok) {
      setMsg({ kind: "ok", text: `\u5DF2\u6E05\u7A7A\u300C${tag}\u300D` });
      onCleared();
    } else setMsg({ kind: "error", text: r?.message || "\u6E05\u7A7A\u5931\u8D25" });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dsm-danger-zone", children: phase === "idle" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Msg, { msg, fallback: "\u6E05\u7A7A\u4F1A\u6C38\u4E45\u5220\u9664\u8FD9\u4E2A\u8BB0\u5FC6\u5E93\u91CC\u7684\u5168\u90E8\u8BB0\u5FC6\u548C\u5DF2\u4FDD\u5B58\u7684\u5BF9\u8BDD\u539F\u6587\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline dsm-sm", disabled: !tag, onClick: () => {
      setMsg({ kind: "", text: "" });
      setPhase("confirm");
    }, children: "\u6E05\u7A7A\u8BB0\u5FC6\u5E93\u2026" })
  ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dsm-msg is-error", role: "alert", children: [
      "\u786E\u5B9A\u6E05\u7A7A\u300C",
      tag,
      "\u300D\u5417\uFF1F",
      count ? `\u5176\u4E2D ${count.memoryCount} \u6761\u8BB0\u5FC6\u3001${count.documentCount} \u4EFD\u6587\u6863` : "\u5176\u4E2D\u5168\u90E8\u5185\u5BB9",
      "\u5C06\u88AB\u6C38\u4E45\u5220\u9664\uFF0C\u65E0\u6CD5\u6062\u590D\u3002"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-outline dsm-sm", disabled: phase === "busy", onClick: () => setPhase("idle"), children: "\u53D6\u6D88" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-danger dsm-sm", disabled: phase === "busy", onClick: clear, children: phase === "busy" ? "\u6B63\u5728\u6E05\u7A7A\u2026" : "\u786E\u8BA4\u6E05\u7A7A" })
  ] }) });
}
function PreviewSection({ call, draft, configured }) {
  const uid = (0, import_react.useId)();
  const [q, setQ] = (0, import_react.useState)("\u6211\u6700\u8FD1\u5728\u5FD9\u4EC0\u4E48\uFF1F");
  const [state, setState] = (0, import_react.useState)({ phase: "idle" });
  const ctrl = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => () => ctrl.current?.abort(), []);
  async function run() {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState({ phase: "busy" });
    const r = await call("preview", { q, settings: draft }, c.signal);
    if (c.signal.aborted) return;
    setState(r?.ok ? { phase: "done", ...r } : { phase: "error", message: r?.message || "\u53EC\u56DE\u5931\u8D25" });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "dsm-section-title", children: "\u8BD5\u4E00\u8BD5" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BlockRow, { title: "\u6A21\u62DF\u4E00\u6B21\u63D0\u95EE", htmlFor: `${uid}-q`, desc: "\u7528\u5F53\u524D\u586B\u5199\u7684\u53EC\u56DE\u8BBE\u7F6E\u68C0\u7D22\u4E00\u6B21\uFF0C\u770B\u770B\u6A21\u578B\u4F1A\u6536\u5230\u54EA\u4E9B\u8BB0\u5FC6\uFF08\u4E0D\u4F1A\u53D1\u7ED9\u6A21\u578B\uFF0C\u4E5F\u4E0D\u4F1A\u5199\u5165\u4EFB\u4F55\u4E1C\u897F\uFF09\u3002", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-inline", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            id: `${uid}-q`,
            className: "dsm-input",
            value: q,
            maxLength: 500,
            onChange: (e) => setQ(e.target.value),
            disabled: !configured,
            onKeyDown: (e) => {
              if (e.key === "Enter" && q.trim() && state.phase !== "busy") run();
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dsm-btn dsm-primary", disabled: !configured || !q.trim() || state.phase === "busy", onClick: run, children: state.phase === "busy" ? "\u68C0\u7D22\u4E2D\u2026" : "\u8BD5\u4E00\u8BD5" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { role: "status", "aria-live": "polite", children: [
        state.phase === "error" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-msg is-error", children: state.message }) : null,
        state.phase === "done" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dsm-muted", children: [
            state.summary || "\u6CA1\u6709\u53EC\u56DE\u4EFB\u4F55\u5185\u5BB9\uFF08\u53EF\u4EE5\u8BD5\u7740\u964D\u4F4E\u76F8\u5173\u5EA6\u95E8\u69DB\uFF09",
            " \xB7 ",
            (state.ms / 1e3).toFixed(1),
            " \u79D2 \xB7 \u8BB0\u5FC6\u5E93 ",
            state.tags.join("\u3001"),
            state.warning ? ` \xB7 ${state.warning}` : ""
          ] }),
          state.text ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { className: "dsm-pre", children: state.text }) : null
        ] }) : null
      ] })
    ] })
  ] });
}
function ActivitySection({ status }) {
  const list = status?.activity || [];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { className: "dsm-section-title", children: "\u6700\u8FD1\u6D3B\u52A8" }),
    list.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", { className: "dsm-activity", children: list.slice(0, 20).map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { className: cx(!a.ok && "is-error"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-act-kind", children: KIND_LABEL[a.kind] || a.kind }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-act-text", children: a.text }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dsm-act-time", children: ago(a.at) })
    ] }, `${a.at}-${i}`)) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsm-muted dsm-pad", children: "\u672C\u6B21\u542F\u52A8\u4EE5\u6765\u8FD8\u6CA1\u6709\u6D3B\u52A8\u3002\u53D1\u4E00\u6761\u6D88\u606F\u8BD5\u8BD5\u3002" })
  ] });
}
function SupermemoryPage({ form, call }) {
  const snap = (0, import_react.useSyncExternalStore)(form.subscribe, form.getSnapshot, form.getSnapshot);
  const saved = (0, import_react.useMemo)(() => normalizeSettings(snap.value), [snap.value]);
  const [draft, setDraft] = (0, import_react.useState)(saved);
  const [status, setStatus] = (0, import_react.useState)(null);
  const touched = (0, import_react.useRef)(false);
  const lastSaved = (0, import_react.useRef)(saved);
  (0, import_react.useEffect)(() => {
    if (!touched.current || JSON.stringify(draft) === JSON.stringify(lastSaved.current)) setDraft(saved);
    lastSaved.current = saved;
  }, [saved]);
  const refresh = (0, import_react.useCallback)(async (next) => {
    const r = next?.ok ? next : await call("status", {});
    setStatus(r?.ok ? r : { ok: false, message: r?.message || "\u65E0\u6CD5\u8BFB\u53D6 Supermemory \u63D2\u4EF6\u72B6\u6001" });
  }, [call]);
  (0, import_react.useEffect)(() => {
    refresh();
    const t = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState !== "hidden") refresh();
    }, 8e3);
    return () => clearInterval(t);
  }, [refresh]);
  const writable = snap.status === "ready" && snap.writable;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dsm-page", "data-dsh-supermemory": "", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusSection, { call, status, refresh }),
    snap.status === "unavailable" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dsm-msg is-error", role: "alert", children: "\u8BBE\u7F6E\u547D\u540D\u7A7A\u95F4\u4E0D\u53EF\u7528\uFF0C\u5F53\u524D\u53EA\u80FD\u4F7F\u7528\u9ED8\u8BA4\u8BBE\u7F6E\u3002" }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsSection, { call, form, draft, setDraft: (v) => {
      touched.current = true;
      setDraft(v);
    }, saved, writable }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LibrarySection, { call, status }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PreviewSection, { call, draft, configured: !!status?.key?.configured }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivitySection, { status })
  ] });
}
function SupermemoryPluginItem({ view, smForm, smCall }) {
  if (view !== "page") return SUMMARY;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SupermemoryPage, { form: smForm, call: smCall });
}

// src/client.jsx
var inject = ["slots", "configForms"];
function apply(ctx) {
  const raw = ctx.configForms.get(ENTRY_ID);
  const form = {
    subscribe: (listener) => raw.subscribe(listener),
    getSnapshot: () => raw.getSnapshot(),
    set: (field, value) => raw.set(field, value)
  };
  const call = createHttpCall((url, init) => fetch(url, init));
  ctx.effect(() => {
    const style = document.createElement("style");
    style.dataset.plugin = PACKAGE_ID;
    style.textContent = ui_default;
    document.head.appendChild(style);
    return () => style.remove();
  }, "supermemory: styles");
  ctx.slots.inject("plugins.item", () => ctx.slots.register({
    name: "plugins.item",
    id: ENTRY_ID,
    order: 45,
    label: "Supermemory \u957F\u671F\u8BB0\u5FC6",
    inject: () => ({ smForm: form, smCall: call })
  }, SupermemoryPluginItem));
}

return module.exports;}});
