package com.ekrem.devquest.learning;

import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/learning")
@RequiredArgsConstructor
class LearningController {
    private final LessonPackage packages;
    private final JdbcTemplate jdbc;
    private final AssessmentEngine assessments;

    @GetMapping("/assessment-catalog")
    List<UUID> assessmentCatalog() {
        return assessments.paper().isPresent() ? packages.pilot().flatMap(this::resolve).stream().map(Session::getId).toList() : List.of();
    }

    @GetMapping("/sessions/{sessionId}/assessment")
    ResponseEntity<AssessmentEngine.Paper> assessment(@PathVariable UUID sessionId) {
        return ResponseEntity.of(assessments.paper().filter(p -> assessmentCatalog().contains(sessionId)));
    }

    @PostMapping("/sessions/{sessionId}/assessment/submit")
    ResponseEntity<List<AssessmentEngine.Feedback>> submit(@PathVariable UUID sessionId,
            @jakarta.validation.Valid @RequestBody AssessmentEngine.Submission responses) {
        if (!assessmentCatalog().contains(sessionId)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(assessments.grade(responses));
    }

    @PostMapping("/sessions/{sessionId}/assessment/check")
    ResponseEntity<AssessmentEngine.Feedback> check(@PathVariable UUID sessionId,
            @jakarta.validation.Valid @RequestBody AssessmentEngine.Submission response) {
        if (!assessmentCatalog().contains(sessionId)) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(assessments.check(response));
    }

    @GetMapping("/catalog")
    List<UUID> catalog() {
        return packages.published().stream().flatMap(content -> resolve(content).stream()).map(Session::getId).toList();
    }

    @GetMapping("/sessions/{sessionId}/lesson")
    ResponseEntity<Lesson> lesson(@PathVariable UUID sessionId) {
        return ResponseEntity.of(findLesson(sessionId));
    }

    private Optional<Lesson> findLesson(UUID sessionId) {
        return packages.published().stream().flatMap(content -> resolve(content)
                .filter(session -> session.getId().equals(sessionId))
                .map(session -> new Lesson(session, content)).stream()).findFirst();
    }

    // Read the baseline and its accepted successor in one consistent snapshot.
    @GetMapping("/sessions/{sessionId}/topics")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    Map<UUID, String> topicLinks(@PathVariable UUID sessionId) {
        var matched = findLesson(sessionId);
        if (matched.isEmpty()) return Map.of();
        var manifest = matched.orElseThrow().content.getManifest();
        var binding = manifest.getBinding();
        var rows = jdbc.query("""
                SELECT original.source_line, original.label, current_item.item_id
                FROM devquest.curriculum c
                JOIN devquest.curriculum_revision baseline ON baseline.curriculum_id = c.id AND baseline.sha256 = ?
                JOIN devquest.curriculum_node parent ON parent.revision_id = baseline.id AND parent.stable_id = ?
                JOIN devquest.source_item_mapping original ON original.node_id = parent.id AND original.revision_id = baseline.id
                JOIN devquest.curriculum_node active ON active.stable_id = parent.stable_id AND active.revision_id = c.current_revision_id
                LEFT JOIN devquest.source_item_mapping current_item ON current_item.item_id = original.item_id
                    AND current_item.node_id = active.id AND current_item.revision_id = active.revision_id
                WHERE c.source_key = ?
                """, (row, index) -> new TopicRow(row.getInt("source_line"), row.getString("label"),
                        row.getObject("item_id", UUID.class)), binding.getSourceSha256(), sessionId, binding.getSourceKey());
        var links = new HashMap<UUID, String>();
        for (var topic : manifest.getTopics()) {
            var matches = rows.stream().filter(row -> row.line == topic.getSourceLine()).toList();
            if (matches.size() != 1) continue;
            var row = matches.getFirst();
            if (row.itemId != null && row.label.equals(topic.getSourceLabel())) {
                links.put(row.itemId, topic.getPassages().getFirst());
            }
        }
        return links;
    }

    @Value private static class TopicRow {
        int line;
        String label;
        UUID itemId;
    }

    private Optional<Session> resolve(LessonPackage.Content content) {
        var binding = content.getManifest().getBinding();
        // Count historical candidates even when one of them no longer exists in the accepted revision.
        var candidates = jdbc.query("""
                SELECT active.stable_id, active.title, module.stable_id AS module_id, module.title AS module_title
                FROM devquest.curriculum c
                JOIN devquest.curriculum_revision baseline ON baseline.curriculum_id = c.id AND baseline.sha256 = ?
                JOIN devquest.curriculum_node historical ON historical.revision_id = baseline.id
                    AND historical.kind = 'SESSION' AND historical.title = ?
                JOIN devquest.curriculum_node historical_module ON historical_module.id = historical.parent_id
                    AND historical_module.revision_id = baseline.id
                    AND historical_module.kind = 'MODULE' AND historical_module.title = ?
                LEFT JOIN devquest.curriculum_node active ON active.revision_id = c.current_revision_id
                    AND active.stable_id = historical.stable_id AND active.kind = 'SESSION'
                LEFT JOIN devquest.curriculum_node module ON module.id = active.parent_id
                    AND module.revision_id = active.revision_id AND module.kind = 'MODULE'
                WHERE c.source_key = ?
                """, (row, index) -> new Session(row.getObject("stable_id", UUID.class), row.getString("title"),
                row.getObject("module_id", UUID.class), row.getString("module_title")),
                binding.getSourceSha256(), binding.getSessionTitle(), binding.getModuleTitle(), binding.getSourceKey());
        if (candidates.size() != 1) return Optional.empty();
        return Optional.of(candidates.getFirst()).filter(session -> session.getId() != null && session.getModuleId() != null);
    }

    @Value static class Session {
        UUID id;
        String title;
        UUID moduleId;
        String moduleTitle;
    }

    @Value static class Lesson {
        Session session;
        @lombok.Getter(lombok.AccessLevel.NONE) LessonPackage.Content content;

        public String getKey() { return content.getManifest().getKey(); }
        public int getRelease() { return content.getManifest().getRelease(); }
        public String getRequest() { return content.getManifest().getRequest(); }
        public String getTransport() { return content.getManifest().getTransport(); }
        public List<LessonPackage.Outcome> getOutcomes() { return content.getManifest().getOutcomes(); }
        public List<LessonPackage.FlowCase> getCases() { return content.getManifest().getCases(); }
        public List<LessonPackage.ReadingSection> getSections() { return content.getSections(); }
    }
}
