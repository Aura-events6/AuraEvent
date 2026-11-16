import { Linking } from 'react-native';

export interface WhatsAppBillParams {
  hallName: string;
  hallPhone: string;
  hallAddress?: string | null;
  customerName: string;
  customerMobile: string;
  billNumber: string;
  eventType: string;
  eventDate: string; // YYYY-MM-DD
  slot: string;
  totalContract: number;
  totalPaid: number;
  balanceDue: number;
  extraChargesItems?: Array<{ title: string; amount: number; notes?: string | null }>;
  promisedPayByDate?: string | null;
  upiId?: string | null;
}

export function formatWhatsAppBillText(params: WhatsAppBillParams): string {
  const formattedDate = new Date(params.eventDate).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const slotLabel =
    params.slot === 'full_day'
      ? 'Full Day'
      : params.slot === 'morning'
      ? 'Morning Slot'
      : 'Evening Slot';

  let message =
    `*BOOKING INVOICE & RECEIPT*\n` +
    `🏛️ *${params.hallName}*\n` +
    (params.hallAddress ? `📍 ${params.hallAddress}\n` : '') +
    `📞 Contact: ${params.hallPhone}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `📄 *Bill No:* ${params.billNumber}\n` +
    `👤 *Customer:* ${params.customerName}\n` +
    `🎉 *Event:* ${params.eventType}\n` +
    `📅 *Event Date:* ${formattedDate} (${slotLabel})\n` +
    `━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 *Total Contract:* ₹${params.totalContract.toLocaleString('en-IN')}\n` +
    `✅ *Total Paid:* ₹${params.totalPaid.toLocaleString('en-IN')}\n` +
    `⚠️ *Balance Due:* ₹${params.balanceDue.toLocaleString('en-IN')}\n`;

  if (params.extraChargesItems && params.extraChargesItems.length > 0) {
    message += `━━━━━━━━━━━━━━━━━━━━━\n*Extra Charges Breakdown:*\n`;
    params.extraChargesItems.forEach(item => {
      message += `• ${item.title}: ₹${Number(item.amount).toLocaleString('en-IN')}\n`;
    });
  }

  if (params.promisedPayByDate && params.balanceDue > 0) {
    const payBy = new Date(params.promisedPayByDate).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    message += `📆 *Promised Pay-By:* ${payBy}\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;

  if (params.balanceDue > 0 && params.upiId) {
    message += `\n💳 *Pay via UPI:* ${params.upiId}\n`;
  }

  message += `\nThank you for choosing ${params.hallName}! 🙏\n`;
  return message;
}

export async function shareBillOnWhatsApp(params: WhatsAppBillParams): Promise<boolean> {
  try {
    const text = formatWhatsAppBillText(params);
    const cleanMobile = params.customerMobile.replace(/\D/g, '');
    const phoneWithCountry = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;

    const encodedText = encodeURIComponent(text);
    const nativeUrl = `whatsapp://send?phone=${phoneWithCountry}&text=${encodedText}`;
    const webUrl = `https://wa.me/${phoneWithCountry}?text=${encodedText}`;

    const canOpen = await Linking.canOpenURL(nativeUrl);
    if (canOpen) {
      await Linking.openURL(nativeUrl);
      return true;
    } else {
      await Linking.openURL(webUrl);
      return true;
    }
  } catch (err) {
    console.warn('[WhatsApp] Failed to open WhatsApp:', err);
    return false;
  }
}

