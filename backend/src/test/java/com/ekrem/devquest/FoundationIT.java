package com.ekrem.devquest;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:${DEVQUEST_DB_PORT:5432}/devquest_test_db",
        "spring.datasource.username=${DEVQUEST_TEST_DB_USERNAME:devquest_test}",
        "spring.datasource.password=${DEVQUEST_TEST_DB_PASSWORD}"
})
class FoundationIT {
    @Autowired private JdbcTemplate jdbc;
    @Autowired private Flyway flyway;
    @LocalServerPort private int port;

    @Test
    void connectsToDedicatedTestDatabaseAndValidatesMigrations() {
        assertThat(jdbc.queryForObject("SELECT current_database()", String.class)).isEqualTo("devquest_test_db");
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("3");
        assertThat(flyway.validateWithResult().validationSuccessful).isTrue();
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        assertThat(jdbc.queryForList("SELECT tablename FROM pg_tables WHERE schemaname = 'devquest'", String.class))
                .containsExactlyInAnyOrder("flyway_schema_history", "curriculum", "curriculum_revision", "curriculum_node", "checklist_item", "source_item_mapping", "item_progress", "progress_event");
    }

    @Test
    void servesHealthyHttpResponseWithRealPostgres() throws Exception {
        try (HttpClient client = HttpClient.newHttpClient()) {
            var response = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/health"))
                    .GET().build(), HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.body()).contains("\"database\":\"UP\"", "\"migrations\":\"UP\"");
        }
    }
}
