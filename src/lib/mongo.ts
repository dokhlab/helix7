import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
const dbName = process.env.MONGODB_DB ?? "helix7";

// Next.js dev server hot-reloads modules, which would otherwise open a new pool
// on every reload until Mongo refuses connections. Cache the client on globalThis.
declare global {
  // eslint-disable-next-line no-var
  var _helix7Mongo: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> {
  return new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
  }).connect();
}

const clientPromise: Promise<MongoClient> =
  process.env.NODE_ENV === "production"
    ? connect()
    : (globalThis._helix7Mongo ??= connect());

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export default clientPromise;
