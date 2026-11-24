package com.ekrem.devquest.curriculum.application;

import com.ekrem.devquest.curriculum.api.ImportDtos.*;
import com.ekrem.devquest.curriculum.application.CurriculumReconciler.Existing;
import com.ekrem.devquest.curriculum.application.RoadmapParser.Parsed;
import lombok.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.nio.*;
import java.nio.charset.*;
import java.security.*;
import java.time.*;
import java.util.*;

@Service @RequiredArgsConstructor
public class CurriculumImportService {
    private final JdbcTemplate jdbc;
    private final RoadmapParser parser;
    private final CurriculumReconciler reconciler;
    private final MarkdownExportService export;
    // Ephemeral, bounded previews are not curriculum writes. Restart/expiry requires previewing again.
    private final Map<UUID,Plan> previews=new LinkedHashMap<>();
    @Getter @AllArgsConstructor
    private static class Plan {
        private final Preview preview;
        private final String source;
        private final Parsed parsed;
        private final Map<UUID,UUID> identities;
        private final Map<String,UUID> stableSections;
        private final String progressFingerprint;
    }
    @Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
    public Preview preview(UUID curriculumId,Upload upload) {
        String source=decode(upload);
        Parsed next;
        try { next=parser.parse(source);parser.validateUpdate(next);reconciler.paths(next); }
        catch(IllegalArgumentException e){throw new ImportProblem("INVALID_SOURCE",e.getMessage(),400);}
        var revision=current(curriculumId);
        export.export(curriculumId); // Verify accepted source/mapping integrity before assigning identities.
        Parsed old=parser.parse((String)revision.get("source_markdown"));
        var stored=states((UUID)revision.get("id"));
        var retired=new HashSet<>(jdbc.queryForList("SELECT DISTINCT i.label FROM devquest.checklist_item i JOIN devquest.curriculum_node n ON n.id=i.node_id JOIN devquest.curriculum_revision r ON r.id=n.revision_id WHERE r.curriculum_id=? AND i.retired_at IS NOT NULL",String.class,curriculumId));
        var comparison=reconciler.compare(old,next,stored,retired);
        Map<String,UUID> stableSections=new HashMap<>();
        var oldPaths=reconciler.paths(old);
        var stable=jdbc.queryForList("SELECT stable_id FROM devquest.curriculum_node WHERE revision_id=? ORDER BY position",UUID.class,revision.get("id"));
        for(int i=0;i<old.getSections().size();i++) stableSections.put(oldPaths.get(old.getSections().get(i).getId()),stable.get(i));
        String checksum=hash(source.getBytes(StandardCharsets.UTF_8));
        boolean identical=checksum.equals(revision.get("sha256"));
        var preview=new Preview(UUID.randomUUID(),curriculumId,(UUID)revision.get("id"),checksum,Instant.now().plusSeconds(600),identical,
                identical || comparison.getChanges().stream().noneMatch(Change::isBlocking),
                (int)next.getSections().stream().filter(s->s.getKind().equals("MODULE")).count(),
                (int)next.getSections().stream().filter(s->s.getKind().equals("SESSION")).count(),next.getItems().size(),identical?List.of():comparison.getChanges());
        synchronized(previews){
            previews.values().removeIf(p->p.preview.getExpiresAt().isBefore(Instant.now()));
            if(previews.size()>=10) previews.remove(previews.keySet().iterator().next());
            previews.put(preview.getId(),new Plan(preview,source,next,comparison.getIdentities(),stableSections,fingerprint(stored)));
        }
        return preview;
    }
    public Preview get(UUID id){return plan(id).preview;}
    private Plan plan(UUID id){synchronized(previews){var plan=previews.get(id);if(plan==null || !plan.preview.getExpiresAt().isAfter(Instant.now())) throw new ImportProblem("PREVIEW_EXPIRED","Preview expired or is no longer available. Select the file and preview it again.",410);return plan;}}

    @Transactional
    public Applied apply(UUID id,Confirmation confirmation) {
        Plan plan=plan(id);Preview preview=plan.preview;
        if(!confirmation.isConfirmed()) throw new ImportProblem("CONFIRMATION_REQUIRED","Explicit confirmation is required.",400);
        if(!preview.getSourceSha256().equals(confirmation.getSourceSha256()) || !hash(plan.source.getBytes(StandardCharsets.UTF_8)).equals(preview.getSourceSha256())) throw new ImportProblem("SOURCE_MISMATCH","The source does not match this preview. Preview the selected file again.",409);
        jdbc.queryForList("SELECT id FROM devquest.curriculum WHERE id=? FOR UPDATE",preview.getCurriculumId());
        var revision=current(preview.getCurriculumId());
        if(!revision.get("id").equals(preview.getBaseRevisionId()) || !fingerprint(states((UUID)revision.get("id"))).equals(plan.progressFingerprint)) throw new ImportProblem("STALE_PREVIEW","The curriculum or progress changed after this preview. Generate a new preview before confirming.",409);
        if(!preview.isCanApply()) throw new ImportProblem("AMBIGUOUS_IMPORT","Unresolved identities block this import. Review the explanations and revise the file.",409);
        if(preview.isIdentical()) return new Applied(preview.getBaseRevisionId(),true);
        UUID newRevision=UUID.randomUUID();
        jdbc.update("INSERT INTO devquest.curriculum_revision(id,curriculum_id,sha256,source_markdown) VALUES (?,?,?,?)",newRevision,preview.getCurriculumId(),preview.getSourceSha256(),plan.source);
        var paths=reconciler.paths(plan.parsed);
        for(var node:plan.parsed.getSections()) jdbc.update("INSERT INTO devquest.curriculum_node(id,revision_id,parent_id,kind,title,position,source_line,stable_id) VALUES (?,?,?,?,?,?,?,?)",node.getId(),newRevision,node.getParentId(),node.getKind(),node.getTitle(),node.getPosition(),node.getSourceLine(),plan.stableSections.getOrDefault(paths.get(node.getId()),UUID.randomUUID()));
        Set<UUID> retained=new HashSet<>();int occurrence=0;
        for(var item:plan.parsed.getItems()) {
            UUID itemId=plan.identities.get(item.getId());
            if(itemId==null) {
                itemId=item.getId();
                jdbc.update("INSERT INTO devquest.checklist_item(id,node_id,label,position,initially_completed) VALUES (?,?,?,?,?)",itemId,item.getNodeId(),item.getLabel(),item.getPosition(),item.isCompleted());
                jdbc.update("INSERT INTO devquest.item_progress(item_id,status) VALUES (?,?)",itemId,item.isCompleted()?"COMPLETED":"NOT_STARTED");
            }
            retained.add(itemId);
            jdbc.update("INSERT INTO devquest.source_item_mapping(item_id,revision_id,occurrence,source_line,node_id,label,position,initially_completed) VALUES (?,?,?,?,?,?,?,?)",itemId,newRevision,occurrence++,item.getSourceLine(),item.getNodeId(),item.getLabel(),item.getPosition(),item.isCompleted());
        }
        for(var old:states(preview.getBaseRevisionId())) if(!retained.contains(old.getId())) jdbc.update("UPDATE devquest.checklist_item SET retired_at=now() WHERE id=?",old.getId());
        jdbc.update("UPDATE devquest.curriculum SET current_revision_id=?,title=? WHERE id=?",newRevision,plan.parsed.getSections().getFirst().getTitle(),preview.getCurriculumId());
        return new Applied(newRevision,false);
    }
    private Map<String,Object> current(UUID id){var rows=jdbc.queryForList("SELECT r.* FROM devquest.curriculum c JOIN devquest.curriculum_revision r ON r.id=c.current_revision_id WHERE c.id=?",id);if(rows.size()!=1)throw new CurriculumReader.MissingItemException();return rows.getFirst();}
    private List<Existing> states(UUID revision){return jdbc.query("SELECT m.item_id,p.status,p.version FROM devquest.source_item_mapping m JOIN devquest.item_progress p ON p.item_id=m.item_id WHERE m.revision_id=? ORDER BY m.occurrence",(rs,row)->new Existing(rs.getObject(1,UUID.class),rs.getString(2),rs.getLong(3)),revision);}
    private String fingerprint(List<Existing> states){StringBuilder data=new StringBuilder();states.forEach(s->data.append(s.getId()).append(':').append(s.getStatus()).append(':').append(s.getVersion()).append(';'));return hash(data.toString().getBytes(StandardCharsets.UTF_8));}
    private String decode(Upload upload){
        if(upload.getFilename()==null || !upload.getFilename().matches("(?i)[^/\\\\:\\p{Cntrl}]{1,150}\\.md")) throw new ImportProblem("INVALID_FILE","Choose a Markdown (.md) filename without directory paths.",400);
        try {
            if(upload.getContentBase64()==null || upload.getContentBase64().length()>699052) throw new ImportProblem("UPLOAD_TOO_LARGE","The Markdown file must be at most 512 KiB.",413);
            byte[] bytes=Base64.getDecoder().decode(upload.getContentBase64());
            if(bytes.length==0 || bytes.length>524288) throw new ImportProblem("UPLOAD_TOO_LARGE","The Markdown file must contain 1–524288 bytes.",413);
            String source=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
            if(source.indexOf('\0')>=0 || source.lines().count()>10000)throw new ImportProblem("INVALID_SOURCE","Source contains a NUL character or more than 10000 lines.",400);
            return source;
        }catch(CharacterCodingException|IllegalArgumentException e){throw new ImportProblem("INVALID_ENCODING","Choose a valid UTF-8 Markdown file.",400);}
    }
    private static String hash(byte[] bytes){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
}
