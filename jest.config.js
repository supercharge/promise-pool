'use strict'

module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageReporters: ['text', 'html'],
  setupFilesAfterEnv: ['jest-extended'],
  testMatch: ['**/test/**/*.[jt]s?(x)']
}
