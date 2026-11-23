package com.ekrem.devquest.curriculum.application;

import com.ekrem.devquest.curriculum.api.CurriculumDtos.*;
import com.ekrem.devquest.curriculum.persistence.ProgressRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ProgressService {
    private final ProgressRepository repository;
    private final JdbcTemplate jdbc;

    @Transactional
    public Progress update(UUID id, UpdateProgress request) {
        var progress = repository.findById(id).orElseThrow(CurriculumReader.MissingItemException::new);
        if (request.getVersion() != progress.getVersion()) throw new StaleProgressException();
        if (request.getStatus() != progress.getStatus()) {
            var previous = progress.getStatus();
            Instant now = Instant.now();
            progress.changeTo(request.getStatus(), now);
            repository.flush(); // @Version atomically rejects races before recording the event.
            jdbc.update("INSERT INTO devquest.progress_event(id,item_id,from_status,to_status,progress_version,occurred_at) VALUES (?,?,?,?,?,?)",
                    UUID.randomUUID(), id, previous.name(), progress.getStatus().name(), progress.getVersion(), java.sql.Timestamp.from(now));
        }
        return new Progress(id, progress.getStatus(), progress.getVersion(), progress.getUpdatedAt(), progress.getCompletedAt());
    }
    public static class StaleProgressException extends RuntimeException { }
}
