import { Injectable } from '@nestjs/common';
import { LabelService } from '../labels/label.service';
import { ScanService } from '../scan/scan.service';

@Injectable()
export class DemoService {
  constructor(
    private readonly labelService: LabelService,
    private readonly scanService: ScanService,
  ) {}

  async handleDemoScan(file: Express.Multer.File) {
    // 1. Save label as demo (isDemo: true)
    const { scanResult } = await this.labelService.createDemoLabel(file);

    // Use scanResult directly (no need to call analyzeLabel again)
    return {
      partial: true,
      violations: scanResult.violations || [],
      message: `Sign up to view the full FDA audit report and unlock all features.`,
      analysis: scanResult.analysis ? {
        overallScore: scanResult.analysis.overallScore,
        compliantItems: scanResult.analysis.compliantItems,
        nextSteps: scanResult.analysis.nextSteps,
      } : undefined,
      ocr: scanResult.ocr || {},
      totalViolations: (scanResult.violations || []).length, // optional
    };
  }
} 