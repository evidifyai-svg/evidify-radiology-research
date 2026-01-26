/**
 * PACSIntegration.ts
 * 
 * P3: PACS (Picture Archiving and Communication System) and 
 * RIS (Radiology Information System) integration stubs
 * 
 * Provides interfaces for connecting to clinical imaging systems
 * for production deployment in hospital environments.
 */

// ============================================================================
// DICOM TYPES
// ============================================================================

export interface DICOMPatient {
  patientId: string;
  patientName?: {
    familyName: string;
    givenName: string;
    middleName?: string;
  };
  birthDate?: string;
  sex?: 'M' | 'F' | 'O';
}

export interface DICOMStudy {
  studyInstanceUID: string;
  studyId: string;
  studyDate: string;
  studyTime: string;
  studyDescription?: string;
  accessionNumber: string;
  modalitiesInStudy: string[];
  numberOfSeries: number;
  numberOfInstances: number;
  patient: DICOMPatient;
}

export interface DICOMSeries {
  seriesInstanceUID: string;
  seriesNumber: number;
  modality: string;
  seriesDescription?: string;
  bodyPartExamined?: string;
  viewPosition?: string;
  laterality?: 'L' | 'R' | 'B';
  numberOfInstances: number;
}

export interface DICOMInstance {
  sopInstanceUID: string;
  sopClassUID: string;
  instanceNumber: number;
  rows: number;
  columns: number;
  bitsAllocated: number;
  bitsStored: number;
  photometricInterpretation: string;
  imageType: string[];
}

export interface MammogramMetadata {
  breastDensity?: 'A' | 'B' | 'C' | 'D';
  viewPosition: 'CC' | 'MLO' | 'ML' | 'LM' | 'XCCL' | 'XCCM';
  laterality: 'L' | 'R';
  compressionForce?: number;
  compressionThickness?: number;
  kvp?: number;
  mas?: number;
  targetMaterial?: string;
  filterMaterial?: string;
}

// ============================================================================
// WORKLIST TYPES (RIS)
// ============================================================================

export interface WorklistItem {
  accessionNumber: string;
  patientId: string;
  patientName: string;
  studyDate: string;
  scheduledTime: string;
  procedureDescription: string;
  scheduledStation: string;
  orderingPhysician?: string;
  referringPhysician?: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface ReadingAssignment {
  assignmentId: string;
  accessionNumber: string;
  readerId: string;
  readerName: string;
  assignedTime: string;
  dueTime?: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED';
}

// ============================================================================
// PACS CONNECTION CONFIG
// ============================================================================

export interface PACSConfig {
  // DICOMweb endpoints
  wadoUri: string;         // WADO-URI for image retrieval
  wadoRs: string;          // WADO-RS REST endpoint
  stowRs?: string;         // STOW-RS for storage
  qidoRs: string;          // QIDO-RS for queries
  
  // Authentication
  authType: 'NONE' | 'BASIC' | 'OAUTH2' | 'JWT';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    clientId?: string;
    clientSecret?: string;
  };
  
  // Connection settings
  timeout: number;
  retryAttempts: number;
  
  // TLS settings
  tlsEnabled: boolean;
  tlsCert?: string;
  tlsKey?: string;
  tlsCa?: string;
}

export interface RISConfig {
  // HL7 FHIR endpoints
  fhirBaseUrl: string;
  
  // Worklist endpoints
  worklistEndpoint: string;
  
  // Authentication
  authType: 'NONE' | 'BASIC' | 'OAUTH2' | 'SMART';
  credentials?: {
    clientId?: string;
    clientSecret?: string;
    scope?: string[];
  };
}

// ============================================================================
// PACS CLIENT
// ============================================================================

export class PACSClient {
  private config: PACSConfig;
  private authToken: string | null = null;

  constructor(config: PACSConfig) {
    this.config = config;
  }

  /**
   * Initialize connection and authenticate
   */
  async connect(): Promise<boolean> {
    if (this.config.authType === 'OAUTH2') {
      return this.authenticateOAuth2();
    } else if (this.config.authType === 'BASIC') {
      return this.authenticateBasic();
    }
    return true;
  }

  /**
   * Query for studies (QIDO-RS)
   */
  async queryStudies(params: {
    patientId?: string;
    patientName?: string;
    studyDate?: string;
    accessionNumber?: string;
    modality?: string;
    limit?: number;
  }): Promise<DICOMStudy[]> {
    const queryParams = new URLSearchParams();
    
    if (params.patientId) queryParams.set('PatientID', params.patientId);
    if (params.patientName) queryParams.set('PatientName', params.patientName);
    if (params.studyDate) queryParams.set('StudyDate', params.studyDate);
    if (params.accessionNumber) queryParams.set('AccessionNumber', params.accessionNumber);
    if (params.modality) queryParams.set('ModalitiesInStudy', params.modality);
    if (params.limit) queryParams.set('limit', params.limit.toString());

    const url = `${this.config.qidoRs}/studies?${queryParams}`;
    
    try {
      const response = await this.fetch(url, {
        headers: {
          'Accept': 'application/dicom+json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`QIDO-RS query failed: ${response.status}`);
      }
      
      const results = await response.json();
      return this.mapStudyResults(results);
    } catch (error) {
      console.error('PACS query error:', error);
      return [];
    }
  }

  /**
   * Query for series in a study
   */
  async querySeries(studyInstanceUID: string): Promise<DICOMSeries[]> {
    const url = `${this.config.qidoRs}/studies/${studyInstanceUID}/series`;
    
    try {
      const response = await this.fetch(url, {
        headers: { 'Accept': 'application/dicom+json' },
      });
      
      const results = await response.json();
      return this.mapSeriesResults(results);
    } catch (error) {
      console.error('Series query error:', error);
      return [];
    }
  }

  /**
   * Retrieve image via WADO-RS
   */
  async retrieveImage(
    studyUID: string, 
    seriesUID: string, 
    instanceUID: string,
    format: 'image/jpeg' | 'image/png' | 'application/dicom' = 'image/png'
  ): Promise<Blob | null> {
    const url = `${this.config.wadoRs}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}/rendered`;
    
    try {
      const response = await this.fetch(url, {
        headers: { 'Accept': format },
      });
      
      if (!response.ok) {
        throw new Error(`Image retrieval failed: ${response.status}`);
      }
      
      return response.blob();
    } catch (error) {
      console.error('Image retrieval error:', error);
      return null;
    }
  }

  /**
   * Retrieve thumbnail
   */
  async retrieveThumbnail(
    studyUID: string, 
    seriesUID: string, 
    instanceUID: string,
    size: number = 128
  ): Promise<Blob | null> {
    const url = `${this.config.wadoRs}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}/thumbnail?viewport=${size},${size}`;
    
    try {
      const response = await this.fetch(url, {
        headers: { 'Accept': 'image/jpeg' },
      });
      
      return response.ok ? response.blob() : null;
    } catch (error) {
      console.error('Thumbnail retrieval error:', error);
      return null;
    }
  }

  /**
   * Get mammogram-specific metadata
   */
  async getMammogramMetadata(
    studyUID: string,
    seriesUID: string,
    instanceUID: string
  ): Promise<MammogramMetadata | null> {
    const url = `${this.config.qidoRs}/studies/${studyUID}/series/${seriesUID}/instances/${instanceUID}/metadata`;
    
    try {
      const response = await this.fetch(url, {
        headers: { 'Accept': 'application/dicom+json' },
      });
      
      if (!response.ok) return null;
      
      const metadata = await response.json();
      return this.extractMammogramMetadata(metadata);
    } catch (error) {
      console.error('Metadata retrieval error:', error);
      return null;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    
    if (this.config.authType === 'BASIC' && this.config.credentials) {
      const auth = btoa(`${this.config.credentials.username}:${this.config.credentials.password}`);
      headers.set('Authorization', `Basic ${auth}`);
    } else if (this.authToken) {
      headers.set('Authorization', `Bearer ${this.authToken}`);
    }
    
    return fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(this.config.timeout),
    });
  }

  private async authenticateOAuth2(): Promise<boolean> {
    // OAuth2 authentication implementation
    // Would connect to OAuth2 token endpoint
    console.warn('OAuth2 authentication not implemented');
    return false;
  }

  private async authenticateBasic(): Promise<boolean> {
    // Basic auth credentials are passed with each request
    return true;
  }

  private mapStudyResults(results: any[]): DICOMStudy[] {
    // Map DICOM JSON to our types
    return results.map(r => ({
      studyInstanceUID: r['0020000D']?.Value?.[0] || '',
      studyId: r['00200010']?.Value?.[0] || '',
      studyDate: r['00080020']?.Value?.[0] || '',
      studyTime: r['00080030']?.Value?.[0] || '',
      studyDescription: r['00081030']?.Value?.[0],
      accessionNumber: r['00080050']?.Value?.[0] || '',
      modalitiesInStudy: r['00080061']?.Value || [],
      numberOfSeries: r['00201206']?.Value?.[0] || 0,
      numberOfInstances: r['00201208']?.Value?.[0] || 0,
      patient: {
        patientId: r['00100020']?.Value?.[0] || '',
        patientName: this.parsePatientName(r['00100010']?.Value?.[0]),
        birthDate: r['00100030']?.Value?.[0],
        sex: r['00100040']?.Value?.[0],
      },
    }));
  }

  private mapSeriesResults(results: any[]): DICOMSeries[] {
    return results.map(r => ({
      seriesInstanceUID: r['0020000E']?.Value?.[0] || '',
      seriesNumber: r['00200011']?.Value?.[0] || 0,
      modality: r['00080060']?.Value?.[0] || '',
      seriesDescription: r['0008103E']?.Value?.[0],
      bodyPartExamined: r['00180015']?.Value?.[0],
      viewPosition: r['00185101']?.Value?.[0],
      laterality: r['00200062']?.Value?.[0],
      numberOfInstances: r['00201209']?.Value?.[0] || 0,
    }));
  }

  private parsePatientName(name: any): DICOMPatient['patientName'] {
    if (!name) return undefined;
    if (typeof name === 'string') {
      const parts = name.split('^');
      return {
        familyName: parts[0] || '',
        givenName: parts[1] || '',
        middleName: parts[2],
      };
    }
    return name;
  }

  private extractMammogramMetadata(metadata: any): MammogramMetadata {
    return {
      breastDensity: metadata['00401302']?.Value?.[0], // Breast Density
      viewPosition: metadata['00185101']?.Value?.[0], // View Position
      laterality: metadata['00200062']?.Value?.[0], // Image Laterality
      compressionForce: metadata['00181166']?.Value?.[0], // Compression Force
      compressionThickness: metadata['00181190']?.Value?.[0], // Compression Thickness
      kvp: metadata['00180060']?.Value?.[0], // KVP
      mas: metadata['00181152']?.Value?.[0], // Exposure (mAs)
      targetMaterial: metadata['00181191']?.Value?.[0],
      filterMaterial: metadata['00187050']?.Value?.[0],
    };
  }
}

// ============================================================================
// RIS CLIENT
// ============================================================================

export class RISClient {
  private config: RISConfig;

  constructor(config: RISConfig) {
    this.config = config;
  }

  /**
   * Get worklist items
   */
  async getWorklist(params: {
    date?: string;
    status?: WorklistItem['status'];
    priority?: WorklistItem['priority'];
  }): Promise<WorklistItem[]> {
    // FHIR-based worklist query
    const url = new URL(`${this.config.worklistEndpoint}/Task`);
    
    if (params.date) url.searchParams.set('authored-on', params.date);
    if (params.status) url.searchParams.set('status', params.status.toLowerCase());
    
    try {
      const response = await fetch(url.toString(), {
        headers: { 'Accept': 'application/fhir+json' },
      });
      
      if (!response.ok) return [];
      
      const bundle = await response.json();
      return this.mapWorklistItems(bundle.entry || []);
    } catch (error) {
      console.error('Worklist query error:', error);
      return [];
    }
  }

  /**
   * Get reading assignments for a reader
   */
  async getAssignments(readerId: string): Promise<ReadingAssignment[]> {
    // Implementation would query RIS for assignments
    console.warn('Assignment query not implemented');
    return [];
  }

  /**
   * Update reading status
   */
  async updateReadingStatus(
    accessionNumber: string,
    status: ReadingAssignment['status']
  ): Promise<boolean> {
    // Would update RIS with reading status
    console.warn('Status update not implemented');
    return false;
  }

  private mapWorklistItems(entries: any[]): WorklistItem[] {
    // Map FHIR resources to WorklistItem
    return entries.map(e => ({
      accessionNumber: e.resource?.identifier?.[0]?.value || '',
      patientId: e.resource?.for?.reference?.split('/')[1] || '',
      patientName: '',
      studyDate: e.resource?.authoredOn?.split('T')[0] || '',
      scheduledTime: e.resource?.authoredOn || '',
      procedureDescription: e.resource?.description || '',
      scheduledStation: e.resource?.location?.[0]?.display || '',
      priority: (e.resource?.priority?.toUpperCase() || 'ROUTINE') as WorklistItem['priority'],
      status: (e.resource?.status?.toUpperCase() || 'SCHEDULED') as WorklistItem['status'],
    }));
  }
}

// ============================================================================
// MOCK IMPLEMENTATIONS FOR DEVELOPMENT
// ============================================================================

export function createMockPACSClient(): PACSClient {
  const mockConfig: PACSConfig = {
    wadoUri: 'http://mock-pacs/wado',
    wadoRs: 'http://mock-pacs/dicom-web',
    qidoRs: 'http://mock-pacs/dicom-web',
    authType: 'NONE',
    timeout: 5000,
    retryAttempts: 3,
    tlsEnabled: false,
  };
  
  return new PACSClient(mockConfig);
}

export default PACSClient;
