// SupervisorDashboard.tsx
// Training program wedge market feature
// Structured supervision with audit trail, peer consultation for complex cases

import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/tauri';

// ============================================
// Types
// ============================================

interface Supervisee {
  id: string;
  name: string;
  credentials: string;
  level: 'intern' | 'trainee' | 'postdoc' | 'provisionally_licensed';
  startDate: string;
  notesThisWeek: number;
  notesPendingReview: number;
  lastActivity: string;
}

interface ReviewQueueItem {
  noteId: string;
  clientName: string;
  noteType: string;
  superviseeId: string;
  superviseeName: string;
  signedAt: string;
  hoursPending: number;
  priority: 'urgent' | 'normal' | 'low';
  hasRiskFlags: boolean;
  detectionCount: number;
  isOverdue: boolean;
}

interface CompetencyArea {
  id: string;
  name: string;
  category: string;
}

interface CompetencyRating {
  superviseeId: string;
  areaId: string;
  rating: number; // 1-5
  date: string;
  evidence: string | null;
}

interface SupervisionNote {
  id: string;
  noteId: string;
  content: string;
  type: 'strength' | 'growth' | 'question' | 'teaching';
  createdAt: string;
  acknowledged: boolean;
}

interface DashboardStats {
  totalSupervisees: number;
  activeNotes: number;
  pendingReview: number;
  overdueReview: number;
  avgReviewTimeHours: number;
  notesThisMonth: number;
}

// ============================================
// Competency Areas (APA-aligned)
// ============================================

const COMPETENCY_AREAS: CompetencyArea[] = [
  // Foundational
  { id: 'professionalism', name: 'Professionalism', category: 'Foundational' },
  { id: 'ethics', name: 'Ethical & Legal Standards', category: 'Foundational' },
  { id: 'diversity', name: 'Individual & Cultural Diversity', category: 'Foundational' },
  { id: 'reflective', name: 'Reflective Practice/Self-Assessment', category: 'Foundational' },
  { id: 'science', name: 'Scientific Knowledge & Methods', category: 'Foundational' },
  { id: 'relationships', name: 'Professional Relationships', category: 'Foundational' },
  // Functional
  { id: 'assessment', name: 'Assessment', category: 'Functional' },
  { id: 'intervention', name: 'Intervention', category: 'Functional' },
  { id: 'consultation', name: 'Consultation', category: 'Functional' },
  { id: 'supervision', name: 'Supervision', category: 'Functional' },
  { id: 'teaching', name: 'Teaching', category: 'Functional' },
  { id: 'management', name: 'Management/Administration', category: 'Functional' },
];

// ============================================
// Supervisor Dashboard Component
// ============================================

interface SupervisorDashboardProps {
  supervisorId: string;
  supervisorName: string;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  supervisorId,
  supervisorName,
}) => {
  const [activeTab, setActiveTab] = useState<'queue' | 'supervisees' | 'competencies' | 'reports'>('queue');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [supervisees, setSupervisees] = useState<Supervisee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<ReviewQueueItem | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [supervisorId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [queueData, superviseeData] = await Promise.all([
        invoke<ReviewQueueItem[]>('get_review_queue', { supervisorId }),
        invoke<Supervisee[]>('get_supervisees', { supervisorId }),
      ]);
      
      setReviewQueue(queueData);
      setSupervisees(superviseeData);
      
      // Calculate stats
      const overdueCount = queueData.filter(item => item.isOverdue).length;
      const urgentCount = queueData.filter(item => item.priority === 'urgent').length;
      
      setStats({
        totalSupervisees: superviseeData.length,
        activeNotes: superviseeData.reduce((sum, s) => sum + s.notesThisWeek, 0),
        pendingReview: queueData.length,
        overdueReview: overdueCount,
        avgReviewTimeHours: 12.5, // Would calculate from actual data
        notesThisMonth: superviseeData.reduce((sum, s) => sum + s.notesThisWeek * 4, 0),
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      // Use mock data
      setStats(getMockStats());
      setReviewQueue(getMockQueue());
      setSupervisees(getMockSupervisees());
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="supervisor-dashboard supervisor-dashboard--loading">
        <div className="loading-spinner" />
        <p>Loading supervision dashboard...</p>
      </div>
    );
  }

  return (
    <div className="supervisor-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header__title">
          <h1>Supervision Dashboard</h1>
          <span className="dashboard-header__subtitle">{supervisorName}</span>
        </div>
        <button className="btn btn--primary" onClick={fetchDashboardData}>
          Refresh
        </button>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div className="dashboard-stats">
          <StatCard 
            label="Supervisees" 
            value={stats.totalSupervisees} 
            icon="" 
          />
          <StatCard 
            label="Pending Review" 
            value={stats.pendingReview} 
            icon=""
            highlight={stats.pendingReview > 0}
          />
          <StatCard 
            label="Overdue" 
            value={stats.overdueReview} 
            icon=""
            highlight={stats.overdueReview > 0}
            highlightColor="red"
          />
          <StatCard 
            label="Avg Review Time" 
            value={`${stats.avgReviewTimeHours.toFixed(1)}h`} 
            icon="Time"
          />
          <StatCard 
            label="Notes This Month" 
            value={stats.notesThisMonth} 
            icon=""
          />
        </div>
      )}

      {/* Tabs */}
      <nav className="dashboard-tabs">
        <button 
          className={`dashboard-tab ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          Review Queue
          {stats && stats.pendingReview > 0 && (
            <span className="dashboard-tab__badge">{stats.pendingReview}</span>
          )}
        </button>
        <button 
          className={`dashboard-tab ${activeTab === 'supervisees' ? 'active' : ''}`}
          onClick={() => setActiveTab('supervisees')}
        >
          Supervisees
        </button>
        <button 
          className={`dashboard-tab ${activeTab === 'competencies' ? 'active' : ''}`}
          onClick={() => setActiveTab('competencies')}
        >
          Competencies
        </button>
        <button 
          className={`dashboard-tab ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Reports
        </button>
      </nav>

      {/* Tab Content */}
      <main className="dashboard-content">
        {activeTab === 'queue' && (
          <ReviewQueuePanel 
            items={reviewQueue}
            onSelectNote={setSelectedNote}
            onCoSign={async (noteId) => {
              await invoke('cosign_note', { 
                noteId, 
                supervisorId,
                supervisorName,
                supervisorCredentials: 'Ph.D., Licensed Psychologist',
              });
              fetchDashboardData();
            }}
          />
        )}
        
        {activeTab === 'supervisees' && (
          <SuperviseesPanel 
            supervisees={supervisees}
          />
        )}
        
        {activeTab === 'competencies' && (
          <CompetenciesPanel 
            supervisees={supervisees}
            competencyAreas={COMPETENCY_AREAS}
            supervisorId={supervisorId}
          />
        )}
        
        {activeTab === 'reports' && (
          <ReportsPanel 
            supervisees={supervisees}
            supervisorId={supervisorId}
          />
        )}
      </main>

      {/* Note Review Modal */}
      {selectedNote && (
        <NoteReviewModal 
          item={selectedNote}
          supervisorId={supervisorId}
          onClose={() => setSelectedNote(null)}
          onCoSign={async () => {
            await invoke('cosign_note', { 
              noteId: selectedNote.noteId, 
              supervisorId,
              supervisorName,
              supervisorCredentials: 'Ph.D., Licensed Psychologist',
            });
            setSelectedNote(null);
            fetchDashboardData();
          }}
        />
      )}

      <style>{`
        .supervisor-dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
        }
        
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .dashboard-header h1 {
          margin: 0;
          font-size: 24px;
        }
        
        .dashboard-header__subtitle {
          color: #64748b;
          font-size: 14px;
        }
        
        .dashboard-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .dashboard-tabs {
          display: flex;
          gap: 4px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 24px;
        }
        
        .dashboard-tab {
          padding: 12px 20px;
          border: none;
          background: none;
          font-size: 14px;
          font-weight: 500;
          color: #64748b;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .dashboard-tab:hover {
          color: #1e293b;
        }
        
        .dashboard-tab.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }
        
        .dashboard-tab__badge {
          background: #dc2626;
          color: white;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 10px;
        }
        
        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .btn--primary {
          background: #2563eb;
          color: white;
          border: none;
        }
        
        .btn--primary:hover {
          background: #1d4ed8;
        }
        
        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 40px auto;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// ============================================
// Stat Card Component
// ============================================

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  highlight?: boolean;
  highlightColor?: 'blue' | 'red' | 'green';
}

const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  icon, 
  highlight = false,
  highlightColor = 'blue' 
}) => {
  const colors = {
    blue: { bg: '#eff6ff', text: '#2563eb' },
    red: { bg: '#fef2f2', text: '#dc2626' },
    green: { bg: '#f0fdf4', text: '#16a34a' },
  };
  
  const color = highlight ? colors[highlightColor] : { bg: '#f8fafc', text: '#1e293b' };
  
  return (
    <div 
      className="stat-card"
      style={{
        background: color.bg,
        padding: '16px',
        borderRadius: '12px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '24px', marginBottom: '4px' }}>{icon}</div>
      <div style={{ fontSize: '28px', fontWeight: '700', color: color.text }}>{value}</div>
      <div style={{ fontSize: '13px', color: '#64748b' }}>{label}</div>
    </div>
  );
};

// ============================================
// Review Queue Panel
// ============================================

interface ReviewQueuePanelProps {
  items: ReviewQueueItem[];
  onSelectNote: (item: ReviewQueueItem) => void;
  onCoSign: (noteId: string) => void;
}

const ReviewQueuePanel: React.FC<ReviewQueuePanelProps> = ({ items, onSelectNote, onCoSign }) => {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state__icon"></div>
        <h3>All caught up!</h3>
        <p>No notes pending review</p>
      </div>
    );
  }

  return (
    <div className="review-queue">
      {items.map(item => (
        <div 
          key={item.noteId}
          className={`queue-item ${item.isOverdue ? 'queue-item--overdue' : ''} ${item.priority === 'urgent' ? 'queue-item--urgent' : ''}`}
          onClick={() => onSelectNote(item)}
        >
          <div className="queue-item__priority">
            {item.priority === 'urgent' && <span className="priority-badge priority-badge--urgent">Urgent</span>}
            {item.isOverdue && <span className="priority-badge priority-badge--overdue">Overdue</span>}
            {item.hasRiskFlags && <span className="priority-badge priority-badge--risk">Risk</span>}
          </div>
          
          <div className="queue-item__main">
            <div className="queue-item__client">{item.clientName}</div>
            <div className="queue-item__meta">
              <span>{item.noteType}</span>
              <span>•</span>
              <span>by {item.superviseeName}</span>
              <span>•</span>
              <span>{item.hoursPending.toFixed(1)}h pending</span>
            </div>
          </div>
          
          <div className="queue-item__actions">
            <button 
              className="btn btn--small"
              onClick={(e) => { e.stopPropagation(); onSelectNote(item); }}
            >
              Review
            </button>
            <button 
              className="btn btn--small btn--primary"
              onClick={(e) => { e.stopPropagation(); onCoSign(item.noteId); }}
            >
              Co-Sign
            </button>
          </div>
        </div>
      ))}
      
      <style>{`
        .review-queue {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .queue-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .queue-item:hover {
          border-color: #2563eb;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.1);
        }
        
        .queue-item--overdue {
          border-left: 4px solid #dc2626;
        }
        
        .queue-item--urgent {
          background: #fffbeb;
        }
        
        .queue-item__priority {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 70px;
        }
        
        .priority-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 500;
        }
        
        .priority-badge--urgent {
          background: #fef3c7;
          color: #92400e;
        }
        
        .priority-badge--overdue {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .priority-badge--risk {
          background: #fce7f3;
          color: #9d174d;
        }
        
        .queue-item__main {
          flex: 1;
        }
        
        .queue-item__client {
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .queue-item__meta {
          display: flex;
          gap: 8px;
          font-size: 13px;
          color: #64748b;
        }
        
        .queue-item__actions {
          display: flex;
          gap: 8px;
        }
        
        .btn--small {
          padding: 6px 12px;
          font-size: 13px;
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        
        .empty-state__icon {
          width: 64px;
          height: 64px;
          background: #f0fdf4;
          color: #16a34a;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin: 0 auto 16px;
        }
      `}</style>
    </div>
  );
};

// ============================================
// Supervisees Panel
// ============================================

interface SuperviseesPanelProps {
  supervisees: Supervisee[];
}

const SuperviseesPanel: React.FC<SuperviseesPanelProps> = ({ supervisees }) => {
  const levelLabels = {
    intern: 'Intern',
    trainee: 'Trainee',
    postdoc: 'Postdoc',
    provisionally_licensed: 'Provisionally Licensed',
  };

  return (
    <div className="supervisees-panel">
      {supervisees.map(supervisee => (
        <div key={supervisee.id} className="supervisee-card">
          <div className="supervisee-card__avatar">
            {supervisee.name.charAt(0)}
          </div>
          <div className="supervisee-card__info">
            <div className="supervisee-card__name">{supervisee.name}</div>
            <div className="supervisee-card__meta">
              {levelLabels[supervisee.level]} • {supervisee.credentials}
            </div>
          </div>
          <div className="supervisee-card__stats">
            <div className="supervisee-stat">
              <div className="supervisee-stat__value">{supervisee.notesThisWeek}</div>
              <div className="supervisee-stat__label">This Week</div>
            </div>
            <div className="supervisee-stat">
              <div className="supervisee-stat__value">{supervisee.notesPendingReview}</div>
              <div className="supervisee-stat__label">Pending</div>
            </div>
          </div>
        </div>
      ))}
      
      <style>{`
        .supervisees-panel {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        
        .supervisee-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }
        
        .supervisee-card__avatar {
          width: 48px;
          height: 48px;
          background: #e0e7ff;
          color: #4f46e5;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 600;
        }
        
        .supervisee-card__info {
          flex: 1;
        }
        
        .supervisee-card__name {
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .supervisee-card__meta {
          font-size: 13px;
          color: #64748b;
        }
        
        .supervisee-card__stats {
          display: flex;
          gap: 16px;
        }
        
        .supervisee-stat {
          text-align: center;
        }
        
        .supervisee-stat__value {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }
        
        .supervisee-stat__label {
          font-size: 11px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

// ============================================
// Competencies Panel
// ============================================

interface CompetenciesPanelProps {
  supervisees: Supervisee[];
  competencyAreas: CompetencyArea[];
  supervisorId: string;
}

const CompetenciesPanel: React.FC<CompetenciesPanelProps> = ({ 
  supervisees, 
  competencyAreas,
  supervisorId,
}) => {
  const [selectedSupervisee, setSelectedSupervisee] = useState<string>(supervisees[0]?.id || '');
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const handleRatingChange = async (areaId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [areaId]: rating }));
    
    try {
      await invoke('update_competency_rating', {
        superviseeId: selectedSupervisee,
        competencyArea: areaId,
        rating,
        raterId: supervisorId,
      });
    } catch (err) {
      console.error('Failed to update rating:', err);
    }
  };

  const categories = [...new Set(competencyAreas.map(a => a.category))];

  return (
    <div className="competencies-panel">
      <div className="competencies-panel__header">
        <select 
          value={selectedSupervisee}
          onChange={(e) => setSelectedSupervisee(e.target.value)}
          className="supervisee-select"
        >
          {supervisees.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      
      {categories.map(category => (
        <div key={category} className="competency-category">
          <h3>{category} Competencies</h3>
          <div className="competency-list">
            {competencyAreas
              .filter(area => area.category === category)
              .map(area => (
                <div key={area.id} className="competency-row">
                  <div className="competency-row__name">{area.name}</div>
                  <div className="competency-row__rating">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        className={`rating-btn ${(ratings[area.id] || 0) >= n ? 'active' : ''}`}
                        onClick={() => handleRatingChange(area.id, n)}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
      
      <style>{`
        .competencies-panel__header {
          margin-bottom: 24px;
        }
        
        .supervisee-select {
          padding: 10px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          min-width: 200px;
        }
        
        .competency-category {
          margin-bottom: 32px;
        }
        
        .competency-category h3 {
          font-size: 16px;
          margin-bottom: 16px;
          color: #64748b;
        }
        
        .competency-list {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }
        
        .competency-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }
        
        .competency-row:last-child {
          border-bottom: none;
        }
        
        .competency-row__name {
          font-weight: 500;
        }
        
        .competency-row__rating {
          display: flex;
          gap: 4px;
        }
        
        .rating-btn {
          width: 32px;
          height: 32px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.15s ease;
        }
        
        .rating-btn:hover {
          border-color: #2563eb;
        }
        
        .rating-btn.active {
          background: #2563eb;
          color: white;
          border-color: #2563eb;
        }
      `}</style>
    </div>
  );
};

// ============================================
// Reports Panel
// ============================================

interface ReportsPanelProps {
  supervisees: Supervisee[];
  supervisorId: string;
}

const ReportsPanel: React.FC<ReportsPanelProps> = ({ supervisees, supervisorId }) => {
  const reports = [
    { id: 'supervision-log', name: 'Supervision Log', description: 'Record of all supervision sessions and topics' },
    { id: 'competency-progress', name: 'Competency Progress Report', description: 'Track growth across competency domains' },
    { id: 'note-activity', name: 'Documentation Activity', description: 'Summary of notes created and reviewed' },
    { id: 'hours-log', name: 'Supervision Hours Log', description: 'For internship/licensure hour tracking' },
  ];

  return (
    <div className="reports-panel">
      <h3>Generate Reports</h3>
      <div className="reports-grid">
        {reports.map(report => (
          <div key={report.id} className="report-card">
            <div className="report-card__name">{report.name}</div>
            <div className="report-card__description">{report.description}</div>
            <button className="btn btn--small">Generate</button>
          </div>
        ))}
      </div>
      
      <style>{`
        .reports-panel h3 {
          margin-bottom: 16px;
        }
        
        .reports-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        
        .report-card {
          padding: 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
        }
        
        .report-card__name {
          font-weight: 600;
          margin-bottom: 8px;
        }
        
        .report-card__description {
          font-size: 14px;
          color: #64748b;
          margin-bottom: 16px;
        }
      `}</style>
    </div>
  );
};

// ============================================
// Note Review Modal
// ============================================

interface NoteReviewModalProps {
  item: ReviewQueueItem;
  supervisorId: string;
  onClose: () => void;
  onCoSign: () => void;
}

const NoteReviewModal: React.FC<NoteReviewModalProps> = ({ item, supervisorId, onClose, onCoSign }) => {
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'strength' | 'growth' | 'question'>('strength');

  const handleAddFeedback = async () => {
    if (!feedback.trim()) return;
    
    try {
      await invoke('add_feedback_annotation', {
        noteId: item.noteId,
        annotationType: feedbackType === 'strength' ? 'Strength' : feedbackType === 'growth' ? 'Improvement' : 'Question',
        content: feedback,
        supervisorId,
      });
      setFeedback('');
    } catch (err) {
      console.error('Failed to add feedback:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Review Note</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="review-meta">
            <p><strong>Client:</strong> {item.clientName}</p>
            <p><strong>Type:</strong> {item.noteType}</p>
            <p><strong>By:</strong> {item.superviseeName}</p>
            <p><strong>Signed:</strong> {new Date(item.signedAt).toLocaleString()}</p>
          </div>
          
          {item.hasRiskFlags && (
            <div className="risk-alert">
               This note contains {item.detectionCount} safety detection(s) that require review
            </div>
          )}
          
          <div className="note-content-placeholder">
            <p><em>Note content would be displayed here</em></p>
          </div>
          
          <div className="feedback-section">
            <h4>Add Feedback</h4>
            <div className="feedback-type-selector">
              <button 
                className={feedbackType === 'strength' ? 'active' : ''}
                onClick={() => setFeedbackType('strength')}
              >
                 Strength
              </button>
              <button 
                className={feedbackType === 'growth' ? 'active' : ''}
                onClick={() => setFeedbackType('growth')}
              >
                 Growth Area
              </button>
              <button 
                className={feedbackType === 'question' ? 'active' : ''}
                onClick={() => setFeedbackType('question')}
              >
                 Question
              </button>
            </div>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Enter feedback for supervisee..."
              rows={3}
            />
            <button className="btn btn--small" onClick={handleAddFeedback}>
              Add Feedback
            </button>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={onCoSign}>
            Co-Sign Note
          </button>
        </div>
      </div>
      
      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          border-radius: 16px;
          width: 90%;
          max-width: 700px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .modal-header h2 {
          margin: 0;
        }
        
        .modal-close {
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          font-size: 24px;
          cursor: pointer;
          border-radius: 6px;
        }
        
        .modal-close:hover {
          background: #f1f5f9;
        }
        
        .modal-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
        }
        
        .review-meta {
          background: #f8fafc;
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        
        .review-meta p {
          margin: 4px 0;
        }
        
        .risk-alert {
          background: #fee2e2;
          color: #991b1b;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        
        .note-content-placeholder {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 16px;
          min-height: 150px;
        }
        
        .feedback-section h4 {
          margin-bottom: 12px;
        }
        
        .feedback-type-selector {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }
        
        .feedback-type-selector button {
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          background: white;
          border-radius: 8px;
          cursor: pointer;
        }
        
        .feedback-type-selector button.active {
          background: #eff6ff;
          border-color: #2563eb;
          color: #2563eb;
        }
        
        .feedback-section textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-family: inherit;
          resize: vertical;
          margin-bottom: 12px;
        }
        
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #e2e8f0;
        }
      `}</style>
    </div>
  );
};

// ============================================
// Mock Data
// ============================================

const getMockStats = (): DashboardStats => ({
  totalSupervisees: 3,
  activeNotes: 12,
  pendingReview: 4,
  overdueReview: 1,
  avgReviewTimeHours: 18.5,
  notesThisMonth: 47,
});

const getMockQueue = (): ReviewQueueItem[] => [
  {
    noteId: 'note-1',
    clientName: 'Client A.',
    noteType: 'Progress Note',
    superviseeId: 'sup-1',
    superviseeName: 'Dr. Smith (Postdoc)',
    signedAt: new Date(Date.now() - 80 * 60 * 60 * 1000).toISOString(),
    hoursPending: 80,
    priority: 'normal',
    hasRiskFlags: false,
    detectionCount: 0,
    isOverdue: true,
  },
  {
    noteId: 'note-2',
    clientName: 'Client B.',
    noteType: 'Crisis Note',
    superviseeId: 'sup-2',
    superviseeName: 'J. Doe (Intern)',
    signedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    hoursPending: 4,
    priority: 'urgent',
    hasRiskFlags: true,
    detectionCount: 2,
    isOverdue: false,
  },
];

const getMockSupervisees = (): Supervisee[] => [
  {
    id: 'sup-1',
    name: 'Dr. Sarah Smith',
    credentials: 'Ph.D.',
    level: 'postdoc',
    startDate: '2025-07-01',
    notesThisWeek: 8,
    notesPendingReview: 1,
    lastActivity: new Date().toISOString(),
  },
  {
    id: 'sup-2',
    name: 'James Doe',
    credentials: 'M.A.',
    level: 'intern',
    startDate: '2025-09-01',
    notesThisWeek: 4,
    notesPendingReview: 3,
    lastActivity: new Date().toISOString(),
  },
];

export default SupervisorDashboard;
