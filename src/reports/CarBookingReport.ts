import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { getMongoClient } from '../infrastructure/database/MongoDBClient.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CarBookingReportFilter {
    status?: string; // booking_status: approved, pending, rejected
    driver_status?: string; // ongoing, completed, canceled
    startDate?: string;
    endDate?: string;
    limit?: number;
}

export interface CarBookingReportOptions {
    format: 'excel' | 'pdf';
    title?: string;
    filters?: CarBookingReportFilter;
}

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchCarBookings(filters: CarBookingReportFilter = {}): Promise<any[]> {
    const mongoClient = getMongoClient();
    await mongoClient.connect();
    const db = mongoClient.getDb();
    const collection = db.collection('car_bookings');

    const match: any = {};
    if (filters.status) match.booking_status = filters.status;
    if (filters.driver_status) match.driver_status = filters.driver_status;

    if (filters.startDate || filters.endDate) {
        match.date = {};
        if (filters.startDate) match.date.$gte = new Date(filters.startDate);
        if (filters.endDate) match.date.$lte = new Date(filters.endDate);
    }

    const limit = Math.min(filters.limit ?? 500, 1000);

    const pipeline: any[] = [
        { $match: match },
        // Join Requestor
        {
            $lookup: {
                from: 'users',
                let: { uid: '$userId' },
                pipeline: [
                    { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$uid'] } } }
                ],
                as: 'requestor'
            }
        },
        { $unwind: { path: '$requestor', preserveNullAndEmptyArrays: true } },
        // Join Driver
        {
            $lookup: {
                from: 'users',
                let: { did: '$driver_id' },
                pipeline: [
                    { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$did'] } } }
                ],
                as: 'driver'
            }
        },
        { $unwind: { path: '$driver', preserveNullAndEmptyArrays: true } },
        // Join Car
        {
            $lookup: {
                from: 'cars_main',
                let: { cid: '$carId' },
                pipeline: [
                    { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$cid'] } } }
                ],
                as: 'car'
            }
        },
        { $unwind: { path: '$car', preserveNullAndEmptyArrays: true } },
        // Join Location From
        {
            $lookup: {
                from: 'locations',
                let: { lid: '$locationfromId' },
                pipeline: [
                    { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$lid'] } } }
                ],
                as: 'loc_from'
            }
        },
        { $unwind: { path: '$loc_from', preserveNullAndEmptyArrays: true } },
        // Join Location To
        {
            $lookup: {
                from: 'locations',
                let: { lid: '$locationId' },
                pipeline: [
                    { $match: { $expr: { $eq: [{ $toString: '$_id' }, '$$lid'] } } }
                ],
                as: 'loc_to'
            }
        },
        { $unwind: { path: '$loc_to', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1, date: 1, time_to: 1, time_return: 1,
                requestor_name: '$requestor.name',
                driver_name: '$driver.name',
                car_info: { $concat: ['$car.plate_number', ' (', '$car.car_name', ')'] },
                from_name: '$loc_from.name_location',
                to_name: '$loc_to.name_location',
                booking_status: 1,
                driver_status: 1,
                number_of_people: 1,
                created_at: 1
            }
        },
        { $sort: { date: -1 } },
        { $limit: limit }
    ];

    return await collection.aggregate(pipeline).toArray();
}

// ─── EXCEL Generator ──────────────────────────────────────────────────────────

export async function generateCarBookingExcelReport(options: CarBookingReportOptions): Promise<Buffer> {
    const bookings = await fetchCarBookings(options.filters ?? {});
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Car Bookings');

    const COLORS = {
        primary: 'FF1F4E78',
        headerText: 'FFFFFFFF',
        border: 'FFD9D9D9',
        accent: 'FF2E75B6',
        success: 'FF00B050',
        danger: 'FFFF0000',
        warn: 'FFFFC000'
    };

    ws.mergeCells('A1:J1');
    ws.getCell('A1').value = 'YORKMARS (CAMBODIA) CO., LTD.';
    ws.getCell('A1').font = { bold: true, size: 16, color: { argb: COLORS.headerText } };
    ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.primary } };

    ws.mergeCells('A2:J2');
    ws.getCell('A2').value = (options.title || 'CAR BOOKING REPORT').toUpperCase();
    ws.getCell('A2').font = { bold: true, size: 11 };
    ws.getCell('A2').alignment = { horizontal: 'center' };

    const HEADERS = ['NO', 'DATE', 'REQUESTOR', 'VEHICLE', 'DRIVER', 'FROM', 'TO', 'PASSENGERS', 'TIME', 'STATUS'];
    const COL_WIDTHS = [6, 12, 20, 25, 20, 25, 25, 12, 15, 15];
    ws.columns = COL_WIDTHS.map(w => ({ width: w }));

    const headRow = ws.getRow(4);
    HEADERS.forEach((h, i) => {
        const cell = headRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true, size: 9, color: { argb: COLORS.headerText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.accent } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    bookings.forEach((b, i) => {
        const row = ws.getRow(i + 5);
        const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

        const values = [
            i + 1,
            fmtDate(b.date),
            b.requestor_name || '-',
            b.car_info || '-',
            b.driver_name || '-',
            b.from_name || '-',
            b.to_name || '-',
            b.number_of_people || '1',
            `${b.time_to || ''} - ${b.time_return || ''}`,
            (b.driver_status || b.booking_status || '-').toUpperCase()
        ];

        values.forEach((v, idx) => {
            const cell = row.getCell(idx + 1);
            cell.value = v;
            cell.font = { size: 9 };
            cell.border = { bottom: { style: 'thin', color: { argb: COLORS.border } } };

            if (idx === 9) { // Status coloring
                const s = String(v).toLowerCase();
                if (s === 'completed' || s === 'approved') cell.font = { bold: true, color: { argb: COLORS.success } };
                if (s === 'canceled' || s === 'rejected') cell.font = { bold: true, color: { argb: COLORS.danger } };
                if (s === 'ongoing' || s === 'pending') cell.font = { bold: true, color: { argb: COLORS.warn } };
            }
        });
    });

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
}

// ─── PDF Generator ────────────────────────────────────────────────────────────

export async function generateCarBookingPDFReport(options: CarBookingReportOptions): Promise<Buffer> {
    const bookings = await fetchCarBookings(options.filters ?? {});
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

            const C = { primary: '#1F4E78', accent: '#2E75B6', text: '#2C2C2C', success: '#27AE60', danger: '#C0392B', warn: '#E67E22' };
            const PW = doc.page.width;
            const PH = doc.page.height;

            const T = (text: any, x: number, y: number, opt: any = {}) => {
                const s = String(text ?? '');
                if (!s) return;
                const isKhmer = /[\u1780-\u17FF]/.test(s);
                doc.save();
                doc.font(isKhmer && hasKhmer ? 'KhmerFont' : (opt.font || 'Helvetica')).fontSize(opt.size || 8).fillColor(opt.color || C.text);
                doc.text(s, x, y, { width: opt.width, align: opt.align, lineBreak: !!opt.width });
                doc.restore();
            };

            const drawFrame = () => {
                doc.rect(0, 0, PW, 60).fill(C.primary);
                T('YORKMARS (CAMBODIA) CO., LTD.', 0, 15, { size: 16, font: 'Helvetica-Bold', color: 'white', align: 'center', width: PW });
                T((options.title || 'CAR BOOKING REPORT').toUpperCase(), 0, 38, { size: 9, color: 'white', align: 'center', width: PW });
            };

            const COLS = [
                { l: 'NO', x: 28, w: 25 },
                { l: 'DATE', x: 55, w: 60 },
                { l: 'REQUESTOR', x: 120, w: 100 },
                { l: 'DRIVER', x: 225, w: 100 },
                { l: 'VEHICLE', x: 330, w: 110 },
                { l: 'ROUTE (FROM -> TO)', x: 445, w: 180 },
                { l: 'TIME', x: 630, w: 100 },
                { l: 'STATUS', x: 735, w: 75 }
            ];

            const drawHeaderRow = (posY: number) => {
                doc.rect(25, posY, PW - 50, 18).fill(C.accent);
                COLS.forEach(c => T(c.l, c.x, posY + 5, { size: 7, font: 'Helvetica-Bold', color: 'white' }));
            };

            drawFrame();
            let y = 80;
            drawHeaderRow(y);
            y += 22;

            bookings.forEach((b, i) => {
                const rowH = 34;
                if (y + rowH > PH - 40) { doc.addPage(); drawFrame(); y = 80; drawHeaderRow(y); y += 22; }
                if (i % 2 === 1) doc.rect(25, y, PW - 50, rowH).fill('#F9FAFB');

                const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('en-GB') : '-';

                T(i + 1, COLS[0].x, y + 12, { size: 7.5 });
                T(fmtDate(b.date), COLS[1].x, y + 12, { size: 7.5 });
                T(b.requestor_name, COLS[2].x, y + 12, { size: 7.5, width: COLS[2].w });
                T(b.driver_name, COLS[3].x, y + 12, { size: 7.5, width: COLS[3].w });
                T(b.car_info, COLS[4].x, y + 12, { size: 7, width: COLS[4].w });

                const route = `${b.from_name || 'N/A'}\n-> ${b.to_name || 'N/A'}`;
                T(route, COLS[5].x, y + 8, { size: 6.5, width: COLS[5].w });

                const timeStr = `${b.time_to || ''}\n${b.time_return || ''}`;
                T(timeStr, COLS[6].x, y + 10, { size: 7, width: COLS[6].w });

                const s = (b.driver_status || b.booking_status || '-').toUpperCase();
                let sCol = '#95A5A6';
                if (s === 'COMPLETED' || s === 'APPROVED') sCol = C.success;
                if (s === 'CANCELED' || s === 'REJECTED') sCol = C.danger;
                if (s === 'ONGOING' || s === 'PENDING') sCol = C.warn;

                doc.save(); doc.roundedRect(COLS[7].x, y + 11, 70, 12, 2).fill(sCol); doc.restore();
                T(s, COLS[7].x, y + 13.5, { size: 5.5, font: 'Helvetica-Bold', color: 'white', width: 70, align: 'center' });

                y += rowH;
                doc.moveTo(25, y).lineTo(PW - 25, y).strokeColor('#EEEEEE').lineWidth(0.5).stroke();
            });

            doc.end();
        } catch (err) { reject(err); }
    });
}
