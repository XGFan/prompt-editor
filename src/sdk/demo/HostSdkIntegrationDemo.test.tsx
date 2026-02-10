import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HostSdkIntegrationDemo } from './HostSdkIntegrationDemo'

describe('HostSdkIntegrationDemo', () => {
  it('保存时通过宿主按钮触发 requestSave，并回写 latestValue', async () => {
    render(<HostSdkIntegrationDemo />)

    fireEvent.click(screen.getByTestId('host-open-editor'))

    fireEvent.click(screen.getAllByTitle('编辑')[0])
    fireEvent.change(screen.getByPlaceholderText('输入内容...'), {
      target: { value: 'Host edited fragment for save path' },
    })
    fireEvent.click(screen.getByTitle('保存'))
    fireEvent.click(screen.getByTestId('host-save'))

    await waitFor(() => {
      expect(screen.getByTestId('host-latest-prompt')).toHaveTextContent('Host edited fragment for save path')
    })
    expect(screen.queryByTestId('host-save')).not.toBeInTheDocument()
  })

  it('取消时关闭弹窗且不提交 latestValue', () => {
    render(<HostSdkIntegrationDemo />)

    fireEvent.click(screen.getByTestId('host-open-editor'))

    fireEvent.click(screen.getAllByTitle('编辑')[0])
    fireEvent.change(screen.getByPlaceholderText('输入内容...'), {
      target: { value: 'Should not be committed on cancel' },
    })
    fireEvent.click(screen.getByTitle('保存'))
    fireEvent.click(screen.getByTestId('host-cancel'))

    expect(screen.getByTestId('host-latest-prompt')).not.toHaveTextContent('Should not be committed on cancel')
    expect(screen.queryByTestId('host-save')).not.toBeInTheDocument()
  })

  it('校验失败时阻止提交，显示错误并保持弹窗打开', async () => {
    render(<HostSdkIntegrationDemo />)

    fireEvent.click(screen.getByTestId('host-open-editor'))

    fireEvent.click(screen.getAllByTitle('编辑')[0])
    fireEvent.change(screen.getByPlaceholderText('输入内容...'), {
      target: { value: '[BLOCK_SAVE] force fail by host validate' },
    })
    fireEvent.click(screen.getByTitle('保存'))
    fireEvent.click(screen.getByTestId('host-save'))

    await waitFor(() => {
      expect(screen.getByTestId('host-error')).toHaveTextContent('检测到宿主拦截标记 [BLOCK_SAVE]，禁止提交')
    })
    expect(screen.getByTestId('host-save')).toBeInTheDocument()
    expect(screen.getByTestId('host-latest-prompt')).toHaveTextContent('Summarize this week updates and risks.')
  })
})
