import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import { getMongoClient } from '../../infrastructure/database/MongoDBClient.js';
import { ObjectId } from 'mongodb';

/**
 * Tool for listing/searching gatepass requests
 */
export class GetGatepassRequestsTool implements ITool {
    readonly name = 'get_gatepass_requests';
    readonly description = 'List or search gatepass requests. Supports filtering by status, request type, reason, or date range.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();

            const query: any = {};
            if (args?.status) query.status = args.status;
            if (args?.rq_type) query.rq_type = args.rq_type;
            if (args?.name) query.eng_name = { $regex: args.name, $options: 'i' };
            if (args?.reason) query.rq_reason = { $regex: args.reason, $options: 'i' };

            if (args?.startDate || args?.endDate) {
                query.created_at = {};
                if (args.startDate) query.created_at.$gte = new Date(args.startDate);
                if (args.endDate) query.created_at.$lte = new Date(args.endDate);
            }

            const requests = await mongoClient.getCollectionData('requests', {
                query,
                limit: args?.limit || 10,
                sort: { created_at: -1 }
            });

            if (!requests || requests.length === 0) return "No gatepass requests found matching those criteria.";

            const results = requests.map((r: any) =>
                `- **[${r.status}] ${r.eng_name}** - ${r.rq_type}\n  Reason: ${r.rq_reason || 'N/A'}\n  Time: ${r.departure_time || '?'} -> ${r.arrival_time || '?'}\n  Created: ${new Date(r.created_at).toLocaleDateString()}\n  ID: \`${r._id}\``
            );

            return `### Gatepass Requests:\n${results.join('\n\n')}`;
        } catch (error) {
            return `Error fetching gatepass requests: ${error}`;
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
                        status: { type: 'string', description: 'Status (Pending, Approved, Rejected, Expired)' },
                        rq_type: { type: 'string', description: 'Request Type (Personal Request, Material Transport, Fixed Assets Transport)' },
                        name: { type: 'string', description: 'Employee name search' },
                        reason: { type: 'string', description: 'Reason for request search' },
                        startDate: { type: 'string', description: 'Start date (ISO format)' },
                        endDate: { type: 'string', description: 'End date (ISO format)' },
                        limit: { type: 'number', description: 'Result limit (default 10)' }
                    },
                    required: []
                }
            }
        };
    }
}

/**
 * Tool for getting gatepass statistics
 */
export class GetGatepassCountsTool implements ITool {
    readonly name = 'get_gatepass_counts';
    readonly description = 'Get a summary of gatepass requests by status and type.';

    async execute(): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            const [statusStats, typeStats, total] = await Promise.all([
                db.collection('requests').aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]).toArray(),
                db.collection('requests').aggregate([{ $group: { _id: "$rq_type", count: { $sum: 1 } } }]).toArray(),
                db.collection('requests').countDocuments()
            ]);

            let response = `### 🚪 Gatepass Statistics Overview:\n`;
            response += `- **Total Requests:** ${total}\n\n`;

            response += `**Breakdown by Status:**\n`;
            statusStats.forEach((s: any) => {
                response += `- ${s._id || 'Unknown'}: ${s.count}\n`;
            });

            response += `\n**Breakdown by Type:**\n`;
            typeStats.forEach((t: any) => {
                response += `- ${t._id || 'Unknown'}: ${t.count}\n`;
            });

            return response;
        } catch (error) {
            return `Error fetching gatepass statistics: ${error}`;
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
 * Tool for viewing a single gatepass details
 */
export class GetGatepassDetailsTool implements ITool {
    readonly name = 'get_gatepass_details';
    readonly description = 'Get full details of a specific gatepass request.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            if (!args?.requestId) return "Please provide a requestId.";

            let requestIdObj;
            try {
                requestIdObj = new ObjectId(args.requestId);
            } catch (e) {
                requestIdObj = args.requestId;
            }

            const request = await db.collection('requests').findOne({ _id: requestIdObj });
            if (!request) return `Gatepass request with ID \`${args.requestId}\` not found.`;

            let detailText = `### Gatepass Details: ${request.eng_name}\n`;
            detailText += `- **ID:** \`${request._id}\`\n`;
            detailText += `- **Status:** ${request.status}\n`;
            detailText += `- **Request Type:** ${request.rq_type}\n`;
            detailText += `- **Department:** ${request.dept_name || 'N/A'}\n`;
            detailText += `- **Supervisor:** ${request.supervisor_name || 'N/A'}\n`;
            detailText += `- **Reason:** ${request.rq_reason || 'N/A'}\n`;
            detailText += `- **Departure Time:** ${request.departure_time || '?'}\n`;
            detailText += `- **Arrival Time:** ${request.arrival_time || '?'}\n`;
            detailText += `- **Pass Key Status:** ${request.pass_key || 'N/A'}\n`;
            detailText += `- **Created At:** ${new Date(request.created_at).toLocaleString()}\n`;

            if (request.quantity_transfer_device) detailText += `- **Device Transfer Qty:** ${request.quantity_transfer_device}\n`;
            if (request.quantity_transfer_garment_samples) detailText += `- **Garment Samples Qty:** ${request.quantity_transfer_garment_samples}\n`;

            return detailText;
        } catch (error) {
            return `Error fetching gatepass details: ${error}`;
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
                        requestId: { type: 'string', description: 'The unique ID of the gatepass request' }
                    },
                    required: ['requestId']
                }
            }
        };
    }
}

export const GATEPASS_MONGO_TOOLS = [
    new GetGatepassRequestsTool(),
    new GetGatepassCountsTool(),
    new GetGatepassDetailsTool()
];
