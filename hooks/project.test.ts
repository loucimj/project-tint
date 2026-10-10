import { expect, test } from 'claude-code/testing'

import { autoColor, parseArgs, resolveProject, resolveTint } from './project'

test('a project gets a stable automatic color and its folder name', async () => {
  const one = resolveProject('/work/qontact-api', {})
  expect(one.name).toBe('qontact-api')
  expect(one.color).toBe(autoColor('/work/qontact-api'))
  expect(resolveProject('/work/qontact-api', {}).color).toBe(one.color)
})

test('a saved color and name win over the automatic ones', async () => {
  const one = resolveProject('/work/app', { '/work/app': { color: '#dc2626', name: 'Prod' } })
  expect(one.color).toBe('#dc2626')
  expect(one.name).toBe('Prod')
})

test('without a group the tint is the project', async () => {
  const one = resolveTint('/work/app', null, { '/work/app': { color: '#dc2626' } }, {})
  expect(one.group).toBe(null)
  expect(one.name).toBe('app')
  expect(one.color).toBe('#dc2626')
})

test('the sidebar group wins over the project, with its own stable color', async () => {
  const group = { id: 'cg-1', name: 'API' }
  const one = resolveTint('/work/app', group, { '/work/app': { color: '#dc2626' } }, {})
  expect(one.name).toBe('API')
  expect(one.project).toBe('app')
  expect(one.color).toBe(autoColor('cg-1'))
  expect(one.color).not.toBe('#dc2626')

  const two = resolveTint('/work/other', group, {}, { 'cg-1': { color: '#16a34a', name: 'Backend' } })
  expect(two.color).toBe('#16a34a')
  expect(two.name).toBe('Backend')
})

test('the command parses colors, names and options', async () => {
  expect(parseArgs('')).toEqual({ kind: 'show' })
  expect(parseArgs('green Qontact API')).toEqual({ kind: 'set', color: '#16a34a', name: 'Qontact API', forProject: false })
  expect(parseArgs('#ABC')).toEqual({ kind: 'set', color: '#abc', forProject: false })
  expect(parseArgs('project blue Web')).toEqual({ kind: 'set', color: '#2563eb', name: 'Web', forProject: true })
  expect(parseArgs('project reset')).toEqual({ kind: 'reset', forProject: true })
  expect(parseArgs('prompts off')).toEqual({ kind: 'prompts', isOn: false })
  expect(parseArgs('chartreuse').kind).toBe('error')
})
