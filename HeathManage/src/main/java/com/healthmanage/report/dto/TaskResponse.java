package com.healthmanage.report.dto;

import com.healthmanage.report.model.AnalysisTask;
import com.healthmanage.report.model.TaskStatus;

import java.time.Instant;

/** 任务查询/创建的响应体。 */
public class TaskResponse {

    private String id;
    private String userId;
    private String fileKey;
    private String fileName;
    private TaskStatus status;
    private String statusLabel;
    private String report;
    private String error;
    private Instant createdAt;
    private Instant updatedAt;

    public static TaskResponse from(AnalysisTask task) {
        TaskResponse response = new TaskResponse();
        response.id = task.getId();
        response.userId = task.getUserId();
        response.fileKey = task.getFileKey();
        response.fileName = task.getFileName();
        response.status = task.getStatus();
        response.statusLabel = task.getStatus().getLabel();
        response.report = task.getReport();
        response.error = task.getError();
        response.createdAt = task.getCreatedAt();
        response.updatedAt = task.getUpdatedAt();
        return response;
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

    public TaskStatus getStatus() {
        return status;
    }

    public String getStatusLabel() {
        return statusLabel;
    }

    public String getReport() {
        return report;
    }

    public String getError() {
        return error;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
