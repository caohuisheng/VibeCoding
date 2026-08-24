package com.healthmanage.report.store;

import com.healthmanage.report.model.AnalysisTask;
import com.healthmanage.report.model.TaskStatus;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 内存任务存储（ConcurrentHashMap），并维护幂等索引。
 * 通过 putIfAbsent 保证同一业务请求并发提交时只创建一个任务。
 */
@Component
public class TaskStore {

    private final ConcurrentHashMap<String, AnalysisTask> tasks = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, String> dedupIndex = new ConcurrentHashMap<>();

    /**
     * 幂等创建：dedupKey 已存在时返回 null（表示本次未新建）。
     *
     * @return 新建的任务，或 null 表示已存在
     */
    public AnalysisTask create(String dedupKey, AnalysisTask task) {
        String existingId = dedupIndex.putIfAbsent(dedupKey, task.getId());
        if (existingId != null) {
            return null;
        }
        tasks.put(task.getId(), task);
        return task;
    }

    public Optional<AnalysisTask> findByDedupKey(String dedupKey) {
        String id = dedupIndex.get(dedupKey);
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(tasks.get(id));
    }

    public Optional<AnalysisTask> findById(String id) {
        return Optional.ofNullable(tasks.get(id));
    }

    /** 原子更新任务状态与结果。 */
    public synchronized void updateStatus(String id, TaskStatus status, String report, String error) {
        AnalysisTask task = tasks.get(id);
        if (task == null) {
            return;
        }
        task.setStatus(status);
        task.setReport(report);
        task.setError(error);
        task.setUpdatedAt(Instant.now());
    }
}
