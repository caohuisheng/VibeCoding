package com.healthmanage.report.service;

import com.healthmanage.report.dto.CreateTaskRequest;
import com.healthmanage.report.exception.BusinessException;
import com.healthmanage.report.model.AnalysisTask;
import com.healthmanage.report.store.TaskStore;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.UUID;

/** 任务服务：创建（幂等）、查询。 */
@Service
public class TaskService {

    private final TaskStore store;
    private final ReportProcessor processor;

    public TaskService(TaskStore store, ReportProcessor processor) {
        this.store = store;
        this.processor = processor;
    }

    /**
     * 创建分析任务。同一用户 + 同一文件标识重复提交时返回已有任务，不重复调用 AI。
     */
    public AnalysisTask createTask(CreateTaskRequest request) {
        String dedupKey = dedupKey(request.getUserId(), request.getFileKey());

        AnalysisTask existing = store.findByDedupKey(dedupKey).orElse(null);
        if (existing != null) {
            return existing;
        }

        AnalysisTask task = new AnalysisTask(
                UUID.randomUUID().toString(),
                request.getUserId(),
                request.getFileKey(),
                request.getFileName());

        AnalysisTask created = store.create(dedupKey, task);
        if (created != null) {
            processor.process(task.getId());
            return created;
        }

        // 并发竞争：另一线程已创建，返回既有任务
        return store.findByDedupKey(dedupKey)
                .orElseThrow(() -> new BusinessException("任务创建失败"));
    }

    public AnalysisTask getTask(String taskId) {
        return store.findById(taskId)
                .orElseThrow(() -> new BusinessException("任务不存在：" + taskId, HttpStatus.NOT_FOUND));
    }

    private String dedupKey(String userId, String fileKey) {
        return userId + ":" + fileKey;
    }
}
