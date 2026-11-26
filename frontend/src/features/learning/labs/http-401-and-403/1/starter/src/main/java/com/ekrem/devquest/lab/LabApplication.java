package com.ekrem.devquest.lab;

import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
public class LabApplication {
    public static void main(String[] args) {
        SpringApplication.run(LabApplication.class, args);
    }
}

@RestController
class SummaryController {
    @GetMapping("/api/tasks/summary")
    Map<String, Integer> summary() {
        return Map.of("taskCount", 3);
    }
}
