import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';

/**
 * Report Link Generator Tool
 *
 * When the user asks for a report / export / Excel / PDF, the agent calls this
 * tool to build a download URL. The agent then presents the link in its reply.
 */
export class GenerateReportLinkTool implements ITool {
    readonly name = 'generate_report_link';
    readonly description =
        'Call this tool when the user asks to export, download, or generate a report ' +
        '(Excel / PDF / spreadsheet). Supports both "purchase" (default) and "ticket" modules. ' +
        'The tool returns a ready-to-use download URL and a pre-written reply for the user.';

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: {
                    type: 'object',
                    properties: {
                        format: {
                            type: 'string',
                            enum: ['excel', 'pdf'],
                            description: 'File format: "excel" (default) or "pdf".',
                        },
                        department: {
                            type: 'string',
                            description: 'Filter by department name (e.g. "IT_Department"). Leave empty for all departments.',
                        },
                        startDate: {
                            type: 'string',
                            description: 'Filter records created ON or AFTER this date. Format: YYYY-MM-DD.',
                        },
                        endDate: {
                            type: 'string',
                            description: 'Filter records created ON or BEFORE this date. Format: YYYY-MM-DD.',
                        },
                        category: {
                            type: 'string',
                            description: 'Filter by purchase category: "Local Purchase" or "Import Purchase".',
                        },
                        buy_by: {
                            type: 'string',
                            description: 'Filter by buying method: "purchaser" or "myself".',
                        },
                        complete: {
                            type: 'boolean',
                            description: 'true = only paid/completed requests. false = only pending/unpaid.',
                        },
                        limit: {
                            type: 'number',
                            description: 'Max number of rows to include (default 500, max 1000).',
                        },
                        title: {
                            type: 'string',
                            description: 'Custom report title shown in the file header.',
                        },
                        module: {
                            type: 'string',
                            enum: ['purchase', 'ticket', 'shop', 'car_booking', 'gatepass'],
                            description: 'Which module to report on: "purchase", "ticket", "shop", "car_booking", or "gatepass". Default is "purchase".',
                        },
                        status: {
                            type: 'string',
                            description: 'For Car: pending, approved. For Ticket: Status code. For Gatepass: Approved.',
                        },
                        driver_status: {
                            type: 'string',
                            description: 'For Car: ongoing, completed.',
                        },
                        rq_type: {
                            type: 'string',
                            description: 'For Gatepass: Personal Request, etc.',
                        },
                        lowStockOnly: {
                            type: 'boolean',
                            description: 'For Shop: true = only show items with low stock (<10).',
                        },
                        location: {
                            type: 'string',
                            description: 'For Shop: Filter by warehouse location.',
                        },
                        type: {
                            type: 'string',
                            description: 'For Shop/Ticket: Category or type of item.',
                        },
                    },
                    required: [],
                },
            },
        };
    }

    async execute(args?: {
        format?: string;
        department?: string;
        startDate?: string;
        endDate?: string;
        category?: string;
        buy_by?: string;
        complete?: boolean;
        limit?: number;
        title?: string;
        module?: string;
        status?: string | number;
        lowStockOnly?: boolean;
        location?: string;
        type?: string;
        driver_status?: string;
        rq_type?: string;
    }): Promise<string> {
        const format = args?.format === 'pdf' ? 'pdf' : 'excel';
        const module = args?.module || 'purchase';

        // Base URL — read from env or fall back to localhost
        const BASE_URL = (process.env.REPORT_BASE_URL || `http://localhost:${process.env.PORT || 8001}`).replace(/\/$/, '');

        // Build query string
        const params = new URLSearchParams();
        params.set('format', format);

        if (args?.department) params.set('department', args.department);
        if (args?.startDate) params.set('startDate', args.startDate);
        if (args?.endDate) params.set('endDate', args.endDate);
        if (args?.category) params.set('category', args.category);
        if (args?.buy_by) params.set('buy_by', args.buy_by);
        if (args?.limit) params.set('limit', String(args.limit));
        if (args?.title) params.set('title', args.title);
        if (args?.complete !== undefined) params.set('complete', String(args.complete));
        if (args?.status !== undefined) params.set('status', String(args.status));
        if (args?.lowStockOnly !== undefined) params.set('lowStockOnly', String(args.lowStockOnly));
        if (args?.location) params.set('location', args.location);
        if (args?.type) params.set('type', args.type);
        if (args?.driver_status) params.set('driver_status', args.driver_status);
        if (args?.rq_type) params.set('rq_type', args.rq_type);

        let endpoint = '/api/reports/purchase-requests';
        if (module === 'ticket') endpoint = '/api/reports/tickets';
        if (module === 'shop') endpoint = '/api/reports/shops';
        if (module === 'car_booking') endpoint = '/api/reports/car-bookings';
        if (module === 'gatepass') endpoint = '/api/reports/gatepass';

        const url = `${BASE_URL}${endpoint}?${params.toString()}`;

        // Build a human-friendly description
        const filterDescParts: string[] = [];
        if (args?.department) filterDescParts.push(`Dept: **${args.department}**`);
        if (args?.startDate) filterDescParts.push(`From: **${args.startDate}**`);
        if (args?.status) filterDescParts.push(`Status: **${args.status}**`);
        if (args?.driver_status) filterDescParts.push(`Driver: **${args.driver_status}**`);
        if (args?.rq_type) filterDescParts.push(`Type: **${args.rq_type}**`);

        const moduleLabels: Record<string, string> = {
            'gatepass': 'Gatepass Audit',
            'car_booking': 'Car Bookings',
            'shop': 'Shop Inventory',
            'ticket': 'Tickets',
            'purchase': 'Purchase Requests'
        };
        const moduleLabel = moduleLabels[module] || 'Report';
        const filterDesc = filterDescParts.length > 0 ? filterDescParts.join(' | ') : `All ${moduleLabel}`;

        const ext = format === 'pdf' ? 'PDF' : 'Excel';
        const icon = format === 'pdf' ? '📄' : '📊';

        return JSON.stringify({
            status: 'ready',
            format: ext,
            download_url: url,
            filter_summary: filterDesc,
            message_template:
                `${icon} Your **${ext} ${moduleLabel} report** is ready!\n\n` +
                `**Filters:** ${filterDesc}\n\n` +
                `👉 [**Click here to download the ${ext} report**](${url})\n\n` +
                `The file will download automatically.`,
        });
    }
}

export const REPORT_TOOLS: ITool[] = [
    new GenerateReportLinkTool(),
];
