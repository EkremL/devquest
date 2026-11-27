package com.ekrem.devquest.learning;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import static org.assertj.core.api.Assertions.*;

class AssessmentEngineTest {
    @Test void rejectsUnresolvablePassagesDuplicateQuestionsAndForeignChoices() throws Exception {
        try (var file = getClass().getResourceAsStream("/assessments/http-401-and-403/2/assessment.json")) {
            var pack = new ObjectMapper().readValue(file, AssessmentEngine.Package.class);
            var anchors = pack.getKeys().values().stream().map(AssessmentEngine.Key::getAnchor).collect(Collectors.toSet());
            pack.getKeys().values().forEach(k -> anchors.addAll(k.getTopics()));
            assertThatCode(() -> AssessmentEngine.validate(pack,"http-401-and-403",anchors)).doesNotThrowAnyException();
            assertThatIllegalArgumentException().isThrownBy(() -> AssessmentEngine.validate(pack,"http-401-and-403",Set.of()));
            var q = pack.getPaper().getQuestions().getFirst();
            q.setId("challenge-evidence");
            assertThatIllegalArgumentException().isThrownBy(() -> AssessmentEngine.validate(pack,"http-401-and-403",anchors));
            q.setId("reader-policy");
            pack.getKeys().get(q.getId()).setCorrect(java.util.List.of("unknown"));
            assertThatIllegalArgumentException().isThrownBy(() -> AssessmentEngine.validate(pack,"http-401-and-403",anchors));
        }
    }

    @ParameterizedTest
    @CsvSource({"http-401-and-403, 3", "identity-and-access-vocabulary, 1", "security-philosophy, 1",
            "http-authentication-basics, 1", "stateful-authentication, 1", "stateless-and-token-based-authentication, 1",
            "jwt-foundations, 1", "authentication-mechanism-comparison, 1", "common-authentication-threats, 1"})
    void activePaperUsesTheSingleAnswerBlueprint(String key, int release) {
        var mapper = new ObjectMapper();
        var engine = new AssessmentEngine(mapper, new LessonPackage(mapper));
        var paper = engine.paper(key).orElseThrow();
        assertThat(paper.getRelease()).isEqualTo(release);
        var questions = paper.getQuestions();
        assertThat(questions).hasSize(12);
        assertThat(questions.subList(0, 11)).allSatisfy(q -> {
            assertThat(q.getType()).isEqualTo("single");
            assertThat(q.getChoices().size()).isBetween(4, 5);
        });
        assertThat(questions.getLast().getType()).isEqualTo("written");
        assertThat(questions.subList(0, 3)).allMatch(q -> q.getDifficulty().equals("Foundation"));
        assertThat(questions.subList(3, 8)).allMatch(q -> q.getDifficulty().equals("Intermediate"));
        assertThat(questions.subList(8, 12)).allMatch(q -> q.getDifficulty().equals("Advanced"));
    }

    @ParameterizedTest
    @CsvSource({"identity-and-access-vocabulary, 4, 16", "security-philosophy, 1, 12",
            "http-authentication-basics, 1, 11", "stateful-authentication, 1, 15", "stateless-and-token-based-authentication, 1, 13",
            "jwt-foundations, 1, 20", "authentication-mechanism-comparison, 1, 11", "common-authentication-threats, 1, 13"})
    void authoredReleaseGradesEachChoiceAgainstItsOwnAnswerKey(String key, int readingRelease, int topicCount) throws Exception {
        var mapper = new ObjectMapper();
        var engine = new AssessmentEngine(mapper, new LessonPackage(mapper));
        var paper = engine.paper(key, 1).orElseThrow();
        assertThat(paper.getReadingRelease()).isEqualTo(readingRelease);
        try (var file = getClass().getResourceAsStream("/assessments/" + key + "/1/assessment.json")) {
            var packageContent = mapper.readValue(file, AssessmentEngine.Package.class);
            assertThat(packageContent.getKeys().values().stream().flatMap(guide -> guide.getTopics().stream()).distinct()).hasSize(topicCount);
            var submission = new AssessmentEngine.Submission();
            submission.setKey(key);
            submission.setRelease(1);
            for (var question : paper.getQuestions().subList(0, 11)) {
                var guide = packageContent.getKeys().get(question.getId());
                assertThat(guide.getCorrect()).hasSize(1);
                var answer = new AssessmentEngine.Answer();
                answer.setQuestion(question.getId());
                submission.setAnswers(List.of(answer));
                for (String choice : question.getChoices().keySet()) {
                    answer.setChoices(List.of(choice));
                    assertThat(engine.check(submission).getOutcome()).isEqualTo(guide.getCorrect().contains(choice) ? "Correct" : "Incorrect");
                }
                answer.setChoices(question.getChoices().keySet().stream().limit(2).toList());
                assertThatThrownBy(() -> engine.check(submission)).isInstanceOfSatisfying(
                        ResponseStatusException.class, error -> assertThat(error.getStatusCode().value()).isEqualTo(400));
            }
        }
    }

    @ParameterizedTest
    @CsvSource({
            "challenge-evidence, proof;scheme, Correct",
            "challenge-evidence, scheme, Incorrect",
            "challenge-evidence, scheme;account, Incorrect",
            "challenge-evidence, scheme;account;proof, Incorrect",
            "challenge-evidence, account, Incorrect",
            "challenge-evidence, '', Unanswered",
            "reader-policy, refusal, Correct",
            "reader-policy, challenge, Incorrect"
    })
    void verifiesExactSelectionForSubmissionAndGuidedCheck(String question, String choices, String outcome) {
        var mapper = new ObjectMapper();
        var engine = new AssessmentEngine(mapper, new LessonPackage(mapper));
        var answer = new AssessmentEngine.Answer();
        answer.setQuestion(question);
        answer.setChoices(choices.isEmpty() ? List.of() : List.of(choices.split(";")));
        var submission = new AssessmentEngine.Submission();
        submission.setKey("http-401-and-403");
        submission.setRelease(2);
        submission.setAnswers(List.of(answer));

        assertThat(engine.grade(submission))
                .filteredOn(feedback -> feedback.getQuestion().equals(question))
                .extracting(AssessmentEngine.Feedback::getOutcome)
                .containsExactly(outcome);
        if (choices.isEmpty()) {
            assertThatThrownBy(() -> engine.check(submission)).isInstanceOfSatisfying(
                    ResponseStatusException.class, error -> assertThat(error.getStatusCode().value()).isEqualTo(400));
        } else {
            assertThat(engine.check(submission).getOutcome()).isEqualTo(outcome);
        }
    }
}
