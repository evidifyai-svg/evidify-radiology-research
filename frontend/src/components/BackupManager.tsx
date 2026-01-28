// BackupManager.tsx - Backup and Restore Management UI
import React, { useState, useEffect } from 'react';
import { p1Api, BackupInfo, BackupResult, RestoreResult } from '../lib/p1-types';

interface BackupManagerProps {
  caseId: string;
  caseName: string;
  userId: string;
  onBackupComplete?: (result: BackupResult) => void;
  onRestoreComplete?: (result: RestoreResult) => void;
}

export const BackupManager: React.FC<BackupManagerProps> = ({
  caseId,
  caseName,
  userId,
  onBackupComplete,
  onRestoreComplete,
}) => {
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Backup options
  const [includeEvidence, setIncludeEvidence] = useState(true);
  const [includeReports, setIncludeReports] = useState(true);
  const [includeAudit, setIncludeAudit] = useState(true);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState('');
  
  // Restore options
  const [selectedBackup, setSelectedBackup] = useState<BackupInfo | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const list = await p1Api.listBackups();
      setBackups(list.filter((b: BackupInfo) => b.case_id === caseId));
    } catch (e) {
      console.error('Failed to load backups:', e);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await p1Api.createBackup({
        case_id: caseId,
        case_name: caseName,
        user_id: userId,
        include_evidence: includeEvidence,
        include_reports: includeReports,
        include_audit: includeAudit,
        password: usePassword ? password : undefined,
      });

      if (result.success) {
        setSuccess(`Backup created: ${result.manifest.files.length} files, ${formatBytes(result.compressed_size_bytes)}`);
        loadBackups();
        onBackupComplete?.(result);
      } else {
        setError(result.errors.join(', '));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await p1Api.restoreBackup({
        backup_path: selectedBackup.path,
        password: selectedBackup.encrypted ? restorePassword : undefined,
        overwrite_existing: overwriteExisting,
      });

      if (result.success) {
        setSuccess(`Restored ${result.files_restored} files (${formatBytes(result.bytes_restored)}). Integrity: ${result.integrity_verified ? 'Verified' : 'Warning'}`);
        onRestoreComplete?.(result);
      } else {
        setError(result.errors.join(', '));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string): string => {
    return new Date(iso).toLocaleString();
  };

  return (
    <div className="backup-manager p-4 space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Create Backup Section */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Create Backup</h3>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeEvidence}
              onChange={(e) => setIncludeEvidence(e.target.checked)}
              className="rounded"
            />
            <span>Include Evidence Files</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeReports}
              onChange={(e) => setIncludeReports(e.target.checked)}
              className="rounded"
            />
            <span>Include Reports</span>
          </label>
          
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={includeAudit}
              onChange={(e) => setIncludeAudit(e.target.checked)}
              className="rounded"
            />
            <span>Include Audit Logs</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={usePassword}
              onChange={(e) => setUsePassword(e.target.checked)}
              className="rounded"
            />
            <span>Encrypt Backup</span>
          </label>

          {usePassword && (
            <input
              type="password"
              placeholder="Encryption password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
            />
          )}

          <button
            onClick={handleCreateBackup}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating Backup...' : 'Create Backup'}
          </button>
        </div>
      </div>

      {/* Available Backups */}
      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4">Available Backups</h3>
        
        {backups.length === 0 ? (
          <p className="text-gray-500">No backups found for this case.</p>
        ) : (
          <div className="space-y-2">
            {backups.map((backup) => (
              <div
                key={backup.path}
                onClick={() => setSelectedBackup(backup)}
                className={`p-3 border rounded cursor-pointer transition-colors ${
                  selectedBackup?.path === backup.path
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium">{backup.case_name}</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(backup.created_at)} by {backup.created_by}
                    </div>
                    <div className="text-sm text-gray-500">
                      {backup.file_count ?? 0} files • {formatBytes(backup.compressed_size_bytes ?? 0)}
                      {backup.encrypted && ' •  Encrypted'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Restore Section */}
      {selectedBackup && (
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-4">Restore Backup</h3>
          
          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              Selected: {selectedBackup.case_name} ({formatDate(selectedBackup.created_at)})
            </div>

            {selectedBackup.encrypted && (
              <input
                type="password"
                placeholder="Decryption password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
            )}

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="rounded"
              />
              <span className="text-red-600">Overwrite existing data (destructive!)</span>
            </label>

            <button
              onClick={handleRestore}
              disabled={loading || (selectedBackup.encrypted && !restorePassword)}
              className="w-full bg-amber-600 text-white py-2 rounded hover:bg-amber-700 disabled:opacity-50"
            >
              {loading ? 'Restoring...' : 'Restore Backup'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackupManager;
