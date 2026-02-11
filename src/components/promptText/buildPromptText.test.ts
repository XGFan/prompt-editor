import { describe, expect, it } from 'vitest';
import { buildPromptText, PromptFormat } from './buildPromptText';
import { FragmentState, GroupId, PromptId } from '../../domain/types';

const gid = (v: string) => v as GroupId;
const pid = (v: string) => v as PromptId;

const mockState: FragmentState = {
  groupOrder: [gid('g1'), gid('g2')],
  groups: {
    g1: { 
      id: gid('g1'), 
      name: 'Group 1', 
      promptIds: [pid('p1'), pid('p2')], 
      collapsed: false 
    },
    g2: { 
      id: gid('g2'), 
      name: 'Group 2', 
      promptIds: [pid('p3')], 
      collapsed: false 
    },
  },
  prompts: {
    p1: { id: pid('p1'), content: 'prompt 1', createdAt: '', updatedAt: '' },
    p2: { id: pid('p2'), content: 'prompt 2', createdAt: '', updatedAt: '' },
    p3: { id: pid('p3'), content: 'prompt 3', createdAt: '', updatedAt: '' },
  },
};

describe('buildPromptText', () => {
  it('should generate empty string for empty fragments state', () => {
    const state: FragmentState = {
      groupOrder: [],
      groups: {},
      prompts: {},
    };
    expect(buildPromptText(state)).toBe('');
  });

  it('should skip empty groups or groups with empty prompts', () => {
    const state: FragmentState = {
      groupOrder: [gid('g1'), gid('g2')],
      groups: {
        g1: { id: gid('g1'), name: 'Empty Group', promptIds: [], collapsed: false },
        g2: { id: gid('g2'), name: 'Group with empty prompt', promptIds: [pid('p1')], collapsed: false },
      },
      prompts: {
        p1: { id: pid('p1'), content: '  ', createdAt: '', updatedAt: '' },
      },
    };
    expect(buildPromptText(state)).toBe('');
  });

  describe('Markdown format (default)', () => {
    it('should generate correctly formatted markdown text', () => {
      const expected = [
        '##Group 1',
        'prompt 1',
        'prompt 2',
        '',
        '##Group 2',
        'prompt 3',
      ].join('\n');

      expect(buildPromptText(mockState)).toBe(expected);
      expect(buildPromptText(mockState, 'markdown')).toBe(expected);
    });

    it('should output each prompt without trailing semicolon', () => {
      const state: FragmentState = {
        groupOrder: [gid('g1')],
        groups: {
          g1: { id: gid('g1'), name: 'Test', promptIds: [pid('p1')], collapsed: false },
        },
        prompts: {
          p1: { id: pid('p1'), content: 'Only one', createdAt: '', updatedAt: '' },
        },
      };
      expect(buildPromptText(state)).toBe('##Test\nOnly one');
    });
  });

  describe('YAML format', () => {
    it('should generate correctly formatted YAML text', () => {
      const expected = [
        'Group 1:',
        '  - prompt 1',
        '  - prompt 2',
        '',
        'Group 2:',
        '  - prompt 3',
      ].join('\n');

      expect(buildPromptText(mockState, 'yaml')).toBe(expected);
    });
  });

  describe('XML format', () => {
    it('should generate correctly formatted XML text', () => {
      const expected = [
        '<prompts>',
        '  <group name="Group 1">',
        '    <snippet>prompt 1</snippet>',
        '    <snippet>prompt 2</snippet>',
        '  </group>',
        '  <group name="Group 2">',
        '    <snippet>prompt 3</snippet>',
        '  </group>',
        '</prompts>',
      ].join('\n');

      expect(buildPromptText(mockState, 'xml')).toBe(expected);
    });
  });
});
