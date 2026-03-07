import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { getMongoClient } from '../infrastructure/database/MongoDBClient.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportFilter {
    status?: string;
    department?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    buy_by?: string;
    complete?: boolean;
    limit?: number;
}

export interface ReportOptions {
    format: 'excel' | 'pdf';
    title?: string;
    filters?: ReportFilter;
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchPurchaseRequests(filters: ReportFilter = {}): Promise<any[]> {
    const mongoClient = getMongoClient();
    await mongoClient.connect();
    const db = mongoClient.getDb();
    const collection = db.collection('purchase_requests');

    const match: any = {};
    if (filters.status) match.status = filters.status;
    if (filters.department) match.department = filters.department;
    if (filters.category) match.category = filters.category;
    if (filters.buy_by) match.buy_by = filters.buy_by;
    if (typeof filters.complete === 'boolean') match.complete = filters.complete;

    if (filters.startDate || filters.endDate) {
        match.created_at = {};
        if (filters.startDate) match.created_at.$gte = new Date(filters.startDate);
        if (filters.endDate) match.created_at.$lte = new Date(filters.endDate);
    }

    const limit = Math.min(filters.limit ?? 500, 1000);

    const pipeline: any[] = [
        { $match: match },
        { $addFields: { idString: { $toString: '$_id' } } },
        {
            $lookup: {
                from: 'purchase_request_items',
                localField: 'idString',
                foreignField: 'purchase_request_id',
                as: 'items'
            }
        },
        { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
        {
            $lookup: {
                from: 'shops',
                let: { subjectId: '$items.subject_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $eq: ['$_id', '$$subjectId'] },
                                    { $eq: [{ $toString: '$_id' }, '$$subjectId'] }
                                ]
                            }
                        }
                    }
                ],
                as: 'shop_data'
            }
        },
        { $addFields: { 'items.subject_name': { $ifNull: [{ $arrayElemAt: ['$shop_data.subject', 0] }, 'N/A'] } } },
        {
            $lookup: {
                from: 'suppliers',
                let: { supplierId: '$items.supplier_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $or: [
                                    { $eq: ['$_id', '$$supplierId'] },
                                    { $eq: [{ $toString: '$_id' }, '$$supplierId'] }
                                ]
                            }
                        }
                    }
                ],
                as: 'supplier_data'
            }
        },
        { $addFields: { 'items.supplier_name': { $ifNull: [{ $arrayElemAt: ['$supplier_data.en_name', 0] }, 'N/A'] } } },
        {
            $group: {
                _id: '$_id',
                root: { $first: '$$ROOT' },
                items: { $push: '$items' }
            }
        },
        {
            $replaceRoot: {
                newRoot: {
                    $mergeObjects: [
                        '$root',
                        {
                            items: {
                                $filter: {
                                    input: '$items',
                                    as: 'item',
                                    cond: { $ne: ['$$item', {}] }
                                }
                            }
                        }
                    ]
                }
            }
        },
        {
            $addFields: {
                total_usd: {
                    $reduce: {
                        input: '$items',
                        initialValue: 0,
                        in: {
                            $add: [
                                '$$value',
                                {
                                    $cond: [
                                        { $eq: [{ $ifNull: ['$$this.unit_type', 'USD'] }, 'USD'] },
                                        {
                                            $multiply: [
                                                { $toDouble: { $ifNull: ['$$this.qty', 0] } },
                                                { $toDouble: { $ifNull: ['$$this.unit_price', 0] } }
                                            ]
                                        },
                                        0
                                    ]
                                }
                            ]
                        }
                    }
                },
                total_khr: {
                    $reduce: {
                        input: '$items',
                        initialValue: 0,
                        in: {
                            $add: [
                                '$$value',
                                {
                                    $cond: [
                                        { $in: [{ $ifNull: ['$$this.unit_type', ''] }, ['KHR', 'Riel', 'Riels', 'riel', 'khr']] },
                                        {
                                            $multiply: [
                                                { $toDouble: { $ifNull: ['$$this.qty', 0] } },
                                                { $toDouble: { $ifNull: ['$$this.unit_price', 0] } }
                                            ]
                                        },
                                        0
                                    ]
                                }
                            ]
                        }
                    }
                },
                total_rmb: {
                    $reduce: {
                        input: '$items',
                        initialValue: 0,
                        in: {
                            $add: [
                                '$$value',
                                {
                                    $cond: [
                                        { $in: [{ $ifNull: ['$$this.unit_type', ''] }, ['RMB', 'CNY', 'rmb', 'cny']] },
                                        {
                                            $multiply: [
                                                { $toDouble: { $ifNull: ['$$this.qty', 0] } },
                                                { $toDouble: { $ifNull: ['$$this.unit_price', 0] } }
                                            ]
                                        },
                                        0
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        },
        { $sort: { created_at: -1 } },
        { $limit: limit }
    ];

    const results = await collection.aggregate(pipeline).toArray();
    return results;
}

// ─── Row Mapper ───────────────────────────────────────────────────────────────

function mapRow(r: any, index: number) {
    const fmt = (v: any) => (v instanceof Date ? v.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : (v ?? ''));
    const bool = (v: any) => (v === true ? 'APPROVED' : 'PENDING');

    return {
        no: index + 1,
        code: r.code ?? 'N/A',
        department: (r.department ?? '').replace(/_/g, ' '),
        reason: r.reason ?? '',
        category: r.category ?? '',
        total_usd: r.total_usd ?? 0,
        total_khr: r.total_khr ?? 0,
        total_rmb: r.total_rmb ?? 0,
        head: bool(r.head_approve),
        gm: bool(r.gm_approve),
        acc: bool(r.accountant_approve),
        created_at: fmt(r.created_at),
        items: (r.items || []).map((it: any) => ({
            ...it,
            display_name: it.subject_name !== 'N/A' ? it.subject_name : (it.description || 'N/A'),
            supplier_display: it.supplier_name || 'N/A',
            ccy: it.unit_type || 'USD'
        }))
    };
}

// ─── EXCEL Generator ──────────────────────────────────────────────────────────

export async function generateExcelReport(options: ReportOptions): Promise<Buffer> {
    const rawRows = await fetchPurchaseRequests(options.filters ?? {});
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Purchase Requests');

    const COLORS = {
        primary: 'FF1F4E78',
        secondary: 'FFE9EFF7',
        headerText: 'FFFFFFFF',
        border: 'FFD9D9D9',
        accent: 'FF2E75B6',
    };

    ws.mergeCells('A1:L1');
    const titleCell = ws.getCell('A1');
    titleCell.value = 'YORKMARS (CAMBODIA) CO., LTD.';
    titleCell.font = { bold: true, size: 16, color: { argb: COLORS.headerText } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };
    ws.getRow(1).height = 40;

    ws.mergeCells('A2:L2');
    const subHeader = ws.getCell('A2');
    subHeader.value = (options.title || 'PURCHASE REQUEST REPORT').toUpperCase();
    subHeader.font = { bold: true, size: 11, color: { argb: 'FF444444' } };
    subHeader.alignment = { horizontal: 'center' };
    ws.getRow(2).height = 20;

    ws.mergeCells('A3:L3');
    const timeCell = ws.getCell('A3');
    timeCell.value = `Exported on: ${new Date().toLocaleString('en-GB')}`;
    timeCell.font = { italic: true, size: 8, color: { argb: 'FF888888' } };
    timeCell.alignment = { horizontal: 'right' };
    ws.getRow(3).height = 15;

    const COL_WIDTHS = [6, 12, 18, 25, 12, 10, 10, 10, 8, 8, 8, 12];
    ws.columns = COL_WIDTHS.map(w => ({ width: w }));

    const MAIN_HEADERS = ['NO', 'CODE', 'DEPARTMENT', 'REASON', 'CATEGORY', 'USD TOTAL', 'KHR TOTAL', 'RMB TOTAL', 'HEAD', 'GM', 'ACC', 'DATE'];
    const headRow = ws.getRow(4);
    MAIN_HEADERS.forEach((h, i) => {
        const cell = headRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 9, color: { argb: COLORS.headerText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.accent } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    headRow.height = 25;

    let cur = 5;

    rawRows.forEach((raw, i) => {
        const data = mapRow(raw, i);
        const row = ws.getRow(cur);

        const values = [data.no, data.code, data.department, data.reason, data.category,
        data.total_usd, data.total_khr, data.total_rmb,
        data.head, data.gm, data.acc, data.created_at];
        values.forEach((v, idx) => {
            const cell = row.getCell(idx + 1);
            cell.value = v;
            cell.font = { bold: true, size: 9 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.secondary } };
            cell.border = { top: { style: 'thin', color: { argb: COLORS.border } } };
            if (idx >= 5 && idx <= 7) cell.numFmt = '#,##0.00';
            if (idx >= 8 && idx <= 10) cell.font = { bold: true, size: 8, color: { argb: v === 'APPROVED' ? 'FF008000' : 'FFC00000' } };
        });
        row.height = 22;
        cur++;

        const iHead = ws.getRow(cur);
        const itHeaders = ['', 'DESCRIPTION', 'BRAND', 'SUPPLIER', 'QTY', 'UOM', 'PRICE', 'CCY', 'SUBTOTAL'];
        itHeaders.forEach((h, idx) => {
            if (idx === 0) return;
            const cell = iHead.getCell(idx + 1);
            cell.value = h;
            cell.font = { bold: true, size: 8, italic: true, color: { argb: 'FF666666' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
            cell.alignment = { horizontal: 'center' };
        });
        cur++;

        data.items.forEach((item: any) => {
            const iRow = ws.getRow(cur);
            const qty = Number(item.qty || 0);
            const prc = Number(item.unit_price || 0);
            iRow.getCell(2).value = item.display_name;
            iRow.getCell(3).value = item.brand;
            iRow.getCell(4).value = item.supplier_display;
            iRow.getCell(5).value = qty;
            iRow.getCell(6).value = item.uom || '';
            iRow.getCell(7).value = prc;
            iRow.getCell(8).value = item.ccy;
            iRow.getCell(9).value = qty * prc;
            for (let c = 2; c <= 9; c++) {
                const cell = iRow.getCell(c);
                cell.font = { size: 8.5 };
                cell.border = { bottom: { style: 'hair', color: { argb: COLORS.border } } };
                if (c === 7 || c === 9) cell.numFmt = '#,##0.00';
            }
            cur++;
        });
        cur++;
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

export async function generatePDFReport(options: ReportOptions): Promise<Buffer> {
    const rawRows = await fetchPurchaseRequests(options.filters ?? {});
    return new Promise((resolve, reject) => {
        try {
            // margin:0 disables PDFKit's auto-pagination. We handle all pagination manually.
            const doc = new PDFDocument({ margin: 0, size: 'A4', layout: 'landscape', autoFirstPage: true });
            const chunks: Buffer[] = [];
            doc.on('data', (c: Buffer) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            // ── Fonts ──────────────────────────────────────────────────────────
            const windir = process.env.WINDIR || 'C:\\Windows';
            const FONT_KHMER = path.join(windir, 'Fonts', 'LeelawUI.ttf');
            // SimSun is the standard Windows font for both Simp/Trad Chinese.
            const FONT_UNI = path.join(windir, 'Fonts', 'simsun.ttc');

            const hasKhmer = fs.existsSync(FONT_KHMER);
            const hasUni = fs.existsSync(FONT_UNI);

            // Register names for more stable font switching in PDFKit
            if (hasKhmer) { try { doc.registerFont('KhmerFont', FONT_KHMER); } catch (_) { } }
            // 'SimSun' is the face name within simsun.ttc
            if (hasUni) { try { doc.registerFont('UniFont', FONT_UNI, 'SimSun'); } catch (_) { } }

            // ── Layout ─────────────────────────────────────────────────────────
            const PW = doc.page.width;   // ~841pt (A4 landscape)
            const PH = doc.page.height;  // ~595pt
            const ML = 25;
            const CW = PW - ML * 2;
            const HDR = 72;               // header height
            const FTR = 20;               // footer height
            const YS = HDR + 8;          // content start y
            const YE = PH - FTR - 10;   // content end y (safe bottom)

            const C = {
                primary: '#1F4E78', accent: '#2E75B6', light: '#EBF3FB',
                success: '#27AE60', danger: '#C0392B',
                text: '#2C2C2C', muted: '#777777', altRow: '#F7FAFC',
                border: '#CCCCCC'
            };

            // ── Text Helper: always absolute, never advances cursor ────────────
            const T = (text: any, x: number, y: number, opt: any = {}) => {
                const s = String(text ?? '');
                if (!s) return;

                // Detection for Khmer and Chinese characters
                const isKhmer = /[\u1780-\u17FF]/.test(s);
                const isChinese = /[\u4E00-\u9FFF]/.test(s);

                let fontToUse = opt.font || 'Helvetica';
                if (isKhmer && hasKhmer) fontToUse = 'KhmerFont';
                else if (isChinese && hasUni) fontToUse = 'UniFont';

                doc.save();
                // If width is provided, we usually want wrapping
                const textOpts = { lineBreak: !!opt.width, subset: false, ...opt } as any;

                try {
                    doc.font(fontToUse).fontSize(opt.size || 8).fillColor(opt.color || C.text);
                    doc.text(s, x, y, textOpts);
                } catch (e) {
                    try {
                        doc.font('Helvetica').fontSize(opt.size || 8).fillColor(opt.color || C.text);
                        doc.text(s, x, y, textOpts);
                    } catch (e2) { }
                }
                doc.restore();
            };

            // ── Height Helper: accurately measure text height ──────────────────
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

            // ── Header ─────────────────────────────────────────────────────────
            const drawHeader = () => {
                doc.rect(0, 0, PW, HDR).fill(C.primary);
                doc.rect(0, HDR, PW, 3).fill(C.accent);
                T('YORKMARS (CAMBODIA) CO., LTD.', 0, 18,
                    { size: 17, font: 'Helvetica-Bold', color: 'white', width: PW, align: 'center' });
                T((options.title || 'PURCHASE REQUEST AUDIT REPORT').toUpperCase(), 0, 44,
                    { size: 9, color: 'white', width: PW, align: 'center' });
                T(`Generated: ${new Date().toLocaleString('en-GB')}`, 0, 58,
                    { size: 7, color: '#A8C8E8', width: PW - 20, align: 'right' });
            };

            // ── Footer ─────────────────────────────────────────────────────────
            let pageNum = 0;
            const drawFooter = () => {
                const fy = PH - FTR;
                doc.save();
                doc.moveTo(ML, fy).lineTo(PW - ML, fy).strokeColor(C.border).lineWidth(0.4).stroke();
                doc.font('Helvetica').fontSize(7).fillColor(C.muted);
                doc.text('Yorkmars (Cambodia) Co., Ltd. | Private & Confidential', ML, fy + 6, { lineBreak: false });
                doc.text(`Page ${pageNum}`, PW - ML - 55, fy + 6, { width: 55, align: 'right', lineBreak: false });
                doc.restore();
            };

            // ── First page ─────────────────────────────────────────────────────
            pageNum = 1;
            drawHeader();
            drawFooter();
            let y = YS;

            const newPage = () => {
                doc.addPage();
                pageNum++;
                drawHeader();
                drawFooter();
                y = YS;
            };

            const ensureSpace = (needed: number) => {
                if (y + needed > YE) newPage();
            };

            // ── Column definitions ─────────────────────────────────────────────
            const COLS = [
                { label: 'DESCRIPTION / SUBJECT', x: ML + 10, w: 205 },
                { label: 'BRAND', x: ML + 220, w: 70 },
                { label: 'SUPPLIER', x: ML + 295, w: 148 },
                { label: 'QTY', x: ML + 448, w: 36 },
                { label: 'UOM', x: ML + 488, w: 38 },
                { label: 'PRICE', x: ML + 530, w: 68 },
                { label: 'CCY', x: ML + 602, w: 32 },
                { label: 'SUBTOTAL', x: ML + 637, w: 80, align: 'right' },
            ];

            // ── Render all rows ────────────────────────────────────────────────
            rawRows.forEach((raw, i) => {
                const data = mapRow(raw, i);

                ensureSpace(62); // request bar + table header + 1 item row

                // Request summary bar
                doc.roundedRect(ML, y, CW, 26, 3).fill(C.light);

                // Status badge
                const approved = data.head === 'APPROVED' && data.gm === 'APPROVED';
                doc.rect(ML + 4, y + 3, 50, 20).fill(approved ? C.success : C.danger);
                T(approved ? 'RELEASED' : 'PENDING', ML + 4, y + 9,
                    { size: 6, font: 'Helvetica-Bold', color: 'white', width: 50, align: 'center' });

                // Meta
                T(`#${data.code}`, ML + 60, y + 5,
                    { size: 9, font: 'Helvetica-Bold', color: C.primary });
                T(`Dept: ${data.department}`, ML + 185, y + 4, { size: 7, color: C.muted });
                T(`Date: ${data.created_at}`, ML + 185, y + 14, { size: 7, color: C.muted });
                T(`Category: ${data.category}`, ML + 355, y + 9, { size: 7.5 });

                // Currency totals
                const parts: string[] = [];
                if (data.total_usd > 0) parts.push(`${data.total_usd.toLocaleString('en', { minimumFractionDigits: 2 })} USD`);
                if (data.total_khr > 0) parts.push(`${data.total_khr.toLocaleString('en')} KHR`);
                if (data.total_rmb > 0) parts.push(`${data.total_rmb.toLocaleString('en', { minimumFractionDigits: 2 })} RMB`);
                if (parts.length > 0) {
                    T(parts.join('  |  '), ML + 470, y + 9,
                        { size: 7.5, font: 'Helvetica-Bold', width: CW - 480, align: 'right' });
                }

                y += 30;

                // Item table header
                doc.rect(ML + 6, y, CW - 12, 13).fill('#EDF2F7');
                COLS.forEach(c => {
                    T(c.label, c.x, y + 3,
                        { size: 6.5, font: 'Helvetica-Bold', color: '#555555', width: c.w, align: (c as any).align });
                });
                y += 15;

                // Item rows
                data.items.forEach((it: any, idx: number) => {
                    // Calculate dynamic height based on wrapping columns
                    const h_desc = getH(it.display_name, COLS[0].w, 7.5);
                    const h_brand = getH(it.brand || '-', COLS[1].w, 7.5);
                    const h_supp = getH(it.supplier_display, COLS[2].w, 7.5);
                    const rowH = Math.max(h_desc, h_brand, h_supp, 12) + 4; // Padding

                    ensureSpace(rowH);

                    if (idx % 2 === 0) {
                        doc.rect(ML + 6, y, CW - 12, rowH).fill(C.altRow);
                    }

                    const qty = Number(it.qty || 0);
                    const prc = Number(it.unit_price || 0);
                    const sub = qty * prc;

                    T(it.display_name, COLS[0].x, y + 2, { size: 7.5, width: COLS[0].w });
                    T(it.brand || '-', COLS[1].x, y + 2, { size: 7.5, width: COLS[1].w });
                    T(it.supplier_display, COLS[2].x, y + 2, { size: 7.5, width: COLS[2].w });
                    T(qty.toLocaleString(), COLS[3].x, y + 2, { size: 7.5, width: COLS[3].w, align: 'center' });
                    T(it.uom || '-', COLS[4].x, y + 2, { size: 7.5, width: COLS[4].w, align: 'center' });
                    T(prc.toLocaleString('en', { minimumFractionDigits: 2 }),
                        COLS[5].x, y + 2, { size: 7.5, width: COLS[5].w });
                    T(it.ccy || 'USD', COLS[6].x, y + 2, { size: 7.5, width: COLS[6].w });
                    T(sub.toLocaleString('en', { minimumFractionDigits: 2 }),
                        COLS[7].x, y + 2, { size: 7.5, width: COLS[7].w, align: 'right', font: 'Helvetica-Bold' });

                    y += rowH;
                    doc.moveTo(ML + 10, y)
                        .lineTo(ML + CW - 10, y)
                        .strokeColor('#EBEBEB').lineWidth(0.3).stroke();
                });

                y += 14; // gap between requests
            });

            doc.end();
        } catch (err) { reject(err); }
    });
}
