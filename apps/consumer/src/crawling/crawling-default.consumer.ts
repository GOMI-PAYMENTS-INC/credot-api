import { QUEUE_NAME } from '@app/utils/queue';

import {
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueProgress,
  OnQueueRemoved,
  OnQueueStalled,
  OnQueueWaiting,
  Processor,
} from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor(QUEUE_NAME.CRAWLING)
export class CrawlingDefaultConsumer {
  private readonly logger = new Logger(CrawlingDefaultConsumer.name);

  @OnQueueWaiting()
  onWaiting(job: Job) {
    this.logger.log(`>>>> Crawling Job Waiting ${job.data?.requestId}`);
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`>>>> Crawling Job Active ${job.data?.requestId}`);
  }

  @OnQueueProgress()
  onProgress(job: Job) {
    this.logger.log(`>>>> Crawling Job Progress ${job.data?.requestId}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(`>>>> Crawling Job Completed ${job.data?.requestId}`);
  }

  @OnQueueFailed()
  onFailed(job: Job) {
    this.logger.error(JSON.stringify(job));
    this.logger.error(`>>>> Crawling Job Failed ${job.data?.requestId}`);
  }

  @OnQueueRemoved()
  onRemoved(job: Job) {
    this.logger.log(`>>>> Crawling Job Removed ${job.data?.requestId}`);
  }

  @OnQueueStalled()
  onStalled(job: Job) {
    this.logger.log(`>>>> Crawling Job Stalled ${job.data?.requestId}`);
  }
}
