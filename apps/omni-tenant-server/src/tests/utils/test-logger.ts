import { logTestExecution } from "@repo/server-core"

/**
 * Helper para registrar execução de testes no Sentry
 */
export function logTest(testName: string, testFile: string) {
  return {
    start: () => {
      logTestExecution(testName, testFile, "started")
    },
    complete: () => {
      logTestExecution(testName, testFile, "completed")
    },
    fail: (error: Error) => {
      logTestExecution(testName, testFile, "failed", error)
    },
  }
}

/**
 * Hook para usar com beforeEach/afterEach do Vitest
 */
export function createTestSuite(suiteName: string, filePath: string) {
  return {
    beforeEach: (testName: string) => {
      logTestExecution(`${suiteName} > ${testName}`, filePath, "started")
    },
    afterEach: (testName: string, error?: Error) => {
      if (error) {
        logTestExecution(`${suiteName} > ${testName}`, filePath, "failed", error)
      } else {
        logTestExecution(`${suiteName} > ${testName}`, filePath, "completed")
      }
    },
  }
}
