package com.ekrem.devquest.health.application;

import com.ekrem.devquest.health.api.HealthResponse;
import lombok.RequiredArgsConstructor;
import org.flywaydb.core.Flyway;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class HealthService {
    private final JdbcTemplate jdbcTemplate;
    private final Flyway flyway;

    public HealthResponse check() {
        String database = "DOWN";
        String migrations = "UNKNOWN";
        try {
            if (Integer.valueOf(1).equals(jdbcTemplate.queryForObject("SELECT 1", Integer.class))) {
                database = "UP";
                migrations = flyway.info().pending().length == 0 && flyway.validateWithResult().validationSuccessful
                        ? "UP" : "DOWN";
            }
        } catch (RuntimeException exception) {
            // Never include database credentials or exception details in the public response.
        }
        String status = "UP".equals(database) && "UP".equals(migrations) ? "UP" : "DOWN";
        return new HealthResponse("DevQuest", status, database, migrations);
    }
}
