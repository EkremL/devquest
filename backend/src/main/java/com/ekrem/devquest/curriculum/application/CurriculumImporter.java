package com.ekrem.devquest.curriculum.application;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class CurriculumImporter {
    private final RoadmapParser parser;
    private final JdbcTemplate jdbc;

    @Transactional
    public boolean importSource(byte[] bytes) {
        // Serialize initial imports across app processes; lock is released with the transaction.
        jdbc.execute("SELECT pg_advisory_xact_lock(731904821)");
        String hash;
        try { hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
        var existing = jdbc.queryForList("SELECT sha256 FROM devquest.curriculum_revision", String.class);
        if (!existing.isEmpty()) {
            if (existing.size() == 1 && existing.getFirst().equals(hash)) return false;
            throw new IllegalStateException("Roadmap source has changed. Existing progress is preserved. Reconciliation is not supported in M1.");
        }
        String markdown = new String(bytes, StandardCharsets.UTF_8);
        var parsed = parser.parse(markdown);
        parser.validateBaseline(parsed);
        UUID curriculum = UUID.randomUUID(), revision = UUID.randomUUID();
        jdbc.update("INSERT INTO devquest.curriculum(id,source_key,title) VALUES (?,?,?)", curriculum, "spring-security-roadmap", parsed.getSections().getFirst().getTitle());
        jdbc.update("INSERT INTO devquest.curriculum_revision(id,curriculum_id,sha256,source_markdown) VALUES (?,?,?,?)", revision, curriculum, hash, markdown);
        for (var node : parsed.getSections()) {
            jdbc.update("INSERT INTO devquest.curriculum_node(id,revision_id,parent_id,kind,title,position,source_line) VALUES (?,?,?,?,?,?,?)",
                    node.getId(), revision, node.getParentId(), node.getKind(), node.getTitle(), node.getPosition(), node.getSourceLine());
        }
        List<Object[]> items = new ArrayList<>(), mappings = new ArrayList<>(), progress = new ArrayList<>();
        for (var item : parsed.getItems()) {
            items.add(new Object[]{item.getId(), item.getNodeId(), item.getLabel(), item.getPosition(), item.isCompleted()});
            mappings.add(new Object[]{item.getId(), revision, mappings.size(), item.getSourceLine()});
            progress.add(new Object[]{item.getId(), item.isCompleted() ? "COMPLETED" : "NOT_STARTED"});
        }
        jdbc.batchUpdate("INSERT INTO devquest.checklist_item(id,node_id,label,position,initially_completed) VALUES (?,?,?,?,?)", items);
        jdbc.batchUpdate("INSERT INTO devquest.source_item_mapping(item_id,revision_id,occurrence,source_line) VALUES (?,?,?,?)", mappings);
        jdbc.batchUpdate("INSERT INTO devquest.item_progress(item_id,status) VALUES (?,?)", progress);
        return true;
    }
}
