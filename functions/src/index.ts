import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import Anthropic from '@anthropic-ai/sdk';

admin.initializeApp();
const db = admin.firestore();

function extractBusinessIdFromRecipient(
  recipient: string
): { businessId: string; type: 'invoice' | 'sales' } | null {
  const invoiceMatch = recipient.match(/^invoices\+([^@]+)@inbound\.galis\.app$/i);
  if (invoiceMatch) return { businessId: invoiceMatch[1], type: 'invoice' };
  const salesMatch = recipient.match(/^sales\+([^@]+)@inbound\.galis\.app$/i);
  if (salesMatch) return { businessId: salesMatch[1], type: 'sales' };
  return null;
}

async function findBusinessByEmail(
  recipient: string
): Promise<{ business: admin.firestore.QueryDocumentSnapshot; type: 'invoice' | 'sales' } | null> {
  const invoiceSnap = await db.collection('businesses').where('invoiceEmail', '==', recipient).limit(1).get();
  if (!invoiceSnap.empty) return { business: invoiceSnap.docs[0], type: 'invoice' };
  const salesSnap = await db.collection('businesses').where('salesEmail', '==', recipient).limit(1).get();
  if (!salesSnap.empty) return { business: salesSnap.docs[0], type: 'sales' };
  return null;
}

export const processInvoiceEmail = onRequest(
  { cors: true, secrets: ['ANTHROPIC_API_KEY'] },
  async (req, res) => {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
    const body = req.body as Record<string, string>;
    const recipient: string | undefined = body['recipient'];
    const emailBody: string = body['body-plain'] ?? body['body-html'] ?? body['emailBody'] ?? '';
    if (!recipient) { res.status(400).json({ error: 'Missing recipient field' }); return; }
    if (!emailBody) { res.status(400).json({ error: 'Missing email body' }); return; }

    const extracted = extractBusinessIdFromRecipient(recipient);
    let businessId: string;
    let emailType: 'invoice' | 'sales';

    if (extracted) {
      businessId = extracted.businessId;
      emailType = extracted.type;
      const bizDoc = await db.collection('businesses').doc(businessId).get();
      if (!bizDoc.exists) { res.status(404).json({ error: `Business not found: ${businessId}` }); return; }
    } else {
      const legacyMatch = await findBusinessByEmail(recipient);
      if (!legacyMatch) { res.status(404).json({ error: `No business found for recipient: ${recipient}` }); return; }
      businessId = legacyMatch.business.id;
      emailType = legacyMatch.type;
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    try {
      let claudePrompt: string;
      if (emailType === 'invoice') {
        claudePrompt = `Parse this invoice/delivery note email and extract all line items.
Return ONLY valid JSON: {"supplier":"","items":[{"name":"item name","quantity":5,"unit":"יחידה","price":12.50}]}
Rules: quantity positive number, price per unit ILS (0 if unknown), unit one of: ק"ג,גרם,ליטר,מ"ל,יחידה,בקבוק,ארגז,שקית,אחר
Email: ${emailBody.slice(0, 4000)}`;
      } else {
        claudePrompt = `Analyze this sales report. Extract sold items.
Return ONLY valid JSON: {"items":[{"name":"item name","qtySold":3}]}
Rules: qtySold positive number, items were SOLD (will DECREASE inventory)
Email: ${emailBody.slice(0, 4000)}`;
      }

      const message = await anthropic.messages.create({
        model: 'claude-opus-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: claudePrompt }],
      });
      const content = message.content[0];
      if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in Claude response');
      const itemsRef = db.collection('businesses').doc(businessId).collection('items');

      if (emailType === 'invoice') {
        const parsed = JSON.parse(jsonMatch[0]) as { supplier: string; items: Array<{ name: string; quantity: number; unit: string; price: number }> };
        const updatedItems: Array<{ name: string; quantity: number; unit: string; price: number; itemId?: string; isNew?: boolean }> = [];
        for (const parsedItem of parsed.items) {
          const existingSnap = await itemsRef.where('name', '>=', parsedItem.name).where('name', '<=', parsedItem.name + '\uf8ff').limit(1).get();
          if (!existingSnap.empty) {
            const existingDoc = existingSnap.docs[0];
            const updateData: Record<string, unknown> = { stock: admin.firestore.FieldValue.increment(parsedItem.quantity), lastUpdated: admin.firestore.FieldValue.serverTimestamp(), lastUpdatedBy: 'invoice' };
            if (parsedItem.price > 0) updateData.price = parsedItem.price;
            if (parsed.supplier) updateData.supplier = parsed.supplier;
            await existingDoc.ref.update(updateData);
            updatedItems.push({ ...parsedItem, itemId: existingDoc.id, isNew: false });
          } else {
            const newItemRef = await itemsRef.add({ name: parsedItem.name, category: 'אחר', unit: parsedItem.unit || 'יחידה', stock: parsedItem.quantity, minStock: 0, price: parsedItem.price || 0, supplier: parsed.supplier || '', sku: '', lastUpdated: admin.firestore.FieldValue.serverTimestamp(), lastUpdatedBy: 'invoice' });
            updatedItems.push({ ...parsedItem, itemId: newItemRef.id, isNew: true });
          }
        }
        await db.collection('businesses').doc(businessId).collection('invoiceLog').add({ parsedAt: admin.firestore.FieldValue.serverTimestamp(), supplier: parsed.supplier || '', itemsUpdated: updatedItems.length, items: updatedItems, rawText: emailBody.slice(0, 500), status: 'success' });
        res.json({ success: true, type: 'invoice', supplier: parsed.supplier, itemsUpdated: updatedItems.length, items: updatedItems });
      } else {
        const parsed = JSON.parse(jsonMatch[0]) as { items: Array<{ name: string; qtySold: number }> };
        const updatedItems: Array<{ name: string; qtySold: number; itemId?: string; found: boolean }> = [];
        for (const parsedItem of parsed.items) {
          const existingSnap = await itemsRef.where('name', '>=', parsedItem.name).where('name', '<=', parsedItem.name + '\uf8ff').limit(1).get();
          if (!existingSnap.empty) {
            const existingDoc = existingSnap.docs[0];
            const currentStock: number = existingDoc.data().stock ?? 0;
            await existingDoc.ref.update({ stock: Math.max(0, currentStock - parsedItem.qtySold), lastUpdated: admin.firestore.FieldValue.serverTimestamp(), lastUpdatedBy: 'sale' });
            updatedItems.push({ ...parsedItem, itemId: existingDoc.id, found: true });
          } else {
            updatedItems.push({ ...parsedItem, found: false });
          }
        }
        await db.collection('businesses').doc(businessId).collection('salesLog').add({ parsedAt: admin.firestore.FieldValue.serverTimestamp(), itemsUpdated: updatedItems.filter(i => i.found).length, items: updatedItems, rawText: emailBody.slice(0, 500), status: 'success' });
        res.json({ success: true, type: 'sales', itemsUpdated: updatedItems.filter(i => i.found).length, items: updatedItems });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const logCollection = emailType === 'invoice' ? 'invoiceLog' : 'salesLog';
      await db.collection('businesses').doc(businessId).collection(logCollection).add({ parsedAt: admin.firestore.FieldValue.serverTimestamp(), supplier: '', itemsUpdated: 0, items: [], rawText: emailBody.slice(0, 500), status: 'error', error: errorMsg });
      res.status(500).json({ error: errorMsg });
    }
  }
);

export const calculateReorderSuggestions = onSchedule('every day 02:00', async () => {
  const businessesSnap = await db.collection('businesses').get();
  for (const bizDoc of businessesSnap.docs) {
    const businessId = bizDoc.id;
    const suggestionsRef = db.collection('businesses').doc(businessId).collection('reorderSuggestions');
    const oldSnap = await suggestionsRef.get();
    const batch = db.batch();
    oldSnap.docs.forEach(d => batch.delete(d.ref));
    const itemsSnap = await db.collection('businesses').doc(businessId).collection('items').where('minStock', '>', 0).get();
    for (const itemDoc of itemsSnap.docs) {
      const item = itemDoc.data();
      if (typeof item.stock === 'number' && item.stock < item.minStock) {
        const suggestedOrderQty = Math.max(Math.ceil(item.minStock * 2 - item.stock), item.minStock);
        batch.set(suggestionsRef.doc(), { itemId: itemDoc.id, itemName: item.name, currentStock: item.stock, minStock: item.minStock, suggestedOrderQty, supplier: item.supplier || '', unit: item.unit || 'יחידה', createdAt: admin.firestore.FieldValue.serverTimestamp() });
      }
    }
    await batch.commit();
  }
});
