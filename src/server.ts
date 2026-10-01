import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;

const wss = new WebSocketServer({ port: PORT });

interface ConversationTurn {
    role: 'user' | 'model';
    parts: { text: string }[];
}

wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    const history: ConversationTurn[] = [];

    ws.on('message', async (raw) => {
        try {
            const { text } = JSON.parse(raw.toString());
            if (!text) return;

            history.push({ role: 'user', parts: [{ text }] });

            const model = genAI.getGenerativeModel({
                model: 'gemini-3.6-flash',
                systemInstruction: 'You are a helpful voice assistant. Respond in plain, natural spoken language only — no Markdown, no asterisks, no bullet points, no headers, no special formatting. Keep responses conversational and reasonably concise, as if speaking out loud.',
            });
            const chat = model.startChat({ history: history.slice(0, -1) });
            const result = await chat.sendMessage(text);
            const responseText = result.response.text();

            history.push({ role: 'model', parts: [{ text: responseText }] });

            ws.send(JSON.stringify({ type: 'response', text: responseText }));
        } catch (err) {
            console.error('Error handling message:', err);
            ws.send(JSON.stringify({ type: 'error', message: 'Something went wrong' }));
        }
    });

    ws.on('close', () => console.log('Client disconnected'));
});

console.log(`WebSocket server running on port ${PORT}`);