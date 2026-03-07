import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import { laravelClient } from '../../infrastructure/api/LaravelClient.js';

/**
 * Base class for purchase request tools to avoid repetition
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
 * Tool: Count active purchase requests
 */
class CountPurchaseRequestsTool extends BasePurchaseTool {
    readonly name = 'count_purchase_requests';
    readonly description = 'Get the count of purchase requests (current active requests)';

    async execute(): Promise<string> {
        try {
            const count = await laravelClient.getPurchaseRequestsCount();
            return `There are ${count} purchase requests.`;
        } catch (error) {
            return "I'm sorry, I couldn't retrieve the purchase request count.";
        }
    }
}

/**
 * Tool: Count GM pending requests
 */
class GmPendingPurchaseRequestsTool extends BasePurchaseTool {
    readonly name = 'gm_pending_purchase_requests';
    readonly description = 'Get the count of purchase requests pending GM approval';

    async execute(): Promise<string> {
        try {
            const count = await laravelClient.getGmPendingCount();
            return `There are ${count} purchase requests pending GM approval.`;
        } catch (error) {
            return "I'm sorry, I couldn't retrieve the GM pending count.";
        }
    }
}

/**
 * Tool: Count Accounting approved requests
 */
class AccApprovePurchaseRequestsTool extends BasePurchaseTool {
    readonly name = 'acc_approve_purchase_requests';
    readonly description = 'Get the count of purchase requests approved by accounting';

    async execute(): Promise<string> {
        try {
            const count = await laravelClient.getAccApproveCount();
            return `There are ${count} purchase requests approved by accounting.`;
        } catch (error) {
            return "I'm sorry, I couldn't retrieve the accounting approved count.";
        }
    }
}

/**
 * Tool: Count monthly requests
 */
class MonthPurchaseRequestsTool extends BasePurchaseTool {
    readonly name = 'month_purchase_requests';
    readonly description = 'Get the count of purchase requests for the current month';

    async execute(): Promise<string> {
        try {
            const count = await laravelClient.getMonthCount();
            return `There are ${count} purchase requests this month.`;
        } catch (error) {
            return "I'm sorry, I couldn't retrieve the monthly count.";
        }
    }
}

/**
 * Tool: Count total requests
 */
class TotalPurchaseRequestsTool extends BasePurchaseTool {
    readonly name = 'total_purchase_requests';
    readonly description = 'Get the total count of all purchase requests (all-time)';

    async execute(): Promise<string> {
        try {
            const count = await laravelClient.getAllCount();
            return `There are a total of ${count} purchase requests in the system.`;
        } catch (error) {
            return "I'm sorry, I couldn't retrieve the total count.";
        }
    }
}

/**
 * Tool: Get purchase requests with details
 */
class GetPurchaseRequestsTool extends BasePurchaseTool {
    readonly name = 'get_purchase_requests';
    readonly description = 'Get a list of purchase requests with full details (item, price, status, requester, etc.). You can filter by status and limit the results.';

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
                            description: 'Limit the number of results (default 20, max 50)'
                        },
                        pendingOnly: {
                            type: 'boolean',
                            description: 'Only return requests that are NOT complete (awaiting approval)'
                        }
                    },
                    required: []
                }
            }
        };
    }

    async execute(args?: { status?: string, limit?: number, pendingOnly?: boolean }): Promise<string> {
        try {
            const limit = args?.limit || 20;
            const requests = await laravelClient.getPurchaseRequests({
                status: args?.status,
                limit: limit > 50 ? 50 : limit // Safety cap
            });

            if (!requests || requests.length === 0) {
                return "No purchase requests found.";
            }

            // Filter for pending if requested (logic: complete is not true)
            let filteredRequests = requests;
            if (args?.pendingOnly) {
                filteredRequests = requests.filter(r => !r.complete);
            }

            // STRIP HEAVY FIELDS to save tokens and prevent "none found" errors due to size
            const cleanRequests = filteredRequests.map(r => {
                const { product_images, quotation, unit_type, comments, ...clean } = r;
                return clean;
            }).slice(0, limit);

            if (cleanRequests.length === 0) {
                return args?.pendingOnly ? "No pending purchase requests found." : "No purchase requests found.";
            }

            return JSON.stringify({
                total_in_batch: cleanRequests.length,
                note: "Heavy fields (images/docs) have been stripped for brevity.",
                requests: cleanRequests
            }, null, 2);
        } catch (error) {
            return "I'm sorry, I couldn't retrieve the purchase requests.";
        }
    }
}

/**
 * Tool: Get specific purchase request details
 */
class GetPurchaseDetailsTool extends BasePurchaseTool {
    readonly name = 'get_purchase_details';
    readonly description = 'Get full details for a specific purchase request by its ID';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            description: 'The ID of the purchase request'
                        }
                    },
                    required: ['id']
                }
            }
        };
    }

    async execute(args: { id: string | number }): Promise<string> {
        try {
            const details = await laravelClient.getPurchaseDetails(args.id);
            if (!details) {
                return `No purchase request found with ID: ${args.id}`;
            }
            return JSON.stringify(details, null, 2);
        } catch (error) {
            return `I'm sorry, I couldn't retrieve details for purchase request ID: ${args.id}`;
        }
    }
}

/**
 * Export all tools for this domain as a single array
 */
export const PURCHASE_REQUEST_TOOLS: ITool[] = [
    new CountPurchaseRequestsTool(),
    new GmPendingPurchaseRequestsTool(),
    new AccApprovePurchaseRequestsTool(),
    new MonthPurchaseRequestsTool(),
    new TotalPurchaseRequestsTool(),
    new GetPurchaseRequestsTool(),
    new GetPurchaseDetailsTool()
];
