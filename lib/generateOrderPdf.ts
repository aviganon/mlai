import jsPDF from 'jspdf';

export function generateOrderPdf(
  supplierName: string,
  items: { name: string; quantity?: number; qty?: number; unit: string }[],
  businessName: string
): Blob {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(`Order - ${supplierName}`, 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(`From: ${businessName}`, 105, 30, { align: 'center' });
  doc.text(`Date: ${new Date().toLocaleDateString('he-IL')}`, 105, 38, { align: 'center' });

  doc.setFontSize(14);
  doc.text('Items:', 20, 52);

  doc.setFontSize(11);
  let y = 62;
  items.forEach((item, i) => {
    doc.text(`${i + 1}. ${item.name} - ${item.quantity ?? item.qty ?? 0} ${item.unit}`, 20, y);
    y += 8;
  });

  return doc.output('blob');
}
