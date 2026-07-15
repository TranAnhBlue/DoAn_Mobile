import { open } from '@op-engineering/op-sqlite';

let db = null;

export function getDatabase() {
  if (!db) {
    db = open({ name: 'eapls_mobile.db' });
    console.log('✅ Database connection established');
  }
  return db;
}

export async function executeQuery(query, params = []) {
  try {
    const database = getDatabase();
    const result = await database.execute(query, params);
    return result;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
}

export async function executeBatch(statements) {
  const database = getDatabase();
  try {
    await database.executeBatch(statements);
  } catch (error) {
    console.error('❌ Database batch error:', error);
    throw error;
  }
}

export async function transaction(callback) {
  const database = getDatabase();
  try {
    await database.execute('BEGIN TRANSACTION');
    const result = await callback(database);
    await database.execute('COMMIT');
    return result;
  } catch (error) {
    await database.execute('ROLLBACK');
    console.error('❌ Transaction error:', error);
    throw error;
  }
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('🔒 Database connection closed');
  }
}
