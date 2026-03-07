import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import { getMongoClient } from '../../infrastructure/database/MongoDBClient.js';

/**
 * Base class for purchase request tools
 */
abstract class BasePurchaseTool implements ITool {
    abstract name: string;
    abstract description: string;
    abstract execute(args?: any): Promise<string>;

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
 * Helper to strip heavy fields from results
 */
/**
 * Tool helper: Aggressively strip fields to keep context window small for LLM
 */
function stripHeavyFields(records: any[]): any[] {
    return records.map((r: any) => {
        // Keep ONLY what is absolutely necessary for a summary
        return {
            code: r.code,
            reason: r.reason,
            department: r.department,
            status: r.status,
            total_price: r.total_price,
            created_at: r.created_at,
            complete: r.complete,
            returnReason: r.returnReason // Include this for rejected requests
        };
    });
}

// ==================== EXISTING TOOLS ====================

/**
 * Tool 1: Get purchase requests with details
 */
class GetPurchaseRequestsMongoTool extends BasePurchaseTool {
    readonly name = 'get_purchase_requests';
    readonly description = 'Get a list of purchase requests with full details. Filter by status, pending state, or limit results.';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            description: 'Filter by status (e.g., submitted, approved)'
                        },
                        limit: {
                            type: 'number',
                            description: 'Limit the number of results (default 5, max 15)'
                        },
                        pendingOnly: {
                            type: 'boolean',
                            description: 'Only return requests that are NOT complete'
                        }
                    },
                    required: []
                }
            }
        };
    }

    async execute(args?: { status?: string, limit?: number, pendingOnly?: boolean }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const limit = args?.limit || 5;
            const requests = await mongoClient.getPurchaseRequests({ ...args, limit: limit > 15 ? 15 : limit });

            if (!requests || requests.length === 0) {
                return args?.pendingOnly ? "No pending purchase requests found." : "No purchase requests found.";
            }

            const cleanRequests = stripHeavyFields(requests);
            return JSON.stringify({
                total_in_batch: cleanRequests.length,
                note: "Heavy fields (images/docs) have been stripped for brevity.",
                requests: cleanRequests
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve the purchase requests from the database.";
        }
    }
}

/**
 * Tool 2: Get counts for all states
 */
class GetPurchaseCountsTool extends BasePurchaseTool {
    readonly name = 'get_purchase_counts';
    readonly description = 'Get aggregated counts: total, pending, GM pending, accountant approved, and this month.';

    async execute(): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const counts = await mongoClient.getPurchaseRequestCounts();

            return JSON.stringify({
                total_requests: counts.total,
                pending_requests: counts.pending,
                gm_pending: counts.gmPending,
                accountant_approved: counts.accApproved,
                requests_this_month: counts.thisMonth
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve the counts from the database.";
        }
    }
}

/**
 * Tool 3: Get returned/rejected requests
 */
class GetReturnedRequestsTool extends BasePurchaseTool {
    readonly name = 'get_returned_requests';
    readonly description = 'Get purchase requests that were rejected/returned. Shows who rejected them, why, and when.';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        limit: {
                            type: 'number',
                            description: 'Limit the number of results (default 10)'
                        }
                    },
                    required: []
                }
            }
        };
    }

    async execute(args?: { limit?: number }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            const limit = args?.limit || 10;
            const returnedRequests = await collection
                .find({ returnFromName: { $exists: true } })
                .limit(limit > 50 ? 50 : limit)
                .sort({ returned_at: -1 })
                .toArray();

            if (returnedRequests.length === 0) {
                return "No returned/rejected requests found.";
            }

            const cleanRequests = stripHeavyFields(returnedRequests);
            return JSON.stringify({
                total_returned: cleanRequests.length,
                note: "These requests were rejected/returned for revision.",
                requests: cleanRequests
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve the returned requests.";
        }
    }
}

// ==================== NEW TOOLS ====================

/**
 * Tool 4: Get requests by department
 */
class GetRequestsByDepartmentTool extends BasePurchaseTool {
    readonly name = 'get_requests_by_department';
    readonly description = 'Get purchase requests filtered by department name. Shows all requests from a specific department.';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        department: {
                            type: 'string',
                            description: 'Department name (e.g., "Packing_Department", "IT_Department")'
                        },
                        limit: {
                            type: 'number',
                            description: 'Limit results (default 20)'
                        }
                    },
                    required: ['department']
                }
            }
        };
    }

    async execute(args?: { department: string, limit?: number }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            const limit = args?.limit || 20;
            const requests = await mongoClient.getPurchaseRequests({
                department: args?.department,
                limit: limit
            });

            if (requests.length === 0) {
                return `No requests found for department: ${args?.department}`;
            }

            const cleanRequests = stripHeavyFields(requests);
            return JSON.stringify({
                department: args?.department,
                total: cleanRequests.length,
                requests: cleanRequests
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve department requests.";
        }
    }
}

/**
 * Tool 5: Get department statistics
 */
class GetDepartmentStatisticsTool extends BasePurchaseTool {
    readonly name = 'get_department_statistics';
    readonly description = 'Get statistics showing request counts per department. Shows which departments have the most requests.';

    async execute(): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            const stats = await collection.aggregate([
                {
                    $group: {
                        _id: '$department',
                        total: { $sum: 1 },
                        pending: {
                            $sum: { $cond: [{ $ne: ['$complete', true] }, 1, 0] }
                        },
                        completed: {
                            $sum: { $cond: [{ $eq: ['$complete', true] }, 1, 0] }
                        }
                    }
                },
                { $sort: { total: -1 } }
            ]).toArray();

            return JSON.stringify({
                total_departments: stats.length,
                departments: stats.map(s => ({
                    department: s._id,
                    total_requests: s.total,
                    pending: s.pending,
                    completed: s.completed
                }))
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve department statistics.";
        }
    }
}

/**
 * Tool 6: Get requests by date range
 */
class GetRequestsByDateRangeTool extends BasePurchaseTool {
    readonly name = 'get_requests_by_date_range';
    readonly description = 'Get requests created within a specific date range. Useful for "show me requests from last week" or specific periods.';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        startDate: {
                            type: 'string',
                            description: 'Start date in ISO format (e.g., "2025-01-01")'
                        },
                        endDate: {
                            type: 'string',
                            description: 'End date in ISO format (e.g., "2025-01-31")'
                        },
                        limit: {
                            type: 'number',
                            description: 'Limit results (default 20)'
                        }
                    },
                    required: ['startDate', 'endDate']
                }
            }
        };
    }

    async execute(args?: { startDate: string, endDate: string, limit?: number }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            const limit = args?.limit || 20;
            const requests = await collection
                .find({
                    created_at: {
                        $gte: new Date(args!.startDate),
                        $lte: new Date(args!.endDate)
                    }
                })
                .limit(limit > 50 ? 50 : limit)
                .sort({ created_at: -1 })
                .toArray();

            if (requests.length === 0) {
                return `No requests found between ${args?.startDate} and ${args?.endDate}`;
            }

            const cleanRequests = stripHeavyFields(requests);
            return JSON.stringify({
                date_range: `${args?.startDate} to ${args?.endDate}`,
                total: cleanRequests.length,
                requests: cleanRequests
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve requests by date range.";
        }
    }
}

/**
 * Tool 7: Get oldest pending requests
 */
class GetOldestPendingRequestsTool extends BasePurchaseTool {
    readonly name = 'get_oldest_pending_requests';
    readonly description = 'Get the oldest pending requests that are still waiting for approval. Helps identify stuck requests.';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        limit: {
                            type: 'number',
                            description: 'How many oldest requests to show (default 10)'
                        }
                    },
                    required: []
                }
            }
        };
    }

    async execute(args?: { limit?: number }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            const limit = args?.limit || 10;
            const requests = await collection
                .find({ complete: { $ne: true } })
                .sort({ created_at: 1 }) // Ascending = oldest first
                .limit(limit > 50 ? 50 : limit)
                .toArray();

            if (requests.length === 0) {
                return "No pending requests found.";
            }

            const cleanRequests = stripHeavyFields(requests);
            return JSON.stringify({
                total: cleanRequests.length,
                note: "Sorted by oldest first. These requests may be stuck.",
                requests: cleanRequests
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve oldest pending requests.";
        }
    }
}

/**
 * Tool 8: Get requests by approval stage
 */
class GetRequestsByApprovalStageTool extends BasePurchaseTool {
    readonly name = 'get_requests_by_approval_stage';
    readonly description = 'Get requests at a specific approval stage: head_pending, gm_pending, accountant_pending, or all_approved.';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        stage: {
                            type: 'string',
                            description: 'Approval stage: "head_pending", "gm_pending", "accountant_pending", or "all_approved"'
                        },
                        limit: {
                            type: 'number',
                            description: 'Limit results (default 20)'
                        }
                    },
                    required: ['stage']
                }
            }
        };
    }

    async execute(args?: { stage: string, limit?: number }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            let query: any = {};

            switch (args?.stage) {
                case 'head_pending':
                    query = { head_approve: { $ne: true }, complete: { $ne: true } };
                    break;
                case 'gm_pending':
                    query = { head_approve: true, gm_approve: { $ne: true }, complete: { $ne: true } };
                    break;
                case 'accountant_pending':
                    query = { gm_approve: true, accountant_approve: { $ne: true }, complete: { $ne: true } };
                    break;
                case 'all_approved':
                    query = { head_approve: true, gm_approve: true, accountant_approve: true };
                    break;
                default:
                    return `Invalid stage. Use: head_pending, gm_pending, accountant_pending, or all_approved`;
            }

            const limit = args?.limit || 20;
            const requests = await collection
                .find(query)
                .limit(limit > 50 ? 50 : limit)
                .sort({ created_at: -1 })
                .toArray();

            if (requests.length === 0) {
                return `No requests found at stage: ${args?.stage}`;
            }

            const cleanRequests = stripHeavyFields(requests);
            return JSON.stringify({
                stage: args?.stage,
                total: cleanRequests.length,
                requests: cleanRequests
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve requests by approval stage.";
        }
    }
}

/**
 * Tool 9: Get rejection statistics
 */
class GetRejectionStatisticsTool extends BasePurchaseTool {
    readonly name = 'get_rejection_statistics';
    readonly description = 'Get statistics about rejected requests: who rejects most, common reasons, trends.';

    async execute(): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            const [byPerson, byReason] = await Promise.all([
                // Group by person who rejected
                collection.aggregate([
                    { $match: { returnFromName: { $exists: true } } },
                    {
                        $group: {
                            _id: '$returnFromName',
                            count: { $sum: 1 },
                            position: { $first: '$returnFromPosition' }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]).toArray(),

                // Group by rejection reason
                collection.aggregate([
                    { $match: { returnReason: { $exists: true } } },
                    {
                        $group: {
                            _id: '$returnReason',
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { count: -1 } },
                    { $limit: 10 }
                ]).toArray()
            ]);

            return JSON.stringify({
                total_rejections: byPerson.reduce((sum, p) => sum + p.count, 0),
                by_person: byPerson.map(p => ({
                    name: p._id,
                    position: p.position,
                    rejections: p.count
                })),
                common_reasons: byReason.map(r => ({
                    reason: r._id,
                    count: r.count
                }))
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve rejection statistics.";
        }
    }
}

/**
 * Tool 10: Get requests by category
 */
class GetRequestsByCategoryTool extends BasePurchaseTool {
    readonly name = 'get_requests_by_category';
    readonly description = 'Filter requests by category (Local/Import) or buy_by method (purchaser/myself).';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        category: {
                            type: 'string',
                            description: 'Category: "Local Purchase" or "Import Purchase"'
                        },
                        buy_by: {
                            type: 'string',
                            description: 'Buying method: "purchaser" or "myself"'
                        },
                        limit: {
                            type: 'number',
                            description: 'Limit results (default 20)'
                        }
                    },
                    required: []
                }
            }
        };
    }

    async execute(args?: { category?: string, buy_by?: string, limit?: number }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            const query: any = {};
            if (args?.category) query.category = args.category;
            if (args?.buy_by) query.buy_by = args.buy_by;

            const limit = args?.limit || 20;
            const requests = await collection
                .find(query)
                .limit(limit > 50 ? 50 : limit)
                .sort({ created_at: -1 })
                .toArray();

            if (requests.length === 0) {
                return `No requests found for the specified filters.`;
            }

            const cleanRequests = stripHeavyFields(requests);
            return JSON.stringify({
                filters: args,
                total: cleanRequests.length,
                requests: cleanRequests
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve requests by category.";
        }
    }
}

/**
 * Tool 11: Get requests by payment method
 */
class GetRequestsByPaymentMethodTool extends BasePurchaseTool {
    readonly name = 'get_requests_by_payment_method';
    readonly description = 'Filter requests by payment method/option (Pre-Paid, Credit-Paid, etc.).';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        payment_method: {
                            type: 'string',
                            description: 'Payment method: "Pre-Paid", "Credit-Paid", etc.'
                        },
                        limit: {
                            type: 'number',
                            description: 'Limit results (default 20)'
                        }
                    },
                    required: ['payment_method']
                }
            }
        };
    }

    async execute(args?: { payment_method: string, limit?: number }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            const limit = args?.limit || 20;
            const requests = await collection
                .find({ option: args?.payment_method })
                .limit(limit > 50 ? 50 : limit)
                .sort({ created_at: -1 })
                .toArray();

            if (requests.length === 0) {
                return `No requests found with payment method: ${args?.payment_method}`;
            }

            const cleanRequests = stripHeavyFields(requests);
            return JSON.stringify({
                payment_method: args?.payment_method,
                total: cleanRequests.length,
                requests: cleanRequests
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve requests by payment method.";
        }
    }
}

/**
 * Tool 12: Get requests by user
 */
class GetRequestsByUserTool extends BasePurchaseTool {
    readonly name = 'get_requests_by_user';
    readonly description = 'Get requests created by a specific user or approved by a specific person.';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        user_id: {
                            type: 'string',
                            description: 'User ID who created the request'
                        },
                        head_name: {
                            type: 'string',
                            description: 'Head name who approved the request'
                        },
                        limit: {
                            type: 'number',
                            description: 'Limit results (default 20)'
                        }
                    },
                    required: []
                }
            }
        };
    }

    async execute(args?: { user_id?: string, head_name?: string, limit?: number }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            const query: any = {};
            if (args?.user_id) query.user_id = args.user_id;
            if (args?.head_name) query.head_name = args.head_name;

            const limit = args?.limit || 20;
            const requests = await collection
                .find(query)
                .limit(limit > 50 ? 50 : limit)
                .sort({ created_at: -1 })
                .toArray();

            if (requests.length === 0) {
                return `No requests found for the specified user filters.`;
            }

            const cleanRequests = stripHeavyFields(requests);
            return JSON.stringify({
                filters: args,
                total: cleanRequests.length,
                requests: cleanRequests
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve requests by user.";
        }
    }
}

/**
 * Tool 13: Search requests
 */
class SearchRequestsTool extends BasePurchaseTool {
    readonly name = 'search_requests';
    readonly description = 'Search for requests by code number, reference, or text in reason field.';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        code: {
                            type: 'number',
                            description: 'Request code number (e.g., 1595)'
                        },
                        reference: {
                            type: 'string',
                            description: 'Reference code (e.g., "YM-Packing-12")'
                        },
                        reason_contains: {
                            type: 'string',
                            description: 'Search text in reason field'
                        },
                        limit: {
                            type: 'number',
                            description: 'Limit results (default 20)'
                        }
                    },
                    required: []
                }
            }
        };
    }

    async execute(args?: { code?: number, reference?: string, reason_contains?: string, limit?: number }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            const query: any = {};
            if (args?.code) query.code = args.code;
            if (args?.reference) query.reference = args.reference;
            if (args?.reason_contains) query.reason = { $regex: args.reason_contains, $options: 'i' };

            const limit = args?.limit || 20;
            const requests = await collection
                .find(query)
                .limit(limit > 50 ? 50 : limit)
                .sort({ created_at: -1 })
                .toArray();

            if (requests.length === 0) {
                return `No requests found matching the search criteria.`;
            }

            const cleanRequests = stripHeavyFields(requests);
            return JSON.stringify({
                search_criteria: args,
                total: cleanRequests.length,
                requests: cleanRequests
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't search for requests.";
        }
    }
}

/**
 * Tool 14: Get items for a specific purchase request
 */
class GetPurchaseRequestItemsTool extends BasePurchaseTool {
    readonly name = 'get_purchase_request_items';
    readonly description = 'Get all individual items belonging to a specific purchase request by its ID or code.';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        purchase_request_id: {
                            type: 'string',
                            description: 'The internal ID (_id) of the purchase request'
                        }
                    },
                    required: ['purchase_request_id']
                }
            }
        };
    }

    async execute(args: { purchase_request_id: string }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_request_item');

            const items = await collection
                .find({ purchase_request_id: args.purchase_request_id })
                .toArray();

            if (items.length === 0) {
                return `No items found for purchase request ID: ${args.purchase_request_id}`;
            }

            return JSON.stringify({
                purchase_request_id: args.purchase_request_id,
                total_items: items.length,
                items: items
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve the request items.";
        }
    }
}

/**
 * Tool 15: Get approval statistics (for management team)
 */
class GetManagementApprovalStatsTool extends BasePurchaseTool {
    readonly name = 'get_management_approval_stats';
    readonly description = 'Get statistics about approvals from GM, Head of Department, and Accountants.';

    async execute(): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            const stats = await collection.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        head_approved: { $sum: { $cond: [{ $eq: ['$head_approve', true] }, 1, 0] } },
                        gm_approved: { $sum: { $cond: [{ $eq: ['$gm_approve', true] }, 1, 0] } },
                        acc_approved: { $sum: { $cond: [{ $eq: ['$accountant_approve', true] }, 1, 0] } },
                        fully_completed: { $sum: { $cond: [{ $eq: ['$complete', true] }, 1, 0] } }
                    }
                }
            ]).toArray();

            return JSON.stringify({
                note: "Statistics for management review",
                stats: stats[0] || {}
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve approval statistics.";
        }
    }
}

/**
 * Tool 16: Get approval trends
 */
class GetApprovalTrendsTool extends BasePurchaseTool {
    readonly name = 'get_approval_trends';
    readonly description = 'Get approval trends and statistics: approval rate, average time, monthly trends.';

    async execute(): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();
            const collection = db.collection('purchase_requests');

            const [total, completed, monthlyTrend] = await Promise.all([
                collection.countDocuments({}),
                collection.countDocuments({ complete: true }),

                // Monthly trend for last 6 months
                collection.aggregate([
                    {
                        $match: {
                            created_at: {
                                $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
                            }
                        }
                    },
                    {
                        $group: {
                            _id: {
                                year: { $year: '$created_at' },
                                month: { $month: '$created_at' }
                            },
                            total: { $sum: 1 },
                            completed: {
                                $sum: { $cond: [{ $eq: ['$complete', true] }, 1, 0] }
                            }
                        }
                    },
                    { $sort: { '_id.year': 1, '_id.month': 1 } }
                ]).toArray()
            ]);

            const approvalRate = total > 0 ? ((completed / total) * 100).toFixed(2) : 0;

            return JSON.stringify({
                overall: {
                    total_requests: total,
                    completed: completed,
                    approval_rate: `${approvalRate}%`
                },
                monthly_trend: monthlyTrend.map(m => ({
                    month: `${m._id.year}-${String(m._id.month).padStart(2, '0')}`,
                    total: m.total,
                    completed: m.completed,
                    completion_rate: `${((m.completed / m.total) * 100).toFixed(2)}%`
                }))
            }, null, 2);
        } catch (error) {
            console.error('MongoDB error:', error);
            return "I'm sorry, I couldn't retrieve approval trends.";
        }
    }
}

/**
 * Tool 17: Get summarized spend analytics for visualization in the chatbot
 */
class GetPurchaseAnalyticsTool extends BasePurchaseTool {
    readonly name = 'get_purchase_analytics';
    readonly description = 'Get summarized spend analytics (spend by dept, status, and category) for visualization directly in the chatbot.';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        days: {
                            type: 'number',
                            description: 'Number of past days to analyze (default 30)'
                        }
                    },
                    required: []
                }
            }
        };
    }

    async execute(args?: { days?: number }): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            const days = args?.days || 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            // 1. Spend by Department (USD)
            const deptSpend = await db.collection('purchase_requests').aggregate([
                { $match: { created_at: { $gte: startDate } } },
                { $addFields: { idString: { $toString: '$_id' } } },
                {
                    $lookup: {
                        from: 'purchase_request_items',
                        localField: 'idString',
                        foreignField: 'purchase_request_id',
                        as: 'items'
                    }
                },
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$department',
                        usd: {
                            $sum: {
                                $cond: [{ $eq: ['$items.unit_type', 'USD'] },
                                { $multiply: [{ $toDouble: '$items.qty' }, { $toDouble: '$items.unit_price' }] }, 0]
                            }
                        },
                        khr: {
                            $sum: {
                                $cond: [{ $in: ['$items.unit_type', ['KHR', 'Riel']] },
                                { $multiply: [{ $toDouble: '$items.qty' }, { $toDouble: '$items.unit_price' }] }, 0]
                            }
                        }
                    }
                },
                { $sort: { usd: -1 } }
            ]).toArray();

            // 2. Status Distribution
            const statusDist = await db.collection('purchase_requests').aggregate([
                { $match: { created_at: { $gte: startDate } } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]).toArray();

            return JSON.stringify({
                period: `Last ${days} days`,
                department_summary: deptSpend.map(d => ({
                    dept: (d._id || 'Unassigned').replace(/_/g, ' '),
                    usd: d.usd.toFixed(2),
                    khr: d.khr.toFixed(0)
                })),
                status_summary: statusDist.map(s => ({
                    status: s._id || 'Unknown',
                    count: s.count
                }))
            }, null, 2);

        } catch (error) {
            console.error('Analytics error:', error);
            return "Failed to fetch analytics.";
        }
    }
}

/**
 * Export all MongoDB-based tools
 */
export const PURCHASE_REQUEST_MONGO_TOOLS: ITool[] = [
    // Existing tools
    new GetPurchaseRequestsMongoTool(),
    new GetPurchaseCountsTool(),
    new GetReturnedRequestsTool(),

    // New comprehensive tools
    new GetRequestsByDepartmentTool(),
    new GetDepartmentStatisticsTool(),
    new GetRequestsByDateRangeTool(),
    new GetOldestPendingRequestsTool(),
    new GetRequestsByApprovalStageTool(),
    new GetRejectionStatisticsTool(),
    new GetRequestsByCategoryTool(),
    new GetRequestsByPaymentMethodTool(),
    new GetRequestsByUserTool(),
    new SearchRequestsTool(),
    new GetPurchaseRequestItemsTool(),
    new GetManagementApprovalStatsTool(),
    new GetApprovalTrendsTool(),
    new GetPurchaseAnalyticsTool()
];
