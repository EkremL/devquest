package com.ekrem.devquest.curriculum.application;

import com.ekrem.devquest.curriculum.domain.ProgressStatus;
import lombok.*;
import org.commonmark.node.*;
import org.commonmark.parser.*;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import java.util.regex.Pattern;

/** Edits only mapped checkbox characters; never re-renders the Markdown document. */
@Component
public class MarkdownExportRenderer {
    private final Parser parser = Parser.builder().includeSourceSpans(IncludeSourceSpans.BLOCKS).build();
    private static final Pattern MARKER = Pattern.compile("^([ \\t]*[-+*] +\\[)([ xX])(] +)(.*)$");

    @Getter @AllArgsConstructor
    public static class Mapping {
        private final UUID itemId;
        private final Integer sourceLine;
        private final Integer occurrence;
        private final String label;
        private final ProgressStatus status;
    }

    public byte[] render(String source, String expectedHash, List<Mapping> mappings) {
        try {
            String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(source.getBytes(StandardCharsets.UTF_8)));
            if (!hash.equalsIgnoreCase(expectedHash)) throw new ExportIntegrityException();
        } catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }

        // Keep offsets into the untouched string, including CRLF, mixed endings, BOM and final newline.
        List<Integer> starts = new ArrayList<>(); starts.add(0);
        var endings = Pattern.compile("\\r\\n|\\r|\\n").matcher(source);
        while (endings.find()) starts.add(endings.end());
        String[] lines = source.split("\\r\\n|\\r|\\n", -1);
        List<Integer> taskLines = new ArrayList<>();
        parser.parse(source).accept(new AbstractVisitor() {
            @Override public void visit(ListItem item) {
                int line = item.getSourceSpans().getFirst().getLineIndex();
                if (MARKER.matcher(lines[line]).matches()) taskLines.add(line);
                visitChildren(item);
            }
        });
        if (taskLines.size() != mappings.size()) throw new ExportIntegrityException();
        Set<UUID> identities = new HashSet<>();
        StringBuilder output = new StringBuilder(source);
        for (int index = 0; index < taskLines.size(); index++) {
            Mapping mapping = mappings.get(index);
            int line = taskLines.get(index);
            var marker = MARKER.matcher(lines[line]);
            if (mapping.itemId == null || !identities.add(mapping.itemId) || mapping.status == null
                    || !Integer.valueOf(index).equals(mapping.occurrence) || !Integer.valueOf(line + 1).equals(mapping.sourceLine)
                    || !marker.matches() || !marker.group(4).equals(mapping.label)) throw new ExportIntegrityException();
            output.setCharAt(starts.get(line) + marker.start(2), mapping.status == ProgressStatus.COMPLETED ? 'x' : ' ');
        }
        return output.toString().getBytes(StandardCharsets.UTF_8);
    }

    public static class ExportIntegrityException extends RuntimeException { }
}
