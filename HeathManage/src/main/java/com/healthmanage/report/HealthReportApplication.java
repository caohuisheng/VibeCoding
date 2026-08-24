package com.healthmanage.report;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/** AI 健康报告服务入口。 */
@SpringBootApplication
@EnableAsync
public class HealthReportApplication {

    public static void main(String[] args) {
        SpringApplication.run(HealthReportApplication.class, args);
    }
}
