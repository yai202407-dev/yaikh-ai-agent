import { ITool, ToolDefinition } from "../../core/interfaces/ITool.js";
import PptxGenJS from "pptxgenjs"; // Requires: npm i pptxgenjs
import path from "path";
import fs from "fs";
import { randomUUID } from "node:crypto";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Universal Tool to generate Professional PowerPoint Presentations
 */
export class GeneratePresentationTool implements ITool {
    readonly name = "generate_powerpoint_presentation";
    readonly description = "Generates a real, downloadable Microsoft PowerPoint (.pptx) file containing the slides you specify. Use this whenever the user asks for 'slides', 'deck', or a 'presentation' based on data you have explored.";

    async execute(params: { presentationTitle: string, slides: Array<{ title: string, bulletPoints: string[], chartData?: any }> }): Promise<string> {
        try {
            if (!params || !params.slides || params.slides.length === 0) {
                return "Error: You must provide 'presentationTitle' and a list of 'slides'.";
            }

            // @ts-ignore
            const pptx = new PptxGenJS();
            pptx.author = "Yai 2 Enterprise Agent";
            pptx.company = "Yorkmars";
            pptx.title = params.presentationTitle;

            // Title Slide
            const titleSlide = pptx.addSlide();
            titleSlide.background = { color: "1F4E78" }; // Yorkmars Blue
            titleSlide.addText(params.presentationTitle, {
                x: 1, y: 2.5, w: 8, h: 1.5,
                fontSize: 36, color: "FFFFFF", bold: true, align: "center", fontFace: "Arial"
            });
            titleSlide.addText("Generated dynamically by Yai 2 (Vertex AI)", {
                x: 1, y: 4, w: 8, h: 1,
                fontSize: 18, color: "F2F2F2", align: "center", fontFace: "Arial"
            });

            // Content Slides
            for (const slideData of params.slides) {
                const slide = pptx.addSlide();

                // Add title
                slide.addText(slideData.title, {
                    x: 0.5, y: 0.5, w: 9, h: 1,
                    fontSize: 24, bold: true, color: "1F4E78", fontFace: "Arial"
                });

                // Add bullet points
                if (slideData.bulletPoints && slideData.bulletPoints.length > 0) {
                    const mappedBullets = slideData.bulletPoints.map(t => ({ text: t }));
                    slide.addText(mappedBullets, {
                        x: 0.5, y: 1.8, w: 9, h: 3.5,
                        fontSize: 16, bullet: true, color: "333333", fontFace: "Arial", valign: "top"
                    });
                }
            }

            // Ensure public directory exists
            const publicDir = path.resolve(process.cwd(), 'public', 'downloads');
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir, { recursive: true });
            }

            const fileName = `Yai2_Presentation_${randomUUID().substring(0, 8)}.pptx`;
            const filePath = path.join(publicDir, fileName);

            // Save the file
            await pptx.writeFile({ fileName: filePath });

            return JSON.stringify({
                status: "success",
                message: `Successfully generated a ${params.slides.length + 1}-slide presentation.`,
                download_url: `/downloads/${fileName}`,
                message_template: `I have generated your PowerPoint presentation: **${params.presentationTitle}**. \n\n[▶️ Click here to download the .pptx file](/downloads/${fileName})`
            });

        } catch (error: any) {
            return `Error generating presentation: ${error?.message || String(error)}`;
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
                        presentationTitle: {
                            type: 'string',
                            description: 'The overarching title of the presentation deck.'
                        },
                        slides: {
                            type: 'array',
                            description: 'An array of slide objects.',
                            items: {
                                type: 'object',
                                properties: {
                                    title: { type: 'string', description: 'The title of this specific slide.' },
                                    bulletPoints: {
                                        type: 'array',
                                        items: { type: 'string' },
                                        description: 'A list of short text points to display on the slide.'
                                    }
                                }
                            }
                        }
                    },
                    required: ['presentationTitle', 'slides']
                }
            }
        };
    }
}

/**
 * Universal Tool to synthesize data into a "NotebookLM" style deep-dive study guide / podcast script.
 */
export class NotebookSynthesisTool implements ITool {
    readonly name = "generate_notebooklm_synthesis";
    readonly description = "Uses a deep reasoning Vertex AI model to synthesize rough data/text into a massive, highly structured NotebookLM-style report (incorporating an Executive Summary, Key Themes, FAQ, and an Audio Podcast Script between two hosts). Use this when the user asks for a 'deep dive', 'study guide', or 'NotebookLM API' analysis.";

    async execute(params: { topic: string, sourceMaterial: string }): Promise<string> {
        try {
            if (!params || !params.topic || !params.sourceMaterial) {
                return "Error: You must provide 'topic' and 'sourceMaterial'.";
            }

            console.log("🧠 Triggering Deep Notebook Synthesis on Vertex AI for: ", params.topic);

            // We initialize a separate LLM specifically tailored for this intensive task
            const synthesisLlm = new ChatGoogleGenerativeAI({
                model: process.env.GEMINI_MODEL || "gemini-1.5-pro", // Pro model better at large synthesis
                apiKey: process.env.GEMINI_API_KEY || "",
                temperature: 0.3,
            });

            const prompt = `
You are acting as the NotebookLM backend engine. The user wants a deep dive synthesis of the following topic based on the provided source material.

Topic: ${params.topic}

Source Material (Raw Data):
${params.sourceMaterial.substring(0, 15000)} // truncate to prevent extreme context limits

Your task is to generate a comprehensive, structured output containing EXACTLY these four sections:
1. **Executive Briefing**: A high-level overview of what the data actually means.
2. **Key Insights & Themes**: Bulleted list of the absolute most critical findings from the data.
3. **Frequently Asked Questions (FAQ)**: Anticipate 3 questions a manager would ask about this data, and provide concise answers.
4. **"Audio Overview" Script**: Write a conversational back-and-forth script between two podcast hosts (Host 1: "Alex", Host 2: "Sam") discussing the most interesting parts of this data to make it easy to understand.

Output only the Markdown requested.
`;

            const result = await synthesisLlm.invoke(prompt);
            const synthesizedText = typeof result.content === 'string' ? result.content : "Error extracting text.";

            return JSON.stringify({
                status: "success",
                topic: params.topic,
                message_template: `I have used Vertex AI / NotebookLM synthesis capabilities to deeply analyze the available data on **${params.topic}**.\n\nHere is your comprehensive study guide:\n\n---\n\n${synthesizedText}`
            });

        } catch (error: any) {
            return `Error running NotebookLM Synthesis: ${error?.message || String(error)}`;
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
                        topic: {
                            type: 'string',
                            description: 'The main topic or title of the synthesis (e.g., "Q3 Leave Requests Analysis").'
                        },
                        sourceMaterial: {
                            type: 'string',
                            description: 'The raw text or JSON data that needs to be deeply analyzed and synthesized. Gather this using explore_collection_data first, stringify it, and pass it here.'
                        }
                    },
                    required: ['topic', 'sourceMaterial']
                }
            }
        };
    }
}

export const VERTEX_AI_TOOLS = [
    new GeneratePresentationTool(),
    new NotebookSynthesisTool()
];
