package com.healthmanage.report.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** 模拟 AI 服务：延迟若干秒返回报告文本，并支持演示一次处理失败。 */
@Service
public class MockAiService {

    private final long delayMs;
    private final String failKeyword;

    public MockAiService(
            @Value("${app.mock-ai.delay-ms:3000}") long delayMs,
            @Value("${app.mock-ai.fail-keyword:fail}") String failKeyword) {
        this.delayMs = delayMs;
        this.failKeyword = failKeyword;
    }

    /**
     * 生成模拟报告。
     *
     * @param fileKey 文件唯一标识
     * @return 模拟报告文本
     * @throws RuntimeException 当文件标识包含失败关键字时，模拟 AI 处理失败
     */
    public String generateReport(String fileKey) {
        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("模拟 AI 分析被中断", e);
        }

        if (fileKey != null && fileKey.toLowerCase().contains(failKeyword.toLowerCase())) {
            throw new RuntimeException("模拟 AI 分析失败：文件无法识别（演示失败场景）");
        }

        return "【健康分析报告】\n"
                + "文件：" + fileKey + "\n"
                + "综合评估：各项指标整体良好，建议保持规律作息、均衡饮食与适量运动。\n"
                + "（以上内容由模拟 AI 生成，仅用于演示）";
    }
}
