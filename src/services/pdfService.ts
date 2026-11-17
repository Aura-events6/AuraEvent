import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { InvoiceData, generateInvoiceHtml } from '../utils/invoiceTemplate';

/**
 * Generates an actual .pdf file in the application's scoped cache directory
 * using expo-print.
 * 
 * Works seamlessly with React Native 0.76+ and New Architecture (TurboModules).
 */
export async function generateInvoicePdf(invoiceData: InvoiceData): Promise<string> {
  const html = generateInvoiceHtml(invoiceData);
  const { uri } = await Print.printToFileAsync({
    html,
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
 * Shares the generated PDF file using the native Android share sheet.
 * expo-sharing internally uses Android FileProvider with FLAG_GRANT_READ_URI_PERMISSION
 * to allow apps like WhatsApp, Gmail, and Drive to read the file.
 */
export async function shareInvoicePdf(uri: string, billNumber: string): Promise<boolean> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert('Sharing Unavailable', 'Native file sharing is not available on this device.');
    return false;
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Share Invoice #${billNumber}`,
    UTI: 'com.adobe.pdf',
  });
  return true;
}

/**
 * End-to-end helper: renders HTML -> writes .pdf to storage -> launches native share sheet.
 */
export async function generateAndShareInvoicePdf(invoiceData: InvoiceData): Promise<string | null> {
  try {
    const uri = await generateInvoicePdf(invoiceData);
    await shareInvoicePdf(uri, invoiceData.billNumber);
    return uri;
  } catch (error: any) {
    console.error('[PDFService] Error generating or sharing PDF invoice:', error);
    Alert.alert('PDF Generation Failed', error?.message || 'Failed to create or share the PDF bill.');
    return null;
  }
}
