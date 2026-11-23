package com.ekrem.devquest.curriculum.api;

import com.ekrem.devquest.curriculum.application.MarkdownExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequiredArgsConstructor
public class MarkdownExportController {
    private final MarkdownExportService service;

    @GetMapping("/api/curriculum/{id}/export")
    public ResponseEntity<byte[]> export(@PathVariable UUID id) {
        byte[] content = service.export(id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/markdown;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"ROADMAP.md\"")
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noStore())
                .contentLength(content.length).body(content);
    }
}
