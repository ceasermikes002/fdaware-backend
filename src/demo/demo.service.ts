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
    const normalizeNextSteps = (steps: any): string[] => {
      const out: string[] = [];
      if (!steps) return out;
      const arr = Array.isArray(steps) ? steps : [steps];
      for (const s of arr) {
        if (typeof s === 'string') {
          out.push(s);
        } else if (s && typeof s === 'object') {
          const text =
            (s.title && s.detail ? `${s.title}: ${s.detail}` : null) ||
            s.title ||
            s.message ||
            s.suggestion ||
            s.action ||
            s.detail ||
            undefined;
          out.push(text ?? JSON.stringify(s));
        }
      }
      return out;
    };

    const nextSteps = normalizeNextSteps(scanResult?.analysis?.nextSteps).slice(0, 6);

    return {
      partial: true,
      violations: scanResult.violations || [],
      message: `Sign up to view the full FDA audit report and unlock all features.`,
      analysis: scanResult.analysis ? {
        overallScore: scanResult.analysis.overallScore,
        compliantItems: scanResult.analysis.compliantItems,
        nextSteps,
      } : undefined,
      ocr: scanResult.ocr || {},
      totalViolations: (scanResult.violations || []).length, // optional
    };
  }
} 
