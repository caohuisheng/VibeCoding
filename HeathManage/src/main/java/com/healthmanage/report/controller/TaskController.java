package com.healthmanage.report.controller;

import com.healthmanage.report.dto.CreateTaskRequest;
import com.healthmanage.report.dto.TaskResponse;
import com.healthmanage.report.model.AnalysisTask;
import com.healthmanage.report.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 任务接口：创建与查询。 */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    /** 创建分析任务：受理后立即返回任务信息（异步处理）。 */
    @PostMapping
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody CreateTaskRequest request) {
        AnalysisTask task = taskService.createTask(request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(TaskResponse.from(task));
    }

    /** 查询任务：成功返回报告，失败返回原因。 */
    @GetMapping("/{taskId}")
    public TaskResponse get(@PathVariable String taskId) {
        return TaskResponse.from(taskService.getTask(taskId));
    }
}
