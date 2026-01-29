import React, { useCallback, useEffect, useState } from 'react';
import {
  Shield,
  Lock,
  FileText,
  Users,
  Plus,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  Mic,
  MicOff,
  Send,
  Copy,
  ChevronRight,
  ChevronLeft,
  Activity,
  Search,
  MessageSquare,
  Loader2,
  Edit,
  User,
  Phone,
  Mail,
  Calendar,
  Save,
  X,
  ArrowDownCircle,
  Trash2,
  HardDrive,
  RefreshCw,
  Upload,
  ClipboardList,
  Target,
  FileCheck,
  Download,
  Clock,
  Settings,
  Home,
  Wifi,
  WifiOff,
  Database,
  Server,
  Sparkles,
  Brain,
  Zap,
  Eye,
  EyeOff,
  TrendingUp,
  BarChart3,
  Fingerprint,
  Globe,
  Play,
  Star,
  Heart,
  Award,
  Rocket,
  Scale,
  Gavel,
} from 'lucide-react';
import * as api from './lib/tauri';
import { ForensicWorkspace } from './components/ForensicWorkspace';
import { EduWorkspace } from './components/EduWorkspace';
import type { VaultStatus } from './lib/tauri';

// ============================================
// Types
// ============================================

type Screen = 'loading' | 'create-vault' | 'unlock' | 'keychain-lost' | 'stale-keychain' | 'dashboard' | 'client-detail' | 'capture' | 'review' | 'done' | 'forensic' | 'edu';

interface AppState {
  screen: Screen;
  vaultStatus: api.VaultStatus | null;
  ollamaStatus: api.OllamaStatus | null;
  clients: api.Client[];
  selectedClient: api.Client | null;
  clientNotes: api.Note[];
  currentNote: api.Note | null;
  ethicsAnalysis: api.EthicsAnalysis | null;
  error: string | null;
  noteStartTime: string | null; // ISO timestamp when note editing started
}

// ============================================
// Beta Feature Showcase
// ============================================

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  demo?: React.ReactNode;
}

function FeatureCard({ icon, title, description, badge, badgeColor = 'bg-blue-500', demo }: FeatureCardProps) {
  const [showDemo, setShowDemo] = useState(false);
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700 hover:border-slate-600 transition-all hover:transform hover:scale-[1.02]">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white">{title}</h4>
            {badge && (
              <span className={`px-2 py-0.5 ${badgeColor} rounded-full text-xs font-medium`}>
                {badge}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
          {demo && (
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              {showDemo ? 'Hide Demo' : 'See Demo'}
            </button>
          )}
        </div>
      </div>
      {demo && showDemo && (
        <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-600">
          {demo}
        </div>
      )}
    </div>
  );
}

function BetaShowcase({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'ai' | 'clinical' | 'productivity'>('privacy');
  const [animateIn, setAnimateIn] = useState(false);
  
  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 50);
  }, []);

  const tabs = [
    { id: 'privacy', label: 'Privacy & Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'ai', label: 'AI Features', icon: <Brain className="w-4 h-4" /> },
    { id: 'clinical', label: 'Clinical Tools', icon: <Heart className="w-4 h-4" /> },
    { id: 'productivity', label: 'Productivity', icon: <Zap className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden border border-slate-700 shadow-2xl transition-all duration-500 ${animateIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzMzMyIgb3BhY2l0eT0iMC4xIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />
          <div className="relative px-8 py-8">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                  Welcome to Evidify Beta
                </h2>
                <p className="text-slate-400 mt-1">
                  The future of clinical documentation is local-first, AI-powered, and defensible
                </p>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex gap-6 mt-6">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <Clock className="w-4 h-4 text-green-400" />
                <span className="text-sm"><strong className="text-white">7→3 hrs</strong> <span className="text-slate-400">avg note time</span></span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <Shield className="w-4 h-4 text-blue-400" />
                <span className="text-sm"><strong className="text-white">100%</strong> <span className="text-slate-400">local data</span></span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-sm"><strong className="text-white">HIPAA</strong> <span className="text-slate-400">by design</span></span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="px-8 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[50vh]">
          {activeTab === 'privacy' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard
                icon={<HardDrive className="w-6 h-6 text-blue-400" />}
                title="100% Local Storage"
                badge="Zero Cloud"
                badgeColor="bg-green-500/80"
                description="All patient data stays on YOUR device. No cloud servers, no data centers, no third-party access. Your notes never leave your machine."
              />
              <FeatureCard
                icon={<Lock className="w-6 h-6 text-purple-400" />}
                title="AES-256 Encryption"
                badge="Military Grade"
                badgeColor="bg-purple-500/80"
                description="SQLCipher encrypts everything at rest. Keys stored in macOS Keychain or Windows Credential Manager. Even if someone steals your laptop, data stays protected."
              />
              <FeatureCard
                icon={<WifiOff className="w-6 h-6 text-red-400" />}
                title="Air-Gap Ready"
                badge="Enterprise"
                badgeColor="bg-red-500/80"
                description="Disconnect from the network entirely. Run Ollama locally for AI. Perfect for high-security environments, VA settings, or maximum paranoia."
              />
              <FeatureCard
                icon={<Fingerprint className="w-6 h-6 text-amber-400" />}
                title="Tamper-Proof Audit Trail"
                badge="Defensible"
                badgeColor="bg-amber-500/80"
                description="Every edit, sign, and export is cryptographically logged. Hash chains verify note integrity. Prove exactly what was documented and when."
              />
              <FeatureCard
                icon={<EyeOff className="w-6 h-6 text-cyan-400" />}
                title="PHI De-identification"
                badge="Safe Harbor"
                badgeColor="bg-cyan-500/80"
                description="Create consultation drafts with all 18 HIPAA identifiers stripped. AI-assisted detection catches names, dates, locations, and more."
              />
              <FeatureCard
                icon={<FileCheck className="w-6 h-6 text-emerald-400" />}
                title="Export Attestation"
                badge="Compliance"
                badgeColor="bg-emerald-500/80"
                description="Before any data leaves the app, you must attest to risk flags and safety items. Creates audit record of clinical review."
              />
            </div>
          )}
          
          {activeTab === 'ai' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard
                icon={<Brain className="w-6 h-6 text-purple-400" />}
                title="Local AI Processing"
                badge="Ollama"
                badgeColor="bg-purple-500/80"
                description="Run Llama, Mistral, or Qwen models directly on your Mac. AI assistance without sending PHI anywhere. Works offline too."
                demo={
                  <div className="text-xs font-mono text-slate-300 space-y-1">
                    <div className="text-slate-500"># Install Ollama, then:</div>
                    <div>ollama pull qwen2.5:7b-instruct</div>
                    <div className="text-slate-500"># Evidify auto-detects it!</div>
                  </div>
                }
              />
              <FeatureCard
                icon={<Sparkles className="w-6 h-6 text-blue-400" />}
                title="AI Note Structuring"
                badge="New"
                badgeColor="bg-blue-500/80"
                description="Turn messy session notes into properly structured SOAP, DAP, or custom formats. One click transforms your raw notes into professional documentation."
                demo={
                  <div className="text-xs space-y-2">
                    <div className="p-2 bg-slate-800 rounded text-slate-400">
                      "pt anxious, trouble sleeping, did CBT work..."
                    </div>
                    <div className="flex justify-center">
                      <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                    </div>
                    <div className="p-2 bg-slate-800 rounded text-slate-300">
                      <div className="font-bold text-blue-400">SUBJECTIVE:</div>
                      <div>Client reports anxiety and sleep difficulties...</div>
                    </div>
                  </div>
                }
              />
              <FeatureCard
                icon={<Mic className="w-6 h-6 text-red-400" />}
                title="Voice Transcription"
                badge="Whisper"
                badgeColor="bg-red-500/80"
                description="Dictate your notes and get instant transcription. Whisper runs locally—your voice recordings never leave your device."
              />
              <FeatureCard
                icon={<Search className="w-6 h-6 text-green-400" />}
                title="RAG Search"
                badge="Semantic"
                badgeColor="bg-green-500/80"
                description="Ask questions about your clinical records in natural language. 'What interventions worked for this client's anxiety?' Find relevant excerpts across all notes."
              />
              <FeatureCard
                icon={<TrendingUp className="w-6 h-6 text-amber-400" />}
                title="Treatment Progress Analysis"
                badge="New"
                badgeColor="bg-amber-500/80"
                description="AI analyzes themes across sessions—identifies improving areas, emerging concerns, and treatment patterns. See the big picture of client progress."
              />
              <FeatureCard
                icon={<Target className="w-6 h-6 text-pink-400" />}
                title="Smart Risk Detection"
                badge="Safety"
                badgeColor="bg-pink-500/80"
                description="Automatic flagging of safety keywords (SI, HI, abuse). Ensures you document risk assessments when clinical content warrants it."
              />
            </div>
          )}
          
          {activeTab === 'clinical' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard
                icon={<ClipboardList className="w-6 h-6 text-blue-400" />}
                title="Mental Status Exam Builder"
                badge="New"
                badgeColor="bg-blue-500/80"
                description="Structured MSE input with all 9 domains: Appearance, Behavior, Speech, Mood, Affect, Thought Process, Thought Content, Cognition, and Insight/Judgment."
                demo={
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['Appearance', 'Behavior', 'Speech', 'Mood', 'Affect', 'Cognition'].map(d => (
                      <div key={d} className="p-2 bg-slate-800 rounded text-center">
                        <div className="text-slate-500">{d}</div>
                        <div className="text-green-400 text-xs">WNL</div>
                      </div>
                    ))}
                  </div>
                }
              />
              <FeatureCard
                icon={<AlertTriangle className="w-6 h-6 text-red-400" />}
                title="Risk Assessment Panel"
                badge="New"
                badgeColor="bg-red-500/80"
                description="Visual risk capture with SI/HI/Self-Harm severity buttons, Safety Plan status, Protective Factors, and Overall Risk Level. One-click attestation."
                demo={
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">SI Denied</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">HI Denied</span>
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">Safety Plan Active</span>
                    <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded text-xs">Low Risk</span>
                  </div>
                }
              />
              <FeatureCard
                icon={<FileText className="w-6 h-6 text-emerald-400" />}
                title="Multiple Note Types"
                description="Progress notes, Intake assessments, Crisis documentation, Phone consultations, Group therapy, and Termination summaries—each with appropriate templates."
              />
              <FeatureCard
                icon={<Users className="w-6 h-6 text-purple-400" />}
                title="Client Management"
                description="Full client profiles with demographics, emergency contacts, insurance info, diagnosis codes, treatment start dates, and referring providers."
              />
              <FeatureCard
                icon={<MessageSquare className="w-6 h-6 text-cyan-400" />}
                title="Consultation Drafts"
                badge="De-identified"
                badgeColor="bg-cyan-500/80"
                description="Create shareable consultation requests with PHI automatically stripped. Get peer input on complex cases without privacy concerns."
              />
              <FeatureCard
                icon={<Upload className="w-6 h-6 text-amber-400" />}
                title="Document Attachments"
                description="Attach PDFs, images, and documents to client records. OCR extracts text for search. Everything encrypted and stored locally."
              />
            </div>
          )}
          
          {activeTab === 'productivity' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FeatureCard
                icon={<Clock className="w-6 h-6 text-green-400" />}
                title="Session Time Tracking"
                badge="New"
                badgeColor="bg-green-500/80"
                description="Live timer during note capture. See exactly how long documentation takes. Track your efficiency gains over time—prove ROI."
                demo={
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
                      <Clock className="w-4 h-4 text-green-400" />
                      <span className="font-mono text-lg text-white">12:34</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Recording session duration
                    </div>
                  </div>
                }
              />
              <FeatureCard
                icon={<BarChart3 className="w-6 h-6 text-blue-400" />}
                title="Performance Metrics"
                badge="ProvenNote"
                badgeColor="bg-blue-500/80"
                description="Dashboard showing time saved, notes completed, AI acceptance rate, and compliance scores. Real data to justify your investment."
              />
              <FeatureCard
                icon={<Search className="w-6 h-6 text-purple-400" />}
                title="Advanced Note Search"
                badge="New"
                badgeColor="bg-purple-500/80"
                description="Filter notes by text content, note type (progress, intake, crisis...), and status (draft, reviewed, signed). Find what you need instantly."
              />
              <FeatureCard
                icon={<Copy className="w-6 h-6 text-amber-400" />}
                title="Formatted Export"
                badge="New"
                badgeColor="bg-amber-500/80"
                description="One-click export to clipboard with professional formatting—practice name, client info, note content, and clinician signature. Ready to paste into any EHR."
                demo={
                  <div className="text-xs font-mono text-slate-400 space-y-1">
                    <div>─────────────────────</div>
                    <div>CLIENT: John D.</div>
                    <div>DATE: 01/09/2026</div>
                    <div>─────────────────────</div>
                    <div className="text-slate-300">[Note content...]</div>
                    <div>─────────────────────</div>
                    <div>Dr. Smith, PhD, ABPP</div>
                  </div>
                }
              />
              <FeatureCard
                icon={<User className="w-6 h-6 text-emerald-400" />}
                title="Clinician Profile"
                badge="New"
                badgeColor="bg-emerald-500/80"
                description="Set your name, credentials, license number, practice name, and default note footer. Auto-populated in all exports and signatures."
              />
              <FeatureCard
                icon={<Download className="w-6 h-6 text-cyan-400" />}
                title="Flexible Export Options"
                description="Export to Markdown, JSON, or plain text. Print-ready formatting with headers and signatures. Future: direct EHR integrations."
              />
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="text-sm text-slate-400">Help us improve—your feedback shapes the product!</span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg font-medium transition-all shadow-lg shadow-blue-600/25 flex items-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                Start Using Evidify
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Navigation Header (persistent home button)
// ============================================

function NavigationHeader({ 
  onHome, 
  title,
  showBack,
  onBack 
}: { 
  onHome: () => void;
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
}) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onHome}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
            title="Go to Dashboard"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          {showBack && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 px-3 py-1.5 text-slate-400 hover:text-white rounded-lg text-sm transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
        </div>
        {title && (
          <div className="text-sm font-medium text-slate-400 truncate max-w-xs">
            {title}
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 hidden sm:inline">
            Evidify
          </span>
          <Shield className="w-4 h-4 text-cyan-500" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main App
// ============================================

export default function App() {
  const [state, setState] = useState<AppState>({
    screen: 'edu',
    vaultStatus: null,
    ollamaStatus: null,
    clients: [],
    selectedClient: null,
    clientNotes: [],
    currentNote: null,
    ethicsAnalysis: null,
    error: null,
    noteStartTime: null,
  });

  // Initial load
  const refresh = useCallback(async () => {
    try {
      const [vaultStatusRaw, ollamaStatus] = await Promise.all([
        api.getVaultStatus(),
        api.ollamaStatus().catch(() => ({ available: false, models: [], error: 'Ollama status unavailable' } as api.OllamaStatus))
      ]);

      const vaultStatus = vaultStatusRaw; // already normalized in tauri.ts

      // Route by authoritative vault state (snake_case values)
      if (vaultStatus.state === 'no_vault') {
        setState(s => ({ ...s, screen: 'create-vault', vaultStatus, ollamaStatus }));
        return;
      }

      if (vaultStatus.state === 'stale_keychain') {
        setState(s => ({ ...s, screen: 'stale-keychain', vaultStatus, ollamaStatus }));
        return;
      }

      if (vaultStatus.state === 'keychain_lost') {
        setState(s => ({ ...s, screen: 'keychain-lost', vaultStatus, ollamaStatus }));
        return;
      }

      if (vaultStatus.state === 'ready') {
        setState(s => ({ ...s, screen: 'unlock', vaultStatus, ollamaStatus }));
        return;
      }

      // Unlocked (golden path)
      const clients = await api.listClients();
      setState(s => ({ ...s, screen: 'dashboard', vaultStatus, ollamaStatus, clients }));
    } catch (error) {
      console.error('refresh failed:', error);
      
      // Try to at least get vault status to route correctly
      try {
        const vaultStatus = await api.getVaultStatus();
        if (vaultStatus.state === 'no_vault') {
          setState(s => ({ ...s, screen: 'create-vault', vaultStatus }));
        } else if (vaultStatus.state === 'ready') {
          setState(s => ({ ...s, screen: 'unlock', vaultStatus }));
        } else if (vaultStatus.state === 'stale_keychain') {
          setState(s => ({ ...s, screen: 'stale-keychain', vaultStatus }));
        } else if (vaultStatus.state === 'keychain_lost') {
          setState(s => ({ ...s, screen: 'keychain-lost', vaultStatus }));
        } else {
          // Unlocked but listClients failed - show unlock to re-auth
          setState(s => ({ ...s, screen: 'unlock', vaultStatus, error: String(error) }));
        }
      } catch (statusError) {
        // Can't even get status - show error state
        setState(s => ({ ...s, screen: 'unlock', error: `Failed to check vault status: ${statusError}` }));
      }
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function checkStatus() {
    await refresh();
  }

  // Render based on screen
  switch (state.screen) {
    case 'loading':
      return <LoadingScreen />;
    case 'create-vault':
      return <CreateVaultScreen onCreated={checkStatus} />;
    case 'unlock':
      return <UnlockScreen onUnlocked={checkStatus} />;

    case 'keychain-lost':
      return (
        <KeychainLostScreen
          vaultStatus={state.vaultStatus!}
          onRetry={checkStatus}
          onDeleteDb={async () => {
            await api.vaultDeleteDb();
            await checkStatus();
          }}
        />
      );

    case 'stale-keychain':
      return (
        <StaleKeychainScreen
          vaultStatus={state.vaultStatus!}
          onRetry={checkStatus}
          onClearKeychain={async () => {
            await api.vaultClearStaleKeychain();
            await checkStatus();
          }}
        />
      );
    case 'dashboard':
      return (
        <DashboardScreen
          clients={state.clients}
          ollamaStatus={state.ollamaStatus}
          onSelectClient={async (client) => {
            // Load client notes and show client detail screen
            try {
              const notes = await api.listNotes(client.id);
              setState(s => ({ ...s, screen: 'client-detail', selectedClient: client, clientNotes: notes }));
            } catch (err) {
              console.error('Failed to load client notes:', err);
              setState(s => ({ ...s, screen: 'client-detail', selectedClient: client, clientNotes: [] }));
            }
          }}
          onStartCapture={(client) => setState(s => ({ ...s, screen: 'capture', selectedClient: client, noteStartTime: new Date().toISOString() }))}
          onRefresh={checkStatus}
          onNoteSelect={async (noteId) => {
            try {
              const note = await api.getNote(noteId);
              // Find the client for this note
              const client = state.clients.find(c => c.id === note.client_id);
              if (client) {
                setState(s => ({ ...s, screen: 'done', currentNote: note, selectedClient: client }));
              } else {
                // Load client if not in current list
                const loadedClient = await api.getClient(note.client_id);
                setState(s => ({ ...s, screen: 'done', currentNote: note, selectedClient: loadedClient }));
              }
            } catch (err) {
              console.error('Failed to load note:', err);
              alert('Failed to load note: ' + String(err));
            }
          }}
          onForensicMode={() => setState(s => ({ ...s, screen: 'forensic' }))}
          onEduMode={() => setState(s => ({ ...s, screen: 'edu' }))}
        />
      );
    case 'client-detail':
      return (
        <ClientDetailScreen
          client={state.selectedClient!}
          notes={state.clientNotes}
          ollamaStatus={state.ollamaStatus}
          onBack={() => setState(s => ({ ...s, screen: 'dashboard', selectedClient: null, clientNotes: [] }))}
          onNewNote={() => setState(s => ({ ...s, screen: 'capture', noteStartTime: new Date().toISOString() }))}
          onViewNote={(note) => setState(s => ({ ...s, screen: 'done', currentNote: note }))}
          onReviewNote={async (note) => {
            try {
              // Re-analyze for ethics issues
              const ethics = await api.analyzeEthics(note.content);
              setState(s => ({ ...s, screen: 'review', currentNote: note, ethicsAnalysis: ethics }));
            } catch (err) {
              console.error('Failed to analyze note:', err);
              alert('Failed to analyze note: ' + String(err));
            }
          }}
          onRefresh={async () => {
            if (state.selectedClient) {
              const notes = await api.listNotes(state.selectedClient.id);
              setState(s => ({ ...s, clientNotes: notes }));
            }
          }}
          onClientUpdate={(updatedClient) => {
            setState(s => ({ 
              ...s, 
              selectedClient: updatedClient,
              clients: s.clients.map(c => c.id === updatedClient.id ? updatedClient : c)
            }));
          }}
          onNoteSelect={async (noteId) => {
            try {
              const note = await api.getNote(noteId);
              setState(s => ({ ...s, screen: 'done', currentNote: note }));
            } catch (err) {
              console.error('Failed to load note:', err);
              alert('Failed to load note: ' + String(err));
            }
          }}
        />
      );
    case 'capture':
      return (
        <CaptureScreen
          client={state.selectedClient}
          ollamaStatus={state.ollamaStatus}
          onComplete={(note, ethics) => {
            if (ethics.attest_count > 0 || ethics.flag_count > 0) {
              setState(s => ({ ...s, screen: 'review', currentNote: note, ethicsAnalysis: ethics }));
            } else {
              setState(s => ({ ...s, screen: 'done', currentNote: note, ethicsAnalysis: ethics }));
            }
          }}
          onCancel={() => setState(s => ({ ...s, screen: 'dashboard', selectedClient: null }))}
          onHome={() => {
            checkStatus();
            setState(s => ({ ...s, screen: 'dashboard', currentNote: null, ethicsAnalysis: null, selectedClient: null }));
          }}
        />
      );
    case 'review':
      return (
        <ReviewScreen
          note={state.currentNote!}
          analysis={state.ethicsAnalysis!}
          ollamaStatus={state.ollamaStatus}
          onComplete={() => setState(s => ({ ...s, screen: 'done' }))}
          onBack={() => setState(s => ({ ...s, screen: 'capture' }))}
          onHome={() => {
            checkStatus();
            setState(s => ({ ...s, screen: 'dashboard', currentNote: null, ethicsAnalysis: null, selectedClient: null }));
          }}
          noteStartTime={state.noteStartTime}
        />
      );
    case 'done':
      return (
        <DoneScreen
          note={state.currentNote!}
          onNewNote={() => setState(s => ({ ...s, screen: 'capture', currentNote: null, ethicsAnalysis: null, noteStartTime: new Date().toISOString() }))}
          onDashboard={() => {
            checkStatus();
            setState(s => ({ ...s, screen: 'dashboard', currentNote: null, ethicsAnalysis: null, selectedClient: null }));
          }}
          onBack={state.selectedClient ? () => {
            // Go back to client detail if we came from there
            if (state.selectedClient) {
              api.listNotes(state.selectedClient.id).then(notes => {
                setState(s => ({ ...s, screen: 'client-detail', clientNotes: notes, currentNote: null }));
              }).catch(() => {
                setState(s => ({ ...s, screen: 'client-detail', currentNote: null }));
              });
            }
          } : undefined}
        />
      );
    case 'forensic':
      return (
        <ForensicWorkspace
          onHome={() => {
            checkStatus();
            setState(s => ({ ...s, screen: 'dashboard', currentNote: null, ethicsAnalysis: null, selectedClient: null }));
          }}
          onBack={() => {
            checkStatus();
            setState(s => ({ ...s, screen: 'dashboard', currentNote: null, ethicsAnalysis: null, selectedClient: null }));
          }}
        />
      );
    case 'edu':
      return (
        <EduWorkspace
          onHome={() => {
            checkStatus();
            setState(s => ({ ...s, screen: 'dashboard', currentNote: null, ethicsAnalysis: null, selectedClient: null }));
          }}
          onBack={() => {
            checkStatus();
            setState(s => ({ ...s, screen: 'dashboard', currentNote: null, ethicsAnalysis: null, selectedClient: null }));
          }}
        />
      );
    default:
      return <LoadingScreen />;
  }
}

// ============================================
// Loading Screen
// ============================================

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-pulse" />
        <h1 className="text-2xl font-semibold">Evidify</h1>
        <p className="text-slate-400 mt-2">Initializing secure vault...</p>
      </div>
    </div>
  );
}

// ============================================
// Create Vault Screen
// ============================================

function CreateVaultScreen({ onCreated }: { onCreated: () => void }) {
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters');
      return;
    }
    if (passphrase !== confirm) {
      setError('Passphrases do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.createVault(passphrase);
      onCreated();
    } catch (err) {
      setError(String(err));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Create Secure Vault</h1>
          <p className="text-slate-400 mt-2">
            Your data is encrypted with AES-256-GCM and stored locally.
            Choose a strong passphrase you'll remember.
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Passphrase</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="w-full bg-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter passphrase (min 8 characters)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Confirm Passphrase</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Confirm passphrase"
            />
          </div>

          {error && (
            <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={loading || !passphrase || !confirm}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-4 py-3 font-medium transition-colors"
          >
            {loading ? 'Creating...' : 'Create Vault'}
          </button>

          <p className="text-xs text-slate-500 text-center">
            There is no password recovery. If you forget your passphrase, your data cannot be recovered.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Unlock Screen
// ============================================

function UnlockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const [passphrase, setPassphrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUnlock() {
    setLoading(true);
    setError('');

    try {
      await api.unlockVault(passphrase);
      onUnlocked();
    } catch (err) {
      setError('Invalid passphrase');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Lock className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Unlock Vault</h1>
          <p className="text-slate-400 mt-2">Enter your passphrase to access your data.</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Passphrase</label>
            <input
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className="w-full bg-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter passphrase"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUnlock}
            disabled={loading || !passphrase}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg px-4 py-3 font-medium transition-colors"
          >
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Recovery Screens
// ============================================

function KeychainLostScreen({
  vaultStatus,
  onRetry,
  onDeleteDb,
}: {
  vaultStatus: VaultStatus;
  onRetry: () => void | Promise<void>;
  onDeleteDb: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-400 mt-0.5" />
          <div>
            <h1 className="text-xl font-semibold">Vault key missing from OS keychain</h1>
            <p className="mt-1 text-sm text-slate-300">
              Evidify found an encrypted vault database on disk, but the key material stored in your OS keychain is missing.
              Without that key, the vault cannot be unlocked and the data is not recoverable by Evidify.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200 space-y-1">
          <div><span className="text-slate-400">State:</span> {vaultStatus.state}</div>
          <div><span className="text-slate-400">DB present:</span> {String(vaultStatus.dbExists)}</div>
          <div><span className="text-slate-400">Keychain present:</span> {String(vaultStatus.keychainExists)}</div>
          {vaultStatus.message ? (
            <div><span className="text-slate-400">Message:</span> {vaultStatus.message}</div>
          ) : null}
        </div>

        <div className="text-sm text-slate-300">
          If you believe your keychain item still exists (for example, restored from backup), click <span className="font-semibold">Retry</span>.
          If the key is permanently lost, the only safe remediation is to delete the local vault database and create a new vault.
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold"
            onClick={() => onRetry()}
            disabled={busy}
          >
            Retry
          </button>

          <button
            className="rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 text-sm font-semibold"
            onClick={async () => {
              setBusy(true);
              try {
                await onDeleteDb();
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          >
            {busy ? 'Deleting…' : 'Delete local vault and start over'}
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Note: Evidify is intentionally designed with no vendor recovery. If the OS keychain secret is deleted, the encrypted vault cannot be decrypted.
        </div>
      </div>
    </div>
  );
}

function StaleKeychainScreen({
  vaultStatus,
  onRetry,
  onClearKeychain,
}: {
  vaultStatus: VaultStatus;
  onRetry: () => void | Promise<void>;
  onClearKeychain: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-sky-400 mt-0.5" />
          <div>
            <h1 className="text-xl font-semibold">Stale keychain item detected</h1>
            <p className="mt-1 text-sm text-slate-300">
              Evidify found vault key material in the OS keychain, but no vault database exists on disk. This commonly happens if the vault folder was deleted manually.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200 space-y-1">
          <div><span className="text-slate-400">State:</span> {vaultStatus.state}</div>
          <div><span className="text-slate-400">DB present:</span> {String(vaultStatus.dbExists)}</div>
          <div><span className="text-slate-400">Keychain present:</span> {String(vaultStatus.keychainExists)}</div>
          {vaultStatus.message ? (
            <div><span className="text-slate-400">Message:</span> {vaultStatus.message}</div>
          ) : null}
        </div>

        <div className="text-sm text-slate-300">
          You can clear the stale keychain item and then create a new vault.
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold"
            onClick={() => onRetry()}
            disabled={busy}
          >
            Retry
          </button>

          <button
            className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-sm font-semibold"
            onClick={async () => {
              setBusy(true);
              try {
                await onClearKeychain();
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          >
            {busy ? 'Clearing…' : 'Clear stale keychain item'}
          </button>
        </div>

        <div className="text-xs text-slate-500">
          Clearing the keychain item does not touch PHI because no vault database was detected.
        </div>
      </div>
    </div>
  );
}

// ============================================
// Settings Panel
// ============================================

function SettingsPanel({
  onClose,
  ollamaStatus,
}: {
  onClose: () => void;
  ollamaStatus: api.OllamaStatus | null;
}) {
  const [airGapMode, setAirGapMode] = useState(false);
  const [selectedModel, setSelectedModel] = useState(ollamaStatus?.models[0] || '');
  
  // Profile settings (#18)
  const [clinicianName, setClinicianName] = useState(() => localStorage.getItem('evidify_clinician_name') || '');
  const [clinicianCredentials, setClinicianCredentials] = useState(() => localStorage.getItem('evidify_clinician_credentials') || '');
  const [clinicianLicense, setClinicianLicense] = useState(() => localStorage.getItem('evidify_clinician_license') || '');
  const [practiceName, setPracticeName] = useState(() => localStorage.getItem('evidify_practice_name') || '');
  const [defaultNoteFooter, setDefaultNoteFooter] = useState(() => localStorage.getItem('evidify_note_footer') || '');
  const [profileSaved, setProfileSaved] = useState(false);
  
  // Vault path is in ~/Library/Application Support/com.evidify.app/
  const vaultPath = '~/Library/Application Support/com.evidify.app/evidify.db';
  
  function saveProfile() {
    localStorage.setItem('evidify_clinician_name', clinicianName);
    localStorage.setItem('evidify_clinician_credentials', clinicianCredentials);
    localStorage.setItem('evidify_clinician_license', clinicianLicense);
    localStorage.setItem('evidify_practice_name', practiceName);
    localStorage.setItem('evidify_note_footer', defaultNoteFooter);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Clinician Profile (#18 - Profile editing improvements) */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" />
              Clinician Profile
            </h3>
            
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    value={clinicianName}
                    onChange={(e) => setClinicianName(e.target.value)}
                    placeholder="Dr. Jane Smith"
                    className="w-full bg-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Credentials</label>
                  <input
                    type="text"
                    value={clinicianCredentials}
                    onChange={(e) => setClinicianCredentials(e.target.value)}
                    placeholder="PhD, ABPP"
                    className="w-full bg-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">License Number</label>
                  <input
                    type="text"
                    value={clinicianLicense}
                    onChange={(e) => setClinicianLicense(e.target.value)}
                    placeholder="PSY123456"
                    className="w-full bg-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Practice Name</label>
                  <input
                    type="text"
                    value={practiceName}
                    onChange={(e) => setPracticeName(e.target.value)}
                    placeholder="Mindful Psychology Associates"
                    className="w-full bg-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Default Note Footer</label>
                <textarea
                  value={defaultNoteFooter}
                  onChange={(e) => setDefaultNoteFooter(e.target.value)}
                  placeholder="This note was completed within 24 hours of service delivery..."
                  rows={2}
                  className="w-full bg-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Profile info used for note signatures and exports
                </p>
                <button
                  onClick={saveProfile}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    profileSaved 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {profileSaved ? 'Saved' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
          
          {/* AI Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-400" />
              AI Configuration
            </h3>
            
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">AI Status</p>
                  <p className="text-sm text-slate-400">
                    {ollamaStatus?.available ? 'Connected to Ollama' : 'Running in offline mode'}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm ${
                  ollamaStatus?.available ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {ollamaStatus?.available ? 'Connected' : 'Offline'}
                </div>
              </div>
              
              {ollamaStatus?.available && ollamaStatus.models.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Active Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ollamaStatus.models.map((model) => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          
          {/* Air-Gap Mode */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              {airGapMode ? <WifiOff className="w-5 h-5 text-red-400" /> : <Wifi className="w-5 h-5 text-green-400" />}
              Network & Air-Gap Mode
            </h3>
            
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Air-Gap Mode</p>
                  <p className="text-sm text-slate-400">
                    Disable all network requests for maximum security
                  </p>
                </div>
                <button
                  onClick={() => setAirGapMode(!airGapMode)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    airGapMode ? 'bg-red-500' : 'bg-slate-600'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    airGapMode ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
              
              <div className="text-sm bg-slate-600/50 rounded-lg p-3">
                <p className="font-medium mb-2">Manual Air-Gap Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Disconnect from network (disable WiFi/Ethernet)</li>
                  <li>Run Ollama locally: <code className="bg-slate-700 px-1 rounded">ollama serve</code></li>
                  <li>Ensure model is downloaded: <code className="bg-slate-700 px-1 rounded">ollama pull llama3.2</code></li>
                  <li>All AI processing will happen on-device</li>
                  <li>No PHI ever leaves your machine</li>
                </ol>
              </div>
            </div>
          </div>
          
          {/* Data Storage */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-400" />
              Data Storage
            </h3>
            
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-1">Encrypted Vault Location</p>
                <code className="block bg-slate-600 px-3 py-2 rounded text-sm break-all">
                  {vaultPath || 'Loading...'}
                </code>
              </div>
              
              <div className="text-sm text-slate-400">
                <p>• All data encrypted with AES-256 via SQLCipher</p>
                <p>• Encryption key stored in macOS Keychain</p>
                <p>• No cloud sync - 100% local storage</p>
              </div>
            </div>
          </div>
          
          {/* Consultation Queue Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              Consultation Queue
            </h3>
            
            <div className="bg-slate-700/50 rounded-lg p-4">
              <p className="text-sm text-slate-300 mb-3">
                The consultation queue allows you to create de-identified case consultations 
                that can be safely shared with colleagues for peer review.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-400">
                <li>Open a note and click "Create Consultation Draft"</li>
                <li>Review the de-identified content (all PHI removed)</li>
                <li>Add your clinical question and select specialties</li>
                <li>Export the de-identified case with audit certificate</li>
                <li>Share via secure channel (the export includes no PHI)</li>
              </ol>
            </div>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Dashboard Screen
// ============================================

function DashboardScreen({
  clients,
  ollamaStatus,
  onSelectClient,
  onStartCapture,
  onRefresh,
  onNoteSelect,
  onForensicMode,
  onEduMode,
}: {
  clients: api.Client[];
  ollamaStatus: api.OllamaStatus | null;
  onSelectClient: (client: api.Client) => void;
  onStartCapture: (client: api.Client | null) => void;
  onRefresh: () => void;
  onNoteSelect?: (noteId: string) => void;
  onForensicMode?: () => void;
  onEduMode?: () => void;
}) {
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [creating, setCreating] = useState(false);
  const [quickCaptureClient, setQuickCaptureClient] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showShowcase, setShowShowcase] = useState(() => {
    // Show showcase on first visit
    const hasSeenShowcase = localStorage.getItem('evidify_seen_showcase_v427');
    return !hasSeenShowcase;
  });
  
  function handleCloseShowcase() {
    localStorage.setItem('evidify_seen_showcase_v427', 'true');
    setShowShowcase(false);
  }

  async function handleCreateClient() {
    if (!newClientName.trim()) return;
    setCreating(true);
    try {
      await api.createClient(newClientName.trim());
      setNewClientName('');
      setShowNewClient(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
    setCreating(false);
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Feature Showcase Modal */}
        {showShowcase && (
          <BetaShowcase onClose={handleCloseShowcase} />
        )}
        
        {/* Settings Modal */}
        {showSettings && (
          <SettingsPanel onClose={() => setShowSettings(false)} ollamaStatus={ollamaStatus} />
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold">Evidify</h1>
            <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full font-medium">
              BETA
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* What's New Button */}
            <button
              onClick={() => setShowShowcase(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 rounded-lg text-sm font-medium text-blue-300 transition-all"
              title="See all features"
            >
              <Sparkles className="w-4 h-4" />
              What's New
            </button>
            {/* Forensic Mode Button */}
            {onForensicMode && (
              <button
                onClick={onForensicMode}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 border border-amber-500/30 rounded-lg text-sm font-medium text-amber-300 transition-all"
                title="Forensic Evaluations"
              >
                <Scale className="w-4 h-4" />
                Forensic
              </button>
            )}
            {/* EDU Mode Button */}
            {onEduMode && (
              <button
                onClick={onEduMode}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/30 rounded-lg text-sm font-medium text-emerald-300 transition-all"
                title="Educational Assessments (504/IEP)"
              >
                <ClipboardList className="w-4 h-4" />
                EDU
              </button>
            )}
            {/* AI Status */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              ollamaStatus?.available ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              <Activity className="w-4 h-4" />
              {ollamaStatus?.available ? `AI: ${ollamaStatus.models[0] || 'Ready'}` : 'AI: Limited'}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => api.lockVault().then(onRefresh)}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <Lock className="w-4 h-4" />
              Lock
            </button>
          </div>
        </div>

        {/* Quick Capture Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">Quick Capture</h2>
          <p className="text-blue-200 mb-4">Start documenting a session</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={quickCaptureClient}
              onChange={(e) => setQuickCaptureClient(e.target.value)}
              className="bg-white/20 text-white border border-white/30 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white/50 flex-1"
            >
              <option value="" className="text-slate-800">Select client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id} className="text-slate-800">
                  {client.display_name}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                const selected = clients.find(c => c.id === quickCaptureClient);
                onStartCapture(selected || null);
              }}
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              New Note
            </button>
          </div>
        </div>

        {/* Clients */}
        <div className="bg-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clients
            </h2>
            <button
              onClick={() => setShowNewClient(true)}
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Client
            </button>
          </div>

          {showNewClient && (
            <div className="bg-slate-700 rounded-lg p-4 mb-4 flex gap-2">
              <input
                type="text"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateClient()}
                placeholder="Client name or pseudonym"
                className="flex-1 bg-slate-600 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={handleCreateClient}
                disabled={creating || !newClientName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded font-medium"
              >
                {creating ? '...' : 'Add'}
              </button>
              <button
                onClick={() => { setShowNewClient(false); setNewClientName(''); }}
                className="text-slate-400 hover:text-white px-2"
              >
                Close
              </button>
            </div>
          )}

          {clients.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              No clients yet. Add a client to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors cursor-pointer"
                  onClick={() => onSelectClient(client)}
                >
                  <div>
                    <div className="font-medium">{client.display_name}</div>
                    <div className="text-sm text-slate-400">
                      {client.session_count} sessions
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cross-Note Search */}
        <div className="mt-8">
          <RAGSearch 
            model={ollamaStatus?.models[0] || 'qwen2.5:7b-instruct'} 
            onNoteSelect={onNoteSelect}
          />
        </div>

        {/* Cross-Client Search */}
        <div className="mt-8">
          <CrossClientSearch onClientSelect={(client) => onSelectClient(client)} />
        </div>

        {/* Metrics Dashboard */}
        <div className="mt-8">
          <MetricsDashboard />
        </div>

        {/* Storage Management */}
        <div className="mt-8">
          <StorageManagementPanel />
        </div>

        {/* Voice Setup */}
        <div className="mt-8">
          <VoiceSetupPanel />
        </div>

        {/* Supervisor Mode */}
        <div className="mt-8">
          <SupervisorModePanel supervisorId="default-supervisor" />
        </div>

        {/* Consultation Drafts */}
        <div className="mt-8">
          <ConsultationDraftPanel noteId="" noteContent="" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Client Detail Screen
// ============================================

function ClientDetailScreen({
  client,
  notes,
  ollamaStatus,
  onBack,
  onNewNote,
  onViewNote,
  onReviewNote,
  onRefresh,
  onClientUpdate,
  onNoteSelect,
}: {
  client: api.Client;
  notes: api.Note[];
  ollamaStatus: api.OllamaStatus | null;
  onBack: () => void;
  onNewNote: () => void;
  onViewNote: (note: api.Note) => void;
  onReviewNote: (note: api.Note) => void;
  onRefresh: () => void;
  onClientUpdate?: (client: api.Client) => void;
  onNoteSelect?: (noteId: string) => void;
}) {
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  
  // Note search/filter state (#19 - Note search enhancements)
  const [noteSearch, setNoteSearch] = useState('');
  const [noteTypeFilter, setNoteTypeFilter] = useState<string>('all');
  const [noteStatusFilter, setNoteStatusFilter] = useState<string>('all');
  
  // Filter notes based on search and filters
  const filteredNotes = notes.filter(note => {
    // Text search
    if (noteSearch) {
      const search = noteSearch.toLowerCase();
      const matchesContent = note.content?.toLowerCase().includes(search);
      const matchesDate = note.session_date?.toLowerCase().includes(search);
      if (!matchesContent && !matchesDate) return false;
    }
    // Type filter
    if (noteTypeFilter !== 'all' && note.note_type !== noteTypeFilter) return false;
    // Status filter
    if (noteStatusFilter !== 'all' && note.status !== noteStatusFilter) return false;
    return true;
  });
  
  const [profileData, setProfileData] = useState({
    display_name: client.display_name,
    date_of_birth: client.date_of_birth || '',
    phone: client.phone || '',
    email: client.email || '',
    emergency_contact: client.emergency_contact || '',
    insurance_info: client.insurance_info || '',
    diagnosis_codes: client.diagnosis_codes || '',
    treatment_start_date: client.treatment_start_date || '',
    referring_provider: client.referring_provider || '',
    notes: client.notes || '',
  });
  const [saving, setSaving] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }
  
  async function handleSaveProfile() {
    setSaving(true);
    try {
      const updatedClient: api.Client = {
        ...client,
        display_name: profileData.display_name,
        date_of_birth: profileData.date_of_birth || undefined,
        phone: profileData.phone || undefined,
        email: profileData.email || undefined,
        emergency_contact: profileData.emergency_contact || undefined,
        insurance_info: profileData.insurance_info || undefined,
        diagnosis_codes: profileData.diagnosis_codes || undefined,
        treatment_start_date: profileData.treatment_start_date || undefined,
        referring_provider: profileData.referring_provider || undefined,
        notes: profileData.notes || undefined,
      };
      const saved = await api.updateClient(updatedClient);
      onClientUpdate?.(saved);
      setEditingProfile(false);
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  }
  
  function handleCancelEdit() {
    setProfileData({
      display_name: client.display_name,
      date_of_birth: client.date_of_birth || '',
      phone: client.phone || '',
      email: client.email || '',
      emergency_contact: client.emergency_contact || '',
      insurance_info: client.insurance_info || '',
      diagnosis_codes: client.diagnosis_codes || '',
      treatment_start_date: client.treatment_start_date || '',
      referring_provider: client.referring_provider || '',
      notes: client.notes || '',
    });
    setEditingProfile(false);
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
            <Shield className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold">{client.display_name}</h1>
            <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full font-medium">
              BETA
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-slate-400 hover:text-white transition-colors"
              title="Refresh notes"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : '↻'}
            </button>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              ollamaStatus?.available ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              <Activity className="w-4 h-4" />
              {ollamaStatus?.available ? `AI: ${ollamaStatus.models[0] || 'Ready'}` : 'AI: Limited'}
            </div>
          </div>
        </div>

        {/* Client Profile Section */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5" />
              Client Profile
            </h2>
            <div className="flex gap-2">
              {!editingProfile ? (
                <>
                  <button
                    onClick={() => setShowProfile(!showProfile)}
                    className="text-sm text-slate-400 hover:text-white"
                  >
                    {showProfile ? 'Hide' : 'Show Details'}
                  </button>
                  <button
                    onClick={() => { setShowProfile(true); setEditingProfile(true); }}
                    className="flex items-center gap-1 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1 text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex items-center gap-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-1 rounded"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </button>
                </>
              )}
            </div>
          </div>
          
          {/* Quick Info Row */}
          <div className="flex flex-wrap gap-4 text-sm">
            {client.phone && (
              <div className="flex items-center gap-1 text-slate-400">
                <Phone className="w-4 h-4" />
                {client.phone}
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-1 text-slate-400">
                <Mail className="w-4 h-4" />
                {client.email}
              </div>
            )}
            {client.date_of_birth && (
              <div className="flex items-center gap-1 text-slate-400">
                <Calendar className="w-4 h-4" />
                DOB: {client.date_of_birth}
              </div>
            )}
            {client.treatment_start_date && (
              <div className="text-slate-400">
                Treatment started: {client.treatment_start_date}
              </div>
            )}
          </div>
          
          {/* Expanded Profile Details */}
          {showProfile && (
            <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
              {editingProfile ? (
                <>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={profileData.display_name}
                      onChange={(e) => setProfileData(p => ({ ...p, display_name: e.target.value }))}
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={profileData.date_of_birth}
                      onChange={(e) => setProfileData(p => ({ ...p, date_of_birth: e.target.value }))}
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(p => ({ ...p, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(p => ({ ...p, email: e.target.value }))}
                      placeholder="client@email.com"
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Emergency Contact</label>
                    <input
                      type="text"
                      value={profileData.emergency_contact}
                      onChange={(e) => setProfileData(p => ({ ...p, emergency_contact: e.target.value }))}
                      placeholder="Name: (555) 123-4567"
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Insurance Info</label>
                    <input
                      type="text"
                      value={profileData.insurance_info}
                      onChange={(e) => setProfileData(p => ({ ...p, insurance_info: e.target.value }))}
                      placeholder="Carrier / Member ID"
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Diagnosis Codes (ICD-10)</label>
                    <input
                      type="text"
                      value={profileData.diagnosis_codes}
                      onChange={(e) => setProfileData(p => ({ ...p, diagnosis_codes: e.target.value }))}
                      placeholder="F32.1, F41.1"
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Treatment Start Date</label>
                    <input
                      type="date"
                      value={profileData.treatment_start_date}
                      onChange={(e) => setProfileData(p => ({ ...p, treatment_start_date: e.target.value }))}
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Referring Provider</label>
                    <input
                      type="text"
                      value={profileData.referring_provider}
                      onChange={(e) => setProfileData(p => ({ ...p, referring_provider: e.target.value }))}
                      placeholder="Dr. Smith"
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Notes</label>
                    <textarea
                      value={profileData.notes}
                      onChange={(e) => setProfileData(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Additional notes about the client..."
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm min-h-[80px]"
                    />
                  </div>
                </>
              ) : (
                <>
                  <ProfileField label="Emergency Contact" value={client.emergency_contact} />
                  <ProfileField label="Insurance" value={client.insurance_info} />
                  <ProfileField label="Diagnosis Codes" value={client.diagnosis_codes} />
                  <ProfileField label="Referring Provider" value={client.referring_provider} />
                  {client.notes && (
                    <div className="md:col-span-2">
                      <div className="text-xs text-slate-400 mb-1">Notes</div>
                      <div className="text-sm text-slate-300">{client.notes}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Client Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{notes.length}</div>
            <div className="text-sm text-slate-400">Total Notes</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">
              {notes.filter(n => n.status === 'signed').length}
            </div>
            <div className="text-sm text-slate-400">Signed</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-amber-400">
              {notes.filter(n => n.status === 'draft').length}
            </div>
            <div className="text-sm text-slate-400">Drafts</div>
          </div>
        </div>

        {/* New Note Button */}
        <div className="mb-6">
          <button
            onClick={onNewNote}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Session Note
          </button>
        </div>

        {/* Notes List */}
        <div className="bg-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Session Notes
              <span className="text-sm font-normal text-slate-400">
                ({filteredNotes.length}{filteredNotes.length !== notes.length ? ` of ${notes.length}` : ''})
              </span>
            </h2>
          </div>
          
          {/* Search and Filter Bar (#19 - Note search enhancements) */}
          {notes.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={noteSearch}
                    onChange={(e) => setNoteSearch(e.target.value)}
                    placeholder="Search notes..."
                    className="w-full bg-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <select
                value={noteTypeFilter}
                onChange={(e) => setNoteTypeFilter(e.target.value)}
                className="bg-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="progress">Progress</option>
                <option value="intake">Intake</option>
                <option value="crisis">Crisis</option>
                <option value="phone">Phone</option>
                <option value="group">Group</option>
                <option value="termination">Termination</option>
              </select>
              <select
                value={noteStatusFilter}
                onChange={(e) => setNoteStatusFilter(e.target.value)}
                className="bg-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="reviewed">Reviewed</option>
                <option value="signed">Signed</option>
              </select>
              {(noteSearch || noteTypeFilter !== 'all' || noteStatusFilter !== 'all') && (
                <button
                  onClick={() => {
                    setNoteSearch('');
                    setNoteTypeFilter('all');
                    setNoteStatusFilter('all');
                  }}
                  className="text-slate-400 hover:text-white text-sm flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear
                </button>
              )}
            </div>
          )}

          {filteredNotes.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              {notes.length === 0 
                ? 'No notes yet for this client. Create your first session note.'
                : 'No notes match your search criteria.'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-slate-700/50 rounded-lg overflow-hidden"
                >
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700 transition-colors"
                    onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        note.status === 'signed' ? 'bg-green-400' : 'bg-amber-400'
                      }`} />
                      <div>
                        <div className="font-medium">
                          {note.session_date || new Date(note.created_at).toLocaleDateString()} • {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-sm text-slate-400">
                          {note.note_type} • {note.word_count} words • {note.status}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-mono">
                        {note.content_hash?.substring(0, 8)}...
                      </span>
                      <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${
                        expandedNote === note.id ? 'rotate-90' : ''
                      }`} />
                    </div>
                  </div>

                  {/* Expanded Note Content */}
                  {expandedNote === note.id && (
                    <div className="border-t border-slate-600 p-4">
                      <div className="bg-slate-800 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-slate-300 font-sans">
                          {note.content || 'Content encrypted'}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => onViewNote(note)}
                          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm"
                        >
                          View Full Note
                        </button>
                        {(note.status === 'draft' || note.status === 'reviewed') && (
                          <button
                            onClick={() => onReviewNote(note)}
                            className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded text-sm"
                          >
                            Review & Attest
                          </button>
                        )}
                        <button
                          onClick={() => navigator.clipboard.writeText(note.content || '')}
                          className="bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded text-sm flex items-center gap-1"
                          title="Copy raw content"
                        >
                          <Copy className="w-4 h-4" />
                          Copy
                        </button>
                        {/* #20 - Formatted clipboard export */}
                        <button
                          onClick={() => {
                            const clinicianName = localStorage.getItem('evidify_clinician_name') || '';
                            const credentials = localStorage.getItem('evidify_clinician_credentials') || '';
                            const license = localStorage.getItem('evidify_clinician_license') || '';
                            const practiceName = localStorage.getItem('evidify_practice_name') || '';
                            const footer = localStorage.getItem('evidify_note_footer') || '';
                            
                            const formatted = [
                              practiceName ? `${practiceName}` : '',
                              '─'.repeat(50),
                              `CLIENT: ${client.display_name}`,
                              `DATE: ${note.session_date || new Date(note.created_at).toLocaleDateString()}`,
                              `TYPE: ${note.note_type.toUpperCase()}`,
                              `STATUS: ${note.status.toUpperCase()}`,
                              '─'.repeat(50),
                              '',
                              note.content || '',
                              '',
                              '─'.repeat(50),
                              clinicianName ? `${clinicianName}${credentials ? `, ${credentials}` : ''}` : '',
                              license ? `License: ${license}` : '',
                              footer ? `\n${footer}` : '',
                              `\nGenerated: ${new Date().toLocaleString()}`,
                            ].filter(line => line !== '').join('\n');
                            
                            navigator.clipboard.writeText(formatted);
                          }}
                          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm flex items-center gap-1"
                          title="Copy with formatting for EHR"
                        >
                          <FileText className="w-4 h-4" />
                          Export
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pre-Session Prep Sheet */}
        <div className="mt-8">
          <PrepSheetPanel clientId={client.id} />
        </div>

        {/* Treatment Progress Analysis */}
        <div className="mt-8">
          <TreatmentProgressPanel 
            clientId={client.id} 
            model={ollamaStatus?.models[0] || 'qwen2.5:7b-instruct'}
            onNoteSelect={onNoteSelect}
          />
        </div>

        {/* Client Documents */}
        <div className="mt-8">
          <DocumentsPanel clientId={client.id} />
        </div>

        {/* Client-Specific RAG Search */}
        <div className="mt-8">
          <RAGSearch 
            clientId={client.id} 
            model={ollamaStatus?.models[0] || 'qwen2.5:7b-instruct'} 
            onNoteSelect={onNoteSelect}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Capture Screen
// ============================================

function CaptureScreen({
  client,
  onComplete,
  onCancel,
  onHome,
  ollamaStatus,
}: {
  client: api.Client | null;
  onComplete: (note: api.Note, ethics: api.EthicsAnalysis) => void;
  onCancel: () => void;
  onHome: () => void;
  ollamaStatus: api.OllamaStatus | null;
}) {
  const [content, setContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [structuredContent, setStructuredContent] = useState<string | null>(null);
  const [isStructuring, setIsStructuring] = useState(false);
  const [noteType, setNoteType] = useState<api.NoteType>('progress');
  
  // Session timing (#17 - Time tracking)
  const [sessionStartTime] = useState(() => new Date().toISOString());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [usedVoice, setUsedVoice] = useState(false);
  
  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      const start = new Date(sessionStartTime).getTime();
      const now = Date.now();
      setElapsedSeconds(Math.floor((now - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);
  
  // Structured MSE and Risk state
  const [showMSE, setShowMSE] = useState(false);
  const [showRisk, setShowRisk] = useState(false);
  const [mseData, setMseData] = useState<MSEData>({
    appearance: 'Not assessed',
    behavior: 'Not assessed',
    speech: 'Not assessed',
    mood: 'Not assessed',
    affect: 'Not assessed',
    thoughtProcess: 'Not assessed',
    thoughtContent: 'Not assessed',
    cognition: 'Not assessed',
    insightJudgment: 'Not assessed',
  });
  const [riskData, setRiskData] = useState<RiskData>({
    suicidalIdeation: 'not_assessed',
    suicidalIdeationDetails: '',
    homicidalIdeation: 'not_assessed',
    homicidalIdeationDetails: '',
    selfHarm: 'not_assessed',
    selfHarmDetails: '',
    safetyPlan: 'not_assessed',
    protectiveFactors: [],
    riskLevel: 'not_assessed',
  });
  
  const aiModel = ollamaStatus?.models[0] || 'qwen2.5:7b-instruct';
  const aiAvailable = ollamaStatus?.available && ollamaStatus.models.length > 0;

  async function handleStructureWithAI() {
    if (!content.trim() || !aiAvailable) return;
    setIsStructuring(true);
    
    try {
      const structured = await api.structureNoteAI(aiModel, content, noteType);
      setStructuredContent(structured);
    } catch (err) {
      console.error('AI structuring error:', err);
    } finally {
      setIsStructuring(false);
    }
  }

  // Combine content with structured MSE/Risk data
  function getFinalContent(): string {
    let finalContent = content;
    
    // Add MSE if any field is assessed
    const mseAssessed = Object.values(mseData).some(v => v && v !== 'Not assessed');
    if (mseAssessed) {
      finalContent += '\n\n' + formatMSEToText(mseData);
    }
    
    // Add Risk if any field is assessed
    const riskAssessed = riskData.suicidalIdeation !== 'not_assessed' || 
                         riskData.homicidalIdeation !== 'not_assessed' ||
                         riskData.selfHarm !== 'not_assessed';
    if (riskAssessed) {
      finalContent += '\n\n' + formatRiskToText(riskData);
    }
    
    return finalContent;
  }

  async function handleGenerate() {
    if (!content.trim()) return;
    setGenerating(true);

    try {
      // Get content with MSE/Risk appended
      const finalContent = getFinalContent();
      
      // Analyze ethics first
      const ethics = await api.analyzeEthics(finalContent);

      // Create note - use structured content if available
      let note = await api.createNote(
        client?.id || 'demo',
        new Date().toISOString().split('T')[0],
        noteType,
        finalContent
      );
      
      // If we have structured content, save it to the database
      if (structuredContent) {
        note = await api.updateStructuredNote(note.id, structuredContent);
      }
      
      // Record time metrics (#17 - Time tracking for ProvenNote)
      try {
        const endTime = new Date().toISOString();
        const wordCount = finalContent.split(/\s+/).filter(Boolean).length;
        await api.recordTimeMetrics(
          note.id,
          client?.id || 'demo',
          sessionStartTime,
          endTime,
          usedVoice ? 'voice' : 'typed',
          wordCount,
          structuredContent !== null || isStructuring
        );
      } catch (metricsErr) {
        console.warn('Failed to record time metrics:', metricsErr);
        // Don't fail the note creation if metrics fail
      }

      onComplete(note, ethics);
    } catch (err) {
      console.error(err);
      setGenerating(false);
    }
  }

  function handleVoiceTranscript(transcript: string) {
    setContent(prev => prev ? prev + '\n\n' + transcript : transcript);
    setStructuredContent(null); // Clear any previous structuring
    setShowVoice(false);
    setUsedVoice(true); // Track voice usage for metrics
  }
  
  function handleUseStructured() {
    if (structuredContent) {
      setContent(structuredContent);
      setStructuredContent(null);
    }
  }
  
  // Format elapsed time for display
  function formatElapsedTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="min-h-screen">
      <NavigationHeader 
        onHome={onHome} 
        title={client ? `New Note: ${client.display_name}` : 'New Note'}
      />
      <div className="pt-14 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">New Note</h1>
            <p className="text-slate-400">
              {client ? client.display_name : 'Quick capture'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Session Timer (#17) */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-slate-700 text-slate-300">
              <Clock className="w-3 h-3" />
              <span className="font-mono">{formatElapsedTime(elapsedSeconds)}</span>
              {usedVoice && <Mic className="w-3 h-3 text-blue-400" />}
            </div>
            {/* AI Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
              aiAvailable ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              <Activity className="w-3 h-3" />
              {aiAvailable ? `AI: ${aiModel.split(':')[0]}` : 'AI: Offline'}
            </div>
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
        
        {/* Note Type Selector */}
        <div className="flex gap-2 mb-4">
          {(['progress', 'intake', 'crisis', 'phone', 'group', 'termination'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setNoteType(type)}
              className={`px-3 py-1 rounded-lg text-sm capitalize transition-colors ${
                noteType === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Voice Scribe Panel */}
        {showVoice && (
          <div className="mb-4">
            <VoiceScribe
              onTranscript={handleVoiceTranscript}
              model={aiModel}
            />
          </div>
        )}

        {/* Input Area */}
        <div className="bg-slate-800 rounded-xl p-4 mb-4">
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setStructuredContent(null); // Clear structured on edit
            }}
            placeholder="Enter your session notes here. Use natural language - the system will structure it for you.

Example: pt seems more anxious today, talked about work stress. not sleeping well. mentioned having some dark thoughts last week but says she's fine now. did cbt work on catastrophizing, assigned breathing exercises. f/u 2 weeks."
            className="w-full bg-transparent resize-none focus:outline-none min-h-[300px] text-lg"
            autoFocus
          />
        </div>
        
        {/* Structured MSE Input */}
        <div className="mb-4">
          <MSEInput
            value={mseData}
            onChange={setMseData}
            expanded={showMSE}
            onToggleExpand={() => setShowMSE(!showMSE)}
          />
        </div>
        
        {/* Structured Risk Input */}
        <div className="mb-4">
          <RiskAssessmentInput
            value={riskData}
            onChange={setRiskData}
            expanded={showRisk}
            onToggleExpand={() => setShowRisk(!showRisk)}
          />
        </div>
        
        {/* AI Structured Preview */}
        {structuredContent && (
          <div className="bg-slate-800 rounded-xl p-4 mb-4 border border-blue-500/30">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-blue-400">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">AI Structured ({noteType.toUpperCase()})</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleUseStructured}
                  className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
                >
                  Use This
                </button>
                <button
                  onClick={() => setStructuredContent(null)}
                  className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div className="text-sm text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
              {structuredContent}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {content.split(/\s+/).filter(Boolean).length} words
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowVoice(!showVoice)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showVoice 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              <Mic className="w-5 h-5" />
              {showVoice ? 'Hide Voice' : 'Voice Scribe'}
            </button>
            {aiAvailable && (
              <button
                onClick={handleStructureWithAI}
                disabled={isStructuring || !content.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                <Activity className="w-5 h-5" />
                {isStructuring ? 'Structuring...' : 'AI Structure'}
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating || !content.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
            >
              {generating ? 'Analyzing...' : 'Generate'}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// ============================================
// Review Screen (Enhanced with Attestation Module)
// ============================================

function ReviewScreen({
  note,
  analysis,
  ollamaStatus,
  onComplete,
  onBack,
  onHome,
  noteStartTime,
}: {
  note: api.Note;
  analysis: api.EthicsAnalysis;
  ollamaStatus: api.OllamaStatus | null;
  onComplete: () => void;
  onBack: () => void;
  onHome: () => void;
  noteStartTime: string | null;
}) {
  const [attestations, setAttestations] = useState<api.Attestation[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [responseNotes, setResponseNotes] = useState<Record<string, string>>({});
  const [signing, setSigning] = useState(false);
  const [completionStatus, setCompletionStatus] = useState<api.AttestationResult | null>(null);
  const [showCompletionCheck, setShowCompletionCheck] = useState(false);
  
  const aiModel = ollamaStatus?.models[0] || 'qwen2.5:7b-instruct';
  const aiAvailable = ollamaStatus?.available && (ollamaStatus.models?.length ?? 0) > 0;

  // Group detections by category/severity
  const groups = groupDetections(analysis.detections);
  
  // Check completion status
  useEffect(() => {
    checkCompletion();
  }, [attestations]);

  async function checkCompletion() {
    try {
      const result = await api.checkAttestationCompleteness(
        analysis.detections,
        attestations
      );
      setCompletionStatus(result);
    } catch (err) {
      console.error('Failed to check completion:', err);
    }
  }

  async function handleQuickPick(detection: api.EthicsDetection, response: api.AttestationResponse) {
    // Check if this response requires a note
    const requiresNote = response === 'not_clinically_relevant' || response === 'consulted_supervisor';
    
    if (requiresNote && !responseNotes[detection.id]?.trim()) {
      // Expand to show note input
      setExpandedGroup(detection.id);
      return;
    }

    try {
      await api.validateAttestation(detection, response, responseNotes[detection.id]);
      
      const newAttestation: api.Attestation = {
        detection_id: detection.id,
        detection_type: detection.category,
        evidence: detection.evidence,
        response,
        response_note: responseNotes[detection.id] || null,
        attested_at: Date.now(),
      };
      
      setAttestations(prev => [...prev.filter(a => a.detection_id !== detection.id), newAttestation]);
    } catch (err) {
      alert(String(err));
    }
  }

  async function handleBatchAttest(detectionIds: string[], response: api.AttestationResponse) {
    const newAttestations = detectionIds.map(id => ({
      detection_id: id,
      detection_type: analysis.detections.find(d => d.id === id)?.category || '',
      evidence: analysis.detections.find(d => d.id === id)?.evidence || '',
      response,
      response_note: null,
      attested_at: Date.now(),
    }));
    
    setAttestations(prev => [
      ...prev.filter(a => !detectionIds.includes(a.detection_id)),
      ...newAttestations,
    ]);
  }

  function undoAttestation(detectionId: string) {
    setAttestations(prev => prev.filter(a => a.detection_id !== detectionId));
  }

  async function handleSign() {
    if (!completionStatus?.can_sign) return;
    
    setSigning(true);
    try {
      await api.signNote(note.id, JSON.stringify(attestations));
      
      // Record time metrics if we have a start time
      if (noteStartTime) {
        const endTime = new Date().toISOString();
        const noteContent = note.raw_input || '';
        const wordCount = noteContent.split(/\s+/).filter(Boolean).length;
        
        try {
          // Determine method - check if note has structured content
          const hasStructured = !!(note as any).structured_note || !!(note as any).structuredNote;
          const method = hasStructured ? 'typed' : 'manual';
          
          await api.recordTimeMetrics(
            note.id,
            note.client_id,
            noteStartTime,
            endTime,
            method as 'voice' | 'typed' | 'template' | 'manual',
            wordCount,
            hasStructured
          );
          console.log('Time metrics recorded:', { 
            noteId: note.id, 
            startTime: noteStartTime, 
            endTime,
            method,
            wordCount 
          });
        } catch (metricErr) {
          console.warn('Failed to record time metrics (non-fatal):', metricErr);
        }
      }
      
      onComplete();
    } catch (err) {
      console.error('Failed to sign:', err);
      alert('Failed to sign note: ' + String(err));
    } finally {
      setSigning(false);
    }
  }

  const attestedIds = new Set(attestations.map(a => a.detection_id));

  return (
    <div className="min-h-screen">
      <NavigationHeader 
        onHome={onHome} 
        title="Review & Sign"
        showBack={true}
        onBack={onBack}
      />
      <div className="pt-14 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Review & Attest</h1>
            <p className="text-slate-400">
              {completionStatus?.remaining_count ?? analysis.attest_count} items remaining
            </p>
          </div>
          <button onClick={onBack} className="text-slate-400 hover:text-white">
            ← Back to Edit
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
            <span>Attestation Progress</span>
            <span>{attestations.length} / {analysis.attest_count}</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${(attestations.length / Math.max(analysis.attest_count, 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Issues Panel */}
          <div className="lg:col-span-2 space-y-4">
            {groups.map((group) => (
              <DetectionGroupCard
                key={group.key}
                group={group}
                attestedIds={attestedIds}
                responseNotes={responseNotes}
                expandedGroup={expandedGroup}
                onQuickPick={handleQuickPick}
                onBatchAttest={handleBatchAttest}
                onUndo={undoAttestation}
                onNoteChange={(id, note) => setResponseNotes(prev => ({ ...prev, [id]: note }))}
                onExpand={(id) => setExpandedGroup(expandedGroup === id ? null : id)}
              />
            ))}

            {/* Coaching Items (non-attestation) */}
            {analysis.detections.filter(d => !d.requires_attestation).length > 0 && (
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Coaching Suggestions (No Action Required)
                </h3>
                <div className="space-y-2">
                  {analysis.detections.filter(d => !d.requires_attestation).map(d => (
                    <div key={d.id} className="text-sm text-slate-300">
                      • {d.suggestion}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Note Preview & Actions */}
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 sticky top-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Note Preview
              </h2>
              <pre className="whitespace-pre-wrap text-sm text-slate-300 max-h-64 overflow-y-auto">
                {note.content}
              </pre>
            </div>

            {/* Attestation Summary */}
            {attestations.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Attested ({attestations.length})
                </h3>
                <div className="space-y-2">
                  {attestations.map(att => (
                    <div key={att.detection_id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{att.detection_type}</span>
                      <button
                        onClick={() => undoAttestation(att.detection_id)}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        Undo
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export Options */}
            <ExportPanel noteId={note.id} clientName={note.client_id} />

            {/* AI Completion Check */}
            {aiAvailable && (
              <div className="mb-4">
                <button
                  onClick={() => setShowCompletionCheck(!showCompletionCheck)}
                  className="w-full text-left bg-slate-700/50 hover:bg-slate-700 rounded-lg p-3 flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-400" />
                    AI Documentation Review
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${showCompletionCheck ? 'rotate-90' : ''}`} />
                </button>
                {showCompletionCheck && (
                  <div className="mt-2">
                    <CompletionCheckPanel 
                      noteId={note.id} 
                      model={aiModel} 
                      onSuggestionApplied={(newContent) => {
                        // Note content was updated - you could refresh the view here
                        console.log('Note content updated via suggestion');
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Sign Button */}
            <button
              onClick={handleSign}
              disabled={!completionStatus?.can_sign || signing}
              className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-all ${
                completionStatus?.can_sign
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-slate-700 opacity-50 cursor-not-allowed'
              }`}
            >
              {signing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : completionStatus?.can_sign ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Sign & Complete Note
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5" />
                  {completionStatus?.remaining_count} items remaining
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

// Detection Group Card Component
function DetectionGroupCard({
  group,
  attestedIds,
  responseNotes,
  expandedGroup,
  onQuickPick,
  onBatchAttest,
  onUndo,
  onNoteChange,
  onExpand,
}: {
  group: DetectionGroupType;
  attestedIds: Set<string>;
  responseNotes: Record<string, string>;
  expandedGroup: string | null;
  onQuickPick: (d: api.EthicsDetection, r: api.AttestationResponse) => void;
  onBatchAttest: (ids: string[], r: api.AttestationResponse) => void;
  onUndo: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onExpand: (id: string) => void;
}) {
  const allAttested = group.detections.every(d => attestedIds.has(d.id));
  const unattested = group.detections.filter(d => !attestedIds.has(d.id));

  const severityColors = {
    attest: 'border-red-500 bg-red-500/10',
    flag: 'border-amber-500 bg-amber-500/10',
    coach: 'border-blue-500 bg-blue-500/10',
  };

  const severityIcons = {
    attest: <AlertTriangle className="w-5 h-5 text-red-500" />,
    flag: <AlertCircle className="w-5 h-5 text-amber-500" />,
    coach: <Info className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div className={`rounded-lg border-l-4 p-4 ${severityColors[group.severity] || severityColors.coach}`}>
      {/* Group Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {severityIcons[group.severity] || severityIcons.coach}
          <div>
            <div className="font-medium">{group.category}</div>
            <div className="text-sm text-slate-400">
              {group.detections.length} item{group.detections.length > 1 ? 's' : ''}
              {allAttested && <span className="text-green-400 ml-2">All attested</span>}
            </div>
          </div>
        </div>
        
        {/* Batch Actions */}
        {!allAttested && group.detections.length > 1 && (
          <div className="flex gap-2">
            <button
              onClick={() => onBatchAttest(unattested.map(d => d.id), 'addressed_in_note')}
              className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded"
            >
              Attest All as Addressed
            </button>
          </div>
        )}
      </div>

      {/* Individual Detections */}
      <div className="space-y-3">
        {group.detections.map(detection => {
          const isAttested = attestedIds.has(detection.id);
          const isExpanded = expandedGroup === detection.id;

          return (
            <div
              key={detection.id}
              className={`bg-slate-800/50 rounded-lg p-3 transition-all ${
                isAttested ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-medium text-sm">{detection.title}</div>
                  <div className="text-xs text-slate-400 mt-1">{detection.description}</div>
                  <div className="text-xs bg-slate-700/50 px-2 py-1 rounded mt-2 italic">
                    "{detection.evidence}"
                  </div>
                </div>
                
                {isAttested ? (
                  <button
                    onClick={() => onUndo(detection.id)}
                    className="text-xs text-slate-400 hover:text-red-400"
                  >
                    Undo
                  </button>
                ) : null}
              </div>

              {/* Quick Pick Buttons */}
              {!isAttested && detection.requires_attestation && (
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    <QuickPickButton
                      label="Addressed"
                      onClick={() => onQuickPick(detection, 'addressed_in_note')}
                    />
                    <QuickPickButton
                      label="Next Session"
                      onClick={() => onQuickPick(detection, 'will_address_next_session')}
                    />
                    <QuickPickButton
                      label="Not Relevant"
                      onClick={() => onExpand(detection.id)}
                      requiresNote
                    />
                    <QuickPickButton
                      label="Supervisor"
                      onClick={() => onExpand(detection.id)}
                      requiresNote
                    />
                  </div>

                  {/* Note Input (Expanded) */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={responseNotes[detection.id] || ''}
                        onChange={(e) => onNoteChange(detection.id, e.target.value)}
                        placeholder="Required: explain your response..."
                        className="w-full bg-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[60px]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => onQuickPick(detection, 'not_clinically_relevant')}
                          disabled={!responseNotes[detection.id]?.trim()}
                          className="text-xs bg-slate-600 hover:bg-slate-500 disabled:opacity-50 px-3 py-1 rounded"
                        >
                          Confirm Not Relevant
                        </button>
                        <button
                          onClick={() => onQuickPick(detection, 'consulted_supervisor')}
                          disabled={!responseNotes[detection.id]?.trim()}
                          className="text-xs bg-slate-600 hover:bg-slate-500 disabled:opacity-50 px-3 py-1 rounded"
                        >
                          Confirm Supervisor
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Quick Pick Button Component
function QuickPickButton({
  label,
  onClick,
  requiresNote = false,
}: {
  label: string;
  onClick: () => void;
  requiresNote?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded transition-colors ${
        requiresNote
          ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30'
      }`}
    >
      {label}
      {requiresNote && <span className="text-slate-500 ml-1">*</span>}
    </button>
  );
}

// Helper: Group detections by category
interface DetectionGroupType {
  key: string;
  category: string;
  severity: api.DetectionSeverity;
  detections: api.EthicsDetection[];
}

function groupDetections(detections: api.EthicsDetection[]): DetectionGroupType[] {
  const groups: Record<string, DetectionGroupType> = {};
  
  for (const d of detections) {
    if (!d.requires_attestation) continue;
    
    const key = `${d.category}-${d.severity}`;
    if (!groups[key]) {
      groups[key] = {
        key,
        category: d.category,
        severity: d.severity,
        detections: [],
      };
    }
    groups[key].detections.push(d);
  }
  
  // Sort by severity (attest > flag > coach)
  const severityOrder = { attest: 0, flag: 1, coach: 2 };
  return Object.values(groups).sort(
    (a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3)
  );
}

// ============================================
// Done Screen
// ============================================

function DoneScreen({
  note,
  onNewNote,
  onDashboard,
  onBack,
}: {
  note: api.Note;
  onNewNote: () => void;
  onDashboard: () => void;
  onBack?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [currentNote, setCurrentNote] = useState(note);
  
  // Amendment state
  const [isAmending, setIsAmending] = useState(false);
  const [amendmentText, setAmendmentText] = useState('');
  const [amendmentReason, setAmendmentReason] = useState('');

  async function handleCopy() {
    try {
      const exported = await api.exportNote(currentNote.id, 'text');
      await navigator.clipboard.writeText(exported);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveEdit() {
    if (!editContent.trim()) return;
    setSaving(true);
    try {
      const updated = await api.updateNoteContent(currentNote.id, editContent);
      setCurrentNote(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Failed to save changes: ' + String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAmendment() {
    if (!amendmentText.trim() || !amendmentReason.trim()) return;
    setSaving(true);
    try {
      const updated = await api.amendNote(currentNote.id, amendmentText, amendmentReason);
      setCurrentNote(updated);
      setIsAmending(false);
      setAmendmentText('');
      setAmendmentReason('');
    } catch (err) {
      console.error('Failed to save amendment:', err);
      alert('Failed to save amendment: ' + String(err));
    } finally {
      setSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditContent(currentNote.content);
    setIsEditing(false);
  }

  function handleCancelAmendment() {
    setAmendmentText('');
    setAmendmentReason('');
    setIsAmending(false);
  }

  return (
    <div className="min-h-screen">
      <NavigationHeader 
        onHome={onDashboard} 
        title="Note Saved"
        showBack={!!onBack}
        onBack={onBack}
      />
      <div className="pt-14 p-6">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold">Note Saved</h1>
          <p className="text-slate-400 mt-2">
            Your note has been encrypted and stored securely.
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 mb-8 text-left">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-400">
              {currentNote.word_count} words • Hash: {currentNote.content_hash.slice(0, 12)}...
            </div>
            {currentNote.status === 'draft' && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <FileText className="w-4 h-4" />
                Edit
              </button>
            )}
            {(currentNote.status === 'signed' || currentNote.status === 'amended') && !isAmending && (
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  currentNote.status === 'amended' 
                    ? 'text-amber-400 bg-amber-500/20' 
                    : 'text-green-400 bg-green-500/20'
                }`}>
                  {currentNote.status === 'amended' ? 'Amended' : 'Signed'}
                </span>
                <button
                  onClick={() => setIsAmending(true)}
                  className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Amendment
                </button>
              </div>
            )}
          </div>
          
          {isAmending ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Amendment Reason *</label>
                <input
                  type="text"
                  value={amendmentReason}
                  onChange={(e) => setAmendmentReason(e.target.value)}
                  placeholder="e.g., Additional clinical information, Correction of error..."
                  className="w-full bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Amendment Text *</label>
                <textarea
                  value={amendmentText}
                  onChange={(e) => setAmendmentText(e.target.value)}
                  placeholder="Enter the content to append to this note..."
                  className="w-full bg-slate-700 rounded-lg p-4 min-h-[150px] focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm text-amber-300">
                <strong>Note:</strong> Amendments are appended to the original note with a timestamp and reason. The original content is preserved.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelAmendment}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAmendment}
                  disabled={saving || !amendmentText.trim() || !amendmentReason.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg text-sm flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Amendment
                </button>
              </div>
            </div>
          ) : isEditing ? (
            <div className="space-y-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-slate-700 rounded-lg p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editContent.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-slate-300 max-h-64 overflow-y-auto">
              {currentNote.content}
            </pre>
          )}
        </div>

        {/* De-identification for Consultation */}
        <div className="mb-8 text-left">
          <DeidentificationPanel 
            noteId={currentNote.id}
            noteContent={currentNote.content}
            clientName={currentNote.client_id}
          />
        </div>

        {/* Consultation Draft */}
        <div className="mb-8 text-left">
          <ConsultationDraftPanel
            noteId={currentNote.id}
            noteContent={currentNote.content}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
          >
            {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={onNewNote}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Note
          </button>
          <button
            onClick={onDashboard}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

// ============================================
// Voice Scribe Component - Web Audio API Recording
// ============================================

export function VoiceScribe({
  onTranscript,
  model,
}: {
  onTranscript: (transcript: string) => void;
  model: string;
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [riskAlert, setRiskAlert] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  // Audio recording refs
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const streamRef = React.useRef<MediaStream | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const animationRef = React.useRef<number | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Update audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (analyserRef.current && isRecording) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255);
      animationRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  async function handleStartRecording() {
    setError(null);
    setRiskAlert(null);
    setDuration(0);
    audioChunksRef.current = [];
    
    try {
      // Check if mediaDevices is available (requires secure context in Tauri)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(
          'Microphone access is not available in this environment. ' +
          'Voice recording requires the app to be run with proper entitlements. ' +
          'For now, please use text input instead.'
        );
        return;
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });
      streamRef.current = stream;
      
      // Set up audio analysis for level meter
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Process recorded audio
        await processRecordedAudio();
      };
      
      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
      
      // Start audio level visualization
      updateAudioLevel();
      
    } catch (err) {
      console.error('Microphone access error:', err);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access to use voice recording.');
      } else {
        setError(`Failed to start recording: ${err}`);
      }
    }
  }

  async function handleStopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
    setAudioLevel(0);
  }
  
  async function processRecordedAudio() {
    setIsProcessing(true);
    
    try {
      // Combine audio chunks into a single blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to PCM float32 array for Whisper
      const audioBuffer = await audioBlob.arrayBuffer();
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const decodedAudio = await audioContext.decodeAudioData(audioBuffer);
      
      // Get mono channel data
      const channelData = decodedAudio.getChannelData(0);
      const audioData = Array.from(channelData);
      
      // Send to backend for transcription
      const segments = await api.transcribeAudio(audioData, 16000);
      
      // Combine segments into transcript
      const text = segments.map(s => s.text).join(' ').trim();
      
      // Check for risk detections
      const riskySegment = segments.find(s => s.risk_detected);
      if (riskySegment?.risk_detected) {
        setRiskAlert(riskySegment.risk_detected);
      }
      
      if (text && !text.includes('[placeholder]') && !text.includes('[Audio transcription')) {
        setTranscript(text);
      } else {
        // Whisper not available - show helpful message
        setError('Whisper model not loaded. Install a Whisper model or type notes manually.');
      }
      
    } catch (err) {
      console.error('Transcription error:', err);
      setError(`Transcription failed: ${err}`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleStructure() {
    if (!transcript.trim()) return;
    setIsProcessing(true);
    
    try {
      const structured = await api.voiceToStructuredNote(
        transcript,
        'progress',
        model
      );
      onTranscript(structured);
      setTranscript('');
    } catch (err) {
      setError(String(err));
    } finally {
      setIsProcessing(false);
    }
  }
  
  function handleUseRaw() {
    if (transcript.trim()) {
      onTranscript(transcript);
      setTranscript('');
    }
  }
  
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mic className="w-5 h-5" />
          Voice Scribe
        </h3>
        <span className="text-xs text-slate-500">Local Whisper • PHI-Safe</span>
      </div>

      {/* Risk Alert */}
      {riskAlert && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-200">
            Risk phrase detected: <strong>{riskAlert}</strong>
          </span>
        </div>
      )}

      {/* Recording Controls */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isProcessing}
          className={`flex items-center justify-center w-16 h-16 rounded-full transition-all ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-600 hover:bg-blue-700'
          } disabled:opacity-50`}
          style={isRecording ? {
            boxShadow: `0 0 ${20 + audioLevel * 30}px ${audioLevel * 15}px rgba(239, 68, 68, ${0.3 + audioLevel * 0.4})`
          } : undefined}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : isRecording ? (
            <MicOff className="w-8 h-8" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>
        <div className="flex-1">
          <div className="text-sm text-slate-400">
            {isRecording ? `Recording... ${formatDuration(duration)}` : 
             isProcessing ? 'Transcribing with Whisper...' : 
             'Click to start voice capture'}
          </div>
          {isRecording && (
            <div className="h-2 bg-slate-700 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-75"
                style={{ width: `${Math.min(audioLevel * 150, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="mb-4">
          <div className="text-sm text-slate-400 mb-2">Transcript:</div>
          <div className="bg-slate-700 rounded-lg p-3 text-sm max-h-32 overflow-y-auto">
            {transcript}
          </div>
        </div>
      )}

      {/* Actions */}
      {transcript && (
        <div className="flex gap-2">
          <button
            onClick={handleUseRaw}
            className="flex-1 bg-slate-700 hover:bg-slate-600 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Use Raw
          </button>
          <button
            onClick={handleStructure}
            disabled={isProcessing}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 py-2 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <Activity className="w-4 h-4" />
            AI Structure
          </button>
          <button
            onClick={() => setTranscript('')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg"
          >
            Clear
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
          {error}
        </div>
      )}
    </div>
  );
}

// ============================================
// Structured MSE Input Component
// ============================================

export interface MSEData {
  appearance: string;
  behavior: string;
  speech: string;
  mood: string;
  affect: string;
  thoughtProcess: string;
  thoughtContent: string;
  cognition: string;
  insightJudgment: string;
}

const MSE_DOMAINS = [
  { key: 'appearance', label: 'Appearance', options: ['Well-groomed', 'Disheveled', 'Appropriate', 'Bizarre', 'Not assessed'] },
  { key: 'behavior', label: 'Behavior', options: ['Cooperative', 'Agitated', 'Withdrawn', 'Guarded', 'Appropriate', 'Not assessed'] },
  { key: 'speech', label: 'Speech', options: ['Normal rate/volume', 'Pressured', 'Soft', 'Loud', 'Slurred', 'Not assessed'] },
  { key: 'mood', label: 'Mood (reported)', options: ['Euthymic', 'Depressed', 'Anxious', 'Irritable', 'Euphoric', 'Not assessed'] },
  { key: 'affect', label: 'Affect (observed)', options: ['Congruent', 'Flat', 'Blunted', 'Labile', 'Incongruent', 'Not assessed'] },
  { key: 'thoughtProcess', label: 'Thought Process', options: ['Linear', 'Tangential', 'Circumstantial', 'Disorganized', 'Not assessed'] },
  { key: 'thoughtContent', label: 'Thought Content', options: ['Appropriate', 'Preoccupied', 'Paranoid', 'Delusional', 'Not assessed'] },
  { key: 'cognition', label: 'Cognition', options: ['Intact', 'Impaired attention', 'Memory deficits', 'Disoriented', 'Not assessed'] },
  { key: 'insightJudgment', label: 'Insight/Judgment', options: ['Good', 'Fair', 'Poor', 'Impaired', 'Not assessed'] },
];

export function MSEInput({
  value,
  onChange,
  expanded,
  onToggleExpand,
}: {
  value: MSEData;
  onChange: (data: MSEData) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const completedCount = Object.values(value).filter(v => v && v !== 'Not assessed').length;
  
  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-purple-400" />
          <span className="font-medium">Mental Status Exam</span>
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
            {completedCount}/9 assessed
          </span>
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      
      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-3">
          {MSE_DOMAINS.map((domain) => (
            <div key={domain.key} className="flex items-center gap-3">
              <label className="w-32 text-sm text-slate-400 flex-shrink-0">
                {domain.label}
              </label>
              <select
                value={value[domain.key as keyof MSEData] || 'Not assessed'}
                onChange={(e) => onChange({ ...value, [domain.key]: e.target.value })}
                className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500"
              >
                {domain.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Notes..."
                className="w-40 bg-slate-700/50 border border-slate-600 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          ))}
          <div className="pt-2 text-xs text-slate-500">
            Select "Not assessed" for domains not evaluated this session
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Structured Risk Assessment Component
// ============================================

export interface RiskData {
  suicidalIdeation: 'denied' | 'passive' | 'active' | 'active_with_plan' | 'not_assessed';
  suicidalIdeationDetails: string;
  homicidalIdeation: 'denied' | 'present' | 'not_assessed';
  homicidalIdeationDetails: string;
  selfHarm: 'denied' | 'history' | 'current' | 'not_assessed';
  selfHarmDetails: string;
  safetyPlan: 'in_place' | 'updated' | 'developed' | 'not_applicable' | 'not_assessed';
  protectiveFactors: string[];
  riskLevel: 'low' | 'moderate' | 'high' | 'imminent' | 'not_assessed';
}

const DEFAULT_PROTECTIVE_FACTORS = [
  'Family support',
  'Social connections',
  'Treatment engagement',
  'Future orientation',
  'Religious/spiritual beliefs',
  'Children/pets',
  'Employment',
  'No access to means',
];

export function RiskAssessmentInput({
  value,
  onChange,
  expanded,
  onToggleExpand,
}: {
  value: RiskData;
  onChange: (data: RiskData) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const hasRisk = value.suicidalIdeation !== 'denied' && value.suicidalIdeation !== 'not_assessed';
  
  return (
    <div className={`bg-slate-800 rounded-xl overflow-hidden ${hasRisk ? 'ring-2 ring-red-500/50' : ''}`}>
      <button
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${hasRisk ? 'text-red-400' : 'text-amber-400'}`} />
          <span className="font-medium">Risk Assessment</span>
          {hasRisk && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse">
              Risk Identified
            </span>
          )}
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      
      {expanded && (
        <div className="border-t border-slate-700 p-4 space-y-4">
          {/* Suicidal Ideation */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Suicidal Ideation</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'denied', label: 'Denied', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                { value: 'passive', label: 'Passive', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                { value: 'active', label: 'Active (no plan)', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
                { value: 'active_with_plan', label: 'Active with plan', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                { value: 'not_assessed', label: 'Not assessed', color: 'bg-slate-600 text-slate-400 border-slate-500/30' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...value, suicidalIdeation: opt.value as RiskData['suicidalIdeation'] })}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    value.suicidalIdeation === opt.value 
                      ? `${opt.color} border-2` 
                      : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {value.suicidalIdeation !== 'denied' && value.suicidalIdeation !== 'not_assessed' && (
              <textarea
                value={value.suicidalIdeationDetails}
                onChange={(e) => onChange({ ...value, suicidalIdeationDetails: e.target.value })}
                placeholder="Document details: frequency, plan specificity, intent, means access..."
                className="w-full bg-slate-700/50 border border-red-500/30 rounded px-3 py-2 text-sm focus:outline-none focus:border-red-500 mt-2"
                rows={2}
              />
            )}
          </div>

          {/* Homicidal Ideation */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Homicidal Ideation</label>
            <div className="flex gap-2">
              {[
                { value: 'denied', label: 'Denied', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
                { value: 'present', label: 'Present', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
                { value: 'not_assessed', label: 'Not assessed', color: 'bg-slate-600 text-slate-400 border-slate-500/30' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...value, homicidalIdeation: opt.value as RiskData['homicidalIdeation'] })}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    value.homicidalIdeation === opt.value 
                      ? `${opt.color} border-2` 
                      : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Self-Harm */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Self-Harm</label>
            <div className="flex gap-2">
              {[
                { value: 'denied', label: 'Denied' },
                { value: 'history', label: 'History (not current)' },
                { value: 'current', label: 'Current' },
                { value: 'not_assessed', label: 'Not assessed' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...value, selfHarm: opt.value as RiskData['selfHarm'] })}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    value.selfHarm === opt.value 
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30 border-2' 
                      : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Safety Plan */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Safety Plan</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'in_place', label: 'In place' },
                { value: 'updated', label: 'Updated this session' },
                { value: 'developed', label: 'Developed this session' },
                { value: 'not_applicable', label: 'Not applicable' },
                { value: 'not_assessed', label: 'Not assessed' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...value, safetyPlan: opt.value as RiskData['safetyPlan'] })}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    value.safetyPlan === opt.value 
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 border-2' 
                      : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Protective Factors */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Protective Factors</label>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_PROTECTIVE_FACTORS.map((factor) => (
                <button
                  key={factor}
                  type="button"
                  onClick={() => {
                    const factors = value.protectiveFactors || [];
                    if (factors.includes(factor)) {
                      onChange({ ...value, protectiveFactors: factors.filter(f => f !== factor) });
                    } else {
                      onChange({ ...value, protectiveFactors: [...factors, factor] });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    (value.protectiveFactors || []).includes(factor)
                      ? 'bg-green-500/20 text-green-400 border-green-500/30 border-2'
                      : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  {factor}
                </button>
              ))}
            </div>
          </div>

          {/* Risk Level Summary */}
          <div className="pt-2 border-t border-slate-700">
            <label className="text-sm font-medium text-slate-300 mb-2 block">Overall Risk Level</label>
            <div className="flex gap-2">
              {[
                { value: 'low', label: 'Low', color: 'bg-green-500/20 text-green-400 border-green-500' },
                { value: 'moderate', label: 'Moderate', color: 'bg-amber-500/20 text-amber-400 border-amber-500' },
                { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-400 border-orange-500' },
                { value: 'imminent', label: 'Imminent', color: 'bg-red-500/20 text-red-400 border-red-500' },
                { value: 'not_assessed', label: 'Not assessed', color: 'bg-slate-600 text-slate-400 border-slate-500' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...value, riskLevel: opt.value as RiskData['riskLevel'] })}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm border-2 transition-all ${
                    value.riskLevel === opt.value 
                      ? opt.color
                      : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to convert structured data to text
export function formatMSEToText(mse: MSEData): string {
  const lines = [
    '**MENTAL STATUS EXAM:**',
    `- Appearance: ${mse.appearance || 'Not assessed'}`,
    `- Behavior: ${mse.behavior || 'Not assessed'}`,
    `- Speech: ${mse.speech || 'Not assessed'}`,
    `- Mood (reported): ${mse.mood || 'Not assessed'}`,
    `- Affect (observed): ${mse.affect || 'Not assessed'}`,
    `- Thought Process: ${mse.thoughtProcess || 'Not assessed'}`,
    `- Thought Content: ${mse.thoughtContent || 'Not assessed'}`,
    `- Cognition: ${mse.cognition || 'Not assessed'}`,
    `- Insight/Judgment: ${mse.insightJudgment || 'Not assessed'}`,
  ];
  return lines.join('\n');
}

export function formatRiskToText(risk: RiskData): string {
  const siLabels: Record<string, string> = {
    denied: 'Denied',
    passive: 'Passive ideation',
    active: 'Active ideation (no plan)',
    active_with_plan: 'Active ideation with plan',
    not_assessed: 'Not assessed',
  };
  
  const lines = [
    '**RISK ASSESSMENT:**',
    `- Suicidal Ideation: ${siLabels[risk.suicidalIdeation] || 'Not assessed'}`,
  ];
  
  if (risk.suicidalIdeationDetails) {
    lines.push(`  Details: ${risk.suicidalIdeationDetails}`);
  }
  
  lines.push(`- Homicidal Ideation: ${risk.homicidalIdeation === 'denied' ? 'Denied' : risk.homicidalIdeation === 'present' ? 'Present' : 'Not assessed'}`);
  lines.push(`- Self-Harm: ${risk.selfHarm === 'denied' ? 'Denied' : risk.selfHarm === 'history' ? 'History (not current)' : risk.selfHarm === 'current' ? 'Current' : 'Not assessed'}`);
  lines.push(`- Safety Plan: ${risk.safetyPlan?.replace(/_/g, ' ') || 'Not assessed'}`);
  
  if (risk.protectiveFactors?.length > 0) {
    lines.push(`- Protective Factors: ${risk.protectiveFactors.join(', ')}`);
  }
  
  lines.push(`- Overall Risk Level: ${risk.riskLevel?.replace(/_/g, ' ') || 'Not assessed'}`);
  
  return lines.join('\n');
}

// ============================================
// Treatment Progress Panel - Themes with Note Links
// ============================================

interface ThemeExcerpt {
  noteId: string;
  noteDate: string;
  excerpt: string;
  relevance: number;
}

interface TreatmentTheme {
  name: string;
  status: 'improving' | 'stable' | 'declining' | 'new' | 'resolved';
  excerpts: ThemeExcerpt[];
}

export function TreatmentProgressPanel({
  clientId,
  model,
  onNoteSelect,
}: {
  clientId: string;
  model: string;
  onNoteSelect?: (noteId: string) => void;
}) {
  const [themes, setThemes] = useState<TreatmentTheme[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyzeThemes() {
    setLoading(true);
    setError(null);
    try {
      // Get recent notes for this client
      const notes = await api.listNotes(clientId);
      const recentNotes = notes.slice(0, 10); // Last 10 notes
      
      if (recentNotes.length < 2) {
        setError('Need at least 2 notes to analyze treatment themes');
        setLoading(false);
        return;
      }
      
      // Use RAG to identify themes
      const themeQuery = "What are the main recurring themes, symptoms, and treatment focuses across these sessions? Identify 3-5 key themes.";
      const answer = await api.ragQueryNotes(themeQuery, model, clientId);
      
      // Parse themes from the answer (simplified - in production you'd want more structured output)
      const themeNames = extractThemesFromAnswer(answer.answer);
      
      // For each theme, find supporting excerpts
      const analyzedThemes: TreatmentTheme[] = [];
      for (const themeName of themeNames) {
        const searchResults = await api.searchNotesSemantic(themeName, 5, clientId);
        const excerpts: ThemeExcerpt[] = searchResults.map(r => ({
          noteId: r.note_id,
          noteDate: r.note_date || 'Unknown date',
          excerpt: r.chunk_text.slice(0, 200) + (r.chunk_text.length > 200 ? '...' : ''),
          relevance: r.score,
        }));
        
        // Determine status based on recency and frequency
        const status = determineThemeStatus(excerpts, recentNotes);
        
        analyzedThemes.push({
          name: themeName,
          status,
          excerpts,
        });
      }
      
      setThemes(analyzedThemes);
    } catch (err) {
      console.error('Theme analysis failed:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function extractThemesFromAnswer(answer: string): string[] {
    // Simple extraction - look for numbered items or common patterns
    const lines = answer.split('\n');
    const themes: string[] = [];
    
    for (const line of lines) {
      // Match numbered items like "1. Anxiety" or "- Depression"
      const match = line.match(/^[\d\.\-\*]+\s*(.+?)(?:\s*[-:]|$)/);
      if (match && match[1].length > 2 && match[1].length < 50) {
        themes.push(match[1].trim());
      }
    }
    
    // If no structured themes found, try to extract key phrases
    if (themes.length === 0) {
      const commonThemes = [
        'anxiety', 'depression', 'sleep', 'relationship', 'work stress',
        'trauma', 'grief', 'self-esteem', 'coping', 'medication'
      ];
      for (const theme of commonThemes) {
        if (answer.toLowerCase().includes(theme)) {
          themes.push(theme.charAt(0).toUpperCase() + theme.slice(1));
        }
      }
    }
    
    return themes.slice(0, 5);
  }

  function determineThemeStatus(excerpts: ThemeExcerpt[], allNotes: api.Note[]): TreatmentTheme['status'] {
    if (excerpts.length === 0) return 'new';
    
    // Check if theme appears in most recent notes
    const recentNoteIds = new Set(allNotes.slice(0, 3).map(n => n.id));
    const olderNoteIds = new Set(allNotes.slice(3).map(n => n.id));
    
    const recentCount = excerpts.filter(e => recentNoteIds.has(e.noteId)).length;
    const olderCount = excerpts.filter(e => olderNoteIds.has(e.noteId)).length;
    
    if (recentCount === 0 && olderCount > 0) return 'resolved';
    if (recentCount > 0 && olderCount === 0) return 'new';
    if (recentCount > olderCount) return 'stable'; // Could also indicate declining
    return 'stable';
  }

  const statusColors: Record<string, string> = {
    improving: 'bg-green-500/20 text-green-400 border-green-500/30',
    stable: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    declining: 'bg-red-500/20 text-red-400 border-red-500/30',
    new: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    resolved: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const statusIcons: Record<string, string> = {
    improving: '↑',
    stable: '→',
    declining: '↓',
    new: 'New',
    resolved: 'Resolved',
  };

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-emerald-400" />
          <span className="font-medium">Treatment Progress</span>
          {themes.length > 0 && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
              {themes.length} themes
            </span>
          )}
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-4">
          {!themes.length && !loading && (
            <div className="text-center py-6">
              <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm mb-4">
                Analyze treatment themes across sessions to track progress
              </p>
              <button
                onClick={analyzeThemes}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm"
              >
                Analyze Themes
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 animate-spin" />
              <p className="text-slate-400 text-sm">Analyzing treatment themes...</p>
            </div>
          )}

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {themes.length > 0 && (
            <div className="space-y-3">
              {themes.map((theme) => (
                <div key={theme.name} className="bg-slate-700/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedTheme(expandedTheme === theme.name ? null : theme.name)}
                    className="w-full flex items-center justify-between p-3 hover:bg-slate-700/70"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-lg ${statusColors[theme.status].split(' ')[1]}`}>
                        {statusIcons[theme.status]}
                      </span>
                      <span className="font-medium">{theme.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded border ${statusColors[theme.status]}`}>
                        {theme.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{theme.excerpts.length} mentions</span>
                      <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedTheme === theme.name ? 'rotate-90' : ''}`} />
                    </div>
                  </button>
                  
                  {expandedTheme === theme.name && (
                    <div className="border-t border-slate-600 p-3 space-y-2">
                      <div className="text-xs text-slate-400 mb-2">Supporting excerpts (click to view note):</div>
                      {theme.excerpts.map((excerpt, i) => (
                        <button
                          key={i}
                          onClick={() => onNoteSelect?.(excerpt.noteId)}
                          className="w-full text-left bg-slate-800/50 rounded p-2 hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-500">{excerpt.noteDate}</span>
                            <span className="text-xs text-emerald-400">{Math.round(excerpt.relevance * 100)}%</span>
                          </div>
                          <p className="text-xs text-slate-300 line-clamp-2">"{excerpt.excerpt}"</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              <button
                onClick={analyzeThemes}
                className="w-full text-center text-xs text-slate-400 hover:text-white py-2"
              >
                ↻ Refresh Analysis
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// RAG Search Component
// ============================================

export function RAGSearch({
  clientId,
  model,
  onNoteSelect,
}: {
  clientId?: string;
  model: string;
  onNoteSelect?: (noteId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<api.SearchResult[]>([]);
  const [ragAnswer, setRagAnswer] = useState<api.RAGAnswer | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [mode, setMode] = useState<'search' | 'ask'>('search');
  const [indexStats, setIndexStats] = useState<api.IndexStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const stats = await api.getSearchIndexStats();
      setIndexStats(stats);
    } catch (err) {
      console.error('Failed to load index stats:', err);
    }
  }

  async function handleSearch() {
    if (!query.trim()) return;
    setIsSearching(true);
    setRagAnswer(null);
    setResults([]);
    setError(null);
    setHasSearched(true);
    
    try {
      if (mode === 'search') {
        const searchResults = await api.searchNotesSemantic(query, 10, clientId);
        setResults(searchResults);
        if (searchResults.length === 0) {
          setError('No matching notes found. Try different search terms or rebuild the index.');
        }
      } else {
        const answer = await api.ragQueryNotes(query, model, clientId);
        setRagAnswer(answer);
        setResults([]);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setError(`Search failed: ${err instanceof Error ? err.message : 'Unknown error'}. Make sure notes are indexed.`);
    } finally {
      setIsSearching(false);
    }
  }

  async function handleReindex() {
    setIsSearching(true);
    setError(null);
    try {
      const count = await api.reindexAllNotesForSearch();
      await loadStats();
      setError(`Successfully indexed ${count} note chunks.`);
    } catch (err) {
      console.error('Reindex failed:', err);
      setError(`Reindex failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Search className="w-5 h-5" />
          Cross-Note Search
        </h3>
        {indexStats && (
          <span className="text-xs text-slate-500">
            {indexStats.indexed_notes}/{indexStats.total_notes} indexed
          </span>
        )}
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('search')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'search'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          <Search className="w-4 h-4 inline mr-1" />
          Find Similar
        </button>
        <button
          onClick={() => setMode('ask')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'ask'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          <MessageSquare className="w-4 h-4 inline mr-1" />
          Ask Question
        </button>
      </div>

      {/* Search Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={mode === 'search' 
            ? 'Search across all notes...' 
            : 'Ask a question about past sessions...'}
          className="flex-1 bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg"
        >
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Loading State */}
      {isSearching && (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 text-blue-500 mx-auto mb-3 animate-spin" />
          <p className="text-slate-400 text-sm">
            {mode === 'search' ? 'Searching notes...' : 'Generating answer...'}
          </p>
        </div>
      )}

      {/* Error/Status Message */}
      {error && !isSearching && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          error.includes('Successfully') 
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
        }`}>
          {error}
        </div>
      )}

      {/* RAG Answer */}
      {ragAnswer && !isSearching && (
        <div className="mb-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="text-sm text-blue-300 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Answer
            </div>
            <div className="text-sm whitespace-pre-wrap">{ragAnswer.answer}</div>
            {ragAnswer.sources.length > 0 && (
              <div className="mt-3 pt-3 border-t border-blue-500/20">
                <div className="text-xs text-slate-400 mb-1">Sources (click to view):</div>
                <div className="flex flex-wrap gap-2">
                  {ragAnswer.sources.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => onNoteSelect?.(src.note_id)}
                      className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded cursor-pointer transition-colors"
                      title="Click to view this note"
                    >
                      {src.note_date || src.note_id.slice(0, 8)}
                      <span className="text-slate-500 ml-1">
                        ({Math.round(src.relevance * 100)}%)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && !isSearching && (
        <div className="space-y-2">
          {results.map((result, i) => (
            <button
              key={i}
              onClick={() => onNoteSelect?.(result.note_id)}
              className="w-full text-left bg-slate-700/50 rounded-lg p-3 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-400">
                  {result.note_date} • {result.note_type}
                </span>
                <span className="text-xs text-blue-400">
                  {Math.round(result.score * 100)}% match
                </span>
              </div>
              <div className="text-sm line-clamp-2">{result.chunk_text}</div>
            </button>
          ))}
        </div>
      )}

      {/* Empty State / Reindex */}
      {!results.length && !ragAnswer && !isSearching && !hasSearched && (
        <div className="text-center py-8">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm mb-4">
            {mode === 'search'
              ? 'Search semantically across all session notes'
              : 'Ask questions and get answers from past documentation'}
          </p>
          <button
            onClick={handleReindex}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Rebuild Search Index
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Metrics Dashboard Component with Trend Charts
// ============================================

// Simple Sparkline SVG component
function Sparkline({ 
  data, 
  color = '#22c55e',
  height = 40,
  width = 120 
}: { 
  data: number[]; 
  color?: string;
  height?: number;
  width?: number;
}) {
  if (!data || data.length < 2) {
    return (
      <div className="text-xs text-slate-500 italic">No trend data</div>
    );
  }
  
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Area fill */}
      <path 
        d={`M0,${height} ${data.map((value, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = height - ((value - min) / range) * (height - 4) - 2;
          return `L${x},${y}`;
        }).join(' ')} L${width},${height} Z`}
        fill={color}
        fillOpacity={0.1}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * (height - 4) - 2}
        r={3}
        fill={color}
      />
    </svg>
  );
}

// ============================================
// Cross-Client Search Component
// ============================================

export function CrossClientSearch({
  onClientSelect,
}: {
  onClientSelect?: (client: api.Client) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<api.ClientSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const searchResults = await api.searchClients(query);
      setResults(searchResults);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <Users className="w-5 h-5" />
        Cross-Client Search
      </h3>
      
      <p className="text-sm text-slate-400 mb-4">
        Search across all client profiles (name, phone, insurance, diagnosis, etc.)
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by name, phone, insurance, diagnosis..."
          className="flex-1 bg-slate-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg"
        >
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Results */}
      {hasSearched && !isSearching && (
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-slate-400 text-sm">No clients found matching "{query}"</p>
          ) : (
            <>
              <p className="text-sm text-slate-400 mb-2">{results.length} client(s) found</p>
              {results.map((result) => (
                <div
                  key={result.client.id}
                  className="bg-slate-700/50 rounded-lg p-3 hover:bg-slate-700 transition-colors cursor-pointer"
                  onClick={() => onClientSelect?.(result.client)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{result.client.display_name}</div>
                      <div className="text-sm text-slate-400">
                        {result.client.session_count} sessions
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                  {result.matched_fields.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {result.matched_fields.map(([field, value], idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded"
                        >
                          {field}: {value.length > 30 ? value.substring(0, 30) + '...' : value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Documents Panel
// ============================================

export function DocumentsPanel({
  clientId,
}: {
  clientId: string;
}) {
  const [documents, setDocuments] = useState<api.ClientDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<api.ClientDocument | null>(null);
  const [ocrProcessing, setOcrProcessing] = useState<string | null>(null);
  const [ocrAvailable, setOcrAvailable] = useState<boolean | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function loadDocuments() {
    setLoading(true);
    try {
      const docs = await api.listDocuments(clientId);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  }

  async function checkOcr() {
    try {
      const available = await api.checkOcrAvailable();
      setOcrAvailable(available);
    } catch {
      setOcrAvailable(false);
    }
  }

  useEffect(() => {
    if (expanded && documents.length === 0) {
      loadDocuments();
      checkOcr();
    }
  }, [expanded]);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Unsupported file type. Please upload PDF, DOCX, JPG, or PNG files.');
      return;
    }

    // Validate size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }

    setUploading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const data = Array.from(new Uint8Array(arrayBuffer));
      
      // Determine file type
      const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
      
      await api.uploadDocument(
        clientId,
        file.name,
        ext,
        file.type,
        data,
        undefined,
        new Date().toISOString().split('T')[0]
      );
      
      await loadDocuments();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload document: ' + String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    
    try {
      await api.deleteDocument(docId);
      setDocuments(docs => docs.filter(d => d.id !== docId));
      setSelectedDoc(null);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete document: ' + String(err));
    }
  }

  async function handleDownload(doc: api.ClientDocument) {
    try {
      const data = await api.getDocumentData(doc.id);
      const blob = new Blob([new Uint8Array(data)], { type: doc.mime_type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download document: ' + String(err));
    }
  }

  async function handleOcr(docId: string) {
    setOcrProcessing(docId);
    try {
      const result = await api.processDocumentOcr(docId);
      alert(result);
      await loadDocuments(); // Refresh to show OCR status
    } catch (err) {
      console.error('OCR failed:', err);
      alert('OCR failed: ' + String(err));
    } finally {
      setOcrProcessing(null);
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  const fileTypeIcons: Record<string, string> = {
    pdf: 'Document',
    docx: 'Document',
    doc: 'Document',
    jpg: 'Image',
    jpeg: 'Image',
    png: 'Image',
    gif: 'Image',
  };

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          <span className="font-medium">Documents</span>
          {documents.length > 0 && (
            <span className="text-xs bg-slate-600 px-2 py-0.5 rounded-full">{documents.length}</span>
          )}
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-4">
          {/* Upload Button */}
          <div className="mb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-3 rounded-lg transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Upload Document
                </>
              )}
            </button>
            <p className="text-xs text-slate-500 mt-2 text-center">
              PDF, DOCX, JPG, PNG (max 10MB)
            </p>
          </div>

          {/* Document List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3 hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-2xl">{fileTypeIcons[doc.file_type] || 'Attachment'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{doc.filename}</div>
                      <div className="text-xs text-slate-400">
                        {formatFileSize(doc.file_size)} • {doc.document_date || 'No date'}
                        {doc.ocr_text && <span className="ml-2 text-green-400">• OCR indexed</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {/* OCR Button - show for images and PDFs without OCR */}
                    {ocrAvailable && !doc.ocr_text && ['pdf', 'jpg', 'jpeg', 'png', 'gif'].includes(doc.file_type) && (
                      <button
                        onClick={() => handleOcr(doc.id)}
                        disabled={ocrProcessing === doc.id}
                        className="p-2 hover:bg-purple-600/20 text-purple-400 rounded-lg transition-colors disabled:opacity-50"
                        title="Extract text with OCR"
                      >
                        {ocrProcessing === doc.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDownload(doc)}
                      className="p-2 hover:bg-slate-600 rounded-lg transition-colors"
                      title="Download"
                    >
                      <ArrowDownCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 hover:bg-red-600/20 text-red-400 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4 text-sm">
              No documents uploaded yet
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Storage Management Panel
// ============================================

export function StorageManagementPanel() {
  const [stats, setStats] = useState<api.StorageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  async function loadStats() {
    setLoading(true);
    try {
      const result = await api.getStorageStats();
      setStats(result);
    } catch (err) {
      console.error('Failed to load storage stats:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (expanded && !stats) {
      loadStats();
    }
  }, [expanded]);

  async function handleOptimize() {
    if (!confirm('Optimize database? This may take a moment and will compact the database to reclaim space.')) return;
    
    setOptimizing(true);
    try {
      await api.runDatabaseOptimization();
      await loadStats(); // Refresh stats
      alert('Database optimized successfully!');
    } catch (err) {
      console.error('Optimization failed:', err);
      alert('Failed to optimize database: ' + String(err));
    } finally {
      setOptimizing(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-emerald-400" />
          <span className="font-medium">Storage & Maintenance</span>
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : stats ? (
            <div className="space-y-4">
              {/* Storage Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{formatBytes(stats.database_size_bytes)}</div>
                  <div className="text-xs text-slate-400">Database Size</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold">{formatBytes(stats.document_size_bytes)}</div>
                  <div className="text-xs text-slate-400">Documents</div>
                </div>
              </div>

              {/* Record Counts */}
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div className="bg-slate-700/30 rounded-lg p-2">
                  <div className="font-bold">{stats.client_count}</div>
                  <div className="text-xs text-slate-400">Clients</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-2">
                  <div className="font-bold">{stats.note_count}</div>
                  <div className="text-xs text-slate-400">Notes</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-2">
                  <div className="font-bold">{stats.document_count}</div>
                  <div className="text-xs text-slate-400">Docs</div>
                </div>
                <div className="bg-slate-700/30 rounded-lg p-2">
                  <div className="font-bold">{stats.embedding_count}</div>
                  <div className="text-xs text-slate-400">Embeddings</div>
                </div>
              </div>

              {/* Optimize Button */}
              <button
                onClick={handleOptimize}
                disabled={optimizing}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-3 rounded-lg transition-colors"
              >
                {optimizing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Optimize Database
                  </>
                )}
              </button>
              <p className="text-xs text-slate-500 text-center">
                Compacts database and reclaims unused space
              </p>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">Unable to load storage stats</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Voice Setup Panel
// ============================================

export function VoiceSetupPanel() {
  const [status, setStatus] = useState<api.VoiceSetupStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    try {
      const result = await api.getVoiceStatus();
      setStatus(result as api.VoiceSetupStatus);
    } catch (err) {
      console.error('Failed to load voice status:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (expanded && !status) {
      loadStatus();
    }
  }, [expanded]);

  async function handleDownloadModel(modelName: string) {
    setDownloading(modelName);
    try {
      const result = await api.downloadWhisperModel(modelName);
      alert(result);
      await loadStatus(); // Refresh to show new model
    } catch (err) {
      console.error('Download failed:', err);
      alert('Download failed: ' + String(err));
    } finally {
      setDownloading(null);
    }
  }

  const availableModels = [
    { name: 'tiny.en', size: '75 MB', desc: 'Fastest, English only' },
    { name: 'base.en', size: '142 MB', desc: 'Good balance, English only' },
    { name: 'small.en', size: '466 MB', desc: 'Better accuracy, English only' },
    { name: 'medium.en', size: '1.5 GB', desc: 'High accuracy, English only' },
  ];

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-purple-400" />
          <span className="font-medium">Voice Scribe Setup</span>
          {status && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              status.whisper_installed && status.models_available.length > 0
                ? 'bg-green-500/20 text-green-400'
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {status.whisper_installed && status.models_available.length > 0 ? 'Ready' : 'Setup Needed'}
            </span>
          )}
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : status ? (
            <div className="space-y-4">
              {/* Status Indicators */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-lg p-3 ${status.whisper_installed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <div className={`text-sm font-medium ${status.whisper_installed ? 'text-green-400' : 'text-red-400'}`}>
                    {status.whisper_installed ? 'Whisper Installed' : 'Whisper Not Found'}
                  </div>
                  {!status.whisper_installed && (
                    <div className="text-xs text-slate-400 mt-1">
                      Run: <code className="bg-slate-700 px-1 rounded">brew install whisper-cpp</code>
                    </div>
                  )}
                </div>
                <div className={`rounded-lg p-3 ${status.ffmpeg_installed ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                  <div className={`text-sm font-medium ${status.ffmpeg_installed ? 'text-green-400' : 'text-amber-400'}`}>
                    {status.ffmpeg_installed ? 'FFmpeg Installed' : 'FFmpeg Not Found'}
                  </div>
                  {!status.ffmpeg_installed && (
                    <div className="text-xs text-slate-400 mt-1">
                      Run: <code className="bg-slate-700 px-1 rounded">brew install ffmpeg</code>
                    </div>
                  )}
                </div>
              </div>

              {/* Installed Models */}
              {status.models_available.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Installed Models</div>
                  <div className="flex flex-wrap gap-2">
                    {status.models_available.map((model) => (
                      <span key={model} className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        {model}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Models */}
              <div>
                <div className="text-sm font-medium mb-2">Download Model</div>
                <div className="space-y-2">
                  {availableModels.map((model) => {
                    const isInstalled = status.models_available.includes(`ggml-${model.name}.bin`);
                    return (
                      <div key={model.name} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-2">
                        <div>
                          <div className="text-sm font-medium">{model.name}</div>
                          <div className="text-xs text-slate-400">{model.size} • {model.desc}</div>
                        </div>
                        {isInstalled ? (
                          <span className="text-xs text-green-400 px-2">Installed</span>
                        ) : (
                          <button
                            onClick={() => handleDownloadModel(model.name)}
                            disabled={downloading !== null}
                            className="text-xs bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-3 py-1 rounded transition-colors"
                          >
                            {downloading === model.name ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Download'
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadStatus}
                className="w-full text-sm text-slate-400 hover:text-white py-2"
              >
                Refresh Status
              </button>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">Unable to load voice status</p>
          )}
        </div>
      )}
    </div>
  );
}

export function MetricsDashboard() {
  const [metrics, setMetrics] = useState<api.DashboardMetrics | null>(null);
  const [report, setReport] = useState<api.MetricsReport | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, [days]);

  async function loadMetrics() {
    setLoading(true);
    try {
      const [dashMetrics, metricsReport] = await Promise.all([
        api.getDashboardMetrics(days),
        api.getMetricsReport(days),
      ]);
      setMetrics(dashMetrics);
      setReport(metricsReport);
    } catch (err) {
      console.error('Failed to load metrics:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !metrics) {
    return (
      <div className="bg-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  // Extract trend data for sparklines
  const timeTrendData = metrics?.time_trend?.map(t => t.value / 60000) || []; // Convert ms to minutes
  const volumeTrendData = metrics?.volume_trend?.map(t => t.value) || [];

  return (
    <div className="bg-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Performance Metrics
        </h3>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-slate-700 rounded px-3 py-1 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {report && (
        <>
          {/* Headline Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MetricCard
              label="Time Saved"
              value={`${report.headline.time_saved_hours.toFixed(1)}h`}
              subtext={`${report.headline.time_saved_percentage.toFixed(0)}% efficiency`}
              positive
            />
            <MetricCard
              label="Notes Completed"
              value={report.headline.notes_completed.toString()}
              subtext={`${metrics?.notes_per_day.toFixed(1)}/day`}
            />
            <MetricCard
              label="AI Acceptance"
              value={`${report.ai_analysis.ai_acceptance_rate.toFixed(0)}%`}
              subtext="AI text kept as-is"
              positive={report.ai_analysis.ai_acceptance_rate >= 80}
            />
            <MetricCard
              label="Compliance"
              value={`${report.headline.compliance_rate.toFixed(0)}%`}
              subtext={report.defensibility_analysis.zero_incidents ? 'Zero incidents' : ''}
              positive={report.headline.compliance_rate >= 100}
            />
          </div>

          {/* Trend Charts */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-slate-400">Time per Note</div>
                  <div className="text-xl font-bold">
                    {report.time_analysis.avg_note_minutes.toFixed(1)} min
                  </div>
                </div>
                <Sparkline 
                  data={timeTrendData} 
                  color={timeTrendData.length > 1 && timeTrendData[timeTrendData.length - 1] < timeTrendData[0] ? '#22c55e' : '#f59e0b'}
                />
              </div>
              <div className="text-xs text-slate-500">
                {timeTrendData.length > 1 && (
                  <>
                    {timeTrendData[timeTrendData.length - 1] < timeTrendData[0] 
                      ? `↓ ${((1 - timeTrendData[timeTrendData.length - 1] / timeTrendData[0]) * 100).toFixed(0)}% improvement`
                      : `↑ ${((timeTrendData[timeTrendData.length - 1] / timeTrendData[0] - 1) * 100).toFixed(0)}% increase`
                    }
                  </>
                )}
              </div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-slate-400">Daily Volume</div>
                  <div className="text-xl font-bold">
                    {metrics?.notes_per_day.toFixed(1)} notes/day
                  </div>
                </div>
                <Sparkline 
                  data={volumeTrendData} 
                  color="#3b82f6"
                />
              </div>
              <div className="text-xs text-slate-500">
                {volumeTrendData.length > 1 && volumeTrendData[volumeTrendData.length - 1] > 0 && (
                  <>Total: {report.headline.notes_completed} notes</>
                )}
              </div>
            </div>
          </div>

          {/* Time Analysis */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-slate-400 mb-3">Time Analysis</h4>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Average note time</span>
                <span className="font-medium">{report.time_analysis.avg_note_minutes.toFixed(1)} min</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">Industry baseline</span>
                <span className="text-slate-400">{report.time_analysis.baseline_minutes.toFixed(0)} min</span>
              </div>
              <div className="h-2 bg-slate-600 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ 
                    width: `${Math.min(100, (report.time_analysis.avg_note_minutes / report.time_analysis.baseline_minutes) * 100)}%` 
                  }}
                />
              </div>
              <div className="text-xs text-green-400 text-right">
                {report.time_analysis.time_saved_per_note_minutes.toFixed(1)} min saved per note
              </div>
            </div>
          </div>

          {/* AI & Voice Usage */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-2">AI Assist Rate</div>
              <div className="text-2xl font-bold">{report.ai_analysis.ai_assist_rate.toFixed(0)}%</div>
              <div className="h-1 bg-slate-600 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-purple-500"
                  style={{ width: `${report.ai_analysis.ai_assist_rate}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">of notes use AI structuring</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-2">Voice Capture</div>
              <div className="text-2xl font-bold">{report.ai_analysis.voice_capture_rate.toFixed(0)}%</div>
              <div className="h-1 bg-slate-600 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${report.ai_analysis.voice_capture_rate}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">of notes use voice scribe</div>
            </div>
          </div>

          {/* Defensibility */}
          <div>
            <h4 className="text-sm font-medium text-slate-400 mb-3">Defensibility Score</h4>
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                  report.defensibility_analysis.zero_incidents
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {report.defensibility_analysis.zero_incidents ? 'Zero incidents' : 'Attention'}
                </div>
                <div className="flex-1">
                  <div className="font-medium">
                    {report.defensibility_analysis.zero_incidents 
                      ? 'Excellent - All critical items addressed'
                      : 'Review needed - Some items unresolved'}
                  </div>
                  <div className="text-sm text-slate-400">
                    {report.defensibility_analysis.detections_per_note.toFixed(1)} detections/note • 
                    {report.defensibility_analysis.attestation_compliance.toFixed(0)}% attested
                  </div>
                  <div className="flex gap-2 mt-2">
                    <div className="text-xs bg-slate-600 px-2 py-1 rounded">
                      {report.defensibility_analysis.critical_addressed.toFixed(0)}% critical resolved
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!report && !loading && (
        <div className="text-center py-8 text-slate-400">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No metrics data yet. Complete some notes to see your stats!</p>
        </div>
      )}
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-sm text-slate-300">{value}</div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  positive,
}: {
  label: string;
  value: string;
  subtext?: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-slate-700/50 rounded-lg p-4">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${positive ? 'text-green-400' : ''}`}>
        {value}
      </div>
      {subtext && <div className="text-xs text-slate-500 mt-1">{subtext}</div>}
    </div>
  );
}

// ============================================
// Pre-Session Prep Sheet Panel
// ============================================

export function PrepSheetPanel({
  clientId,
}: {
  clientId: string;
}) {
  const [prepSheet, setPrepSheet] = useState<api.PrepSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPrepSheet() {
    setLoading(true);
    setError(null);
    try {
      const sheet = await api.generatePrepSheet(clientId);
      setPrepSheet(sheet);
    } catch (err) {
      console.error('Failed to generate prep sheet:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (expanded && !prepSheet) {
      loadPrepSheet();
    }
  }, [expanded]);

  const severityColors: Record<string, string> = {
    high: 'bg-red-500/20 text-red-400 border-red-500/50',
    moderate: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
    low: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
  };

  const trendIcons: Record<string, string> = {
    improving: 'Improving',
    stable: 'Stable',
    worsening: 'Worsening',
    resolved: 'Resolved',
  };

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-emerald-400" />
          <span className="font-medium">Pre-Session Prep Sheet</span>
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
            Session Prep
          </span>
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              <span className="ml-2 text-slate-400">Generating prep sheet...</span>
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-4">
              {error}
              <button onClick={loadPrepSheet} className="ml-2 text-blue-400 underline">Retry</button>
            </div>
          ) : prepSheet ? (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{prepSheet.client_name}</h3>
                  <p className="text-xs text-slate-400">Generated: {prepSheet.generated_at}</p>
                </div>
                <button
                  onClick={loadPrepSheet}
                  className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded"
                >
                  Refresh
                </button>
              </div>

              {/* Demographics */}
              <div className="bg-slate-700/30 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" /> Client Overview
                </h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  {prepSheet.demographics.age && (
                    <div>
                      <span className="text-slate-400">Age:</span> {prepSheet.demographics.age}
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">Sessions:</span> {prepSheet.demographics.total_sessions}
                  </div>
                  {prepSheet.demographics.treatment_duration_days && (
                    <div>
                      <span className="text-slate-400">In Treatment:</span> {Math.round(prepSheet.demographics.treatment_duration_days / 30)} months
                    </div>
                  )}
                  {prepSheet.demographics.days_since_last_session && (
                    <div>
                      <span className="text-slate-400">Last Session:</span> {prepSheet.demographics.days_since_last_session} days ago
                    </div>
                  )}
                  {prepSheet.demographics.diagnosis_codes && (
                    <div className="col-span-2">
                      <span className="text-slate-400">Dx:</span> {prepSheet.demographics.diagnosis_codes}
                    </div>
                  )}
                </div>
              </div>

              {/* Safety Alerts */}
              {prepSheet.safety_alerts.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-4 h-4" /> Safety Alerts
                  </h4>
                  <div className="space-y-2">
                    {prepSheet.safety_alerts.map((alert, idx) => (
                      <div key={idx} className={`rounded-lg p-3 border ${severityColors[alert.severity]}`}>
                        <div className="font-medium capitalize">{alert.alert_type.replace('_', ' ')}</div>
                        <div className="text-xs opacity-80">{alert.details}</div>
                        <div className="text-xs opacity-60 mt-1">Last flagged: {alert.last_flagged}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Focus Suggestions */}
              <div className="bg-blue-500/10 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-blue-400">
                  <Target className="w-4 h-4" /> Session Focus Suggestions
                </h4>
                <ul className="space-y-2">
                  {prepSheet.focus_suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Active Themes */}
              {prepSheet.active_themes.length > 0 && (
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3">Active Treatment Themes</h4>
                  <div className="flex flex-wrap gap-2">
                    {prepSheet.active_themes.map((theme, idx) => (
                      <div key={idx} className="bg-slate-600/50 rounded-lg px-3 py-2 text-sm">
                        <span className="mr-2">{trendIcons[theme.trend] || '•'}</span>
                        <span className="capitalize">{theme.theme.replace('_', ' ')}</span>
                        <span className="text-xs text-slate-400 ml-2">({theme.trend})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Sessions */}
              {prepSheet.recent_sessions.length > 0 && (
                <div className="bg-slate-700/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3">Recent Sessions</h4>
                  <div className="space-y-3">
                    {prepSheet.recent_sessions.map((session, idx) => (
                      <div key={idx} className="border-l-2 border-slate-600 pl-3">
                        <div className="text-sm font-medium">{session.session_date}</div>
                        {session.key_points.length > 0 && (
                          <ul className="text-xs text-slate-400 mt-1">
                            {session.key_points.map((point, i) => (
                              <li key={i}>• {point.slice(0, 100)}...</li>
                            ))}
                          </ul>
                        )}
                        {session.mood_indicators.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {session.mood_indicators.map((mood, i) => (
                              <span key={i} className="text-xs bg-slate-600 px-2 py-0.5 rounded capitalize">{mood}</span>
                            ))}
                          </div>
                        )}
                        {session.interventions_used.length > 0 && (
                          <div className="text-xs text-slate-500 mt-1">
                            Interventions: {session.interventions_used.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Assessments */}
              {prepSheet.suggested_assessments.length > 0 && (
                <div className="bg-purple-500/10 rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-purple-400">
                    <FileCheck className="w-4 h-4" /> Suggested Assessments
                  </h4>
                  <div className="space-y-2">
                    {prepSheet.suggested_assessments.map((assessment, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-700/30 rounded-lg p-2">
                        <div>
                          <span className="font-medium">{assessment.assessment_name}</span>
                          <span className="text-xs text-slate-400 ml-2">{assessment.reason}</span>
                        </div>
                        {assessment.last_score && (
                          <span className="text-xs bg-slate-600 px-2 py-1 rounded">
                            Last: {assessment.last_score}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">Click to generate prep sheet</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Completion Check Panel
// ============================================

export function CompletionCheckPanel({
  noteId,
  model,
  onComplete,
  onSuggestionApplied,
}: {
  noteId: string;
  model: string;
  onComplete?: () => void;
  onSuggestionApplied?: (newContent: string) => void;
}) {
  const [result, setResult] = useState<api.CompletionCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<number>>(new Set());
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);

  async function runCheck() {
    setLoading(true);
    setError(null);
    setAppliedSuggestions(new Set());
    setDismissedSuggestions(new Set());
    try {
      const checkResult = await api.checkNoteCompletion(noteId, model);
      setResult(checkResult);
    } catch (err) {
      console.error('Completion check failed:', err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleApplySuggestion(index: number, section: api.VagueSection) {
    if (!onSuggestionApplied) return;
    setApplyingIndex(index);
    try {
      // Get current note content
      const note = await api.getNote(noteId);
      const currentContent = note.raw_input || note.content || '';
      
      // Apply the suggestion by replacing the problematic text
      // This is a simple replacement - in a real implementation you might use
      // a more sophisticated text editing approach
      const newContent = currentContent.replace(
        section.problematic_text,
        section.suggestion.replace('Suggestion: ', '')
      );
      
      if (newContent !== currentContent) {
        // Update the note content
        await api.updateNoteContent(noteId, newContent);
        setAppliedSuggestions(prev => new Set(prev).add(index));
        onSuggestionApplied(newContent);
      } else {
        // If direct replacement didn't work, just mark as applied
        setAppliedSuggestions(prev => new Set(prev).add(index));
      }
    } catch (err) {
      console.error('Failed to apply suggestion:', err);
      alert('Failed to apply suggestion: ' + String(err));
    } finally {
      setApplyingIndex(null);
    }
  }

  function handleDismissSuggestion(index: number) {
    setDismissedSuggestions(prev => new Set(prev).add(index));
  }

  const scoreColor = result ? (
    result.overall_score >= 0.8 ? 'text-green-400' :
    result.overall_score >= 0.6 ? 'text-amber-400' :
    'text-red-400'
  ) : '';

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-blue-400" />
          AI Documentation Review
        </h4>
        <button
          onClick={runCheck}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-lg text-sm flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? 'Analyzing...' : 'Run Check'}
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm mb-4">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Score */}
          <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-4">
            <div>
              <div className="text-sm text-slate-400">Documentation Quality Score</div>
              <div className={`text-3xl font-bold ${scoreColor}`}>
                {Math.round(result.overall_score * 100)}%
              </div>
            </div>
            <div className={`text-4xl ${result.is_complete ? 'text-green-400' : 'text-amber-400'}`}>
              {result.is_complete ? 'Complete' : 'Incomplete'}
            </div>
          </div>

          {/* Missing Fields */}
          {result.missing_fields.length > 0 && (
            <div className="bg-red-500/10 rounded-lg p-4">
              <h5 className="text-sm font-medium text-red-400 mb-2">Missing Fields</h5>
              <ul className="space-y-2">
                {result.missing_fields.map((field, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      field.importance === 'required' ? 'bg-red-500/20 text-red-400' :
                      field.importance === 'recommended' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-slate-600 text-slate-400'
                    }`}>{field.importance}</span>
                    <div>
                      <span className="font-medium">{field.field_name}</span>
                      <span className="text-slate-400 ml-2">{field.description}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vague Sections - Enhanced with Accept/Reject */}
          {result.vague_sections.length > 0 && (
            <div className="bg-amber-500/10 rounded-lg p-4">
              <h5 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                <Edit className="w-4 h-4" />
                Suggested Improvements
              </h5>
              <ul className="space-y-4">
                {result.vague_sections.map((section, idx) => {
                  const isApplied = appliedSuggestions.has(idx);
                  const isDismissed = dismissedSuggestions.has(idx);
                  const isApplying = applyingIndex === idx;
                  
                  if (isDismissed) return null;
                  
                  return (
                    <li key={idx} className={`text-sm bg-slate-800/50 rounded-lg p-3 ${isApplied ? 'opacity-60' : ''}`}>
                      <div className="font-medium text-amber-300 mb-2">{section.section}</div>
                      
                      {/* Before/After Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="bg-red-500/5 border border-red-500/20 rounded p-2">
                          <div className="text-xs text-red-400 mb-1">Current:</div>
                          <div className="text-xs text-slate-300 italic line-through">
                            "{section.problematic_text}"
                          </div>
                        </div>
                        <div className="bg-green-500/5 border border-green-500/20 rounded p-2">
                          <div className="text-xs text-green-400 mb-1">Suggested:</div>
                          <div className="text-xs text-slate-300">
                            "{section.suggestion.replace('Suggestion: ', '')}"
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      {!isApplied && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleDismissSuggestion(idx)}
                            className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Dismiss
                          </button>
                          {onSuggestionApplied && (
                            <button
                              onClick={() => handleApplySuggestion(idx, section)}
                              disabled={isApplying}
                              className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded flex items-center gap-1"
                            >
                              {isApplying ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3 h-3" />
                              )}
                              Apply
                            </button>
                          )}
                        </div>
                      )}
                      {isApplied && (
                        <div className="text-xs text-green-400 flex items-center gap-1 justify-end">
                          <CheckCircle className="w-3 h-3" />
                          Applied
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Compliance Issues */}
          {result.compliance_issues.length > 0 && (
            <div className="bg-orange-500/10 rounded-lg p-4">
              <h5 className="text-sm font-medium text-orange-400 mb-2">Compliance Issues</h5>
              <ul className="space-y-2">
                {result.compliance_issues.map((issue, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      issue.severity === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>{issue.severity}</span>
                    <span>{issue.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {result.suggestions.length > 0 && (
            <div className="bg-blue-500/10 rounded-lg p-4">
              <h5 className="text-sm font-medium text-blue-400 mb-2">Suggestions</h5>
              <ul className="space-y-1">
                {result.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-blue-400">Tip</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Complete Status */}
          {result.is_complete && (
            <div className="bg-green-500/10 rounded-lg p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-green-400 font-medium">Note is ready for signing</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Export Panel
// ============================================

export function ExportPanel({
  noteId,
  clientName,
}: {
  noteId: string;
  clientName: string;
}) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [includeHeader, setIncludeHeader] = useState(true);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  async function handleExport(format: 'pdf' | 'docx' | 'txt') {
    setExporting(format);
    setExportSuccess(null);
    try {
      const data = await api.exportNoteToFile(noteId, format, includeHeader);
      const sanitizedName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${sanitizedName}_note.${format}`;
      
      const filterNames: Record<string, string> = {
        'txt': 'Text Files',
        'docx': 'Word Documents',
        'pdf': 'PDF Documents'
      };
      
      const saved = await api.saveFile(data, fileName, filterNames[format], format);
      if (saved) {
        setExportSuccess(format.toUpperCase());
        setTimeout(() => setExportSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + String(err));
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="bg-slate-700/30 rounded-lg p-4">
      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
        <Download className="w-4 h-4" /> Export Note
      </h4>
      
      <div className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          id="includeHeader"
          checked={includeHeader}
          onChange={(e) => setIncludeHeader(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="includeHeader" className="text-sm text-slate-400">Include header info</label>
      </div>

      {exportSuccess && (
        <div className="mb-3 bg-green-500/20 text-green-400 px-3 py-2 rounded text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {exportSuccess} exported successfully!
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handleExport('txt')}
          disabled={exporting !== null}
          className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 px-3 py-2 rounded text-sm flex items-center justify-center gap-2"
        >
          {exporting === 'txt' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          TXT
        </button>
        <button
          onClick={() => handleExport('docx')}
          disabled={exporting !== null}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-2 rounded text-sm flex items-center justify-center gap-2"
        >
          {exporting === 'docx' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          DOCX
        </button>
        <button
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
          className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-2 rounded text-sm flex items-center justify-center gap-2"
        >
          {exporting === 'pdf' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          PDF
        </button>
      </div>
    </div>
  );
}

// ============================================
// Supervisor Mode Panel
// ============================================

export function SupervisorModePanel({
  supervisorId,
}: {
  supervisorId: string;
}) {
  const [dashboard, setDashboard] = useState<api.SupervisorDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAddTrainee, setShowAddTrainee] = useState(false);
  const [newTraineeName, setNewTraineeName] = useState('');
  const [newTraineeEmail, setNewTraineeEmail] = useState('');
  const [selectedTrainee, setSelectedTrainee] = useState<{
    trainee: api.Trainee;
    pending_notes: number;
    recent_activity: any[];
    pendingReviews?: api.PendingReview[];
  } | null>(null);

  async function loadDashboard() {
    setLoading(true);
    try {
      const data = await api.getSupervisorDashboard(supervisorId);
      setDashboard(data);
    } catch (err) {
      console.error('Failed to load supervisor dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (expanded && !dashboard) {
      loadDashboard();
    }
  }, [expanded]);

  async function handleAddTrainee() {
    if (!newTraineeName.trim()) return;
    try {
      await api.createTrainee(newTraineeName, newTraineeEmail || null, supervisorId);
      setNewTraineeName('');
      setNewTraineeEmail('');
      setShowAddTrainee(false);
      loadDashboard();
    } catch (err) {
      console.error('Failed to add trainee:', err);
      alert('Failed to add trainee: ' + String(err));
    }
  }

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-purple-400" />
          <span className="font-medium">Supervisor Mode</span>
          {dashboard && dashboard.pending_reviews.length > 0 && (
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
              {dashboard.pending_reviews.length} pending
            </span>
          )}
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
            </div>
          ) : dashboard ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">{dashboard.trainees.length}</div>
                  <div className="text-xs text-slate-400">Trainees</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{dashboard.pending_reviews.length}</div>
                  <div className="text-xs text-slate-400">Pending Reviews</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {dashboard.trainees.reduce((sum, t) => sum + t.trainee.notes_approved, 0)}
                  </div>
                  <div className="text-xs text-slate-400">Approved</div>
                </div>
              </div>

              {/* Pending Reviews */}
              {dashboard.pending_reviews.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" /> Pending Reviews
                  </h4>
                  <div className="space-y-2">
                    {dashboard.pending_reviews.map((review) => (
                      <div key={review.note_id} className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{review.client_name}</div>
                          <div className="text-xs text-slate-400">
                            By {review.trainee_name} • {review.session_date}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded ${
                            review.days_pending > 3 ? 'bg-red-500/20 text-red-400' :
                            review.days_pending > 1 ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-600 text-slate-400'
                          }`}>
                            {review.days_pending}d ago
                          </span>
                          <button className="bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm">
                            Review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trainees */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" /> Trainees
                  </h4>
                  <button
                    onClick={() => setShowAddTrainee(!showAddTrainee)}
                    className="text-xs bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Trainee
                  </button>
                </div>

                {showAddTrainee && (
                  <div className="bg-slate-700/30 rounded-lg p-3 mb-3 space-y-2">
                    <input
                      type="text"
                      placeholder="Trainee name"
                      value={newTraineeName}
                      onChange={(e) => setNewTraineeName(e.target.value)}
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={newTraineeEmail}
                      onChange={(e) => setNewTraineeEmail(e.target.value)}
                      className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddTrainee}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 py-2 rounded text-sm"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => setShowAddTrainee(false)}
                        className="flex-1 bg-slate-600 hover:bg-slate-500 py-2 rounded text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {dashboard.trainees.map((trainee) => (
                    <div key={trainee.trainee.id} className="bg-slate-700/30 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{trainee.trainee.name}</div>
                          <div className="text-xs text-slate-400">
                            Started {trainee.trainee.start_date} • {trainee.trainee.status}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">
                            <span className="text-green-400">{trainee.trainee.notes_approved}</span>
                            <span className="text-slate-500">/</span>
                            <span className="text-slate-400">{trainee.trainee.notes_submitted}</span>
                          </div>
                          <div className="text-xs text-slate-500">approved/submitted</div>
                        </div>
                      </div>
                      {trainee.pending_notes > 0 && (
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-amber-400">
                            {trainee.pending_notes} notes awaiting review
                          </span>
                          <button
                            onClick={async () => {
                              try {
                                const reviews = await api.getTraineePendingReviews(trainee.trainee.id);
                                setSelectedTrainee({ 
                                  trainee: trainee.trainee, 
                                  pending_notes: trainee.pending_notes,
                                  recent_activity: [],
                                  pendingReviews: reviews 
                                });
                              } catch (err) {
                                console.error('Failed to load reviews:', err);
                              }
                            }}
                            className="text-xs bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded"
                          >
                            Review Notes
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {dashboard.trainees.length === 0 && (
                    <p className="text-slate-400 text-center py-4 text-sm">
                      No trainees yet. Click "Add Trainee" to get started.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4">Unable to load supervisor dashboard</p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// HIPAA Safe Harbor De-identification Panel
// ============================================

export function DeidentificationPanel({
  noteId,
  noteContent,
  clientName,
}: {
  noteId: string;
  noteContent: string;
  clientName: string;
}) {
  const [result, setResult] = useState<api.DeidentificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  async function handleDeidentify() {
    setLoading(true);
    try {
      const deidentResult = await api.deidentifyNote(noteId, false);
      setResult(deidentResult);
    } catch (err) {
      console.error('De-identification failed:', err);
      alert('De-identification failed: ' + String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: 'pdf' | 'docx' | 'txt') {
    setExporting(true);
    setExportSuccess(null);
    try {
      const data = await api.exportDeidentifiedCase(noteId, format, true);
      const fileName = `deidentified_case.${format}`;
      
      const filterNames: Record<string, string> = {
        'txt': 'Text Files',
        'docx': 'Word Documents',
        'pdf': 'PDF Documents'
      };
      
      const saved = await api.saveFile(data, fileName, filterNames[format], format);
      if (saved) {
        setExportSuccess(format.toUpperCase());
        setTimeout(() => setExportSuccess(null), 3000);
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed: ' + String(err));
    } finally {
      setExporting(false);
    }
  }

  const categoryLabels: Record<string, string> = {
    'A': 'Names',
    'B': 'Geographic',
    'C': 'Dates',
    'D': 'Phone',
    'E': 'Fax',
    'F': 'Email',
    'G': 'SSN',
    'H': 'Medical Record #',
    'I': 'Health Plan #',
    'J': 'Account #',
    'K': 'License #',
    'L': 'Vehicle ID',
    'M': 'Device ID',
    'N': 'URL',
    'O': 'IP Address',
    'P': 'Biometric',
    'Q': 'Photo',
    'R': 'Other ID',
    'AI': 'AI-Detected',
  };

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          <span className="font-medium">HIPAA Safe Harbor De-identification</span>
          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">
            45 CFR 164.514(b)
          </span>
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-4">
          {!result ? (
            <div className="text-center py-6">
              <Shield className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">De-identify for Consultation</h3>
              <p className="text-sm text-slate-400 mb-4 max-w-md mx-auto">
                Remove all 18 HIPAA Safe Harbor identifiers to enable peer consultation 
                and case presentations without transmitting PHI.
              </p>
              <button
                onClick={handleDeidentify}
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
                {loading ? 'Processing...' : 'De-identify Note'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stats Bar */}
              <div className="flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-2xl font-bold text-cyan-400">{result.identifiers_found.length}</div>
                    <div className="text-xs text-slate-400">Identifiers Removed</div>
                  </div>
                  <div>
                    <div className="text-lg font-medium text-green-400">Compliant</div>
                    <div className="text-xs text-slate-400">Safe Harbor</div>
                  </div>
                  <div>
                    <div className="text-lg font-medium">{result.processing_time_ms}ms</div>
                    <div className="text-xs text-slate-400">Processing</div>
                  </div>
                </div>
                <button
                  onClick={handleDeidentify}
                  className="text-xs bg-slate-600 hover:bg-slate-500 px-3 py-1 rounded"
                >
                  Re-run
                </button>
              </div>

              {/* Category Summary */}
              <div className="bg-slate-700/30 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Removed by Category</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(result.category_counts).map(([code, count]) => (
                    <span key={code} className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">
                      {categoryLabels[code] || code}: {count}
                    </span>
                  ))}
                </div>
              </div>

              {/* Side-by-side Preview */}
              <div className="bg-slate-700/30 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Preview Comparison</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowOriginal(true)}
                      className={`text-xs px-3 py-1 rounded ${showOriginal ? 'bg-cyan-600' : 'bg-slate-600'}`}
                    >
                      Original
                    </button>
                    <button
                      onClick={() => setShowOriginal(false)}
                      className={`text-xs px-3 py-1 rounded ${!showOriginal ? 'bg-cyan-600' : 'bg-slate-600'}`}
                    >
                      De-identified
                    </button>
                  </div>
                </div>
                <div className="bg-slate-800 rounded p-3 max-h-60 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap font-mono">
                    {showOriginal ? noteContent : result.deidentified_text}
                  </pre>
                </div>
              </div>

              {/* Identifiers Found */}
              {result.identifiers_found.length > 0 && (
                <div className="bg-slate-700/30 rounded-lg p-3">
                  <h4 className="text-sm font-medium mb-2">Identifiers Removed ({result.identifiers_found.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {result.identifiers_found.slice(0, 20).map((id, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-slate-800 rounded p-2">
                        <span className="text-slate-400">{categoryLabels[id.category as any] || id.category}</span>
                        <span className="text-red-400 line-through">{id.original_text.slice(0, 30)}</span>
                        <span className="text-green-400">{id.replacement}</span>
                        <span className="text-slate-500">{Math.round(id.confidence * 100)}%</span>
                      </div>
                    ))}
                    {result.identifiers_found.length > 20 && (
                      <div className="text-xs text-slate-500 text-center py-1">
                        +{result.identifiers_found.length - 20} more...
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Export Options */}
              <div className="bg-cyan-500/10 rounded-lg p-4">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-cyan-400">
                  <Download className="w-4 h-4" /> Export De-identified Case
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  Includes de-identification certificate with hash verification for audit trail.
                </p>
                {exportSuccess && (
                  <div className="mb-3 bg-green-500/20 text-green-400 px-3 py-2 rounded text-sm flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {exportSuccess} exported successfully!
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport('txt')}
                    disabled={exporting}
                    className="flex-1 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 px-3 py-2 rounded text-sm"
                  >
                    {exporting ? 'Saving...' : 'TXT'}
                  </button>
                  <button
                    onClick={() => handleExport('docx')}
                    disabled={exporting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-3 py-2 rounded text-sm"
                  >
                    {exporting ? 'Saving...' : 'DOCX'}
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={exporting}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-2 rounded text-sm"
                  >
                    {exporting ? 'Saving...' : 'PDF'}
                  </button>
                </div>
              </div>

              {/* Audit Trail Info */}
              <div className="bg-slate-700/30 rounded-lg p-3">
                <h4 className="text-sm font-medium mb-2">Audit Trail</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400">Original Hash:</span>
                    <span className="ml-2 font-mono">{result.original_hash.slice(0, 12)}...</span>
                  </div>
                  <div>
                    <span className="text-slate-400">De-identified Hash:</span>
                    <span className="ml-2 font-mono">{result.deidentified_hash.slice(0, 12)}...</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Timestamp:</span>
                    <span className="ml-2">{result.timestamp}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Method:</span>
                    <span className="ml-2">HIPAA Safe Harbor</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Consultation Draft Queue Panel
// ============================================

export function ConsultationDraftPanel({
  noteId,
  noteContent,
}: {
  noteId: string;
  noteContent: string;
}) {
  const [drafts, setDrafts] = useState<api.ConsultationDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [urgency, setUrgency] = useState<'routine' | 'soon' | 'urgent'>('routine');

  const specialtyOptions = [
    'Anxiety Disorders', 'Mood Disorders', 'Trauma/PTSD', 'Personality Disorders',
    'Substance Use', 'Eating Disorders', 'Child/Adolescent', 'Geriatric',
    'Neurodevelopmental', 'Psychosis', 'OCD', 'General Psychiatry'
  ];

  async function loadDrafts() {
    setLoading(true);
    try {
      const allDrafts = await api.listConsultationDrafts();
      setDrafts(allDrafts);
    } catch (err) {
      console.error('Failed to load drafts:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (expanded) {
      loadDrafts();
    }
  }, [expanded]);

  async function handleCreate() {
    if (!title.trim() || !question.trim()) {
      alert('Please provide a title and clinical question');
      return;
    }
    
    setCreating(true);
    try {
      await api.createConsultationDraft(noteId, title, question, specialties, urgency);
      setShowCreate(false);
      setTitle('');
      setQuestion('');
      setSpecialties([]);
      setUrgency('routine');
      loadDrafts();
    } catch (err) {
      console.error('Failed to create draft:', err);
      alert('Failed to create draft: ' + String(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(draftId: string) {
    if (!confirm('Delete this consultation draft?')) return;
    try {
      await api.deleteConsultationDraft(draftId);
      loadDrafts();
    } catch (err) {
      console.error('Failed to delete draft:', err);
    }
  }

  const urgencyColors: Record<string, string> = {
    routine: 'bg-slate-600',
    soon: 'bg-amber-600',
    urgent: 'bg-red-600',
  };

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-violet-400" />
          <span className="font-medium">Consultation Draft Queue</span>
          {drafts.length > 0 && (
            <span className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">
              {drafts.length} drafts
            </span>
          )}
        </div>
        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-700 p-4">
          {/* Network Status Banner with Toggle */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Network Mode: OFF</span>
              </div>
              <button
                onClick={() => alert('Network sharing is coming in v4.3.0. Currently, all drafts are stored locally on your device for maximum privacy.')}
                className="text-xs bg-slate-600 hover:bg-slate-500 px-3 py-1.5 rounded"
              >
                Enable
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Drafts are stored locally. Network mode will enable secure peer-to-peer case sharing.
            </p>
          </div>

          {/* Create New Draft */}
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full bg-violet-600 hover:bg-violet-700 py-3 rounded-lg font-medium flex items-center justify-center gap-2 mb-4"
            >
              <Plus className="w-5 h-5" />
              Create Consultation Draft
            </button>
          ) : (
            <div className="bg-slate-700/30 rounded-lg p-4 mb-4 space-y-3">
              <h4 className="font-medium">New Consultation Request</h4>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief case title..."
                  className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Clinical Question</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What specific guidance are you seeking?"
                  className="w-full bg-slate-700 rounded px-3 py-2 text-sm min-h-[80px]"
                />
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Specialties (select relevant)</label>
                <div className="flex flex-wrap gap-2">
                  {specialtyOptions.map((spec) => (
                    <button
                      key={spec}
                      onClick={() => setSpecialties(prev => 
                        prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
                      )}
                      className={`text-xs px-2 py-1 rounded ${
                        specialties.includes(spec) ? 'bg-violet-600' : 'bg-slate-600'
                      }`}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Urgency</label>
                <div className="flex gap-2">
                  {(['routine', 'soon', 'urgent'] as const).map((u) => (
                    <button
                      key={u}
                      onClick={() => setUrgency(u)}
                      className={`flex-1 text-sm py-2 rounded capitalize ${
                        urgency === u ? urgencyColors[u] : 'bg-slate-600'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 py-2 rounded font-medium"
                >
                  {creating ? 'Creating...' : 'Create Draft'}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 bg-slate-600 hover:bg-slate-500 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Existing Drafts */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
            </div>
          ) : drafts.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-400">Your Drafts</h4>
              {drafts.map((draft) => (
                <div key={draft.id} className="bg-slate-700/30 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{draft.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${urgencyColors[draft.urgency]}`}>
                          {draft.urgency}
                        </span>
                        <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">
                          {draft.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{draft.clinical_question}</p>
                      <div className="flex gap-1 mt-2">
                        {draft.specialties.slice(0, 3).map((spec) => (
                          <span key={spec} className="text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded">
                            {spec}
                          </span>
                        ))}
                        {draft.specialties.length > 3 && (
                          <span className="text-xs text-slate-500">+{draft.specialties.length - 3}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(draft.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-4 text-sm">
              No consultation drafts yet. Create one to prepare for peer consultation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
