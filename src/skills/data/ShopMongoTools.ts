import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import { getMongoClient } from '../../infrastructure/database/MongoDBClient.js';

/**
 * Tool for listing/searching shop inventory
 */
export class GetShopInventoryTool implements ITool {
    readonly name = 'get_shop_inventory';
    readonly description = 'List or search items in the shop inventory. Can filter by type, supplier, or location.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();

            const query: any = {};
            if (args?.type) query.type = args.type;
            if (args?.location) query.location = args.location;
            if (args?.subject) query.subject = { $regex: args.subject, $options: 'i' };
            if (args?.supplier) query.supplier_name = { $regex: args.supplier, $options: 'i' };

            // If status is not provided, don't filter by it or include both 1 and null
            if (!args?.type && !args?.subject && !args?.supplier) {
                query.status = { $ne: 0 }; // Exclude inactive
            }

            const items = await mongoClient.getCollectionData('shops', {
                query,
                limit: args?.limit || 15
            });

            if (!items || items.length === 0) return "No items found in shop inventory matching those criteria.";

            const formatted = items.map((i: any) =>
                `- **${i.subject}**: ${i.amount} ${i.unit} (${i.location})`
            ).join('\n');

            return `### Shop Inventory Results:\n${formatted}`;
        } catch (error) {
            return `Error fetching inventory: ${error}`;
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
                        type: { type: 'string', description: 'Item type (e.g., office, consumable)' },
                        location: { type: 'string', description: 'Warehouse location (e.g., A1)' },
                        subject: { type: 'string', description: 'Name of the item to search for' },
                        supplier: { type: 'string', description: 'Supplier name' },
                        limit: { type: 'number', description: 'Number of results (default 15)' }
                    },
                    required: []
                }
            }
        };
    }
}

/**
 * Tool for checking stock status and identifying low stock items
 */
export class GetStockStatusTool implements ITool {
    readonly name = 'get_stock_status';
    readonly description = 'Check for low stock or out-of-stock items in the shop.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();

            const threshold = args?.threshold || 10;
            const items = await mongoClient.getCollectionData('shops', {
                query: {
                    amount: { $lt: threshold },
                    status: { $ne: 0 } // Active items only
                },
                limit: 20,
                sort: { amount: 1 }
            });

            if (!items || items.length === 0) return "All active items are currently above the low-stock threshold.";

            const formatted = items.map((i: any) =>
                `- **${i.subject}**: ${i.amount} ${i.unit} remaining (Location: ${i.location})`
            ).join('\n');

            return `### ⚠️ Low Stock Alert (Threshold < ${threshold}):\n${formatted}`;
        } catch (error) {
            return `Error checking stock status: ${error}`;
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
                        threshold: { type: 'number', description: 'Threshold for low stock alert (default 10)' }
                    },
                    required: []
                }
            }
        };
    }
}

/**
 * Tool for viewing shop request history
 */
export class GetShopRequestHistoryTool implements ITool {
    readonly name = 'get_shop_request_history';
    readonly description = 'Provides a history of items requested from the SHOP by users. Supports filtering by date range for monthly/weekly reports.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();

            const query: any = {};
            if (args?.startDate || args?.endDate) {
                query.created_at = {};
                if (args.startDate) query.created_at.$gte = new Date(args.startDate);
                if (args.endDate) query.created_at.$lte = new Date(args.endDate);
            }

            const requests = await mongoClient.getCollectionData('shop_requests', {
                query,
                limit: args?.limit || 10
            });

            if (!requests || requests.length === 0) return "No shop requests found.";

            // For each request, try to find the item name
            const results = [];

            for (const req of requests) {
                const [item, user] = await Promise.all([
                    mongoClient.getShopItemById(req.inventory_id),
                    mongoClient.getUserById(req.user_id)
                ]);
                results.push(`- **${item?.subject || 'Unknown Item'}**: ${req.amount} requested by **${user?.name || 'Unknown User'}** on ${new Date(req.created_at).toLocaleDateString()}. Status: ${req.status}`);
            }

            return `### Recent Shop Requests:\n${results.join('\n')}`;
        } catch (error) {
            return `Error fetching request history: ${error}`;
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
                        startDate: { type: 'string', description: 'Start date (ISO format, e.g., 2025-01-01)' },
                        endDate: { type: 'string', description: 'End date (ISO format, e.g., 2025-01-31)' },
                        limit: { type: 'number', description: 'Number of recent requests to show (default 10)' }
                    },
                    required: []
                }
            }
        };
    }
}

/**
 * Tool for looking up supplier contact information
 */
export class GetSupplierInfoTool implements ITool {
    readonly name = 'get_supplier_info';
    readonly description = 'Search for a supplier by name to find their contact details, email, phone, and address.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();

            if (!args?.name) return "Please provide a supplier name to search for.";

            const query = {
                $or: [
                    { en_name: { $regex: args.name, $options: 'i' } },
                    { kh_name: { $regex: args.name, $options: 'i' } }
                ]
            };

            const suppliers = await mongoClient.getCollectionData('suppliers', { query, limit: 1 });

            if (!suppliers || suppliers.length === 0) return `No supplier found matching "${args.name}".`;

            const s = suppliers[0];
            return `### Supplier: ${s.en_name} (${s.kh_name})
- **Email:** ${s.email || 'N/A'}
- **Phone:** ${s.phone_number || 'N/A'}
- **Address:** ${s.en_address || s.kh_address || 'N/A'}
- **Company Type:** ${s.company_type || 'N/A'}
- **VAT TIN:** ${s.vat_tin || 'N/A'}
- **MOC Registration:** ${s.moc || 'N/A'}`;
        } catch (error) {
            return `Error fetching supplier info: ${error}`;
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
                        name: { type: 'string', description: 'Supplier name (English or Khmer)' }
                    },
                    required: ['name']
                }
            }
        };
    }
}

/**
 * Tool for viewing a single item's movement history (Ledger)
 */
export class GetItemStockHistoryTool implements ITool {
    readonly name = 'get_item_stock_history';
    readonly description = 'Provides a full history of stock additions and user requests for a specific item.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            if (!args?.subject) return "Please provide an item name (subject) to lookup history for.";

            // 1. Find the item
            const item = await db.collection('shops').findOne({
                subject: { $regex: args.subject, $options: 'i' }
            });

            if (!item) return `Item "${args.subject}" not found in inventory.`;

            // 2. Fetch history from both collections
            const searchId = item._id.toString();
            const [additions, requests] = await Promise.all([
                db.collection('shop_add_stocks').find({
                    $or: [{ inventory_id: item._id }, { inventory_id: searchId }]
                }).limit(10).toArray(),
                db.collection('shop_requests').find({
                    $or: [{ inventory_id: item._id }, { inventory_id: searchId }]
                }).limit(10).toArray()
            ]);

            const history: any[] = [];

            additions.forEach((a: any) => history.push({
                date: new Date(a.created_at),
                type: '📦 RESTOCK',
                amount: `+${a.amount}`,
                note: a.is_true ? '(Confirmed)' : '(Pending)'
            }));

            requests.forEach((r: any) => history.push({
                date: new Date(r.created_at),
                type: '👤 USAGE',
                amount: `-${r.amount}`,
                user_id: r.user_id,
                note: `Status: ${r.status}`
            }));

            // Sort by date descending
            history.sort((a, b) => b.date.getTime() - a.date.getTime());

            const formatted = [];
            for (const h of history) {
                let userPart = '';
                if (h.user_id) {
                    const user = await mongoClient.getUserById(h.user_id);
                    userPart = ` by **${user?.name || 'User'}**`;
                }
                formatted.push(`[${h.date.toLocaleDateString()}] **${h.type}**: ${h.amount} ${item.unit}${userPart} ${h.note}`);
            }

            return `### Stock Movement History for: ${item.subject}
**Current Stock:** ${item.amount} ${item.unit}
**Location:** ${item.location}

${formatted.join('\n') || 'No movement history found.'}`;
        } catch (error) {
            return `Error fetching item history: ${error}`;
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
                        subject: { type: 'string', description: 'Item name to lookup (e.g., book)' }
                    },
                    required: ['subject']
                }
            }
        };
    }
}

/**
 * Tool for getting quick inventory statistics (Counts)
 */
export class GetShopCountsTool implements ITool {
    readonly name = 'get_shop_counts';
    readonly description = 'Get total counts of products in the shop, including out-of-stock and type breakdown.';

    async execute(): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('shops');

            const [total, outOfStock, maintenance, it, office, kitchen] = await Promise.all([
                collection.countDocuments({ status: { $ne: 0 } }),
                collection.countDocuments({ status: { $ne: 0 }, amount: { $lte: 0 } }),
                collection.countDocuments({ status: { $ne: 0 }, type: 'maintainance' }),
                collection.countDocuments({ status: { $ne: 0 }, type: 'it' }),
                collection.countDocuments({ status: { $ne: 0 }, type: 'office' }),
                collection.countDocuments({ status: { $ne: 0 }, type: 'kitchen' })
            ]);

            return `### Shop Inventory Overview:
- **Total Active Products:** ${total}
- **Out of Stock:** ${outOfStock}
- **Maintenance/Spare Parts:** ${maintenance}
- **IT Equipment:** ${it}
- **Office Supplies:** ${office}
- **Kitchen/Food:** ${kitchen}`;
        } catch (error) {
            return `Error fetching shop counts: ${error}`;
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
 * Tool for viewing shop requests for a specific user
 */
export class GetShopRequestsByUserTool implements ITool {
    readonly name = 'get_shop_requests_by_user';
    readonly description = 'Find all shop requests made by a specific user name.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            if (!args?.name) return "Please provide a user name to search for.";

            // 1. Find the user
            const user = await db.collection('users').findOne({
                name: { $regex: args.name, $options: 'i' }
            });

            if (!user) return `User "${args.name}" not found.`;

            // 2. Find their requests
            const requests = await db.collection('shop_requests').find({ user_id: user._id.toString() }).limit(20).toArray();

            if (!requests || requests.length === 0) {
                // Try searching with ObjectId if string ID didn't work
                const requestsId = await db.collection('shop_requests').find({ user_id: user._id }).limit(20).toArray();
                if (requestsId.length === 0) return `No shop requests found for user **${user.name}**.`;
                requests.push(...requestsId);
            }

            const results = [];
            for (const req of requests) {
                const item = await mongoClient.getShopItemById(req.inventory_id);
                results.push(`- **${item?.subject || 'Unknown Item'}**: ${req.amount} requested on ${new Date(req.created_at).toLocaleDateString()}. Status: ${req.status}`);
            }

            return `### Shop Requests for **${user.name}**:\n${results.join('\n')}`;
        } catch (error) {
            return `Error fetching user requests: ${error}`;
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
                        name: { type: 'string', description: 'User name to search for' }
                    },
                    required: ['name']
                }
            }
        };
    }
}

export const SHOP_MONGO_TOOLS = [
    new GetShopInventoryTool(),
    new GetStockStatusTool(),
    new GetShopRequestHistoryTool(),
    new GetSupplierInfoTool(),
    new GetItemStockHistoryTool(),
    new GetShopCountsTool(),
    new GetShopRequestsByUserTool()
];
