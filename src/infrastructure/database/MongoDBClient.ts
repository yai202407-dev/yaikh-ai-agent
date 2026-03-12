import { MongoClient, Db } from 'mongodb';

/**
 * MongoDB client for direct database access
 */
export class MongoDBClient {
    private client: MongoClient | null = null;
    private db: Db | null = null;

    constructor(
        private connectionString: string,
        private databaseName: string
    ) { }

    /**
     * Connect to MongoDB with retry logic
     */
    async connect(): Promise<void> {
        if (this.client && this.db) {
            try {
                // Test if connection is still alive
                await this.db.admin().ping();
                return; // Already connected and working
            } catch (e) {
                // Connection is dead, close and reconnect
                console.log('⚠️ Existing connection is dead, reconnecting...');
                await this.forceClose();
            }
        }

        try {
            console.log(`🔌 Connecting to MongoDB...`);
            this.client = new MongoClient(this.connectionString, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 10000,
            });
            await this.client.connect();
            this.db = this.client.db(this.databaseName);

            // Test the connection
            await this.db.admin().ping();
            console.log(`✅ Connected to MongoDB: ${this.databaseName}`);
        } catch (error: any) {
            this.client = null;
            this.db = null;
            console.error('❌ MongoDB connection failed:', error.message);
            throw new Error(`MongoDB connection failed: ${error.message}`);
        }
    }

    /**
     * Get database instance
     */
    getDb(): Db {
        if (!this.db) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }

    /**
     * Close connection gracefully
     */
    async close(): Promise<void> {
        if (this.client) {
            try {
                await this.client.close();
            } catch (e) {
                console.error('Error closing MongoDB connection:', e);
            } finally {
                this.client = null;
                this.db = null;
            }
        }
    }

    /**
     * Force close without error handling
     */
    private async forceClose(): Promise<void> {
        if (this.client) {
            try {
                await this.client.close(true);
            } catch (e) {
                // Ignore errors on force close
            }
            this.client = null;
            this.db = null;
        }
    }

    /**
     * Get purchase requests with filters
     */
    async getPurchaseRequests(params?: {
        status?: string,
        pendingOnly?: boolean,
        department?: string,
        category?: string,
        user_id?: string,
        buy_by?: string,
        limit?: number
    }) {
        const db = this.getDb();
        const collection = db.collection('purchase_requests');

        const query: any = {};

        if (params?.status) query.status = params.status;
        if (params?.department) query.department = params.department;
        if (params?.category) query.category = params.category;
        if (params?.user_id) query.user_id = params.user_id;
        if (params?.buy_by) query.buy_by = params.buy_by;

        if (params?.pendingOnly) {
            query.complete = { $ne: true };
        }

        const limit = params?.limit || 20;
        console.log(`📊 Querying purchase_requests with:`, JSON.stringify(query));

        const pipeline: any[] = [
            { $match: query },
            { $addFields: { idString: { $toString: '$_id' } } },
            {
                $lookup: {
                    from: 'purchase_request_item',
                    localField: 'idString',
                    foreignField: 'purchase_request_id',
                    as: 'items'
                }
            },
            {
                $addFields: {
                    calculated_total: {
                        $reduce: {
                            input: '$items',
                            initialValue: 0,
                            in: {
                                $add: [
                                    '$$value',
                                    {
                                        $multiply: [
                                            { $toDouble: { $ifNull: ['$$this.qty', 0] } },
                                            { $toDouble: { $ifNull: ['$$this.unit_price', 0] } }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            { $sort: { created_at: -1 } },
            { $limit: limit > 50 ? 50 : limit }
        ];

        const results = await collection.aggregate(pipeline).toArray();

        console.log(`✅ Query finished. Found ${results.length} results.`);

        return results.map(r => ({
            ...r,
            total_price: (r.total_price && r.total_price > 0) ? r.total_price : (r.calculated_total || 0)
        }));
    }

    /**
     * Get purchase request by ID
     */
    async getPurchaseRequestById(id: string) {
        const db = this.getDb();
        const collection = db.collection('purchase_requests');

        const pipeline: any[] = [
            { $match: { _id: id as any } },
            { $addFields: { idString: { $toString: '$_id' } } },
            {
                $lookup: {
                    from: 'purchase_request_item',
                    localField: 'idString',
                    foreignField: 'purchase_request_id',
                    as: 'items'
                }
            },
            {
                $addFields: {
                    calculated_total: {
                        $reduce: {
                            input: '$items',
                            initialValue: 0,
                            in: {
                                $add: [
                                    '$$value',
                                    {
                                        $multiply: [
                                            { $toDouble: { $ifNull: ['$$this.qty', 0] } },
                                            { $toDouble: { $ifNull: ['$$this.unit_price', 0] } }
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        ];

        const results = await collection.aggregate(pipeline).toArray();
        if (results.length === 0) return null;

        const r = results[0];
        return {
            ...r,
            total_price: (r.total_price && r.total_price > 0) ? r.total_price : (r.calculated_total || 0)
        };
    }

    /**
     * Get counts for various states
     */
    async getPurchaseRequestCounts() {
        const db = this.getDb();
        const collection = db.collection('purchase_requests');

        const [
            totalCount,
            pendingCount,
            gmPendingCount,
            accApprovedCount,
            monthCount
        ] = await Promise.all([
            collection.countDocuments({}),
            collection.countDocuments({ complete: { $ne: true } }),
            collection.countDocuments({ gm_approve: { $ne: true }, head_approve: true }),
            collection.countDocuments({ accountant_approve: true }),
            collection.countDocuments({
                created_at: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
            })
        ]);

        return {
            total: totalCount,
            pending: pendingCount,
            gmPending: gmPendingCount,
            accApproved: accApprovedCount,
            thisMonth: monthCount
        };
    }

    /**
     * Generic method to get any collection with simple filters
     */
    async getCollectionData(collectionName: string, params?: { query?: any, limit?: number, sort?: any }) {
        const db = this.getDb();
        const collection = db.collection(collectionName);

        const limit = params?.limit || 20;
        const sort = params?.sort || { created_at: -1 };
        const query = params?.query || {};

        console.log(`📊 Querying ${collectionName} with:`, JSON.stringify(query));

        const results = await collection
            .find(query)
            .limit(limit > 100 ? 100 : limit)
            .sort(sort)
            .toArray();

        console.log(`✅ Query finished. Found ${results.length} results.`);
        return results;
    }

    /**
     * Get inventory with optional search and joins (manual joining for now)
     */
    async getShopInventory(params?: { type?: string, supplier?: string, lowStock?: boolean, limit?: number }) {
        const db = this.getDb();
        const collection = db.collection('shops');

        const query: any = {};
        if (params?.type) query.type = params.type;
        if (params?.supplier) query.supplier_name = { $regex: params.supplier, $options: 'i' };
        if (params?.lowStock) query.amount = { $lt: 10 }; // Default low stock Threshold

        const limit = params?.limit || 20;

        return await collection
            .find(query)
            .limit(limit)
            .sort({ amount: 1 })
            .toArray();
    }

    /**
     * Get user details by ID
     */
    async getUserById(id: string) {
        const db = this.getDb();
        const { ObjectId } = await import('mongodb');

        try {
            // Try as ObjectId first, then as string
            let query: any;
            try {
                query = { _id: new ObjectId(id) };
            } catch (e) {
                query = { _id: id };
            }

            return await db.collection('users').findOne(query);
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    /**
     * Get shop item by ID
     */
    async getShopItemById(id: string) {
        const db = this.getDb();
        const { ObjectId } = await import('mongodb');

        try {
            // Try as ObjectId first, then as string
            let query: any;
            try {
                query = { _id: id.length === 24 ? new ObjectId(id) : id };
            } catch (e) {
                query = { _id: id };
            }

            return await db.collection('shops').findOne(query);
        } catch (error) {
            console.error('Error fetching shop item:', error);
            return null;
        }
    }
}

// Singleton instance
let mongoClient: MongoDBClient | null = null;

export function getMongoClient(): MongoDBClient {
    if (!mongoClient) {
        const connectionString = process.env.DB_DSN || '';
        const databaseName = process.env.DB_DATABASE || 'ym_eco_board';

        if (!connectionString) {
            throw new Error('❌ DB_DSN is not set in .env. Please configure your MongoDB connection string.');
        }

        // Safe log — masks the password in the URL
        const safeLogUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
        console.log(`🔌 Initializing MongoDBClient → ${safeLogUrl} [db: ${databaseName}]`);

        mongoClient = new MongoDBClient(connectionString, databaseName);
    }
    return mongoClient;
}

