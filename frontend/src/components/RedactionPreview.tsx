// RedactionPreview.tsx - PII Detection and Redaction UI
import React, { useState } from 'react';
import { 
  p1Api, 
  DetectionResult, 
  RedactionResult, 
  RedactionConfigRequest,
  MarkerStyle,
  PiiDetection 
} from '../lib/p1-types';

interface RedactionPreviewProps {
  text: string;
  evidenceId: string;
  caseId: string;
  userId: string;
  onRedactionComplete?: (result: RedactionResult) => void;
}

export const RedactionPreview: React.FC<RedactionPreviewProps> = ({
  text,
  evidenceId,
  caseId,
  userId,
  onRedactionComplete,
}) => {
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [redactionResult, setRedactionResult] = useState<RedactionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Config options
  const [config, setConfig] = useState<RedactionConfigRequest>({
    detect_ssn: true,
    detect_dob: true,
    detect_phone: true,
    detect_email: true,
    detect_credit_card: true,
    partial_redaction: false,
    marker_style: 'bracketed',
  });

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    setRedactionResult(null);

    try {
      const result = await p1Api.previewRedaction(text, config);
      setDetectionResult(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRedaction = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await p1Api.applyRedaction(text, config);
      setRedactionResult(result);
      onRedactionComplete?.(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const getPiiTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      ssn: 'bg-red-100 text-red-800',
      date_of_birth: 'bg-orange-100 text-orange-800',
      phone_number: 'bg-yellow-100 text-yellow-800',
      email: 'bg-blue-100 text-blue-800',
      credit_card: 'bg-purple-100 text-purple-800',
      address: 'bg-green-100 text-green-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getPiiTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      ssn: 'SSN',
      date_of_birth: 'DOB',
      phone_number: 'Phone',
      email: 'Email',
      credit_card: 'Credit Card',
      address: 'Address',
      drivers_license: 'DL',
      medical_record_number: 'MRN',
    };
    return labels[type] || type;
  };

  const highlightDetections = (text: string, detections: PiiDetection[]): React.ReactNode => {
    if (detections.length === 0) return text;
    
    const getStart = (d: PiiDetection) => (d.start_offset ?? d.start ?? 0);
    const getEnd = (d: PiiDetection) => (d.end_offset ?? d.end ?? 0);

    const sortedDetections = [...detections].sort((a, b) => getStart(a) - getStart(b));
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    sortedDetections.forEach((detection, i) => {
      // Text before this detection
      const start = getStart(detection);
      const end = getEnd(detection);

      if (start > lastEnd) {
        parts.push(text.slice(lastEnd, start));
      }
      
      // The detected PII
      parts.push(
        <mark
          key={i}
          className={`${getPiiTypeColor(detection.pii_type as string)} px-1 rounded cursor-help`}
          title={`${getPiiTypeLabel(detection.pii_type as string)} (${detection.confidence}% confidence)`}
        >
          {text.slice(start, end)}
        </mark>
      );
      
      lastEnd = end;
    });

    // Text after last detection
    if (lastEnd < text.length) {
      parts.push(text.slice(lastEnd));
    }

    return parts;
  };

  return (
    <div className="redaction-preview p-4 space-y-4">
      <h3 className="text-lg font-semibold">PII Detection & Redaction</h3>
      
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Configuration */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="font-medium mb-3">Detection Options</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.detect_ssn}
              onChange={(e) => setConfig({...config, detect_ssn: e.target.checked})}
              className="rounded"
            />
            <span>SSN</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.detect_dob}
              onChange={(e) => setConfig({...config, detect_dob: e.target.checked})}
              className="rounded"
            />
            <span>Date of Birth</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.detect_phone}
              onChange={(e) => setConfig({...config, detect_phone: e.target.checked})}
              className="rounded"
            />
            <span>Phone</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.detect_email}
              onChange={(e) => setConfig({...config, detect_email: e.target.checked})}
              className="rounded"
            />
            <span>Email</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.detect_credit_card}
              onChange={(e) => setConfig({...config, detect_credit_card: e.target.checked})}
              className="rounded"
            />
            <span>Credit Card</span>
          </label>
        </div>

        <div className="mt-4 flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.partial_redaction}
              onChange={(e) => setConfig({...config, partial_redaction: e.target.checked})}
              className="rounded"
            />
            <span>Show last 4 digits</span>
          </label>

          <select
            value={config.marker_style}
            onChange={(e) => setConfig({...config, marker_style: e.target.value as MarkerStyle})}
            className="border rounded px-2 py-1"
          >
            <option value="bracketed">[TYPE REDACTED]</option>
            <option value="blocked">████████</option>
            <option value="masked">***-**-1234</option>
            <option value="simple">(removed)</option>
          </select>
        </div>
      </div>

      {/* Scan Button */}
      <button
        onClick={handleScan}
        disabled={loading || !text}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Scanning...' : 'Scan for PII'}
      </button>

      {/* Detection Results */}
      {detectionResult && (
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">
              Found {detectionResult.total_count} PII Items
            </h4>
            <div className="text-sm text-gray-500">
              Scanned {detectionResult.text_length.toLocaleString()} characters
            </div>
          </div>

          {/* Summary by type */}
          {Object.keys(detectionResult.count_by_type).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(detectionResult.count_by_type).map(([type, count]) => (
                <span
                  key={type}
                  className={`${getPiiTypeColor(type)} px-2 py-1 rounded text-sm`}
                >
                  {type}: {String(count)}
                </span>
              ))}
            </div>
          )}

          {/* Highlighted Preview */}
          <div className="bg-white border rounded p-3 font-mono text-sm whitespace-pre-wrap max-h-64 overflow-auto">
            {highlightDetections(text, detectionResult.detections)}
          </div>

          {/* Detection List */}
          {detectionResult.detections.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium mb-2">Detection Details</h5>
              <div className="max-h-48 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Type</th>
                      <th className="px-3 py-2 text-left">Value</th>
                      <th className="px-3 py-2 text-left">Line</th>
                      <th className="px-3 py-2 text-left">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detectionResult.detections.map((detection: PiiDetection, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2">
                          <span className={`${getPiiTypeColor(detection.pii_type as string)} px-1 rounded text-xs`}>
                            {getPiiTypeLabel(detection.pii_type as string)}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono">
                          {(detection as any).detected_value ?? detection.text}
                        </td>
                        <td className="px-3 py-2 text-gray-500">
                          {(detection as any).line_number ?? '-'}
                        </td>
                        <td className="px-3 py-2">
                          {Math.round((detection.confidence ?? 0) * 100)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Apply Button */}
          {detectionResult.total_count > 0 && (
            <button
              onClick={handleApplyRedaction}
              disabled={loading}
              className="w-full mt-4 bg-amber-600 text-white py-2 rounded hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? 'Applying...' : `Apply ${detectionResult.total_count} Redactions`}
            </button>
          )}
        </div>
      )}

      {/* Redaction Result */}
      {redactionResult && (
        <div className="border rounded-lg p-4 bg-green-50">
          <h4 className="font-medium text-green-800 mb-2">
             {redactionResult.redaction_count} Redactions Applied
          </h4>
          
          <div className="bg-white border rounded p-3 font-mono text-sm whitespace-pre-wrap max-h-48 overflow-auto">
            {redactionResult.redacted_text}
          </div>

          <div className="mt-3 text-xs text-gray-500 space-y-1">
            <div>Original Hash: <code>{(redactionResult.original_hash ?? '').slice(0, 16)}...</code></div>
            <div>Redacted Hash: <code>{(redactionResult.redacted_hash ?? '').slice(0, 16)}...</code></div>
            <div>Audit Entries: {(redactionResult.audit_entries ?? []).length}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedactionPreview;
