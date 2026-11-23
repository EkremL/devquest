package com.ekrem.devquest.curriculum;

import com.ekrem.devquest.curriculum.application.*;
import com.ekrem.devquest.curriculum.api.CurriculumDtos.UpdateProgress;
import com.ekrem.devquest.curriculum.domain.ProgressStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.TransactionDefinition;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:postgresql://127.0.0.1:${DEVQUEST_DB_PORT:5432}/devquest_test_db",
    "spring.datasource.username=${DEVQUEST_TEST_DB_USERNAME:devquest_test}",
    "spring.datasource.password=${DEVQUEST_TEST_DB_PASSWORD}"
})
class MarkdownExportIT {
    @Autowired MarkdownExportService exporter;
    @Autowired CurriculumReader reader;
    @Autowired RoadmapParser parser;
    @Autowired ProgressService progress;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @LocalServerPort int port;
    private UUID curriculumId() { return reader.overview().getCurriculumId(); }
    private List<Map<String,Object>> progressRows() { return jdbc.queryForList("SELECT * FROM devquest.item_progress ORDER BY item_id"); }
    private List<Map<String,Object>> events() { return jdbc.queryForList("SELECT * FROM devquest.progress_event ORDER BY id"); }

    @Test void downloadsValidMarkdownWithoutChangingSourceOrDatabase() throws Exception {
        byte[] sourceBefore = Files.readAllBytes(Path.of("../curriculum/ROADMAP.md"));
        var progressBefore = progressRows(); var eventsBefore = events();
        var mappingsBefore = jdbc.queryForList("SELECT * FROM devquest.source_item_mapping ORDER BY item_id");
        try (var client = HttpClient.newHttpClient()) {
            var response = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api/curriculum/" + curriculumId() + "/export")).GET().build(), HttpResponse.BodyHandlers.ofByteArray());
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.headers().firstValue("Content-Type").orElseThrow()).isEqualTo("text/markdown;charset=UTF-8");
            assertThat(response.headers().firstValue("Content-Disposition").orElseThrow()).isEqualTo("attachment; filename=\"ROADMAP.md\"");
            assertThat(response.headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
            assertThat(response.body()).isEqualTo(exporter.export(curriculumId()));
            var parsed = parser.parse(new String(response.body(), StandardCharsets.UTF_8));
            assertThat(parsed.getItems()).hasSize(889);
            assertThat(parsed.getItems().stream().filter(RoadmapParser.Item::isCompleted).count()).isEqualTo(jdbc.queryForObject("SELECT count(*) FROM devquest.item_progress WHERE status='COMPLETED'", Long.class));
            assertThat(parsed.getItems()).extracting(RoadmapParser.Item::getLabel).containsExactlyElementsOf(parser.parse(new String(sourceBefore, StandardCharsets.UTF_8)).getItems().stream().map(RoadmapParser.Item::getLabel).toList());
        }
        assertThat(Files.readAllBytes(Path.of("../curriculum/ROADMAP.md"))).isEqualTo(sourceBefore);
        assertThat(progressRows()).isEqualTo(progressBefore);
        assertThat(events()).isEqualTo(eventsBefore);
        assertThat(jdbc.queryForList("SELECT * FROM devquest.source_item_mapping ORDER BY item_id")).isEqualTo(mappingsBefore);
    }
    @Test @Transactional void exportsFourStatesAndDuplicateNamesByStableIdentity() {
        var items = jdbc.queryForList("SELECT i.id,m.source_line FROM devquest.checklist_item i JOIN devquest.source_item_mapping m ON m.item_id=i.id WHERE i.label='Key rotation' ORDER BY m.occurrence");
        var statuses = ProgressStatus.values();
        for (int i=0; i<items.size(); i++) {
            UUID id = (UUID) items.get(i).get("id");
            progress.update(id, new UpdateProgress(statuses[i], jdbc.queryForObject("SELECT version FROM devquest.item_progress WHERE item_id=?", Long.class, id)));
        }
        var before = progressRows(); var eventsBefore = events();
        String original = jdbc.queryForObject("SELECT source_markdown FROM devquest.curriculum_revision WHERE curriculum_id=?", String.class, curriculumId());
        String exported = new String(exporter.export(curriculumId()), StandardCharsets.UTF_8);
        String[] lines = exported.split("\\R", -1);
        for (int i=0; i<items.size(); i++) assertThat(lines[(int) items.get(i).get("source_line")-1]).isEqualTo("- [" + (statuses[i] == ProgressStatus.COMPLETED ? "x" : " ") + "] Key rotation");
        // Apart from checkbox characters, every character of the complete original document is identical.
        assertThat(exported.replaceAll("(?m)^- \\[[ xX]]", "- [?]")).isEqualTo(original.replaceAll("(?m)^- \\[[ xX]]", "- [?]"));
        assertThat(progressRows()).isEqualTo(before); assertThat(events()).isEqualTo(eventsBefore);
    }
    @Test @Transactional void missingMappingFailsClosed() {
        jdbc.update("DELETE FROM devquest.source_item_mapping WHERE item_id=(SELECT item_id FROM devquest.source_item_mapping LIMIT 1)");
        assertThatThrownBy(() -> exporter.export(curriculumId())).isInstanceOf(MarkdownExportRenderer.ExportIntegrityException.class);
    }
    @Test void unknownCurriculumReturns404AndMalformedIdReturns400() throws Exception {
        try (var client = HttpClient.newHttpClient()) {
            for (String id : List.of(UUID.randomUUID().toString(), "invalid")) {
                var response = client.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/curriculum/"+id+"/export")).GET().build(), HttpResponse.BodyHandlers.ofString());
                assertThat(response.statusCode()).isEqualTo(id.equals("invalid") ? 400 : 404);
                assertThat(response.headers().firstValue("Content-Disposition")).isEmpty();
            }
        }
    }
    @Test void repeatableSnapshotExcludesConcurrentCommitUntilNextExportTransaction() {
        UUID curriculum = curriculumId();
        UUID item = jdbc.queryForObject("SELECT id FROM devquest.checklist_item WHERE label='Configure PostgreSQL'", UUID.class);
        var original = jdbc.queryForMap("SELECT * FROM devquest.item_progress WHERE item_id=?", item);
        var snapshot = new TransactionTemplate(transactions);
        snapshot.setIsolationLevel(TransactionDefinition.ISOLATION_REPEATABLE_READ);
        snapshot.setReadOnly(true);
        try {
            byte[] oldExport = snapshot.execute(tx -> {
                byte[] before = exporter.export(curriculum);
                CompletableFuture.runAsync(() -> progress.update(item, new UpdateProgress(ProgressStatus.COMPLETED, (Long) original.get("version")))).join();
                assertThat(exporter.export(curriculum)).isEqualTo(before);
                return before;
            });
            assertThat(exporter.export(curriculum)).isNotEqualTo(oldExport);
        } finally {
            var restore = new TransactionTemplate(transactions);
            restore.executeWithoutResult(tx -> {
                jdbc.update("DELETE FROM devquest.progress_event WHERE item_id=? AND progress_version>?", item, original.get("version"));
                jdbc.update("UPDATE devquest.item_progress SET status=?,version=?,updated_at=?,completed_at=? WHERE item_id=?", original.get("status"), original.get("version"), original.get("updated_at"), original.get("completed_at"), item);
            });
        }
    }
}
