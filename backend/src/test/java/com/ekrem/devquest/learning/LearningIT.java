package com.ekrem.devquest.learning;

import com.ekrem.devquest.curriculum.application.CurriculumReader;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.*;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.username=${DEVQUEST_TEST_DB_USERNAME:devquest_test}",
        "spring.datasource.password=${DEVQUEST_TEST_DB_PASSWORD}"
})
class LearningIT {
    @Autowired LearningController learning;
    @Autowired CurriculumReader curriculum;
    @Autowired JdbcTemplate jdbc;
    @LocalServerPort int port;

    @DynamicPropertySource
    static void testDatabase(DynamicPropertyRegistry registry) {
        String database = System.getProperty("devquest.learning.test.database", "devquest_test_db");
        if (!database.matches("devquest_test_db(?:_learning_[a-f0-9]+)?")) {
            throw new IllegalArgumentException("Dedicated DevQuest test database required");
        }
        int dbPort = Integer.parseInt(System.getenv().getOrDefault("DEVQUEST_DB_PORT", "5432"));
        registry.add("spring.datasource.url", () -> "jdbc:postgresql://127.0.0.1:" + dbPort + "/" + database);
    }

    @Test void resolvesThisInstallationsSessionAndServesOnlyReadEndpoints() throws Exception {
        UUID id = pilotSession();
        String before = progressSnapshot();
        assertThat(get("/catalog").body()).isEqualTo("[\"" + id + "\"]");
        var lesson = get("/sessions/" + id + "/lesson");
        assertThat(lesson.statusCode()).isEqualTo(200);
        assertThat(lesson.body()).contains("http-401-and-403", "predict-the-response", "401 Unauthorized",
                "\"release\":4", "request-flow", "BasicAuthenticationFilter", "Key takeaway");
        assertThat(get("/sessions/" + UUID.randomUUID() + "/lesson").statusCode()).isEqualTo(404);
        var links = learning.topicLinks(id);
        var items = jdbc.queryForList("""
                SELECT item_id FROM devquest.source_item_mapping m JOIN devquest.curriculum_node n ON n.id=m.node_id
                JOIN devquest.curriculum c ON c.current_revision_id=m.revision_id WHERE n.stable_id=? ORDER BY m.position
                """, UUID.class, id);
        assertThat(items.stream().map(links::get)).containsExactly("study-http-401", "study-http-403",
                "study-missing-credentials", "study-invalid-credentials", "study-insufficient-authority",
                "study-authentication-entry-point", "study-access-denied-handler", "study-json-errors", "study-safe-error-details");
        assertThat(links).hasSize(9);
        assertThat(get("/sessions/" + id + "/topics").body()).contains(items.getFirst().toString(), "study-http-401");
        assertThat(progressSnapshot()).isEqualTo(before);
        System.out.println("Learning pilot resolved to " + id);
    }

    @Test @Transactional void failsClosedWhenBaselineIsMissing() {
        UUID id = pilotSession();
        jdbc.update("UPDATE devquest.curriculum_revision SET sha256 = repeat('0', 64)");
        assertUnavailable(id);
    }

    @Test @Transactional void failsClosedWhenHistoricalIdentityIsAmbiguous() {
        UUID id = pilotSession();
        UUID duplicate = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO devquest.curriculum_node(id, revision_id, parent_id, kind, title, position, source_line, stable_id)
                SELECT ?, revision_id, parent_id, kind, title, position + 1000, source_line, ?
                FROM devquest.curriculum_node WHERE stable_id = ?
                """, duplicate, duplicate, id);
        assertUnavailable(id);
    }

    @Test @Transactional void refusesSameTitleAfterSessionIdentityChanges() {
        UUID id = pilotSession();
        // Preserve the baseline row but model an accepted revision with a replacement session.
        UUID revision = UUID.randomUUID();
        UUID module = UUID.randomUUID();
        UUID session = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO devquest.curriculum_revision(id, curriculum_id, sha256, source_markdown)
                SELECT ?, id, repeat('1', 64), '' FROM devquest.curriculum
                """, revision);
        jdbc.update("""
                INSERT INTO devquest.curriculum_node(id, revision_id, kind, title, position, source_line, stable_id)
                VALUES (?, ?, 'MODULE', 'Module 2 — Spring Security Foundations', 1, 1, ?)
                """, module, revision, module);
        jdbc.update("""
                INSERT INTO devquest.curriculum_node(id, revision_id, parent_id, kind, title, position, source_line, stable_id)
                VALUES (?, ?, ?, 'SESSION', 'Session 2.6 — 401 and 403', 2, 2, ?)
                """, session, revision, module, session);
        jdbc.update("UPDATE devquest.curriculum SET current_revision_id = ?", revision);
        assertUnavailable(id);
        assertUnavailable(session);
        jdbc.update("UPDATE devquest.curriculum_node SET stable_id = ? WHERE id = ?", id, session);
        assertThat(learning.catalog()).containsExactly(id);
        assertThat(learning.topicLinks(id)).isEmpty();
        // A reviewed item survives a rename. An unrelated item with the old label does not inherit its link.
        UUID original = jdbc.queryForObject("SELECT item_id FROM devquest.source_item_mapping WHERE source_line=257", UUID.class);
        UUID replacement = jdbc.queryForObject("SELECT item_id FROM devquest.source_item_mapping WHERE source_line < 257 LIMIT 1", UUID.class);
        jdbc.update("""
                INSERT INTO devquest.source_item_mapping(revision_id,item_id,node_id,occurrence,source_line,label,position,initially_completed)
                VALUES (?,?,?,0,11,'Renamed explanation',0,false),(?,?,?,1,12,'Meaning of 403 Forbidden',1,false)
                """, revision, original, session, revision, replacement, session);
        assertThat(learning.topicLinks(id)).containsOnly(java.util.Map.entry(original, "study-http-401"));
    }

    @Test @Transactional void ambiguousOrMissingSourceLineIsNeverMatchedByLabel() {
        UUID id = pilotSession();
        jdbc.update("UPDATE devquest.source_item_mapping SET source_line=257 WHERE source_line=258");
        assertThat(learning.topicLinks(id)).hasSize(7).doesNotContainValue("study-http-401").doesNotContainValue("study-http-403");
    }

    @Test @Transactional void identicalLabelInAnotherSessionDoesNotAcquireLink() {
        UUID id = pilotSession();
        UUID other = curriculum.sections("SESSION").stream().filter(s -> !s.getId().equals(id)).findFirst().orElseThrow().getId();
        jdbc.update("""
                UPDATE devquest.source_item_mapping m SET label='Meaning of 401 Unauthorized', source_line=257
                FROM devquest.curriculum_node n WHERE n.id=m.node_id AND n.stable_id=? AND m.position=0
                """, other);
        assertThat(learning.topicLinks(other)).isEmpty();
        assertThat(learning.topicLinks(id)).hasSize(9);
    }

    private void assertUnavailable(UUID id) {
        assertThat(learning.catalog()).isEmpty();
        assertThat(learning.lesson(id).getStatusCode().value()).isEqualTo(404);
    }

    private UUID pilotSession() {
        return curriculum.sections("SESSION").stream().filter(node -> node.getTitle().equals("Session 2.6 — 401 and 403"))
                .findFirst().orElseThrow().getId();
    }

    private HttpResponse<String> get(String path) throws Exception {
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(
                URI.create("http://127.0.0.1:" + port + "/api/learning" + path)).GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    private String progressSnapshot() {
        return jdbc.queryForObject("""
                SELECT jsonb_build_array(
                    (SELECT jsonb_agg(to_jsonb(p) ORDER BY item_id) FROM devquest.item_progress p),
                    (SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM devquest.progress_event e)
                )::text
                """, String.class);
    }
}
