import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { getMongoClient } from '../infrastructure/database/MongoDBClient.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GatePassReportFilter {
    status?: string; // Approved, Pending, etc.
    rq_type?: string; // Personal Request, etc.
    department?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
}

export interface GatePassReportOptions {
    format: 'excel' | 'pdf';
    title?: string;
    filters?: GatePassReportFilter;
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchGatePasses(filters: GatePassReportFilter = {}): Promise<any[]> {
    const mongoClient = getMongoClient();
    await mongoClient.connect();
    const db = mongoClient.getDb();
    const collection = db.collection('requests');

    const match: any = {
        rq_type: { $exists: true } // Ensure it's a gatepass/request record
    };

    if (filters.status) match.status = { $regex: filters.status, $options: 'i' };
    if (filters.rq_type) match.rq_type = { $regex: filters.rq_type, $options: 'i' };
    if (filters.department) match.dept_name = { $regex: filters.department, $options: 'i' };

    if (filters.startDate || filters.endDate) {
        match.created_at = {};
        if (filters.startDate) match.created_at.$gte = new Date(filters.startDate);
        if (filters.endDate) match.created_at.$lte = new Date(filters.endDate);
    }

    const limit = Math.min(filters.limit ?? 500, 1000);

    return await collection.find(match).sort({ created_at: -1 }).limit(limit).toArray();
}

// ─── EXCEL Generator ──────────────────────────────────────────────────────────

export async function generateGatePassExcelReport(options: GatePassReportOptions): Promise<Buffer> {
    const data = await fetchGatePasses(options.filters ?? {});
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Gate Pass Records');

    const COLORS = {
        primary: 'FF1F4E78',
        headerText: 'FFFFFFFF',
        border: 'FFD9D9D9',
        accent: 'FF2E75B6',
        success: 'FF27AE60',
        danger: 'FFC0392B'
    };

    ws.mergeCells('A1:I1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'YORKMARS (CAMBODIA) CO., LTD.';
    titleCell.font = { bold: true, size: 16, color: { argb: COLORS.headerText } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };

    ws.mergeCells('A2:I2');
    const subHeader = ws.getCell('A2');
    subHeader.value = (options.title || 'GATE PASS AUDIT REPORT').toUpperCase();
    subHeader.font = { bold: true, size: 11 };
    subHeader.alignment = { horizontal: 'center' };

    const COL_WIDTHS = [6, 12, 20, 15, 20, 25, 12, 12, 15];
    ws.columns = COL_WIDTHS.map(w => ({ width: w }));

    const HEADERS = ['NO', 'EMP ID', 'NAME', 'DEPT', 'TYPE', 'REASON', 'DEPARTURE', 'ARRIVAL', 'STATUS'];
    const headRow = ws.getRow(4);
    HEADERS.forEach((h, i) => {
        const cell = headRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 9, color: { argb: COLORS.headerText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.accent } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    data.forEach((row, i) => {
        const excelRow = ws.getRow(i + 5);
        const values = [
            i + 1,
            row.emp_id || '-',
            row.eng_name || '-',
            row.dept_name || '-',
            row.rq_type || '-',
            row.rq_reason || '-',
            row.departure_time || '-',
            row.arrival_time || '-',
            (row.status || 'Pending').toUpperCase()
        ];

        values.forEach((v, idx) => {
            const cell = excelRow.getCell(idx + 1);
            cell.value = v;
            cell.font = { size: 9 };
            cell.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };

            if (idx === 8) { // Status
                const s = String(v).toUpperCase();
                if (s === 'APPROVED') cell.font = { bold: true, color: { argb: COLORS.success } };
                if (s === 'REJECTED') cell.font = { bold: true, color: { argb: COLORS.danger } };
            }
        });
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

export async function generateGatePassPDFReport(options: GatePassReportOptions): Promise<Buffer> {
    const data = await fetchGatePasses(options.filters ?? {});
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 25, size: 'A4', layout: 'landscape' });
            const chunks: Buffer[] = [];
            doc.on('data', (c: Buffer) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            const windir = process.env.WINDIR || 'C:\\Windows';
            const FONT_KHMER = path.join(windir, 'Fonts', 'LeelawUI.ttf');
            const hasKhmer = fs.existsSync(FONT_KHMER);
            if (hasKhmer) doc.registerFont('KhmerFont', FONT_KHMER);

            const C = { primary: '#1F4E78', accent: '#2E75B6', text: '#2C2C2C', success: '#27AE60', danger: '#C0392B' };
            const PW = doc.page.width;
            const PH = doc.page.height;

            const T = (text: any, x: number, y: number, opt: any = {}) => {
                const s = String(text ?? '');
                const isKhmer = /[\u1780-\u17FF]/.test(s);
                doc.save();
                doc.font(isKhmer && hasKhmer ? 'KhmerFont' : (opt.font || 'Helvetica')).fontSize(opt.size || 8).fillColor(opt.color || C.text);
                doc.text(s, x, y, { width: opt.width, align: opt.align });
                doc.restore();
            };

            const drawFrame = () => {
                doc.rect(0, 0, PW, 60).fill(C.primary);
                T('YORKMARS (CAMBODIA) CO., LTD.', 0, 15, { size: 16, font: 'Helvetica-Bold', color: 'white', align: 'center', width: PW });
                T((options.title || 'GATE PASS AUDIT REPORT').toUpperCase(), 0, 38, { size: 9, color: 'white', align: 'center', width: PW });
            };

            const COLS = [
                { l: 'NO', x: 28, w: 25 },
                { l: 'NAME', x: 55, w: 120 },
                { l: 'EMP ID', x: 180, w: 50 },
                { l: 'DEPARTMENT', x: 235, w: 90 },
                { l: 'PASS TYPE', x: 330, w: 90 },
                { l: 'REASON FOR EXIT', x: 425, w: 180 },
                { l: 'TIME (OUT-IN)', x: 610, w: 110 },
                { l: 'STATUS', x: 725, w: 85 }
            ];

            const drawHeaderRow = (posY: number) => {
                doc.rect(25, posY, PW - 50, 18).fill(C.accent);
                COLS.forEach(c => T(c.l, c.x, posY + 5, { size: 7, font: 'Helvetica-Bold', color: 'white' }));
            };

            drawFrame();
            let y = 80;
            drawHeaderRow(y);
            y += 22;

            data.forEach((p, i) => {
                const rowH = 28;
                if (y + rowH > PH - 40) { doc.addPage(); drawFrame(); y = 80; drawHeaderRow(y); y += 22; }
                if (i % 2 === 1) doc.rect(25, y, PW - 50, rowH).fill('#F9FAFB');

                T(i + 1, COLS[0].x, y + 10, { size: 7.5 });
                T(p.eng_name, COLS[1].x, y + 10, { size: 7.5 });
                T(p.emp_id, COLS[2].x, y + 10, { size: 7.5 });
                T(p.dept_name, COLS[3].x, y + 10, { size: 7 });
                T(p.rq_type, COLS[4].x, y + 10, { size: 7 });
                T(p.rq_reason, COLS[5].x, y + 9, { size: 6.5, width: COLS[5].w });

                const timeStr = `${p.departure_time || '-'} -> ${p.arrival_time || '-'}`;
                T(timeStr, COLS[6].x, y + 10, { size: 7.5 });

                const s = (p.status || 'Pending').toUpperCase();
                let sCol = '#95A5A6';
                if (s === 'APPROVED') sCol = C.success;
                if (s === 'REJECTED') sCol = C.danger;

                doc.save(); doc.roundedRect(COLS[7].x, y + 8, 80, 12, 2).fill(sCol); doc.restore();
                T(s, COLS[7].x, y + 10.5, { size: 5.5, font: 'Helvetica-Bold', color: 'white', width: 80, align: 'center' });

                y += rowH;
                doc.moveTo(25, y).lineTo(PW - 25, y).strokeColor('#EEEEEE').lineWidth(0.5).stroke();
            });

            doc.end();
        } catch (err) { reject(err); }
    });
}
