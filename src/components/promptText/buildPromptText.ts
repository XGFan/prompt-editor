import { FragmentState } from '../../domain/types';

export type PromptFormat = 'markdown' | 'yaml' | 'xml';

/**
 * 根据片段区状态生成 Prompt 文本
 * 
 * 规则：
 * 1. 只输出有内容的组（组内至少 1 条 prompt）。
 * 2. 格式支持：markdown (默认), yaml, xml。
 * 3. 组顺序来自 groupOrder，组内 prompt 顺序来自 promptIds。
 * 4. 组间空行。
 */
export function buildPromptText(fragments: FragmentState, format: PromptFormat = 'markdown'): string {
  const groupsWithPrompts = fragments.groupOrder
    .map((groupId) => {
      const group = fragments.groups[groupId];
      if (!group) return null;

      const prompts = group.promptIds
        .map((id) => fragments.prompts[id])
        .filter((p) => p && p.content.trim().length > 0);

      if (prompts.length === 0) return null;

      return {
        name: group.name,
        prompts: prompts.map((p) => `${p.content.trim()};`),
      };
    })
    .filter((g): g is { name: string; prompts: string[] } => g !== null);

  if (groupsWithPrompts.length === 0) {
    return '';
  }

  if (format === 'yaml') {
    return groupsWithPrompts
      .map((g) => {
        const header = `${g.name}:`;
        const items = g.prompts.map((p) => `  - ${p}`).join('\n');
        return `${header}\n${items}`;
      })
      .join('\n\n');
  }

  if (format === 'xml') {
    const lines = ['<prompts>'];
    groupsWithPrompts.forEach((g) => {
      lines.push(`  <group name="${g.name}">`);
      g.prompts.forEach((p) => {
        lines.push(`    <snippet>${p}</snippet>`);
      });
      lines.push('  </group>');
    });
    lines.push('</prompts>');
    return lines.join('\n');
  }

  // Default: markdown
  return groupsWithPrompts
    .map((g) => {
      const header = `##${g.name}`;
      const items = g.prompts.join('\n');
      return `${header}\n${items}`;
    })
    .join('\n\n');
}
