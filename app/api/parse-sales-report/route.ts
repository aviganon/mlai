import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const PROMPT =
  'נתח את דוח המכירות הבא וחזור ב-JSON בלבד. עבור כל שורה חזור: {"item": "שם המוצר", "quantity": מספר}. ' +
  'החזר מערך JSON בלבד ללא טקסט נוסף לפני או אחרי. לדוגמה: [{"item":"עגבניות","quantity":5}]';

function extractJson(text: string): { item: string; quantity: number }[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  return JSON.parse(match[0]);
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });
  const name = file.name.toLowerCase();

  try {
    // Excel files require the `xlsx` package — return a helpful error
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'קבצי Excel אינם נתמכים כרגע. המר את הקובץ ל-CSV ונסה שוב.' },
        { status: 422 }
      );
    }

    let result: { item: string; quantity: number }[] = [];

    if (file.type.startsWith('image/') || name.endsWith('.pdf')) {
      // Vision / document path
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');

      type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

      const content =
        name.endsWith('.pdf')
          ? [
              {
                type: 'document' as const,
                source: {
                  type: 'base64' as const,
                  media_type: 'application/pdf' as const,
                  data: base64,
                },
              },
              { type: 'text' as const, text: PROMPT },
            ]
          : [
              {
                type: 'image' as const,
                source: {
                  type: 'base64' as const,
                  media_type: (file.type as ImageMediaType) || 'image/jpeg',
                  data: base64,
                },
              },
              { type: 'text' as const, text: PROMPT },
            ];

      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2048,
        messages: [{ role: 'user', content }],
      });

      const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
      result = extractJson(text);
    } else {
      // CSV / plain text path
      const text = await file.text();
      const msg = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: `${PROMPT}\n\nדוח:\n${text}`,
          },
        ],
      });

      const responseText = msg.content[0].type === 'text' ? msg.content[0].text : '';
      result = extractJson(responseText);
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `שגיאה בעיבוד הקובץ: ${message}` }, { status: 500 });
  }
}
