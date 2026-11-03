// 在 VM 中加载生产 Client factory：核对 id、inject、plugins.item 注册与卸载清理，并用 react-dom/server 真正渲染设置页。
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
let registered;
const tags = [], effects = [], regs = [], calls = [];
const doc = { head: { appendChild: x => tags.push(x) }, createElement: () => ({ dataset: {}, textContent: '', remove() { const i = tags.indexOf(this); if (i >= 0) tags.splice(i, 1); } }) };
const fetch = async (url, init) => { calls.push([url, init]); return { status: 200, json: async () => ({ ok: true, key: { configured: true, writable: true, source: 'file' }, settings: {}, activity: [], stats: {} }) }; };
const clientSource = await readFile('lib/client.js', 'utf8');
vm.runInNewContext(clientSource, { window: { __ModuleLoader__: { load: x => { registered = x; } } }, document: doc, fetch, AbortController, console }, { timeout: 3000 });
assert.equal(registered.id, 'dsh-supermemory');
const allowed = new Set(['react', 'react/jsx-runtime']);
const exp = registered.factory(id => { assert(allowed.has(id), `unexpected runtime import ${id}`); return require(id); });
assert.deepEqual(Array.from(exp.inject), ['slots', 'configForms']);
// 客户端产物里不能混进 Host 代码或 Node 内置模块。
for (const bad of ['node:', 'api.supermemory.ai/v4', 'createRuntime', 'process.env']) assert.ok(!clientSource.includes(bad), `client bundle must not contain ${bad}`);
const css = /--(?!dsw-)[a-z][a-z0-9-]*\s*[:)]/i.exec(clientSource.match(/\.dsm-page[\s\S]*?@media \(max-width: 560px\)/)?.[0] ?? '');
assert.equal(css, null, `only --dsw-* variables allowed, found ${css?.[0]}`);

class FakeForm {
  #snap = { status: 'loading', value: undefined, writable: false, mode: 'host' };
  #listeners = new Set();
  getSnapshot() { return this.#snap; }
  subscribe(listener) { this.#listeners.add(listener); return () => this.#listeners.delete(listener); }
  async set() { return true; }
  ready() { this.#snap = { status: 'ready', value: { recallLimit: 9, containerTag: 'my_tag' }, writable: true, mode: 'host' }; for (const l of this.#listeners) l(); }
}
const fakeForm = new FakeForm();
let component;
const ctx = {
  configForms: { get(id) { assert.equal(id, 'supermemory'); return fakeForm; } },
  effect(fn) { effects.push(fn()); },
  slots: {
    inject(owner, fn) { assert.equal(owner, 'plugins.item'); effects.push(fn()); },
    register(opts, c) { assert.equal(typeof c, 'function'); regs.push(opts); component = c; return () => regs.splice(regs.indexOf(opts), 1); },
  },
};
exp.apply(ctx);
assert.equal(tags.length, 1);
assert.match(tags[0].textContent, /\.dsm-page/);
assert.equal(regs.length, 1);
const reg = regs[0];
assert.equal(reg.name, 'plugins.item'); assert.equal(reg.id, 'supermemory'); assert.equal(reg.order, 45); assert.equal(reg.label, 'Supermemory 长期记忆');
const injected = reg.inject();
assert.deepEqual(Object.keys(injected).sort(), ['smCall', 'smForm']);
const st = await injected.smCall('status');
assert.equal(calls[0][0], 'api/dsh-supermemory.status'); assert.equal(st.ok, true);
assert.equal((await injected.smCall('nope')).code, 'bad-request');

const React = require('react');
const { renderToString } = require('react-dom/server');
// 宿主在 page 视图会额外传入它自己的 form；不能覆盖本插件的 smForm。
const render = view => renderToString(React.createElement(component, { ...injected, view, form: { hostOwned: true } }));
assert.match(render('summary'), /长期记忆/);
const loading = render('page');
assert.match(loading, /data-dsh-supermemory/); assert.match(loading, /API Key/);
fakeForm.ready();
const ready = render('page');
for (const text of ['启用长期记忆', '自动召回', '附带用户画像', '附带历史对话片段', '最多召回', '相关度门槛', '召回超时', '保存对话原文', '用 DSH 模型整理记忆', '整理用的模型', '停下多久后整理', '隐私', '包含助手的回答', '不使用记忆的工作区', '高级设置', '记忆库', '试一试', '最近活动', '保存 Key', '测试连接'])
  assert.ok(ready.includes(text), `page should contain ${text}`);
assert.match(ready, /value="9"/);
for (const d of effects.reverse()) d?.();
assert.equal(tags.length, 0); assert.equal(regs.length, 0);
console.log('PASS: client factory id/inject, plugins.item registration (order 45), route wiring, summary + page render with a this-bound form, --dsw-only CSS, cleanup');
