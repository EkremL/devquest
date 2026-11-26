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
    @Test void practiceIsBoundRedactedAndStateless() throws Exception {
        var id = pilotSession();
        var before = progressSnapshot();
        var paper = get("/sessions/" + id + "/assessment");
        assertThat(paper.statusCode()).isEqualTo(200);
        assertThat(paper.body()).contains("handler-selection", "\"release\":3", "interpret-challenge").doesNotContain("\"correct\"", "\"rubric\"", "\"reason\"", "\"feedback\"");
        assertThat(get("/sessions/" + UUID.randomUUID() + "/assessment").statusCode()).isEqualTo(404);
        String body = """
                {"key":"http-401-and-403","release":2,"answers":[
                {"question":"reader-policy","choices":["refusal"]},
                {"question":"challenge-evidence","choices":["proof","scheme"]},
                {"question":"regression-plan","choices":[],"text":"Compare the two entry points."}]}
                """;
        var reply = submit(id,body);
        assertThat(reply.statusCode()).isEqualTo(200);
        var rows = new tools.jackson.databind.ObjectMapper().readTree(reply.body());
        assertThat(rows.get(0).get("outcome").asString()).isEqualTo("Correct");
        assertThat(rows.get(1).get("outcome").asString()).isEqualTo("Correct");
        assertThat(rows.get(2).get("outcome").asString()).isEqualTo("Unanswered");
        assertThat(rows.get(11).get("outcome").asString()).isEqualTo("Self-review");
        assertThat(submit(id,body.replace("\"proof\",\"scheme\"","\"scheme\"")).body()).contains("\"Incorrect\"");
        for (String invalid : java.util.List.of(body.replace("proof","scheme"), body.replace("refusal","unknown"),
                body.replace("reader-policy","unknown"), body.replace("reader-policy","handler-selection").replace("refusal","split").replace("challenge-evidence","handler-selection"),
                body.replace("Compare the two entry points.", "x".repeat(4001)), "{}")) {
            assertThat(submit(id,invalid).statusCode()).isEqualTo(400);
        }
        assertThat(submit(id,body.replace("\"release\":2","\"release\":99")).statusCode()).isEqualTo(409);
        assertThat(submit(id,body + " ".repeat(33000)).statusCode()).isEqualTo(413);
        var mapper = new tools.jackson.databind.ObjectMapper();
        try (var source = getClass().getResourceAsStream("/assessments/http-401-and-403/3/assessment.json")) {
            var pack = mapper.readValue(source, AssessmentEngine.Package.class);
            var all = pack.getPaper().getQuestions().stream().map(q -> java.util.Map.of(
                    "question", q.getId(), "choices", pack.getKeys().get(q.getId()).getCorrect())).toList();
            var complete = submit(id,mapper.writeValueAsString(java.util.Map.of("key","http-401-and-403","release",3,"answers",all)));
            assertThat(complete.statusCode()).isEqualTo(200);
            var scores = mapper.readTree(complete.body());
            assertThat(scores.size()).isEqualTo(12);
            for (int i=0; i<11; i++) assertThat(scores.get(i).get("outcome").asString()).isEqualTo("Correct");
            assertThat(scores.get(11).get("outcome").asString()).isEqualTo("Unanswered");
        }
        assertThat(progressSnapshot()).isEqualTo(before);
    }

    @Test void draftLifecycleUsesPinnedContentVersionedWritesAndServerOwnedReveals() throws Exception {
        var session = pilotSession();
        var path = "/sessions/" + session + "/assessment/draft";
        var mapper = new tools.jackson.databind.ObjectMapper();
        var before = progressSnapshot();
        assertThat(mapper.readTree(get(path).body()).get("draft").isNull()).isTrue();
        var first = mapper.readTree(post(session,"draft","{}").body());
        String id = first.get("id").asString();
        assertThat(first.get("paper").get("release").asInt()).isEqualTo(3);
        assertThat(mapper.readTree(post(session,"draft","{}").body()).get("id").asString()).isEqualTo(id);
        String edit = """
            {"id":"%s","version":0,"position":"regression-plan","answers":[
            {"question":"reader-policy","choices":["refusal"]},{"question":"regression-plan","choices":[],"text":"Test both paths."}]}
            """.formatted(id);
        assertThat(post(UUID.randomUUID(),"draft/save",edit).statusCode()).isEqualTo(404);
        assertThat(post(session,"draft/save",edit.replace("reader-policy","foreign")).statusCode()).isEqualTo(400);
        assertThat(post(session,"draft/save",edit.replace("refusal","foreign")).statusCode()).isEqualTo(400);
        assertThat(post(session,"draft/save",edit.replace("\"refusal\"","\"refusal\",\"challenge\"")).statusCode()).isEqualTo(400);
        assertThat(post(session,"draft/save",edit.replace("Test both paths.","x".repeat(4001))).statusCode()).isEqualTo(400);
        assertThat(post(session,"draft/save",edit.replace("regression-plan","foreign")).statusCode()).isEqualTo(400);
        assertThat(post(session,"draft/save",edit+" ".repeat(33000)).statusCode()).isEqualTo(413);
        var saved = post(session,"draft/save",edit);
        assertThat(saved.statusCode()).isEqualTo(200);
        assertThat(saved.body()).doesNotContain("\"correct\":","\"reason\":");
        assertThat(post(session,"draft/save",edit).statusCode()).isEqualTo(409);
        String current = edit.replace("\"version\":0","\"version\":1");
        assertThat(mapper.readTree(post(session,"draft/save",current).body()).get("version").asLong()).isEqualTo(1);
        assertThat(post(session,"draft/check/regression-plan",current).statusCode()).isEqualTo(400);
        var checked = post(session,"draft/check/reader-policy",current);
        assertThat(checked.statusCode()).isEqualTo(200);
        var resumed = mapper.readTree(get(path).body()).get("draft");
        assertThat(resumed.get("guided").size()).isEqualTo(1);
        assertThat(resumed.get("guided").get("reader-policy").get("outcome").asString()).isEqualTo("Correct");
        assertThat(resumed.get("position").asString()).isEqualTo("regression-plan");
        assertThat(resumed.get("answers").get(1).get("text").asString()).isEqualTo("Test both paths.");
        assertThat(post(session,"draft/save",current.replace("\"version\":1","\"version\":2").replace("refusal","challenge")).statusCode()).isEqualTo(409);
        String revision = "{\"id\":\"" + id + "\",\"version\":2}";
        assertThat(post(session,"draft/discard",revision.replace(":2",":1")).statusCode()).isEqualTo(409);
        String attemptsPath="/sessions/"+session+"/assessment/attempts";
        String rated=revision.substring(0,revision.length()-1)+",\"rating\":\"Needs review\"}";
        assertThat(post(session,"draft/submit",rated.replace("Needs review","automatic")).statusCode()).isEqualTo(400);
        assertThat(post(session,"draft/submit",rated.replace(":2",":1")).statusCode()).isEqualTo(409);
        assertThat(get(path).body()).contains(id);
        var parallel=java.util.concurrent.CompletableFuture.supplyAsync(()->{
            try { return post(session,"draft/submit",rated); }
            catch(Exception e){ throw new java.util.concurrent.CompletionException(e); }
        });
        var receipt=post(session,"draft/submit",rated);
        assertThat(receipt.statusCode()).isEqualTo(200);
        assertThat(parallel.get().body()).isEqualTo(receipt.body());
        assertThat(post(session,"draft/submit",rated).body()).isEqualTo(receipt.body());
        assertThat(post(session,"draft/save",current).statusCode()).isEqualTo(409);
        var result=mapper.readTree(get(attemptsPath+"/"+id).body());
        assertThat(result).isEqualTo(mapper.readTree(receipt.body()));
        assertThat(result.get("summary").get("guided").asInt()).isEqualTo(1);
        assertThat(result.get("summary").get("correct").asInt()).isZero();
        assertThat(result.get("summary").get("skipped").asInt()).isEqualTo(10);
        assertThat(result.get("summary").get("rating").asString()).isEqualTo("Needs review");
        assertThat(result.get("snapshot").get("paper")).isEqualTo(first.get("paper"));
        assertThat(result.get("snapshot").get("answers")).isEqualTo(resumed.get("answers"));
        assertThat(result.get("snapshot").get("results").get(0).get("guide")).isEqualTo(resumed.get("guided").get("reader-policy").get("guide"));
        assertThat(result.get("snapshot").get("results").get(11).get("outcome").asString()).isEqualTo("Self-review");
        assertThat(get("/sessions/"+UUID.randomUUID()+"/assessment/attempts/"+id).statusCode()).isEqualTo(404);
        assertThat(get(attemptsPath+"?page=-1").statusCode()).isEqualTo(400);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM devquest.assessment_attempt WHERE id=?",Integer.class,UUID.fromString(id))).isOne();
        org.assertj.core.api.Assertions.assertThatThrownBy(()->jdbc.update("UPDATE devquest.assessment_attempt SET guided=0 WHERE id=?",UUID.fromString(id)))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);

        assertThat(mapper.readTree(get(path).body()).get("draft").isNull()).isTrue();
        var fresh = mapper.readTree(post(session,"draft","{}").body());
        assertThat(fresh.get("id").asString()).isNotEqualTo(id);
        assertThat(fresh.get("guided").size()).isZero();
        assertThat(post(session,"draft/submit",rated).body()).isEqualTo(receipt.body());
        assertThat(post(session,"draft/discard",revision.replace(id,fresh.get("id").asString()).replace(":2",":0")).statusCode()).isEqualTo(200);
        assertThat(progressSnapshot()).isEqualTo(before);
    }

    @Autowired AssessmentDraftController drafts;

    @Test @Transactional void resumesOriginalReleaseWhenTheCurrentPaperIsNewer() {
        UUID session = pilotSession();
        var draft = drafts.start(session);
        // Reproduce a pre-upgrade row inside the rolled-back test transaction.
        jdbc.update("UPDATE devquest.assessment_draft SET release=2,position='challenge-evidence' WHERE id=?", draft.getId());
        var resumed = drafts.read(session).getDraft();
        assertThat(resumed.getId()).isEqualTo(draft.getId());
        assertThat(resumed.getPaper().getRelease()).isEqualTo(2);
        assertThat(resumed.getPosition()).isEqualTo("challenge-evidence");
        var operation=new AssessmentDraftController.Submit();
        operation.setId(resumed.getId());
        operation.setVersion(resumed.getVersion());
        var historical=drafts.submit(session,operation);
        assertThat(historical.getSummary().getRelease()).isEqualTo(2);
        assertThat(historical.getSnapshot().get("results").get(1).get("guide").get("correct").size()).isEqualTo(2);
        assertThat(resumed.getPaper().getQuestions()).extracting(AssessmentEngine.Question::getId)
                .contains("challenge-evidence").doesNotContain("interpret-challenge");
    }

    @Test void failureClosingDraftRollsBackTheInsertedAttempt() throws Exception {
        var session=pilotSession();
        var mapper=new tools.jackson.databind.ObjectMapper();
        var draft=mapper.readTree(post(session,"draft","{}").body());
        UUID id=UUID.fromString(draft.get("id").asString());
        String edit="""
                {"id":"%s","version":0,"position":"regression-plan","answers":[
                  {"question":"reader-policy","choices":["refusal"]},
                  {"question":"regression-plan","choices":[],"text":"Check both response paths."}]}
                """.formatted(id);
        assertThat(post(session,"draft/save",edit).statusCode()).isEqualTo(200);
        assertThat(post(session,"draft/check/reader-policy",edit.replace("\"version\":0","\"version\":1")).statusCode()).isEqualTo(200);
        String draftPath="/sessions/"+session+"/assessment/draft";
        var saved=mapper.readTree(get(draftPath).body()).get("draft");
        assertThat(saved.get("answers").size()).isEqualTo(2);
        assertThat(saved.get("guided").size()).isOne();
        assertThat(saved.get("position").asString()).isEqualTo("regression-plan");
        String revision=mapper.writeValueAsString(java.util.Map.of("id",id,"version",saved.get("version").asLong()));
        // A real FK failure occurs after the attempt INSERT, at the draft DELETE.
        String fixture="devquest.test_hold_"+id.toString().replace("-","");
        jdbc.execute("CREATE TABLE "+fixture+" (draft_id uuid REFERENCES devquest.assessment_draft(id))");
        try {
            jdbc.update("INSERT INTO "+fixture+" VALUES (?)",id);
            assertThat(post(session,"draft/submit",revision).statusCode()).isBetween(400,599);
            assertThat(mapper.readTree(get(draftPath).body()).get("draft")).isEqualTo(saved);
            assertThat(jdbc.queryForObject("SELECT count(*) FROM devquest.assessment_attempt WHERE id=?",Integer.class,id)).isZero();
            assertThat(get("/sessions/"+session+"/assessment/attempts/"+id).statusCode()).isEqualTo(404);
        } finally {
            jdbc.execute("DROP TABLE "+fixture);
        }
        var receipt=post(session,"draft/submit",revision);
        assertThat(receipt.statusCode()).isEqualTo(200);
        assertThat(mapper.readTree(receipt.body()).get("snapshot").get("answers")).isEqualTo(saved.get("answers"));
        assertThat(mapper.readTree(get(draftPath).body()).get("draft").isNull()).isTrue();
    }

    @Test void concurrentSaveAndSubmitUseOneDraftVersion() throws Exception {
        var session=pilotSession();
        var mapper=new tools.jackson.databind.ObjectMapper();
        var draft=mapper.readTree(post(session,"draft","{}").body());
        String id=draft.get("id").asString();
        String operation="{\"id\":\""+id+"\",\"version\":0}";
        String edit=operation.substring(0,operation.length()-1)+",\"position\":\"@review\",\"answers\":[]}";
        var concurrent=java.util.concurrent.CompletableFuture.supplyAsync(()->{
            try { return post(session,"draft/save",edit).statusCode(); }
            catch(Exception e){throw new java.util.concurrent.CompletionException(e);}
        });
        int submitted=post(session,"draft/submit",operation).statusCode();
        assertThat(java.util.List.of(concurrent.get(),submitted)).containsExactlyInAnyOrder(200,409);
        if(submitted==409) assertThat(post(session,"draft/submit",operation.replace(":0",":1")).statusCode()).isEqualTo(200);
        assertThat(get("/sessions/"+session+"/assessment/attempts/"+id).statusCode()).isEqualTo(200);
    }

    private HttpResponse<String> submit(UUID id, String body) throws Exception {
        return post(id, "submit", body);
    }

    @Test void guidedFeedbackGradesOnlyOneSelectionWithoutWriting() throws Exception {
        UUID id = pilotSession();
        String before = progressSnapshot();
        String body = """
                {"key":"http-401-and-403","release":2,"answers":[{"question":"challenge-evidence","choices":["scheme"]}]}
                """;
        var reply = post(id,"check",body);
        assertThat(reply.statusCode()).isEqualTo(200);
        assertThat(reply.body()).contains("\"Incorrect\"","\"correct\"").doesNotContain("reader-policy","regression-plan");
        assertThat(post(id,"check",body.replace("\"scheme\"","\"proof\",\"scheme\"")).body()).contains("\"Correct\"");
        assertThat(post(id,"check",body.replace("scheme","unknown")).statusCode()).isEqualTo(400);
        assertThat(post(id,"check",body.replace("challenge-evidence","regression-plan")).statusCode()).isEqualTo(400);
        assertThat(post(id,"check",body.replace("\"release\":2","\"release\":99")).statusCode()).isEqualTo(409);
        String active = body.replace("challenge-evidence", "interpret-challenge")
                .replace("scheme", "offered").replace("\"release\":2", "\"release\":3");
        assertThat(post(id,"check",active).body()).contains("\"Correct\"").doesNotContain("regression-plan");
        assertThat(post(id,"check",active.replace("offered","rejected")).body()).contains("\"Incorrect\"");
        assertThat(submit(id,active.replace("\"offered\"","\"offered\",\"rejected\"")).statusCode()).isEqualTo(400);
        assertThat(post(id,"check",active.replace("interpret-challenge","challenge-evidence")).statusCode()).isEqualTo(400);
        assertThat(post(id,"check",body.replace("\"release\":2","\"release\":1")).body()).contains("\"Incorrect\"");
        assertThat(progressSnapshot()).isEqualTo(before);
    }

    private HttpResponse<String> post(UUID id, String action, String body) throws Exception {
        return HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port
                + "/api/learning/sessions/" + id + "/assessment/" + action)).header("Content-Type","application/json")
                .header("X-DevQuest-Request","1").POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }
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
        UUID vocabulary = session("Session 1.1 — Identity and Access Vocabulary");
        String before = progressSnapshot();
        assertThat(get("/catalog").body()).isEqualTo("[\"" + vocabulary + "\",\"" + id + "\"]");
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

    @Test void mapsEveryVocabularyTopicAndKeepsAssessmentOnThePilot() throws Exception {
        UUID id = session("Session 1.1 — Identity and Access Vocabulary");
        var before = progressSnapshot();
        var lesson = get("/sessions/" + id + "/lesson");
        assertThat(lesson.statusCode()).isEqualTo(200);
        assertThat(lesson.body()).contains("\"key\":\"identity-and-access-vocabulary\"", "\"release\":4", "TaskReadPolicy", "security-decision");
        var archived = get("/sessions/" + id + "/lesson?release=1");
        assertThat(archived.statusCode()).isEqualTo(200);
        assertThat(archived.body()).contains("\"release\":1", "study-principal").doesNotContain("Walk through the Java policy");
        var second = get("/sessions/" + id + "/lesson?release=2");
        assertThat(second.statusCode()).isEqualTo(200);
        assertThat(second.body()).contains("\"release\":2", "Walk through the Java policy").doesNotContain("Repair the audit story");
        var third = get("/sessions/" + id + "/lesson?release=3");
        assertThat(third.statusCode()).isEqualTo(200);
        assertThat(third.body()).contains("\"release\":3", "Repair the audit story").doesNotContain("security-decision");
        assertThat(get("/sessions/" + id + "/lesson?release=99").statusCode()).isEqualTo(404);
        var links = learning.topicLinks(id);
        var items = jdbc.queryForList("""
                SELECT m.item_id FROM devquest.source_item_mapping m JOIN devquest.curriculum_node n ON n.id=m.node_id
                JOIN devquest.curriculum c ON c.current_revision_id=m.revision_id WHERE n.stable_id=? ORDER BY m.position
                """, UUID.class, id);
        assertThat(items.stream().map(links::get)).containsExactly(
                "study-identity", "study-credential", "study-authentication", "study-authorization", "study-access-control",
                "study-principal", "study-subject", "study-user", "study-client", "study-service", "study-resource",
                "study-resource-server", "study-authentication-server", "study-identity-provider", "study-human-to-service", "study-service-to-service");
        assertThat(links).hasSize(16);
        assertThat(get("/sessions/" + id + "/topics").statusCode()).isEqualTo(200);
        assertThat(learning.assessmentCatalog()).containsExactly(pilotSession());
        assertThat(get("/sessions/" + id + "/assessment").statusCode()).isEqualTo(404);
        assertThat(get("/sessions/" + id + "/assessment/draft").statusCode()).isEqualTo(404);
        assertThat(progressSnapshot()).isEqualTo(before);
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
        UUID other = session("Session 1.2 — Security Philosophy");
        jdbc.update("""
                UPDATE devquest.source_item_mapping m SET label='Meaning of 401 Unauthorized', source_line=257
                FROM devquest.curriculum_node n WHERE n.id=m.node_id AND n.stable_id=? AND m.position=0
                """, other);
        assertThat(learning.topicLinks(other)).isEmpty();
        assertThat(learning.topicLinks(id)).hasSize(9);
    }

    private void assertUnavailable(UUID id) {
        assertThat(learning.catalog()).doesNotContain(id);
        assertThat(learning.lesson(id, null).getStatusCode().value()).isEqualTo(404);
    }

    private UUID pilotSession() {
        return session("Session 2.6 — 401 and 403");
    }

    private UUID session(String title) {
        return curriculum.sections("SESSION").stream().filter(node -> node.getTitle().equals(title))
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
