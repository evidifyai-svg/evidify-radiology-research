/**
 * SiteRoleConfig.ts
 * 
 * P2-2: Multi-site role support for collaborative research
 * Manages site configuration, investigator roles, and IRB tracking
 */

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 
  | 'PRINCIPAL_INVESTIGATOR'
  | 'CO_INVESTIGATOR'
  | 'RESEARCH_COORDINATOR'
  | 'DATA_MANAGER'
  | 'READER'       // Radiologist participant
  | 'OBSERVER';    // Can view but not interact

export type SiteType = 
  | 'ACADEMIC_MEDICAL_CENTER'
  | 'COMMUNITY_HOSPITAL'
  | 'PRIVATE_PRACTICE'
  | 'RESEARCH_INSTITUTION';

export interface IRBApproval {
  irbNumber: string;
  approvalDate: string;
  expirationDate: string;
  protocolTitle: string;
  amendmentNumber?: string;
  relyingInstitution?: string; // For single IRB arrangements
  primaryIRB?: string;
}

export interface SiteConfig {
  siteId: string;
  siteName: string;
  siteType: SiteType;
  institution: string;
  department?: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  irb: IRBApproval;
  investigators: Investigator[];
  timezone: string;
  isActive: boolean;
  enrollmentTarget?: number;
  enrollmentCurrent?: number;
}

export interface Investigator {
  investigatorId: string;
  firstName: string;
  lastName: string;
  credentials: string[]; // ['MD', 'PhD', 'FACR']
  email: string;
  role: UserRole;
  specialization?: string;
  npiNumber?: string;
  yearsExperience?: number;
  permissions: Permission[];
}

export type Permission = 
  | 'CREATE_SESSION'
  | 'VIEW_SESSION'
  | 'EXPORT_DATA'
  | 'VIEW_ANALYTICS'
  | 'MANAGE_SITE'
  | 'MANAGE_USERS'
  | 'CONFIGURE_STUDY';

// ============================================================================
// ROLE PERMISSION MATRIX
// ============================================================================

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  PRINCIPAL_INVESTIGATOR: [
    'CREATE_SESSION', 'VIEW_SESSION', 'EXPORT_DATA', 
    'VIEW_ANALYTICS', 'MANAGE_SITE', 'MANAGE_USERS', 'CONFIGURE_STUDY'
  ],
  CO_INVESTIGATOR: [
    'CREATE_SESSION', 'VIEW_SESSION', 'EXPORT_DATA', 
    'VIEW_ANALYTICS', 'MANAGE_USERS'
  ],
  RESEARCH_COORDINATOR: [
    'CREATE_SESSION', 'VIEW_SESSION', 'EXPORT_DATA', 'VIEW_ANALYTICS'
  ],
  DATA_MANAGER: [
    'VIEW_SESSION', 'EXPORT_DATA', 'VIEW_ANALYTICS'
  ],
  READER: [
    'CREATE_SESSION', 'VIEW_SESSION'
  ],
  OBSERVER: [
    'VIEW_SESSION'
  ],
};

// ============================================================================
// STUDY CONFIGURATION
// ============================================================================

export interface StudyConfig {
  studyId: string;
  studyTitle: string;
  shortTitle: string;
  protocolVersion: string;
  sponsorName: string;
  fundingSource?: string;
  clinicalTrialsGovId?: string;
  primaryEndpoint: string;
  secondaryEndpoints: string[];
  sites: SiteConfig[];
  totalEnrollmentTarget: number;
  studyStartDate: string;
  estimatedEndDate: string;
  dataCoordinatingCenter: string;
}

// ============================================================================
// SITE MANAGER CLASS
// ============================================================================

export class SiteManager {
  private sites: Map<string, SiteConfig> = new Map();
  private currentSite: SiteConfig | null = null;
  private currentUser: Investigator | null = null;

  constructor(sites: SiteConfig[] = []) {
    sites.forEach(site => this.sites.set(site.siteId, site));
  }

  /**
   * Add or update a site
   */
  addSite(site: SiteConfig): void {
    this.sites.set(site.siteId, site);
  }

  /**
   * Get site by ID
   */
  getSite(siteId: string): SiteConfig | undefined {
    return this.sites.get(siteId);
  }

  /**
   * Get all sites
   */
  getAllSites(): SiteConfig[] {
    return Array.from(this.sites.values());
  }

  /**
   * Get active sites only
   */
  getActiveSites(): SiteConfig[] {
    return this.getAllSites().filter(s => s.isActive);
  }

  /**
   * Set current site context
   */
  setCurrentSite(siteId: string): boolean {
    const site = this.sites.get(siteId);
    if (site) {
      this.currentSite = site;
      return true;
    }
    return false;
  }

  /**
   * Set current user
   */
  setCurrentUser(investigatorId: string): boolean {
    if (!this.currentSite) return false;
    
    const user = this.currentSite.investigators.find(
      i => i.investigatorId === investigatorId
    );
    
    if (user) {
      this.currentUser = user;
      return true;
    }
    return false;
  }

  /**
   * Check if current user has permission
   */
  hasPermission(permission: Permission): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.permissions.includes(permission);
  }

  /**
   * Check if IRB is valid
   */
  isIRBValid(siteId: string): boolean {
    const site = this.sites.get(siteId);
    if (!site) return false;
    
    const expiration = new Date(site.irb.expirationDate);
    return expiration > new Date();
  }

  /**
   * Get enrollment status across all sites
   */
  getEnrollmentStatus(): {
    total: number;
    target: number;
    bySite: Array<{ siteId: string; current: number; target: number }>;
  } {
    const bySite = this.getAllSites().map(site => ({
      siteId: site.siteId,
      current: site.enrollmentCurrent || 0,
      target: site.enrollmentTarget || 0,
    }));

    return {
      total: bySite.reduce((sum, s) => sum + s.current, 0),
      target: bySite.reduce((sum, s) => sum + s.target, 0),
      bySite,
    };
  }

  /**
   * Export site configuration for manifest
   */
  exportSiteInfo(): Record<string, unknown> {
    if (!this.currentSite || !this.currentUser) {
      return { error: 'No site or user selected' };
    }

    return {
      siteId: this.currentSite.siteId,
      siteName: this.currentSite.siteName,
      institution: this.currentSite.institution,
      irb: {
        number: this.currentSite.irb.irbNumber,
        approvalDate: this.currentSite.irb.approvalDate,
        expirationDate: this.currentSite.irb.expirationDate,
      },
      investigator: {
        id: this.currentUser.investigatorId,
        role: this.currentUser.role,
        credentials: this.currentUser.credentials.join(', '),
      },
      timezone: this.currentSite.timezone,
    };
  }
}

// ============================================================================
// SAMPLE CONFIGURATION
// ============================================================================

export const SAMPLE_SITES: SiteConfig[] = [
  {
    siteId: 'BRPLL',
    siteName: 'Brown Radiology Psychology & Law Lab',
    siteType: 'RESEARCH_INSTITUTION',
    institution: 'Brown University',
    department: 'Department of Cognitive, Linguistic & Psychological Sciences',
    address: {
      street: '190 Thayer Street',
      city: 'Providence',
      state: 'RI',
      postalCode: '02912',
      country: 'USA',
    },
    irb: {
      irbNumber: 'STUDY00001234',
      approvalDate: '2025-01-15',
      expirationDate: '2026-01-14',
      protocolTitle: 'AI-Assisted Mammography Reading: Measuring Appropriate Reliance',
    },
    investigators: [
      {
        investigatorId: 'GB001',
        firstName: 'Grayson',
        lastName: 'Baird',
        credentials: ['PhD'],
        email: 'grayson_baird@brown.edu',
        role: 'PRINCIPAL_INVESTIGATOR',
        specialization: 'Radiology Decision Making',
        permissions: ROLE_PERMISSIONS.PRINCIPAL_INVESTIGATOR,
      },
    ],
    timezone: 'America/New_York',
    isActive: true,
    enrollmentTarget: 50,
    enrollmentCurrent: 0,
  },
  {
    siteId: 'DEMO',
    siteName: 'Evidify Demo Site',
    siteType: 'RESEARCH_INSTITUTION',
    institution: 'Evidify Research',
    address: {
      street: '123 Demo Street',
      city: 'Demo City',
      state: 'NY',
      postalCode: '10001',
      country: 'USA',
    },
    irb: {
      irbNumber: 'DEMO-IRB-001',
      approvalDate: '2025-01-01',
      expirationDate: '2026-12-31',
      protocolTitle: 'Evidify Platform Demonstration',
    },
    investigators: [
      {
        investigatorId: 'DEMO001',
        firstName: 'Demo',
        lastName: 'User',
        credentials: ['MD', 'PhD'],
        email: 'demo@evidify.ai',
        role: 'PRINCIPAL_INVESTIGATOR',
        permissions: ROLE_PERMISSIONS.PRINCIPAL_INVESTIGATOR,
      },
    ],
    timezone: 'America/New_York',
    isActive: true,
    enrollmentTarget: 100,
    enrollmentCurrent: 0,
  },
];

export const SAMPLE_STUDY: StudyConfig = {
  studyId: 'BRPLL_RADAI_001',
  studyTitle: 'Measuring Appropriate Reliance on AI in Mammography Screening',
  shortTitle: 'BRPLL RadAI Study',
  protocolVersion: '1.0.0',
  sponsorName: 'Brown University',
  clinicalTrialsGovId: 'NCT00000000',
  primaryEndpoint: 'ADDA (Appropriate Deference to Decision Aid)',
  secondaryEndpoints: [
    'Sensitivity improvement with AI',
    'Specificity change with AI',
    'Reader confidence calibration',
    'Time to decision metrics',
  ],
  sites: SAMPLE_SITES,
  totalEnrollmentTarget: 150,
  studyStartDate: '2025-02-01',
  estimatedEndDate: '2025-12-31',
  dataCoordinatingCenter: 'Brown University CLPS',
};

export default SiteManager;
