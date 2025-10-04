import { addDoc, collection } from 'firebase/firestore';
import jsPDF from 'jspdf';
import { Calculator, Plus, Shield, Trash2 } from 'lucide-react';
import QRCode from 'qrcode';
import { QRCodeCanvas } from 'qrcode.react';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import { auth, db } from '../firebase';
import { computeHash, generateIntegrityChecksum, generateReceiptId } from '../utils/CryptoUtils';

const CreateReceipt = () => {
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState([{ name: '', quantity: 1, price: 0 }]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastReceiptId, setLastReceiptId] = useState('');

  // Currency options with symbols
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
    { code: 'INR', symbol: 'Rs', name: 'Indian Rupee' },
    { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
    { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
    { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
    { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
    { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
    { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
    { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
    { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
    { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint' },
    { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
    { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
    { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
    { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
    { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
    { code: 'THB', symbol: '฿', name: 'Thai Baht' },
    { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
    { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
    { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
    { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
    { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
    { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
    { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal' },
    { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar' },
    { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar' },
    { code: 'OMR', symbol: '﷼', name: 'Omani Rial' },
    { code: 'JOD', symbol: 'د.ا', name: 'Jordanian Dinar' },
    { code: 'LBP', symbol: '£', name: 'Lebanese Pound' },
    { code: 'EGP', symbol: '£', name: 'Egyptian Pound' },
    { code: 'ILS', symbol: '₪', name: 'Israeli Shekel' },
    { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
    { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
    { code: 'LKR', symbol: '₨', name: 'Sri Lankan Rupee' },
    { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee' },
    { code: 'AFN', symbol: '؋', name: 'Afghan Afghani' },
    { code: 'IRR', symbol: '﷼', name: 'Iranian Rial' },
    { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar' },
    { code: 'SYP', symbol: '£', name: 'Syrian Pound' },
    { code: 'YER', symbol: '﷼', name: 'Yemeni Rial' }
  ];

  // Get currency symbol for display
  const getCurrencySymbol = () => {
    const selectedCurrency = currencies.find(c => c.code === currency);
    return selectedCurrency ? selectedCurrency.symbol : '$';
  };

  // Format price with currency
  const formatPrice = (amount) => {
    const symbol = getCurrencySymbol();
    return `${symbol}${amount.toFixed(2)}`;
  };
  const getVerificationUrl = () => {
    return window.location.origin;
  };

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, price: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = field === 'name' ? value : parseFloat(value) || 0;
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const total = calculateTotal();
      const receiptId = generateReceiptId();
      
      const receiptData = {
        id: receiptId,
        customerName,
        items,
        date,
        currency,
        total,
        userId: auth.currentUser.uid,
        createdAt: new Date(),
        version: '1.0',
        tamperProof: true
      };

      // Compute hash client-side
      const hash = await computeHash(receiptData);
      
      // Generate additional integrity checksum
      const integrityChecksum = await generateIntegrityChecksum(receiptData, hash);

      // Save receipt with hash to Firestore
      await addDoc(collection(db, 'receipts'), {
        ...receiptData,
        hash,
        integrityChecksum,
        locked: true, // Prevent any modifications
        securityLevel: 'HIGH'
      });

      setLastReceiptId(receiptId);

      // Automatically generate and download PDF
      await generatePDF(receiptData, receiptId);

      // Reset form
      setCustomerName('');
      setItems([{ name: '', quantity: 1, price: 0 }]);
      setDate(new Date().toISOString().split('T')[0]);
      setCurrency('USD');

      alert('Receipt created and downloaded successfully!');
    } catch (error) {
      setError('Failed to create receipt: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (receiptData = null, receiptId = null) => {
    console.log('Starting PDF generation...');
    
    // Use provided data or fall back to last receipt
    const dataToUse = receiptData || {
      id: lastReceiptId,
      customerName,
      items,
      date,
      currency: currency || 'USD',
      total: calculateTotal()
    };
    const idToUse = receiptId || lastReceiptId;
    
    if (!idToUse) {
      alert('Please create a receipt first');
      return;
    }

    console.log('Generating PDF for receipt:', idToUse);

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Professional Header with Blue Background
    doc.setFillColor(37, 99, 235); // Blue background
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255); // White text
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('InvoiXe', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Tamper-Proof • Cryptographically Secured', pageWidth / 2, 28, { align: 'center' });
    
    // Reset text color for body
    doc.setTextColor(0, 0, 0);
    
    // Security Notice Box
    doc.setFillColor(255, 243, 205); // Light yellow background
    doc.setDrawColor(245, 158, 11); // Yellow border
    doc.rect(15, 45, pageWidth - 30, 25, 'FD');
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('SECURITY NOTICE', 20, 55);
    doc.setFont(undefined, 'normal');
    doc.text('This receipt is cryptographically secured. Verification checks our database,', 20, 62);
    doc.text('not this PDF file. Any changes to this PDF do not affect verification.', 20, 67);
    
    // Receipt Details Section
    doc.setFillColor(239, 246, 255); // Light blue background
    doc.rect(15, 80, pageWidth - 30, 60, 'F');
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('RECEIPT DETAILS', 20, 95);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Receipt ID: ${idToUse}`, 20, 110);
    doc.text(`Customer: ${dataToUse.customerName}`, 20, 120);
    doc.text(`Date: ${dataToUse.date}`, 20, 130);
    doc.text(`Currency: ${dataToUse.currency || 'Rs'} (${getCurrencySymbol(dataToUse.currency)})`, 20, 140);
    doc.text(`Security Level: MAXIMUM`, 120, 110);
    doc.text(`Status: TAMPER-PROOF`, 120, 120);
    doc.text(`Generated At: ${new Date().toLocaleTimeString()}`, 120, 130);
    
    // Get currency symbol for PDF
    const pdfCurrencySymbol = currencies.find(c => c.code === (dataToUse.currency || 'USD'))?.symbol || '$';
    
    // Format currency for PDF display (handle special characters)
    const formatPdfCurrency = (amount) => {
      const symbol = pdfCurrencySymbol;
      const formattedAmount = amount.toFixed(2);
      
      // Handle special currency symbols that might cause PDF issues
      const safeSymbol = symbol.length > 3 ? dataToUse.currency : symbol;
      return `${safeSymbol} ${formattedAmount}`;
    };
    
    // Items Table Header
    let yPos = 170;
    doc.setFillColor(37, 99, 235); // Blue header
    doc.rect(15, yPos - 10, pageWidth - 30, 15, 'F');
    doc.setFontSize(15);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255); // White text
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('ITEM', 20, yPos - 2);
    doc.text('QTY', 95, yPos - 2);
    doc.text('UNIT PRICE', 125, yPos - 2);
    doc.text('TOTAL', 165, yPos - 2);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    
    yPos += 10;
    
    // Items with alternating row colors and dynamic page breaks
    const pageHeight = doc.internal.pageSize.height;
    const bottomMargin = 30;
    const rowHeight = 12;
    const headerHeight = 15;
    let itemsStartY = yPos;
    dataToUse.items.forEach((item, index) => {
      // Check if we need to add a new page
      if (yPos + rowHeight + bottomMargin > pageHeight) {
        doc.addPage();
        yPos = 20;

        // Redraw table header on new page
        doc.setFillColor(37, 99, 235); // Blue header
        doc.rect(15, yPos - 10, pageWidth - 30, headerHeight, 'F');
        doc.setFontSize(15);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255); // White text
        doc.setFont(undefined, 'bold');
        doc.setFontSize(10);
        doc.text('ITEM', 20, yPos - 2);
        doc.text('QTY', 95, yPos - 2);
        doc.text('UNIT PRICE', 125, yPos - 2);
        doc.text('TOTAL', 165, yPos - 2);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
        yPos += 10;
      }

      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251); // Light gray for even rows
        doc.rect(15, yPos - 5, pageWidth - 30, rowHeight, 'F');
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text(item.name, 20, yPos);
      doc.text(item.quantity.toString(), 95, yPos);
      doc.text(formatPdfCurrency(item.price), 125, yPos);
      doc.text(formatPdfCurrency(item.quantity * item.price), 165, yPos);
      yPos += rowHeight;
    });

    // Check if there's enough space for the total section, else add new page
    if (yPos + 30 > pageHeight) {
      doc.addPage();
      yPos = 20;
    }

    // Total Section with Green Background
    yPos += 10;
    doc.setFillColor(220, 252, 231); // Light green background
    doc.setDrawColor(34, 197, 94); // Green border
    doc.rect(15, yPos - 5, pageWidth - 30, 20, 'FD');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: ${formatPdfCurrency(dataToUse.total)}`, pageWidth - 20, yPos + 5, { align: 'right' });

    // Check if there's enough space for the QR code section, else add new page
    if (yPos + 60 > pageHeight) {
      doc.addPage();
      yPos = 20;
    }

    // QR Code Section
    yPos += 35;
    doc.setFillColor(240, 253, 244); // Very light green
    doc.setDrawColor(34, 197, 94); // Green border
    doc.rect(15, yPos, pageWidth - 30, 40, 'FD');

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('SCAN TO VERIFY AUTHENTICITY', 20, yPos + 12);

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Verification URL: ${getVerificationUrl()}/verify/${idToUse}`, 20, yPos + 20);
    doc.text('Scan the QR code or visit the URL above to verify this receipt', 20, yPos + 27);
    doc.text('Verification checks our secure database for tampering', 20, yPos + 34);

    console.log('Adding QR code to PDF...');

    // Generate QR Code and add to PDF
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(`${getVerificationUrl()}/verify/${idToUse}`, {
        width: 100,
        margin: 1,

        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      console.log('QR Code generated successfully, adding to PDF...');

      // Add QR code image to PDF
      doc.addImage(qrCodeDataUrl, 'PNG', pageWidth - 50, yPos + 5, 30, 30);

      console.log('QR Code added to PDF successfully');
    } catch (error) {
      console.error('QR Code generation error:', error);
      // Fallback: Add text indicating QR code should be here
      doc.setFontSize(8);
      doc.text('[QR CODE]', pageWidth - 45, yPos + 20);
    }

    // Footer
    yPos += 50;
    if (yPos + 16 > pageHeight) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('This receipt uses SHA-256 cryptographic hashing for tamper detection.', pageWidth / 2, yPos, { align: 'center' });
    doc.text('Generated by Professional Receipt System', pageWidth / 2, yPos + 8, { align: 'center' });

    console.log('Saving PDF...');
    doc.save(`receipt-${idToUse}.pdf`);
    console.log('PDF saved successfully');
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={auth.currentUser} />
      
      <div className="container py-8">
        <div className="card" style={{maxWidth: '56rem', margin: '0 auto'}}>
          <div className="text-center mb-8">
            <div className="icon-circle">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Create Receipt</h2>
            <p className="text-gray-600 mt-2">Generate a cryptographically secured receipt that cannot be modified</p>
            <div className="alert alert-warning mt-4">
              <p className="text-sm">
                <strong>Security Notice:</strong> Once created, receipts are permanently locked and cannot be edited by any software
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  required
                >
                  {currencies.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <div className="flex justify-between items-center mb-4">
                <label className="text-lg font-medium text-gray-900">Items</label>
              </div>

              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {items.map((item, index) => (
                  <div key={index} className="item-row">
                    <div>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        placeholder="Item name"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                        placeholder="Qty"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                        placeholder="Price"
                        required
                      />
                    </div>
                    <div className="item-total">
                      <span className="font-medium text-gray-900">
                        {formatPrice(item.quantity * item.price)}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 p-1 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Item button moved to bottom and centered */}
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={addItem}
                  className="btn btn-success"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="receipt-total">
                <div className="flex items-center">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  <span className="text-lg font-semibold text-blue-900 ml-2">Total:</span>
                </div>
                <span className="text-2xl font-bold text-blue-900">
                  {formatPrice(calculateTotal())}
                </span>
              </div>
            </div>

            {error && (
              <div className="alert alert-error">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex" style={{gap: '1rem'}}>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? (
                  <div className="loading-spinner"></div>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    <span>Create & Download Receipt</span>
                  </>
                )}
              </button>

              {lastReceiptId && (
                <button
                  type="button"
                  onClick={generatePDF}
                  className="btn btn-success"
                >

                </button>
              )}
            </div>
          </form>

          {lastReceiptId && (
            <div className="qr-section">
              <div className="qr-info">
                <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900 ml-2">Tamper-Proof Receipt Created</h3>
                </div>
                <p className="text-sm text-gray-600">Receipt ID:</p>
                <p className="font-mono text-sm font-semibold">{lastReceiptId}</p>
                <p className="text-sm text-gray-600 mt-2">Verification URL:</p>
                <p className="text-sm font-medium text-blue-600">
                  {window.location.origin}/verify/{lastReceiptId}
                </p>
                <p className="text-xs text-green-700 mt-2">
                  ✅ Receipt is now permanently secured and cannot be modified
                </p>
              </div>
              <div className="qr-code">
                  <QRCodeCanvas
                    value={`${window.location.origin}/verify/${lastReceiptId}`} 
                    size={100}
                  />
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateReceipt;