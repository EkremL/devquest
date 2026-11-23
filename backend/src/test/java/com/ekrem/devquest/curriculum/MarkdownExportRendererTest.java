package com.ekrem.devquest.curriculum;

import com.ekrem.devquest.curriculum.application.MarkdownExportRenderer;
import com.ekrem.devquest.curriculum.application.MarkdownExportRenderer.Mapping;
import com.ekrem.devquest.curriculum.domain.ProgressStatus;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class MarkdownExportRendererTest {
    private final MarkdownExportRenderer renderer = new MarkdownExportRenderer();
    private String hash(String text) throws Exception { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8))); }
    private Mapping mapping(int line, int occurrence, String label, ProgressStatus status) { return new Mapping(UUID.randomUUID(), line, occurrence, label, status); }

    @Test void preservesAllNonCheckboxBytesAndIndependentDuplicateLabels() throws Exception {
        String source = "\uFEFF# Learning — Ω\r\n\r\nA **note**, [link](https://example.com), and `code`.  \n\n"
                + "- [ ] Repeated\r\n- [x] Repeated\r- [X] Review\n- [x] Untouched\n\n"
                + "```md\n- [x] Not a real task\n```\n\n<!-- preserve this -->\n| A | B |\n|---|---|\n| 1 | 2 |";
        var mappings = List.of(mapping(5, 0, "Repeated", ProgressStatus.COMPLETED), mapping(6, 1, "Repeated", ProgressStatus.IN_PROGRESS),
                mapping(7, 2, "Review", ProgressStatus.NEEDS_REVIEW), mapping(8, 3, "Untouched", ProgressStatus.NOT_STARTED));
        String expected = source.replace("- [ ] Repeated\r\n- [x] Repeated", "- [x] Repeated\r\n- [ ] Repeated")
                .replace("- [X] Review", "- [ ] Review").replace("- [x] Untouched", "- [ ] Untouched");
        assertThat(renderer.render(source, hash(source), mappings)).isEqualTo(expected.getBytes(StandardCharsets.UTF_8));
    }
    @Test void preservesFinalNewlineAndLfOrCrLfExactly() throws Exception {
        for (String ending : List.of("\n", "\r\n")) {
            for (String tail : List.of("", ending)) {
                String source = "# Title" + ending + ending + "- [x] Done" + tail;
                assertThat(renderer.render(source, hash(source), List.of(mapping(3, 0, "Done", ProgressStatus.COMPLETED)))).isEqualTo(source.getBytes(StandardCharsets.UTF_8));
            }
        }
    }
    @Test void refusesChecksumMismatch() {
        assertThatThrownBy(() -> renderer.render("# Changed", "0".repeat(64), List.of())).isInstanceOf(MarkdownExportRenderer.ExportIntegrityException.class);
    }
    @Test void refusesMissingWrongOrRepeatedMappingsAndMissingProgress() throws Exception {
        String source = "# Title\n\n- [ ] One\n- [ ] Two\n";
        String checksum = hash(source);
        Mapping first = mapping(3, 0, "One", ProgressStatus.COMPLETED);
        for (var mappings : List.of(List.of(first), List.of(first, first), List.of(first, mapping(4, 1, "Wrong", ProgressStatus.NOT_STARTED)),
                List.of(first, mapping(3, 1, "Two", ProgressStatus.NOT_STARTED)), List.of(first, mapping(4, 1, "Two", null)))) {
            assertThatThrownBy(() -> renderer.render(source, checksum, mappings)).isInstanceOf(MarkdownExportRenderer.ExportIntegrityException.class);
        }
    }
}
