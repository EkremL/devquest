package com.ekrem.devquest.curriculum;

import com.ekrem.devquest.curriculum.api.ImportDtos.*;
import com.ekrem.devquest.curriculum.api.CurriculumDtos.UpdateProgress;
import com.ekrem.devquest.curriculum.application.*;
import com.ekrem.devquest.curriculum.domain.ProgressStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.nio.charset.StandardCharsets;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.datasource.url=jdbc:postgresql://127.0.0.1:${DEVQUEST_DB_PORT:5432}/devquest_test_db",
    "spring.datasource.username=${DEVQUEST_TEST_DB_USERNAME:devquest_test}","spring.datasource.password=${DEVQUEST_TEST_DB_PASSWORD}"
})
class CurriculumImportIT {
    @Autowired CurriculumImportService imports;
    @Autowired CurriculumReader reader;
    @Autowired MarkdownExportService export;
    @Autowired ProgressService progress;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager transactions;
    @LocalServerPort int port;
    UUID curriculum(){return reader.overview().getCurriculumId();}
    String source(){return jdbc.queryForObject("SELECT r.source_markdown FROM devquest.curriculum c JOIN devquest.curriculum_revision r ON r.id=c.current_revision_id WHERE c.id=?",String.class,curriculum());}
    Upload upload(String source){var request=new Upload();request.setFilename("ROADMAP.md");request.setContentBase64(Base64.getEncoder().encodeToString(source.getBytes(StandardCharsets.UTF_8)));return request;}
    Preview preview(String source){return imports.preview(curriculum(),upload(source));}
    Applied apply(Preview preview){return imports.apply(preview.getId(),new Confirmation(true,preview.getSourceSha256()));}
    String addition(String source){return source.replace("- [x] Create the GitHub repository", "- [x] Create the GitHub repository\n- [x] New import verification topic");}
    UUID item(String label){return jdbc.queryForObject("SELECT id FROM devquest.checklist_item WHERE label=?",UUID.class,label);}
    void set(UUID id,ProgressStatus state){progress.update(id,new UpdateProgress(state,jdbc.queryForObject("SELECT version FROM devquest.item_progress WHERE item_id=?",Long.class,id)));}
    List<Map<String,Object>> progressRows(){return jdbc.queryForList("SELECT * FROM devquest.item_progress ORDER BY item_id");}
    List<Map<String,Object>> events(){return jdbc.queryForList("SELECT * FROM devquest.progress_event ORDER BY id");}
    List<String> snapshot(){List<String> result=new ArrayList<>();for(String table:List.of("curriculum","curriculum_revision","curriculum_node","checklist_item","source_item_mapping","item_progress","progress_event"))result.add(jdbc.queryForObject("SELECT coalesce(jsonb_agg(row ORDER BY row::text),'[]'::jsonb)::text FROM (SELECT to_jsonb(t) row FROM devquest."+table+" t) q",String.class));return result;}

    @Test @Transactional void identicalImportAndPreviewDoNotMutateAnything(){var before=snapshot();var p=preview(source());assertThat(p.isIdentical()).isTrue();assertThat(imports.get(p.getId()).getSourceSha256()).isEqualTo(p.getSourceSha256());assertThat(apply(p).isUnchanged()).isTrue();assertThat(apply(p).isUnchanged()).isTrue();assertThat(snapshot()).isEqualTo(before);}
    @Test @Transactional void additionPreservesAllExistingStatesEventsAndExport(){
        set(item("Confirm Java 25"),ProgressStatus.IN_PROGRESS);set(item("Confirm Maven"),ProgressStatus.NEEDS_REVIEW);
        set(item("Configure PostgreSQL"),ProgressStatus.COMPLETED);
        var previous=progressRows();var events=events();String changed=addition(source()).replace("- [x] Confirm Spring Boot 4.x","- [ ] Confirm Spring Boot 4.x");
        var before=snapshot();var p=preview(changed);assertThat(snapshot()).isEqualTo(before);assertThat(p.isCanApply()).isTrue();assertThat(p.getItems()).isEqualTo(890);
        assertThat(p.getChanges()).extracting(Change::getType).contains("ADDED","MARKER_CHANGED","PROGRESS_CONFLICT");
        UUID oldRevision=p.getBaseRevisionId();var stableSessions=reader.sections("SESSION").stream().map(s->s.getId()).toList();
        var result=apply(p);assertThat(result.getRevisionId()).isNotEqualTo(oldRevision);
        assertThat(progressRows()).containsAll(previous);assertThat(events()).isEqualTo(events);
        UUID added=item("New import verification topic");assertThat(jdbc.queryForObject("SELECT completed_at IS NULL FROM devquest.item_progress WHERE item_id=?",Boolean.class,added)).isTrue();
        assertThat(jdbc.queryForObject("SELECT source_markdown FROM devquest.curriculum_revision WHERE id=?",String.class,result.getRevisionId())).isEqualTo(changed);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM devquest.source_item_mapping WHERE revision_id=?",Integer.class,oldRevision)).isEqualTo(889);
        assertThat(reader.sections("SESSION").stream().map(s->s.getId()).toList()).isEqualTo(stableSessions);
        String exported=new String(export.export(curriculum()),StandardCharsets.UTF_8);
        assertThat(exported).contains("- [x] New import verification topic","- [ ] Confirm Java 25","- [ ] Confirm Maven","- [x] Confirm Spring Boot 4.x","- [x] Configure PostgreSQL");
        assertThat(exported.replaceAll("(?m)^- \\[[ xX]]","- [?]")).isEqualTo(changed.replaceAll("(?m)^- \\[[ xX]]","- [?]"));
        var after=snapshot();assertThat(apply(preview(changed)).isUnchanged()).isTrue();assertThat(snapshot()).isEqualTo(after);
    }
    @Test @Transactional void reordersItemsAndSectionsWithoutChangingIdentities(){
        String source=source();UUID id=item("Confirm Java 25");var before=progressRows();
        String changed=source.replace("- [x] Confirm Java 25\n- [x] Confirm Spring Boot 4.x","- [x] Confirm Spring Boot 4.x\n- [x] Confirm Java 25");
        int first=changed.indexOf("## Session 0.1"),second=changed.indexOf("## Session 0.2"),third=changed.indexOf("## Session 0.3");
        changed=changed.substring(0,first)+changed.substring(second,third)+changed.substring(first,second)+changed.substring(third);
        var p=preview(changed);assertThat(p.isCanApply()).isTrue();assertThat(p.getChanges()).extracting(Change::getType).contains("REORDERED","SECTIONS_CHANGED");apply(p);
        assertThat(item("Confirm Java 25")).isEqualTo(id);assertThat(progressRows()).isEqualTo(before);
    }
    @Test @Transactional void confidentMoveKeepsProgressAndHistory(){
        UUID id=item("Confirm Java 25");set(id,ProgressStatus.NEEDS_REVIEW);var before=progressRows();var events=events();
        String changed=source().replace("- [x] Confirm Java 25\n","").replace("## Session 0.3 — Project Baseline\n","## Session 0.3 — Project Baseline\n\n- [x] Confirm Java 25\n");
        var p=preview(changed);assertThat(p.isCanApply()).isTrue();assertThat(p.getChanges()).extracting(Change::getType).contains("MOVED");apply(p);
        assertThat(progressRows()).isEqualTo(before);assertThat(events()).isEqualTo(events);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM devquest.source_item_mapping WHERE item_id=?",Integer.class,id)).isEqualTo(2);
    }
    @Test @Transactional void duplicatesRemainIndependentAndAmbiguousEditsAreBlocked(){
        var original=jdbc.queryForList("SELECT id FROM devquest.checklist_item WHERE label='Key rotation' ORDER BY id",UUID.class);
        String withDuplicates=source().replace("- [x] Create the GitHub repository","- [x] Create the GitHub repository\n- [ ] Repeated verification topic\n- [ ] Repeated verification topic");
        apply(preview(withDuplicates));
        assertThat(jdbc.queryForList("SELECT id FROM devquest.checklist_item WHERE label='Key rotation' ORDER BY id",UUID.class)).isEqualTo(original);
        assertThat(jdbc.queryForList("SELECT id FROM devquest.checklist_item WHERE label='Repeated verification topic'",UUID.class)).hasSize(2).doesNotHaveDuplicates();
        String ambiguous=withDuplicates.replaceFirst("- \\[ ] Repeated verification topic","- [ ] Repeated verification topic\n- [ ] Repeated verification topic");
        var before=snapshot();var p=preview(ambiguous);assertThat(p.isCanApply()).isFalse();assertThat(p.getChanges()).anyMatch(c->c.isBlocking()&&c.getType().equals("AMBIGUOUS"));
        assertThatThrownBy(()->apply(p)).isInstanceOf(ImportProblem.class);assertThat(snapshot()).isEqualTo(before);
    }
    @Test @Transactional void renameIsReportedAndNeverSilentlyReplacesIdentity(){var before=snapshot();var p=preview(source().replace("Confirm Java 25","Understand Java 25"));assertThat(p.isCanApply()).isFalse();assertThat(p.getChanges()).extracting(Change::getType).contains("RENAMED_OR_MODIFIED");assertThatThrownBy(()->apply(p)).isInstanceOf(ImportProblem.class);assertThat(snapshot()).isEqualTo(before);}
    @Test @Transactional void removedItemIsRetiredWithItsEventsAndCannotBeUpdated(){
        UUID id=item("Confirm Java 25");set(id,ProgressStatus.IN_PROGRESS);var before=progressRows();var events=events();String original=source();
        apply(preview(original.replace("- [x] Confirm Java 25\n","")));
        assertThat(progressRows()).isEqualTo(before);assertThat(events()).isEqualTo(events);
        assertThat(jdbc.queryForObject("SELECT retired_at IS NOT NULL FROM devquest.checklist_item WHERE id=?",Boolean.class,id)).isTrue();
        assertThat(new String(export.export(curriculum()),StandardCharsets.UTF_8)).doesNotContain("Confirm Java 25");
        assertThatThrownBy(()->set(id,ProgressStatus.COMPLETED)).isInstanceOf(CurriculumReader.MissingItemException.class);
        assertThat(preview(original).isCanApply()).isFalse();
    }
    @Test @Transactional void progressAndRevisionChangesInvalidatePreviews(){
        var p=preview(addition(source()));set(item("Confirm Java 25"),ProgressStatus.IN_PROGRESS);
        assertThatThrownBy(()->apply(p)).isInstanceOf(ImportProblem.class).hasMessageContaining("changed after");
        var first=preview(addition(source()));var second=preview(addition(source()));apply(first);
        assertThatThrownBy(()->apply(second)).isInstanceOf(ImportProblem.class).hasMessageContaining("changed after");
    }
    @Test @Transactional void fileMismatchAndUnconfirmedRequestsCannotApply(){var p=preview(addition(source()));var before=snapshot();assertThatThrownBy(()->imports.apply(p.getId(),new Confirmation(false,p.getSourceSha256()))).isInstanceOf(ImportProblem.class);assertThatThrownBy(()->imports.apply(p.getId(),new Confirmation(true,"bad"))).isInstanceOf(ImportProblem.class);assertThat(snapshot()).isEqualTo(before);}
    @Test void invalidSourcesAreRejectedWithoutWrites(){var before=snapshot();for(String bad:List.of("# Not a full roadmap\n",source()+"\n<script>alert(1)</script>",source()+"\n## Unknown heading\n")){assertThatThrownBy(()->preview(bad)).isInstanceOf(ImportProblem.class);}var bad=upload(source());bad.setFilename("../ROADMAP.md");assertThatThrownBy(()->imports.preview(curriculum(),bad)).isInstanceOf(ImportProblem.class);bad.setFilename("ROADMAP.md");bad.setContentBase64(Base64.getEncoder().encodeToString(new byte[]{(byte)0xC3,0x28}));assertThatThrownBy(()->imports.preview(curriculum(),bad)).isInstanceOf(ImportProblem.class);assertThat(snapshot()).isEqualTo(before);}
    @Test void failureAfterWritesRollsBackEntireImport(){var p=preview(addition(source()));var before=snapshot();var tx=new TransactionTemplate(transactions);assertThatThrownBy(()->tx.executeWithoutResult(status->{apply(p);throw new IllegalStateException("Injected failure after import writes");})).isInstanceOf(IllegalStateException.class);assertThat(snapshot()).isEqualTo(before);}
    @Test void oversizedHttpBodiesAreRejectedBeforeParsing() throws Exception {
        try(var client=HttpClient.newHttpClient()) {
            var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/curriculum/"+curriculum()+"/import-previews")).header("Content-Type","application/json").header("X-DevQuest-Request","1").POST(HttpRequest.BodyPublishers.ofString("x".repeat(750001))).build();
            assertThat(client.send(request,HttpResponse.BodyHandlers.ofString()).statusCode()).isEqualTo(413);
        }
    }
}
