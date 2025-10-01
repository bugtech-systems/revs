// merge-backups.js
import fs from "fs/promises";
import path from "path";
import { MongoClient, ObjectId } from "mongodb";
import { fileURLToPath } from "url";

// Fix __dirname for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = path.join(__dirname, "backups");
const MONGO_URI = "mongodb+srv://bugtechsystems:Cd4fb355@osden001.c7nzslc.mongodb.net";
const DB_NAME = "revs_production";

// Function to safely convert values
function parseObjectId(val) {
  return val && typeof val === "object" && val.$oid ? new ObjectId(val.$oid) : val;
}

function parseDate(val) {
  return val && typeof val === "object" && val.$date ? new Date(val.$date) : val;
}

function parseNumber(val) {
  return typeof val === "string" ? parseFloat(val) : val;
}

function ensureBettingsTypes(doc) {
  return {
    ...doc,
    _id: parseObjectId(doc._id),
    amount: parseNumber(doc.amount),
    rambleAmount: parseNumber(doc.rambleAmount),
    targetAmount: parseNumber(doc.targetAmount),
    isWinTo: Boolean(doc.isWinTo),
    commissions: Array.isArray(doc.commissions)
      ? doc.commissions.map((c) => ({
          amount: parseNumber(c.amount),
          rate: parseNumber(c.rate),
          referral: c.referral,
          userLevel: c.userLevel,
        }))
      : [],
    contact: doc.contact || "",
    gameTime: doc.gameTime || "",
    gross: parseNumber(doc.gross),
    inputType: doc.inputType || "",
    isCompleted: Boolean(doc.isCompleted),
    isDeleted: Boolean(doc.isDeleted),
    isPrint: Boolean(doc.isPrint),
    isWinTo: Boolean(doc.isWinTo),
    net: parseNumber(doc.net),
    owner_id: parseObjectId(doc.owner_id),
    ramble: parseNumber(doc.ramble),
    straight: parseNumber(doc.straight),
    ticketNo: doc.ticketNo,
    timestamp: parseDate(doc.timestamp),
    users: (Array.isArray(doc.users) ? doc.users : []).map(parseObjectId),
    draw: parseObjectId(doc.draw),
    isValidated: Boolean(doc.isValidated),
    hws: Array.isArray(doc.hws) ? doc.hws : [],
  };
}

async function readAndParseJSON(filePath, collectionName) {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    if (!data.trim()) return [];

    const rawDocs = JSON.parse(data);

    return rawDocs.map((doc) => {
      if (collectionName === "bettings") {
        return ensureBettingsTypes(doc);
      }

      // For all other collections, just convert top-level _id
      if (doc._id?.$oid) {
        doc._id = new ObjectId(doc._id.$oid);
      }
      return doc;
    });
  } catch (err) {
    console.warn(`⚠️ Skipping file ${filePath}: ${err.message}`);
    return [];
  }
}

async function mergeCollections(db, collectionName, docs) {
  const collection = db.collection(collectionName);
  let count = 0;
  for (const doc of docs) {
    try {
      await collection.updateOne(
        { _id: doc._id },
        { $set: doc },
        { upsert: true }
      );
      count++;
      if (count % 100 === 0 || count === docs.length) {
        console.log(`   ➕ [${collectionName}] Merged ${count}/${docs.length} documents`);
      }
    } catch (err) {
      console.error(`❌ Failed to merge doc in ${collectionName} with _id ${doc._id}:`, err.message);
    }
  }
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  const backupFolders = await fs.readdir(BACKUP_DIR);

  for (const folder of backupFolders) {
    const folderPath = path.join(BACKUP_DIR, folder);
    const files = await fs.readdir(folderPath);

    console.log(`📂 Processing backup folder: ${folder}`);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;

      const filePath = path.join(folderPath, file);
      const collectionName = file.split(".")[1]; // example: leo_dev.users.json -> "users"
      const documents = await readAndParseJSON(filePath, collectionName);

      if (documents.length > 0) {
        console.log(`📁 Merging ${documents.length} documents into "${collectionName}" from ${file}`);
        await mergeCollections(db, collectionName, documents);
      } else {
        console.log(`⚠️ No valid documents found in ${file}`);
      }
    }
  }

  console.log("✅ All backups merged successfully!");
  await client.close();
}

main().catch((err) => {
  console.error("❌ Unexpected error:", err);
});
