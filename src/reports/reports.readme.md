# Reports Module

The Reports module provides comprehensive FDA compliance reporting and analytics for the FDAware platform. It aggregates data from the labels analysis to generate detailed compliance reports.

## Features

- **Compliance Dashboard** - Real-time overview of compliance metrics
- **Report Generation** - Create custom reports for different time periods
- **Trend Analysis** - Track compliance improvements over time
- **Export Capabilities** - Download reports in PDF and CSV formats
- **Issue Tracking** - Monitor critical, resolved, and pending compliance issues

## API Endpoints

### 1. Get Reports Overview
```
GET /reports/overview?workspaceId={workspaceId}
```
Returns compliance metrics and summary data for a workspace.

### 2. Get Recent Reports
```
GET /reports?workspaceId={workspaceId}&limit={limit}&offset={offset}
```
Returns a paginated list of generated reports.

### 3. Generate New Report
```
POST /reports/generate
```
Creates a new compliance report with specified filters and date range.

### 4. Get Report Details
```
GET /reports/{reportId}
```
Returns detailed information about a specific report.

### 5. Download Report
```
GET /reports/{reportId}/download?format={pdf|csv}
```
Downloads a generated report in the specified format.

## Data Flow

1. **Data Aggregation**: The service pulls analysis data from the labels module
2. **Metrics Calculation**: Calculates compliance scores, violation counts, and trends
3. **Report Generation**: Creates comprehensive reports with recommendations
4. **File Storage**: Stores generated reports in S3 (mock implementation)
5. **Download Management**: Provides secure download URLs for reports

## Report Types

- **Monthly Reports**: Monthly compliance overview
- **Quarterly Reports**: Quarterly compliance audit
- **Custom Reports**: Flexible date range and filter reports

## Implementation Notes

- No ML required - purely data aggregation and presentation
- Uses existing labels and violations data
- Async report generation for large datasets
- Secure file storage and download management
- JWT authentication required for all endpoints

## Dependencies

- `PrismaService` - Database operations
- `LabelService` - Access to label analysis data
- `AuthGuard` - Authentication protection 