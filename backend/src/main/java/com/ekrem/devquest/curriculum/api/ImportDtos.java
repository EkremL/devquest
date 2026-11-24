package com.ekrem.devquest.curriculum.api;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.Instant;
import java.util.*;

public final class ImportDtos {
    private ImportDtos() { }
    @Getter @Setter @NoArgsConstructor
    public static class Upload {
        @NotBlank @Size(max=160) private String filename;
        @NotBlank @Size(max=699052) private String contentBase64;
    }
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class Confirmation {
        @AssertTrue private boolean confirmed;
        @NotBlank private String sourceSha256;
    }
    @Getter @AllArgsConstructor
    public static class Change {
        private final String type;
        private final String label;
        private final String fromSection;
        private final String toSection;
        private final String confidence;
        private final String explanation;
        private final boolean blocking;
    }
    @Getter @AllArgsConstructor
    public static class Preview {
        private final UUID id;
        private final UUID curriculumId;
        private final UUID baseRevisionId;
        private final String sourceSha256;
        private final Instant expiresAt;
        private final boolean identical;
        private final boolean canApply;
        private final int modules;
        private final int sessions;
        private final int items;
        private final List<Change> changes;
    }
    @Getter @AllArgsConstructor
    public static class Applied {
        private final UUID revisionId;
        private final boolean unchanged;
    }
}
