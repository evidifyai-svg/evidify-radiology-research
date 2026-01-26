// TimelineBuilder.tsx - Auto-builds chronology with multi-source reconciliation
// Marks events as corroborated, contradicted, unsupported, or missing context

import { useState, useMemo } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface EvidenceItem {
  id: string;
  filename: string;
  evidence_type: string | Record<string, unknown>;
  date_received?: string;
  date_of_document?: string;
}

interface TimelineEvent {
  id: string;
  date: string;
  time?: string;
  description: string;
  source_ids: string[];
  source_types: ('record' | 'self_report' | 'collateral' | 'observation')[];
  status: 'corroborated' | 'contradicted' | 'unsupported' | 'missing_context';
  confidence: 'high' | 'medium' | 'low';
  contradicting_sources?: string[];
  notes?: string;
  category?: string;
}

interface TimelineConflict {
  event_id: string;
  conflict_type: 'date_mismatch' | 'fact_conflict' | 'sequence_error' | 'missing_period';
  description: string;
  sources_involved: string[];
  resolution_status: 'unresolved' | 'resolved' | 'documented';
}

interface TimelineBuilderProps {
  evidence: EvidenceItem[];
  events: TimelineEvent[];
  conflicts: TimelineConflict[];
  onAddEvent?: (event: Partial<TimelineEvent>) => void;
  onUpdateEvent?: (id: string, updates: Partial<TimelineEvent>) => void;
  onResolveConflict?: (conflictId: string, resolution: string) => void;
}

// ============================================================================
// EVENT CATEGORIES
// ============================================================================

const EVENT_CATEGORIES = [
  { id: 'legal', label: 'Legal/Court', icon: '⚖️', color: 'blue' },
  { id: 'medical', label: 'Medical/Treatment', icon: '🏥', color: 'green' },
  { id: 'psychiatric', label: 'Psychiatric', icon: '🧠', color: 'purple' },
  { id: 'incident', label: 'Incident/Event', icon: '⚡', color: 'red' },
  { id: 'contact', label: 'Contact/Interview', icon: '💬', color: 'amber' },
  { id: 'document', label: 'Document Created', icon: '📄', color: 'slate' },
  { id: 'other', label: 'Other', icon: '📌', color: 'gray' },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function TimelineBuilder({
  evidence,
  events,
  conflicts,
  onAddEvent,
  onUpdateEvent,
  onResolveConflict,
}: TimelineBuilderProps) {
  const [viewMode, setViewMode] = useState<'timeline' | 'table' | 'conflicts'>('timeline');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  
  // Sort events by date
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  }, [events]);
  
  // Filter events
  const filteredEvents = useMemo(() => {
    return sortedEvents.filter(event => {
      if (filterCategory !== 'all' && event.category !== filterCategory) return false;
      if (filterStatus !== 'all' && event.status !== filterStatus) return false;
      return true;
    });
  }, [sortedEvents, filterCategory, filterStatus]);
  
  // Calculate stats
  const stats = useMemo(() => ({
    total: events.length,
    corroborated: events.filter(e => e.status === 'corroborated').length,
    contradicted: events.filter(e => e.status === 'contradicted').length,
    unsupported: events.filter(e => e.status === 'unsupported').length,
    unresolvedConflicts: conflicts.filter(c => c.resolution_status === 'unresolved').length,
  }), [events, conflicts]);
  
  // Get source name
  const getSourceName = (sourceId: string): string => {
    const source = evidence.find(e => e.id === sourceId);
    return source?.filename || 'Unknown Source';
  };
  
  // Get status styling
  const getStatusStyle = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'corroborated':
        return { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700', icon: '✓' };
      case 'contradicted':
        return { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-700', icon: '⚡' };
      case 'unsupported':
        return { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-700', icon: '?' };
      case 'missing_context':
        return { bg: 'bg-slate-100', border: 'border-slate-400', text: 'text-slate-700', icon: '…' };
    }
  };
  
  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              📅 Timeline Builder
            </h2>
            <p className="text-sm text-slate-500">
              Multi-source chronology with reconciliation
            </p>
          </div>
          <button
            onClick={() => setShowAddEvent(true)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            + Add Event
          </button>
        </div>
        
        {/* Stats Bar */}
        <div className="flex gap-3 text-sm">
          <span className="px-2 py-1 bg-slate-100 rounded">
            {stats.total} events
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
            ✓ {stats.corroborated} corroborated
          </span>
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
            ⚡ {stats.contradicted} contradicted
          </span>
          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded">
            ? {stats.unsupported} unsupported
          </span>
          {stats.unresolvedConflicts > 0 && (
            <span className="px-2 py-1 bg-red-200 text-red-800 rounded">
              🚨 {stats.unresolvedConflicts} conflicts
            </span>
          )}
        </div>
      </div>
      
      {/* View Toggle & Filters */}
      <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
        <div className="flex gap-2">
          {(['timeline', 'table', 'conflicts'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border hover:bg-slate-100'
              }`}
            >
              {mode === 'timeline' ? '📅 Timeline' : mode === 'table' ? '📋 Table' : '⚡ Conflicts'}
            </button>
          ))}
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All Categories</option>
            {EVENT_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All Status</option>
            <option value="corroborated">Corroborated</option>
            <option value="contradicted">Contradicted</option>
            <option value="unsupported">Unsupported</option>
            <option value="missing_context">Missing Context</option>
          </select>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {viewMode === 'timeline' && (
          <div className="p-4">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p>No events match your filters</p>
                <p className="text-sm mt-1">Add events or adjust filters</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />
                
                {/* Events */}
                <div className="space-y-4">
                  {filteredEvents.map((event, index) => {
                    const style = getStatusStyle(event.status);
                    const category = EVENT_CATEGORIES.find(c => c.id === event.category);
                    const isExpanded = expandedEvent === event.id;
                    
                    return (
                      <div 
                        key={event.id}
                        className="relative pl-10"
                      >
                        {/* Status Dot */}
                        <div className={`absolute left-2 w-5 h-5 rounded-full ${style.bg} ${style.border} border-2 flex items-center justify-center text-xs ${style.text}`}>
                          {style.icon}
                        </div>
                        
                        {/* Event Card */}
                        <div 
                          className={`p-3 rounded-lg border ${style.border} ${style.bg} cursor-pointer`}
                          onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700">
                                {new Date(event.date).toLocaleDateString()}
                                {event.time && ` ${event.time}`}
                              </span>
                              {category && (
                                <span className="text-sm">{category.icon}</span>
                              )}
                              <span className={`text-xs px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
                                {event.status.replace('_', ' ')}
                              </span>
                            </div>
                            <span className="text-slate-400 text-sm">
                              {isExpanded ? '▲' : '▼'}
                            </span>
                          </div>
                          
                          {/* Description */}
                          <p className="text-sm text-slate-700 mb-2">{event.description}</p>
                          
                          {/* Sources */}
                          <div className="flex flex-wrap gap-1">
                            {event.source_ids.slice(0, 3).map((sourceId, i) => (
                              <span 
                                key={sourceId}
                                className="text-xs px-1.5 py-0.5 bg-white rounded border"
                              >
                                {event.source_types[i] === 'record' ? '📄' :
                                 event.source_types[i] === 'self_report' ? '💬' :
                                 event.source_types[i] === 'collateral' ? '👥' : '👁️'}
                                {getSourceName(sourceId)}
                              </span>
                            ))}
                            {event.source_ids.length > 3 && (
                              <span className="text-xs text-slate-500">
                                +{event.source_ids.length - 3} more
                              </span>
                            )}
                          </div>
                          
                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t space-y-2">
                              {/* All Sources */}
                              <div>
                                <p className="text-xs font-medium text-slate-500 mb-1">Sources:</p>
                                <div className="space-y-1">
                                  {event.source_ids.map((sourceId, i) => (
                                    <div key={sourceId} className="text-sm text-slate-600 flex items-center gap-2">
                                      <span className={`w-2 h-2 rounded-full ${
                                        event.source_types[i] === 'record' ? 'bg-blue-500' :
                                        event.source_types[i] === 'self_report' ? 'bg-amber-500' :
                                        event.source_types[i] === 'collateral' ? 'bg-purple-500' : 'bg-green-500'
                                      }`} />
                                      {getSourceName(sourceId)} ({event.source_types[i]})
                                    </div>
                                  ))}
                                </div>
                              </div>
                              
                              {/* Contradicting Sources */}
                              {event.contradicting_sources && event.contradicting_sources.length > 0 && (
                                <div className="p-2 bg-red-50 rounded">
                                  <p className="text-xs font-medium text-red-700 mb-1">Contradicting Sources:</p>
                                  {event.contradicting_sources.map(sourceId => (
                                    <p key={sourceId} className="text-sm text-red-600">
                                      • {getSourceName(sourceId)}
                                    </p>
                                  ))}
                                </div>
                              )}
                              
                              {/* Notes */}
                              {event.notes && (
                                <div className="text-sm text-slate-600 italic">
                                  Note: {event.notes}
                                </div>
                              )}
                              
                              {/* Actions */}
                              <div className="flex gap-2 pt-2">
                                <button className="text-xs text-blue-600 hover:underline">
                                  Edit Event
                                </button>
                                <button className="text-xs text-purple-600 hover:underline">
                                  Add Source
                                </button>
                                <button className="text-xs text-slate-500 hover:underline">
                                  Add Note
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
        
        {viewMode === 'table' && (
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0">
              <tr className="text-left text-xs text-slate-500 uppercase">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Sources</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEvents.map(event => {
                const style = getStatusStyle(event.status);
                const category = EVENT_CATEGORIES.find(c => c.id === event.category);
                
                return (
                  <tr key={event.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium">
                      {new Date(event.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">{event.description}</td>
                    <td className="px-4 py-3 text-sm">
                      {category && `${category.icon} ${category.label}`}
                    </td>
                    <td className="px-4 py-3 text-sm">{event.source_ids.length}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${style.bg} ${style.text}`}>
                        {style.icon} {event.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        
        {viewMode === 'conflicts' && (
          <div className="p-4 space-y-3">
            {conflicts.length === 0 ? (
              <div className="text-center py-8 text-green-600">
                <p className="font-medium">✓ No timeline conflicts detected</p>
                <p className="text-sm text-slate-500 mt-1">All events are reconciled</p>
              </div>
            ) : (
              conflicts.map(conflict => (
                <div 
                  key={conflict.event_id}
                  className={`p-4 rounded-lg border ${
                    conflict.resolution_status === 'unresolved' 
                      ? 'bg-red-50 border-red-200' 
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${
                        conflict.resolution_status === 'unresolved' ? 'text-red-700' : 'text-slate-700'
                      }`}>
                        {conflict.conflict_type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        conflict.resolution_status === 'unresolved'
                          ? 'bg-red-200 text-red-800'
                          : 'bg-green-200 text-green-800'
                      }`}>
                        {conflict.resolution_status}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-slate-600 mb-2">{conflict.description}</p>
                  
                  <div className="text-xs text-slate-500 mb-3">
                    Sources: {conflict.sources_involved.map(id => getSourceName(id)).join(', ')}
                  </div>
                  
                  {conflict.resolution_status === 'unresolved' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onResolveConflict?.(conflict.event_id, 'resolved')}
                        className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Mark Resolved
                      </button>
                      <button
                        onClick={() => onResolveConflict?.(conflict.event_id, 'documented')}
                        className="text-xs px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700"
                      >
                        Document in Report
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t bg-slate-50">
        <p className="text-xs text-slate-500">
          💡 Events with multiple independent sources are marked corroborated. 
          Conflicting sources are flagged for resolution.
        </p>
      </div>
    </div>
  );
}
