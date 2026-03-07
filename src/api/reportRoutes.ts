import { Router, Request, Response } from 'express';
import {
    generateExcelReport,
    generatePDFReport,
    ReportFilter,
} from '../reports/PurchaseRequestReport.js';
import {
    generateTicketExcelReport,
    generateTicketPDFReport,
    TicketReportFilter,
} from '../reports/TicketReport.js';
import {
    generateShopExcelReport,
    generateShopPDFReport,
    ShopReportFilter,
} from '../reports/ShopReport.js';
import {
    generateCarBookingExcelReport,
    generateCarBookingPDFReport,
    CarBookingReportFilter,
} from '../reports/CarBookingReport.js';
import {
    generateGatePassExcelReport,
    generateGatePassPDFReport,
    GatePassReportFilter,
} from '../reports/GatePassReport.js';

/**
 * Mount all /api/reports routes
 */
export function createReportRoutes(): Router {
    const router = Router();

    /**
     * GET /api/reports/purchase-requests
     */
    router.get('/api/reports/purchase-requests', async (req: Request, res: Response) => {
        try {
            const format = (req.query.format as string)?.toLowerCase() ?? 'excel';

            if (format !== 'excel' && format !== 'pdf') {
                return res.status(400).json({ error: 'format must be "excel" or "pdf"' });
            }

            // Build filter from query params
            const filters: ReportFilter = {};
            if (req.query.department) filters.department = req.query.department as string;
            if (req.query.startDate) filters.startDate = req.query.startDate as string;
            if (req.query.endDate) filters.endDate = req.query.endDate as string;
            if (req.query.category) filters.category = req.query.category as string;
            if (req.query.buy_by) filters.buy_by = req.query.buy_by as string;
            if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);
            if (req.query.complete !== undefined) {
                filters.complete = req.query.complete === 'true';
            }

            // Build title and filename
            const now = new Date();
            const todayStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');

            let dateTag = todayStr;
            if (filters.startDate && filters.endDate) {
                dateTag = `${filters.startDate} to ${filters.endDate}`;
            } else if (filters.startDate) {
                dateTag = `From ${filters.startDate}`;
            } else if (filters.endDate) {
                dateTag = `Until ${filters.endDate}`;
            }

            const deptTag = filters.department ? ` - ${filters.department}` : '';
            const title = (req.query.title as string)
                ?? `Purchase Request Report${deptTag} (${dateTag})`;

            const fileStamp = dateTag.replace(/ /g, '_').replace(/\//g, '-');

            console.log(`📊 Generating ${format.toUpperCase()} report: ${title}`);

            if (format === 'excel') {
                const buffer = await generateExcelReport({ format: 'excel', title, filters });

                const filename = `Purchase_Request_Report_${fileStamp}.xlsx`;
                res.setHeader('Content-Type',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Length', buffer.length);
                return res.send(buffer);

            } else {
                const buffer = await generatePDFReport({ format: 'pdf', title, filters });

                const filename = `Purchase_Request_Report_${fileStamp}.pdf`;
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
                res.setHeader('Content-Length', buffer.length);
                return res.send(buffer);
            }

        } catch (err: any) {
            console.error('❌ Report generation error:', err);
            return res.status(500).json({
                error: 'Failed to generate report',
                detail: err.message
            });
        }
    });

    /**
     * GET /api/reports/tickets
     * Ticket export
     */
    router.get('/api/reports/tickets', async (req: Request, res: Response) => {
        try {
            const format = (req.query.format as string)?.toLowerCase() ?? 'excel';

            const filters: TicketReportFilter = {};
            if (req.query.status) filters.status = parseInt(req.query.status as string, 10);
            if (req.query.type) filters.type = req.query.type as string;
            if (req.query.nature) filters.nature = req.query.nature as string;
            if (req.query.startDate) filters.startDate = req.query.startDate as string;
            if (req.query.endDate) filters.endDate = req.query.endDate as string;
            if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);

            const now = new Date();
            const todayStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
            const title = (req.query.title as string) ?? `Ticket Report (${todayStr})`;

            if (format === 'excel') {
                const buffer = await generateTicketExcelReport({ format: 'excel', title, filters });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="Ticket_Report_${todayStr}.xlsx"`);
                return res.send(buffer);
            } else {
                const buffer = await generateTicketPDFReport({ format: 'pdf', title, filters });
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Ticket_Report_${todayStr}.pdf"`);
                return res.send(buffer);
            }
        } catch (err: any) {
            console.error('❌ Ticket report error:', err);
            return res.status(500).json({ error: 'Failed to generate ticket report', detail: err.message });
        }
    });

    /**
     * GET /api/reports/shops
     * Shop inventory export
     */
    router.get('/api/reports/shops', async (req: Request, res: Response) => {
        try {
            const format = (req.query.format as string)?.toLowerCase() ?? 'excel';
            const filters: ShopReportFilter = {};

            if (req.query.type) filters.type = req.query.type as string;
            if (req.query.location) filters.location = req.query.location as string;
            if (req.query.lowStockOnly !== undefined) filters.lowStockOnly = req.query.lowStockOnly === 'true';
            if (req.query.startDate) filters.startDate = req.query.startDate as string;
            if (req.query.endDate) filters.endDate = req.query.endDate as string;
            if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);

            const now = new Date();
            const todayStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
            const title = (req.query.title as string) ?? `Shop Inventory Report (${todayStr})`;

            if (format === 'excel') {
                const buffer = await generateShopExcelReport({ format: 'excel', title, filters });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="Shop_Inventory_${todayStr}.xlsx"`);
                return res.send(buffer);
            } else {
                const buffer = await generateShopPDFReport({ format: 'pdf', title, filters });
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Shop_Inventory_${todayStr}.pdf"`);
                return res.send(buffer);
            }
        } catch (err: any) {
            console.error('❌ Shop report error:', err);
            return res.status(500).json({ error: 'Failed to generate shop report', detail: err.message });
        }
    });

    /**
     * GET /api/reports/car-bookings
     * Car booking export
     */
    router.get('/api/reports/car-bookings', async (req: Request, res: Response) => {
        try {
            const format = (req.query.format as string)?.toLowerCase() ?? 'excel';
            const filters: CarBookingReportFilter = {};

            if (req.query.status) filters.status = req.query.status as string;
            if (req.query.driver_status) filters.driver_status = req.query.driver_status as string;
            if (req.query.startDate) filters.startDate = req.query.startDate as string;
            if (req.query.endDate) filters.endDate = req.query.endDate as string;
            if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);

            const now = new Date();
            const todayStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
            const title = (req.query.title as string) ?? `Car Booking Report (${todayStr})`;

            if (format === 'excel') {
                const buffer = await generateCarBookingExcelReport({ format: 'excel', title, filters });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="Car_Booking_${todayStr}.xlsx"`);
                return res.send(buffer);
            } else {
                const buffer = await generateCarBookingPDFReport({ format: 'pdf', title, filters });
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Car_Booking_${todayStr}.pdf"`);
                return res.send(buffer);
            }
        } catch (err: any) {
            console.error('❌ Car booking report error:', err);
            return res.status(500).json({ error: 'Failed to generate car booking report', detail: err.message });
        }
    });

    /**
     * GET /api/reports/gatepass
     * Gatepass audit export
     */
    router.get('/api/reports/gatepass', async (req: Request, res: Response) => {
        try {
            const format = (req.query.format as string)?.toLowerCase() ?? 'excel';
            const filters: GatePassReportFilter = {};

            if (req.query.status) filters.status = req.query.status as string;
            if (req.query.rq_type) filters.rq_type = req.query.rq_type as string; // pass type
            if (req.query.department) filters.department = req.query.department as string;
            if (req.query.startDate) filters.startDate = req.query.startDate as string;
            if (req.query.endDate) filters.endDate = req.query.endDate as string;
            if (req.query.limit) filters.limit = parseInt(req.query.limit as string, 10);

            const now = new Date();
            const todayStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
            const title = (req.query.title as string) ?? `Gatepass Audit Report (${todayStr})`;

            if (format === 'excel') {
                const buffer = await generateGatePassExcelReport({ format: 'excel', title, filters });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="Gatepass_Audit_${todayStr}.xlsx"`);
                return res.send(buffer);
            } else {
                const buffer = await generateGatePassPDFReport({ format: 'pdf', title, filters });
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="Gatepass_Audit_${todayStr}.pdf"`);
                return res.send(buffer);
            }
        } catch (err: any) {
            console.error('❌ Gatepass report error:', err);
            return res.status(500).json({ error: 'Failed to generate gatepass report', detail: err.message });
        }
    });

    /**
     * GET /api/reports
     * List available reports
     */
    router.get('/api/reports', (_req: Request, res: Response) => {
        res.json({
            available_reports: [
                {
                    name: 'Purchase Request Report',
                    endpoint: '/api/reports/purchase-requests',
                    method: 'GET',
                    formats: ['excel', 'pdf'],
                    description: 'Export all or filtered purchase requests.'
                },
                {
                    name: 'Ticket Report',
                    endpoint: '/api/reports/tickets',
                    method: 'GET',
                    formats: ['excel', 'pdf'],
                    description: 'Export all or filtered support tickets.',
                    parameters: {
                        format: 'excel | pdf',
                        status: '0: Requested, 1: Received, 2: In Progress, 3: Completed, 4: Rejected',
                        type: 'e.g. CSR_Main, GA_Main',
                        nature: 'Nature search',
                        startDate: 'YYYY-MM-DD',
                        endDate: 'YYYY-MM-DD'
                    }
                },
                {
                    name: 'Shop Inventory Report',
                    endpoint: '/api/reports/shops',
                    method: 'GET',
                    formats: ['excel', 'pdf'],
                    description: 'Export current shop inventory status.',
                    parameters: {
                        format: 'excel | pdf',
                        type: 'e.g. office, it, maintenance',
                        location: 'e.g. A1, Section B',
                        lowStockOnly: 'true | false',
                        limit: 'Max rows'
                    }
                },
                {
                    name: 'Car Booking Report',
                    endpoint: '/api/reports/car-bookings',
                    method: 'GET',
                    formats: ['excel', 'pdf'],
                    description: 'Export car booking history and status.',
                    parameters: {
                        format: 'excel | pdf',
                        status: 'pending | approved | rejected',
                        driver_status: 'ongoing | completed | canceled',
                        startDate: 'YYYY-MM-DD',
                        endDate: 'YYYY-MM-DD'
                    }
                },
                {
                    name: 'Gate Pass Audit Report',
                    endpoint: '/api/reports/gatepass',
                    method: 'GET',
                    formats: ['excel', 'pdf'],
                    description: 'Export gate pass exit/arrival records.',
                    parameters: {
                        format: 'excel | pdf',
                        status: 'Approved | Pending | Rejected',
                        rq_type: 'e.g. Personal Request',
                        department: 'Department filter',
                        startDate: 'YYYY-MM-DD',
                        endDate: 'YYYY-MM-DD'
                    }
                }
            ]
        });
    });

    return router;
}
