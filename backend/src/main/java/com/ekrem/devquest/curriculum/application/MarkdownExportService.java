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
        var revisions = jdbc.queryForList("SELECT r.id,r.sha256,r.source_markdown FROM devquest.curriculum_revision r JOIN devquest.curriculum c ON c.current_revision_id=r.id WHERE c.id=?", curriculumId);
        if (revisions.isEmpty()) throw new CurriculumReader.MissingItemException();
        if (revisions.size() != 1) throw new MarkdownExportRenderer.ExportIntegrityException();
        var revision = revisions.getFirst();
        // Start from every item, not only mappings, so missing mappings/progress fail validation.
        var mappings = jdbc.query("""
                SELECT m.item_id AS id,m.label,m.source_line,m.occurrence,p.status
                FROM devquest.source_item_mapping m
                LEFT JOIN devquest.item_progress p ON p.item_id=m.item_id
                WHERE m.revision_id=? ORDER BY m.occurrence
                """, (rs, row) -> new MarkdownExportRenderer.Mapping(rs.getObject("id", UUID.class),
                rs.getObject("source_line", Integer.class), rs.getObject("occurrence", Integer.class), rs.getString("label"),
                rs.getString("status") == null ? null : ProgressStatus.valueOf(rs.getString("status"))), revision.get("id"));
        return renderer.render((String) revision.get("source_markdown"), (String) revision.get("sha256"), mappings);
    }
}
