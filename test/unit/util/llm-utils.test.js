/*
 * Copyright 2023 New Relic Corporation. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

const tap = require('tap')
const { extractLlmAttributes, extractLlmContext } = require('../../../lib/util/llm-utils')
const { AsyncLocalStorage } = require('async_hooks')

tap.test('extractLlmAttributes', (t) => {
  const context = {
    'skip': 1,
    'llm.get': 2,
    'fllm.skip': 3
  }

  const llmContext = extractLlmAttributes(context)
  t.notOk(llmContext.skip)
  t.notOk(llmContext['fllm.skip'])
  t.equal(llmContext['llm.get'], 2)
  t.end()
})

tap.test('extractLlmContext', (t) => {
  let tx
  let agent
  t.autoend()
  t.beforeEach(() => {
    tx = {
      _llmContextManager: new AsyncLocalStorage()
    }
    agent = {
      tracer: {
        getTransaction: () => {
          return tx
        }
      }
    }
  })

  t.test('handle empty context', (t) => {
    t.autoend()
    tx._llmContextManager.run(null, () => {
      const llmContext = extractLlmContext(agent)
      t.equal(typeof llmContext, 'object')
      t.equal(Object.entries(llmContext).length, 0)
    })
  })

  t.test('extract LLM context', (t) => {
    t.autoend()
    tx._llmContextManager.run({ 'llm.test': 1, 'skip': 2 }, () => {
      const llmContext = extractLlmContext(agent)
      t.equal(llmContext['llm.test'], 1)
      t.notOk(llmContext.skip)
    })
  })

  t.test('no transaction', (t) => {
    t.autoend()
    agent.tracer.getTransaction = () => {
      return null
    }
    tx._llmContextManager.run(null, () => {
      const llmContext = extractLlmContext(agent)
      t.equal(typeof llmContext, 'object')
      t.equal(Object.entries(llmContext).length, 0)
    })
  })
})
