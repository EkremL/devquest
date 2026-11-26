package com.ekrem.devquest.learning;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.*;

class LessonPackageTest {
    private final LessonPackage.Content pilot = new LessonPackage(new ObjectMapper()).pilot().orElseThrow();

    @Test void loadsThePackagedLesson() {
        assertThat(pilot.getManifest().getKey()).isEqualTo("http-401-and-403");
        assertThat(pilot.getManifest().getRelease()).isEqualTo(4);
        assertThat(pilot.getSections()).extracting(LessonPackage.ReadingSection::getAnchor).containsExactly(
                "predict-the-response", "http-semantics", "request-evidence", "spring-failure-flow", "error-contract", "debug-the-challenge");
        assertThat(pilot.getSections().stream().flatMap(section -> section.getBlocks().stream())
                .filter(block -> "code".equals(block.getKind())).map(LessonPackage.Block::getLanguage))
                .contains("http", "java", "json");
        assertThat(pilot.getManifest().getCases()).extracting(LessonPackage.FlowCase::getStatus)
                .containsExactly("401", "401", "403", "200");
        assertThat(pilot.getSections()).allMatch(s -> s.getBlocks().stream()
                .anyMatch(b -> "Key takeaway".equals(b.getText())));
    }

    @Test void vocabularyCoverageMatchesTheReviewedBaseline() {
        var packages = new LessonPackage(new ObjectMapper());
        var lesson = packages.published().stream()
                .filter(item -> item.getManifest().getKey().equals("identity-and-access-vocabulary")).findFirst().orElseThrow();
        var manifest = lesson.getManifest();
        assertThat(manifest.getBinding().getModuleTitle()).isEqualTo("Module 1 — Authentication Foundations");
        assertThat(manifest.getBinding().getSessionTitle()).isEqualTo("Session 1.1 — Identity and Access Vocabulary");
        assertThat(manifest.getRelease()).isEqualTo(5);
        assertThat(lesson.getSections()).hasSize(6);
        for (int release : new int[]{1, 2, 3, 4}) {
            var archived = packages.releases(release).stream()
                    .filter(candidate -> manifest.getKey().equals(candidate.getManifest().getKey()))
                    .findFirst().orElseThrow();
            assertThat(archived.getManifest().getRelease()).isEqualTo(release);
            assertThat(archived.getManifest().getTopics()).isEqualTo(manifest.getTopics());
            assertThat(archived.getManifest().getBinding()).isEqualTo(manifest.getBinding());
            assertThat(lesson.getSections()).extracting(LessonPackage.ReadingSection::getAnchor)
                    .containsAll(archived.getSections().stream().map(LessonPackage.ReadingSection::getAnchor).toList());
        }
        var previous = packages.releases(4).stream().filter(candidate -> manifest.getKey().equals(candidate.getManifest().getKey()))
                .findFirst().orElseThrow();
        assertThat(previous.getSections().stream().filter(chapter -> chapter.getPractice() != null)
                .map(chapter -> chapter.getPractice().getPresentation()))
                .containsExactly("prediction", "diagnosis", "diagnosis", "prediction");
        assertThat(previous.getSections().stream().filter(chapter ->
                chapter.getBlocks().stream().anyMatch(block -> "security-decision".equals(block.getKind())))
                .map(LessonPackage.ReadingSection::getAnchor)).containsExactly("separate-policy-from-proof");
        assertThat(previous.getSections().stream().flatMap(chapter -> chapter.getBlocks().stream())
                .filter(block -> block.getVisual() != null).map(block -> block.getVisual().getLayout()))
                .containsExactly("trace", "comparison", "flow", "stepper", "trace");
        assertThat(lesson.getSections().stream().flatMap(chapter -> chapter.getBlocks().stream())
                .filter(block -> "mission".equals(block.getKind())).map(LessonPackage.Block::getText))
                .containsExactly("verify-evidence", "inspect-context", "decide-access", "trace-boundary", "attribute-request", "review-request");
        assertThat(manifest.getTopics()).extracting(LessonPackage.Topic::getSourceLabel).containsExactly(
                "Identity", "Credential", "Authentication", "Authorization", "Access control", "Principal", "Subject", "User",
                "Client", "Service", "Resource", "Resource server", "Authentication server", "Identity provider",
                "Human-to-service authentication", "Service-to-service authentication");
        var primaryAnchors = new java.util.HashSet<String>();
        var available = lesson.getSections().stream().flatMap(chapter -> chapter.getBlocks().stream())
                .filter(block -> "passage".equals(block.getKind())).map(LessonPackage.Block::getText).toList();
        for (var topic : manifest.getTopics()) {
            assertThat(topic.getSourceLine()).isBetween(49, 64);
            assertThat(primaryAnchors.add(topic.getPassages().getFirst())).isTrue();
            assertThat(available).containsAll(topic.getPassages());
        }
        assertThat(available).containsExactlyInAnyOrderElementsOf(primaryAnchors);
    }

    @Test void rejectsUnknownDuplicateOrMissingMissionMarkers() throws Exception {
        var root = "/lessons/identity-and-access-vocabulary/5/";
        try (var manifest = getClass().getResourceAsStream(root + "manifest.json");
             var reading = getClass().getResourceAsStream(root + "reading.md")) {
            var data = new ObjectMapper().readValue(manifest, LessonPackage.Manifest.class);
            var markdown = new String(reading.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            assertThatIllegalArgumentException().isThrownBy(() -> LessonPackage.parse(data,
                    markdown.replace("trace-boundary", "unknown-mission")));
            assertThatIllegalArgumentException().isThrownBy(() -> LessonPackage.parse(data,
                    markdown.replace("trace-boundary", "verify-evidence")));
            assertThatIllegalArgumentException().isThrownBy(() -> LessonPackage.parse(data,
                    markdown.replaceAll("~~~mission\\Rtrace-boundary\\R~~~", "")));
        }
    }

    @ParameterizedTest
    @CsvSource({"security-philosophy, 12, 5", "http-authentication-basics, 11, 6"})
    void interactiveLaboratoriesPreserveThePublishedTopicAndChapterIdentities(String key, int topics, int missions) {
        var packages = new LessonPackage(new ObjectMapper());
        var active = packages.published().stream().filter(lesson -> key.equals(lesson.getManifest().getKey())).findFirst().orElseThrow();
        var archive = packages.releases(1).stream().filter(lesson -> key.equals(lesson.getManifest().getKey())).findFirst().orElseThrow();
        assertThat(active.getManifest().getRelease()).isEqualTo(2);
        assertThat(active.getManifest().getBinding()).isEqualTo(archive.getManifest().getBinding());
        assertThat(active.getManifest().getTopics()).hasSize(topics).isEqualTo(archive.getManifest().getTopics());
        assertThat(active.getSections()).hasSize(missions).allSatisfy(section ->
                assertThat(section.getBlocks()).filteredOn(block -> block.getKind().equals("mission")).hasSize(1));
        assertThat(active.getSections()).extracting(LessonPackage.ReadingSection::getAnchor)
                .containsAll(archive.getSections().stream().map(LessonPackage.ReadingSection::getAnchor).toList());
        assertThat(archive.getSections()).allMatch(section -> section.getBlocks().stream().noneMatch(block -> block.getKind().equals("mission")));
    }

    @Test void rejectsMisspelledOrMissingVisualReferences() throws Exception {
        var mapper = new ObjectMapper();
        var root = "/lessons/identity-and-access-vocabulary/2/";
        try (var manifest = getClass().getResourceAsStream(root + "manifest.json");
             var reading = getClass().getResourceAsStream(root + "reading.md")) {
            var data = mapper.readValue(manifest, LessonPackage.Manifest.class);
            var markdown = new String(reading.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
            assertThatIllegalArgumentException().isThrownBy(() ->
                    LessonPackage.parse(data, markdown.replace("claim-and-proof", "unknown-visual")));
            assertThatIllegalArgumentException().isThrownBy(() ->
                    LessonPackage.parse(data, markdown.replaceFirst("(?m)^claim-and-proof$", "access-path")));
        }
    }

    private String reading() throws java.io.IOException {
        try (var source = getClass().getResourceAsStream("/lessons/http-401-and-403/4/reading.md")) {
            return new String(source.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        }
    }

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3})
    void preservesPublishedBookmarks(int release) throws java.io.IOException {
        var current = pilot.getSections().stream().map(LessonPackage.ReadingSection::getAnchor).toList();
        try (var file = getClass().getResourceAsStream("/lessons/http-401-and-403/" + release + "/manifest.json")) {
            var previous = new ObjectMapper().readTree(file);
            assertThat(previous.get("release").asInt()).isEqualTo(release);
            for (var section : previous.get("sections")) {
                assertThat(current).contains(section.get("anchor").asString());
            }
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"<script>alert(1)</script>", "![embed](https://example.org/image.png)",
            "[bad](javascript:alert)", "[bad](https://docs.spring.io@example.org/)", "<Widget />",
            "~~~jsx\n<Widget />\n~~~", "~~~reader\ncustom-script\n~~~", "## Undeclared section\n\nText"})
    void rejectsMarkupOutsideTheReadingSubset(String markup) throws java.io.IOException {
        String valid = reading();
        assertThatIllegalArgumentException().isThrownBy(() ->
                LessonPackage.parse(pilot.getManifest(), valid + "\n\n" + markup));
    }

    @ParameterizedTest
    @ValueSource(strings = {"duplicate-line", "unknown-passage", "duplicate-passage", "unknown-objective"})
    void rejectsBrokenTopicCoverage(String fault) throws Exception {
        var manifest = pilot.getManifest();
        var topic = manifest.getTopics().getFirst();
        String markdown = reading();
        switch (fault) {
            case "duplicate-line" -> topic.setSourceLine(manifest.getTopics().getLast().getSourceLine());
            case "unknown-passage" -> topic.setPassages(java.util.List.of("missing"));
            case "duplicate-passage" -> markdown = markdown.replace("study-http-403", "study-http-401");
            case "unknown-objective" -> topic.setObjectives(java.util.List.of("missing"));
        }
        String input = markdown;
        assertThatIllegalArgumentException().isThrownBy(() -> LessonPackage.parse(manifest, input));
    }

    @Test void rejectsUnknownObjectives() {
        pilot.getManifest().getSections().getFirst().setObjectives(java.util.List.of("unknown"));
        assertThatIllegalArgumentException().isThrownBy(() ->
                LessonPackage.parse(pilot.getManifest(), "## Predict the response\n\nText"));
    }
}
