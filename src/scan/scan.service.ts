import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ScanService {
  constructor(private readonly http: HttpService) {}

  async analyzeLabel(ocrInput: any) {
    const url = process.env.ML_API_URL;
    console.log('[ScanService] Sending request to ML service:', url, 'with payload:', ocrInput);
    
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const { data } = await firstValueFrom(
          this.http.post(url, ocrInput)
        );
        console.log('[ScanService] Received response from ML service:', data);
        return data;
      } catch (err) {
        attempt++;
        const status = err.response?.status;
        const statusText = err.response?.statusText;
        
        console.error(`[ScanService] Attempt ${attempt}/${maxRetries} failed. Status: ${status} ${statusText}. Message: ${err.message}`);

        // Retry on network errors or server errors (5xx) or rate limits (429)
        const isRetryable = !status || status >= 500 || status === 429 || status === 408;
        
        if (attempt >= maxRetries || !isRetryable) {
          console.error('[ML Service Error] Final failure details:', {
            status,
            statusText,
            data: err.response?.data,
            headers: err.response?.headers
          });
          throw new Error(`ML analysis failed: ${err.message}`);
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = 1000 * Math.pow(2, attempt - 1);
        console.log(`[ScanService] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
} 