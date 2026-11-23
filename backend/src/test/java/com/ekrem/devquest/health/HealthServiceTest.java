package com.ekrem.devquest.health;

import com.ekrem.devquest.health.application.HealthService;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class HealthServiceTest {
    @Test
    void reportsFailureWithoutExposingConnectionDetails() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        Flyway flyway = mock(Flyway.class);
        when(jdbc.queryForObject("SELECT 1", Integer.class))
                .thenThrow(new DataAccessResourceFailureException("sensitive connection details"));
        var response = new HealthService(jdbc, flyway).check();
        assertThat(response.getStatus()).isEqualTo("DOWN");
        assertThat(response.getDatabase()).isEqualTo("DOWN");
        assertThat(response.getMigrations()).isEqualTo("UNKNOWN");
        verifyNoInteractions(flyway);
    }
}
