export class ReportEntity {
  id: string;
  name: string;
  type: string; // monthly, quarterly, custom
  status: string; // generating, completed, failed
  workspaceId: string;
  generatedAt: Date;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters: {
    productLines?: string[];
    includeViolations?: boolean;
    includeCompliantItems?: boolean;
    includeRecommendations?: boolean;
    includeTrends?: boolean;
    severityLevels?: string[];
  };
  summary?: {
    totalProducts: number;
    avgComplianceScore: number;
    totalIssues: number;
    criticalIssues: number;
    resolvedIssues: number;
    pendingIssues: number;
    complianceRate: number;
  };
  downloadUrl?: string;
  expiresAt?: Date;
  progress: number;
  estimatedCompletion?: Date;
} 