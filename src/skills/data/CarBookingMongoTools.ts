import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import { getMongoClient } from '../../infrastructure/database/MongoDBClient.js';
import { ObjectId } from 'mongodb';

/**
 * Tool for listing/searching car bookings
 */
export class GetCarBookingsTool implements ITool {
    readonly name = 'get_car_bookings';
    readonly description = 'List or search car bookings. Supports filtering by date, booking status, or user.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            const query: any = {};
            if (args?.status) query.booking_status = args.status;

            if (args?.date) {
                // Handle date filtering if provided (simplified for now)
                const searchDate = new Date(args.date);
                const nextDay = new Date(searchDate);
                nextDay.setDate(searchDate.getDate() + 1);
                query.date = { $gte: searchDate, $lt: nextDay };
            }

            const bookings = await mongoClient.getCollectionData('car_bookings', {
                query,
                limit: args?.limit || 5, // Reduced default limit for speed
                sort: { date: -1 } // Sort by travel date
            });

            if (!bookings || bookings.length === 0) return "No car bookings found matching those criteria.";

            // Resolve all relationships in parallel for all bookings
            const results = await Promise.all(bookings.map(async (b: any) => {
                const [user, car, dest] = await Promise.all([
                    mongoClient.getUserById(b.userId),
                    b.carId ? db.collection('cars').findOne({ _id: new ObjectId(b.carId) }) : Promise.resolve(null),
                    b.locationId ? db.collection('locations').findOne({ _id: new ObjectId(b.locationId) }) : Promise.resolve(null)
                ]);

                return `- **[${b.booking_status.toUpperCase()}] Booking for ${user?.name || 'Unknown'}**\n  Car: ${car?.car_name || 'TBD'} | Dest: ${dest?.name_location || 'N/A'}\n  Time: ${b.time_to || '?'}\n  Date: ${new Date(b.date).toLocaleDateString()}\n  ID: \`${b._id}\``;
            }));

            return `### Car Bookings:\n${results.join('\n\n')}`;
        } catch (error) {
            return `Error fetching car bookings: ${error}`;
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
                        status: { type: 'string', description: 'Booking status (approved, pending, etc.)' },
                        date: { type: 'string', description: 'Filter by date (ISO format YYYY-MM-DD)' },
                        limit: { type: 'number', description: 'Result limit (default 10)' }
                    },
                    required: []
                }
            }
        };
    }
}

/**
 * Tool for advanced car booking analytics (averages, etc.)
 */
export class GetCarBookingAnalyticsTool implements ITool {
    readonly name = 'get_car_booking_analytics';
    readonly description = 'Get advanced analytics for car bookings like weekly averages and percentage breakdowns.';

    async execute(): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            // Get total, status breakdown, and date range
            const [stats, total, range] = await Promise.all([
                db.collection('car_bookings').aggregate([{ $group: { _id: "$booking_status", count: { $sum: 1 } } }]).toArray(),
                db.collection('car_bookings').countDocuments(),
                db.collection('car_bookings').aggregate([
                    { $group: { _id: null, minDate: { $min: "$date" }, maxDate: { $max: "$date" } } }
                ]).toArray()
            ]);

            if (total === 0) return "No car booking data available for analytics.";

            const minDate = range[0]?.minDate || new Date();
            const maxDate = range[0]?.maxDate || new Date();
            const diffTime = Math.abs(maxDate.getTime() - minDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
            const diffWeeks = diffDays / 7 || 1;

            let response = `### 📊 Car Booking Analytics:\n`;
            response += `- **Total Bookings Recorded:** ${total}\n`;
            response += `- **Data Spans:** ${diffDays} days (~${diffWeeks.toFixed(1)} weeks)\n`;
            response += `- **Average Bookings/Week:** ${(total / diffWeeks).toFixed(2)}\n`;
            response += `- **Average Bookings/Day:** ${(total / diffDays).toFixed(2)}\n\n`;

            response += `**Status Breakdown:**\n`;
            stats.forEach((s: any) => {
                const percent = ((s.count / total) * 100).toFixed(1);
                response += `- ${s._id ? s._id.toUpperCase() : 'UNKNOWN'}: ${s.count} (${percent}%)\n`;
            });

            return response;
        } catch (error) {
            return `Error calculating analytics: ${error}`;
        }
    }

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: { type: 'object', properties: {}, required: [] }
            }
        };
    }
}

/**
 * Tool for viewing simple car booking counts
 */
export class GetCarBookingCountsTool implements ITool {
    readonly name = 'get_car_booking_counts';
    readonly description = 'Get a quick summary of total car bookings and their current statuses.';

    async execute(): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            const [stats, total] = await Promise.all([
                db.collection('car_bookings').aggregate([{ $group: { _id: "$booking_status", count: { $sum: 1 } } }]).toArray(),
                db.collection('car_bookings').countDocuments()
            ]);

            let response = `### 🚗 Car Booking Counts:\n`;
            response += `- **Total Bookings Found:** ${total}\n\n`;

            stats.forEach((s: any) => {
                response += `- ${s._id ? s._id.toUpperCase() : 'UNKNOWN'}: ${s.count}\n`;
            });

            return response;
        } catch (error) {
            return `Error fetching counts: ${error}`;
        }
    }

    getDefinition(): ToolDefinition {
        return {
            type: 'function',
            function: {
                name: this.name,
                description: this.description,
                parameters: { type: 'object', properties: {}, required: [] }
            }
        };
    }
}

/**
 * Tool for getting details of a specific car booking
 */
export class GetCarBookingDetailsTool implements ITool {
    readonly name = 'get_car_booking_details';
    readonly description = 'Get full details of a specific car booking, including driver and car information.';

    async execute(args?: any): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            if (!args?.bookingId) return "Please provide a bookingId.";

            const booking = await db.collection('car_bookings').findOne({ _id: new ObjectId(args.bookingId) });
            if (!booking) return `Booking with ID \`${args.bookingId}\` not found.`;

            // Resolve relationships
            const [user, driver, car, fromLoc, toLoc] = await Promise.all([
                mongoClient.getUserById(booking.userId),
                booking.driver_id ? mongoClient.getUserById(booking.driver_id) : null,
                booking.carId ? db.collection('cars').findOne({ _id: new ObjectId(booking.carId) }) : null,
                booking.locationfromId ? db.collection('locations').findOne({ _id: new ObjectId(booking.locationfromId) }) : null,
                booking.locationId ? db.collection('locations').findOne({ _id: new ObjectId(booking.locationId) }) : null
            ]);

            let detail = `### Car Booking Details\n`;
            detail += `- **Passenger:** ${user?.name || 'Unknown'}\n`;
            detail += `- **Status:** ${booking.booking_status.toUpperCase()}\n`;
            detail += `- **Date:** ${new Date(booking.date).toLocaleDateString()}\n`;
            detail += `- **Time:** ${booking.time_to || 'N/A'}\n`;
            detail += `- **Return Time:** ${booking.time_return || 'N/A'}\n`;
            detail += `- **People Count:** ${booking.number_of_people}\n`;
            detail += `\n**Route Info:**\n`;
            detail += `- **From:** ${fromLoc?.name_location || 'Unknown Location'}\n`;
            detail += `- **To:** ${toLoc?.name_location || 'Unknown Location'}\n`;
            detail += `- **Distance:** ${booking.predict_distance || 'N/A'}\n`;

            detail += `\n**Assignment:**\n`;
            detail += `- **Car:** ${car?.car_name || 'Not assigned yet'} (${car?.plate_number || ''})\n`;
            detail += `- **Driver:** ${driver?.name || 'Not assigned yet'}\n`;
            detail += `- **Driver Status:** ${booking.driver_status || 'N/A'}\n`;

            return detail;
        } catch (error) {
            return `Error fetching booking details: ${error}`;
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
                        bookingId: { type: 'string', description: 'The unique ID of the car booking' }
                    },
                    required: ['bookingId']
                }
            }
        };
    }
}

/**
 * Tool for listing available cars
 */
export class GetCarsTool implements ITool {
    readonly name = 'get_cars';
    readonly description = 'List all cars in the fleet and their status.';

    async execute(): Promise<string> {
        try {
            const mongoClient = getMongoClient();
            await mongoClient.connect();
            const db = mongoClient.getDb();

            const cars = await db.collection('cars').find({}).toArray();
            if (!cars || cars.length === 0) return "No cars found in fleet.";

            const list = cars.map(c => `- **${c.car_name}** (Plate: ${c.plate_number}) - ${c.description || ''}`).join('\n');
            return `### Company Fleet:\n${list}`;
        } catch (error) {
            return `Error fetching cars: ${error}`;
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

export const CAR_BOOKING_MONGO_TOOLS = [
    new GetCarBookingsTool(),
    new GetCarBookingCountsTool(),
    new GetCarBookingAnalyticsTool(),
    new GetCarBookingDetailsTool(),
    new GetCarsTool()
];
