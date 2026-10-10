import { expect, test } from 'claude-code/testing'

import { autoColor, parseArgs, resolveProject } from './project'

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

test('the command parses colors, names and options', async () => {
  expect(parseArgs('')).toEqual({ kind: 'show' })
  expect(parseArgs('green Qontact API')).toEqual({ kind: 'set', color: '#16a34a', name: 'Qontact API' })
  expect(parseArgs('#ABC')).toEqual({ kind: 'set', color: '#abc' })
  expect(parseArgs('prompts off')).toEqual({ kind: 'prompts', isOn: false })
  expect(parseArgs('chartreuse').kind).toBe('error')
})
