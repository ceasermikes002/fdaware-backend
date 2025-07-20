# Reports Module - Frontend Implementation Guide

## Overview
This document provides complete implementation details for the Reports module frontend, including all API endpoints with full request/response examples.

## Base Configuration

### API Base URL
```
http://localhost:5000/api
```

### Authentication
All endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 1. Get Reports Overview
**Endpoint:** `GET /reports/overview`

**Query Parameters:**
- `workspaceId` (required): The workspace ID

**Request Example:**
```javascript
const response = await fetch('http://localhost:5000/api/reports/overview?workspaceId=workspace-123', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json'
  }
});
```

**Complete Response Body:**
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
    "nextScheduledReport": null
  }
}
```

### 2. Get Reports List
**Endpoint:** `GET /reports`

**Query Parameters:**
- `workspaceId` (required): The workspace ID
- `limit` (optional): Number of reports to return (default: 10)
- `offset` (optional): Number of reports to skip (default: 0)

**Request Example:**
```javascript
const response = await fetch('http://localhost:5000/api/reports?workspaceId=workspace-123&limit=10&offset=0', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json'
  }
});
```

**Complete Response Body:**
```json
{
  "reports": [
    {
      "id": "report-uuid-123",
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
      "downloadUrl": "https://s3-url.com/reports/report-uuid-123.pdf",
      "expiresAt": "2025-01-01T10:30:00Z"
    },
    {
      "id": "report-uuid-456",
      "name": "Q4 2024 Compliance Report",
      "type": "quarterly",
      "dateRange": {
        "start": "2024-10-01T00:00:00Z",
        "end": "2024-12-31T23:59:59Z"
      },
      "generatedAt": "2024-11-30T15:45:00Z",
      "status": "completed",
      "summary": {
        "totalProducts": 15,
        "avgComplianceScore": 82,
        "totalIssues": 18,
        "criticalIssues": 3,
        "resolvedIssues": 12,
        "pendingIssues": 6
      },
      "filters": {
        "productLines": ["protein-powders", "vitamins", "supplements"],
        "includeViolations": true,
        "includeCompliantItems": true,
        "includeRecommendations": true
      },
      "downloadUrl": "https://s3-url.com/reports/report-uuid-456.pdf",
      "expiresAt": "2024-12-30T15:45:00Z"
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

### 3. Generate New Report
**Endpoint:** `POST /reports/generate`

**Request Body:**
```json
{
  "workspaceId": "workspace-123",
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

**Request Example:**
```javascript
const response = await fetch('http://localhost:3000/api/reports/generate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workspaceId: 'workspace-123',
    name: 'Q4 2024 Compliance Report',
    type: 'quarterly',
    dateRange: {
      start: '2024-10-01T00:00:00Z',
      end: '2024-12-31T23:59:59Z'
    },
    filters: {
      productLines: ['protein-powders', 'vitamins', 'supplements'],
      includeViolations: true,
      includeCompliantItems: true,
      includeRecommendations: true,
      includeTrends: true,
      severityLevels: ['high', 'medium', 'low']
    },
    format: 'pdf'
  })
});
```

**Complete Response Body:**
```json
{
  "report": {
    "id": "report-uuid-789",
    "name": "Q4 2024 Compliance Report",
    "type": "quarterly",
    "status": "generating",
    "progress": 0,
    "estimatedCompletion": "2024-12-01T10:35:00Z",
    "downloadUrl": null,
    "expiresAt": null
  }
}
```

### 4. Get Report Details
**Endpoint:** `GET /reports/{reportId}`

**Path Parameters:**
- `reportId` (required): The report ID

**Request Example:**
```javascript
const response = await fetch('http://localhost:3000/api/reports/report-uuid-123', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json'
  }
});
```

**Complete Response Body (Completed Report):**
```json
{
  "report": {
    "id": "report-uuid-123",
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
    "downloadUrl": "https://s3-url.com/reports/report-uuid-123.pdf",
    "expiresAt": "2025-01-01T10:30:00Z"
  }
}
```

**Complete Response Body (Generating Report):**
```json
{
  "report": {
    "id": "report-uuid-789",
    "name": "Q4 2024 Compliance Report",
    "type": "quarterly",
    "status": "generating",
    "generatedAt": "2024-12-01T10:30:00Z",
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
    "progress": 45,
    "estimatedCompletion": "2024-12-01T10:35:00Z",
    "downloadUrl": null,
    "expiresAt": null
  }
}
```

### 5. Download Report
**Endpoint:** `GET /reports/{reportId}/download`

**Path Parameters:**
- `reportId` (required): The report ID

**Query Parameters:**
- `format` (optional): File format - "pdf" or "csv" (default: "pdf")

**Request Example:**
```javascript
const response = await fetch('http://localhost:3000/api/reports/report-uuid-123/download?format=pdf', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json'
  }
});
```

**Complete Response Body (Real Implementation):**
```json
{
  "downloadUrl": "https://fdaware-reports.s3.amazonaws.com/reports/report-uuid-123/report.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20241201%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20241201T103000Z&X-Amz-Expires=3600&X-Amz-SignedHeaders=host&X-Amz-Signature=abc123def456...",
  "fileName": "Q4_2024_Compliance_Report.pdf",
  "expiresIn": 3600,
  "fileSize": "245KB"
}
```

**Real Implementation Notes:**
- **Presigned URLs**: Secure, time-limited download URLs (expires in 1 hour)
- **Actual File Size**: Real file size calculated from generated PDF/CSV
- **S3 Storage**: Files stored in `reports/{reportId}/report.{format}` structure
- **Format Support**: PDF and CSV formats with proper content types

### 6. Delete Report
**Endpoint:** `DELETE /reports/{reportId}`

**Path Parameters:**
- `reportId` (required): The report ID

**Request Example:**
```javascript
const response = await fetch('http://localhost:3000/api/reports/report-uuid-123', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    'Content-Type': 'application/json'
  }
});
```

**Complete Response Body:**
```json
{
  "message": "Report deleted successfully",
  "deletedReportId": "report-uuid-123"
}
```

**Real Implementation Notes:**
- **Database Cleanup**: Report record deleted from database
- **S3 Cleanup**: Associated file deleted from S3 bucket
- **Error Handling**: S3 deletion errors logged but don't fail the operation
- **Confirmation**: Returns success message with deleted report ID

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Report not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

## Frontend Implementation Examples

### React Hook for Reports Overview
```javascript
import { useState, useEffect } from 'react';

const useReportsOverview = (workspaceId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const response = await fetch(`/api/reports/overview?workspaceId=${workspaceId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch overview');
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId) {
      fetchOverview();
    }
  }, [workspaceId]);

  return { data, loading, error };
};
```

### React Hook for Report Generation
```javascript
import { useState } from 'react';

const useReportGeneration = () => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const generateReport = async (reportData) => {
    setGenerating(true);
    setError(null);
    
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }
      
      const result = await response.json();
      return result.report;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  return { generateReport, generating, error };
};
```

### Report Status Polling
```javascript
const pollReportStatus = async (reportId) => {
  const poll = async () => {
    const response = await fetch(`/api/reports/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    const { report } = await response.json();
    
    if (report.status === 'completed') {
      return report;
    } else if (report.status === 'failed') {
      throw new Error('Report generation failed');
    }
    
    // Continue polling
    setTimeout(poll, 2000);
  };
  
  return poll();
};
```

### React Hook for Report Download
```javascript
import { useState } from 'react';

const useReportDownload = () => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState(null);

  const downloadReport = async (reportId, format = 'pdf') => {
    setDownloading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/reports/${reportId}/download?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get download URL');
      }
      
      const { downloadUrl, fileName, expiresIn } = await response.json();
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { downloadUrl, fileName, expiresIn };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setDownloading(false);
    }
  };

  return { downloadReport, downloading, error };
};
```

### React Hook for Report Deletion
```javascript
import { useState } from 'react';

const useReportDeletion = () => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const deleteReport = async (reportId) => {
    setDeleting(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete report');
      }
      
      const result = await response.json();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setDeleting(false);
    }
  };

  return { deleteReport, deleting, error };
};
```

## UI Components Structure

### Reports Dashboard
```jsx
const ReportsDashboard = ({ workspaceId }) => {
  const { data, loading, error } = useReportsOverview(workspaceId);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div className="reports-dashboard">
      <h1>Compliance Reports</h1>
      
      {/* Compliance Metrics Cards */}
      <div className="metrics-grid">
        <MetricCard 
          title="Total Products" 
          value={data.complianceMetrics.totalProducts} 
        />
        <MetricCard 
          title="Compliant Products" 
          value={data.complianceMetrics.compliantProducts} 
        />
        <MetricCard 
          title="Average Score" 
          value={`${data.complianceMetrics.avgComplianceScore}%`} 
        />
        <MetricCard 
          title="Critical Issues" 
          value={data.complianceMetrics.criticalIssues} 
          variant="danger"
        />
      </div>
      
      {/* Recent Activity */}
      <div className="recent-activity">
        <h2>Recent Activity</h2>
        <p>Reports Generated: {data.recentActivity.reportsGenerated}</p>
        {data.recentActivity.lastReportDate && (
          <p>Last Report: {new Date(data.recentActivity.lastReportDate).toLocaleDateString()}</p>
        )}
      </div>
    </div>
  );
};
```

### Report Download Component
```jsx
const ReportDownloadButton = ({ reportId, reportName, format = 'pdf' }) => {
  const { downloadReport, downloading, error } = useReportDownload();

  const handleDownload = async () => {
    try {
      await downloadReport(reportId, format);
      // Show success message
      toast.success('Report downloaded successfully!');
    } catch (err) {
      toast.error('Failed to download report');
    }
  };

  return (
    <div className="download-section">
      <button 
        onClick={handleDownload}
        disabled={downloading}
        className="download-button"
      >
        {downloading ? 'Downloading...' : `Download ${format.toUpperCase()}`}
      </button>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="download-info">
        <small>File will be downloaded as: {reportName.replace(/[^a-zA-Z0-9]/g, '_')}.{format}</small>
        <small>Download link expires in 1 hour</small>
      </div>
    </div>
  );
};
```

### Report Deletion Component
```jsx
const ReportDeleteButton = ({ reportId, reportName, onDelete }) => {
  const { deleteReport, deleting, error } = useReportDeletion();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteReport(reportId);
      setShowConfirm(false);
      onDelete(reportId); // Update parent component
      toast.success('Report deleted successfully!');
    } catch (err) {
      toast.error('Failed to delete report');
    }
  };

  return (
    <div className="delete-section">
      {!showConfirm ? (
        <button 
          onClick={() => setShowConfirm(true)}
          className="delete-button"
          variant="danger"
        >
          Delete Report
        </button>
      ) : (
        <div className="confirm-delete">
          <p>Are you sure you want to delete "{reportName}"?</p>
          <p><small>This action cannot be undone.</small></p>
          
          <div className="confirm-actions">
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="confirm-button"
              variant="danger"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete'}
            </button>
            
            <button 
              onClick={() => setShowConfirm(false)}
              className="cancel-button"
              variant="secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};
```

### Report Generation Modal
```jsx
const ReportGenerationModal = ({ isOpen, onClose, workspaceId }) => {
  const { generateReport, generating, error } = useReportGeneration();
  const [formData, setFormData] = useState({
    name: '',
    type: 'monthly',
    dateRange: null,
    filters: {
      includeViolations: true,
      includeCompliantItems: true,
      includeRecommendations: true
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const report = await generateReport({
        ...formData,
        workspaceId
      });
      
      // Redirect to report details or show success message
      onClose();
    } catch (err) {
      // Handle error
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <h2>Generate New Report</h2>
        
        <div className="form-group">
          <label>Report Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Report Type</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Include Violations</label>
          <input
            type="checkbox"
            checked={formData.filters.includeViolations}
            onChange={(e) => setFormData({
              ...formData, 
              filters: {...formData.filters, includeViolations: e.target.checked}
            })}
          />
        </div>
        
        <button type="submit" disabled={generating}>
          {generating ? 'Generating...' : 'Generate Report'}
        </button>
        
        {error && <div className="error">{error}</div>}
      </form>
    </Modal>
  );
};
```

## Data Types

### Report Status Types
```typescript
type ReportStatus = 'generating' | 'completed' | 'failed';
```

### Report Type Types
```typescript
type ReportType = 'monthly' | 'quarterly' | 'custom';
```

### Violation Severity Types
```typescript
type ViolationSeverity = 'critical' | 'high' | 'medium' | 'low';
```

### Download Format Types
```typescript
type DownloadFormat = 'pdf' | 'csv';
```

This implementation guide provides complete examples for integrating the Reports module into your frontend application, including all API endpoints with full request/response bodies and practical React components. 