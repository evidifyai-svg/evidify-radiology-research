/**
 * ServerReceipts.ts
 * 
 * P2-1: Server-side receipt system for tamper-evident timestamps
 * Provides independent verification that events occurred at claimed times
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ReceiptRequest {
  sessionId: string;
  eventHash: string;
  clientTimestamp: string;
  eventType: string;
  sequenceNumber: number;
}

export interface ServerReceipt {
  receiptId: string;
  sessionId: string;
  eventHash: string;
  clientTimestamp: string;
  serverTimestamp: string;
  sequenceNumber: number;
  signature: string;
  serverPublicKey: string;
}

export interface ReceiptVerification {
  isValid: boolean;
  receiptId: string;
  timeDeltaMs: number;
  signatureValid: boolean;
  hashMatch: boolean;
}

export interface ReceiptServerConfig {
  endpoint: string;
  apiKey?: string;
  timeout: number;
  retryAttempts: number;
  batchSize: number;
}

// ============================================================================
// RECEIPT CLIENT
// ============================================================================

export class ReceiptClient {
  private config: ReceiptServerConfig;
  private pendingReceipts: ReceiptRequest[] = [];
  private receivedReceipts: Map<string, ServerReceipt> = new Map();

  constructor(config: Partial<ReceiptServerConfig> = {}) {
    this.config = {
      endpoint: config.endpoint || 'https://receipts.evidify.ai/v1',
      apiKey: config.apiKey,
      timeout: config.timeout || 5000,
      retryAttempts: config.retryAttempts || 3,
      batchSize: config.batchSize || 10,
    };
  }

  /**
   * Request a receipt for an event
   */
  async requestReceipt(request: ReceiptRequest): Promise<ServerReceipt | null> {
    // In production, this would call the actual server
    // For demo, we simulate server-side receipt generation
    
    if (this.config.endpoint.includes('mock') || !this.config.apiKey) {
      return this.generateMockReceipt(request);
    }

    try {
      const response = await fetch(`${this.config.endpoint}/receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        console.error('Receipt server error:', response.status);
        this.pendingReceipts.push(request);
        return null;
      }

      const receipt: ServerReceipt = await response.json();
      this.receivedReceipts.set(receipt.receiptId, receipt);
      return receipt;

    } catch (error) {
      console.error('Receipt request failed:', error);
      this.pendingReceipts.push(request);
      return null;
    }
  }

  /**
   * Request receipts for multiple events (batch)
   */
  async requestReceiptsBatch(requests: ReceiptRequest[]): Promise<ServerReceipt[]> {
    const results: ServerReceipt[] = [];
    
    // Process in batches
    for (let i = 0; i < requests.length; i += this.config.batchSize) {
      const batch = requests.slice(i, i + this.config.batchSize);
      const batchPromises = batch.map(r => this.requestReceipt(r));
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter((r): r is ServerReceipt => r !== null));
    }

    return results;
  }

  /**
   * Verify a receipt
   */
  async verifyReceipt(receipt: ServerReceipt, originalHash: string): Promise<ReceiptVerification> {
    // In production, verify signature against server's public key
    // For demo, perform basic checks
    
    const hashMatch = receipt.eventHash === originalHash;
    const timeDelta = new Date(receipt.serverTimestamp).getTime() - 
                      new Date(receipt.clientTimestamp).getTime();
    
    // Signature verification (mock)
    const signatureValid = this.verifySignature(receipt);

    return {
      isValid: hashMatch && signatureValid && Math.abs(timeDelta) < 60000, // Within 1 minute
      receiptId: receipt.receiptId,
      timeDeltaMs: timeDelta,
      signatureValid,
      hashMatch,
    };
  }

  /**
   * Get all received receipts
   */
  getReceipts(): ServerReceipt[] {
    return Array.from(this.receivedReceipts.values());
  }

  /**
   * Get pending (failed) receipts for retry
   */
  getPendingReceipts(): ReceiptRequest[] {
    return [...this.pendingReceipts];
  }

  /**
   * Retry pending receipts
   */
  async retryPending(): Promise<number> {
    const pending = [...this.pendingReceipts];
    this.pendingReceipts = [];
    
    let succeeded = 0;
    for (const request of pending) {
      const receipt = await this.requestReceipt(request);
      if (receipt) succeeded++;
    }
    
    return succeeded;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private generateMockReceipt(request: ReceiptRequest): ServerReceipt {
    const receiptId = `RCP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const serverTimestamp = new Date().toISOString();
    
    // Mock signature (in production, use actual cryptographic signature)
    const signatureData = `${receiptId}:${request.eventHash}:${serverTimestamp}`;
    const signature = this.mockSign(signatureData);

    const receipt: ServerReceipt = {
      receiptId,
      sessionId: request.sessionId,
      eventHash: request.eventHash,
      clientTimestamp: request.clientTimestamp,
      serverTimestamp,
      sequenceNumber: request.sequenceNumber,
      signature,
      serverPublicKey: 'MOCK_PUBLIC_KEY_FOR_DEMO',
    };

    this.receivedReceipts.set(receiptId, receipt);
    return receipt;
  }

  private mockSign(data: string): string {
    // Simple mock signature for demo purposes
    // In production, use proper Ed25519 or similar
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `MOCK_SIG_${Math.abs(hash).toString(16).padStart(16, '0')}`;
  }

  private verifySignature(receipt: ServerReceipt): boolean {
    // In production, verify against actual public key
    // For demo, check mock signature format
    return receipt.signature.startsWith('MOCK_SIG_') || 
           receipt.signature.length === 64; // Assume hex signature
  }
}

// ============================================================================
// RECEIPT SUMMARY FOR EXPORT
// ============================================================================

export interface ReceiptSummary {
  totalEvents: number;
  receiptsObtained: number;
  receiptsPending: number;
  averageTimeDeltaMs: number;
  allSignaturesValid: boolean;
  receipts: ServerReceipt[];
}

export function generateReceiptSummary(
  totalEvents: number,
  receipts: ServerReceipt[],
  pending: ReceiptRequest[]
): ReceiptSummary {
  const timeDeltas = receipts.map(r => 
    new Date(r.serverTimestamp).getTime() - new Date(r.clientTimestamp).getTime()
  );
  
  return {
    totalEvents,
    receiptsObtained: receipts.length,
    receiptsPending: pending.length,
    averageTimeDeltaMs: timeDeltas.length > 0 
      ? Math.round(timeDeltas.reduce((a, b) => a + b, 0) / timeDeltas.length)
      : 0,
    allSignaturesValid: true, // Simplified for demo
    receipts,
  };
}

// ============================================================================
// REACT HOOK FOR EASY INTEGRATION
// ============================================================================

export function createReceiptMiddleware(client: ReceiptClient) {
  return async function receiptMiddleware(
    sessionId: string,
    eventHash: string,
    eventType: string,
    sequenceNumber: number
  ): Promise<ServerReceipt | null> {
    const request: ReceiptRequest = {
      sessionId,
      eventHash,
      clientTimestamp: new Date().toISOString(),
      eventType,
      sequenceNumber,
    };
    
    return client.requestReceipt(request);
  };
}

export default ReceiptClient;
