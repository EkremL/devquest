package com.ekrem.devquest.curriculum.application;

import lombok.*;
import org.commonmark.node.*;
import org.commonmark.parser.*;
import org.springframework.stereotype.Component;
import java.util.*;
import java.util.regex.Pattern;

/** Structural CommonMark parsing with lossless source labels. Unsupported structure fails closed. */
@Component
public class RoadmapParser {
    private final Parser parser = Parser.builder().includeSourceSpans(IncludeSourceSpans.BLOCKS).build();
    private static final Pattern TASK = Pattern.compile("^- \\[([ xX])] (.+)$");

    @Getter @AllArgsConstructor
    public static class Section {
        private final UUID id;
        private final UUID parentId;
        private final String kind;
        private final String title;
        private final int position;
        private final int sourceLine;
    }
    @Getter @AllArgsConstructor
    public static class Item {
        private final UUID id;
        private final UUID nodeId;
        private final String label;
        private final int position;
        private final int sourceLine;
        private final boolean completed;
    }
    @Getter @AllArgsConstructor
    public static class Parsed {
        private final List<Section> sections;
        private final List<Item> items;
    }

    public Parsed parse(String markdown) {
        String[] lines = markdown.split("\\R", -1);
        List<Section> sections = new ArrayList<>();
        List<Item> items = new ArrayList<>();
        UUID root = null, module = null;
        Section current = null;
        int itemPosition = 0;
        for (Node block = parser.parse(markdown).getFirstChild(); block != null; block = block.getNext()) {
            int line = block.getSourceSpans().getFirst().getLineIndex();
            if (block instanceof Heading heading) {
                String raw = lines[line];
                String title = raw.replaceFirst("^#{1,2} ", "");
                String kind;
                UUID parent;
                if (sections.isEmpty() && heading.getLevel() == 1) { kind = "ROOT"; parent = null; }
                else if (heading.getLevel() == 1 && title.matches("Module \\d+ — .+")) { kind = "MODULE"; parent = root; }
                else if (heading.getLevel() == 2 && title.matches("Session \\d+\\.\\d+ — .+") && module != null) { kind = "SESSION"; parent = module; }
                else if (heading.getLevel() == 2 && title.matches("Module \\d+ Completion") && module != null) { kind = "MODULE_COMPLETION"; parent = module; }
                else if (heading.getLevel() == 1 && title.equals("Final Competency Checklist")) { kind = "FINAL_COMPETENCIES"; parent = root; module = null; }
                else throw new IllegalArgumentException("Unsupported roadmap heading at line " + (line + 1));
                current = new Section(UUID.randomUUID(), parent, kind, title, sections.size(), line + 1);
                sections.add(current);
                if (kind.equals("ROOT")) root = current.id;
                if (kind.equals("MODULE")) module = current.id;
                itemPosition = 0;
            } else if (block instanceof BulletList) {
                if (current == null || !Set.of("SESSION", "MODULE_COMPLETION", "FINAL_COMPETENCIES").contains(current.kind))
                    throw new IllegalArgumentException("Checklist outside a supported section");
                for (Node child = block.getFirstChild(); child != null; child = child.getNext()) {
                    var spans = child.getSourceSpans();
                    if (!(child instanceof ListItem) || spans.size() != 1)
                        throw new IllegalArgumentException("Unsupported nested or multiline checklist");
                    int itemLine = spans.getFirst().getLineIndex();
                    var match = TASK.matcher(lines[itemLine]);
                    if (!match.matches()) throw new IllegalArgumentException("Invalid checklist at line " + (itemLine + 1));
                    items.add(new Item(UUID.randomUUID(), current.id, match.group(2), itemPosition++, itemLine + 1, !match.group(1).equals(" ")));
                }
            } else if (!(block instanceof Paragraph && current != null && current.kind.equals("ROOT"))) {
                throw new IllegalArgumentException("Unsupported roadmap block at line " + (line + 1));
            }
        }
        return new Parsed(List.copyOf(sections), List.copyOf(items));
    }

    public void validateBaseline(Parsed parsed) {
        Map<UUID, String> kinds = new HashMap<>();
        parsed.sections.forEach(s -> kinds.put(s.id, s.kind));
        if (countSections(parsed, "ROOT") != 1 || countSections(parsed, "MODULE") != 11
                || countSections(parsed, "SESSION") != 76 || countSections(parsed, "MODULE_COMPLETION") != 9
                || countSections(parsed, "FINAL_COMPETENCIES") != 1 || parsed.items.size() != 889
                || parsed.items.stream().filter(Item::isCompleted).count() != 25
                || parsed.items.stream().filter(i -> kinds.get(i.nodeId).equals("SESSION")).count() != 805
                || parsed.items.stream().filter(i -> kinds.get(i.nodeId).equals("MODULE_COMPLETION")).count() != 67
                || parsed.items.stream().filter(i -> kinds.get(i.nodeId).equals("FINAL_COMPETENCIES")).count() != 17)
            throw new IllegalArgumentException("Roadmap counts differ from the approved baseline; no import performed");
    }
    private long countSections(Parsed parsed, String kind) {
        return parsed.sections.stream().filter(s -> s.kind.equals(kind)).count();
    }
}
