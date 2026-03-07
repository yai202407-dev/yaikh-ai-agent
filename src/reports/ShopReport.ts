import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { getMongoClient } from '../infrastructure/database/MongoDBClient.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ShopReportFilter {
    type?: string;
    location?: string;
    lowStockOnly?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
}

export interface ShopReportOptions {
    format: 'excel' | 'pdf';
    title?: string;
    filters?: ShopReportFilter;
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchShops(filters: ShopReportFilter = {}): Promise<any[]> {
    const mongoClient = getMongoClient();
    await mongoClient.connect();
    const db = mongoClient.getDb();
    const collection = db.collection('shops');

    const match: any = {};
    if (filters.type) match.type = filters.type;
    if (filters.location) match.location = { $regex: filters.location, $options: 'i' };

    match.status = { $ne: 0 };

    if (filters.lowStockOnly) {
        match.amount = { $lt: 10 };
    }

    if (filters.startDate || filters.endDate) {
        match.created_at = {};
        if (filters.startDate) match.created_at.$gte = new Date(filters.startDate);
        if (filters.endDate) match.created_at.$lte = new Date(filters.endDate);
    }

    const limit = Math.min(filters.limit ?? 500, 1000);

    const pipeline: any[] = [
        { $match: match },
        { $addFields: { id_str: { $toString: '$_id' } } },
        {
            $lookup: {
                from: 'item_suppliers',
                let: { itemId: '$id_str' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$item_id', '$$itemId'] } } },
                    { $sort: { updated_at: -1 } },
                    { $limit: 1 }
                ],
                as: 'supplier_link'
            }
        },
        { $unwind: { path: '$supplier_link', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'suppliers',
                let: { supplierId: '$supplier_link.supplier_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    '$_id',
                                    { $cond: [{ $eq: [{ $strLenCP: { $ifNull: ['$$supplierId', ''] } }, 24] }, { $toObjectId: '$$supplierId' }, '$$supplierId'] }
                                ]
                            }
                        }
                    }
                ],
                as: 'supplier_info'
            }
        },
        { $unwind: { path: '$supplier_info', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'shop_add_stocks',
                let: { itemId: '$id_str' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$inventory_id', '$$itemId'] } } },
                    { $sort: { created_at: -1 } },
                    { $limit: 1 }
                ],
                as: 'last_restock'
            }
        },
        { $unwind: { path: '$last_restock', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1, type: 1, subject: 1, unit: 1, amount: 1, location: 1,
                supplier_name: { $ifNull: ['$supplier_info.en_name', '$supplier_name'] },
                unit_price: { $ifNull: ['$supplier_link.price', '$unit_price'] },
                currency: { $ifNull: ['$supplier_link.currency', 'USD'] },
                last_restock_date: '$last_restock.created_at',
                status: 1
            }
        },
        { $sort: { amount: 1, subject: 1 } },
        { $limit: limit }
    ];

    return await collection.aggregate(pipeline).toArray();
}

// ─── EXCEL Generator ──────────────────────────────────────────────────────────

export async function generateShopExcelReport(options: ShopReportOptions): Promise<Buffer> {
    const items = await fetchShops(options.filters ?? {});
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Shop Inventory');

    const COLORS = {
        primary: 'FF1F4E78',
        secondary: 'FFEBF1DE',
        headerText: 'FFFFFFFF',
        border: 'FFD9D9D9',
        accent: 'FF2E75B6',
        warning: 'FFFFC000',
        danger: 'FFFF0000',
        success: 'FF00B050'
    };

    ws.mergeCells('A1:I1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'YORKMARS (CAMBODIA) CO., LTD.';
    titleCell.font = { bold: true, size: 16, color: { argb: COLORS.headerText } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };

    ws.mergeCells('A2:I2');
    const subHeader = ws.getCell('A2');
    subHeader.value = (options.title || 'SHOP INVENTORY REPORT').toUpperCase();
    subHeader.font = { bold: true, size: 11, color: { argb: 'FF444444' } };
    subHeader.alignment = { horizontal: 'center' };

    const COL_WIDTHS = [6, 35, 12, 10, 8, 15, 20, 15, 12];
    ws.columns = COL_WIDTHS.map(w => ({ width: w }));

    const HEADERS = ['NO', 'ITEM NAME', 'CATEGORY', 'QTY', 'UNIT', 'LOCATION', 'SUPPLIER', 'LAST RESTOCK', 'STATUS'];
    const headRow = ws.getRow(4);
    HEADERS.forEach((h, i) => {
        const cell = headRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 9, color: { argb: COLORS.headerText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.accent } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    items.forEach((item, i) => {
        const row = ws.getRow(i + 5);
        const amount = Number(item.amount || 0);
        let status = 'In Stock';
        if (amount <= 0) status = 'Out of Stock';
        else if (amount < 10) status = 'Low Stock';

        const values = [
            i + 1,
            item.subject || 'N/A',
            item.type || 'General',
            amount,
            item.unit || 'pcs',
            item.location || '-',
            item.supplier_name || '-',
            item.last_restock_date ? new Date(item.last_restock_date).toLocaleDateString('en-GB') : '-',
            status
        ];

        values.forEach((v, idx) => {
            const cell = row.getCell(idx + 1);
            cell.value = v;
            cell.font = { size: 9 };
            cell.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };
            if (idx === 3 && amount < 10) cell.font = { bold: true, color: { argb: COLORS.danger } };
            if (idx === 8) {
                if (status === 'Out of Stock') cell.font = { bold: true, color: { argb: COLORS.danger } };
                if (status === 'Low Stock') cell.font = { bold: true, color: { argb: 'FFD46B08' } };
                if (status === 'In Stock') cell.font = { bold: true, color: { argb: COLORS.success } };
            }
        });
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
}

export async function generateShopPDFReport(options: ShopReportOptions): Promise<Buffer> {
    const items = await fetchShops(options.filters ?? {});
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 25, size: 'A4', layout: 'landscape' });
            const chunks: Buffer[] = [];
            doc.on('data', (c: Buffer) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            const windir = process.env.WINDIR || 'C:\\Windows';
            const FONT_KHMER = path.join(windir, 'Fonts', 'LeelawUI.ttf');
            const FONT_UNI = path.join(windir, 'Fonts', 'simsun.ttc');
            const hasKhmer = fs.existsSync(FONT_KHMER);
            const hasUni = fs.existsSync(FONT_UNI);

            if (hasKhmer) { try { doc.registerFont('KhmerFont', FONT_KHMER); } catch (_) { } }
            if (hasUni) { try { doc.registerFont('UniFont', FONT_UNI, 'SimSun'); } catch (_) { } }

            const C = { primary: '#1F4E78', accent: '#2E75B6', success: '#27AE60', danger: '#C0392B', warn: '#E67E22', text: '#2C2C2C', muted: '#777777' };
            const PW = doc.page.width;
            const PH = doc.page.height;

            const T = (text: any, x: number, y: number, opt: any = {}) => {
                const s = String(text ?? '');
                if (!s) return;
                const isUnicode = /[^\u0000-\u007F]/.test(s);
                const isKhmer = /[\u1780-\u17FF]/.test(s);
                let font = opt.font || 'Helvetica';
                if (isKhmer && hasKhmer) font = 'KhmerFont';
                else if (isUnicode && hasUni) font = 'UniFont';
                doc.save();
                doc.font(font).fontSize(opt.size || 8).fillColor(opt.color || C.text);
                doc.text(s, x, y, { width: opt.width, align: opt.align, lineBreak: !!opt.width });
                doc.restore();
            };

            const getH = (text: any, width: number, size: number = 7.5) => {
                const s = String(text ?? '');
                if (!s || !width) return 0;
                const isUnicode = /[^\u0000-\u007F]/.test(s);
                const isKhmer = /[\u1780-\u17FF]/.test(s);
                let font = 'Helvetica';
                if (isKhmer && hasKhmer) font = 'KhmerFont';
                else if (isUnicode && hasUni) font = 'UniFont';
                return doc.font(font).fontSize(size).heightOfString(s, { width, lineBreak: true });
            };

            const drawFrame = () => {
                doc.rect(0, 0, PW, 60).fill(C.primary);
                T('YORKMARS (CAMBODIA) CO., LTD.', 0, 15, { size: 16, font: 'Helvetica-Bold', color: 'white', align: 'center', width: PW });
                T((options.title || 'SHOP INVENTORY REPORT').toUpperCase(), 0, 38, { size: 9, color: 'white', align: 'center', width: PW });
            };

            const COLS = [
                { l: 'NO', x: 28, w: 25 },
                { l: 'ITEM DESCRIPTION', x: 55, w: 240 },
                { l: 'CATEGORY', x: 300, w: 90 },
                { l: 'QTY', x: 395, w: 50 },
                { l: 'UNIT', x: 450, w: 50 },
                { l: 'SUPPLIER', x: 505, w: 120 },
                { l: 'LAST RESTOCK', x: 630, w: 90 },
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

            items.forEach((item, i) => {
                const rowH = Math.max(getH(item.subject, COLS[1].w, 8) + 12, 28);
                if (y + rowH > PH - 40) { doc.addPage(); drawFrame(); y = 80; drawHeaderRow(y); y += 22; }
                if (i % 2 === 1) doc.rect(25, y, PW - 50, rowH).fill('#F9FAFB');

                const amount = Number(item.amount || 0);
                let status = 'IN STOCK';
                let sCol = C.success;
                if (amount <= 0) { status = 'OUT OF STOCK'; sCol = C.danger; }
                else if (amount < 10) { status = 'LOW STOCK'; sCol = C.warn; }

                T(i + 1, COLS[0].x, y + 8, { size: 7.5 });
                T(item.subject, COLS[1].x, y + 8, { size: 8, font: 'Helvetica-Bold', width: COLS[1].w });
                T(item.type || 'General', COLS[2].x, y + 8, { size: 7.5 });
                T(amount, COLS[3].x, y + 8, { size: 7.5, font: 'Helvetica-Bold', color: amount < 10 ? C.danger : C.text, align: 'center', width: COLS[3].w });
                T(item.unit || 'pcs', COLS[4].x, y + 8, { size: 7.5 });
                T(item.supplier_name || '-', COLS[5].x, y + 8, { size: 7, width: COLS[5].w });
                T(item.last_restock_date ? new Date(item.last_restock_date).toLocaleDateString('en-GB') : '-', COLS[6].x, y + 8, { size: 7 });

                doc.save(); doc.roundedRect(COLS[7].x, y + 6, 80, 12, 2).fill(sCol); doc.restore();
                T(status, COLS[7].x, y + 8.5, { size: 5.5, font: 'Helvetica-Bold', color: 'white', width: 80, align: 'center' });

                y += rowH;
                doc.moveTo(25, y).lineTo(PW - 25, y).strokeColor('#EEEEEE').lineWidth(0.5).stroke();
            });

            doc.end();
        } catch (err) { reject(err); }
    });
}
