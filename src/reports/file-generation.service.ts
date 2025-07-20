import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';

@Injectable()
export class FileGenerationService {
  
  async generatePDFReport(reportData: any, reportId: string): Promise<string> {
    const doc = new PDFDocument();
    const fileName = `report-${reportId}.pdf`;
    const filePath = path.join(process.cwd(), 'temp', fileName);
    
    // Ensure temp directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
    }
    
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    
    // Add title
    doc.fontSize(24).text('FDA Compliance Report', { align: 'center' });
    doc.moveDown();
    
    // Add report details
    doc.fontSize(16).text(`Report: ${reportData.name}`);
    doc.fontSize(12).text(`Generated: ${new Date(reportData.generatedAt).toLocaleDateString()}`);
    doc.fontSize(12).text(`Type: ${reportData.type}`);
    doc.moveDown();
    
    // Add summary metrics
    if (reportData.summary) {
      doc.fontSize(14).text('Summary Metrics');
      doc.fontSize(10).text(`Total Products: ${reportData.summary.totalProducts}`);
      doc.fontSize(10).text(`Average Compliance Score: ${reportData.summary.avgComplianceScore}%`);
      doc.fontSize(10).text(`Total Issues: ${reportData.summary.totalIssues}`);
      doc.fontSize(10).text(`Critical Issues: ${reportData.summary.criticalIssues}`);
      doc.fontSize(10).text(`Resolved Issues: ${reportData.summary.resolvedIssues}`);
      doc.fontSize(10).text(`Pending Issues: ${reportData.summary.pendingIssues}`);
      doc.moveDown();
    }
    
    // Add top violations
    if (reportData.topViolations && reportData.topViolations.length > 0) {
      doc.fontSize(14).text('Top Violations');
      reportData.topViolations.forEach((violation: any, index: number) => {
        doc.fontSize(10).text(`${index + 1}. ${violation.type} (${violation.count} occurrences)`);
        doc.fontSize(8).text(`   Severity: ${violation.severity}, Category: ${violation.category}`);
      });
      doc.moveDown();
    }
    
    // Add recommendations
    if (reportData.recommendations && reportData.recommendations.length > 0) {
      doc.fontSize(14).text('Recommendations');
      reportData.recommendations.forEach((rec: any, index: number) => {
        doc.fontSize(10).text(`${index + 1}. ${rec.action}`);
        doc.fontSize(8).text(`   Priority: ${rec.priority}, Impact: ${rec.impact}, Effort: ${rec.effort}`);
      });
    }
    
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        resolve(filePath);
      });
      stream.on('error', reject);
    });
  }
  
  async generateCSVReport(reportData: any, reportId: string): Promise<string> {
    const fileName = `report-${reportId}.csv`;
    const filePath = path.join(process.cwd(), 'temp', fileName);
    
    // Ensure temp directory exists
    if (!fs.existsSync(path.join(process.cwd(), 'temp'))) {
      fs.mkdirSync(path.join(process.cwd(), 'temp'), { recursive: true });
    }
    
    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'metric', title: 'Metric' },
        { id: 'value', title: 'Value' },
        { id: 'description', title: 'Description' }
      ]
    });
    
    // Prepare CSV data
    const csvData = [
      { metric: 'Report Name', value: reportData.name, description: 'Name of the generated report' },
      { metric: 'Report Type', value: reportData.type, description: 'Type of report (monthly/quarterly/custom)' },
      { metric: 'Generated Date', value: new Date(reportData.generatedAt).toLocaleDateString(), description: 'Date when report was generated' },
      { metric: 'Total Products', value: reportData.summary?.totalProducts || 0, description: 'Total number of products analyzed' },
      { metric: 'Average Compliance Score', value: `${reportData.summary?.avgComplianceScore || 0}%`, description: 'Average compliance score across all products' },
      { metric: 'Total Issues', value: reportData.summary?.totalIssues || 0, description: 'Total number of compliance issues found' },
      { metric: 'Critical Issues', value: reportData.summary?.criticalIssues || 0, description: 'Number of critical compliance issues' },
      { metric: 'Resolved Issues', value: reportData.summary?.resolvedIssues || 0, description: 'Number of resolved issues' },
      { metric: 'Pending Issues', value: reportData.summary?.pendingIssues || 0, description: 'Number of pending issues' },
      { metric: 'Compliance Rate', value: `${reportData.summary?.complianceRate || 0}%`, description: 'Overall compliance rate' }
    ];
    
    // Add violations if available
    if (reportData.topViolations) {
      reportData.topViolations.forEach((violation: any, index: number) => {
        csvData.push({
          metric: `Violation ${index + 1}`,
          value: violation.type,
          description: `${violation.count} occurrences - ${violation.severity} severity - ${violation.category} category`
        });
      });
    }
    
    // Add recommendations if available
    if (reportData.recommendations) {
      reportData.recommendations.forEach((rec: any, index: number) => {
        csvData.push({
          metric: `Recommendation ${index + 1}`,
          value: rec.action,
          description: `Priority: ${rec.priority}, Impact: ${rec.impact}, Effort: ${rec.effort}`
        });
      });
    }
    
    await csvWriter.writeRecords(csvData);
    return filePath;
  }
  
  async deleteFile(filePath: string): Promise<void> {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  
  getFileSize(filePath: string): number {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return stats.size;
    }
    return 0;
  }
} 