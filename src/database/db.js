import { open } from '@op-engineering/op-sqlite'

let dbInstance = null

export const getDb = () => {
  if (!dbInstance) {
    dbInstance = open({ name: 'farming_mobile.db' })
  }
  return dbInstance
}

export const execute = (sql, params = []) => {
  const db = getDb()
  return db.execute(sql, params)
}

export const executeTransaction = async (callback) => {
  const db = getDb()
  const commands = []
  const tx = {
    executeSql: (sql, params = []) => {
      commands.push([sql, params])
    },
  }

  callback(tx)

  if (commands.length > 0) {
    await db.executeBatch(commands)
  }
}

/**
 * op-sqlite trả về result.rows là một plain array.
 * Hàm này chuẩn hoá output để tương thích.
 */
export const rowsToArray = (result) => {
  if (!result) return []

  // op-sqlite: result.rows là plain array
  if (Array.isArray(result.rows)) {
    return result.rows
  }

  // Fallback cho SQLite khác dùng .item()
  if (result.rows && typeof result.rows.item === 'function') {
    const rows = []
    for (let i = 0; i < result.rows.length; i++) {
      rows.push(result.rows.item(i))
    }
    return rows
  }

  return []
}
