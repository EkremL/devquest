package com.ekrem.devquest.curriculum.application;

import com.ekrem.devquest.curriculum.domain.ProgressStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class MarkdownExportService {
    private final JdbcTemplate jdbc;
    private final MarkdownExportRenderer renderer;

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public byte[] export(UUID curriculumId) {
        var revisions = jdbc.queryForList("SELECT id,sha256,source_markdown FROM devquest.curriculum_revision WHERE curriculum_id=?", curriculumId);
        if (revisions.isEmpty()) throw new CurriculumReader.MissingItemException();
        if (revisions.size() != 1) throw new MarkdownExportRenderer.ExportIntegrityException();
        var revision = revisions.getFirst();
        // Start from every item, not only mappings, so missing mappings/progress fail validation.
        var mappings = jdbc.query("""
                SELECT i.id,i.label,m.source_line,m.occurrence,p.status
                FROM devquest.checklist_item i
                JOIN devquest.curriculum_node n ON n.id=i.node_id
                LEFT JOIN devquest.source_item_mapping m ON m.item_id=i.id AND m.revision_id=n.revision_id
                LEFT JOIN devquest.item_progress p ON p.item_id=i.id
                WHERE n.revision_id=? ORDER BY m.occurrence
                """, (rs, row) -> new MarkdownExportRenderer.Mapping(rs.getObject("id", UUID.class),
                rs.getObject("source_line", Integer.class), rs.getObject("occurrence", Integer.class), rs.getString("label"),
                rs.getString("status") == null ? null : ProgressStatus.valueOf(rs.getString("status"))), revision.get("id"));
        return renderer.render((String) revision.get("source_markdown"), (String) revision.get("sha256"), mappings);
    }
}
