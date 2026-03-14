/**
 * Status enums for the incident service
 * Following DDD principles by centralizing domain status values
 */

export enum ReportStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
}

export enum TaskStatus {
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum JoinRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum ResultStatus {
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum MediaFileStage {
  BEFORE = "BEFORE",
  AFTER = "AFTER",
}

/**
 * Utility functions for status validation
 */
export class StatusValidator {
  static isValidReportStatus(status: string): boolean {
    return Object.values(ReportStatus).includes(status as ReportStatus);
  }

  static isValidTaskStatus(status: string): boolean {
    return Object.values(TaskStatus).includes(status as TaskStatus);
  }

  static isValidJoinRequestStatus(status: string): boolean {
    return Object.values(JoinRequestStatus).includes(
      status as JoinRequestStatus,
    );
  }

  static isValidResultStatus(status: string): boolean {
    return Object.values(ResultStatus).includes(status as ResultStatus);
  }
}

/**
 * Type aliases for better type safety
 */
export type ReportStatusType = `${ReportStatus}`;
export type TaskStatusType = `${TaskStatus}`;
export type JoinRequestStatusType = `${JoinRequestStatus}`;
export type ResultStatusType = `${ResultStatus}`;
export type MediaFileStageType = `${MediaFileStage}`;
