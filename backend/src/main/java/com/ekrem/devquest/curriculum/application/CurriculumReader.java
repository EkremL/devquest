package com.ekrem.devquest.curriculum.application;

import com.ekrem.devquest.curriculum.api.CurriculumDtos.*;
import com.ekrem.devquest.curriculum.domain.ProgressStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.*;

@Service @RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class CurriculumReader {
    private final JdbcTemplate jdbc;

    // Three bounded queries; repeatable read makes every aggregate describe the same snapshot.
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Overview overview() {
        Map<UUID, Section> sections = new LinkedHashMap<>();
        jdbc.query("SELECT n.stable_id AS id,p.stable_id AS parent_id,n.kind,n.title,n.position FROM devquest.curriculum_node n JOIN devquest.curriculum c ON c.current_revision_id=n.revision_id LEFT JOIN devquest.curriculum_node p ON p.id=n.parent_id ORDER BY n.position", rs -> {
            UUID id = rs.getObject("id", UUID.class);
            sections.put(id, new Section(id, rs.getObject("parent_id", UUID.class), rs.getString("kind"), rs.getString("title"), rs.getInt("position"), new ArrayList<>(), new ArrayList<>()));
        });
        if (sections.isEmpty()) throw new MissingItemException();
        jdbc.query("SELECT m.item_id AS id,n.stable_id AS node_id,m.label,m.position,m.initially_completed,p.status,p.version,p.updated_at,p.completed_at FROM devquest.source_item_mapping m JOIN devquest.curriculum c ON c.current_revision_id=m.revision_id JOIN devquest.curriculum_node n ON n.id=m.node_id JOIN devquest.item_progress p ON p.item_id=m.item_id ORDER BY m.occurrence", rs -> {
            UUID id = rs.getObject("id", UUID.class);
            var completed = rs.getTimestamp("completed_at");
            sections.get(rs.getObject("node_id", UUID.class)).getItems().add(new Item(id, rs.getString("label"), rs.getInt("position"), rs.getBoolean("initially_completed"),
                    new Progress(id, ProgressStatus.valueOf(rs.getString("status")), rs.getLong("version"), rs.getTimestamp("updated_at").toInstant(), completed == null ? null : completed.toInstant())));
        });
        sections.values().stream().filter(s -> s.getParentId() != null).forEach(s -> sections.get(s.getParentId()).getChildren().add(s));
        return jdbc.queryForObject("SELECT r.curriculum_id,r.id,r.sha256 FROM devquest.curriculum_revision r JOIN devquest.curriculum c ON c.current_revision_id=r.id", (rs, row) ->
                new Overview(rs.getObject("curriculum_id", UUID.class), rs.getObject("id", UUID.class), rs.getString("sha256"), sections.values().iterator().next()));
    }
    public Section find(UUID id, String kind) {
        return flatten(overview().getRoot()).stream().filter(s -> s.getId().equals(id) && s.getKind().equals(kind)).findFirst().orElseThrow(MissingItemException::new);
    }
    public List<Section> sections(String kind) { return flatten(overview().getRoot()).stream().filter(s -> s.getKind().equals(kind)).toList(); }
    private List<Section> flatten(Section section) {
        List<Section> result = new ArrayList<>(); result.add(section);
        section.getChildren().forEach(child -> result.addAll(flatten(child))); return result;
    }
    public static class MissingItemException extends RuntimeException { }
}
