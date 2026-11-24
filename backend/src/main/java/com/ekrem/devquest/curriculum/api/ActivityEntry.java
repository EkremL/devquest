package com.ekrem.devquest.curriculum.api;

import com.ekrem.devquest.curriculum.domain.ProgressStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.Instant;
import java.util.UUID;

@Getter @AllArgsConstructor
public class ActivityEntry {
    private final UUID id;
    private final UUID itemId;
    private final String topic;
    private final ProgressStatus fromStatus;
    private final ProgressStatus toStatus;
    private final Instant occurredAt;
    private final UUID sectionId;
    private final String sectionTitle;
    private final String sectionKind;
    private final UUID moduleId;
    private final String moduleTitle;
}
