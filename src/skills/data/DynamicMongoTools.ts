import { ITool, ToolDefinition } from "../../core/interfaces/ITool.js";
import { getMongoClient } from "../../infrastructure/database/MongoDBClient.js";

/**
 * Universal Tool to map all collections in the connected database
 */
export class MapCollectionsTool implements ITool {
    readonly name = "map_all_collections";
    readonly description = "Retrieves a list of every single collection/table that currently exists in the connected database. Call this when you don't know the exact name of a table and need to discover what data is available (e.g., searching for 'HR' or 'Users').";

    async execute(): Promise<string> {
        const client = getMongoClient();
        try {
            await client.connect();
            const db = client.getDb();
            const collections = await db.listCollections().toArray();
            const names = collections.map(c => c.name).sort();

            return JSON.stringify({
                status: "success",
                message: `Found ${names.length} collections mapping the entire ERP.`,
                collections: names
            }, null, 2);
        } catch (error: any) {
            return `Error listing collections: ${error?.message || String(error)}`;
        }
    }

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        };
    }
}

/**
 * Universal Tool to extract a sample record and learn the schema of any collection
 */
export class InspectSchemaTool implements ITool {
    readonly name = "inspect_collection_schema";
    readonly description = "Pulls a sample document from a specified collection and extracts its keys (schema). Use this immediately AFTER finding a collection name to know exactly what fields you can filter by (e.g., seeing if a table uses 'user_id' or 'emp_code').";

    async execute(params: { collectionName: string }): Promise<string> {
        const client = getMongoClient();
        try {
            if (!params || !params.collectionName) return "Error: collectionName parameter is required.";

            await client.connect();
            const db = client.getDb();

            const count = await db.collection(params.collectionName).estimatedDocumentCount();
            if (count === 0) {
                return JSON.stringify({ message: `Collection '${params.collectionName}' is completely empty.` });
            }

            const sample = await db.collection(params.collectionName).findOne({});
            const keys = sample ? Object.keys(sample) : [];

            return JSON.stringify({
                status: "success",
                collection: params.collectionName,
                totalRecords: count,
                availableFields: keys.join(", "),
                sampleData: sample // Output the raw JSON sample to teach the AI what the data actually looks like
            }, null, 2);
        } catch (error: any) {
            return `Error inspecting schema for '${params?.collectionName}': ${error?.message || String(error)}`;
        }
    }

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        collectionName: {
                            type: 'string',
                            description: 'The exact name of the MongoDB collection to inspect (e.g. "users", "training_announcements").'
                        }
                    },
                    required: ['collectionName']
                }
            }
        };
    }
}

/**
 * Universal Tool to query any collection in the database dynamically
 */
export class ExploreDataTool implements ITool {
    readonly name = "explore_collection_data";
    readonly description = "Queries a collection to fetch multiple records. Use this to read the actual data. You can pass a stringified JSON MongoDB query object to filter the results. Example queryJson: '{\"status\": 1, \"department\": \"HR\"}'. If queryJson is omitted, it fetches the newest documents.";

    async execute(params: { collectionName: string, queryJson?: string, limit?: number }): Promise<string> {
        const client = getMongoClient();
        try {
            if (!params || !params.collectionName) return "Error: collectionName parameter is required.";

            const limit = params.limit ? Math.min(params.limit, 50) : 10; // Cap at 50 to prevent context overload
            let filterString = {};

            if (params.queryJson && params.queryJson.trim() !== '') {
                try {
                    filterString = JSON.parse(params.queryJson);
                } catch (e) {
                    return `Error: queryJson must be a valid JSON string. Parse failed.`;
                }
            }

            await client.connect();
            const db = client.getDb();

            // Try to sort by newest if _id exists, else no sort
            const results = await db.collection(params.collectionName)
                .find(filterString)
                .sort({ _id: -1 }) // assume _id handles creation time standard Mongo behavior
                .limit(limit)
                .toArray();

            return JSON.stringify({
                status: "success",
                collection: params.collectionName,
                filterApplied: filterString,
                recordsReturned: results.length,
                data: results
            }, null, 2);

        } catch (error: any) {
            return `Error querying data from '${params?.collectionName}': ${error?.message || String(error)}`;
        }
    }

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        collectionName: {
                            type: 'string',
                            description: 'The exact name of the MongoDB collection to query.'
                        },
                        queryJson: {
                            type: 'string',
                            description: 'Optional. A stringified JSON object representing a standard MongoDB query filter (e.g. "{\\"status\\": 0}"). Do not use ObjectId, just string match.'
                        },
                        limit: {
                            type: 'number',
                            description: 'Optional. Max number of records to return. Max 50. Default 10.'
                        }
                    },
                    required: ['collectionName']
                }
            }
        };
    }
}

export const DYNAMIC_MONGO_TOOLS = [
    new MapCollectionsTool(),
    new InspectSchemaTool(),
    new ExploreDataTool()
];
