package com.ekrem.devquest.curriculum.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "item_progress", schema = "devquest")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ItemProgress {
    @Id private UUID itemId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private ProgressStatus status;
    @Version private long version;
    @Column(nullable = false) private Instant updatedAt;
    private Instant completedAt;

    public void changeTo(ProgressStatus target, Instant now) {
        status = target;
        updatedAt = now;
        completedAt = target == ProgressStatus.COMPLETED ? now : null;
    }
}
