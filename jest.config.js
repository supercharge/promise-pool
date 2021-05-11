'use strict'

module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  testEnvironment: 'node',
  coverageReporters: ['text', 'html'],
  setupFilesAfterEnv: ['jest-extended'],
  testMatch: ['**/test/**/*.[jt]s?(x)']
}
