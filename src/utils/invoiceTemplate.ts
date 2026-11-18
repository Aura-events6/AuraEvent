import { ExtraChargeItem } from '../types/booking';

export interface InvoicePaymentEntry {
  date: string;
  mode: string;
  amount: number;
  notes?: string | null;
}

export interface InvoiceData {
  billNumber: string;
  invoiceDate?: string;
  hallName: string;
  hallPhone?: string | null;
  hallAddress?: string | null;
  hallGst?: string | null;
  customerName: string;
  customerMobile?: string | null;
  eventType: string;
  eventDate: string;
  endDate?: string | null;
  slot: string;
  packageName?: string | null;
  basePrice: number;
  extraChargesItems?: ExtraChargeItem[] | null;
  extraChargesTotal?: number;
  totalContract: number;
  totalPaid: number;
  balanceDue: number;
  promisedPayByDate?: string | null;
  payments?: InvoicePaymentEntry[];
  currencySymbol?: string;
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatSlotLabel(slot: string): string {
  switch (slot) {
    case 'morning':
      return 'Morning Slot';
    case 'evening':
      return 'Evening Slot';
    case 'full_day':
      return 'Full Day (24 Hrs)';
    default:
      return slot || 'Full Day';
  }
}

function formatMoney(amount: number, symbol: string): string {
  const num = Number(amount) || 0;
  return `${symbol}${num.toLocaleString('en-IN')}`;
}

/**
 * Generates a print-ready, luxury Royal Gold HTML invoice document
 * tailored for Android WebKit PDF generation (expo-print) and Web Print-to-PDF.
 */
export function generateInvoiceHtml(data: InvoiceData): string {
  const sym = data.currencySymbol || '₹';
  const generatedDate =
    data.invoiceDate ||
    new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const isPaid = (Number(data.balanceDue) || 0) <= 0;
  const dateDisplay =
    data.endDate && data.endDate !== data.eventDate
      ? `${escapeHtml(data.eventDate)} to ${escapeHtml(data.endDate)}`
      : escapeHtml(data.eventDate);

  const slotLabel = formatSlotLabel(data.slot);

  // Build line items
  const lineItems: { title: string; subtitle?: string; amount: number }[] = [
    {
      title: `${data.packageName || 'Hall Booking Package'} — ${data.eventType || 'Event'}`,
      subtitle: `${dateDisplay} • ${slotLabel}`,
      amount: Number(data.basePrice) || 0,
    },
  ];

  if (data.extraChargesItems && data.extraChargesItems.length > 0) {
    data.extraChargesItems.forEach((extra) => {
      if (Number(extra.amount) > 0) {
        lineItems.push({
          title: extra.title || 'Additional Charge',
          subtitle: 'Extra Service / Facility',
          amount: Number(extra.amount) || 0,
        });
      }
    });
  } else if (Number(data.extraChargesTotal) > 0) {
    lineItems.push({
      title: 'Extra Charges & Add-ons',
      subtitle: 'Additional Services',
      amount: Number(data.extraChargesTotal) || 0,
    });
  }

  const itemsHtml = lineItems
    .map(
      (item, idx) => `
      <tr>
        <td class="col-idx">${idx + 1}</td>
        <td class="col-desc">
          <div class="item-title">${escapeHtml(item.title)}</div>
          ${item.subtitle ? `<div class="item-sub">${escapeHtml(item.subtitle)}</div>` : ''}
        </td>
        <td class="col-amt">${formatMoney(item.amount, sym)}</td>
      </tr>
    `
    )
    .join('');

  // Optional payment ledger section
  const paymentsHtml =
    data.payments && data.payments.length > 0
      ? `
      <div class="section-block">
        <div class="section-title">Payment History</div>
        <table class="ledger-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Mode</th>
              <th style="text-align: right;">Amount Paid</th>
            </tr>
          </thead>
          <tbody>
            ${data.payments
              .map(
                (p) => `
              <tr>
                <td>${escapeHtml(p.date)}</td>
                <td style="text-transform: uppercase; font-weight: 600;">${escapeHtml(p.mode)}</td>
                <td style="text-align: right; font-weight: 700; color: #059669;">${formatMoney(p.amount, sym)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `
      : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Invoice ${escapeHtml(data.billNumber)}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 14mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1C1917;
          margin: 0;
          padding: 20px;
          background-color: #FFFFFF;
          line-height: 1.45;
        }
        .accent-bar {
          height: 6px;
          background: linear-gradient(90deg, #D6AE6B 0%, #B07E34 100%);
          border-radius: 4px;
          margin-bottom: 22px;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .hall-name {
          font-size: 22px;
          font-weight: 800;
          color: #8E6227;
          letter-spacing: -0.4px;
          margin: 0 0 4px 0;
        }
        .hall-meta {
          font-size: 12px;
          color: #57534E;
          margin: 2px 0;
        }
        .invoice-label {
          font-size: 24px;
          font-weight: 800;
          color: #1C1917;
          letter-spacing: 0.5px;
          text-align: right;
          margin: 0 0 6px 0;
        }
        .invoice-meta {
          font-size: 12px;
          color: #57534E;
          text-align: right;
          margin: 2px 0;
        }
        .status-badge {
          display: inline-block;
          margin-top: 8px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.6px;
          text-transform: uppercase;
        }
        .status-paid {
          background-color: #D1FAE5;
          color: #065F46;
          border: 1px solid #A7F3D0;
        }
        .status-due {
          background-color: #FEE2E2;
          color: #991B1B;
          border: 1px solid #FECACA;
        }
        .info-grid {
          width: 100%;
          border-collapse: separate;
          border-spacing: 12px 0;
          margin: 0 -12px 24px -12px;
        }
        .info-card {
          width: 50%;
          vertical-align: top;
          background-color: #FCFBF9;
          border: 1px solid #EFE0C2;
          border-radius: 12px;
          padding: 14px;
        }
        .card-eyebrow {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          color: #B07E34;
          margin-bottom: 6px;
        }
        .customer-name {
          font-size: 15px;
          font-weight: 800;
          color: #1C1917;
          margin-bottom: 3px;
        }
        .info-line {
          font-size: 12px;
          color: #57534E;
          margin: 2px 0;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          page-break-inside: auto;
        }
        .items-table tr {
          page-break-inside: avoid;
        }
        .items-table th {
          background-color: #F7EFE0;
          color: #6F4D22;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 10px 12px;
          text-align: left;
          border-bottom: 2px solid #E4C998;
        }
        .items-table td {
          padding: 12px;
          border-bottom: 1px solid #F3F4F6;
          vertical-align: top;
        }
        .col-idx {
          width: 36px;
          font-size: 12px;
          font-weight: 600;
          color: #78716C;
        }
        .col-desc {
          text-align: left;
        }
        .item-title {
          font-size: 13px;
          font-weight: 700;
          color: #1C1917;
        }
        .item-sub {
          font-size: 11px;
          color: #78716C;
          margin-top: 2px;
        }
        .col-amt {
          width: 140px;
          text-align: right;
          font-size: 13px;
          font-weight: 700;
          color: #1C1917;
          font-variant-numeric: tabular-nums;
        }
        .summary-wrap {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .summary-label {
          text-align: right;
          padding: 6px 14px;
          font-size: 13px;
          color: #57534E;
        }
        .summary-val {
          width: 150px;
          text-align: right;
          padding: 6px 12px;
          font-size: 14px;
          font-weight: 700;
          color: #1C1917;
          font-variant-numeric: tabular-nums;
        }
        .summary-total-row td {
          border-top: 2px solid #D6AE6B;
          border-bottom: 1px solid #EFE0C2;
          padding-top: 10px;
          padding-bottom: 10px;
          font-size: 15px;
          font-weight: 800;
          color: #1C1917;
        }
        .summary-due-row td {
          background-color: #FEF2F2;
          padding-top: 10px;
          padding-bottom: 10px;
          font-size: 15px;
          font-weight: 800;
          color: #DC2626;
        }
        .summary-settled-row td {
          background-color: #ECFDF5;
          padding-top: 10px;
          padding-bottom: 10px;
          font-size: 15px;
          font-weight: 800;
          color: #059669;
        }
        .section-block {
          margin-top: 20px;
          page-break-inside: avoid;
        }
        .section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.6px;
          color: #8E6227;
          margin-bottom: 8px;
        }
        .ledger-table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #EFE0C2;
          border-radius: 8px;
        }
        .ledger-table th {
          background-color: #FCF9F2;
          font-size: 11px;
          font-weight: 700;
          color: #6F4D22;
          padding: 8px 10px;
          text-align: left;
          border-bottom: 1px solid #EFE0C2;
        }
        .ledger-table td {
          font-size: 12px;
          color: #44403C;
          padding: 8px 10px;
          border-bottom: 1px solid #F5F5F4;
        }
        .promised-box {
          margin-top: 14px;
          padding: 10px 14px;
          background-color: #FFFBEB;
          border: 1px solid #FDE68A;
          border-radius: 8px;
          font-size: 12px;
          color: #92400E;
          font-weight: 600;
        }
        .footer {
          margin-top: 34px;
          padding-top: 14px;
          border-top: 1px dashed #D6D3D1;
          text-align: center;
          font-size: 11px;
          color: #78716C;
        }
      </style>
    </head>
    <body>
      <div class="accent-bar"></div>

      <!-- Header -->
      <table class="header-table">
        <tr>
          <td style="vertical-align: top; width: 60%;">
            <div class="hall-name">${escapeHtml(data.hallName)}</div>
            ${data.hallAddress ? `<div class="hall-meta">${escapeHtml(data.hallAddress)}</div>` : ''}
            ${data.hallPhone ? `<div class="hall-meta">Phone: ${escapeHtml(data.hallPhone)}</div>` : ''}
            ${data.hallGst ? `<div class="hall-meta">GSTIN: ${escapeHtml(data.hallGst)}</div>` : ''}
          </td>
          <td style="vertical-align: top; text-align: right; width: 40%;">
            <div class="invoice-label">BILL / RECEIPT</div>
            <div class="invoice-meta"><b>Bill No:</b> ${escapeHtml(data.billNumber)}</div>
            <div class="invoice-meta"><b>Date:</b> ${escapeHtml(generatedDate)}</div>
            <div>
              <span class="status-badge ${isPaid ? 'status-paid' : 'status-due'}">
                ${isPaid ? 'Paid & Settled' : 'Balance Due'}
              </span>
            </div>
          </td>
        </tr>
      </table>

      <!-- Customer & Event Info -->
      <table class="info-grid">
        <tr>
          <td class="info-card">
            <div class="card-eyebrow">Billed To</div>
            <div class="customer-name">${escapeHtml(data.customerName)}</div>
            ${data.customerMobile ? `<div class="info-line">Mobile: +91 ${escapeHtml(data.customerMobile)}</div>` : ''}
          </td>
          <td class="info-card">
            <div class="card-eyebrow">Event Schedule</div>
            <div class="customer-name">${escapeHtml(data.eventType || 'Function Event')}</div>
            <div class="info-line"><b>Date:</b> ${dateDisplay}</div>
            <div class="info-line"><b>Slot:</b> ${escapeHtml(slotLabel)}</div>
          </td>
        </tr>
      </table>

      <!-- Line Items -->
      <table class="items-table">
        <thead>
          <tr>
            <th style="width: 36px;">#</th>
            <th>Description</th>
            <th style="width: 140px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <table class="summary-wrap">
        <tr class="summary-total-row">
          <td></td>
          <td class="summary-label">Total Contract Amount</td>
          <td class="summary-val">${formatMoney(data.totalContract, sym)}</td>
        </tr>
        <tr>
          <td></td>
          <td class="summary-label">Total Amount Paid</td>
          <td class="summary-val" style="color: #059669;">- ${formatMoney(data.totalPaid, sym)}</td>
        </tr>
        <tr class="${isPaid ? 'summary-settled-row' : 'summary-due-row'}">
          <td></td>
          <td class="summary-label" style="color: inherit; font-weight: 800;">
            ${isPaid ? 'Balance Due (Settled)' : 'Pending Balance Due'}
          </td>
          <td class="summary-val" style="color: inherit;">
            ${formatMoney(Math.max(0, data.balanceDue), sym)}
          </td>
        </tr>
      </table>

      ${
        !isPaid && data.promisedPayByDate
          ? `<div class="promised-box">Promised Balance Settlement Date: ${escapeHtml(data.promisedPayByDate)}</div>`
          : ''
      }

      ${paymentsHtml}

      <div class="footer">
        Thank you for celebrating with <b>${escapeHtml(data.hallName)}</b>.<br/>
        This is a computer-generated receipt and requires no physical signature.
      </div>
    </body>
    </html>
  `;
}
