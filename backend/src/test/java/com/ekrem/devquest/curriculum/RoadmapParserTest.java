package com.ekrem.devquest.curriculum;

import com.ekrem.devquest.curriculum.application.RoadmapParser;
import org.junit.jupiter.api.Test;
import java.nio.file.*;
import static org.assertj.core.api.Assertions.*;

class RoadmapParserTest {
    private final RoadmapParser parser = new RoadmapParser();
    @Test void parsesCompleteSourceAndPreservesIndependentOccurrences() throws Exception {
        var parsed = parser.parse(Files.readString(Path.of("../curriculum/ROADMAP.md")));
        parser.validateBaseline(parsed);
        assertThat(parsed.getItems()).hasSize(889);
        assertThat(parsed.getItems()).filteredOn(RoadmapParser.Item::isCompleted).hasSize(25);
        var repeated = parsed.getItems().stream().filter(i -> i.getLabel().equals("Key rotation")).toList();
        assertThat(repeated).hasSize(4);
        assertThat(repeated).extracting(RoadmapParser.Item::getId).doesNotHaveDuplicates();
        var finalSection = parsed.getSections().getLast();
        assertThat(finalSection.getKind()).isEqualTo("FINAL_COMPETENCIES");
        assertThat(finalSection.getParentId()).isEqualTo(parsed.getSections().getFirst().getId());
        assertThat(parsed.getSections()).extracting(RoadmapParser.Section::getPosition).isSorted();
    }
    @Test void preservesInlineMarkdownAndDuplicateLabels() {
        var parsed = parser.parse("# Roadmap\n\n# Module 0 — Setup\n\n## Session 0.1 — Start\n\n- [x] `Principal`\n- [ ] `Principal`\n");
        assertThat(parsed.getItems()).extracting(RoadmapParser.Item::getLabel).containsExactly("`Principal`", "`Principal`");
        assertThat(parsed.getItems().getFirst().isCompleted()).isTrue();
        assertThat(parsed.getItems().getLast().isCompleted()).isFalse();
    }
    @Test void rejectsUnsupportedStructureAndWrongBaseline() {
        assertThatThrownBy(() -> parser.parse("# Roadmap\n\n```\n- [x] Fake task\n```\n")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> parser.validateBaseline(parser.parse("# Empty\n"))).isInstanceOf(IllegalArgumentException.class);
    }
}
