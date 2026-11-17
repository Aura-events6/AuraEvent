/**
 * Luxury Print-Ready Invoice HTML Template for Aura Function Hall Management
 * Designed for standard A4 PDF generation via expo-print
 */

export interface InvoiceItem {
  title: string;
  amount: number;
  notes?: string | null;
}

export interface InvoiceData {
  hallName: string;
  hallPhone: string;
  hallAddress?: string | null;
  hallGst?: string | null;
  billNumber: string;
  invoiceDate?: string;
  customerName: string;
  customerMobile: string;
  eventType: string;
  packageName: string;
  eventDate: string;
  slot: string;
  basePrice: number;
  extraChargesItems?: InvoiceItem[];
  totalContractAmount: number;
  totalPaid: number;
  pendingBalance: number;
  paymentStatus: 'paid' | 'partial' | 'pending';
  promisedPayByDate?: string | null;
  upiId?: string | null;
  currencySymbol?: string;
}

export function generateInvoiceHtml(data: InvoiceData): string {
  const currency = data.currencySymbol || '₹';
  const isPaid = data.pendingBalance <= 0 || data.paymentStatus === 'paid';
  const isPartial = !isPaid && data.totalPaid > 0;

  const statusLabel = isPaid ? 'PAID IN FULL' : isPartial ? 'PARTIALLY PAID' : 'PAYMENT PENDING';
  const statusBg = isPaid ? '#ECFDF5' : isPartial ? '#FFFBEB' : '#FEF2F2';
  const statusColor = isPaid ? '#059669' : isPartial ? '#D97706' : '#DC2626';
  const statusBorder = isPaid ? '#A7F3D0' : isPartial ? '#FDE68A' : '#FECACA';

  const formattedEventDate = (() => {
    try {
      const d = new Date(data.eventDate);
      if (isNaN(d.getTime())) return data.eventDate;
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return data.eventDate;
    }
  })();

  const formattedInvoiceDate = (() => {
    try {
      const d = data.invoiceDate ? new Date(data.invoiceDate) : new Date();
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return new Date().toLocaleDateString('en-IN');
    }
  })();

  const slotLabel = (() => {
    switch (data.slot) {
      case 'full_day':
        return 'Full Day';
      case 'morning':
        return 'Morning Slot';
      case 'evening':
        return 'Evening Slot';
      default:
        return data.slot || 'Full Day';
    }
  })();

  const formatNumber = (num: number) => {
    return Number(num || 0).toLocaleString('en-IN');
  };

  const extraCharges = data.extraChargesItems || [];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Invoice #${data.billNumber} - ${data.hallName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 14mm 14mm 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1C1917;
      background: #FFFFFF;
      font-size: 13px;
      line-height: 1.5;
    }
    .invoice-wrapper {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
    }

    /* HEADER */
    .header-table {
      width: 100%;
      border-bottom: 2px solid #B07E34;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #1C1917;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      color: #8E6227;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .brand-contact {
      color: #78716C;
      font-size: 11px;
      margin-top: 6px;
      line-height: 1.4;
    }
    .invoice-badge-cell {
      text-align: right;
      vertical-align: top;
    }
    .invoice-heading {
      font-size: 26px;
      font-weight: 900;
      color: #B07E34;
      letter-spacing: 0.5px;
    }
    .invoice-number {
      font-size: 14px;
      font-weight: 700;
      color: #44403C;
      margin-top: 4px;
    }
    .status-pill {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-top: 8px;
      background: ${statusBg};
      color: ${statusColor};
      border: 1px solid ${statusBorder};
    }

    /* META CARDS */
    .meta-grid {
      width: 100%;
      margin-bottom: 22px;
      border-collapse: separate;
      border-spacing: 12px 0;
    }
    .meta-card {
      background: #FBF9F5;
      border: 1px solid #EAE3D2;
      border-radius: 10px;
      padding: 12px 14px;
      vertical-align: top;
      width: 50%;
    }
    .meta-card-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #8E6227;
      margin-bottom: 6px;
    }
    .meta-row {
      margin-bottom: 4px;
      font-size: 12px;
    }
    .meta-row strong {
      color: #1C1917;
      font-weight: 700;
    }
    .meta-row span {
      color: #57534E;
    }

    /* ITEMS TABLE */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      border: 1px solid #E7E5E4;
      border-radius: 8px;
      overflow: hidden;
    }
    .items-table th {
      background: #F5F1EA;
      color: #44403C;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      padding: 10px 14px;
      border-bottom: 1px solid #D6D3D1;
      text-align: left;
    }
    .items-table td {
      padding: 12px 14px;
      border-bottom: 1px solid #F5F5F4;
      font-size: 12px;
      color: #292524;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .items-table tr:nth-child(even) {
      background: #FAF8F5;
    }
    .text-right {
      text-align: right;
    }
    .item-title {
      font-weight: 700;
      color: #1C1917;
    }
    .item-desc {
      font-size: 11px;
      color: #78716C;
      margin-top: 2px;
    }

    /* TOTALS & BREAKDOWN */
    .summary-table {
      width: 100%;
      margin-top: 10px;
      margin-bottom: 24px;
    }
    .notes-box {
      width: 55%;
      vertical-align: top;
      padding-right: 20px;
    }
    .totals-box {
      width: 45%;
      vertical-align: top;
    }
    .totals-inner-table {
      width: 100%;
      border-collapse: collapse;
    }
    .totals-inner-table td {
      padding: 6px 10px;
      font-size: 13px;
    }
    .totals-inner-table .grand-row td {
      border-top: 1px solid #D6AE6B;
      border-bottom: 2px solid #B07E34;
      padding-top: 10px;
      padding-bottom: 10px;
      font-size: 15px;
      font-weight: 800;
      color: #1C1917;
    }
    .balance-due-box {
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: 8px;
      background: ${isPaid ? '#ECFDF5' : '#FEF2F2'};
      border: 1px solid ${isPaid ? '#A7F3D0' : '#FECACA'};
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .balance-title {
      font-size: 12px;
      font-weight: 700;
      color: ${isPaid ? '#065F46' : '#991B1B'};
    }
    .balance-amount {
      font-size: 17px;
      font-weight: 900;
      color: ${isPaid ? '#047857' : '#DC2626'};
    }

    .upi-badge {
      background: #FBF9F5;
      border: 1px dashed #D6AE6B;
      padding: 10px 12px;
      border-radius: 8px;
      margin-top: 10px;
      font-size: 11px;
      color: #44403C;
    }
    .upi-badge strong {
      color: #B07E34;
    }

    /* FOOTER */
    .footer {
      margin-top: 30px;
      padding-top: 14px;
      border-top: 1px solid #E7E5E4;
      text-align: center;
      color: #A8A29E;
      font-size: 10px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="invoice-wrapper">
    <!-- HEADER -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          <div class="brand-title">${data.hallName}</div>
          <div class="brand-sub">Luxury Function Hall & Convention</div>
          <div class="brand-contact">
            ${data.hallAddress ? `<div>📍 ${data.hallAddress}</div>` : ''}
            <div>📞 ${data.hallPhone}</div>
            ${data.hallGst ? `<div>GSTIN: <strong>${data.hallGst}</strong></div>` : ''}
          </div>
        </td>
        <td class="invoice-badge-cell">
          <div class="invoice-heading">TAX INVOICE</div>
          <div class="invoice-number">Bill #${data.billNumber}</div>
          <div><span class="status-pill">${statusLabel}</span></div>
          <div style="font-size: 11px; color: #78716C; margin-top: 6px;">Date: <strong>${formattedInvoiceDate}</strong></div>
        </td>
      </tr>
    </table>

    <!-- META CARDS -->
    <table class="meta-grid">
      <tr>
        <td class="meta-card">
          <div class="meta-card-title">Customer Details</div>
          <div class="meta-row"><span>Name:</span> <strong>${data.customerName}</strong></div>
          <div class="meta-row"><span>Phone:</span> <strong>${data.customerMobile}</strong></div>
        </td>
        <td class="meta-card">
          <div class="meta-card-title">Booking Details</div>
          <div class="meta-row"><span>Event:</span> <strong>${data.eventType}</strong> (${data.packageName})</div>
          <div class="meta-row"><span>Date:</span> <strong>${formattedEventDate}</strong></div>
          <div class="meta-row"><span>Slot:</span> <strong>${slotLabel}</strong></div>
        </td>
      </tr>
    </table>

    <!-- ITEMS TABLE -->
    <table class="items-table">
      <thead>
        <tr>
          <th style="width: 55px;">#</th>
          <th>Description</th>
          <th style="width: 120px;" class="text-right">Rate (${currency})</th>
          <th style="width: 140px;" class="text-right">Amount (${currency})</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>
            <div class="item-title">Base Hall Booking (${slotLabel})</div>
            <div class="item-desc">Package: ${data.packageName} • Event: ${data.eventType} on ${formattedEventDate}</div>
          </td>
          <td class="text-right">${formatNumber(data.basePrice)}</td>
          <td class="text-right"><strong>${formatNumber(data.basePrice)}</strong></td>
        </tr>
        ${extraCharges
          .map(
            (item, index) => `
        <tr>
          <td>${index + 2}</td>
          <td>
            <div class="item-title">${item.title}</div>
            ${item.notes ? `<div class="item-desc">${item.notes}</div>` : ''}
          </td>
          <td class="text-right">${formatNumber(item.amount)}</td>
          <td class="text-right"><strong>${formatNumber(item.amount)}</strong></td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <!-- SUMMARY SECTION -->
    <table class="summary-table">
      <tr>
        <td class="notes-box">
          <div style="font-size: 11px; font-weight: 700; color: #78716C; text-transform: uppercase; margin-bottom: 4px;">Terms & Notes</div>
          <div style="font-size: 11px; color: #78716C; line-height: 1.5;">
            • Booking confirmation and hall access are subject to full contract settlement prior to event commencement.<br/>
            • Electricity, additional lighting, or generator fuel overage (if any) are billed based on recorded meter readings.<br/>
            • All payments are non-refundable as per hall booking policies.
          </div>

          ${
            data.upiId && !isPaid
              ? `
          <div class="upi-badge">
            💳 <strong>Direct UPI Settlement:</strong><br/>
            UPI ID: <strong>${data.upiId}</strong><br/>
            Please share the transaction screenshot after payment.
          </div>
          `
              : ''
          }

          ${
            data.promisedPayByDate && !isPaid
              ? `
          <div style="margin-top: 8px; font-size: 11px; color: #B45309; background: #FEF3C7; padding: 6px 10px; border-radius: 6px;">
            ⚠️ <strong>Promised Settlement Date:</strong> ${data.promisedPayByDate}
          </div>
          `
              : ''
          }
        </td>

        <td class="totals-box">
          <table class="totals-inner-table">
            <tr>
              <td style="color: #78716C;">Base Hall Tariff:</td>
              <td class="text-right">${currency}${formatNumber(data.basePrice)}</td>
            </tr>
            ${
              extraCharges.length > 0
                ? `
            <tr>
              <td style="color: #78716C;">Extra Services Total:</td>
              <td class="text-right">${currency}${formatNumber(
                    extraCharges.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
                  )}</td>
            </tr>
            `
                : ''
            }
            <tr class="grand-row">
              <td>Total Contract Amount:</td>
              <td class="text-right">${currency}${formatNumber(data.totalContractAmount)}</td>
            </tr>
            <tr>
              <td style="color: #059669; font-weight: 700; padding-top: 8px;">Total Paid / Received:</td>
              <td class="text-right" style="color: #059669; font-weight: 700; padding-top: 8px;">${currency}${formatNumber(data.totalPaid)}</td>
            </tr>
          </table>

          <div class="balance-due-box">
            <span class="balance-title">${isPaid ? 'Balance Settled:' : 'Net Balance Due:'}</span>
            <span class="balance-amount">${currency}${formatNumber(data.pendingBalance)}</span>
          </div>
        </td>
      </tr>
    </table>

    <!-- FOOTER -->
    <div class="footer">
      Thank you for celebrating your precious moments at <strong>${data.hallName}</strong>.<br/>
      This is a computer-generated tax invoice and requires no physical signature.
    </div>
  </div>
</body>
</html>
  `.trim();
}
