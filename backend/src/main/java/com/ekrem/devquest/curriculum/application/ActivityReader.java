package com.ekrem.devquest.curriculum.application;

import com.ekrem.devquest.curriculum.api.ActivityEntry;
import com.ekrem.devquest.curriculum.domain.ProgressStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ActivityReader {
    private final JdbcTemplate jdbc;

    @Transactional(readOnly = true)
    public List<ActivityEntry> recent() {
        return jdbc.query("""
                SELECT e.id, e.item_id, e.from_status, e.to_status, e.occurred_at,
                       m.label, n.stable_id AS section_id, n.title, n.kind,
                       parent.stable_id AS module_id, parent.title AS module_title
                FROM devquest.progress_event e
                JOIN devquest.source_item_mapping m ON m.item_id = e.item_id
                JOIN devquest.curriculum c ON c.current_revision_id = m.revision_id
                JOIN devquest.curriculum_node n ON n.id = m.node_id
                LEFT JOIN devquest.curriculum_node parent ON parent.id = n.parent_id AND parent.kind = 'MODULE'
                ORDER BY e.occurred_at DESC, e.progress_version DESC, e.id DESC
                LIMIT 12
                """, (rs, row) -> new ActivityEntry(
                rs.getObject("id", UUID.class), rs.getObject("item_id", UUID.class), rs.getString("label"),
                ProgressStatus.valueOf(rs.getString("from_status")), ProgressStatus.valueOf(rs.getString("to_status")),
                rs.getTimestamp("occurred_at").toInstant(), rs.getObject("section_id", UUID.class),
                rs.getString("title"), rs.getString("kind"), rs.getObject("module_id", UUID.class),
                rs.getString("module_title")));
    }
}
