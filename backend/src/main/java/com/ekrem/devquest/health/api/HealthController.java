package com.ekrem.devquest.health.api;

import com.ekrem.devquest.health.application.HealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {
    private final HealthService healthService;

    @GetMapping
    public ResponseEntity<HealthResponse> health() {
        HealthResponse response = healthService.check();
        return ResponseEntity.status("UP".equals(response.getStatus())
                ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).body(response);
    }
}
