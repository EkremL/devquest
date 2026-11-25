package com.ekrem.devquest.learning;

import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.*;

@RestController
@RequestMapping("/api/learning/sessions/{session}/assessment/attempts")
@RequiredArgsConstructor
class AttemptHistory {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    @Value static class Summary {
        UUID id; String key; int release; Instant startedAt; Instant submittedAt;
        int correct; int incorrect; int guided; int skipped; boolean written; String rating;
    }
    @Value static class Result {
        Summary summary; JsonNode snapshot;
    }
    private Summary summary(ResultSet row) throws SQLException {
        return new Summary(row.getObject("id",UUID.class),row.getString("assessment_key"),row.getInt("release"),
                row.getTimestamp("started_at").toInstant(), row.getTimestamp("submitted_at").toInstant(),
                row.getInt("independent_correct"),row.getInt("independent_incorrect"),row.getInt("guided"),
                row.getInt("skipped"),row.getBoolean("written"),row.getString("rating"));
    }

    @GetMapping List<Summary> list(@PathVariable UUID session,
            @RequestParam(defaultValue="http-401-and-403") String key,@RequestParam(defaultValue="0") int page) {
        if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return jdbc.query("""
            SELECT id, assessment_key, release, started_at, submitted_at, independent_correct,
                   independent_incorrect, guided, skipped, written, rating
            FROM devquest.assessment_attempt WHERE session_id=? AND assessment_key=?
            ORDER BY submitted_at DESC,id DESC LIMIT 20 OFFSET ?
            """,(r,i)->summary(r),session,key,20L*page);
    }

    @GetMapping("/{id}") Result detail(@PathVariable UUID session,@PathVariable UUID id) {
        return jdbc.query("SELECT * FROM devquest.assessment_attempt WHERE session_id=? AND id=?",
                (r,i)->new Result(summary(r),json.readTree(r.getString("snapshot"))),session,id)
                .stream().findFirst().orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    Result replay(UUID session, AssessmentDraftController.Submit operation) {
        var match = jdbc.query("SELECT draft_version,rating FROM devquest.assessment_attempt WHERE session_id=? AND id=?",
                (r,i)->r.getLong("draft_version")==operation.getVersion() && Objects.equals(r.getString("rating"),operation.getRating()),
                session,operation.getId());
        if (match.isEmpty() || !match.getFirst()) throw new ResponseStatusException(HttpStatus.CONFLICT,"Draft or submission changed.");
        return detail(session,operation.getId());
    }

    Result store(AssessmentDraftController.Draft draft, List<AssessmentEngine.Feedback> results,String rating) {
        int correct=0, incorrect=0, skipped=0;
        boolean written=false;
        var questions=draft.getPaper().getQuestions();
        for(int i=0;i<questions.size();i++) {
            var feedback=results.get(i);
            if ("written".equals(questions.get(i).getType())) {
                written="Self-review".equals(feedback.getOutcome());
            } else if (!draft.getGuided().containsKey(feedback.getQuestion())) {
                switch(feedback.getOutcome()) {
                    case "Correct" -> correct++;
                    case "Incorrect" -> incorrect++;
                    case "Unanswered" -> skipped++;
                    default -> throw new IllegalStateException("Unknown graded outcome");
                }
            }
        }
        if (rating!=null && !written) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"Provide a written response before rating it.");
        var snapshot=Map.of("format",1,"paper",draft.getPaper(),"answers",draft.getAnswers(),
                "results",results,"revealed",new TreeSet<>(draft.getGuided().keySet()));
        jdbc.update("""
            INSERT INTO devquest.assessment_attempt
                (id,draft_version,session_id,source_node_id,assessment_key,release,started_at,
                 independent_correct,independent_incorrect,guided,skipped,written,rating,snapshot)
            SELECT id,version,session_id,source_node_id,assessment_key,release,created_at,?,?,?,?,?,?,?::json
            FROM devquest.assessment_draft WHERE id=?
            """,correct,incorrect,draft.getGuided().size(),skipped,written,rating,json.writeValueAsString(snapshot),draft.getId());
        return detail(draft.getSession(),draft.getId());
    }
}
