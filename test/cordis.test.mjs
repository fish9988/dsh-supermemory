// 用 DSH 自带的真实 Cordis 挂载构建产物：确认 Host 插件进入 active，注册路由/工具/提示词/钩子，
// 钩子经真实 waterfall/serial 派发可用且失败放行，卸载时全部注销。
// 需要从 app.asar 只读解出的 @deepseek-ai/cordis（DSH_CORDIS 指向其 lib/index.js）；找不到则跳过。
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';

const HOME = homedir().replace(/\\/g, '/');
const CORDIS = [
  process.env.DSH_CORDIS,
  `${HOME}/AppData/Local/Programs/DeepSeek Harness/resources/app/dsh/node_modules/@deepseek-ai/cordis/lib/index.js`,
  `${HOME}/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/cordis/lib/index.js`,
].find(p => p && existsSync(p));
const SCHEMASTERY = [
  process.env.DSH_SCHEMASTERY,
  `${HOME}/AppData/Local/Programs/DeepSeek Harness/resources/app/dsh/node_modules/@deepseek-ai/schemastery/lib/index.mjs`,
  `${HOME}/.dsh/profiles/web/node_modules/@deepseek-ai/schemastery/lib/index.mjs`,
  `${HOME}/AppData/Roaming/npm/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/schemastery/lib/index.mjs`,
  `${HOME}/.dsh/profiles/desktop/node_modules/@deepseek-ai/schemastery/lib/index.mjs`,
].find(p => p && existsSync(p));
const available = Boolean(CORDIS && SCHEMASTERY);
if (available) registerHooks({
  resolve(spec, ctx, next) {
    if (spec === '@deepseek-ai/schemastery') return { url: pathToFileURL(SCHEMASTERY).href, shortCircuit: true };
    return next(spec, ctx);
  },
});
const tick = () => new Promise(r => setTimeout(r, 30));

test('host plugin activates under real Cordis and cleans up on dispose', { skip: !available && 'cordis not found' }, async () => {
  process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'dsm-home-'));
  delete process.env.SUPERMEMORY_API_KEY;
  const { Context, Service } = await import(pathToFileURL(CORDIS).href);
  const mod = await import('../lib/index.js');
  const root = new Context();
  // 与 DSH 同形的注册型服务：注册项随调用方 ctx 的 effect 释放。
  const registry = (name, method) => class extends Service {
    items = new Map();
    constructor(ctx) { super(ctx, name); }
    get [method]() { const owner = this.ctx; return item => owner.effect(() => { const k = item.path ?? item.name; this.items.set(k, item); return () => this.items.delete(k); }, name); }
  };
  class Connection extends Service {
    routes = new Map();
    constructor(ctx) { super(ctx, 'connection'); }
    get fetch() { const owner = this.ctx; return { register: r => owner.effect(() => { this.routes.set(r.path, r); return () => this.routes.delete(r.path); }, 'route') }; }
  }
  const Tools = registry('tools', 'register');
  const Prompt = registry('systemPrompt', 'section');
  class Llm extends Service { constructor(ctx) { super(ctx, 'llm'); } listProviders() { return [{ id: 'p', name: 'P' }]; } async listModels() { return [{ id: 'm', name: 'M' }]; } }
  const roots = [];
  class Agents extends Service { constructor(ctx) { super(ctx, 'agents'); } roots() { return roots; } }
  for (const S of [Connection, Tools, Prompt, Llm, Agents]) root.plugin(S);
  await tick();
  const fiber = root.plugin(mod, {});
  await tick();
  assert.equal(fiber._error, undefined, String(fiber._error?.stack));
  assert.equal(fiber.state, 2, 'expected ACTIVE');
  assert.equal(root.connection.routes.size, 14);
  assert.deepEqual([...root.tools.items.keys()], ['memory_search', 'memory_save', 'memory_forget']);
  assert.deepEqual([...root.systemPrompt.items.keys()], ['tool:supermemory']);
  assert.match(root.systemPrompt.items.get('tool:supermemory').text(), /memory_save/);

  // 真实 waterfall：没有 key 时召回放行，原样返回下游决定。
  const agent = { session: { id: 's1', header: { id: 's1', cwd: 'C:/x' }, snapshotEvents: () => [] } };
  roots.push(agent);
  const msg = { id: 'u1', role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: '你好' }] };
  const decision = await root.waterfall('agent/pre-step', { agent, messages: [msg], turn: 1, step: 1, signal: new AbortController().signal }, async () => ({ kind: 'enter', messages: [msg] }));
  assert.deepEqual(decision, { kind: 'enter', messages: [msg] });
  await root.serial('agent/turn-stopping', { agent, turn: 1, signal: new AbortController().signal });

  // 设置页路由：没有凭据服务时 key 未配置，模型列表来自 llm 服务。
  const call = async (ep, body = {}) => (await root.connection.routes.get(`/api/dsh-supermemory.${ep}`).fetch(new Request('http://h/x', { method: 'POST', body: JSON.stringify(body) }))).json();
  const st = await call('status');
  assert.equal(st.ok, true); assert.equal(st.key.configured, false); assert.equal(st.settings.containerTag, 'dsh_personal'); assert.equal(st.pending, 1);
  assert.deepEqual((await call('models')).groups, [{ id: 'p', name: 'P', models: [{ id: 'm', name: 'M' }] }]);
  assert.equal((await call('preview', { q: 'x' })).code, 'no-key');
  const tool = await root.tools.items.get('memory_search').execute({ query: 'x' }, { agent });
  assert.match(tool.text, /API key/);

  await fiber.dispose();
  await tick();
  assert.equal(root.connection.routes.size, 0);
  assert.equal(root.tools.items.size, 0);
  assert.equal(root.systemPrompt.items.size, 0);
  const after = await root.waterfall('agent/pre-step', { agent, messages: [msg], signal: new AbortController().signal }, async () => 'inner');
  assert.equal(after, 'inner', 'pre-step listener removed');
});
