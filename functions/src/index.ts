import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import Anthropic from '@anthropic-ai/sdk';

admin.initializeApp();
const db = admin.firestore();

// ─── Invoice Email Parser ─────────────────────────────────────
// POST https://<region>-<project>.cloudfunctions.net/processInvoiceEmail
// Body: { businessId: string, emailBody: string }
//
// Set the ANTHROPIC_API_KEY secret before deploying:
//   firebase functions:secrets:set ANTHROPIC_API_KEY

export const processInvoiceEmail = onRequest(
  { cors: true, secrets: ['ANTHROPIC_API_KEY'] },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { businessId, emailBody } = req.body as {
      businessId?: string;
      emailBody?: string;
    };

    if (!businessId || !emailBody) {
      res.status(400).json({ error: 'Missing businessId or emailBody' });
      return;
    }

    const bizRef = db.collection('businesses').doc(businessId);
    const bizDoc = await bizRef.get();
    if (!bizDoc.exists) {
      res.status(404).json({ error: 'Business not found' });
      return;
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `Parse this invoice/delivery note email and extract all line items.
Return ONLY valid JSON in this exact format, no extra text:
{
  "supplier": "supplier name or empty string",
  "items": [
    { "name": "item name", "quantity": 5, "unit": "יחידה", "price": 12.50 }
  ]
}

Rules:
- quantity must be a positive number
- price is per unit in ILS. Use 0 if unknown.
- unit must be one of: ק"ג, גרם, ליטר, מ"ל, יחידה, בקבוק, ארגז, שקית, אחר
- Keep original item names (Hebrew or any language)
- If no items found, return { "supplier": "", "items": [] }

Email content:
${emailBody.slice(0, 4000)}`,
          },
        ],
      });

      const content = message.content[0];
      if (content.type !== 'text') throw new Error('Unexpected response type from Claude');

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in Claude response');

      const parsed = JSON.parse(jsonMatch[0]) as {
        supplier: string;
        items: Array<{ name: string; quantity: number; unit: string; price: number }>;
      };

      const itemsRef = db.collection('businesses').doc(businessId).collection('items');
      const updatedItems: Array<{
        name: string;
        quantity: number;
        unit: string;
        price: number;
        itemId?: string;
        isNew?: boolean;
      }> = [];

      for (const parsedItem of parsed.items) {
        // Search for existing item by name (case-insensitive prefix match)
        const existingSnap = await itemsRef
          .where('name', '>=', parsedItem.name)
          .where('name', '<=', parsedItem.name + '\uf8ff')
          .limit(1)
          .get();

        if (!existingSnap.empty) {
          const existingDoc = existingSnap.docs[0];
          const updateData: Record<string, unknown> = {
            stock: admin.firestore.FieldValue.increment(parsedItem.quantity),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdatedBy: 'invoice',
          };
          if (parsedItem.price > 0) updateData.price = parsedItem.price;
          if (parsed.supplier) updateData.supplier = parsed.supplier;
          await existingDoc.ref.update(updateData);
          updatedItems.push({ ...parsedItem, itemId: existingDoc.id, isNew: false });
        } else {
          // Create new item
          const newItemRef = await itemsRef.add({
            name: parsedItem.name,
            category: 'אחר',
            unit: parsedItem.unit || 'יחידה',
            stock: parsedItem.quantity,
            minStock: 0,
            price: parsedItem.price || 0,
            supplier: parsed.supplier || '',
            sku: '',
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdatedBy: 'invoice',
          });
          updatedItems.push({ ...parsedItem, itemId: newItemRef.id, isNew: true });
        }
      }

      // Write success entry to invoiceLog
      await db
        .collection('businesses')
        .doc(businessId)
        .collection('invoiceLog')
        .add({
          parsedAt: admin.firestore.FieldValue.serverTimestamp(),
          supplier: parsed.supplier || '',
          itemsUpdated: updatedItems.length,
          items: updatedItems,
          rawText: emailBody.slice(0, 500),
          status: 'success',
        });

      res.json({
        success: true,
        supplier: parsed.supplier,
        itemsUpdated: updatedItems.length,
        items: updatedItems,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Write error entry to invoiceLog
      await db
        .collection('businesses')
        .doc(businessId)
        .collection('invoiceLog')
        .add({
          parsedAt: admin.firestore.FieldValue.serverTimestamp(),
          supplier: '',
          itemsUpdated: 0,
          items: [],
          rawText: emailBody.slice(0, 500),
          status: 'error',
          error: errorMsg,
        });

      res.status(500).json({ error: errorMsg });
    }
  }
);

// ─── Nightly Reorder Suggestions ─────────────────────────────
// Runs every day at 02:00 UTC.
// Clears old suggestions and writes fresh ones for each business.

export const calculateReorderSuggestions = onSchedule('every day 02:00', async () => {
  const businessesSnap = await db.collection('businesses').get();

  for (const bizDoc of businessesSnap.docs) {
    const businessId = bizDoc.id;
    const suggestionsRef = db
      .collection('businesses')
      .doc(businessId)
      .collection('reorderSuggestions');

    // Delete stale suggestions
    const oldSnap = await suggestionsRef.get();
    const batch = db.batch();
    oldSnap.docs.forEach((d) => batch.delete(d.ref));

    // Find items below minStock
    const itemsSnap = await db
      .collection('businesses')
      .doc(businessId)
      .collection('items')
      .where('minStock', '>', 0)
      .get();

    for (const itemDoc of itemsSnap.docs) {
      const item = itemDoc.data();
      if (typeof item.stock === 'number' && item.stock < item.minStock) {
        // Suggest ordering enough to reach 2× minStock
        const suggestedOrderQty = Math.max(
          Math.ceil(item.minStock * 2 - item.stock),
          item.minStock
        );
        batch.set(suggestionsRef.doc(), {
          itemId: itemDoc.id,
          itemName: item.name,
          currentStock: item.stock,
          minStock: item.minStock,
          suggestedOrderQty,
          supplier: item.supplier || '',
          unit: item.unit || 'יחידה',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    await batch.commit();
  }
});
