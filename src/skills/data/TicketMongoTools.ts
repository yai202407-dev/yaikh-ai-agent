import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import { getMongoClient } from '../../infrastructure/database/MongoDBClient.js';
import { ObjectId } from 'mongodb';

/**
 * Tool for listing/searching tickets
 */
export class GetTicketsTool implements ITool {
    readonly name = 'get_tickets';
    readonly description = 'List or search tickets. Supports filtering by status, type, nature, assigned user, or date range.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();

            const query: any = {};
            if (args?.status !== undefined) query.status = Number(args.status);
            if (args?.type) query.type = args.type;
            if (args?.nature) query.nature = { $regex: args.nature, $options: 'i' };
            if (args?.subject) query.subject = { $regex: args.subject, $options: 'i' };

            if (args?.startDate || args?.endDate) {
                query.created_at = {};
                if (args.startDate) query.created_at.$gte = new Date(args.startDate);
                if (args.endDate) query.created_at.$lte = new Date(args.endDate);
            }

            const tickets = await mongoClient.getCollectionData('tickets', {
                query,
                limit: args?.limit || 10,
                sort: { created_at: -1 }
            });

            if (!tickets || tickets.length === 0) return "No tickets found matching those criteria.";

            const results = [];
            for (const ticket of tickets) {
                let userPart = 'User: Unknown';
                if (ticket.user_id) {
                    const user = await mongoClient.getUserById(ticket.user_id);
                    userPart = `By: ${user?.name || 'Unknown'}`;
                }

                let assignedPart = '';
                if (ticket.assigned_user_id) {
                    const assigned = await mongoClient.getUserById(ticket.assigned_user_id);
                    assignedPart = ` | Assigned To: ${assigned?.name || 'Unknown'}`;
                }

                const statusText = this.getStatusText(ticket.status);
                results.push(`- **[${statusText}] ${ticket.subject}** (${ticket.type})\n  ${userPart}${assignedPart} | Created: ${new Date(ticket.created_at).toLocaleDateString()}\n  ID: \`${ticket._id}\``);
            }

            return `### Ticket List:\n${results.join('\n\n')}`;
        } catch (error) {
            return `Error fetching tickets: ${error}`;
        }
    }

    private getStatusText(status: any): string {
        const s = Number(status);
        switch (s) {
            case 1: return 'OPEN';
            case 2: return 'IN PROGRESS';
            case 3: return 'COMPLETED';
            case 0: return 'CANCELLED';
            default: return `STATUS ${s}`;
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
                        status: { type: 'number', description: 'Status code (1: Open, 2: In Progress, 3: Completed)' },
                        type: { type: 'string', description: 'Ticket type (e.g., GA_Main, CSR_Main)' },
                        nature: { type: 'string', description: 'Nature/Category search' },
                        subject: { type: 'string', description: 'Subject search' },
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
 * Tool for viewing full ticket details including timeline and sub-tasks
 */
export class GetTicketDetailsTool implements ITool {
    readonly name = 'get_ticket_details';
    readonly description = 'Get full details of a specific ticket, including its history (timeline) and sub-tasks.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            if (!args?.ticketId) return "Please provide a ticketId.";

            let ticketIdObj;
            try {
                ticketIdObj = new ObjectId(args.ticketId);
            } catch (e) {
                // If not valid hex, use as string
                ticketIdObj = args.ticketId;
            }

            const ticket = await db.collection('tickets').findOne({ _id: ticketIdObj });
            if (!ticket) return `Ticket with ID \`${args.ticketId}\` not found.`;

            // 1. Resolve users
            const [creator, assigned] = await Promise.all([
                mongoClient.getUserById(ticket.user_id),
                mongoClient.getUserById(ticket.assigned_user_id)
            ]);

            // 2. Fetch timeline
            const timeline = await db.collection('ticket_timelines')
                .find({ ticket_id: args.ticketId })
                .sort({ created_at: 1 })
                .toArray();

            // 3. Fetch sub-tasks (Note: subtasks link via ticket_task_id, but usually there's a middle-man. 
            // In some systems, ticket_task_id is effectively the ticket_id or there's a 1-1 relationship.
            // Let's try searching sub_tasks that might belong to this ticket.
            // For now, let's search if ANY subtask has this ticketId in a field, or if ticket_task_id matches the ticketId.
            const subTasks = await db.collection('ticket_sub_tasks')
                .find({ $or: [{ ticket_id: args.ticketId }, { ticket_task_id: args.ticketId }] })
                .toArray();

            const statusText = Number(ticket.status) === 3 ? 'COMPLETED' :
                Number(ticket.status) === 2 ? 'IN PROGRESS' :
                    Number(ticket.status) === 1 ? 'OPEN' : `STATUS ${ticket.status}`;

            let detailText = `### Ticket: ${ticket.subject}\n`;
            detailText += `- **ID:** \`${ticket._id}\`\n`;
            detailText += `- **Status:** ${statusText}\n`;
            detailText += `- **Type:** ${ticket.type}\n`;
            detailText += `- **Nature:** ${ticket.nature || 'N/A'}\n`;
            detailText += `- **Created By:** ${creator?.name || 'Unknown'} (${new Date(ticket.created_at).toLocaleString()})\n`;
            detailText += `- **Assigned To:** ${assigned?.name || 'Unassigned'}\n`;
            detailText += `- **Plan Date:** ${ticket.plan_date || 'N/A'}\n`;
            detailText += `\n**Description:**\n${ticket.detail || 'No description provided.'}\n`;

            if (subTasks.length > 0) {
                detailText += `\n### 📋 Sub-Tasks:\n`;
                subTasks.forEach((st: any) => {
                    detailText += `- [${st.is_complete ? 'x' : ' '}] ${st.name}\n`;
                });
            }

            if (timeline.length > 0) {
                detailText += `\n### 🕒 History (Timeline):\n`;
                for (const t of timeline) {
                    const fromUser = await mongoClient.getUserById(t.from);
                    const toUser = await mongoClient.getUserById(t.to);
                    detailText += `- [${new Date(t.created_at).toLocaleDateString()}] **${t.event}**: From ${fromUser?.name || 'System'} -> To ${toUser?.name || 'System'}\n`;
                }
            }

            return detailText;
        } catch (error) {
            return `Error fetching ticket details: ${error}`;
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
                        ticketId: { type: 'string', description: 'The unique ID of the ticket' }
                    },
                    required: ['ticketId']
                }
            }
        };
    }
}

/**
 * Tool for getting ticket statistics
 */
export class GetTicketCountsTool implements ITool {
    readonly name = 'get_ticket_counts';
    readonly description = 'Get a summary of ticket counts by status and type.';

    async execute(): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            const stats = await db.collection('tickets').aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]).toArray();

            const types = await db.collection('tickets').aggregate([
                { $group: { _id: "$type", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 5 }
            ]).toArray();

            let total = 0;
            const statusMap: any = { 1: 0, 2: 0, 3: 0, 0: 0 };

            stats.forEach((s: any) => {
                statusMap[s._id] = s.count;
                total += s.count;
            });

            let response = `### 📊 Ticket Statistics Overview:\n`;
            response += `- **Total Tickets:** ${total}\n`;
            response += `- **Open:** ${statusMap[1]}\n`;
            response += `- **In Progress:** ${statusMap[2]}\n`;
            response += `- **Completed:** ${statusMap[3]}\n`;

            if (statusMap[0] > 0) response += `- **Cancelled:** ${statusMap[0]}\n`;

            response += `\n### Top Categories:\n`;
            types.forEach((t: any) => {
                response += `- **${t._id}:** ${t.count}\n`;
            });

            return response;
        } catch (error) {
            return `Error fetching ticket statistics: ${error}`;
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
 * Tool for viewing scheduled/recurring tickets
 */
export class GetScheduledTicketsTool implements ITool {
    readonly name = 'get_scheduled_tickets';
    readonly description = 'List scheduled or recurring tickets (e.g., bi-weekly maintenance).';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            const scheduled = await db.collection('scheduled_tickets').find({
                status: 1
            }).limit(args?.limit || 10).toArray();

            if (!scheduled || scheduled.length === 0) return "No scheduled tickets found.";

            const results = [];
            for (const s of scheduled) {
                const user = await mongoClient.getUserById(s.user_id);
                results.push(`- **${s.subject}** (${s.type})\n  Owner: ${user?.name || 'System'} | Created: ${new Date(s.created_at).toLocaleDateString()}`);
            }

            return `### Scheduled Tickets:\n${results.join('\n')}`;
        } catch (error) {
            return `Error fetching scheduled tickets: ${error}`;
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
                        limit: { type: 'number', description: 'Result limit (default 10)' }
                    },
                    required: []
                }
            }
        };
    }
}

export const TICKET_MONGO_TOOLS = [
    new GetTicketsTool(),
    new GetTicketDetailsTool(),
    new GetTicketCountsTool(),
    new GetScheduledTicketsTool()
];
