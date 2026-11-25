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

    @Test void activePaperUsesTheSingleAnswerBlueprint() {
        var mapper = new ObjectMapper();
        var engine = new AssessmentEngine(mapper, new LessonPackage(mapper));
        var paper = engine.paper().orElseThrow();
        assertThat(paper.getRelease()).isEqualTo(3);
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
