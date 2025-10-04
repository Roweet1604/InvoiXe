import { collection, getDocs, query, where } from 'firebase/firestore';
import { AlertTriangle, Lock, Search, Shield, Clock as Unlock } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { verifyHash } from '../utils/CryptoUtils';

const VerifyReceipt = () => {
  const { id } = useParams();
  const [receiptId, setReceiptId] = useState(id || '');
  const [receipt, setReceipt] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      verifyReceipt(id);
    }
  }, [id]);

  // Get currency symbol for display
  const getCurrencySymbol = (currencyCode) => {
    const currencies = [
      { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' }, { code: 'GBP', symbol: '£' },
      { code: 'JPY', symbol: '¥' }, { code: 'CAD', symbol: 'C$' }, { code: 'AUD', symbol: 'A$' },
      { code: 'CHF', symbol: 'CHF' }, { code: 'CNY', symbol: '¥' }, { code: 'INR', symbol: '₹' },
      { code: 'KRW', symbol: '₩' }, { code: 'SGD', symbol: 'S$' }, { code: 'HKD', symbol: 'HK$' },
      { code: 'NOK', symbol: 'kr' }, { code: 'SEK', symbol: 'kr' }, { code: 'DKK', symbol: 'kr' },
      { code: 'PLN', symbol: 'zł' }, { code: 'CZK', symbol: 'Kč' }, { code: 'HUF', symbol: 'Ft' },
      { code: 'RUB', symbol: '₽' }, { code: 'BRL', symbol: 'R$' }, { code: 'MXN', symbol: '$' },
      { code: 'ZAR', symbol: 'R' }, { code: 'TRY', symbol: '₺' }, { code: 'NZD', symbol: 'NZ$' },
      { code: 'THB', symbol: '฿' }, { code: 'MYR', symbol: 'RM' }, { code: 'IDR', symbol: 'Rp' },
      { code: 'PHP', symbol: '₱' }, { code: 'VND', symbol: '₫' }, { code: 'AED', symbol: 'د.إ' },
      { code: 'SAR', symbol: '﷼' }, { code: 'QAR', symbol: '﷼' }, { code: 'KWD', symbol: 'د.ك' },
      { code: 'BHD', symbol: '.د.ب' }, { code: 'OMR', symbol: '﷼' }, { code: 'JOD', symbol: 'د.ا' },
      { code: 'LBP', symbol: '£' }, { code: 'EGP', symbol: '£' }, { code: 'ILS', symbol: '₪' },
      { code: 'PKR', symbol: '₨' }, { code: 'BDT', symbol: '৳' }, { code: 'LKR', symbol: '₨' },
      { code: 'NPR', symbol: '₨' }, { code: 'AFN', symbol: '؋' }, { code: 'IRR', symbol: '﷼' },
      { code: 'IQD', symbol: 'ع.د' }, { code: 'SYP', symbol: '£' }, { code: 'YER', symbol: '﷼' },
      { code: 'DZD', symbol: 'دج' }, { code: 'MAD', symbol: 'د.م.' }, { code: 'TND', symbol: 'د.ت' },
      { code: 'LYD', symbol: 'ل.د' }, { code: 'SDG', symbol: 'ج.س.' }, { code: 'ETB', symbol: 'Br' },
      { code: 'GHS', symbol: '₵' }, { code: 'KES', symbol: 'KSh' }, { code: 'TZS', symbol: 'TSh' },
      { code: 'UGX', symbol: 'USh' }, { code: 'NGN', symbol: '₦' }, { code: 'XAF', symbol: 'FCFA' },
      { code: 'XOF', symbol: 'CFA' }, { code: 'XPF', symbol: 'CFP' },{ code: 'INDX', symbol: 'Rs' }
    ];
    const selectedCurrency = currencies.find(c => c.code === currencyCode);
    return selectedCurrency ? selectedCurrency.symbol : currencies;
  };

  // Format price with currency
  const formatPrice = (amount, currencyCode) => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toFixed(2)}`;
  };

  const verifyReceipt = async (targetId) => {
    setLoading(true);
    setError('');
    setVerificationStatus(null);

    try {
      // Fetch receipt from Firestore
      const receiptsQuery = query(
        collection(db, 'receipts'),
        where('id', '==', targetId)
      );
      const receiptSnapshot = await getDocs(receiptsQuery);
      
      if (receiptSnapshot.empty) {
        setError('Receipt not found');
        return;
      }

      const receiptDoc = receiptSnapshot.docs[0];
      const receiptData = receiptDoc.data();
      setReceipt(receiptData);

      // Create original data for verification (exclude hash)
      const originalData = {
        id: receiptData.id,
        customerName: receiptData.customerName,
        items: receiptData.items,
        date: receiptData.date,
        total: receiptData.total,
        userId: receiptData.userId,
        createdAt: receiptData.createdAt,
        version: receiptData.version,
        tamperProof: receiptData.tamperProof
      };

      // Verify hash
      const isValid = await verifyHash(originalData, receiptData.hash);
      
      setVerificationStatus(isValid);
    } catch (error) {
      setError('Verification failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    if (receiptId.trim()) {
      verifyReceipt(receiptId.trim());
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container" style={{maxWidth: '56rem'}}>
        <div className="text-center mb-8">
          <div className="icon-circle icon-circle-lg">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-blue-700">InvoiXe</h1>
          <h3 className="text-1xl font-bold text-gray-900">Receipt Verification</h3>
          <p className="text-gray-600 mt-2">Cryptographically verify receipt authenticity and detect tampering</p>
          <div className="alert alert-info mt-4">
            <p className="text-sm">
              🔍 <strong>How it works:</strong> We recompute the SHA-256 hash and compare it with the original
            </p>
          </div>
        </div>

        {/* Verification Form */}
        <div className="card mb-8">
          <form onSubmit={handleVerify}>
            <div className="form-group">
              <label>
                Receipt ID
              </label>
              <div className="flex" style={{gap: '1rem'}}>
                <input
                  type="text"
                  value={receiptId}
                  onChange={(e) => setReceiptId(e.target.value)}
                  className="flex-1"
                  placeholder="Enter receipt ID or scan QR code"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? (
                    <div className="loading-spinner"></div>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      <span>Verify</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="alert alert-error mt-6 flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-red-600 text-sm ml-2">{error}</p>
            </div>
          )}
        </div>

        {/* Verification Status */}
        {verificationStatus !== null && (
          <div className={`card mb-8 ${verificationStatus ? 'verification-success' : 'verification-error'}`}>
            <div className="text-center mb-6">
              {verificationStatus ? (
                <>
                  <div className="icon-circle icon-circle-lg bg-green-100">
                    <Lock className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-green-900">🔒 RECEIPT VERIFIED</h2>
                  <p className="text-green-700 mt-2 text-lg">This receipt is authentic and has NOT been tampered with</p>
                  <div className="alert alert-success mt-4">
                    <p className="text-sm">
                      ✅ Cryptographic hash matches original<br/>
                      ✅ Receipt data is intact and unmodified<br/>
                      ✅ Safe to trust this receipt
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="icon-circle icon-circle-lg bg-red-100">
                    <Unlock className="h-10 w-10 text-red-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-red-900">⚠️ TAMPERING DETECTED</h2>
                  <p className="text-red-700 mt-2 text-lg">This receipt has been MODIFIED and cannot be trusted</p>
                  <div className="alert alert-error mt-4">
                    <p className="text-sm">
                      ❌ Cryptographic hash does not match<br/>
                      ❌ Receipt data has been altered<br/>
                      ❌ DO NOT trust this receipt
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Receipt Details */}
        {receipt && (
          <div className="card border border-gray-200">
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center">
                    <Shield className="h-6 w-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900 ml-2">TAMPER-PROOF RECEIPT</h2>
                  </div>
                  <p className="text-gray-600">Cryptographically Secured</p>
                </div>
                <div className="text-right">
                  <QRCodeCanvas 
                    value={`${window.location.origin}/verify/${receipt.id}`} 
                    size={80}
                  />
                  <p className="text-xs text-gray-500 mt-1">Scan to verify</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md-grid-cols-2 gap-6 mb-6" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
              <div>
                <p className="text-sm font-medium text-gray-700">Receipt ID</p>
                <p className="font-mono text-sm text-gray-900 bg-gray-100 px-2 py-1 rounded mt-1">{receipt.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Customer</p>
                <p className="text-gray-900 mt-1">{receipt.customerName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Date</p>
                <p className="text-gray-900 mt-1">{receipt.date}</p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                <div className="grid-cols-4 gap-4 text-sm font-medium text-gray-700 border-b pb-2" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)'}}>
                  <div>Item</div>
                  <div className="text-center">Quantity</div>
                  <div className="text-center">Price</div>
                  <div className="text-right">Total</div>
                </div>
                {receipt.items.map((item, index) => (
                  <div key={index} className="grid-cols-4 gap-4 text-sm text-gray-900" style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)'}}>
                    <div>{item.name}</div>
                    <div className="text-center">{item.quantity}</div>
                    <div className="text-center">{getCurrencySymbol(receipt.currency)}{item.price.toFixed(2)}</div>
                    <div className="text-right">{getCurrencySymbol(receipt.currency)}{(item.quantity * item.price).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-gray-200 mt-6 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-gray-900">{getCurrencySymbol(receipt.currency)}{receipt.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 mt-6 pt-6">
              <div className="security-info">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  Security Information
                </h4>
                <div className="text-xs text-gray-600" style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                  <div>
                    <p><strong>Cryptographic Hash (SHA-256):</strong></p>
                    <p className="hash-display">{receipt.hash}</p>
                  </div>
                  {receipt.integrityChecksum && (
                    <div>
                      <p><strong>Integrity Checksum:</strong></p>
                      <p className="hash-display">{receipt.integrityChecksum}</p>
                    </div>
                  )}
                  <div className="pt-2 border-t">
                    <p className="text-yellow-700">
                      ⚠️ <strong>Warning:</strong> Any modification to this receipt will change the hash and be detected during verification.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyReceipt;