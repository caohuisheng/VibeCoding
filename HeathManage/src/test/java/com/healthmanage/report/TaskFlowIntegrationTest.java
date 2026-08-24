package com.healthmanage.report;

import com.healthmanage.report.dto.CreateTaskRequest;
import com.healthmanage.report.model.AnalysisTask;
import com.healthmanage.report.model.TaskStatus;
import com.healthmanage.report.service.TaskService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

/** 端到端集成测试：走真实异步处理，覆盖成功、失败与幂等。 */
@SpringBootTest(properties = "app.mock-ai.delay-ms=50")
class TaskFlowIntegrationTest {

    @Autowired
    private TaskService taskService;

    private AnalysisTask awaitTerminal(String id) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < deadline) {
            AnalysisTask task = taskService.getTask(id);
            if (task.getStatus() == TaskStatus.SUCCESS || task.getStatus() == TaskStatus.FAILED) {
                return task;
            }
            Thread.sleep(20);
        }
        return taskService.getTask(id);
    }

    private CreateTaskRequest request(String userId, String fileKey) {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setUserId(userId);
        request.setFileKey(fileKey);
        return request;
    }

    @Test
    void fullFlow_success() throws InterruptedException {
        AnalysisTask created = taskService.createTask(request("u1", "img-001.jpg"));
        AnalysisTask done = awaitTerminal(created.getId());

        assertThat(done.getStatus()).isEqualTo(TaskStatus.SUCCESS);
        assertThat(done.getReport()).contains("健康分析报告");
        assertThat(done.getError()).isNull();
    }

    @Test
    void fullFlow_failure() throws InterruptedException {
        AnalysisTask created = taskService.createTask(request("u1", "fail-case.jpg"));
        AnalysisTask done = awaitTerminal(created.getId());

        assertThat(done.getStatus()).isEqualTo(TaskStatus.FAILED);
        assertThat(done.getReport()).isNull();
        assertThat(done.getError()).contains("失败");
    }

    @Test
    void fullFlow_idempotent() {
        AnalysisTask first = taskService.createTask(request("u1", "dup.jpg"));
        AnalysisTask second = taskService.createTask(request("u1", "dup.jpg"));

        assertThat(second.getId()).isEqualTo(first.getId());
    }
}
