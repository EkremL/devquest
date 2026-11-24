package com.ekrem.devquest.curriculum.api;
import com.ekrem.devquest.curriculum.api.ImportDtos.*;
import com.ekrem.devquest.curriculum.application.CurriculumImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequiredArgsConstructor @RequestMapping("/api")
public class CurriculumImportController {
    private final CurriculumImportService service;
    @PostMapping("/curriculum/{id}/import-previews") public Preview preview(@PathVariable UUID id,@Valid @RequestBody Upload upload){return service.preview(id,upload);}
    @GetMapping("/import-previews/{id}") public Preview get(@PathVariable UUID id){return service.get(id);}
    @PostMapping("/import-previews/{id}/apply") public Applied apply(@PathVariable UUID id,@Valid @RequestBody Confirmation confirmation){return service.apply(id,confirmation);}
}
