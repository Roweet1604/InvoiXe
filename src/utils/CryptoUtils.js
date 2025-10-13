// Enhanced cryptographic utilities for tamper-proof receipts
export const computeHash = async (receiptData) => {
  try {
    // Create a normalized string representation to prevent tampering
    const normalizedData = {
      id: receiptData.id,
      customerName: receiptData.customerName.trim(),
      items: receiptData.items.map(item => ({
        name: item.name.trim(),
        quantity: parseFloat(item.quantity),
        price: parseFloat(item.price)
      })),
      date: receiptData.date,
      total: parseFloat(receiptData.total),
      userId: receiptData.userId
    };

    // Sort items by name to ensure consistent hashing
    normalizedData.items.sort((a, b) => a.name.localeCompare(b.name));
    
    // Create deterministic string representation
    const dataString = JSON.stringify(normalizedData, Object.keys(normalizedData).sort());
    
    // Add salt to make hash unique and harder to reverse-engineer
    const salt = 'RECEIPT_TAMPER_PROOF_2024';
    const saltedData = salt + dataString + salt;
    
    const encoder = new TextEncoder();
    const data = encoder.encode(saltedData);
    
    // Use SHA-256 for cryptographic hashing
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Hash computation error:', error);
    throw new Error('Failed to compute tamper-proof hash');
  }
};

export const verifyHash = async (originalData, storedHash) => {
  try {
    // Recompute hash using the same algorithm
    const computedHash = await computeHash(originalData);
    
    // Compare hashes - any modification will result in different hash
    const isValid = computedHash === storedHash;
    
    console.log('Hash verification:', {
      computed: computedHash,
      stored: storedHash,
      valid: isValid
    });
    
    return isValid;
  } catch (error) {
    console.error('Hash verification error:', error);
    return false;
  }
};

export const generateReceiptId = () => {
  // Generate unique ID with timestamp and random component
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `RCP-${timestamp}-${random}`.toUpperCase();
};

// Additional security: Generate integrity checksum for the entire receipt
export const generateIntegrityChecksum = async (receiptData, hash) => {
  try {
    const integrityData = {
      receiptHash: hash,
      receiptId: receiptData.id,
      itemCount: receiptData.items.length,
      totalAmount: receiptData.total
    };
    
    const dataString = JSON.stringify(integrityData);
    const encoder = new TextEncoder();
    const data = encoder.encode(dataString);
    const checksumBuffer = await crypto.subtle.digest('SHA-256', data);
    const checksumArray = Array.from(new Uint8Array(checksumBuffer));
    const checksum = checksumArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return checksum;
  } catch (error) {
    console.error('Integrity checksum error:', error);
    throw new Error('Failed to generate integrity checksum');
  }
};

// Get verification URL - handles localhost for development
export const getVerificationUrl = (receiptId) => {
  const baseUrl = window.location.hostname === 'localhost'
    ? 'https://invoixe-ten.vercel.app/' // Replace with your deployed URL
    : window.location.origin;
  
  return `${baseUrl}/verify/${receiptId}`;
};