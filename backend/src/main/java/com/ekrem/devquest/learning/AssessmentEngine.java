package com.ekrem.devquest.learning;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import tools.jackson.databind.ObjectMapper;

import java.util.*;

@Component
class AssessmentEngine {
    @Data static class Package { private Paper paper; private Map<String, Key> keys; }
    @Data static class Paper {
        private String key;
        private int release;
        @JsonInclude(JsonInclude.Include.NON_NULL) private Integer readingRelease;
        @JsonInclude(JsonInclude.Include.NON_NULL) private String title, context;
        private Map<String, String> objectives;
        private List<Question> questions;
    }
    @Data static class Question {
        private String id, objective, type, difficulty, prompt, sample, language;
        private Map<String, String> choices;
    }
    @Data static class Key {
        private String anchor, reason;
        private List<String> correct, rubric, topics;
        private Map<String, String> feedback;
    }
    @Data static class Submission {
        @NotBlank @Size(max=64) private String key;
        private int release;
        @NotNull @Size(max=12) private List<@NotNull @Valid Answer> answers;
    }
    @Data static class Answer {
        @NotBlank @Size(max=64) private String question;
        @NotNull @Size(max=8) private List<@NotBlank @Size(max=64) String> choices;
        @Size(max=4000) private String text;
    }
    @Value static class Feedback { String question; String outcome; Key guide; }

    private static final String PILOT = "http-401-and-403";
    private static final Map<String, Integer> ACTIVE_RELEASES = Map.of(
            PILOT, 3, "identity-and-access-vocabulary", 1, "security-philosophy", 1,
            "http-authentication-basics", 1, "stateful-authentication", 1);
    private final Map<String, Map<Integer, Package>> releases = new HashMap<>();

    AssessmentEngine(ObjectMapper mapper, LessonPackage lessons) {
        for (var lesson : lessons.published()) {
            String key = lesson.getManifest().getKey();
            int active = ACTIVE_RELEASES.getOrDefault(key, 0);
            if (active == 0) continue;
            var versions = new HashMap<Integer, Package>();
            for (int release = 1; release <= active; release++) {
                String path = "/assessments/" + key + "/" + release + "/assessment.json";
                try (var file = getClass().getResourceAsStream(path)) {
                    var content = mapper.readValue(file, Package.class);
                    require(content.paper.release == release);
                    var reading = lesson;
                    Integer readingRelease = content.paper.readingRelease;
                    // The legacy HTTP papers linked to Reading 4 before explicit pins were added.
                    if (readingRelease == null && PILOT.equals(key)) readingRelease = 4;
                    if (readingRelease != null) {
                        reading = lessons.releases(readingRelease).stream()
                                .filter(candidate -> key.equals(candidate.getManifest().getKey())).findFirst().orElseThrow();
                    }
                    if (content.paper.readingRelease != null) {
                        require(content.paper.objectives.keySet().equals(reading.getManifest().getObjectives().keySet()));
                        var topics = new HashSet<String>();
                        reading.getManifest().getTopics().forEach(topic -> topics.addAll(topic.getPassages()));
                        require(content.keys.values().stream().allMatch(guide -> topics.containsAll(guide.topics)));
                    }
                    var anchors = new HashSet<String>();
                    reading.getSections().forEach(section -> {
                        anchors.add(section.getAnchor());
                        section.getBlocks().stream().filter(b -> "passage".equals(b.getKind())).forEach(b -> anchors.add(b.getText()));
                    });
                    validate(content, key, anchors);
                    versions.put(release, content);
                } catch (Exception ex) {
                    org.slf4j.LoggerFactory.getLogger(AssessmentEngine.class).warn("Unavailable assessment " + path, ex);
                }
            }
            releases.put(key, Map.copyOf(versions));
        }
    }

    static void validate(Package content, String lessonKey, Set<String> anchors) {
        var paper = content.paper;
        boolean pilot = PILOT.equals(lessonKey);
        boolean original = pilot && paper.release == 1;
        require(lessonKey.equals(paper.key) && paper.release >= 1 && paper.release <= ACTIVE_RELEASES.getOrDefault(lessonKey, 0));
        require(pilot || (paper.readingRelease != null && paper.readingRelease > 0 && paper.title != null &&
                !paper.title.isBlank() && paper.context != null && !paper.context.isBlank()));
        require(paper.questions.size() == (original ? 6 : 12));
        var ids = new HashSet<String>();
        var objectives = new HashSet<String>();
        int written = 0;
        for (var q : paper.questions) {
            int number = ids.size() + 1;
            String expectedTier = number <= 3 ? "Foundation" : number <= 8 ? "Intermediate" : "Advanced";
            require(original || expectedTier.equals(q.difficulty));
            require("written".equals(q.type) == (number == paper.questions.size()));
            var guide = content.keys.get(q.id);
            require(q.id.matches("[a-z][a-z0-9-]*") && ids.add(q.id) && !q.prompt.isBlank());
            require(paper.objectives.containsKey(q.objective) && !paper.objectives.get(q.objective).isBlank());
            objectives.add(q.objective);
            require(guide != null && anchors.contains(guide.anchor) && !guide.reason.isBlank());
            require(original || (guide.topics != null && !guide.topics.isEmpty() && anchors.containsAll(guide.topics)
                    && guide.topics.stream().allMatch(t -> t.startsWith("study-"))));
            require(Set.of("java","http","json","text").contains(q.language) && q.sample != null);
            require(q.choices.keySet().equals(guide.feedback.keySet()) && q.choices.keySet().containsAll(guide.correct));
            require(new HashSet<>(guide.correct).size() == guide.correct.size());
            require(q.choices.entrySet().stream().allMatch(c -> c.getKey().matches("[a-z][a-z0-9-]*")
                    && !c.getValue().isBlank() && !guide.feedback.get(c.getKey()).isBlank()));
            if ("written".equals(q.type)) {
                written++;
                require(q.choices.isEmpty() && guide.correct.isEmpty() && !guide.rubric.isEmpty()
                        && guide.rubric.stream().noneMatch(String::isBlank));
            } else {
                require(q.choices.size() >= (original ? 3 : 4) && q.choices.size() <= 5 && guide.rubric.isEmpty());
                require(q.choices.values().stream().map(choice -> choice.strip().toLowerCase(Locale.ROOT)).distinct().count() == q.choices.size());
                require(("single".equals(q.type) && guide.correct.size() == 1)
                        || (pilot && paper.release < 3 && "multiple".equals(q.type) && guide.correct.size() >= 2));
            }
        }
        require(ids.equals(content.keys.keySet()) && objectives.equals(paper.objectives.keySet()) && written==1);
    }
    private static void require(boolean valid) {
        if (!valid) throw new IllegalArgumentException("Invalid assessment package");
    }
    Optional<Paper> paper(String key) { return paper(key, ACTIVE_RELEASES.getOrDefault(key, 0)); }

    Optional<Paper> paper(String key, int release) { return Optional.ofNullable(releases.getOrDefault(key, Map.of()).get(release)).map(Package::getPaper); }

    Feedback check(Submission submission) {
        if (submission.answers.size() != 1) throw invalid();
        var answer = submission.answers.getFirst();
        if (answer.choices.isEmpty() || answer.text != null) throw invalid();
        return grade(submission).stream().filter(f -> f.question.equals(answer.question)).findFirst().orElseThrow();
    }

    List<Feedback> grade(Submission submission) {
        var content = releases.getOrDefault(submission.key, Map.of()).get(submission.release);
        if (content == null)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Assessment release changed. Reload the assessment.");
        var answers = new HashMap<String,Answer>();
        for (var answer : submission.answers) {
            if (!content.keys.containsKey(answer.question) || answers.put(answer.question, answer) != null) throw invalid();
        }
        var results = new ArrayList<Feedback>();
        for (var q : content.paper.questions) {
            var guide = content.keys.get(q.id);
            var answer = answers.get(q.id);
            String outcome = "Unanswered";
            if (answer != null) {
                var selected = new HashSet<>(answer.choices);
                if (selected.size() != answer.choices.size() || !q.choices.keySet().containsAll(selected)) throw invalid();
                if ("written".equals(q.type)) {
                    if (answer.text != null && !answer.text.isBlank()) outcome = "Self-review";
                } else {
                    if (answer.text != null || ("single".equals(q.type) && selected.size()>1)) throw invalid();
                    if (!selected.isEmpty()) outcome = selected.equals(new HashSet<>(guide.correct)) ? "Correct" : "Incorrect";
                }
            }
            results.add(new Feedback(q.id, outcome, guide));
        }
        return results;
    }
    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid question or response");
    }
}
