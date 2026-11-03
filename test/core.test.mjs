import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSettings, DEFAULT_SETTINGS, DEFAULT_TAG, sanitizeTag, tagsFor, workspaceTag, isExcluded,
  encodeMemory, decodeMemory, displayMemory, extractEntries, buildTranscript, previouslyInjected, renderRecall, recallSummary,
  buildExtractionPrompt, parseOperations, looksSecret, worthExtracting, maskSecrets, routeOf, userQueryOf, docIdFor,
  formatToolResults, redact, resolveBaseUrl, createHttpCall, SOURCE_KIND, PROFILE_HEADING, similarText, dedupeOperations, stripTemporal, searchQueries, mergeResults, semanticVerdict, judgeNewMemory,
} from '../src/core.mjs';

test('settings normalize: clamps, enums, tag sanitizing and defaults', () => {
  assert.deepEqual(normalizeSettings(undefined), normalizeSettings(DEFAULT_SETTINGS));
  const s = normalizeSettings({ recallLimit: 99, recallThreshold: '5', scope: 'nope', containerTag: 'bad tag!', enabled: 'yes', entityContext: '' });
  assert.equal(s.recallLimit, 20); assert.equal(s.recallThreshold, 20); assert.equal(s.scope, 'global');
  assert.equal(s.containerTag, DEFAULT_TAG); assert.equal(s.enabled, true); assert.ok(s.entityContext.length > 50);
  assert.equal(sanitizeTag('a.b-c_d'), 'a.b-c_d'); assert.equal(sanitizeTag('中文'), ''); assert.equal(sanitizeTag('x'.repeat(101)), '');
});

test('tags: global vs workspace scope; workspace tag stable across slash/case', () => {
  assert.deepEqual(tagsFor({}, 'C:/a'), { write: DEFAULT_TAG, read: [DEFAULT_TAG], profile: DEFAULT_TAG, global: DEFAULT_TAG });
  const t = tagsFor({ scope: 'workspace', containerTag: 'me' }, 'C:\\Proj\\X\\');
  assert.equal(t.write, workspaceTag('me', 'c:/proj/x'));
  assert.match(t.write, /^me_ws_[0-9a-f]{12}$/);
  assert.deepEqual(t.read, [t.write, 'me']); assert.equal(t.profile, 'me');
  assert.equal(tagsFor({ scope: 'workspace' }, '').write, DEFAULT_TAG);
});

test('exclusions match path fragments case/slash-insensitively', () => {
  const s = { excludeWorkspaces: 'C:\\Work\\客户A\n机密；other' };
  assert.equal(isExcluded(s, 'c:/work/客户a/sub'), true);
  assert.equal(isExcluded(s, 'D:/x/机密项目'), true);
  assert.equal(isExcluded(s, 'D:/x/public'), false);
  assert.equal(isExcluded({}, 'D:/x'), false);
});

test('memory encoding always contains Latin letters and round-trips', () => {
  assert.equal(encodeMemory('用户喜欢简洁回答', 'User prefers concise answers'), '用户喜欢简洁回答 | EN: User prefers concise answers');
  assert.equal(encodeMemory('用户喜欢简洁回答'), '用户喜欢简洁回答 [memory]');
  assert.equal(encodeMemory('User uses PyTorch'), 'User uses PyTorch');
  assert.equal(encodeMemory('  '), '');
  for (const raw of ['用户喜欢简洁回答 | EN: User prefers concise answers', '用户喜欢简洁回答 [memory]', 'plain']) assert.ok(/[A-Za-z]/.test(raw));
  assert.deepEqual(decodeMemory('用户喜欢简洁回答 | EN: User prefers concise answers'), { text: '用户喜欢简洁回答', english: 'User prefers concise answers' });
  assert.equal(displayMemory('用户喜欢简洁回答 [memory]'), '用户喜欢简洁回答');
  assert.equal(displayMemory('只有中文'), '只有中文');
});

const ev = (type, data, extra = {}) => ({ type, data, ...extra });
const userMsg = (text, kind = 'user') => ev('user/message', { source: { kind }, content: [{ type: 'text', text }] });
const asstMsg = text => ev('assistant/message', { message: { content: [{ type: 'text', text }, { type: 'tool_use', name: 'bash' }] } });

test('extractEntries keeps only human user text and assistant text', () => {
  const { entries, title } = extractEntries([
    ev('session/title', { title: '论文' }), userMsg('你好\u0007'), userMsg('<supermemory>x</supermemory>', SOURCE_KIND), userMsg('time', 'time-context'), asstMsg('好的'), ev('tool/result', {}),
  ]);
  assert.equal(title, '论文');
  assert.deepEqual(entries.map(e => [e.role, e.text]), [['user', '你好'], ['assistant', '好的']]);
});

test('buildTranscript caps per-message and total length, keeping the latest part', () => {
  const entries = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', text: `${i}:` + 'x'.repeat(300) }));
  const t = buildTranscript(entries, { maxChars: 2000 });
  assert.ok(t.length <= 2100); assert.match(t, /更早的对话已省略/); assert.match(t, /29:/);
  assert.ok(!buildTranscript(entries, { includeAssistant: false }).includes('assistant:'));
  assert.ok(buildTranscript([{ role: 'user', text: 'y'.repeat(9000) }], { perMessage: 100 }).length < 200);
});

test('renderRecall + previouslyInjected round-trip dedups profile and lines', () => {
  const r = renderRecall({
    profile: { static: ['用户叫小明 | EN: The user is Ming', '[2026-10-01] 用户在写论文 [memory]'], dynamic: ['[Recent] 临时动态不注入'] },
    results: [
      { id: 'm1', memory: '用户的导师是王老师 | EN: Advisor is Prof. Wang', updatedAt: '2026-09-30T00:00:00Z', similarity: 0.7 },
      { id: 'm2', memory: '用户叫小明 | EN: The user is Ming', updatedAt: '2026-09-30T00:00:00Z' },
      { id: 'c1', chunk: 'user: 第五章是消融实验', metadata: { title: '论文规划', sessionId: 'other' }, updatedAt: '2026-09-29T00:00:00Z' },
      { id: 'c2', chunk: 'user: 当前会话', metadata: { sessionId: 'self' } },
      { id: 'c3', chunk: ['# 旧会话 标题', 'workspace: x', 'date: 2026-09-01', '', 'user: 我喜欢 Rust'].join('\n'), metadata: { title: '旧会话 标题', sessionId: 'o2' } },
    ],
    excludeSessionId: 'self',
  });
  assert.deepEqual(r.counts, { profile: 2, memories: 1, chunks: 2 });
  assert.match(r.text, /> 《旧会话 标题》 user: 我喜欢 Rust/);
  assert.match(r.text, /^<supermemory>/); assert.ok(r.text.includes(PROFILE_HEADING));
  assert.ok(!r.text.includes('EN:')); assert.ok(!r.text.includes('[memory]')); assert.ok(!r.text.includes('当前会话'));
  assert.match(r.text, /- \[2026-09-30\] 用户的导师是王老师/); assert.match(r.text, /> \[2026-09-29\] 《论文规划》 user: 第五章是消融实验/);
  assert.equal(recallSummary(r.counts), '召回画像 2 条、记忆 1 条、对话片段 2 段');
  const prior = previouslyInjected([userMsg(r.text, SOURCE_KIND), userMsg('- 普通用户行')]);
  assert.equal(prior.profile, true);
  assert.ok(prior.lines.has('用户的导师是王老师')); assert.ok(prior.lines.has('user: 第五章是消融实验')); assert.ok(!prior.lines.has('普通用户行'));
  const again = renderRecall({ results: [{ id: 'm1', memory: '用户的导师是王老师 | EN: x' }], skip: prior.lines });
  assert.equal(again.text, ''); assert.equal(recallSummary(again.counts), '');
});

test('extraction prompt and operation parsing', () => {
  const p = buildExtractionPrompt({ transcript: 'user: 我下周三交初稿', existing: [{ id: 'a1', memory: '用户在写论文 [memory]' }], today: '2026-10-02', workspace: 'thesis' });
  assert.match(p.system, /JSON only/); assert.match(p.user, /id=a1: 用户在写论文\n/); assert.match(p.user, /Today: 2026-10-02/);
  const ops = parseOperations('```json\n{"operations":[{"op":"add","memory":"用户下周三交初稿","english":"Draft due next Wed","permanent":false},{"op":"update","id":"a1","memory":"用户在写硕士论文"},{"op":"update","id":"zz","memory":"x"},{"op":"delete","id":"a1"},{"op":"add","memory":"用户的密码: hunter2"},{"op":"bogus"}]}\n```', new Set(['a1']));
  assert.deepEqual(ops.map(o => o.op), ['add', 'update', 'delete']);
  assert.equal(parseOperations('no json'), null);
  assert.deepEqual(parseOperations('{"operations":[]}'), []);
});

test('secret detection and masking', () => {
  for (const s of ['key sk-abcdefghijklmnop1234', 'sm_' + 'A1b2'.repeat(10), '身份证 11010519491231002X', '密码：hunter2', 'ghp_abcdefghijklmnopqrst']) assert.equal(looksSecret(s), true, s);
  for (const s of ['用户喜欢 TypeScript', 'deadline 2026-10-20']) assert.equal(looksSecret(s), false, s);
  const m = maskSecrets('我的 key 是 sm_' + 'A1b2'.repeat(10) + '，Authorization: Bearer abcdefghijklmnopqrstuvwxyz，password=hunter2 身份证11010519491231002X');
  assert.ok(!m.includes('A1b2A1b2')); assert.ok(!m.includes('abcdefghijklmnopqrstuvwxyz')); assert.ok(!m.includes('hunter2')); assert.ok(!m.includes('1231002X'));
  assert.match(m, /Bearer \[已隐去\]/); assert.match(m, /password=\[已隐去\]/);
  assert.equal(maskSecrets('普通文本 nothing secret'), '普通文本 nothing secret');
});

test('small helpers', () => {
  assert.equal(worthExtracting([{ role: 'user', text: '好的' }, { role: 'assistant', text: 'x'.repeat(500) }]), false);
  assert.equal(worthExtracting([{ role: 'user', text: '我的论文初稿十月二十号要交给导师' }]), true);
  assert.deepEqual(routeOf([ev('request/header', { header: { config: { provider: 'a', model: 'b' } } }), ev('request/header', { header: { config: { provider: 'c', model: 'd' } } })]), { provider: 'c', model: 'd' });
  assert.equal(userQueryOf([{ role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text: ' 你好 ' }] }, { role: 'user', source: { kind: 'time-context' }, content: [{ type: 'text', text: 't' }] }]), '你好');
  assert.equal(docIdFor('session-1:2/3'), 'dsh_session-1_2_3');
  assert.match(formatToolResults([{ id: 'm1', memory: '用户叫小明 | EN: Ming', similarity: 0.812, updatedAt: '2026-10-01T00:00:00Z' }]), /id=m1 \[2026-10-01\] 用户叫小明 \(相关度 0.81\)/);
  assert.equal(formatToolResults([]), '没有找到相关记忆。');
  assert.equal(redact('x secretsecret y', 'secretsecret'), 'x *** y');
  assert.equal(resolveBaseUrl(''), 'https://api.supermemory.ai'); assert.equal(resolveBaseUrl('https://p.example/'), 'https://p.example'); assert.equal(resolveBaseUrl('ftp://x'), undefined);
});

test('client http call: relative route, unknown endpoint, non-plugin response', async () => {
  const seen = [];
  const call = createHttpCall(async (url, init) => { seen.push([url, JSON.parse(init.body)]); return { status: 200, json: async () => ({ ok: true }) }; });
  assert.deepEqual(await call('status', { a: 1 }), { ok: true });
  assert.deepEqual(seen[0], ['api/dsh-supermemory.status', { a: 1 }]);
  assert.equal((await call('bogus')).code, 'bad-request');
  const html = createHttpCall(async () => ({ status: 404, json: async () => { throw new Error('html'); } }));
  assert.match((await html('status')).message, /HTTP 404/);
  const down = createHttpCall(async () => { throw new Error('ECONNREFUSED'); });
  assert.equal((await down('status')).code, 'network');
});

test('dedupe: drops restated facts, turns near-duplicates into updates, keeps distinct facts', () => {
  assert.ok(similarText('用户平时写代码主要使用 Python。', '用户平时写代码主要使用 Python | EN: x') > 0.95);
  assert.ok(similarText('用户使用 Python', '用户使用 PyTorch') < 0.7);
  const existing = [
    { id: 'e1', memory: '用户平时写代码主要使用 Python。 | EN: Uses Python' },
    { id: 'e2', memory: '用户正在备战 11 月 15 日的 PMP 考试。 | EN: PMP exam' },
  ];
  const { ops, skipped } = dedupeOperations([
    { op: 'add', memory: '用户平时写代码主要使用 Python。', english: 'Mainly codes in Python' },
    { op: 'add', memory: '用户正在准备 2026 年 11 月 15 日的 PMP 考试。', english: 'PMP on 2026-11-15' },
    { op: 'add', memory: '用户喜欢爬山', english: 'Likes hiking' },
    { op: 'add', memory: '用户喜欢爬山。', english: 'dup in batch' },
    { op: 'delete', id: 'e9' },
  ], existing);
  assert.deepEqual(skipped, ['用户平时写代码主要使用 Python。', '用户喜欢爬山。']);
  assert.deepEqual(ops.map(o => [o.op, o.id ?? '', o.memory ?? '']), [
    ['update', 'e2', '用户正在准备 2026 年 11 月 15 日的 PMP 考试。'], ['add', '', '用户喜欢爬山'], ['delete', 'e9', ''],
  ]);
  // 模型已明确更新的那条，不再被“近似新增”二次改写。
  const r2 = dedupeOperations([{ op: 'update', id: 'e2', memory: '用户考试改到 12 月' }, { op: 'add', memory: '用户正在准备 2026 年 11 月 15 日的 PMP 考试。' }], existing);
  assert.deepEqual(r2.ops.map(o => o.op), ['update', 'add']);
});

test('temporal phrases are stripped into a second query; results merge by id', () => {
  assert.deepEqual(searchQueries('我的插件测试代号是什么？'), ['我的插件测试代号是什么？']);
  assert.deepEqual(searchQueries('上周我在准备 PMP'), ['上周我在准备 PMP', '我在准备 PMP']);
  assert.deepEqual(searchQueries('PMP exam on November 15'), ['PMP exam on November 15', 'PMP exam']);
  assert.equal(stripTemporal('3 days ago I said I like Rust'), 'I said I like Rust');
  assert.equal(stripTemporal('What did I decide last week about the API design?'), 'What did I decide about the API design?');
  assert.equal(stripTemporal('我的论文 2026-10-20 要交，下个月答辩'), '我的论文 要交， 答辩');
  assert.equal(stripTemporal('今天'), '');
  assert.ok(!/最近|11 月|15 日/.test(stripTemporal('我平时写代码主要用 Python，最近在准备 11 月 15 日的 PMP 考试。')));
  const merged = mergeResults([[{ id: 'a', similarity: 0.6 }, { id: 'b', similarity: 0.7 }], [{ id: 'a', similarity: 0.8 }, { id: 'c', similarity: 0.5 }, null]], 2);
  assert.deepEqual(merged.map(r => [r.id, r.similarity]), [['a', 0.8], ['b', 0.7]]);
});

test('semantic verdict: same fact → skip, or update when the new wording is more specific; different facts kept', () => {
  const pmp = { id: 'p', memory: '用户正在备考 PMP 考试 | EN: studying for PMP', similarity: 0.86 };
  assert.equal(semanticVerdict('用户在准备 PMP', pmp, 0.86), 'skip');
  assert.deepEqual(semanticVerdict('用户正在准备 2026 年 11 月 15 日的 PMP 考试', pmp, 0.86), { update: 'p' });
  assert.equal(semanticVerdict('用户的师兄是王老师', { id: 'w', memory: '用户的导师是王老师' }, 0.81), 'keep');
  assert.equal(semanticVerdict('x', null, 0.99), 'keep');
  // 合并判定：字面优先，其次语义。
  assert.equal(judgeNewMemory('用户平时写代码主要使用 Python', [{ id: 'a', memory: '用户平时写代码主要使用 Python。 | EN: x', similarity: 0.5 }]), 'skip');
  assert.deepEqual(judgeNewMemory('用户的论文初稿截止日期推迟到 2026-10-27', [{ id: 't', memory: '用户的论文初稿截止日期是 2026-10-20', similarity: 0.6 }]), { update: 't' });
  assert.equal(judgeNewMemory('用户在准备 PMP', [pmp]), 'skip');
  assert.equal(judgeNewMemory('用户在学 Rust', [{ id: 'r', memory: '用户使用 Python', similarity: 0.68 }]), 'keep');
  assert.equal(judgeNewMemory('用户在学 Rust', []), 'keep');
});
