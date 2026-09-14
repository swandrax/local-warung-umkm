import { DataAPIClient, Db } from '@datastax/astra-db-ts';

const token = process.env.ASTRA_DB_APPLICATION_TOKEN || '';
const endpoint = process.env.ASTRA_DB_API_ENDPOINT || '';
const keyspace = process.env.ASTRA_DB_KEYSPACE || 'default_keyspace';

// Singleton Astra Data API Client
export const astraClient = new DataAPIClient(token);

// Active Astra Database instance
export const astraDb: Db = astraClient.db(endpoint, {
  keyspace,
});

/**
 * Health check & collections probe for Astra DB
 */
export async function checkAstraConnection(): Promise<{ connected: boolean; status?: string; collections?: string[]; error?: string }> {
  try {
    const admin = astraClient.admin();
    const dbs = await admin.listDatabases();
    const dbInfo = dbs.find(d => d.id === '020010fe-ac61-4473-b006-acfb91621aa6') || dbs[0];

    if (dbInfo && dbInfo.status !== 'ACTIVE') {
      return {
        connected: false,
        status: dbInfo.status,
        error: `Database is currently ${dbInfo.status}. Waiting for provisioning to complete.`,
      };
    }

    const colls = await astraDb.listCollections();
    return {
      connected: true,
      status: 'ACTIVE',
      collections: colls.map(c => c.name),
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message,
    };
  }
}
