package com.ekrem.devquest.curriculum.api;

import com.ekrem.devquest.curriculum.domain.ProgressStatus;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.Instant;
import java.util.*;

public final class CurriculumDtos {
    private CurriculumDtos() { }
    @Getter @AllArgsConstructor
    public static class Progress {
        private final UUID itemId;
        private final ProgressStatus status;
        private final long version;
        private final Instant updatedAt;
        private final Instant completedAt;
    }
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateProgress {
        @NotNull private ProgressStatus status;
        @NotNull @PositiveOrZero private Long version;
    }
    @Getter @AllArgsConstructor
    public static class Item {
        private final UUID id;
        private final String label;
        private final int position;
        private final boolean initiallyCompleted;
        private final Progress progress;
    }
    @Getter @AllArgsConstructor
    public static class Stats {
        private final int total;
        private final int completed;
        private final int inProgress;
        private final int needsReview;
        public int getNotStarted() { return total - completed - inProgress - needsReview; }
        public double getPercentage() { return total == 0 ? 0 : Math.round(1000.0 * completed / total) / 10.0; }
        public String getState() {
            if (total > 0 && completed == total) return "COMPLETED";
            if (needsReview > 0) return "NEEDS_REVIEW";
            return completed + inProgress > 0 ? "IN_PROGRESS" : "NOT_STARTED";
        }
        public static Stats of(List<Item> items) {
            return new Stats(items.size(), count(items, ProgressStatus.COMPLETED), count(items, ProgressStatus.IN_PROGRESS), count(items, ProgressStatus.NEEDS_REVIEW));
        }
        private static int count(List<Item> items, ProgressStatus status) { return (int) items.stream().filter(i -> i.progress.status == status).count(); }
    }
    @Getter @AllArgsConstructor
    public static class Statistics {
        private final Stats sessionTopics;
        private final Stats moduleRequirements;
        private final Stats finalCompetencies;
    }
    @Getter @AllArgsConstructor
    public static class Section {
        private final UUID id;
        private final UUID parentId;
        private final String kind;
        private final String title;
        private final int position;
        private final List<Section> children;
        private final List<Item> items;
        public Statistics getStatistics() {
            return new Statistics(Stats.of(collect("SESSION")), Stats.of(collect("MODULE_COMPLETION")), Stats.of(collect("FINAL_COMPETENCIES")));
        }
        private List<Item> collect(String category) {
            List<Item> result = new ArrayList<>();
            if (kind.equals(category)) result.addAll(items);
            children.forEach(c -> result.addAll(c.collect(category)));
            return result;
        }
    }
    @Getter @AllArgsConstructor
    public static class Overview {
        private final UUID curriculumId;
        private final UUID revisionId;
        private final String sourceSha256;
        private final Section root;
    }
    @Getter @AllArgsConstructor
    public static class ApiError {
        private final String code;
        private final String message;
    }
}
