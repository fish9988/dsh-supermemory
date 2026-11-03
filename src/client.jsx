import { ENTRY_ID, PACKAGE_ID, createHttpCall } from './core.mjs';
import { SupermemoryPluginItem, UI_CSS } from './ui/components.jsx';

export const inject = ['slots', 'configForms'];

export function apply(ctx) {
  // configForms 返回类实例（方法依赖 this）；包成绑定好的稳定函数再交给 useSyncExternalStore。
  const raw = ctx.configForms.get(ENTRY_ID);
  const form = {
    subscribe: listener => raw.subscribe(listener),
    getSnapshot: () => raw.getSnapshot(),
    set: (field, value) => raw.set(field, value),
  };
  // 同源相对路径请求 Host 路由；调用时再取全局 fetch。
  const call = createHttpCall((url, init) => fetch(url, init));

  ctx.effect(() => {
    const style = document.createElement('style');
    style.dataset.plugin = PACKAGE_ID;
    style.textContent = UI_CSS;
    document.head.appendChild(style);
    return () => style.remove();
  }, 'supermemory: styles');

  // 侧栏“插件”列表：排在网页搜索类插件之后。
  ctx.slots.inject('plugins.item', () => ctx.slots.register({
    name: 'plugins.item',
    id: ENTRY_ID,
    order: 45,
    label: 'Supermemory 长期记忆',
    inject: () => ({ smForm: form, smCall: call }),
  }, SupermemoryPluginItem));
}
