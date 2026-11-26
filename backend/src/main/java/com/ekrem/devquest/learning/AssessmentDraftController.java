package com.ekrem.devquest.learning;

import com.ekrem.devquest.learning.AssessmentEngine.Answer;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/learning/sessions/{session}/assessment/draft")
@RequiredArgsConstructor
@Transactional
class AssessmentDraftController {
    private final LearningController learning;
    private final AssessmentEngine engine;
    private final ObjectMapper json;
    private final JdbcTemplate jdbc;
    private final AttemptHistory attempts;

    @Getter @Setter static class Revision {
        @NotNull private UUID id;
        @NotNull @PositiveOrZero private Long version;
    }
    @Getter @Setter static class Edit extends Revision {
        @NotBlank @Size(max=80) private String position;
        @NotNull @Size(max=12) private List<@Valid @NotNull Answer> answers;
    }
    @Value static class Draft {
        UUID id;
        UUID session;
        AssessmentEngine.Paper paper;
        String position;
        List<AssessmentEngine.Answer> answers;
        Map<String,AssessmentEngine.Feedback> guided;
        long version;
        Instant createdAt;
        Instant updatedAt;
    }

    private AssessmentEngine.Paper bound(UUID session) {
        if (!learning.assessmentCatalog().contains(session)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return engine.paper().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Value static class Active { Draft draft; }

    @GetMapping Active read(@PathVariable UUID session) {
        return new Active(find(session, bound(session).getKey(), false).orElse(null));
    }

    @PostMapping Draft start(@PathVariable UUID session) {
        var paper = bound(session);
        jdbc.update("""
            INSERT INTO devquest.assessment_draft(id,session_id,source_node_id,assessment_key,release,position)
            SELECT ?, n.stable_id,n.id,?,?,? FROM devquest.curriculum_node n
            JOIN devquest.curriculum c ON c.current_revision_id=n.revision_id
            WHERE n.stable_id=? AND n.kind='SESSION'
            ON CONFLICT (session_id,assessment_key) DO NOTHING
            """,UUID.randomUUID(),paper.getKey(),paper.getRelease(),paper.getQuestions().getFirst().getId(),session);
        return find(session,paper.getKey(),true).orElseThrow();
    }

    private Optional<Draft> find(UUID session, String key, boolean lock) {
        String sql = "SELECT * FROM devquest.assessment_draft WHERE session_id=? AND assessment_key=?";
        return jdbc.query(sql + (lock ? " FOR UPDATE" : ""), (r,i) -> {
            var paper = engine.paper(r.getInt("release")).filter(p -> p.getKey().equals(key))
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,"Restore the pinned assessment package to resume."));
            var answers = Arrays.asList(json.readValue(r.getString("answers"), AssessmentEngine.Answer[].class));
            var revealed = Arrays.asList(json.readValue(r.getString("revealed"), String[].class));
            var guided = new HashMap<String,AssessmentEngine.Feedback>();
            if (!revealed.isEmpty()) {
                for (var item : engine.grade(submission(paper,answers))) {
                    if (revealed.contains(item.getQuestion())) guided.put(item.getQuestion(),item);
                }
            }
            return new Draft(r.getObject("id",UUID.class),session,paper,r.getString("position"),answers,guided,
                    r.getLong("version"),r.getTimestamp("created_at").toInstant(),r.getTimestamp("updated_at").toInstant());
        },session,key).stream().findFirst();
    }

    private Draft locked(UUID session, Revision revision) {
        return find(session,bound(session).getKey(),true)
                .filter(d -> d.id.equals(revision.id) && d.version == revision.version)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,"Draft changed. Reload the saved draft."));
    }

    private AssessmentEngine.Submission submission(AssessmentEngine.Paper paper,List<AssessmentEngine.Answer> answers) {
        var submission = new AssessmentEngine.Submission();
        submission.setKey(paper.getKey());
        submission.setRelease(paper.getRelease());
        submission.setAnswers(answers);
        return submission;
    }

    @PostMapping("/save") Draft save(@PathVariable UUID session,@Valid @RequestBody Edit edit) {
        return update(session,edit,null);
    }

    @PostMapping("/check/{question}") Draft check(@PathVariable UUID session,@PathVariable String question,@Valid @RequestBody Edit edit) {
        return update(session,edit,question);
    }

    private Draft update(UUID session,Edit edit,String question) {
        var draft = locked(session,edit);
        if (!"@review".equals(edit.position) && draft.paper.getQuestions().stream().noneMatch(q -> q.getId().equals(edit.position)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Invalid question position.");
        var results = engine.grade(submission(draft.paper,edit.answers));
        for (var answer : draft.answers) {
            if (draft.guided.containsKey(answer.getQuestion()) && !edit.answers.contains(answer))
                throw new ResponseStatusException(HttpStatus.CONFLICT,"A checked response is locked.");
        }
        var revealed = new TreeSet<>(draft.guided.keySet());
        if (question != null) {
            boolean answered = results.stream().anyMatch(f -> question.equals(f.getQuestion())
                    && Set.of("Correct","Incorrect").contains(f.getOutcome()));
            if (!answered) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Choose an answer before checking.");
            revealed.add(question);
        }
        if (draft.answers.equals(edit.answers) && draft.position.equals(edit.position) && revealed.equals(draft.guided.keySet())) return draft;
        jdbc.update("""
            UPDATE devquest.assessment_draft SET answers=?::jsonb,revealed=?::jsonb,position=?,version=version+1,updated_at=clock_timestamp()
            WHERE id=?
            """,json.writeValueAsString(edit.answers),json.writeValueAsString(revealed),edit.position,draft.id);
        return find(session,draft.paper.getKey(),false).orElseThrow();
    }

    @PostMapping("/discard") Map<String,Boolean> discard(@PathVariable UUID session,@Valid @RequestBody Revision revision) {
        var draft = locked(session,revision);
        jdbc.update("DELETE FROM devquest.assessment_draft WHERE id=?",draft.id);
        return Map.of("discarded",true);
    }

    @Getter @Setter static class Submit extends Revision {
        @Pattern(regexp="Meets criteria|Partially meets criteria|Needs review") private String rating;
    }

    @PostMapping("/submit") AttemptHistory.Result submit(@PathVariable UUID session,@Valid @RequestBody Submit operation) {
        // A waiting SELECT FOR UPDATE can see the row disappear when the first submit commits.
        // Read the durable receipt in a fresh READ COMMITTED statement in that case.
        var lockedIds=jdbc.queryForList("SELECT id FROM devquest.assessment_draft WHERE id=? AND session_id=? FOR UPDATE",
                UUID.class, operation.getId(), session);
        if (lockedIds.isEmpty()) return attempts.replay(session,operation);
        var draft=locked(session,operation);
        var results=engine.grade(submission(draft.paper,draft.answers));
        var receipt=attempts.store(draft,results,operation.getRating());
        jdbc.update("DELETE FROM devquest.assessment_draft WHERE id=?",draft.id);
        return receipt;
    }
}
