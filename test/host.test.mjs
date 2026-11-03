// Host 行为测试：内存版 Supermemory + 假模型 + 假 DSH 服务，不触网。
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

const HOME = homedir().replace(/\\/g, '/');
const SCHEMASTERY = [
  process.env.DSH_SCHEMASTERY,
  `${HOME}/AppData/Local/Programs/DeepSeek Harness/resources/app/dsh/node_modules/@deepseek-ai/schemastery/lib/index.mjs`,
  `${HOME}/.dsh/profiles/web/node_modules/@deepseek-ai/schemastery/lib/index.mjs`,
  `${HOME}/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/schemastery/lib/index.mjs`,
  `${HOME}/.dsh/profiles/desktop/node_modules/@deepseek-ai/schemastery/lib/index.mjs`,
].find(p => p && existsSync(p));
registerHooks({ resolve(spec, ctx, next) { return spec === '@deepseek-ai/schemastery' ? { url: pathToFileURL(SCHEMASTERY).href, shortCircuit: true } : next(spec, ctx); } });
const { createRuntime, createApi, PROMPT_SECTION } = await import('../src/host.mjs');
const { KEY_REF, SOURCE_KIND } = await import('../src/core.mjs');

const KEY = 'sm_TESTKEY_abcdefghijklmnopqrstuvwxyz0123456789';

/** 内存版 Supermemory：记录请求、校验 Bearer key。 */
function fakeSupermemory({ failWith } = {}) {
  const memories = []; const docs = new Map(); const requests = []; let n = 0;
  const res = (status, body) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
  async function fetchImpl(url, init) {
    const u = new URL(url); const body = init.body ? JSON.parse(init.body) : undefined;
    requests.push({ method: init.method, path: u.pathname, body, auth: init.headers.authorization });
    if (failWith) { if (failWith === 'network') throw Object.assign(new TypeError('fetch failed'), { cause: { code: 'ECONNRESET ' + KEY } }); return res(failWith, { error: 'bad ' + KEY }); }
    if (init.headers.authorization !== `Bearer ${KEY}`) return res(401, { error: 'Unauthorized' });
    const inTags = tags => memories.filter(m => !m.forgotten && tags.includes(m.tag));
    switch (`${init.method} ${u.pathname}`) {
      case 'POST /v4/search': {
        // 模拟 Supermemory 的时间过滤：查询带时间说法时，没有对应时间信息的记忆全部被滤掉。
        if (/最近|上周|recently/.test(body.q)) return res(200, { results: [], total: 0, timing: 5 });
        const tags = body.containerTags ?? [body.containerTag];
        const words = body.q.split(/[\s，。？]+/).filter(Boolean);
        const results = inTags(tags).filter(m => words.some(w => m.memory.includes(w)) || body.q.includes('全部')).map(m => ({ id: m.id, memory: m.memory, metadata: m.metadata, updatedAt: '2026-10-01T00:00:00Z', similarity: 0.7 }));
        if (body.searchMode === 'hybrid') for (const d of docs.values()) if (tags.includes(d.containerTag) && words.some(w => d.content.includes(w))) results.push({ id: 'chunk_' + d.customId, chunk: d.content.slice(0, 80), metadata: d.metadata, updatedAt: '2026-10-01T00:00:00Z', similarity: 0.65 });
        return res(200, { results: results.slice(0, body.limit), total: results.length, timing: 5 });
      }
      case 'POST /v4/profile': return res(200, { profile: { static: inTags([body.containerTag]).filter(m => m.isStatic).map(m => m.memory), dynamic: [] } });
      case 'POST /v4/memories': {
        const out = body.memories.map(m => { const e = { id: `m${++n}`, memory: m.content, isStatic: !!m.isStatic, metadata: m.metadata ?? null, tag: body.containerTag, createdAt: '2026-10-02T00:00:00Z', version: 1 }; memories.push(e); return e; });
        return res(201, { documentId: null, memories: out });
      }
      case 'PATCH /v4/memories': {
        const m = memories.find(x => x.id === body.id && x.tag === body.containerTag && !x.forgotten);
        if (!m) return res(404, { error: 'Memory not found' });
        m.forgotten = true; const e = { ...m, id: `m${++n}`, memory: body.newContent, version: m.version + 1, forgotten: false }; memories.push(e);
        return res(200, { id: e.id, memory: e.memory, version: e.version });
      }
      case 'POST /v4/memories/forget-matching': {
        let count = 0; for (const m of memories) if (body.ids.includes(m.id) && m.tag === body.containerTag && !m.forgotten) { m.forgotten = true; count++; }
        return res(200, { dryRun: false, count, forgetBatchId: 'b', summary: '' });
      }
      case 'POST /v4/memories/list': {
        const list = inTags(body.containerTags).map(m => ({ ...m, isForgotten: false, updatedAt: '2026-10-01T00:00:00Z' }));
        return res(200, { memoryEntries: list, pagination: { currentPage: 1, limit: body.limit, totalItems: list.length, totalPages: 1 } });
      }
      case 'GET /v3/container-tags/list': {
        const tags = [...new Set([...memories.map(m => m.tag), ...[...docs.values()].map(d => d.containerTag)])];
        return res(200, tags.map(t => ({ containerTag: t, name: t, memoryCount: inTags([t]).length, documentCount: [...docs.values()].filter(d => d.containerTag === t).length, lastActivityAt: null })));
      }
      case 'POST /v3/documents': docs.set(body.customId, body); return res(200, { id: 'doc_' + body.customId, status: 'queued' });
      default: if (init.method === 'DELETE' && u.pathname.startsWith('/v3/container-tags/')) { const t = decodeURIComponent(u.pathname.split('/').pop()); for (const m of memories) if (m.tag === t) m.forgotten = true; for (const [k, d] of docs) if (d.containerTag === t) docs.delete(k); return res(200, { success: true }); }
    }
    return res(404, { error: 'no route ' + u.pathname });
  }
  return { fetchImpl, memories, docs, requests };
}

function fakeLlm(outputs = []) {
  const calls = [];
  return {
    calls,
    listProviders: () => [{ id: 'cheap', name: 'Cheap' }, { id: 'broken', name: 'Broken' }],
    listModels: async id => (id === 'cheap' ? [{ id: 'flash', name: 'Flash' }] : [{ id: 'x', name: 'X' }]),
    stream(req) {
      calls.push(req);
      const out = req.provider === 'broken' ? null : outputs.shift() ?? '{"operations":[]}';
      return (async function* () {
        if (out === null) { yield { type: 'finish', reason: { kind: 'error', failure: { message: '401 invalid key' } } }; return; }
        yield { type: 'text-delta', index: 0, text: out };
        yield { type: 'finish', reason: { kind: 'stop' } };
      })();
    },
  };
}

function makeCtx({ key = KEY, settings = {}, llm = fakeLlm(), roots } = {}) {
  const store = new Map(key ? [[KEY_REF, key]] : []);
  const credentials = {
    resolve: async ref => (store.has(ref) ? { value: store.get(ref) } : undefined),
    describe: async ref => ({ configured: store.has(ref), writable: true, source: store.has(ref) ? 'file' : null }),
    set: async (ref, v) => { store.set(ref, v); }, unset: async ref => { store.delete(ref); },
  };
  const listeners = {}, routes = new Map(), toolMap = new Map(), sections = [], disposers = [], warnings = [];
  const ctx = {
    store, listeners, routes, toolMap, sections, disposers, warnings, llm,
    get: name => ({ credentials, agents: ctx.agents })[name],
    agents: { roots: () => roots ?? [] },
    logger: { warn: m => warnings.push(m) },
    effect: fn => { disposers.push(fn()); },
    on: (name, fn) => { (listeners[name] ??= []).push(fn); },
    connection: { fetch: { register: r => routes.set(r.path, r) } },
    tools: { register: t => toolMap.set(t.name, t) },
    systemPrompt: { section: s => sections.push(s) },
    inject: () => {},
  };
  const config = Object.fromEntries(Object.entries(settings).map(([k, v]) => [k, { get: () => v }]));
  return { ctx, config };
}

function setup(opts = {}) {
  const sm = opts.sm ?? fakeSupermemory();
  const { ctx, config } = makeCtx(opts);
  const timers = [];
  const rt = createRuntime(ctx, config, {
    fetchImpl: sm.fetchImpl, stateFile: join(mkdtempSync(join(tmpdir(), 'dsm-')), 'state.json'),
    setTimer: (fn, ms) => { const t = { fn, ms, cancelled: false }; timers.push(t); return t; },
    clearTimer: t => { if (t) t.cancelled = true; },
    resumeDelayMs: 1,
  });
  const fire = async ms => { for (const t of timers.filter(t => !t.cancelled && !t.fired && (ms === undefined || t.ms === ms))) { t.fired = true; await t.fn(); } };
  const route = async (endpoint, payload = {}) => (await ctx.routes.get(`/api/dsh-supermemory.${endpoint}`).fetch(new Request('http://h/x', { method: 'POST', body: JSON.stringify(payload) }))).json();
  return { sm, ctx, rt, timers, fire, route };
}

function makeAgent({ id = 'session-1', cwd = 'C:/proj/thesis', events = [], parentSession } = {}) {
  return { session: { id, header: { id, cwd, ...(parentSession ? { parentSession } : {}) }, inheritedEventCount: 0, events, snapshotEvents() { return Object.freeze([...this.events]); } } };
}
const um = (text, kind = 'user') => ({ id: 'u' + Math.random(), role: 'user', source: { kind }, content: [{ type: 'text', text }] });
const evUser = text => ({ type: 'user/message', data: { source: { kind: 'user' }, content: [{ type: 'text', text }] } });
const evAsst = text => ({ type: 'assistant/message', data: { message: { content: [{ type: 'text', text }] } } });
const preStep = async (ctx, payload, decision = { kind: 'enter', messages: payload.messages }) => ctx.listeners['agent/pre-step'][0]({ signal: new AbortController().signal, turn: 1, step: 1, ...payload }, async () => decision);

test('registration: 14 routes, 3 tools, prompt section, two agent hooks', () => {
  const { ctx } = setup();
  assert.equal(ctx.routes.size, 14);
  assert.deepEqual([...ctx.toolMap.keys()], ['memory_search', 'memory_save', 'memory_forget']);
  for (const t of ctx.toolMap.values()) { assert.equal(t.parameters.type, 'object'); assert.equal(typeof t.execute, 'function'); assert.deepEqual(t.output.render({}, { text: 'hi' }), [{ type: 'text', text: 'hi' }]); }
  assert.equal(ctx.sections[0].name, 'tool:supermemory'); assert.equal(ctx.sections[0].text(), PROMPT_SECTION);
  assert.deepEqual(Object.keys(ctx.listeners).sort(), ['agent/pre-step', 'agent/turn-stopping']);
  const off = setup({ settings: { enabled: false } });
  assert.equal(off.ctx.sections[0].text(), '');
});

test('pre-step recall appends one frozen notice message; profile only once per session', async () => {
  const agent = makeAgent();
  const { sm, ctx } = setup({ roots: [agent] });
  sm.memories.push({ id: 'p1', memory: '用户叫小明 | EN: The user is Ming', isStatic: true, tag: 'dsh_personal' }, { id: 'p2', memory: '用户的论文截止日期是 2026-10-20 | EN: thesis due', tag: 'dsh_personal' });
  const msg = um('论文 什么时候 截止');
  const d = await preStep(ctx, { agent, messages: [msg] });
  assert.equal(d.messages.length, 2); assert.equal(d.messages[0], msg);
  const injected = d.messages[1];
  assert.ok(Object.isFrozen(injected) && Object.isFrozen(injected.content[0]));
  assert.equal(injected.role, 'user'); assert.equal(injected.source.kind, SOURCE_KIND); assert.equal(injected.source.form, 'notice');
  assert.match(injected.source.summary, /^Supermemory：召回画像 1 条、记忆 1 条/);
  assert.match(injected.content[0].text, /用户叫小明/); assert.match(injected.content[0].text, /截止日期是 2026-10-20/); assert.ok(!injected.content[0].text.includes('EN:'));
  const search = sm.requests.find(r => r.path === '/v4/search');
  assert.deepEqual(search.body.containerTags, ['dsh_personal']); assert.equal(search.body.threshold, 0.6); assert.equal(search.body.searchMode, 'hybrid');
  // 第二轮：会话里已有注入过的内容 → 不再请求画像，也不重复同一条记忆。
  agent.session.events.push({ type: 'user/message', data: injected });
  const before = sm.requests.length;
  const d2 = await preStep(ctx, { agent, messages: [um('论文 截止')] });
  assert.equal(d2.messages.length, 1);
  assert.ok(!sm.requests.slice(before).some(r => r.path === '/v4/profile'));
});

test('pre-step does nothing for subagents, disabled, no key, excluded workspace, no user text, or reject', async () => {
  const root = makeAgent(), child = makeAgent({ id: 'child' });
  const cases = [
    [{ roots: [root] }, child, [um('你好啊')]],
    [{ roots: [root], settings: { enabled: false } }, root, [um('你好啊')]],
    [{ roots: [root], settings: { autoRecall: false } }, root, [um('你好啊')]],
    [{ roots: [root], key: '' }, root, [um('你好啊')]],
    [{ roots: [root], settings: { excludeWorkspaces: 'proj/THESIS' } }, root, [um('你好啊')]],
    [{ roots: [root] }, root, [um('ctx', 'time-context')]],
  ];
  for (const [opts, agent, messages] of cases) {
    const { sm, ctx } = setup(opts);
    const d = await preStep(ctx, { agent, messages });
    assert.equal(d.messages.length, messages.length, JSON.stringify(opts));
    assert.equal(sm.requests.length, 0, JSON.stringify(opts));
  }
  const { ctx } = setup({ roots: [root] });
  assert.deepEqual(await preStep(ctx, { agent: root, messages: [um('你好')] }, { kind: 'reject' }), { kind: 'reject' });
});

test('pre-step fails open and never leaks the key', async () => {
  const agent = makeAgent();
  for (const failWith of ['network', 500, 401]) {
    const { ctx, rt } = setup({ roots: [agent], sm: fakeSupermemory({ failWith }) });
    const d = await preStep(ctx, { agent, messages: [um('你好')] });
    assert.equal(d.messages.length, 1);
    assert.equal(rt.activity[0].ok, false);
    assert.ok(!JSON.stringify(rt.activity).includes(KEY), 'key leaked into activity');
    assert.ok(!ctx.warnings.join('\n').includes(KEY), 'key leaked into logs');
  }
});

test('turn end uploads a masked transcript (debounced, deduped) and model extraction writes memories', async () => {
  const agent = makeAgent({ events: [
    { type: 'request/header', data: { header: { config: { provider: 'broken', model: 'x' } } } },
    { type: 'session/title', data: { title: '论文规划' } },
    evUser('我是浙大的研二学生，论文初稿 10 月 20 日交，我的 key 是 sk-abcdefghijklmnop1234'), evAsst('好的，记下了。'),
  ] });
  const llm = fakeLlm(['{"operations":[{"op":"add","memory":"用户是浙江大学研二学生","english":"The user is a 2nd-year master student at ZJU","permanent":true},{"op":"add","memory":"用户的论文初稿截止日期是 2026-10-20"}]}']);
  const { sm, ctx, rt, timers, fire } = setup({ roots: [agent], llm });
  const stop = ctx.listeners['agent/turn-stopping'][0];
  stop({ agent, turn: 1 }); stop({ agent, turn: 1 });
  assert.equal(timers.filter(t => !t.cancelled && t.ms === 15000).length, 1, 'upload debounced');
  assert.equal(timers.filter(t => !t.cancelled && t.ms === 90000).length, 1, 'extraction debounced');
  await fire(15000);
  const doc = sm.docs.get('dsh_session-1');
  assert.equal(doc.taskType, 'superrag'); assert.equal(doc.containerTag, 'dsh_personal');
  assert.equal(doc.metadata.sessionId, 'session-1'); assert.equal(doc.metadata.title, '论文规划'); assert.equal(doc.metadata.workspace, 'thesis');
  assert.ok(!doc.content.includes('sk-abcdefghijklmnop1234')); assert.match(doc.content, /\[已隐去\]/); assert.match(doc.content, /assistant: 好的/);
  // 内容没变时不重复上传。
  stop({ agent, turn: 1 }); await fire(15000);
  assert.equal(sm.requests.filter(r => r.path === '/v3/documents').length, 1);
  await fire(90000);
  // 会话模型 broken 失败后改用 cheap/flash。
  assert.deepEqual(llm.calls.map(c => c.provider), ['broken', 'cheap']);
  assert.ok(!llm.calls[1].messages[0].content[0].text.includes('sk-abcdefghijklmnop1234'));
  assert.deepEqual(sm.memories.map(m => [m.memory, m.isStatic]), [
    ['用户是浙江大学研二学生 | EN: The user is a 2nd-year master student at ZJU', true],
    ['用户的论文初稿截止日期是 2026-10-20 [memory]', false],
  ]);
  assert.ok(sm.memories.every(m => /[A-Za-z]/.test(m.memory)), 'every stored memory has Latin letters');
  assert.equal(rt.stats.added, 2); assert.equal(rt.activity[0].kind, 'extract'); assert.match(rt.activity[0].text, /新增 2/);
  // 没有新内容时不再调用模型。
  assert.deepEqual(await rt.extractSession('session-1'), { skipped: 'nothing-new' });
  // 新的一轮：模型要求更新和删除已有记忆。
  agent.session.events.push(evUser('更正一下：论文初稿推迟到 10 月 27 日了，另外 研二学生 这条已经不对了'));
  const [m1, m2] = sm.memories;
  llm.calls.length = 0;
  const outputs = [`{"operations":[{"op":"update","id":"${m2.id}","memory":"用户的论文初稿截止日期推迟到 2026-10-27","english":"Draft deadline moved to 2026-10-27"},{"op":"delete","id":"${m1.id}"},{"op":"delete","id":"unknown"}]}`];
  ctx.llm.stream = (orig => req => { req.provider = 'cheap'; return orig.call(ctx.llm, req); })(fakeLlm(outputs).stream);
  const r = await rt.extractSession('session-1', { ...rt.settings(), extractProvider: 'cheap', extractModel: 'flash' });
  assert.equal(r.updated, 1); assert.equal(r.deleted, 1);
  const live = sm.memories.filter(m => !m.forgotten).map(m => m.memory);
  assert.deepEqual(live, ['用户的论文初稿截止日期推迟到 2026-10-27 | EN: Draft deadline moved to 2026-10-27']);
});

test('workspace scope writes to the workspace tag; permanent facts go to the global tag', async () => {
  const agent = makeAgent({ events: [evUser('这个项目用 Rust 写，我个人一直喜欢用 Vim 编辑器')] });
  const llm = fakeLlm(['{"operations":[{"op":"add","memory":"项目使用 Rust","english":"Project uses Rust"},{"op":"add","memory":"用户喜欢 Vim","english":"User likes Vim","permanent":true}]}']);
  const { sm, ctx, rt, fire } = setup({ roots: [agent], llm, settings: { scope: 'workspace', containerTag: 'me' } });
  ctx.listeners['agent/turn-stopping'][0]({ agent });
  await fire();
  const wsTag = sm.docs.get('dsh_session-1').containerTag;
  assert.match(wsTag, /^me_ws_[0-9a-f]{12}$/);
  assert.deepEqual(sm.memories.map(m => [m.tag === 'me' ? 'global' : 'ws', m.memory]), [['ws', '项目使用 Rust | EN: Project uses Rust'], ['global', '用户喜欢 Vim | EN: User likes Vim']]);
  const search = sm.requests.find(r => r.path === '/v4/search' && r.body.containerTags);
  assert.equal(search, undefined, 'extraction searches each tag separately');
  // 召回同时查工作区和全局。
  const pv = await (await ctx.routes.get('/api/dsh-supermemory.preview').fetch(new Request('http://h', { method: 'POST', body: JSON.stringify({ q: 'Rust Vim', cwd: 'C:/proj/thesis' }) }))).json();
  assert.equal(pv.ok, true); assert.deepEqual(pv.tags, [wsTag, 'me']); assert.deepEqual(pv.counts, { profile: 1, memories: 1, chunks: 1 }, 'Vim is in the profile, so it is not repeated as a memory; the uploaded transcript is a chunk');
  const tags = await (await ctx.routes.get('/api/dsh-supermemory.tags').fetch(new Request('http://h', { method: 'POST', body: '{}' }))).json();
  assert.equal(tags.tags.find(t => t.tag === wsTag).workspace, 'thesis');
  assert.ok(rt.state.data.workspaces[wsTag]);
});

test('turn end is ignored for subagents, disabled capture and excluded workspaces; extraction off uses server memory task', async () => {
  const root = makeAgent(), child = makeAgent({ id: 'c' });
  for (const [opts, agent] of [[{ roots: [root] }, child], [{ roots: [root], settings: { captureConversations: false } }, root], [{ roots: [root], settings: { excludeWorkspaces: 'thesis' } }, root]]) {
    const { ctx, timers } = setup(opts);
    ctx.listeners['agent/turn-stopping'][0]({ agent });
    assert.equal(timers.filter(t => t.ms !== 1).length, 0);
  }
  root.session.events.push(evUser('请记住我喜欢简洁的回答方式'));
  const { sm, ctx, timers, fire, rt } = setup({ roots: [root], settings: { modelExtraction: false } });
  ctx.listeners['agent/turn-stopping'][0]({ agent: root });
  assert.deepEqual(timers.filter(t => t.ms !== 1).map(t => t.ms), [15000]);
  await fire(15000);
  const doc = sm.docs.get('dsh_session-1');
  assert.equal(doc.taskType, 'memory'); assert.equal(doc.dreaming, 'instant'); assert.ok(doc.entityContext.length > 50);
  assert.equal(rt.stats.uploads, 1);
});

test('tools: save encodes and refuses secrets, search lists ids, forget removes; guarded when off', async () => {
  const agent = makeAgent();
  const { sm, ctx } = setup({ roots: [agent] });
  const exec = { agent, signal: new AbortController().signal };
  const t = name => ctx.toolMap.get(name).execute;
  assert.match((await t('memory_save')({ memory: '用户的 API key 是 sk-abcdefghijklmnop1234' }, exec)).text, /没有保存/);
  const saved = await t('memory_save')({ memory: '用户偏好中文回答', english: 'User prefers Chinese answers', permanent: true }, exec);
  assert.match(saved.text, /^已记住：用户偏好中文回答（id=m1）/);
  assert.deepEqual(sm.memories[0], { ...sm.memories[0], memory: '用户偏好中文回答 | EN: User prefers Chinese answers', isStatic: true });
  assert.equal(sm.memories[0].metadata.via, 'tool');
  const found = await t('memory_search')({ query: '中文回答' }, exec);
  assert.match(found.text, /id=m1 .*用户偏好中文回答/);
  assert.match((await t('memory_forget')({ ids: ['m1'] }, exec)).text, /已删除 1 条/);
  assert.match((await t('memory_forget')({ ids: ['m1'] }, exec)).text, /没有找到/);
  assert.match((await t('memory_forget')({ ids: [] }, exec)).text, /memory_search/);
  const off = setup({ roots: [agent], settings: { enabled: false } });
  assert.match((await off.ctx.toolMap.get('memory_save').execute({ memory: 'x' }, exec)).text, /已在设置中关闭/);
  const nokey = setup({ roots: [agent], key: '' });
  assert.match((await nokey.ctx.toolMap.get('memory_search').execute({ query: 'x' }, exec)).text, /API key/);
  const ex = setup({ roots: [agent], settings: { excludeWorkspaces: 'thesis' } });
  assert.match((await ex.ctx.toolMap.get('memory_search').execute({ query: 'x' }, exec)).text, /排除/);
});

test('routes: setKey validates first, library CRUD, profile, preview, models, extractNow', async () => {
  const { sm, ctx, route } = setup({ key: '' });
  assert.equal((await route('status')).key.configured, false);
  assert.equal((await route('setKey', { key: 'short' })).code, 'bad-request');
  const bad = await route('setKey', { key: 'sm_WRONG_' + 'x'.repeat(30) });
  assert.equal(bad.code, 'auth'); assert.equal(ctx.store.has(KEY_REF), false);
  const good = await route('setKey', { key: KEY });
  assert.equal(good.ok, true); assert.equal(good.key.configured, true); assert.equal(ctx.store.get(KEY_REF), KEY);
  assert.ok(!JSON.stringify(good).includes(KEY), 'status must not echo the key');
  const chk = await route('check', {});
  assert.equal(chk.ok, true); assert.equal(chk.memories, 0);
  assert.equal((await route('add', { memory: '密码：hunter2' })).code, 'secret');
  const added = await route('add', { memory: '用户住在杭州', isStatic: true });
  assert.equal(added.ok, true); assert.equal(sm.memories[0].memory, '用户住在杭州 [memory]');
  const list = await route('memories', {});
  assert.deepEqual(list.entries.map(e => [e.text, e.english, e.isStatic]), [['用户住在杭州', '', true]]);
  const up = await route('update', { id: list.entries[0].id, memory: '用户住在上海', english: 'Lives in Shanghai' });
  assert.equal(up.ok, true);
  assert.deepEqual((await route('memories', {})).entries.map(e => e.text), ['用户住在上海']);
  const prof = await route('profile', {});
  assert.deepEqual(prof.static, ['用户住在上海']);
  const s = await route('search', { q: '上海' });
  assert.equal(s.results[0].text, '用户住在上海'); assert.equal(s.results[0].english, 'Lives in Shanghai');
  const pv = await route('preview', { q: '我住在 上海 吗', settings: { recallThreshold: 30 } });
  assert.equal(pv.ok, true); assert.match(pv.text, /用户住在上海/); assert.equal(sm.requests.findLast(r => r.path === '/v4/search').body.threshold, 0.3);
  const id = (await route('memories', {})).entries[0].id;
  assert.equal((await route('forget', { ids: [id] })).count, 1);
  assert.equal((await route('memories', {})).entries.length, 0);
  assert.equal((await route('memories', { tag: 'bad tag!' })).tag, 'dsh_personal');
  assert.deepEqual((await route('models', {})).groups.map(g => g.id), ['cheap', 'broken']);
  assert.deepEqual(await route('extractNow', {}), { ok: true, sessions: 0, added: 0, updated: 0, deleted: 0, errors: [] });
  assert.equal((await route('search', {})).code, 'bad-request');
  const raw = await ctx.routes.get('/api/dsh-supermemory.status').fetch(new Request('http://h', { method: 'POST', body: 'not json' }));
  assert.equal(raw.status, 400);
  // 清空记忆库：必须回传同名确认；会删除容器并作废本地上传指纹。
  await route('add', { memory: '临时记忆 temp' });
  assert.equal((await route('clearTag', { tag: 'dsh_personal' })).code, 'bad-request');
  assert.equal((await route('clearTag', { tag: 'dsh_personal', confirm: 'other' })).code, 'bad-request');
  const del = await route('clearTag', { tag: 'dsh_personal', confirm: 'dsh_personal' });
  assert.equal(del.ok, true);
  const delReq = sm.requests.findLast(r => r.method === 'DELETE');
  assert.equal(delReq.path, '/v3/container-tags/dsh_personal');
  const cleared = await route('setKey', { clear: true });
  assert.equal(cleared.key.configured, false);
});

test('pending extraction survives restart via state file and dispose stops timers', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dsm-'));
  const stateFile = join(dir, 'state.json');
  const sm = fakeSupermemory();
  const agent = makeAgent({ events: [evUser('我下个月要去东京出差一周，帮我记一下')] });
  const a = makeCtx({ roots: [agent] });
  const timersA = [];
  const rtA = createRuntime(a.ctx, a.config, { fetchImpl: sm.fetchImpl, stateFile, setTimer: (fn, ms) => { const t = { fn, ms }; timersA.push(t); return t; }, clearTimer: t => { if (t) t.cancelled = true; }, resumeDelayMs: 1 });
  a.ctx.listeners['agent/turn-stopping'][0]({ agent });
  await rtA.state.flush();
  assert.ok(JSON.parse(readFileSync(stateFile, 'utf8')).pending['session-1']);
  for (const d of a.ctx.disposers) d?.();
  assert.ok(rtA.lifetime.signal.aborted);
  assert.ok(timersA.filter(t => t.ms !== 1).every(t => t.cancelled));
  // “重启”：会话已关闭，只能从持久化日志读取。
  const llm = fakeLlm(['{"operations":[{"op":"add","memory":"用户下个月去东京出差一周","english":"Business trip to Tokyo next month"}]}']);
  const b = makeCtx({ roots: [], llm });
  b.ctx.get = name => ({ credentials: { resolve: async () => ({ value: KEY }), describe: async () => ({ configured: true }) }, sessionPersistence: { open: async () => ({ header: { cwd: 'C:/proj/thesis' }, read: async () => ({ events: agent.session.events }), close: async () => {} }) } })[name];
  const timersB = [];
  const rtB = createRuntime(b.ctx, b.config, { fetchImpl: sm.fetchImpl, stateFile, setTimer: (fn, ms) => { const t = { fn, ms }; timersB.push(t); return t; }, clearTimer: () => {}, resumeDelayMs: 1 });
  await timersB.find(t => t.ms === 1).fn();
  assert.deepEqual(sm.memories.map(m => m.memory), ['用户下个月去东京出差一周 | EN: Business trip to Tokyo next month']);
  await rtB.state.flush();
  const st = JSON.parse(readFileSync(stateFile, 'utf8'));
  assert.deepEqual(st.pending, {}); assert.equal(st.sessions['session-1'].cursor, 1);
  assert.ok(existsSync(stateFile));
});

test('api client: auth header, redaction, timeouts, error mapping', async () => {
  const seen = [];
  const api = createApi({ resolveKey: async () => KEY, baseUrl: () => 'https://x.test', fetchImpl: async (url, init) => { seen.push(init.headers.authorization); return { ok: false, status: 402, text: async () => JSON.stringify({ error: `quota for ${KEY}` }) }; } });
  await assert.rejects(api.search({ q: 'a' }), e => e.status === 402 && /额度不足/.test(e.message) && !e.message.includes(KEY));
  assert.equal(seen[0], `Bearer ${KEY}`);
  const slow = createApi({ resolveKey: async () => KEY, baseUrl: () => 'https://x.test', fetchImpl: (url, init) => new Promise((_, rej) => { const t = setTimeout(() => {}, 60); init.signal.addEventListener('abort', () => { clearTimeout(t); rej(init.signal.reason); }); }) });
  await assert.rejects(slow.search({ q: 'a' }, { timeoutMs: 20 }), e => e.code === 'timeout');
  const none = createApi({ resolveKey: async () => '', baseUrl: () => 'https://x.test', fetchImpl: async () => { throw new Error('should not fetch'); } });
  await assert.rejects(none.listTags(), e => e.code === 'no-key');
});

test('no duplicates: memory_save checks first, extraction skips facts the tool already saved', async () => {
  const agent = makeAgent({ events: [evUser('顺便说 我平时 写代码 主要用 Python')] });
  const llm = fakeLlm(['{"operations":[{"op":"add","memory":"用户平时 写代码 主要使用 Python。","english":"Mainly codes in Python"},{"op":"add","memory":"用户 周末 喜欢 爬山","english":"Likes hiking"}]}']);
  const { sm, ctx, rt } = setup({ roots: [agent], llm });
  const exec = { agent, signal: new AbortController().signal };
  const save = ctx.toolMap.get('memory_save').execute;
  assert.match((await save({ memory: '用户平时 写代码 主要使用 Python', english: 'Mainly codes in Python' }, exec)).text, /^已记住/);
  assert.match((await save({ memory: '用户平时 写代码 主要使用 Python。' }, exec)).text, /已经记住过了/);
  assert.equal(sm.memories.length, 1);
  ctx.listeners['agent/turn-stopping'][0]({ agent });
  const r = await rt.extractSession('session-1');
  assert.equal(r.added, 1); assert.equal(r.skipped, 1);
  assert.deepEqual(sm.memories.filter(m => !m.forgotten).map(m => displayOf(m.memory)), ['用户平时 写代码 主要使用 Python', '用户 周末 喜欢 爬山']);
  assert.match(rt.activity[0].text, /跳过重复 1 条/);
  // 近似（日期变了）→ 更新原记忆而不是新增。
  await save({ memory: '用户的 论文 截止日期 是 2026-10-20' }, exec);
  const upd = await save({ memory: '用户的 论文 截止日期 推迟到 2026-10-27' }, exec);
  assert.match(upd.text, /^已更新原有记忆/);
  assert.equal(sm.memories.filter(m => !m.forgotten && m.memory.includes('截止日期')).length, 1);
});
const displayOf = s => s.replace(/ \| EN: .*$/, '').replace(/ \[memory\]$/, '');

test('temporal queries still recall (stripped second query) and writes carry a document date', async () => {
  const agent = makeAgent();
  const { sm, ctx, route } = setup({ roots: [agent], settings: { recallProfile: false } });
  assert.equal((await route('add', { memory: '用户 在准备 PMP 考试', english: 'Preparing for PMP' })).ok, true);
  const added = sm.requests.find(r => r.path === '/v4/memories' && r.method === 'POST');
  assert.match(added.body.memories[0].temporalContext.documentDate, /^\d{4}-\d{2}-\d{2}T/);
  const d = await preStep(ctx, { agent, messages: [um('我 最近 在准备 PMP 考试 有什么建议')] });
  assert.equal(d.messages.length, 2, 'recalled despite the temporal word');
  assert.match(d.messages[1].content[0].text, /用户 在准备 PMP 考试/);
  const qs = sm.requests.filter(r => r.path === '/v4/search').map(r => r.body.q);
  assert.deepEqual(qs, ['我 最近 在准备 PMP 考试 有什么建议', '我 在准备 PMP 考试 有什么建议']);
  const id = sm.memories[0].id;
  await route('update', { id, memory: '用户 在准备 PMP 考试，11 月考' });
  assert.ok(sm.requests.findLast(r => r.method === 'PATCH').body.temporalContext.documentDate);
});
