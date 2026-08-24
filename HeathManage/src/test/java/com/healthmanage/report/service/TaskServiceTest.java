package com.healthmanage.report.service;

import com.healthmanage.report.dto.CreateTaskRequest;
import com.healthmanage.report.exception.BusinessException;
import com.healthmanage.report.model.AnalysisTask;
import com.healthmanage.report.store.TaskStore;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class TaskServiceTest {

    private final TaskStore store = new TaskStore();
    private final ReportProcessor processor = mock(ReportProcessor.class);
    private final TaskService service = new TaskService(store, processor);

    private CreateTaskRequest request(String userId, String fileKey) {
        CreateTaskRequest request = new CreateTaskRequest();
        request.setUserId(userId);
        request.setFileKey(fileKey);
        return request;
    }

    @Test
    void createTask_isIdempotent() {
        CreateTaskRequest request = request("u1", "img-001.jpg");

        AnalysisTask first = service.createTask(request);
        AnalysisTask second = service.createTask(request);

        assertThat(second.getId()).isEqualTo(first.getId());
        verify(processor, times(1)).process(first.getId());
    }

    @Test
    void createTask_differentFiles_createSeparateTasks() {
        AnalysisTask a = service.createTask(request("u1", "img-001.jpg"));
        AnalysisTask b = service.createTask(request("u1", "img-002.jpg"));

        assertThat(a.getId()).isNotEqualTo(b.getId());
        verify(processor, times(2)).process(anyString());
    }

    @Test
    void getTask_unknownId_throwsNotFound() {
        assertThatThrownBy(() -> service.getTask("no-such-id"))
                .isInstanceOf(BusinessException.class);
    }
}
