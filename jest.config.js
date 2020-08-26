'use strict'

module.exports = {
  collectCoverage: true,
  coverageReporters: ['text', 'html'],
  setupFilesAfterEnv: ['jest-extended'],
  testMatch: ['**/test/**/*.[jt]s?(x)']
}
