package com.healthmanage.report.dto;

import jakarta.validation.constraints.NotBlank;

/** 创建分析任务的请求体。 */
public class CreateTaskRequest {

    @NotBlank(message = "userId 不能为空")
    private String userId;

    @NotBlank(message = "fileKey 不能为空")
    private String fileKey;

    private String fileName;

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getFileKey() {
        return fileKey;
    }

    public void setFileKey(String fileKey) {
        this.fileKey = fileKey;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
}
