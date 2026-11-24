package com.ekrem.devquest.curriculum;

import com.ekrem.devquest.curriculum.api.CurriculumDtos.*;
import com.ekrem.devquest.curriculum.application.*;
import com.ekrem.devquest.curriculum.domain.ProgressStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:postgresql://127.0.0.1:${DEVQUEST_DB_PORT:5432}/devquest_test_db",
    "spring.datasource.username=${DEVQUEST_TEST_DB_USERNAME:devquest_test}",
    "spring.datasource.password=${DEVQUEST_TEST_DB_PASSWORD}"
})
class CurriculumIT {
    @Autowired JdbcTemplate jdbc;
    @Autowired CurriculumImporter importer;
    @Autowired CurriculumReader reader;
    @Autowired ProgressService progress;
    @Autowired ActivityReader activity;
    @LocalServerPort int port;

    @Test @Transactional void recentActivityReadsOnlyRecordedTransitionsAndCurrentLinks() {
        var id = firstId();
        var session = reader.sections("SESSION").stream()
                .filter(s -> s.getItems().stream().anyMatch(item -> item.getId().equals(id))).findFirst().orElseThrow();
        assertThat(activity.recent()).noneMatch(event -> event.getItemId().equals(id));
        progress.update(id, new UpdateProgress(ProgressStatus.IN_PROGRESS, version(id)));
        progress.update(id, new UpdateProgress(ProgressStatus.NEEDS_REVIEW, version(id)));
        var afterWrites = eventCount(id);
        var entries = activity.recent().stream().filter(event -> event.getItemId().equals(id)).toList();
        assertThat(entries).hasSize(2);
        assertThat(entries.getFirst().getFromStatus()).isEqualTo(ProgressStatus.IN_PROGRESS);
        assertThat(entries.getFirst().getToStatus()).isEqualTo(ProgressStatus.NEEDS_REVIEW);
        assertThat(entries.getFirst().getSectionId()).isEqualTo(session.getId());
        assertThat(entries.getFirst().getModuleId()).isEqualTo(session.getParentId());
        assertThat(entries.getFirst().getTopic()).isEqualTo("Configure PostgreSQL");
        assertThat(entries.getFirst().getOccurredAt()).isNotNull();
        assertThat(eventCount(id)).isEqualTo(afterWrites);
    }

    @Test void importsExactHierarchyAndHistoricalCompletions() {
        var root = reader.overview().getRoot();
        assertThat(reader.sections("MODULE")).hasSize(11);
        assertThat(reader.sections("SESSION")).hasSize(76);
        var stats = root.getStatistics();
        assertThat(stats.getSessionTopics().getTotal()).isEqualTo(805);
        assertThat(stats.getModuleRequirements().getTotal()).isEqualTo(67);
        assertThat(stats.getFinalCompetencies().getTotal()).isEqualTo(17);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM devquest.checklist_item WHERE initially_completed", Integer.class)).isEqualTo(25);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM devquest.item_progress WHERE version=0 AND completed_at IS NOT NULL", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM devquest.source_item_mapping", Integer.class)).isEqualTo(889);
        assertThat(reader.sections("FINAL_COMPETENCIES").getFirst().getParentId()).isEqualTo(root.getId());
    }
    @Test @Transactional void identicalImportPreservesIdsProgressAndEvents() throws Exception {
        var id = firstId();
        progress.update(id, new UpdateProgress(ProgressStatus.NEEDS_REVIEW, version(id)));
        var before = jdbc.queryForList("SELECT * FROM devquest.item_progress ORDER BY item_id");
        var events = jdbc.queryForList("SELECT * FROM devquest.progress_event ORDER BY id");
        assertThat(importer.importSource(Files.readAllBytes(Path.of("../curriculum/ROADMAP.md")))).isFalse();
        assertThat(jdbc.queryForList("SELECT * FROM devquest.item_progress ORDER BY item_id")).isEqualTo(before);
        assertThat(jdbc.queryForList("SELECT * FROM devquest.progress_event ORDER BY id")).isEqualTo(events);
    }
    @Test void changedSourceIsRejectedWithoutReplacingRows() throws Exception {
        var before = reader.overview().getRevisionId();
        byte[] changed = (Files.readString(Path.of("../curriculum/ROADMAP.md")) + "\nChanged").getBytes(java.nio.charset.StandardCharsets.UTF_8);
        assertThatThrownBy(() -> importer.importSource(changed)).isInstanceOf(IllegalStateException.class).hasMessageContaining("Reconciliation");
        assertThat(reader.overview().getRevisionId()).isEqualTo(before);
    }
    @Test @Transactional void transitionsAreVersionedAndNoopDoesNotCreateEvents() {
        UUID id = firstId();
        long initialEvents = eventCount(id);
        for (var status : List.of(ProgressStatus.IN_PROGRESS, ProgressStatus.NEEDS_REVIEW, ProgressStatus.COMPLETED, ProgressStatus.NOT_STARTED)) {
            var updated = progress.update(id, new UpdateProgress(status, version(id)));
            assertThat(updated.getStatus()).isEqualTo(status);
            if (status == ProgressStatus.COMPLETED) assertThat(updated.getCompletedAt()).isNotNull();
            else assertThat(updated.getCompletedAt()).isNull();
            var again = progress.update(id, new UpdateProgress(status, updated.getVersion()));
            assertThat(again.getVersion()).isEqualTo(updated.getVersion());
        }
        assertThat(eventCount(id)).isEqualTo(initialEvents + 4);
    }
    @Test @Transactional void duplicateLabelsHaveIndependentProgress() {
        var ids = jdbc.queryForList("SELECT id FROM devquest.checklist_item WHERE label='Key rotation' ORDER BY id", UUID.class);
        var before = jdbc.queryForList("SELECT * FROM devquest.item_progress WHERE item_id=?", ids.get(1));
        progress.update(ids.getFirst(), new UpdateProgress(ProgressStatus.NEEDS_REVIEW, version(ids.getFirst())));
        assertThat(jdbc.queryForList("SELECT * FROM devquest.item_progress WHERE item_id=?", ids.get(1))).isEqualTo(before);
    }
    @Test void validatesHttpRequestsAndProtectsMutations() throws Exception {
        String path = "/api/items/" + firstId() + "/progress";
        assertThat(patch(path, "{\"status\":\"UNKNOWN\",\"version\":0}", true, null).statusCode()).isEqualTo(400);
        assertThat(patch(path, "{\"status\":\"COMPLETED\",\"version\":-1}", true, null).statusCode()).isEqualTo(400);
        assertThat(patch(path, "{}", true, null).statusCode()).isEqualTo(400);
        assertThat(patch("/api/items/not-a-uuid/progress", "{\"status\":\"COMPLETED\",\"version\":0}", true, null).statusCode()).isEqualTo(400);
        assertThat(patch("/api/items/" + UUID.randomUUID() + "/progress", "{\"status\":\"COMPLETED\",\"version\":0}", true, null).statusCode()).isEqualTo(404);
        assertThat(patch(path, "{}", false, null).statusCode()).isEqualTo(403);
        assertThat(patch(path, "{}", true, "https://untrusted.example").statusCode()).isEqualTo(403);
    }
    @Test void servesEveryReadEndpointFromPostgres() throws Exception {
        var module = reader.sections("MODULE").getFirst();
        var session = reader.sections("SESSION").getFirst();
        var paths = List.of("/api/curriculum", "/api/curriculum/statistics", "/api/modules", "/api/modules/" + module.getId(),
                "/api/modules/" + module.getId() + "/requirements", "/api/sessions", "/api/sessions/" + session.getId(),
                "/api/sessions/" + session.getId() + "/topics", "/api/final-competencies");
        try (var client = HttpClient.newHttpClient()) {
            for (String path : paths) {
                var response = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).GET().build(), HttpResponse.BodyHandlers.ofString());
                assertThat(response.statusCode()).as(path).isEqualTo(200);
                assertThat(response.headers().firstValue("Content-Type").orElse("")).contains("application/json");
            }
        }
    }
    @Test void concurrentHttpUpdatesHaveOneWinnerAndStaleReplayCannotDuplicateEvents() throws Exception {
        UUID id = firstId();
        var before = jdbc.queryForMap("SELECT status,version,updated_at,completed_at FROM devquest.item_progress WHERE item_id=?", id);
        long expected = version(id), eventsBefore = eventCount(id);
        String path = "/api/items/" + id + "/progress";
        String body = "{\"status\":\"IN_PROGRESS\",\"version\":" + expected + "}";
        try (var pool = Executors.newFixedThreadPool(2)) {
            var gate = new CountDownLatch(1);
            Callable<Integer> action = () -> { gate.await(); return patch(path, body, true, null).statusCode(); };
            var a = pool.submit(action); var b = pool.submit(action); gate.countDown();
            assertThat(List.of(a.get(), b.get())).containsExactlyInAnyOrder(200, 409);
            assertThat(patch(path, body, true, null).statusCode()).isEqualTo(409);
            assertThat(eventCount(id)).isEqualTo(eventsBefore + 1);
        } finally {
            // Dedicated test database only: restore the fixture without creating learning activity.
            jdbc.update("DELETE FROM devquest.progress_event WHERE item_id=? AND progress_version>?", id, expected);
            jdbc.update("UPDATE devquest.item_progress SET status=?,version=?,updated_at=?,completed_at=? WHERE item_id=?", before.get("status"), expected, before.get("updated_at"), before.get("completed_at"), id);
        }
    }
    private UUID firstId() { return jdbc.queryForObject("SELECT id FROM devquest.checklist_item WHERE label='Configure PostgreSQL'", UUID.class); }
    private long version(UUID id) { return jdbc.queryForObject("SELECT version FROM devquest.item_progress WHERE item_id=?", Long.class, id); }
    private long eventCount(UUID id) { return jdbc.queryForObject("SELECT count(*) FROM devquest.progress_event WHERE item_id=?", Long.class, id); }
    private HttpResponse<String> patch(String path, String body, boolean header, String origin) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path)).header("Content-Type", "application/json");
        if (header) builder.header("X-DevQuest-Request", "1");
        if (origin != null) builder.header("Origin", origin);
        try (var client = HttpClient.newHttpClient()) {
            return client.send(builder.method("PATCH", HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
        }
    }
}
