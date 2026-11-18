import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { InvoiceData, generateInvoiceHtml } from '../utils/invoiceTemplate';

export interface GeneratePdfResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Generates an actual .pdf file in the app's sandboxed cache directory
 * using Android's native WebKit print engine (via expo-print).
 */
export async function generateInvoicePdf(invoiceData: InvoiceData): Promise<string> {
  const html = generateInvoiceHtml(invoiceData);
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
    margins: {
      left: 15,
      top: 15,
      right: 15,
      bottom: 15,
    },
  });
  return uri;
}

/**
 * Shares a generated PDF file via the Android/iOS Native Share Sheet.
 * expo-sharing automatically wraps the file in an Android FileProvider content:// URI
 * with FLAG_GRANT_READ_URI_PERMISSION so WhatsApp, Gmail, Drive, etc. can open it.
 */
export async function shareInvoicePdf(uri: string, billNumber: string): Promise<boolean> {
  const isSharingAvailable = await Sharing.isAvailableAsync();
  if (!isSharingAvailable) {
    Alert.alert(
      'Sharing Unavailable',
      'File sharing is not available on this device.'
    );
    return false;
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Share Bill #${billNumber}`,
    UTI: 'com.adobe.pdf',
  });
  return true;
}

/**
 * End-to-end helper: generates a real .pdf invoice file on the device and
 * launches the native Android/iOS Share Sheet (or browser Print-to-PDF on Web).
 */
export async function generateAndShareInvoicePdf(
  invoiceData: InvoiceData
): Promise<GeneratePdfResult> {
  try {
    // Web platform fallback: opens browser Print / Save as PDF dialog
    if (Platform.OS === 'web') {
      const html = generateInvoiceHtml(invoiceData);
      await Print.printAsync({ html });
      return { success: true };
    }

    const uri = await generateInvoicePdf(invoiceData);
    const shared = await shareInvoicePdf(uri, invoiceData.billNumber);

    return {
      success: shared,
      filePath: uri,
      error: shared ? undefined : 'Sharing is not available on this device.',
    };
  } catch (err: any) {
    console.error('[pdfService] Failed to generate or share PDF invoice:', err);
    Alert.alert(
      'PDF Generation Failed',
      err?.message || 'Could not generate the PDF bill. Please try again.'
    );
    return {
      success: false,
      error: err?.message || 'Unknown error generating PDF',
    };
  }
}
