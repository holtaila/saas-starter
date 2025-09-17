import { getServiceSupabase } from '@/lib/supabase/utils';
import { getBatchCallsByRetellId, updateBatchCallByRetellId } from '@/lib/db/queries/batch-calls';

export interface BatchCallProgress {
  batchCallId: string;
  retellBatchCallId: string;
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  successRate: number;
  estimatedTimeRemaining?: number;
  lastUpdated: string;
}

export class SimpleBatchManager {
  private static instance: SimpleBatchManager;
  private progressCache = new Map<string, BatchCallProgress>();
  private updateInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): SimpleBatchManager {
    if (!SimpleBatchManager.instance) {
      SimpleBatchManager.instance = new SimpleBatchManager();
    }
    return SimpleBatchManager.instance;
  }

  async updateBatchProgress(retellBatchCallId: string): Promise<BatchCallProgress | null> {
    try {
      const supabase = getServiceSupabase();

      // Get batch call record
      const batchCall = await getBatchCallsByRetellId(retellBatchCallId);
      if (!batchCall) {
        console.error('Batch call not found:', retellBatchCallId);
        return null;
      }

      // Get call statistics for this batch
      const { data: callStats, error: statsError } = await supabase
        .from('calls')
        .select('status')
        .eq('retell_batch_call_id', retellBatchCallId);

      if (statsError) {
        console.error('Error fetching call stats:', statsError);
        return null;
      }

      // Calculate progress
      const totalTasks = batchCall.total_task_count || 0;
      const completedTasks = callStats?.filter(call => call.status === 'completed').length || 0;
      const failedTasks = callStats?.filter(call => call.status === 'failed').length || 0;
      const processedTasks = completedTasks + failedTasks;
      const successRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Determine batch status
      let batchStatus = batchCall.status;
      if (processedTasks === totalTasks && totalTasks > 0) {
        batchStatus = 'completed';
      } else if (processedTasks > 0 && batchCall.status === 'scheduled') {
        batchStatus = 'processing';
      }

      // Update batch call status if needed
      if (batchStatus !== batchCall.status) {
        await updateBatchCallByRetellId(retellBatchCallId, { status: batchStatus });
      }

      const progress: BatchCallProgress = {
        batchCallId: batchCall.id,
        retellBatchCallId,
        status: batchStatus,
        totalTasks,
        completedTasks,
        failedTasks,
        successRate,
        lastUpdated: new Date().toISOString(),
      };

      // Calculate estimated time remaining
      if (batchStatus === 'processing' && completedTasks > 0) {
        const elapsedTime = Date.now() - new Date(batchCall.created_at).getTime();
        const averageTimePerTask = elapsedTime / processedTasks;
        const remainingTasks = totalTasks - processedTasks;
        progress.estimatedTimeRemaining = Math.round(averageTimePerTask * remainingTasks / 1000); // in seconds
      }

      // Cache the progress
      this.progressCache.set(retellBatchCallId, progress);

      return progress;

    } catch (error) {
      console.error('Error updating batch progress:', error);
      return null;
    }
  }

  async getBatchProgress(retellBatchCallId: string): Promise<BatchCallProgress | null> {
    // Try cache first
    const cached = this.progressCache.get(retellBatchCallId);
    if (cached) {
      // Update if older than 30 seconds
      const age = Date.now() - new Date(cached.lastUpdated).getTime();
      if (age < 30000) { // 30 seconds
        return cached;
      }
    }

    // Fetch fresh data
    return await this.updateBatchProgress(retellBatchCallId);
  }

  async getAllActiveBatchProgress(organizationId: string): Promise<BatchCallProgress[]> {
    try {
      const supabase = getServiceSupabase();

      // Get all active batches for organization
      const { data: activeBatches, error } = await supabase
        .from('batch_calls')
        .select('retell_batch_call_id')
        .eq('organization_id', organizationId)
        .in('status', ['scheduled', 'processing']);

      if (error) {
        console.error('Error fetching active batches:', error);
        return [];
      }

      // Update progress for each batch
      const progressPromises = activeBatches.map(batch => 
        this.updateBatchProgress(batch.retell_batch_call_id)
      );

      const results = await Promise.allSettled(progressPromises);
      return results
        .filter((result): result is PromiseFulfilledResult<BatchCallProgress> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

    } catch (error) {
      console.error('Error fetching all batch progress:', error);
      return [];
    }
  }

  startPeriodicUpdates(organizationId: string, intervalMs = 30000) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      try {
        await this.getAllActiveBatchProgress(organizationId);
      } catch (error) {
        console.error('Error in periodic batch update:', error);
      }
    }, intervalMs);
  }

  stopPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  clearCache() {
    this.progressCache.clear();
  }

  getCachedProgress(): Map<string, BatchCallProgress> {
    return new Map(this.progressCache);
  }
}

// Error handling utilities for batch operations
export class BatchCallError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'BatchCallError';
  }
}

export function handleBatchCallError(error: unknown): BatchCallError {
  if (error instanceof BatchCallError) {
    return error;
  }

  if (error instanceof Error) {
    // Map known error patterns
    if (error.message.includes('timeout')) {
      return new BatchCallError(
        'Request timeout - please try again',
        'TIMEOUT_ERROR',
        { originalError: error.message }
      );
    }

    if (error.message.includes('rate limit')) {
      return new BatchCallError(
        'Rate limit exceeded - please wait before retrying',
        'RATE_LIMIT_ERROR',
        { originalError: error.message }
      );
    }

    if (error.message.includes('phone number')) {
      return new BatchCallError(
        'Phone number configuration error',
        'PHONE_NUMBER_ERROR',
        { originalError: error.message }
      );
    }

    if (error.message.includes('agent')) {
      return new BatchCallError(
        'Agent configuration error',
        'AGENT_ERROR',
        { originalError: error.message }
      );
    }

    return new BatchCallError(
      'An unexpected error occurred',
      'UNKNOWN_ERROR',
      { originalError: error.message }
    );
  }

  return new BatchCallError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    { originalError: String(error) }
  );
}

// Validation utilities
export function validateBatchCallRequest(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.campaign_id) {
    errors.push('Campaign ID is required');
  }

  if (!data.agent_id) {
    errors.push('Agent ID is required');
  }

  if (!data.phone_number_id) {
    errors.push('Phone number ID is required');
  }

  if (!data.csv_content || typeof data.csv_content !== 'string') {
    errors.push('CSV content is required and must be a string');
  }

  if (!data.batch_name || typeof data.batch_name !== 'string') {
    errors.push('Batch name is required and must be a string');
  }

  if (data.concurrent_calls !== undefined) {
    const concurrency = Number(data.concurrent_calls);
    if (isNaN(concurrency) || concurrency < 1 || concurrency > 19) {
      errors.push('Concurrent calls must be a number between 1 and 19');
    }
  }

  if (data.scheduled_timestamp !== undefined) {
    const timestamp = new Date(data.scheduled_timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push('Scheduled timestamp must be a valid date');
    } else if (timestamp < new Date()) {
      errors.push('Scheduled timestamp must be in the future');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default SimpleBatchManager;