package com.healthmanage.report.service;

import com.healthmanage.report.model.AnalysisTask;
import com.healthmanage.report.model.TaskStatus;
import com.healthmanage.report.store.TaskStore;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

/**
 * 后台异步处理器：驱动任务状态流转，并调用模拟 AI。
 * 独立为 Bean，避免 {@code @Async} 自调用失效。
 */
@Component
public class ReportProcessor {

    private final TaskStore store;
    private final MockAiService mockAi;

    public ReportProcessor(TaskStore store, MockAiService mockAi) {
        this.store = store;
        this.mockAi = mockAi;
    }

    @Async("taskExecutor")
    public void process(String taskId) {
        AnalysisTask task = store.findById(taskId).orElse(null);
        if (task == null) {
            return;
        }

        store.updateStatus(taskId, TaskStatus.PROCESSING, null, null);
        try {
            String report = mockAi.generateReport(task.getFileKey());
            store.updateStatus(taskId, TaskStatus.SUCCESS, report, null);
        } catch (Exception e) {
            store.updateStatus(taskId, TaskStatus.FAILED, null, e.getMessage());
        }
    }
}
