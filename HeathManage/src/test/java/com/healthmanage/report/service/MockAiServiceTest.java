package com.healthmanage.report.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MockAiServiceTest {

    private MockAiService service(long delayMs, String failKeyword) {
        return new MockAiService(delayMs, failKeyword);
    }

    @Test
    void generateReport_returnsReportText() {
        MockAiService service = service(0, "fail");
        String report = service.generateReport("img-001.jpg");
        assertThat(report).contains("健康分析报告");
    }

    @Test
    void generateReport_throwsOnFailKeyword() {
        MockAiService service = service(0, "fail");
        assertThatThrownBy(() -> service.generateReport("fail-case.jpg"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("失败");
    }
}
