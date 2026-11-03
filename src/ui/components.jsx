/*
 * Supermemory 长期记忆设置页（插件列表 → Supermemory 长期记忆）。只依赖 react，控件样式复刻原生设置行。
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { SCOPES, SETTING_FIELDS, DEFAULT_SETTINGS, DEFAULT_ENTITY_CONTEXT, KEY_REF, normalizeSettings, sanitizeTag } from '../core.mjs';
import UI_CSS from './ui.css';

export { UI_CSS };
export const SUMMARY = '让模型记住你：跨会话的长期记忆，自动召回、自动整理，可随时查看和删除。';
const cx = (...a) => a.filter(Boolean).join(' ');
const SOURCE_LABEL = { file: 'DSH 凭据库', env: '系统环境变量', 'user-env': '~/.dsh/.env', 'project-env': '项目 .env' };
const KIND_LABEL = { recall: '召回', upload: '保存对话', extract: '整理记忆', tool: '模型工具', manual: '手动' };

function ago(at) {
  const t = typeof at === 'string' ? Date.parse(at) : at;
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return '刚刚';
  if (s < 3600) return `${Math.round(s / 60)} 分钟前`;
  if (s < 86400) return `${Math.round(s / 3600)} 小时前`;
  if (s < 86400 * 30) return `${Math.round(s / 86400)} 天前`;
  return new Date(t).toLocaleDateString();
}

function Row({ title, desc, children, htmlFor }) {
  return (
    <div className="dsm-row">
      <div className="dsm-row-text">
        {htmlFor ? <label className="dsm-row-title" htmlFor={htmlFor}>{title}</label> : <div className="dsm-row-title">{title}</div>}
        {desc ? <div className="dsm-row-desc">{desc}</div> : null}
      </div>
      <div className="dsm-row-ctl">{children}</div>
    </div>
  );
}
function BlockRow({ title, desc, htmlFor, children }) {
  return (
    <div className="dsm-row dsm-row-block">
      <div className="dsm-row-text">
        {htmlFor ? <label className="dsm-row-title" htmlFor={htmlFor}>{title}</label> : <div className="dsm-row-title">{title}</div>}
        {desc ? <div className="dsm-row-desc">{desc}</div> : null}
      </div>
      {children}
    </div>
  );
}
function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="dsm-switch" disabled={disabled} onClick={() => onChange(!checked)}>
      <span className="dsm-thumb" />
    </button>
  );
}
function NumberBox({ id, field, value, onChange, unit, disabled }) {
  const f = SETTING_FIELDS[field];
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => { const n = Number(text); if (text.trim() && Number.isFinite(n)) onChange(Math.min(f.max, Math.max(f.min, Math.round(n)))); else setText(String(value)); };
  return (
    <span className="dsm-num">
      <input id={id} className="dsm-input dsm-input-num" inputMode="numeric" value={text} disabled={disabled}
        onChange={e => setText(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); }} aria-describedby={`${id}-range`} />
      {unit ? <span className="dsm-unit">{unit}</span> : null}
      <span id={`${id}-range`} className="dsm-sr">范围 {f.min} 到 {f.max}</span>
    </span>
  );
}
function Msg({ msg, fallback }) {
  return <span className={cx('dsm-msg', msg?.kind && `is-${msg.kind}`)} role="status" aria-live="polite">{msg?.text || fallback || ''}</span>;
}

/* ───────────── 状态 + API key ───────────── */

function StatusSection({ call, status, refresh }) {
  const uid = useId();
  const [key, setKey] = useState('');
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const [check, setCheck] = useState(null);
  const [flush, setFlush] = useState({ kind: '', text: '' });
  const k = status?.key;
  const busy = msg.kind === 'busy';

  const runCheck = useCallback(async () => {
    setCheck({ phase: 'busy' });
    const r = await call('check', {});
    setCheck(r?.ok ? { phase: 'ok', ...r } : { phase: 'error', message: r?.message || '连接失败' });
  }, [call]);
  const configured = !!k?.configured;
  useEffect(() => { if (configured) runCheck(); else setCheck(null); }, [configured, runCheck]);

  async function save(payload, okText) {
    setMsg({ kind: 'busy', text: payload.clear ? '正在清除…' : '正在验证并保存…' });
    const r = await call('setKey', payload);
    if (r?.ok) { setKey(''); setMsg({ kind: r.warning ? 'warn' : 'ok', text: r.warning || okText }); refresh(r); }
    else setMsg({ kind: 'error', text: r?.message || '保存失败' });
  }
  async function extractNow() {
    setFlush({ kind: 'busy', text: '正在整理…（会调用模型，可能需要几十秒）' });
    const r = await call('extractNow', {});
    if (!r?.ok) setFlush({ kind: 'error', text: r?.message || '整理失败' });
    else if (!r.sessions) setFlush({ kind: 'ok', text: '没有等待整理的对话' });
    else setFlush({ kind: r.errors.length ? 'warn' : 'ok', text: `已整理 ${r.sessions} 个对话：新增 ${r.added}、更新 ${r.updated}、删除 ${r.deleted} 条记忆${r.errors.length ? `；${r.errors[0]}` : ''}` });
    refresh();
  }

  const s = status?.settings;
  const st = status?.stats;
  const on = status?.ok && s?.enabled && configured;
  return (
    <>
      <div className="dsm-status" role="status">
        {status == null ? <span className="dsm-muted">正在读取状态…</span> : status.ok === false ? (
          <div className="dsm-status-line"><span className="dsm-dot is-warn" />{status.message}</div>
        ) : (
          <>
            <div className="dsm-status-line">
              <span className={cx('dsm-dot', on && check?.phase !== 'error' ? 'is-ok' : 'is-warn')} />
              <span>
                {!s.enabled ? '长期记忆已关闭' : !configured ? '还没有填写 Supermemory API key' : check?.phase === 'error' ? `连接失败：${check.message}` : check?.phase === 'ok'
                  ? `已连接 Supermemory（${(check.ms / 1000).toFixed(1)} 秒）· 记忆库「${s.containerTag}」现有 ${check.memories} 条记忆、${check.documents} 段对话`
                  : '正在连接 Supermemory…'}
              </span>
            </div>
            {st ? (
              <div className="dsm-muted">
                本次启动以来：召回 {st.recalls} 次 · 保存对话 {st.uploads} 次 · 整理 {st.extractions} 次（新增 {st.added}、更新 {st.updated}、删除 {st.deleted}）· 模型调用记忆工具 {st.toolCalls} 次
                {st.errors ? ` · 出错 ${st.errors} 次` : ''}
              </div>
            ) : null}
            {status.pending || status.extracting ? (
              <div className="dsm-inline dsm-pending">
                <span className="dsm-muted">{status.extracting ? `正在整理 ${status.extracting} 个对话…` : `${status.pending} 个对话等待整理（对话停下 ${s.extractDelaySec} 秒后自动进行）`}</span>
                <button type="button" className="dsm-btn dsm-outline dsm-sm" disabled={flush.kind === 'busy' || !configured} onClick={extractNow}>立即整理</button>
              </div>
            ) : null}
            {flush.text ? <Msg msg={flush} /> : null}
          </>
        )}
      </div>

      <BlockRow title="API Key" htmlFor={`${uid}-key`}
        desc={`保存在 DSH 凭据库（${KEY_REF}），不写入设置文件，也不会显示出来。保存前会先向 Supermemory 验证。在 console.supermemory.ai 的 API Keys 页面获取。`}>
        <div className="dsm-inline">
          <input id={`${uid}-key`} className="dsm-input" type="password" autoComplete="off" spellCheck={false}
            placeholder={configured ? `已配置（来自${SOURCE_LABEL[k.source] || k.source || '凭据'}），输入新 key 可替换` : '粘贴 Supermemory API key（sm_ 开头）'} value={key}
            disabled={busy || k?.writable === false} onChange={e => { setKey(e.target.value); setMsg({ kind: '', text: '' }); }}
            onKeyDown={e => { if (e.key === 'Enter' && key.trim()) save({ key }, '已验证并保存 API key'); }} />
          <span className={cx('dsm-badge', configured ? 'is-ok' : '')}>{configured ? '已配置' : '未配置'}</span>
        </div>
        <div className="dsm-inline">
          <Msg msg={msg} fallback={k?.writable === false ? '这个 key 来自系统环境变量，只能在系统里修改' : ''} />
          <button type="button" className="dsm-btn dsm-outline" disabled={!configured || check?.phase === 'busy'} onClick={runCheck}>{check?.phase === 'busy' ? '测试中…' : '测试连接'}</button>
          <button type="button" className="dsm-btn dsm-outline" disabled={busy || !configured || k?.writable === false || k?.source !== 'file'}
            onClick={() => save({ clear: true }, '已清除 API key')}>清除</button>
          <button type="button" className="dsm-btn dsm-primary" disabled={busy || !key.trim() || k?.writable === false}
            onClick={() => save({ key }, '已验证并保存 API key')}>保存 Key</button>
        </div>
      </BlockRow>
    </>
  );
}

/* ───────────── 设置项 ───────────── */

function ModelSelect({ id, call, draft, patch, disabled }) {
  const [models, setModels] = useState({ state: 'loading', groups: [] });
  useEffect(() => {
    let alive = true;
    call('models', {}).then(r => { if (alive) setModels(r?.ok ? { state: 'ready', groups: r.groups } : { state: 'error', groups: [] }); })
      .catch(() => { if (alive) setModels({ state: 'error', groups: [] }); });
    return () => { alive = false; };
  }, [call]);
  const value = draft.extractProvider ? JSON.stringify([draft.extractProvider, draft.extractModel]) : '';
  const known = !draft.extractProvider || models.groups.some(g => g.id === draft.extractProvider && g.models.some(m => m.id === draft.extractModel));
  return (
    <select id={id} className="dsm-select" value={value} disabled={disabled}
      onChange={e => { const v = e.target.value; if (!v) patch({ extractProvider: '', extractModel: '' }); else { const [p, m] = JSON.parse(v); patch({ extractProvider: p, extractModel: m }); } }}>
      <option value="">跟随会话模型</option>
      {!known ? <option value={value}>{draft.extractProvider} / {draft.extractModel}（当前不可用）</option> : null}
      {models.groups.map(g => (
        <optgroup key={g.id} label={g.name}>
          {g.models.map(m => <option key={m.id} value={JSON.stringify([g.id, m.id])}>{m.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

function SettingsSection({ call, form, draft, setDraft, saved, writable }) {
  const uid = useId();
  const [msg, setMsg] = useState({ kind: '', text: '' });
  const [advanced, setAdvanced] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const patch = p => { setDraft(d => normalizeSettings({ ...d, ...p })); setMsg({ kind: '', text: '' }); };
  const off = !writable || !draft.enabled;
  const [tagText, setTagText] = useState(draft.containerTag);
  useEffect(() => setTagText(draft.containerTag), [draft.containerTag]);
  const tagValid = !!sanitizeTag(tagText);
  async function save() {
    setMsg({ kind: 'busy', text: '正在保存…' });
    try {
      for (const k of Object.keys(SETTING_FIELDS)) {
        if (draft[k] === saved[k]) continue;
        if (!(await form.set(k, draft[k]))) throw new Error(`DSH 没有接受“${k}”的修改`);
      }
      setMsg({ kind: 'ok', text: '已保存，立即生效' });
    } catch (e) { setMsg({ kind: 'error', text: String(e?.message || e) }); }
  }
  const scopeDesc = SCOPES.find(x => x[0] === draft.scope)?.[2];
  return (
    <>
      <Row title="启用长期记忆" desc="关闭后不再召回、保存或整理记忆，模型的记忆工具也会提示已关闭。已有记忆不受影响。">
        <Toggle label="启用长期记忆" checked={draft.enabled} disabled={!writable} onChange={v => patch({ enabled: v })} />
      </Row>

      <h4 className="dsm-section-title">召回：回答前先想起相关的事</h4>
      <Row title="自动召回" desc="每次你发送消息时，用这条消息检索记忆，把相关内容作为一条折叠的「Supermemory」上下文交给模型。子代理不召回。">
        <Toggle label="自动召回" checked={draft.autoRecall} disabled={off} onChange={v => patch({ autoRecall: v })} />
      </Row>
      <Row title="附带用户画像" desc="每个会话第一次召回时，附上 Supermemory 汇总的长期画像（身份、偏好等）。同一会话不重复附带。">
        <Toggle label="附带用户画像" checked={draft.recallProfile} disabled={off || !draft.autoRecall} onChange={v => patch({ recallProfile: v })} />
      </Row>
      <Row title="附带历史对话片段" desc="除了提炼出的记忆，也检索以前对话的原文片段（来自“保存对话原文”）。当前会话自己的片段会被排除。">
        <Toggle label="附带历史对话片段" checked={draft.recallChunks} disabled={off || !draft.autoRecall} onChange={v => patch({ recallChunks: v })} />
      </Row>
      <Row title="最多召回" desc="每次最多注入多少条记忆和片段。越多模型知道得越多，也越占上下文。" htmlFor={`${uid}-limit`}>
        <NumberBox id={`${uid}-limit`} field="recallLimit" value={draft.recallLimit} unit="条" disabled={off || !draft.autoRecall} onChange={v => patch({ recallLimit: v })} />
      </Row>
      <Row title="相关度门槛" desc="只召回相关度不低于该值的内容（0–100）。实测中文提问对相关记忆约 66–78 分、无关内容约 52–59 分，默认 60。" htmlFor={`${uid}-th`}>
        <NumberBox id={`${uid}-th`} field="recallThreshold" value={draft.recallThreshold} unit="分" disabled={off || !draft.autoRecall} onChange={v => patch({ recallThreshold: v })} />
      </Row>
      <Row title="召回超时" desc="超过这个时间就不等了，直接发送（不影响对话）。国内直连一般 0.5–2 秒。" htmlFor={`${uid}-to`}>
        <NumberBox id={`${uid}-to`} field="recallTimeoutSec" value={draft.recallTimeoutSec} unit="秒" disabled={off || !draft.autoRecall} onChange={v => patch({ recallTimeoutSec: v })} />
      </Row>

      <h4 className="dsm-section-title">保存：对话结束后自动记住</h4>
      <Row title="保存对话原文" desc="每轮对话结束约 15 秒后，把整段对话（已隐去疑似密钥）上传为可检索的片段。同一会话会覆盖更新，不会重复。">
        <Toggle label="保存对话原文" checked={draft.captureConversations} disabled={off} onChange={v => patch({ captureConversations: v })} />
      </Row>
      <Row title="用 DSH 模型整理记忆" desc="对话停下一段时间后，用下面选择的模型从新内容里提炼关于你的长期事实，并与已有记忆比对后新增、更新或删除。每次约消耗几千 token。关闭后改由 Supermemory 服务器提取（实测免费账户上很慢或不产出）。">
        <Toggle label="用 DSH 模型整理记忆" checked={draft.modelExtraction} disabled={off || !draft.captureConversations} onChange={v => patch({ modelExtraction: v })} />
      </Row>
      <Row title="整理用的模型" desc="建议选一个便宜、快速的非推理模型（如 Flash 类）。默认跟随会话模型；它不可用时依次改用 DSH 默认模型和其他可用模型。" htmlFor={`${uid}-model`}>
        <ModelSelect id={`${uid}-model`} call={call} draft={draft} patch={patch} disabled={off || !draft.captureConversations || !draft.modelExtraction} />
      </Row>
      <Row title="停下多久后整理" desc="对话停下这么久没有新消息才整理，避免每轮都调用模型。退出 DSH 时没整理完的，下次启动后自动补上。" htmlFor={`${uid}-delay`}>
        <NumberBox id={`${uid}-delay`} field="extractDelaySec" value={draft.extractDelaySec} unit="秒" disabled={off || !draft.captureConversations || !draft.modelExtraction} onChange={v => patch({ extractDelaySec: v })} />
      </Row>

      <h4 className="dsm-section-title">隐私</h4>
      <Row title="包含助手的回答" desc="关闭后只上传和分析你自己说的话，助手的回答不出本机。">
        <Toggle label="包含助手的回答" checked={draft.captureAssistant} disabled={off} onChange={v => patch({ captureAssistant: v })} />
      </Row>
      <BlockRow title="不使用记忆的工作区" htmlFor={`${uid}-ex`} desc="每行一个路径或路径片段（不区分大小写和斜杠方向）。匹配的工作区里不召回、不保存、不整理，记忆工具也不可用。">
        <textarea id={`${uid}-ex`} className="dsm-input dsm-textarea" rows={3} value={draft.excludeWorkspaces} disabled={off} spellCheck={false}
          placeholder={'例如：\nC:/work/客户A\n机密'} onChange={e => patch({ excludeWorkspaces: e.target.value })} />
      </BlockRow>

      <button type="button" className="dsm-disclosure" aria-expanded={advanced} onClick={() => setAdvanced(v => !v)}>
        <span className="dsm-caret" aria-hidden="true">{advanced ? '▾' : '▸'}</span>高级设置
      </button>
      {advanced ? (
        <>
          <Row title="记忆范围" desc={scopeDesc} htmlFor={`${uid}-scope`}>
            <select id={`${uid}-scope`} className="dsm-select" value={draft.scope} disabled={off} onChange={e => patch({ scope: e.target.value })}>
              {SCOPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </Row>
          <BlockRow title="记忆库名称（容器标签）" htmlFor={`${uid}-tag`} desc={tagValid ? `Supermemory 里的容器标签，默认 dsh_personal。改名相当于换一个新的空记忆库，旧记忆仍保留在原标签下。` : '只能包含字母、数字、-、_ 和 .，最多 100 个字符。'}>
            <input id={`${uid}-tag`} className={cx('dsm-input', !tagValid && 'is-invalid')} value={tagText} disabled={off} spellCheck={false} aria-invalid={!tagValid}
              onChange={e => { setTagText(e.target.value); if (sanitizeTag(e.target.value)) patch({ containerTag: e.target.value.trim() }); }} />
          </BlockRow>
          <BlockRow title="服务器提取说明（entity context）" htmlFor={`${uid}-ec`} desc="只在关闭“用 DSH 模型整理记忆”、改由 Supermemory 服务器提取时使用，告诉服务器该记住什么。最多 1500 字符。">
            <textarea id={`${uid}-ec`} className="dsm-input dsm-textarea" rows={4} value={draft.entityContext} disabled={off} maxLength={1500}
              onChange={e => patch({ entityContext: e.target.value || DEFAULT_ENTITY_CONTEXT })} />
          </BlockRow>
          <BlockRow title="接口地址" htmlFor={`${uid}-base`} desc="留空使用官方地址 https://api.supermemory.ai；只有自建或代理时才需要修改。">
            <input id={`${uid}-base`} className="dsm-input" value={draft.baseURL} disabled={off} placeholder="https://api.supermemory.ai" spellCheck={false}
              onChange={e => patch({ baseURL: e.target.value })} />
          </BlockRow>
        </>
      ) : null}

      <div className="dsm-foot">
        <Msg msg={msg} fallback={dirty ? '有未保存的修改（下方“试一试”会使用当前填写的值）' : ''} />
        <button type="button" className="dsm-btn dsm-outline" disabled={!writable || JSON.stringify(draft) === JSON.stringify(DEFAULT_SETTINGS)} onClick={() => { setDraft(normalizeSettings(DEFAULT_SETTINGS)); setMsg({ kind: '', text: '' }); }}>恢复默认</button>
        <button type="button" className="dsm-btn dsm-outline" disabled={!dirty || msg.kind === 'busy'} onClick={() => { setDraft(saved); setMsg({ kind: '', text: '' }); }}>撤销</button>
        <button type="button" className="dsm-btn dsm-primary" disabled={!writable || !dirty || msg.kind === 'busy'} onClick={save}>保存</button>
      </div>
    </>
  );
}

/* ───────────── 记忆库 ───────────── */

function MemoryEditor({ initial, onSubmit, onCancel, submitText, showStatic }) {
  const uid = useId();
  const [text, setText] = useState(initial?.text ?? '');
  const [english, setEnglish] = useState(initial?.english ?? '');
  const [isStatic, setStatic] = useState(!!initial?.isStatic);
  const [msg, setMsg] = useState({ kind: '', text: '' });
  async function submit() {
    setMsg({ kind: 'busy', text: '正在保存…' });
    const r = await onSubmit({ memory: text.trim(), english: english.trim(), isStatic });
    if (r?.ok) { setMsg({ kind: '', text: '' }); if (!initial) { setText(''); setEnglish(''); setStatic(false); } }
    else setMsg({ kind: 'error', text: r?.message || '保存失败' });
  }
  return (
    <div className="dsm-editor">
      <label className="dsm-sr" htmlFor={`${uid}-t`}>记忆内容</label>
      <textarea id={`${uid}-t`} className="dsm-input dsm-textarea" rows={2} maxLength={1000} value={text} placeholder="一句关于你的事实，例如：用户的论文初稿截止日期是 2026-10-20。"
        onChange={e => setText(e.target.value)} />
      <label className="dsm-sr" htmlFor={`${uid}-e`}>英文释义</label>
      <input id={`${uid}-e`} className="dsm-input" value={english} maxLength={400} placeholder="英文释义（可选，能提高检索准确度；不填会自动加标记）" onChange={e => setEnglish(e.target.value)} />
      <div className="dsm-inline">
        {showStatic ? (
          <label className="dsm-check"><input type="checkbox" checked={isStatic} onChange={e => setStatic(e.target.checked)} />长期不变（身份、固定偏好）</label>
        ) : <span />}
        <Msg msg={msg} />
        {onCancel ? <button type="button" className="dsm-btn dsm-outline dsm-sm" onClick={onCancel}>取消</button> : null}
        <button type="button" className="dsm-btn dsm-primary dsm-sm" disabled={!text.trim() || msg.kind === 'busy'} onClick={submit}>{submitText}</button>
      </div>
    </div>
  );
}

function MemoryItem({ item, tag, call, onChanged }) {
  const [mode, setMode] = useState('view');
  const [msg, setMsg] = useState({ kind: '', text: '' });
  async function forget() {
    setMsg({ kind: 'busy', text: '正在删除…' });
    const r = await call('forget', { tag, ids: [item.id] });
    if (r?.ok) onChanged({ removed: item.id }); else { setMode('view'); setMsg({ kind: 'error', text: r?.message || '删除失败' }); }
  }
  if (mode === 'edit') {
    return (
      <li className="dsm-mem">
        <MemoryEditor initial={item} submitText="保存修改" onCancel={() => setMode('view')}
          onSubmit={async v => { const r = await call('update', { tag, id: item.id, memory: v.memory, english: v.english }); if (r?.ok) { setMode('view'); onChanged({ updated: true }); } return r; }} />
      </li>
    );
  }
  return (
    <li className="dsm-mem">
      <div className="dsm-mem-main">
        <div className="dsm-mem-text">
          {item.kind === 'chunk' ? <span className="dsm-badge">对话片段</span> : null}
          {item.isStatic ? <span className="dsm-badge is-ok">长期</span> : null}
          {item.title ? <span className="dsm-mem-title">《{item.title}》</span> : null}
          {item.text}
        </div>
        {item.english ? <div className="dsm-muted">{item.english}</div> : null}
        <div className="dsm-muted">
          {item.updatedAt ? ago(item.updatedAt) : ''}
          {item.version > 1 ? ` · 第 ${item.version} 版` : ''}
          {typeof item.similarity === 'number' && item.similarity > 0 ? ` · 相关度 ${Math.round(item.similarity * 100)}` : ''}
          {item.metadata?.via === 'tool' ? ' · 模型保存' : item.metadata?.via === 'settings' ? ' · 手动添加' : item.metadata?.source === 'dsh' ? ' · 自动整理' : ''}
        </div>
        {msg.text ? <Msg msg={msg} /> : null}
      </div>
      {item.kind !== 'chunk' ? (
        <div className="dsm-mem-actions">
          {mode === 'confirm' ? (
            <>
              <button type="button" className="dsm-btn dsm-danger dsm-sm" disabled={msg.kind === 'busy'} onClick={forget}>确认删除</button>
              <button type="button" className="dsm-btn dsm-outline dsm-sm" onClick={() => setMode('view')}>取消</button>
            </>
          ) : (
            <>
              <button type="button" className="dsm-btn dsm-ghost dsm-sm" aria-label={`编辑：${item.text}`} onClick={() => setMode('edit')}>编辑</button>
              <button type="button" className="dsm-btn dsm-ghost dsm-sm" aria-label={`删除：${item.text}`} onClick={() => setMode('confirm')}>删除</button>
            </>
          )}
        </div>
      ) : null}
    </li>
  );
}

function LibrarySection({ call, status }) {
  const uid = useId();
  const current = status?.settings?.containerTag;
  const [tags, setTags] = useState({ phase: 'idle', list: [] });
  const [tag, setTag] = useState('');
  const [view, setView] = useState('list');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ phase: 'idle' });
  const [adding, setAdding] = useState(false);
  const [nonce, setNonce] = useState(0);
  const configured = !!status?.key?.configured;

  const loadTags = useCallback(async () => {
    setTags(t => ({ ...t, phase: 'busy' }));
    const r = await call('tags', {});
    setTags(r?.ok ? { phase: 'ok', list: r.tags } : { phase: 'error', list: [], message: r?.message });
  }, [call]);
  useEffect(() => { if (configured) loadTags(); }, [configured, loadTags]);
  useEffect(() => { if (current && !tag) setTag(current); }, [current, tag]);

  const activeTag = tag || current;
  useEffect(() => {
    if (!configured || !activeTag) return;
    let alive = true;
    setData(d => ({ ...d, phase: 'busy' }));
    const req = view === 'profile' ? call('profile', { tag: activeTag })
      : view === 'search' ? call('search', { tag: activeTag, q, chunks: true, threshold: 0.3 })
        : call('memories', { tag: activeTag, page, limit: 20 });
    req.then(r => { if (alive) setData(r?.ok ? { phase: 'ok', ...r } : { phase: 'error', message: r?.message || '读取失败' }); });
    return () => { alive = false; };
  }, [configured, activeTag, view, page, nonce, call]); // eslint-disable-line react-hooks/exhaustive-deps

  const options = useMemo(() => {
    const list = [...tags.list];
    if (activeTag && !list.some(t => t.tag === activeTag)) list.unshift({ tag: activeTag, memoryCount: 0, documentCount: 0, ours: true, workspace: '' });
    return list.sort((a, b) => (b.ours - a.ours) || (b.tag === current) - (a.tag === current) || a.tag.localeCompare(b.tag));
  }, [tags.list, activeTag, current]);

  if (!configured) return (
    <>
      <h4 className="dsm-section-title">记忆库</h4>
      <p className="dsm-muted dsm-pad">填写 API key 后可以在这里查看、搜索、添加、修改和删除记忆。</p>
    </>
  );
  const items = view === 'search' ? data.results : view === 'list' ? data.entries : null;
  const runSearch = () => { if (q.trim()) { setView('search'); setNonce(n => n + 1); } };
  return (
    <>
      <h4 className="dsm-section-title">记忆库</h4>
      <div className="dsm-toolbar">
        <label className="dsm-sr" htmlFor={`${uid}-tag`}>记忆库</label>
        <select id={`${uid}-tag`} className="dsm-select" value={activeTag} onChange={e => { setTag(e.target.value); setPage(1); }}>
          {options.map(t => (
            <option key={t.tag} value={t.tag}>
              {t.tag === current ? '★ ' : ''}{t.workspace ? `工作区「${t.workspace}」` : t.tag}（{t.memoryCount} 条）
            </option>
          ))}
        </select>
        <div className="dsm-seg" role="tablist" aria-label="视图">
          {[['list', '全部记忆'], ['profile', '用户画像']].map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} className={cx('dsm-seg-btn', view === v && 'is-on')} onClick={() => { setView(v); setPage(1); }}>{l}</button>
          ))}
        </div>
        <button type="button" className="dsm-btn dsm-outline dsm-sm" onClick={() => { loadTags(); setNonce(n => n + 1); }} disabled={data.phase === 'busy'}>刷新</button>
        <button type="button" className="dsm-btn dsm-outline dsm-sm" aria-expanded={adding} onClick={() => setAdding(v => !v)}>{adding ? '收起' : '添加记忆'}</button>
      </div>
      <div className="dsm-inline dsm-search">
        <label className="dsm-sr" htmlFor={`${uid}-q`}>搜索记忆</label>
        <input id={`${uid}-q`} className="dsm-input" value={q} placeholder="搜索记忆和对话片段（支持中文、英文）" maxLength={500}
          onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') runSearch(); }} />
        <button type="button" className="dsm-btn dsm-outline" disabled={!q.trim()} onClick={runSearch}>搜索</button>
        {view === 'search' ? <button type="button" className="dsm-btn dsm-ghost" onClick={() => { setView('list'); setQ(''); }}>清除</button> : null}
      </div>
      {adding ? (
        <MemoryEditor submitText="添加" showStatic onCancel={() => setAdding(false)}
          onSubmit={async v => { const r = await call('add', { tag: activeTag, ...v }); if (r?.ok) { setAdding(false); setView('list'); setPage(1); setNonce(n => n + 1); loadTags(); } return r; }} />
      ) : null}

      <div className="dsm-list-wrap" aria-busy={data.phase === 'busy'}>
        {data.phase === 'error' ? <p className="dsm-msg is-error" role="alert">{data.message}</p> : null}
        {data.phase === 'busy' && !items && view !== 'profile' ? <p className="dsm-muted dsm-pad">正在读取…</p> : null}
        {view === 'profile' && data.phase === 'ok' ? (
          <div className="dsm-profile">
            <p className="dsm-muted">Supermemory 根据已有记忆自动汇总的画像。长期部分来自标记为“长期不变”的记忆，近期部分是最近的动态。</p>
            <h5>长期</h5>
            {data.static?.length ? <ul>{data.static.map((t, i) => <li key={i}>{t}</li>)}</ul> : <p className="dsm-muted">暂无</p>}
            <h5>近期</h5>
            {data.dynamic?.length ? <ul>{data.dynamic.map((t, i) => <li key={i}>{t}</li>)}</ul> : <p className="dsm-muted">暂无</p>}
          </div>
        ) : null}
        {items ? (
          items.length ? (
            <ul className="dsm-mems">
              {items.map(it => <MemoryItem key={it.id} item={it} tag={activeTag} call={call}
                onChanged={c => { if (c.removed) setData(d => ({ ...d, entries: d.entries?.filter(x => x.id !== c.removed), results: d.results?.filter(x => x.id !== c.removed) })); else setNonce(n => n + 1); }} />)}
            </ul>
          ) : <p className="dsm-muted dsm-pad">{view === 'search' ? '没有找到相关内容。' : '这个记忆库还是空的。和模型聊几轮，或者说“记住……”，记忆就会出现在这里。'}</p>
        ) : null}
        {view === 'list' && data.phase === 'ok' && data.totalPages > 1 ? (
          <div className="dsm-pager">
            <button type="button" className="dsm-btn dsm-outline dsm-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
            <span className="dsm-muted">第 {data.page} / {data.totalPages} 页，共 {data.total} 条</span>
            <button type="button" className="dsm-btn dsm-outline dsm-sm" disabled={page >= data.totalPages} onClick={() => setPage(p => p + 1)}>下一页</button>
          </div>
        ) : null}
      </div>
      <ClearTag call={call} tag={activeTag} count={options.find(t => t.tag === activeTag)} onCleared={() => { setPage(1); setView('list'); setNonce(n => n + 1); loadTags(); }} />
    </>
  );
}

/** 清空当前记忆库：两步确认，删除其中全部记忆与对话片段。 */
function ClearTag({ call, tag, count, onCleared }) {
  const [phase, setPhase] = useState('idle');
  const [msg, setMsg] = useState({ kind: '', text: '' });
  useEffect(() => { setPhase('idle'); setMsg({ kind: '', text: '' }); }, [tag]);
  async function clear() {
    setPhase('busy'); setMsg({ kind: 'busy', text: '正在清空…' });
    const r = await call('clearTag', { tag, confirm: tag });
    setPhase('idle');
    if (r?.ok) { setMsg({ kind: 'ok', text: `已清空「${tag}」` }); onCleared(); }
    else setMsg({ kind: 'error', text: r?.message || '清空失败' });
  }
  return (
    <div className="dsm-danger-zone">
      {phase === 'idle' ? (
        <>
          <Msg msg={msg} fallback="清空会永久删除这个记忆库里的全部记忆和已保存的对话原文。" />
          <button type="button" className="dsm-btn dsm-outline dsm-sm" disabled={!tag} onClick={() => { setMsg({ kind: '', text: '' }); setPhase('confirm'); }}>清空记忆库…</button>
        </>
      ) : (
        <>
          <span className="dsm-msg is-error" role="alert">
            确定清空「{tag}」吗？{count ? `其中 ${count.memoryCount} 条记忆、${count.documentCount} 份文档` : '其中全部内容'}将被永久删除，无法恢复。
          </span>
          <button type="button" className="dsm-btn dsm-outline dsm-sm" disabled={phase === 'busy'} onClick={() => setPhase('idle')}>取消</button>
          <button type="button" className="dsm-btn dsm-danger dsm-sm" disabled={phase === 'busy'} onClick={clear}>{phase === 'busy' ? '正在清空…' : '确认清空'}</button>
        </>
      )}
    </div>
  );
}

/* ───────────── 试一试 + 最近活动 ───────────── */

function PreviewSection({ call, draft, configured }) {
  const uid = useId();
  const [q, setQ] = useState('我最近在忙什么？');
  const [state, setState] = useState({ phase: 'idle' });
  const ctrl = useRef(null);
  useEffect(() => () => ctrl.current?.abort(), []);
  async function run() {
    ctrl.current?.abort();
    const c = new AbortController(); ctrl.current = c;
    setState({ phase: 'busy' });
    const r = await call('preview', { q, settings: draft }, c.signal);
    if (c.signal.aborted) return;
    setState(r?.ok ? { phase: 'done', ...r } : { phase: 'error', message: r?.message || '召回失败' });
  }
  return (
    <>
      <h4 className="dsm-section-title">试一试</h4>
      <BlockRow title="模拟一次提问" htmlFor={`${uid}-q`} desc="用当前填写的召回设置检索一次，看看模型会收到哪些记忆（不会发给模型，也不会写入任何东西）。">
        <div className="dsm-inline">
          <input id={`${uid}-q`} className="dsm-input" value={q} maxLength={500} onChange={e => setQ(e.target.value)} disabled={!configured}
            onKeyDown={e => { if (e.key === 'Enter' && q.trim() && state.phase !== 'busy') run(); }} />
          <button type="button" className="dsm-btn dsm-primary" disabled={!configured || !q.trim() || state.phase === 'busy'} onClick={run}>{state.phase === 'busy' ? '检索中…' : '试一试'}</button>
        </div>
        <div role="status" aria-live="polite">
          {state.phase === 'error' ? <span className="dsm-msg is-error">{state.message}</span> : null}
          {state.phase === 'done' ? (
            <>
              <p className="dsm-muted">{state.summary || '没有召回任何内容（可以试着降低相关度门槛）'} · {(state.ms / 1000).toFixed(1)} 秒 · 记忆库 {state.tags.join('、')}{state.warning ? ` · ${state.warning}` : ''}</p>
              {state.text ? <pre className="dsm-pre">{state.text}</pre> : null}
            </>
          ) : null}
        </div>
      </BlockRow>
    </>
  );
}

function ActivitySection({ status }) {
  const list = status?.activity || [];
  return (
    <>
      <h4 className="dsm-section-title">最近活动</h4>
      {list.length ? (
        <ul className="dsm-activity">
          {list.slice(0, 20).map((a, i) => (
            <li key={`${a.at}-${i}`} className={cx(!a.ok && 'is-error')}>
              <span className="dsm-act-kind">{KIND_LABEL[a.kind] || a.kind}</span>
              <span className="dsm-act-text">{a.text}</span>
              <span className="dsm-act-time">{ago(a.at)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="dsm-muted dsm-pad">本次启动以来还没有活动。发一条消息试试。</p>}
    </>
  );
}

export function SupermemoryPage({ form, call }) {
  const snap = useSyncExternalStore(form.subscribe, form.getSnapshot, form.getSnapshot);
  const saved = useMemo(() => normalizeSettings(snap.value), [snap.value]);
  const [draft, setDraft] = useState(saved);
  const [status, setStatus] = useState(null);
  const touched = useRef(false);
  const lastSaved = useRef(saved);
  useEffect(() => {
    // 首次加载或保存成功后，草稿跟随 Host 值；用户正在编辑时不覆盖。
    if (!touched.current || JSON.stringify(draft) === JSON.stringify(lastSaved.current)) setDraft(saved);
    lastSaved.current = saved;
  }, [saved]); // eslint-disable-line react-hooks/exhaustive-deps
  const refresh = useCallback(async next => {
    const r = next?.ok ? next : await call('status', {});
    setStatus(r?.ok ? r : { ok: false, message: r?.message || '无法读取 Supermemory 插件状态' });
  }, [call]);
  useEffect(() => {
    refresh();
    const t = setInterval(() => { if (typeof document === 'undefined' || document.visibilityState !== 'hidden') refresh(); }, 8000);
    return () => clearInterval(t);
  }, [refresh]);
  const writable = snap.status === 'ready' && snap.writable;
  return (
    <div className="dsm-page" data-dsh-supermemory="">
      <StatusSection call={call} status={status} refresh={refresh} />
      {snap.status === 'unavailable' ? <p className="dsm-msg is-error" role="alert">设置命名空间不可用，当前只能使用默认设置。</p> : null}
      <SettingsSection call={call} form={form} draft={draft} setDraft={v => { touched.current = true; setDraft(v); }} saved={saved} writable={writable} />
      <LibrarySection call={call} status={status} />
      <PreviewSection call={call} draft={draft} configured={!!status?.key?.configured} />
      <ActivitySection status={status} />
    </div>
  );
}

/** plugins.item 槽位：summary 是卡片一行说明，page 是点开后的设置页。
 *  宿主会传入自己的 form 属性，所以本插件注入的属性用 smForm / smCall 命名以免被覆盖。 */
export function SupermemoryPluginItem({ view, smForm, smCall }) {
  if (view !== 'page') return SUMMARY;
  return <SupermemoryPage form={smForm} call={smCall} />;
}
