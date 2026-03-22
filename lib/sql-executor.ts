import { PGlite } from '@electric-sql/pglite'
import type { TableData, TestCase, TestCaseResult } from './game-store'

/**
 * Runs SQL test cases using PGlite - a real PostgreSQL implementation in WASM.
 * Creates an in-memory database instance, sets up tables from test case data,
 * executes the user query, and compares results against expected output.
 */
export async function runTestCasesWithEngine(
  userQuery: string,
  testCases: TestCase[]
): Promise<TestCaseResult[]> {
  const results: TestCaseResult[] = []

  for (const testCase of testCases) {
    // Create a fresh PGlite instance for each test case to ensure isolation
    const db = new PGlite()

    try {
      // Set up tables from test case data
      await setupTables(db, testCase.tableData)

      // Execute the user's query
      const queryResult = await db.query(userQuery)

      // Extract actual rows from the result
      const actualRows: (string | number | null)[][] = queryResult.rows.map((row: Record<string, unknown>) => {
        return testCase.expectedColumns.map(col => {
          const value = row[col.toLowerCase()] ?? row[col]
          if (value === null || value === undefined) return null
          if (typeof value === 'number') return value
          if (typeof value === 'bigint') return Number(value)
          return String(value)
        })
      })

      // Compare with expected output
      const orderMatters = userQuery.toLowerCase().includes('order by')
      const passed = compareResults(actualRows, testCase.expectedOutput, orderMatters)

      results.push({
        testCaseId: testCase.id,
        passed,
        actualOutput: actualRows,
        error: passed ? undefined : 'Output does not match expected result'
      })
    } catch (error) {
      results.push({
        testCaseId: testCase.id,
        passed: false,
        actualOutput: null,
        error: error instanceof Error ? error.message : 'Unknown SQL execution error'
      })
    } finally {
      // Clean up: close the database instance
      await db.close()
    }
  }

  return results
}

/**
 * Sets up tables in the PGlite database from TableData definitions
 */
async function setupTables(db: PGlite, tables: TableData[]): Promise<void> {
  for (const table of tables) {
    // Build CREATE TABLE statement
    const columnDefs = table.columns.map(col => {
      let typeDef = mapColumnType(col.type)
      if (col.isPrimaryKey) typeDef += ' PRIMARY KEY'
      return `${col.name} ${typeDef}`
    }).join(', ')

    const createTableSQL = `CREATE TABLE ${table.tableName} (${columnDefs})`
    await db.exec(createTableSQL)

    // Insert rows if any exist
    if (table.rows.length > 0) {
      const columnNames = table.columns.map(c => c.name).join(', ')
      
      for (const row of table.rows) {
        const values = row.map(val => {
          if (val === null) return 'NULL'
          if (typeof val === 'number') return String(val)
          // Escape single quotes in strings
          return `'${String(val).replace(/'/g, "''")}'`
        }).join(', ')

        const insertSQL = `INSERT INTO ${table.tableName} (${columnNames}) VALUES (${values})`
        await db.exec(insertSQL)
      }
    }
  }
}

/**
 * Maps generic column types to PostgreSQL types
 */
function mapColumnType(type: string): string {
  const upperType = type.toUpperCase()
  if (upperType.includes('INT')) return 'INTEGER'
  if (upperType.includes('VARCHAR') || upperType.includes('TEXT') || upperType.includes('CHAR')) return 'TEXT'
  if (upperType.includes('DECIMAL') || upperType.includes('NUMERIC') || upperType.includes('FLOAT') || upperType.includes('DOUBLE')) return 'NUMERIC'
  if (upperType.includes('DATE')) return 'DATE'
  if (upperType.includes('TIME')) return 'TIMESTAMP'
  if (upperType.includes('BOOL')) return 'BOOLEAN'
  return 'TEXT' // Default fallback
}

/**
 * Compares two result sets for equality
 */
function compareResults(
  actual: (string | number | null)[][],
  expected: (string | number | null)[][],
  orderMatters: boolean = false
): boolean {
  // Check row count
  if (actual.length !== expected.length) return false
  
  // Normalize rows for comparison
  const normalizeRow = (row: (string | number | null)[]) =>
    row.map(v => v === null ? 'NULL' : String(v).toLowerCase()).join('|')

  const actualNormalized = actual.map(normalizeRow)
  const expectedNormalized = expected.map(normalizeRow)

  if (orderMatters) {
    return actualNormalized.every((row, i) => row === expectedNormalized[i])
  } else {
    const actualSorted = [...actualNormalized].sort()
    const expectedSorted = [...expectedNormalized].sort()
    return actualSorted.every((row, i) => row === expectedSorted[i])
  }
}
