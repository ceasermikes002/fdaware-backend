import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ScanService {
  constructor(private readonly http: HttpService) {}

  async analyzeLabel(ocrInput: any) {
    const url = process.env.ML_API_URL;
    console.log('[ScanService] Sending request to ML service:', url, 'with payload:', ocrInput);
    try {
      const { data } = await firstValueFrom(
        this.http.post(url, ocrInput)
      );
      console.log('[ScanService] Received response from ML service:', data);
      return data;
    } catch (err) {
      console.error('[ML Service Error]', err.message, err.response?.data);
      throw new Error('ML analysis failed');
    }
  }
} 