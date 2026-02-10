import { describe, expect, it } from 'vitest'

import { ValidationError } from '../domain/validate'
import {
  addLibraryPromptToFragments,
  clampColumnWidths,
  createGroup,
  createPrompt,
  deleteSavedPrompt,
  deleteGroup,
  deletePrompt,
  duplicatePrompt,
  editPromptContent,
  loadSavedPromptToFragments,
  movePrompt,
  renameSavedPrompt,
  renameGroup,
  reorderGroup,
  reorderPromptWithinGroup,
  resetColumnWidths,
  saveCurrentFragmentsAsSavedPrompt,
  setColumnWidths,
  toggleGroupCollapsed,
  togglePromptExpanded,
  updateSavedPromptTags,
} from './actions'
import { buildActionContext, buildBaseState, buildSessionUi, gid, pid, spid } from './fixtures'

describe('store/actions', () => {
  it('createGroup: trims name and appends to target area', () => {
    const ctx = buildActionContext()
    const next = createGroup(buildBaseState(), { area: 'library', name: '  New Group  ' }, ctx)

    const newGroupId = gid('library-g-new-1')
    expect(next.library.groupOrder.at(-1)).toBe(newGroupId)
    expect(next.library.groups[newGroupId]?.name).toBe('New Group')
  })

  it('createGroup: rejects empty or duplicate name within same area', () => {
    const state = buildBaseState()
    const ctx = buildActionContext()

    expect(() => createGroup(state, { area: 'library', name: '   ' }, ctx)).toThrow(ValidationError)
    expect(() => createGroup(state, { area: 'library', name: 'System' }, ctx)).toThrow('duplicate group name')
  })

  it('renameGroup: rejects duplicates and updates group name', () => {
    const state = buildBaseState()

    expect(() =>
      renameGroup(state, {
        area: 'library',
        groupId: gid('lib-g-2'),
        name: 'System',
      }),
    ).toThrow('duplicate group name')

    const next = renameGroup(state, {
      area: 'library',
      groupId: gid('lib-g-2'),
      name: 'Sales',
    })

    expect(next.library.groups[gid('lib-g-2')]?.name).toBe('Sales')
  })

  it('deleteGroup: removes group and its prompts only in target area', () => {
    const next = deleteGroup(buildBaseState(), {
      area: 'library',
      groupId: gid('lib-g-1'),
    })

    expect(next.library.groups[gid('lib-g-1')]).toBeUndefined()
    expect(next.library.prompts[pid('lib-p-1')]).toBeUndefined()
    expect(next.fragments.groups[gid('frag-g-1')]).toBeDefined()
    expect(next.fragments.prompts[pid('frag-p-1')]).toBeDefined()
  })

  it('reorderGroup: reorders by source/target index', () => {
    const next = reorderGroup(buildBaseState(), {
      area: 'library',
      sourceIndex: 0,
      targetIndex: 1,
    })

    expect(next.library.groupOrder).toEqual([gid('lib-g-2'), gid('lib-g-1')])
  })

  it('toggleGroupCollapsed: flips collapsed state', () => {
    const next = toggleGroupCollapsed(buildBaseState(), {
      area: 'library',
      groupId: gid('lib-g-1'),
    })
    expect(next.library.groups[gid('lib-g-1')]?.collapsed).toBe(true)
  })

  it('createPrompt: inserts prompt into group with new id', () => {
    const ctx = buildActionContext()
    const next = createPrompt(
      buildBaseState(),
      {
        area: 'fragments',
        groupId: gid('frag-g-1'),
        content: '  Hello world  ',
      },
      ctx,
    )

    const newPromptId = pid('fragments-p-new-1')
    expect(next.fragments.prompts[newPromptId]?.content).toBe('Hello world')
    expect(next.fragments.groups[gid('frag-g-1')]?.promptIds.at(-1)).toBe(newPromptId)
  })

  it('editPromptContent: updates content and updatedAt only', () => {
    const ctx = buildActionContext()
    const next = editPromptContent(
      buildBaseState(),
      {
        area: 'library',
        promptId: pid('lib-p-1'),
        content: 'Updated content',
      },
      ctx,
    )

    expect(next.library.prompts[pid('lib-p-1')]?.content).toBe('Updated content')
    expect(next.library.prompts[pid('lib-p-1')]?.updatedAt).toBe('2026-02-07T10:00:00.000Z')
    expect(next.library.prompts[pid('lib-p-1')]?.createdAt).toBe('2026-02-07T00:00:00.000Z')
  })

  it('deletePrompt: removes prompt and reference in group', () => {
    const next = deletePrompt(buildBaseState(), {
      area: 'library',
      groupId: gid('lib-g-1'),
      promptId: pid('lib-p-1'),
    })

    expect(next.library.prompts[pid('lib-p-1')]).toBeUndefined()
    expect(next.library.groups[gid('lib-g-1')]?.promptIds).toEqual([])
  })

  it('reorderPromptWithinGroup: reorders prompts in same group', () => {
    const state = buildBaseState()
    const group = state.fragments.groups[gid('frag-g-1')]
    if (!group) throw new Error('missing fixture group')

    group.promptIds.push(pid('frag-p-2'))
    state.fragments.prompts[pid('frag-p-2')] = {
      id: pid('frag-p-2'),
      content: 'Second',
      createdAt: '2026-02-07T00:00:00.000Z',
      updatedAt: '2026-02-07T00:00:00.000Z',
    }

    const next = reorderPromptWithinGroup(state, {
      area: 'fragments',
      groupId: gid('frag-g-1'),
      sourceIndex: 1,
      targetIndex: 0,
    })

    expect(next.fragments.groups[gid('frag-g-1')]?.promptIds).toEqual([pid('frag-p-2'), pid('frag-p-1')])
  })

  it('movePrompt: moves prompt across groups preserving prompt object', () => {
    const next = movePrompt(buildBaseState(), {
      area: 'library',
      fromGroupId: gid('lib-g-1'),
      toGroupId: gid('lib-g-2'),
      promptId: pid('lib-p-1'),
      targetIndex: 0,
    })

    expect(next.library.groups[gid('lib-g-1')]?.promptIds).toEqual([])
    expect(next.library.groups[gid('lib-g-2')]?.promptIds).toEqual([pid('lib-p-1')])
    expect(next.library.prompts[pid('lib-p-1')]).toBeDefined()
  })

  it('duplicatePrompt: creates new prompt id and inserts below original', () => {
    const ctx = buildActionContext()
    const next = duplicatePrompt(
      buildBaseState(),
      {
        area: 'library',
        groupId: gid('lib-g-1'),
        promptId: pid('lib-p-1'),
      },
      ctx,
    )

    const duplicatedId = pid('library-p-new-1')
    expect(next.library.groups[gid('lib-g-1')]?.promptIds).toEqual([pid('lib-p-1'), duplicatedId])
    expect(next.library.prompts[duplicatedId]?.content).toBe(next.library.prompts[pid('lib-p-1')]?.content)
  })

  it('addLibraryPromptToFragments: appends into same-name fragments group and copy-by-value isolated', () => {
    const ctx = buildActionContext()
    const copied = addLibraryPromptToFragments(
      buildBaseState(),
      {
        libraryPromptId: pid('lib-p-1'),
        libraryGroupId: gid('lib-g-1'),
      },
      ctx,
    )

    const newFragmentPromptId = pid('fragments-p-new-1')
    expect(copied.fragments.groups[gid('frag-g-1')]?.promptIds.at(-1)).toBe(newFragmentPromptId)

    const edited = editPromptContent(
      copied,
      {
        area: 'fragments',
        promptId: newFragmentPromptId,
        content: 'Fragment-only edit',
      },
      ctx,
    )

    expect(edited.fragments.prompts[newFragmentPromptId]?.content).toBe('Fragment-only edit')
    expect(edited.library.prompts[pid('lib-p-1')]?.content).toBe('Summarize in 3 bullets.')
  })

  it('addLibraryPromptToFragments: auto-creates group when same-name group missing', () => {
    const ctx = buildActionContext()
    const state = buildBaseState()
    state.fragments.groups[gid('frag-g-1')].name = 'Different'

    const next = addLibraryPromptToFragments(
      state,
      {
        libraryPromptId: pid('lib-p-1'),
        libraryGroupId: gid('lib-g-1'),
      },
      ctx,
    )

    const newGroupId = gid('fragments-g-new-1')
    expect(next.fragments.groups[newGroupId]?.name).toBe('System')
    expect(next.fragments.groups[newGroupId]?.promptIds).toEqual([pid('fragments-p-new-1')])
  })

  it('saveCurrentFragmentsAsSavedPrompt: saves deep-copied snapshot and isolates from later fragments edits', () => {
    const ctx = buildActionContext()
    const saved = saveCurrentFragmentsAsSavedPrompt(
      buildBaseState(),
      {
        name: '  Weekly Notes  ',
        tags: ['  planning ', ' ', 'planning', ' retro '],
      },
      ctx,
    )

    const savedPromptId = spid('saved-prompt-new-1')
    expect(saved.savedPrompts.order.at(-1)).toBe(savedPromptId)
    expect(saved.savedPrompts.items[savedPromptId]?.name).toBe('Weekly Notes')
    expect(saved.savedPrompts.items[savedPromptId]?.tags).toEqual(['planning', 'retro'])
    expect(saved.savedPrompts.items[savedPromptId]?.createdAt).toBe('2026-02-07T10:00:00.000Z')
    expect(saved.savedPrompts.items[savedPromptId]?.updatedAt).toBe('2026-02-07T10:00:00.000Z')

    const edited = editPromptContent(
      saved,
      {
        area: 'fragments',
        promptId: pid('frag-p-1'),
        content: 'Changed fragment only',
      },
      ctx,
    )

    expect(edited.fragments.prompts[pid('frag-p-1')]?.content).toBe('Changed fragment only')
    expect(edited.savedPrompts.items[savedPromptId]?.snapshot.prompts[pid('frag-p-1')]?.content).toBe(
      'Existing fragment content.',
    )
  })

  it('saveCurrentFragmentsAsSavedPrompt: rejects duplicate name by trimmed value (case-sensitive)', () => {
    const state = buildBaseState()
    const ctx = buildActionContext()

    // Same name should throw
    expect(() =>
      saveCurrentFragmentsAsSavedPrompt(
        state,
        {
          name: '  Starter Fragments  ',
          tags: [],
        },
        ctx,
      ),
    ).toThrow('duplicate name')

    // Different case should NOT throw (case-sensitive)
    const next = saveCurrentFragmentsAsSavedPrompt(
      state,
      {
        name: 'starter fragments',
        tags: [],
      },
      ctx,
    )
    expect(next.savedPrompts.order.length).toBe(state.savedPrompts.order.length + 1)
  })

  it('renameSavedPrompt: rejects duplicate name and updates updatedAt', () => {
    const state = saveCurrentFragmentsAsSavedPrompt(
      buildBaseState(),
      {
        name: 'Team Brief',
        tags: [],
      },
      buildActionContext(),
    )
    const ctx = buildActionContext()

    // Duplicate name (trimmed) should throw
    expect(() =>
      renameSavedPrompt(
        state,
        {
          savedPromptId: spid('saved-prompt-new-1'),
          name: '  Starter Fragments ',
        },
        ctx,
      ),
    ).toThrow('duplicate name')

    // Different case should NOT throw
    const renamedCase = renameSavedPrompt(
      state,
      {
        savedPromptId: spid('saved-prompt-new-1'),
        name: 'team brief',
      },
      ctx,
    )
    expect(renamedCase.savedPrompts.items[spid('saved-prompt-new-1')]?.name).toBe('team brief')

    const renamed = renameSavedPrompt(
      state,
      {
        savedPromptId: spid('saved-prompt-new-1'),
        name: '  Team Brief Updated ',
      },
      ctx,
    )

    expect(renamed.savedPrompts.items[spid('saved-prompt-new-1')]?.name).toBe('Team Brief Updated')
    expect(renamed.savedPrompts.items[spid('saved-prompt-new-1')]?.updatedAt).toBe('2026-02-07T10:00:00.000Z')
  })

  it('loadSavedPromptToFragments: replaces full fragments collection preserving saved order', () => {
    const state = buildBaseState()
    // Add an extra group to fragments to ensure it gets cleared
    state.fragments.groupOrder.push(gid('extra-g'))
    state.fragments.groups[gid('extra-g')] = {
      id: gid('extra-g'),
      name: 'Extra Group',
      promptIds: [],
      collapsed: false,
    }

    const next = loadSavedPromptToFragments(state, {
      savedPromptId: spid('saved-1'),
    })

    expect(next.fragments.groupOrder).toEqual([gid('saved-frag-g-1')])
    expect(next.fragments.groups[gid('saved-frag-g-1')]?.name).toBe('Saved Group')
    expect(next.fragments.prompts[pid('saved-frag-p-1')]?.content).toBe('Saved fragment content.')
    expect(next.fragments.groups[gid('frag-g-1')]).toBeUndefined()
    expect(next.fragments.prompts[pid('frag-p-1')]).toBeUndefined()
    expect(next.fragments.groups[gid('extra-g')]).toBeUndefined()
  })

  it('updateSavedPromptTags: trims/filters/deduplicates tags and updates updatedAt', () => {
    const ctx = buildActionContext()
    const next = updateSavedPromptTags(
      buildBaseState(),
      {
        savedPromptId: spid('saved-1'),
        tags: [' alpha ', ' ', 'beta', 'alpha', 'beta  ', ' gamma'],
      },
      ctx,
    )

    expect(next.savedPrompts.items[spid('saved-1')]?.tags).toEqual(['alpha', 'beta', 'gamma'])
    expect(next.savedPrompts.items[spid('saved-1')]?.updatedAt).toBe('2026-02-07T10:00:00.000Z')
  })

  it('deleteSavedPrompt: removes from both order and items', () => {
    const next = deleteSavedPrompt(buildBaseState(), {
      savedPromptId: spid('saved-1'),
    })

    expect(next.savedPrompts.order).toEqual([])
    expect(next.savedPrompts.items[spid('saved-1')]).toBeUndefined()
  })

  it('togglePromptExpanded: only mutates session UI list', () => {
    const ui = buildSessionUi()
    const expanded = togglePromptExpanded(ui, pid('lib-p-1'))
    const collapsed = togglePromptExpanded(expanded, pid('lib-p-1'))

    expect(expanded.expandedPromptIds).toEqual([pid('lib-p-1')])
    expect(collapsed.expandedPromptIds).toEqual([])
  })

  it('setColumnWidths: clamps by min widths and right-column min', () => {
    const next = setColumnWidths(buildBaseState(), {
      totalWidth: 1200,
      library: 100,
      fragments: 1000,
    })

    expect(next.ui.columnWidths.library).toBe(260)
    expect(next.ui.columnWidths.fragments).toBe(640)
    expect(clampColumnWidths({ totalWidth: 1200, library: 260, fragments: 640 })).toEqual({
      library: 260,
      fragments: 640,
    })
  })

  it('resetColumnWidths: sets defaults 22/48/30 by total width', () => {
    const next = resetColumnWidths(buildBaseState(), { totalWidth: 1000 })
    expect(next.ui.columnWidths).toEqual({
      library: 260,
      fragments: 440,
    })
  })
})
