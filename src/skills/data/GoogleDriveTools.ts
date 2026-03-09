import { ITool, ToolDefinition } from '../../core/interfaces/ITool.js';
import { google } from 'googleapis';

/**
 * Tool for searching files in Google Drive
 */
export class GoogleDriveSearchTool implements ITool {
    readonly name = 'google_drive_search';
    readonly description = 'Search Google Drive for files and documents by name or content.';

    async execute(args?: any): Promise<string> {
        try {
            const query = args?.query || args?.q;
            if (!query) return "Please provide a search query.";

            console.log(`📁 [DriveSearch] Searching for: "${query}"...`);

            const auth = await google.auth.getClient({
                scopes: ['https://www.googleapis.com/auth/drive.readonly']
            });
            const drive = google.drive({ version: 'v3', auth });

            // Search for query in file name or full text
            const response = await drive.files.list({
                q: `name contains '${query.replace(/'/g, "\\'")}' or fullText contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
                fields: 'files(id, name, mimeType)',
                pageSize: 10
            });

            const files = response.data.files;
            if (!files || files.length === 0) {
                return `No files found in Google Drive matching "${query}".`;
            }

            let result = `Found ${files.length} files matching "${query}":\n\n`;
            files.forEach(f => {
                result += `- **${f.name}** (ID: \`${f.id}\` Type: ${f.mimeType})\n`;
            });
            result += `\nUse the \`google_drive_read_document\` tool with a file ID to read its contents.`;

            return result;
        } catch (error: any) {
            console.error('❌ DriveSearch error:', error);
            return `Error searching Google Drive: ${error.message}. Make sure the Service Account has been granted access to the folder/files.`;
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
                        query: {
                            type: 'string',
                            description: 'The search term to look for in file names or contents.'
                        }
                    },
                    required: ['query']
                }
            }
        };
    }
}

/**
 * Tool for reading files from Google Drive
 */
export class GoogleDriveReadTool implements ITool {
    readonly name = 'google_drive_read_document';
    readonly description = 'Read the textual content of a specific Google Drive document using its File ID.';

    async execute(args?: any): Promise<string> {
        try {
            const fileId = args?.fileId;
            if (!fileId) return "Please provide a fileId.";

            console.log(`📄 [DriveRead] Reading file ID: "${fileId}"...`);

            const auth = await google.auth.getClient({
                scopes: ['https://www.googleapis.com/auth/drive.readonly']
            });
            const drive = google.drive({ version: 'v3', auth });

            // 1. Get file metadata to check mime pattern
            const meta = await drive.files.get({
                fileId,
                fields: 'name, mimeType'
            });

            const mimeType = meta.data.mimeType;
            const fileName = meta.data.name;

            if (!mimeType) return 'Could not determine file type.';

            let content = '';

            // Handle Google Docs format
            if (mimeType.includes('application/vnd.google-apps.document')) {
                const res = await drive.files.export({
                    fileId: fileId,
                    mimeType: 'text/plain'
                });
                content = res.data as string;
            }
            // Handle plain text files
            else if (mimeType.includes('text/plain') || mimeType.includes('application/json') || mimeType.includes('text/csv')) {
                const res = await drive.files.get({
                    fileId: fileId,
                    alt: 'media'
                }, { responseType: 'text' });
                content = res.data as string;
            } else {
                return `Cannot read file type: ${mimeType}. I can only read Google Docs and Plain Text files for now.`;
            }

            // Truncate if too long (rough limit to fit context window)
            if (content.length > 50000) {
                content = content.substring(0, 50000) + '\n\n...[TRUNCATED DUE TO LENGTH]...';
            }

            return `### Contents of ${fileName}:\n\n${content}`;
        } catch (error: any) {
            console.error('❌ DriveRead error:', error);
            return `Error reading file from Google Drive: ${error.message}`;
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
                        fileId: {
                            type: 'string',
                            description: 'The exact Google Drive File ID shown in the search results.'
                        }
                    },
                    required: ['fileId']
                }
            }
        };
    }
}

export const GOOGLE_DRIVE_TOOLS = [new GoogleDriveSearchTool(), new GoogleDriveReadTool()];
