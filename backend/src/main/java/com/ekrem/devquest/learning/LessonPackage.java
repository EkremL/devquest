package com.ekrem.devquest.learning;

import lombok.Data;
import lombok.Value;
import org.commonmark.node.*;
import org.commonmark.parser.Parser;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Component
class LessonPackage {
    private static final int RELEASE = 4;
    private static final String ROOT = "/lessons/http-401-and-403/" + RELEASE + "/";
    private static final String TOKEN = "[a-z][a-z0-9]*(?:-[a-z0-9]+)*";
    private final Optional<Content> pilot;

    LessonPackage(ObjectMapper json) {
        pilot = loadPilot(json);
    }

    Optional<Content> pilot() {
        return pilot;
    }

    private Optional<Content> loadPilot(ObjectMapper json) {
        try {
            return Optional.of(parse(json.readValue(read("manifest.json"), Manifest.class), read("reading.md")));
        } catch (IOException | RuntimeException ex) {
            LoggerFactory.getLogger(LessonPackage.class).warn("Packaged pilot lesson unavailable", ex);
            return Optional.empty();
        }
    }

    private static String read(String file) throws IOException {
        try (var stream = LessonPackage.class.getResourceAsStream(ROOT + file)) {
            if (stream == null) throw new IOException("Missing packaged resource " + file);
            return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    static Content parse(Manifest manifest, String markdown) {
        var binding = manifest.getBinding();
        require("http-401-and-403".equals(manifest.getKey()) && manifest.getRelease() == RELEASE, "Unexpected lesson package identity");
        require(binding != null && "spring-security-roadmap".equals(binding.getSourceKey())
                && matches(binding.getSourceSha256(), "[a-f0-9]{64}")
                && matches(binding.getModuleTitle(), "Module [0-9]+ — .+")
                && matches(binding.getSessionTitle(), "Session [0-9]+\\.[0-9]+ — .+"), "Invalid curriculum binding");
        var objectives = manifest.getObjectives();
        require(objectives != null && !objectives.isEmpty() && objectives.entrySet().stream()
                .allMatch(entry -> matches(entry.getKey(), TOKEN) && nonBlank(entry.getValue())), "Invalid objectives");
        var sections = manifest.getSections();
        require(sections != null && !sections.isEmpty(), "Missing section outline");
        var cases = manifest.getCases();
        require(nonBlank(manifest.getRequest()) && nonBlank(manifest.getTransport()), "Missing request context");
        var outcomes = manifest.getOutcomes();
        require(outcomes != null && outcomes.size() == 3 && outcomes.stream().allMatch(o -> o != null
                && nonBlank(o.title) && nonBlank(o.detail) && nonBlank(o.action) && matches(o.status, "401|403|200"))
                && outcomes.stream().map(Outcome::getStatus).distinct().count() == outcomes.size(), "Invalid responses");
        require(cases != null && cases.size() == 4 && cases.stream().allMatch(c -> c != null
                && nonBlank(c.label) && nonBlank(c.authentication) && nonBlank(c.destination)
                && nonBlank(c.explanation) && matches(c.status, "401|403|200"))
                && cases.stream().map(FlowCase::getLabel).distinct().count() == cases.size(), "Invalid request cases");

        var node = Parser.builder().build().parse(markdown).getFirstChild();
        var reading = new ArrayList<ReadingSection>();
        var passageIds = new HashSet<String>();
        for (var section : sections) {
            require(section != null && matches(section.getAnchor(), TOKEN) && nonBlank(section.getTitle())
                    && section.getObjectives() != null && !section.getObjectives().isEmpty()
                    && section.getObjectives().stream().allMatch(id -> id != null && objectives.containsKey(id))
                    && reading.stream().noneMatch(existing -> existing.getAnchor().equals(section.getAnchor())), "Invalid section metadata");
            require(node instanceof Heading heading && heading.getLevel() == 2
                    && heading.getFirstChild() instanceof Text title && title.getNext() == null
                    && title.getLiteral().equals(section.getTitle()), "Section heading does not match manifest");
            var blocks = new ArrayList<Block>();
            for (node = node.getNext(); node != null; node = node.getNext()) {
                if (node instanceof Heading heading && heading.getLevel() == 2) break;
                if (node instanceof FencedCodeBlock marker && "passage".equals(marker.getInfo())) {
                    String anchor = marker.getLiteral().strip();
                    require(matches(anchor, "study-" + TOKEN) && passageIds.add(anchor), "Invalid or duplicate passage");
                    node = node.getNext();
                    require(node instanceof Heading heading && heading.getLevel() == 3, "Passage needs a heading");
                    blocks.add(new Block("passage", inline(node), null, anchor));
                } else {
                    blocks.add(block(node));
                }
            }
            require(!blocks.isEmpty(), "Empty reading section");
            var practice = section.getPractice();
            long practiceMarkers = blocks.stream().filter(b -> b.kind.equals("practice")).count();
            require(practiceMarkers == (practice == null ? 0 : 1), "Practice marker must match a prompt");
            if (practice != null) {
                require(nonBlank(practice.prompt) && practice.choices != null && practice.choices.size() >= 2
                        && practice.choices.stream().allMatch(c -> c != null && nonBlank(c.label) && nonBlank(c.reason))
                        && practice.choices.stream().map(Choice::getLabel).distinct().count() == practice.choices.size(),
                        "Invalid reading practice");
            }
            var observations = section.getObservations();
            long evidenceMarkers = blocks.stream().filter(b -> b.kind.equals("evidence")).count();
            require(evidenceMarkers == (observations == null ? 0 : 1), "Evidence marker must match observations");
            if (observations != null) {
                require(observations.size() >= 2 && observations.stream().allMatch(o -> o != null
                        && nonBlank(o.request) && matches(o.status, "[1-5][0-9]{2}")
                        && (o.challenge == null || nonBlank(o.challenge))), "Invalid HTTP observations");
            }
            reading.add(new ReadingSection(section.getAnchor(), section.getTitle(), practice, observations,
                    section.getObjectives().stream().map(objectives::get).toList(), List.copyOf(blocks)));
        }
        require(node == null, "Unexpected section outside manifest");
        require(reading.stream().noneMatch(section -> passageIds.contains(section.getAnchor())), "Anchor collision");
        var lines = new HashSet<Integer>();
        var referenced = new HashSet<String>();
        var topics = manifest.getTopics();
        require(topics != null && !topics.isEmpty(), "Missing topic coverage");
        for (var topic : topics) {
            require(topic != null && topic.sourceLine > 0 && lines.add(topic.sourceLine)
                    && nonBlank(topic.sourceLabel), "Invalid or duplicate source reference");
            require(topic.objectives != null && !topic.objectives.isEmpty()
                    && topic.objectives.stream().allMatch(objectives::containsKey), "Unknown topic objective");
            require(topic.passages != null && !topic.passages.isEmpty()
                    && passageIds.containsAll(topic.passages), "Unknown topic passage");
            referenced.addAll(topic.passages);
        }
        require(referenced.equals(passageIds), "Passage missing a topic reference");
        return new Content(manifest, List.copyOf(reading));
    }

    private static Block block(Node node) {
        if (node instanceof Paragraph) return new Block("paragraph", inline(node), null, null);
        if (node instanceof Heading heading && heading.getLevel() == 3) {
            return new Block("heading", inline(node), null, null);
        }
        if (node instanceof BlockQuote quote && quote.getFirstChild() instanceof Heading heading
                && heading.getLevel() == 3 && heading.getFirstChild() instanceof Text label && label.getNext() == null
                && heading.getNext() instanceof Paragraph paragraph && paragraph.getNext() == null) {
            require(Set.of("Engineering tip", "Common misconception", "Security warning", "Implementation details",
                    "Guided explanation", "Key takeaway").contains(label.getLiteral()), "Unknown teaching note");
            return new Block("note", inline(paragraph), null, label.getLiteral());
        }
        if (node instanceof FencedCodeBlock marker && "reader".equals(marker.getInfo())) {
            String widget = marker.getLiteral().strip();
            require(Set.of("outcomes", "request-flow", "practice", "evidence").contains(widget), "Unknown reading activity");
            return new Block(widget, List.of(), null, null);
        }
        if (node instanceof FencedCodeBlock code && Set.of("http", "text", "java", "json").contains(code.getInfo())) {
            return new Block("code", List.of(), code.getInfo(), code.getLiteral().stripTrailing());
        }
        throw new IllegalArgumentException("Unsupported lesson block: " + node.getClass().getSimpleName());
    }

    private static List<Span> inline(Node parent) {
        var spans = new ArrayList<Span>();
        for (var node = parent.getFirstChild(); node != null; node = node.getNext()) {
            if (node instanceof Text text) spans.add(new Span("text", text.getLiteral(), null));
            else if (node instanceof Code code) spans.add(new Span("code", code.getLiteral(), null));
            else if (node instanceof SoftLineBreak) spans.add(new Span("text", " ", null));
            else if (node instanceof Link link && link.getFirstChild() instanceof Text label && label.getNext() == null) {
                var destination = URI.create(link.getDestination());
                require("https".equals(destination.getScheme())
                        && Set.of("www.rfc-editor.org", "docs.spring.io").contains(destination.getHost() == null ? "" : destination.getHost())
                        && destination.getRawUserInfo() == null && destination.getPort() == -1, "Unsupported reference URL");
                spans.add(new Span("link", label.getLiteral(), destination.toASCIIString()));
            } else throw new IllegalArgumentException("Unsupported lesson markup: " + node.getClass().getSimpleName());
        }
        return List.copyOf(spans);
    }

    private static boolean matches(String value, String pattern) { return value != null && value.matches(pattern); }
    private static boolean nonBlank(String value) { return value != null && !value.isBlank(); }
    private static void require(boolean valid, String message) {
        if (!valid) throw new IllegalArgumentException(message);
    }

    @Data static class Manifest {
        private String key;
        private int release;
        private Binding binding;
        private List<Topic> topics;
        private Map<String, String> objectives;
        private List<OutlineSection> sections;
        private List<FlowCase> cases;
        private List<Outcome> outcomes;
        private String request;
        private String transport;
    }

    @Data static class Topic {
        private int sourceLine;
        private String sourceLabel;
        private List<String> objectives;
        private List<String> passages;
    }

    @Data static class Binding {
        private String sourceKey;
        private String sourceSha256;
        private String moduleTitle;
        private String sessionTitle;
    }

    @Data static class OutlineSection {
        private String anchor;
        private String title;
        private List<String> objectives;
        private Practice practice;
        private List<Observation> observations;
    }

    @Data static class Observation {
        private String request;
        private String status;
        private String challenge;
    }

    @Data static class Practice {
        private String prompt;
        private List<Choice> choices;
    }

    @Data static class Outcome {
        private String status;
        private String title;
        private String detail;
        private String action;
    }

    @Data static class Choice {
        private String label;
        private String reason;
    }

    @Data static class FlowCase {
        private String label;
        private String authentication;
        private String authorization;
        private String translation;
        private String destination;
        private String status;
        private String explanation;
    }

    @Value static class Content {
        Manifest manifest;
        List<ReadingSection> sections;
    }

    @Value static class ReadingSection {
        String anchor;
        String title;
        Practice practice;
        List<Observation> observations;
        List<String> objectives;
        List<Block> blocks;
    }

    @Value static class Block {
        String kind;
        List<Span> spans;
        String language;
        String text;
    }

    @Value static class Span {
        String kind;
        String text;
        String href;
    }
}
