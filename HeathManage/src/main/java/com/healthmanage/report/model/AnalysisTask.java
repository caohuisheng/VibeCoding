package com.healthmanage.report.model;

import java.time.Instant;

/** 分析任务实体：记录用户、文件信息、状态与结果。 */
public class AnalysisTask {

    private final String id;
    private final String userId;
    private final String fileKey;
    private final String fileName;
    private final Instant createdAt;

    private volatile TaskStatus status;
    private volatile String report;
    private volatile String error;
    private volatile Instant updatedAt;

    public AnalysisTask(String id, String userId, String fileKey, String fileName) {
        this.id = id;
        this.userId = userId;
        this.fileKey = fileKey;
        this.fileName = fileName;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
        this.status = TaskStatus.PENDING;
    }

    public String getId() {
        return id;
    }

    public String getUserId() {
        return userId;
    }

    public String getFileKey() {
        return fileKey;
    }

    public String getFileName() {
        return fileName;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public TaskStatus getStatus() {
        return status;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }

    public String getReport() {
        return report;
    }

    public void setReport(String report) {
        this.report = report;
    }

    public String getError() {
        return error;
    }

    public void setError(String error) {
        this.error = error;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
