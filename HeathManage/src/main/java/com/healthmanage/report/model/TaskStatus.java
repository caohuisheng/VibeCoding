package com.healthmanage.report.model;

/** 任务状态：等待处理 → 处理中 → 成功 / 失败。 */
public enum TaskStatus {
    PENDING("等待处理"),
    PROCESSING("处理中"),
    SUCCESS("成功"),
    FAILED("失败");

    private final String label;

    TaskStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
