# FDAware Reports Module Documentation

## Overview
The Reports module provides comprehensive FDA compliance reporting and analytics for the FDAware platform. It enables users to generate, view, and export detailed compliance reports across their product portfolio, track compliance trends over time, and identify areas requiring attention.

## Purpose & Functionality

### Primary Features:
1. **Compliance Dashboard** - Real-time overview of compliance metrics
2. **Report Generation** - Create custom reports for different time periods and product lines
3. **Trend Analysis** - Track compliance improvements over time
4. **Export Capabilities** - Download reports in PDF and CSV formats
5. **Issue Tracking** - Monitor critical, resolved, and pending compliance issues

### Use Cases:
- **Regulatory Audits** - Generate compliance reports for FDA inspections
- **Management Reporting** - Provide executives with compliance overview
- **Product Line Analysis** - Assess compliance across specific product categories
- **Historical Tracking** - Monitor compliance improvements over time
- **Issue Resolution** - Track progress on addressing compliance violations

## Frontend Components

### 1. Reports Dashboard (`/reports`)
- **Compliance Metrics Cards**: Average score, critical issues, compliant products
- **Recent Reports List**: View and download previously generated reports
- **Trend Analysis**: Visual representation of compliance improvements
- **Export Options**: PDF and CSV download capabilities

### 2. Report Generation Modal
- **Date Range Selection**: Custom time periods for reports
- **Product Line Filtering**: Generate reports for specific product categories
- **Report Type Selection**: Monthly, quarterly, or custom reports
- **Include Options**: Violations, compliant items, recommendations

## Backend API Endpoints

### 1. Get Reports Overview
- **GET** `/reports/overview?workspaceId={workspaceId}`
- **Purpose**: Fetch compliance metrics and summary data
- **Authentication**: JWT required

### 2. Get Recent Reports
- **GET** `/reports?workspaceId={workspaceId}&limit={limit}&offset={offset}`
- **Purpose**: Fetch list of generated reports
- **Authentication**: JWT required

### 3. Generate New Report
- **POST** `/reports/generate`
- **Purpose**: Create a new compliance report
- **Authentication**: JWT required

### 4. Download Report
- **GET** `/reports/{reportId}/download?format={pdf|csv}`
- **Purpose**: Download generated report in specified format
- **Authentication**: JWT required

### 5. Get Report Details
- **GET** `/reports/{reportId}`
- **Purpose**: Fetch detailed report data
- **Authentication**: JWT required

## Expected Backend Data Structures

### 1. Reports Overview Response
```json
{
  "complianceMetrics": {
    "totalProducts": 24,
    "compliantProducts": 17,
    "avgComplianceScore": 79,
    "criticalIssues": 3,
    "resolvedIssues": 28,
    "pendingIssues": 7,
    "trends": {
      "scoreChange": 5,
      "issuesResolved": 12,
      "newIssues": 3,
      "period": "month"
    }
  },
  "recentActivity": {
    "reportsGenerated": 8,
    "lastReportDate": "2024-12-01T10:30:00Z",
    "nextScheduledReport": "2024-12-15T09:00:00Z"
  }
}
```

### 2. Reports List Response
```json
{
  "reports": [
    {
      "id": "uuid",
      "name": "Monthly Compliance Report - December 2024",
      "type": "monthly",
      "dateRange": {
        "start": "2024-12-01T00:00:00Z",
        "end": "2024-12-31T23:59:59Z"
      },
      "generatedAt": "2024-12-01T10:30:00Z",
      "status": "completed",
      "summary": {
        "totalProducts": 8,
        "avgComplianceScore": 78,
        "totalIssues": 12,
        "criticalIssues": 2,
        "resolvedIssues": 8,
        "pendingIssues": 4
      },
      "filters": {
        "productLines": ["protein-powders", "vitamins"],
        "includeViolations": true,
        "includeCompliantItems": true,
        "includeRecommendations": true
      },
      "downloadUrl": "https://s3-url.com/reports/report-uuid.pdf",
      "expiresAt": "2025-01-01T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

### 3. Generate Report Request
```json
{
  "workspaceId": "uuid",
  "name": "Q4 2024 Compliance Report",
  "type": "quarterly",
  "dateRange": {
    "start": "2024-10-01T00:00:00Z",
    "end": "2024-12-31T23:59:59Z"
  },
  "filters": {
    "productLines": ["protein-powders", "vitamins", "supplements"],
    "includeViolations": true,
    "includeCompliantItems": true,
    "includeRecommendations": true,
    "includeTrends": true,
    "severityLevels": ["high", "medium", "low"]
  },
  "format": "pdf"
}
```

### 4. Generate Report Response
```json
{
  "report": {
    "id": "uuid",
    "name": "Q4 2024 Compliance Report",
    "type": "quarterly",
    "status": "generating",
    "progress": 45,
    "estimatedCompletion": "2024-12-01T10:35:00Z",
    "downloadUrl": null,
    "expiresAt": null
  }
}
```

### 5. Report Details Response
```json
{
  "report": {
    "id": "uuid",
    "name": "Q4 2024 Compliance Report",
    "type": "quarterly",
    "status": "completed",
    "generatedAt": "2024-12-01T10:30:00Z",
    "dateRange": {
      "start": "2024-10-01T00:00:00Z",
      "end": "2024-12-31T23:59:59Z"
    },
    "summary": {
      "totalProducts": 15,
      "avgComplianceScore": 82,
      "totalIssues": 18,
      "criticalIssues": 3,
      "resolvedIssues": 12,
      "pendingIssues": 6,
      "complianceRate": 73.3
    },
    "productLines": [
      {
        "name": "Protein Powders",
        "products": 5,
        "avgScore": 85,
        "issues": 6,
        "criticalIssues": 1
      },
      {
        "name": "Vitamins",
        "products": 7,
        "avgScore": 78,
        "issues": 8,
        "criticalIssues": 2
      },
      {
        "name": "Supplements",
        "products": 3,
        "avgScore": 88,
        "issues": 4,
        "criticalIssues": 0
      }
    ],
    "trends": {
      "scoreChange": 5,
      "issuesResolved": 15,
      "newIssues": 8,
      "complianceImprovement": 12.5
    },
    "topViolations": [
      {
        "type": "Disclaimer Placement",
        "count": 8,
        "severity": "medium",
        "category": "Layout"
      },
      {
        "type": "Font Size Issue",
        "count": 5,
        "severity": "high",
        "category": "Typography"
      },
      {
        "type": "Missing Allergen Info",
        "count": 3,
        "severity": "critical",
        "category": "Safety"
      }
    ],
    "recommendations": [
      {
        "priority": "high",
        "action": "Standardize disclaimer placement across all labels",
        "impact": "Will resolve 8 medium-severity violations",
        "effort": "medium"
      },
      {
        "priority": "critical",
        "action": "Add missing allergen information to 3 products",
        "impact": "Will resolve 3 critical violations",
        "effort": "low"
      }
    ],
    "downloadUrl": "https://s3-url.com/reports/report-uuid.pdf",
    "expiresAt": "2025-01-01T10:30:00Z"
  }
}
```

### 6. Download Report Response
```json
{
  "downloadUrl": "https://s3-url.com/reports/report-uuid.pdf?X-Amz-Algorithm=...",
  "fileName": "Q4_2024_Compliance_Report.pdf",
  "expiresIn": 3600,
  "fileSize": "2.4MB"
}
```

## Report Types

### 1. Monthly Reports
- **Purpose**: Monthly compliance overview
- **Data**: All labels analyzed in the month
- **Metrics**: Average score, issues, trends
- **Use Case**: Regular compliance monitoring

### 2. Quarterly Reports
- **Purpose**: Quarterly compliance audit
- **Data**: All labels analyzed in the quarter
- **Metrics**: Detailed analysis, trends, recommendations
- **Use Case**: Management reporting, FDA audits

### 3. Product Line Reports
- **Purpose**: Analyze specific product categories
- **Data**: Labels filtered by product line
- **Metrics**: Category-specific compliance scores
- **Use Case**: Product development, marketing compliance

### 4. Custom Reports
- **Purpose**: Flexible date range and filter reports
- **Data**: User-defined parameters
- **Metrics**: Custom metrics based on filters
- **Use Case**: Special investigations, compliance reviews

## Implementation Notes

### Frontend Requirements:
1. **Real-time Updates**: Show report generation progress
2. **Download Management**: Handle secure file downloads
3. **Filter UI**: Date picker, product line selector, options
4. **Progress Indicators**: Show generation status and progress
5. **Export Options**: PDF and CSV download buttons

### Backend Requirements:
1. **Report Generation**: Async processing for large reports
2. **File Storage**: Secure S3 storage for generated reports
3. **Data Aggregation**: Efficient querying of label analysis data
4. **Caching**: Cache frequently accessed report data
5. **Security**: JWT authentication and workspace isolation

### Performance Considerations:
1. **Pagination**: Handle large report lists
2. **Async Processing**: Generate reports in background
3. **Caching**: Cache overview metrics (not required for MVP)
4. **File Expiry**: Automatic cleanup of old reports
5. **Rate Limiting**: Prevent abuse of report generation

## Security & Compliance

### Data Protection:
- All reports contain sensitive compliance data
- Implement proper access controls
- Secure file storage and transmission
- Audit logging for report access

### FDA Compliance:
- Reports must be accurate and complete
- Maintain audit trails for report generation
- Ensure data integrity and consistency
- Support regulatory requirements

This documentation provides a comprehensive foundation for implementing the Reports feature in FDAware. 