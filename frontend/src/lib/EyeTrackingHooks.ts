/**
 * EyeTrackingHooks.ts
 * 
 * P3: Eye-tracking integration hooks
 * Supports WebGazer.js (webcam-based) and Tobii (hardware) integrations
 * Captures gaze position, fixations, and dwell time on regions of interest
 */

// ============================================================================
// TYPES
// ============================================================================

export interface GazePoint {
  x: number;           // Screen X coordinate
  y: number;           // Screen Y coordinate
  timestamp: number;   // Unix timestamp in ms
  confidence?: number; // 0-1 confidence score (WebGazer)
}

export interface Fixation {
  id: string;
  x: number;
  y: number;
  startTime: number;
  endTime: number;
  duration: number;
  pointCount: number;
}

export interface RegionOfInterest {
  id: string;
  name: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  viewKey?: 'RCC' | 'LCC' | 'RMLO' | 'LMLO';
  isAIMarker?: boolean;
}

export interface DwellMetrics {
  regionId: string;
  totalDwellMs: number;
  fixationCount: number;
  firstEntryTime: number | null;
  lastExitTime: number | null;
  percentOfTotal: number;
}

export interface ScanPath {
  fixations: Fixation[];
  saccades: Array<{ from: Fixation; to: Fixation; amplitude: number }>;
  totalDuration: number;
  regionsVisited: string[];
}

export interface EyeTrackingEvent {
  type: 'GAZE_SAMPLE' | 'FIXATION_START' | 'FIXATION_END' | 
        'ROI_ENTER' | 'ROI_EXIT' | 'SACCADE' | 'BLINK';
  timestamp: string;
  data: Record<string, unknown>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface EyeTrackingConfig {
  provider: 'WEBGAZER' | 'TOBII' | 'MOCK';
  sampleRate: number;          // Hz
  fixationThresholdMs: number; // Min duration for fixation
  fixationRadiusPx: number;    // Max dispersion for fixation
  calibrationPoints: number;   // Number of calibration points
  enableRecording: boolean;
  enableInteractionTimeline: boolean;
}

export const DEFAULT_CONFIG: EyeTrackingConfig = {
  provider: 'WEBGAZER',
  sampleRate: 60,
  fixationThresholdMs: 100,
  fixationRadiusPx: 50,
  calibrationPoints: 9,
  enableRecording: true,
  enableInteractionTimeline: true,
};

// ============================================================================
// EYE TRACKING MANAGER
// ============================================================================

export class EyeTrackingManager {
  private config: EyeTrackingConfig;
  private isCalibrated: boolean = false;
  private isRecording: boolean = false;
  private gazeBuffer: GazePoint[] = [];
  private fixations: Fixation[] = [];
  private rois: Map<string, RegionOfInterest> = new Map();
  private currentROI: string | null = null;
  private eventCallback: ((event: EyeTrackingEvent) => void) | null = null;
  
  // Fixation detection state
  private fixationCandidate: GazePoint[] = [];
  private fixationCounter: number = 0;

  constructor(config: Partial<EyeTrackingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize eye tracking provider
   */
  async initialize(): Promise<boolean> {
    if (this.config.provider === 'WEBGAZER') {
      return this.initWebGazer();
    } else if (this.config.provider === 'TOBII') {
      return this.initTobii();
    } else {
      // Mock mode for testing
      console.log('Eye tracking in MOCK mode');
      return true;
    }
  }

  /**
   * Initialize WebGazer.js
   */
  private async initWebGazer(): Promise<boolean> {
    // @ts-ignore - WebGazer is loaded via script tag
    if (typeof webgazer === 'undefined') {
      console.warn('WebGazer.js not loaded. Add script tag: <script src="https://webgazer.cs.brown.edu/webgazer.js"></script>');
      return false;
    }

    try {
      // @ts-ignore
      await webgazer
        .setGazeListener((data: any, timestamp: number) => {
          if (data) {
            this.handleGazeSample({
              x: data.x,
              y: data.y,
              timestamp,
              confidence: data.confidence || 1,
            });
          }
        })
        .begin();
      
      // @ts-ignore
      webgazer.showPredictionPoints(false);
      
      console.log('WebGazer initialized');
      return true;
    } catch (error) {
      console.error('WebGazer initialization failed:', error);
      return false;
    }
  }

  /**
   * Initialize Tobii hardware
   */
  private async initTobii(): Promise<boolean> {
    // Tobii requires native integration via their SDK
    // This is a stub for the interface
    console.warn('Tobii integration requires native SDK. Using mock mode.');
    
    // In production, this would connect to Tobii Pro SDK via WebSocket or native bridge
    // Example: ws://localhost:8765/tobii
    
    return false;
  }

  /**
   * Run calibration procedure
   */
  async calibrate(): Promise<boolean> {
    if (this.config.provider === 'WEBGAZER') {
      // WebGazer has built-in calibration
      // @ts-ignore
      if (typeof webgazer !== 'undefined') {
        // @ts-ignore
        webgazer.clearData();
        console.log('WebGazer calibration ready. User should click on calibration points.');
        this.isCalibrated = true;
        return true;
      }
    }
    
    // For Tobii or mock, simulate calibration
    console.log('Calibration complete (mock)');
    this.isCalibrated = true;
    return true;
  }

  /**
   * Start recording gaze data
   */
  startRecording(): void {
    this.isRecording = true;
    this.gazeBuffer = [];
    this.fixations = [];
    this.emitEvent('GAZE_SAMPLE', { action: 'recording_started' });
  }

  /**
   * Stop recording
   */
  stopRecording(): { gazePoints: GazePoint[]; fixations: Fixation[] } {
    this.isRecording = false;
    this.emitEvent('GAZE_SAMPLE', { action: 'recording_stopped' });
    return {
      gazePoints: [...this.gazeBuffer],
      fixations: [...this.fixations],
    };
  }

  /**
   * Register a region of interest
   */
  registerROI(roi: RegionOfInterest): void {
    this.rois.set(roi.id, roi);
  }

  /**
   * Remove a region of interest
   */
  removeROI(roiId: string): void {
    this.rois.delete(roiId);
  }

  /**
   * Set event callback for real-time events
   */
  onEvent(callback: (event: EyeTrackingEvent) => void): void {
    this.eventCallback = callback;
  }

  /**
   * Get dwell metrics for all ROIs
   */
  getDwellMetrics(): DwellMetrics[] {
    const metrics: DwellMetrics[] = [];
    const totalDuration = this.gazeBuffer.length > 0
      ? this.gazeBuffer[this.gazeBuffer.length - 1].timestamp - this.gazeBuffer[0].timestamp
      : 0;

    for (const [roiId, roi] of this.rois) {
      const roiFixations = this.fixations.filter(f => this.isInROI(f, roi));
      const totalDwellMs = roiFixations.reduce((sum, f) => sum + f.duration, 0);
      
      const entries = this.gazeBuffer.filter((p, i) => {
        if (i === 0) return false;
        const prev = this.gazeBuffer[i - 1];
        return !this.isPointInROI(prev, roi) && this.isPointInROI(p, roi);
      });

      metrics.push({
        regionId: roiId,
        totalDwellMs,
        fixationCount: roiFixations.length,
        firstEntryTime: entries.length > 0 ? entries[0].timestamp : null,
        lastExitTime: null, // Simplified
        percentOfTotal: totalDuration > 0 ? (totalDwellMs / totalDuration) * 100 : 0,
      });
    }

    return metrics;
  }

  /**
   * Generate scan path analysis
   */
  getScanPath(): ScanPath {
    const saccades: ScanPath['saccades'] = [];
    
    for (let i = 1; i < this.fixations.length; i++) {
      const from = this.fixations[i - 1];
      const to = this.fixations[i];
      const amplitude = Math.sqrt(
        Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2)
      );
      saccades.push({ from, to, amplitude });
    }

    const regionsVisited = this.fixations
      .map(f => {
        for (const [roiId, roi] of this.rois) {
          if (this.isInROI(f, roi)) return roiId;
        }
        return 'BACKGROUND';
      })
      .filter((r, i, arr) => i === 0 || r !== arr[i - 1]); // Remove consecutive duplicates

    return {
      fixations: this.fixations,
      saccades,
      totalDuration: this.gazeBuffer.length > 0
        ? this.gazeBuffer[this.gazeBuffer.length - 1].timestamp - this.gazeBuffer[0].timestamp
        : 0,
      regionsVisited,
    };
  }

  /**
   * Shutdown eye tracking
   */
  async shutdown(): Promise<void> {
    this.isRecording = false;
    
    if (this.config.provider === 'WEBGAZER') {
      // @ts-ignore
      if (typeof webgazer !== 'undefined') {
        // @ts-ignore
        webgazer.end();
      }
    }
    
    console.log('Eye tracking shutdown');
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private handleGazeSample(point: GazePoint): void {
    if (!this.isRecording) return;

    this.gazeBuffer.push(point);
    
    // Fixation detection (dispersion-based)
    this.detectFixation(point);
    
    // ROI tracking
    this.trackROI(point);
  }

  private detectFixation(point: GazePoint): void {
    this.fixationCandidate.push(point);
    
    // Check if points form a fixation (within radius threshold)
    if (this.fixationCandidate.length >= 3) {
      const dispersion = this.calculateDispersion(this.fixationCandidate);
      const duration = point.timestamp - this.fixationCandidate[0].timestamp;
      
      if (dispersion <= this.config.fixationRadiusPx && 
          duration >= this.config.fixationThresholdMs) {
        // Potential fixation continues
      } else if (duration >= this.config.fixationThresholdMs) {
        // Fixation ended
        const centroid = this.calculateCentroid(this.fixationCandidate.slice(0, -1));
        const fixation: Fixation = {
          id: `FIX-${++this.fixationCounter}`,
          x: centroid.x,
          y: centroid.y,
          startTime: this.fixationCandidate[0].timestamp,
          endTime: this.fixationCandidate[this.fixationCandidate.length - 2].timestamp,
          duration,
          pointCount: this.fixationCandidate.length - 1,
        };
        
        this.fixations.push(fixation);
        this.emitEvent('FIXATION_END', { fixation });
        
        // Start new candidate with current point
        this.fixationCandidate = [point];
      } else {
        // Reset - not a fixation
        this.fixationCandidate = [point];
      }
    }
  }

  private trackROI(point: GazePoint): void {
    let newROI: string | null = null;
    
    for (const [roiId, roi] of this.rois) {
      if (this.isPointInROI(point, roi)) {
        newROI = roiId;
        break;
      }
    }
    
    if (newROI !== this.currentROI) {
      if (this.currentROI) {
        this.emitEvent('ROI_EXIT', { 
          roiId: this.currentROI, 
          timestamp: point.timestamp 
        });
      }
      if (newROI) {
        this.emitEvent('ROI_ENTER', { 
          roiId: newROI, 
          timestamp: point.timestamp 
        });
      }
      this.currentROI = newROI;
    }
  }

  private calculateDispersion(points: GazePoint[]): number {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    return (Math.max(...xs) - Math.min(...xs)) + (Math.max(...ys) - Math.min(...ys));
  }

  private calculateCentroid(points: GazePoint[]): { x: number; y: number } {
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  }

  private isPointInROI(point: GazePoint, roi: RegionOfInterest): boolean {
    return point.x >= roi.bounds.x &&
           point.x <= roi.bounds.x + roi.bounds.width &&
           point.y >= roi.bounds.y &&
           point.y <= roi.bounds.y + roi.bounds.height;
  }

  private isInROI(fixation: Fixation, roi: RegionOfInterest): boolean {
    return fixation.x >= roi.bounds.x &&
           fixation.x <= roi.bounds.x + roi.bounds.width &&
           fixation.y >= roi.bounds.y &&
           fixation.y <= roi.bounds.y + roi.bounds.height;
  }

  private emitEvent(type: EyeTrackingEvent['type'], data: Record<string, unknown>): void {
    const event: EyeTrackingEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    
    if (this.eventCallback) {
      this.eventCallback(event);
    }
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

export function useEyeTracking(config?: Partial<EyeTrackingConfig>) {
  // This would be implemented as a proper React hook
  // Returning placeholder for type reference
  return {
    manager: null as EyeTrackingManager | null,
    isReady: false,
    isRecording: false,
    start: () => {},
    stop: () => {},
    getDwellMetrics: () => [] as DwellMetrics[],
    getScanPath: () => null as ScanPath | null,
  };
}

export default EyeTrackingManager;
