import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { getMongoClient } from '../infrastructure/database/MongoDBClient.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TicketReportFilter {
    status?: number;
    type?: string;
    nature?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
}

export interface TicketReportOptions {
    format: 'excel' | 'pdf';
    title?: string;
    filters?: TicketReportFilter;
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchTickets(filters: TicketReportFilter = {}): Promise<any[]> {
    const mongoClient = getMongoClient();
    await mongoClient.connect();
    const db = mongoClient.getDb();
    const collection = db.collection('tickets');

    const match: any = {};
    if (filters.status !== undefined) match.status = Number(filters.status);
    if (filters.type) match.type = filters.type;
    if (filters.nature) match.nature = { $regex: filters.nature, $options: 'i' };

    if (filters.startDate || filters.endDate) {
        match.created_at = {};
        if (filters.startDate) match.created_at.$gte = new Date(filters.startDate);
        if (filters.endDate) match.created_at.$lte = new Date(filters.endDate);
    }

    const limit = Math.min(filters.limit ?? 500, 1000);

    const pipeline: any[] = [
        { $match: match },
        // Convert string IDs to ObjectIds for lookup
        {
            $addFields: {
                creator_oid: {
                    $cond: [
                        { $and: [{ $ne: ["$user_id", null] }, { $eq: [{ $strLenCP: { $ifNull: ["$user_id", ""] } }, 24] }] },
                        { $toObjectId: "$user_id" },
                        null
                    ]
                },
                assigned_oid: {
                    $cond: [
                        { $and: [{ $ne: ["$assigned_user_id", null] }, { $eq: [{ $strLenCP: { $ifNull: ["$assigned_user_id", ""] } }, 24] }] },
                        { $toObjectId: "$assigned_user_id" },
                        null
                    ]
                }
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'creator_oid',
                foreignField: '_id',
                as: 'creator_data'
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'assigned_oid',
                foreignField: '_id',
                as: 'assigned_data'
            }
        },
        {
            $addFields: {
                creator_name: { $ifNull: [{ $arrayElemAt: ['$creator_data.name', 0] }, 'N/A'] },
                assigned_name: { $ifNull: [{ $arrayElemAt: ['$assigned_data.name', 0] }, 'Unassigned'] }
            }
        },
        { $sort: { created_at: -1 } },
        { $limit: limit }
    ];

    return await collection.aggregate(pipeline).toArray();
}

// ─── Helper: Status Converter ─────────────────────────────────────────────────

function getStatusLabel(status: any): string {
    const s = Number(status);
    switch (s) {
        case 0: return 'REQUESTED';
        case 1: return 'RECEIVED';
        case 2: return 'IN PROGRESS';
        case 3: return 'COMPLETED';
        case 4: return 'REJECTED';
        default: return 'REQUESTED';
    }
}

// ─── EXCEL Generator ──────────────────────────────────────────────────────────

export async function generateTicketExcelReport(options: TicketReportOptions): Promise<Buffer> {
    const tickets = await fetchTickets(options.filters ?? {});
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Tickets');

    const COLORS = {
        primary: 'FF1F4E78',
        secondary: 'FFEBF1DE',
        headerText: 'FFFFFFFF',
        border: 'FFD9D9D9',
        accent: 'FF2E75B6',
    };

    // Header
    ws.mergeCells('A1:I1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'YORKMARS (CAMBODIA) CO., LTD.';
    titleCell.font = { bold: true, size: 16, color: { argb: COLORS.headerText } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
    ws.getRow(1).height = 40;

    ws.mergeCells('A2:I2');
    const subHeader = ws.getCell('A2');
    subHeader.value = (options.title || 'TICKET REPORT').toUpperCase();
    subHeader.font = { bold: true, size: 11, color: { argb: 'FF444444' } };
    subHeader.alignment = { horizontal: 'center' };
    ws.getRow(2).height = 20;

    ws.mergeCells('A3:I3');
    const timeCell = ws.getCell('A3');
    timeCell.value = `Exported on: ${new Date().toLocaleString('en-GB')}`;
    timeCell.font = { italic: true, size: 8, color: { argb: 'FF888888' } };
    timeCell.alignment = { horizontal: 'right' };

    // Column Headers
    const COL_WIDTHS = [6, 35, 12, 12, 18, 18, 14, 14, 12];
    ws.columns = COL_WIDTHS.map(w => ({ width: w }));

    const HEADERS = ['NO', 'SUBJECT / DETAIL', 'STATUS', 'TYPE', 'REQUESTOR', 'ASSIGNED TO', 'PLAN DATE', 'COMPLETED DATE', 'DATE'];
    const headRow = ws.getRow(4);
    HEADERS.forEach((h, i) => {
        const cell = headRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 9, color: { argb: COLORS.headerText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.accent } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Content
    tickets.forEach((t, i) => {
        const row = ws.getRow(i + 5);
        const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

        const values = [
            i + 1,
            t.subject || 'N/A',
            getStatusLabel(t.status),
            t.type || 'N/A',
            t.creator_name,
            t.assigned_name,
            fmtDate(t.plan_date),
            Number(t.status) === 3 ? fmtDate(t.updated_at) : '-',
            fmtDate(t.created_at)
        ];

        values.forEach((v, idx) => {
            const cell = row.getCell(idx + 1);
            cell.value = v;
            cell.font = { size: 9 };
            cell.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };

            if (idx === 2) { // Status coloring
                const s = Number(t.status);
                let color = 'FF444444';
                if (s === 0) color = 'FF888888'; // Gray (Requested)
                if (s === 1) color = 'FF0000FF'; // Blue (Received)
                if (s === 2) color = 'FFFF8C00'; // Orange (Process)
                if (s === 3) color = 'FF008000'; // Green (Completed)
                if (s === 4) color = 'FFCC0000'; // Red (Rejected)
                cell.font = { bold: true, color: { argb: color } };
            }
        });
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

export async function generateTicketPDFReport(options: TicketReportOptions): Promise<Buffer> {
    const tickets = await fetchTickets(options.filters ?? {});
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 25, size: 'A4', layout: 'landscape' });
            const chunks: Buffer[] = [];
            doc.on('data', (c: Buffer) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            // Fonts logic (same as PR report for consistency)
            const windir = process.env.WINDIR || 'C:\\Windows';
            const FONT_KHMER = path.join(windir, 'Fonts', 'LeelawUI.ttf');
            const FONT_UNI = path.join(windir, 'Fonts', 'simsun.ttc');
            const hasKhmer = fs.existsSync(FONT_KHMER);
            const hasUni = fs.existsSync(FONT_UNI);

            if (hasKhmer) { try { doc.registerFont('KhmerFont', FONT_KHMER); } catch (_) { } }
            if (hasUni) { try { doc.registerFont('UniFont', FONT_UNI, 'SimSun'); } catch (_) { } }

            const C = {
                primary: '#1F4E78', accent: '#2E75B6', light: '#EBF3FB',
                success: '#27AE60', danger: '#C0392B', warn: '#E67E22', info: '#3498DB',
                text: '#2C2C2C', muted: '#777777', border: '#CCCCCC'
            };

            const PW = doc.page.width;
            const PH = doc.page.height;

            // Text Helper
            const T = (text: any, x: number, y: number, opt: any = {}) => {
                const s = String(text ?? '');
                if (!s) return;
                const isUnicode = /[^\u0000-\u007F]/.test(s);
                const isKhmer = /[\u1780-\u17FF]/.test(s);
                const isChinese = /[\u4E00-\u9FFF]/.test(s);

                let font = opt.font || 'Helvetica';
                if (isKhmer && hasKhmer) font = 'KhmerFont';
                else if (isChinese && hasUni) font = 'UniFont';
                else if (isUnicode && hasUni) font = 'UniFont';

                doc.save();
                doc.font(font).fontSize(opt.size || 8).fillColor(opt.color || C.text);
                const textOpts = { width: opt.width, align: opt.align, lineBreak: !!opt.width };
                doc.text(s, x, y, textOpts);
                doc.restore();
            };

            // ── Height Helper: accurately measure text height ──────────────────
            const getH = (text: any, width: number, size: number = 7.5) => {
                const s = String(text ?? '');
                if (!s || !width) return 0;
                const isUnicode = /[^\u0000-\u007F]/.test(s);
                const isKhmer = /[\u1780-\u17FF]/.test(s);
                const isChinese = /[\u4E00-\u9FFF]/.test(s);
                let font = 'Helvetica';
                if (isKhmer && hasKhmer) font = 'KhmerFont';
                else if (isChinese && hasUni) font = 'UniFont';
                else if (isUnicode && hasUni) font = 'UniFont';
                return doc.font(font).fontSize(size).heightOfString(s, { width, lineBreak: true });
            };

            // draw Header
            const drawFrame = () => {
                doc.rect(0, 0, PW, 60).fill(C.primary);
                T('YORKMARS (CAMBODIA) CO., LTD.', 0, 15, { size: 16, font: 'Helvetica-Bold', color: 'white', align: 'center', width: PW });
                T((options.title || 'TICKET AUDIT REPORT').toUpperCase(), 0, 38, { size: 9, color: 'white', align: 'center', width: PW });
            };

            const ensureSafeSpace = (needed: number) => {
                if (y + needed > PH - 40) {
                    doc.addPage();
                    drawFrame();
                    y = 80;
                    doc.rect(25, y, PW - 50, 18).fill(C.accent);
                    COLS.forEach(c => T(c.l, c.x, y + 5, { size: 7, font: 'Helvetica-Bold', color: 'white' }));
                    y += 22;
                }
            };

            drawFrame();

            let y = 80;

            // Table Headers
            doc.rect(25, y, PW - 50, 18).fill(C.accent);
            const COLS = [
                { l: 'NO', x: 28, w: 22 },
                { l: 'SUBJECT / DETAILS', x: 52, w: 200 },
                { l: 'STATUS', x: 255, w: 70 },
                { l: 'TYPE', x: 330, w: 60 },
                { l: 'REQUESTOR', x: 395, w: 85 },
                { l: 'ASSIGNED TO', x: 485, w: 85 },
                { l: 'PLAN DATE', x: 575, w: 80 },
                { l: 'FINISHED ON', x: 660, w: 80 },
                { l: 'CREATION', x: 745, w: 70 }
            ];

            COLS.forEach(c => T(c.l, c.x, y + 5, { size: 7, font: 'Helvetica-Bold', color: 'white' }));
            y += 22;

            tickets.forEach((t, i) => {
                const subjText = (t.subject || 'N/A').toUpperCase();
                const natureText = t.nature || '';

                // Measure total required height for this specific row
                const hSubj = getH(subjText, COLS[1].w, 8);
                const hNature = natureText ? getH(natureText, COLS[1].w, 6.5) : 0;
                const rowH = Math.max(hSubj + hNature + 10, 28); // Min height of 28

                ensureSafeSpace(rowH + 10);

                if (i % 2 === 1) doc.rect(25, y, PW - 50, rowH).fill('#F9FAFB');

                const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

                T(i + 1, COLS[0].x, y + (rowH / 2 - 4), { size: 7 });

                // Subject + Nature (Vertical Stack)
                T(subjText, COLS[1].x, y + 4, { size: 8, font: 'Helvetica-Bold', width: COLS[1].w });
                if (natureText) {
                    T(natureText, COLS[1].x, y + hSubj + 4, { size: 6.5, color: C.muted, width: COLS[1].w });
                }

                // Status Badge
                const s = Number(t.status);
                let sCol = '#95A5A6';
                if (s === 0) sCol = '#7F8C8D';
                if (s === 1) sCol = C.info;
                if (s === 2) sCol = C.warn;
                if (s === 3) sCol = C.success;
                if (s === 4) sCol = C.danger;

                doc.save();
                doc.roundedRect(COLS[2].x, y + (rowH / 2 - 6), 68, 12, 2).fill(sCol);
                doc.restore();
                T(getStatusLabel(t.status), COLS[2].x, y + (rowH / 2 - 3.5), { size: 5.5, font: 'Helvetica-Bold', color: 'white', width: 68, align: 'center' });

                T(t.type || '-', COLS[3].x, y + (rowH / 2 - 4), { size: 7 });
                T(t.creator_name, COLS[4].x, y + (rowH / 2 - 4), { size: 7, width: COLS[4].w });
                T(t.assigned_name, COLS[5].x, y + (rowH / 2 - 4), { size: 7, width: COLS[5].w });
                T(fmtDate(t.plan_date), COLS[6].x, y + (rowH / 2 - 4), { size: 7 });
                T(s === 3 ? fmtDate(t.updated_at) : '-', COLS[7].x, y + (rowH / 2 - 4), { size: 7, color: s === 3 ? C.success : C.text });
                T(fmtDate(t.created_at), COLS[8].x, y + (rowH / 2 - 4), { size: 7 });

                y += rowH;
                doc.moveTo(25, y).lineTo(PW - 25, y).strokeColor('#EEEEEE').lineWidth(0.5).stroke();
            });

            doc.end();
        } catch (err) { reject(err); }
    });
}
