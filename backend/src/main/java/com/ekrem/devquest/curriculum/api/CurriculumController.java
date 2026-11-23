package com.ekrem.devquest.curriculum.api;

import com.ekrem.devquest.curriculum.api.CurriculumDtos.*;
import com.ekrem.devquest.curriculum.application.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class CurriculumController {
    private final CurriculumReader reader;
    private final ProgressService progress;
    @GetMapping("/curriculum") public Overview overview() { return reader.overview(); }
    @GetMapping("/curriculum/statistics") public Statistics statistics() { return reader.overview().getRoot().getStatistics(); }
    @GetMapping("/modules") public List<Section> modules() { return reader.sections("MODULE"); }
    @GetMapping("/modules/{id}") public Section module(@PathVariable UUID id) { return reader.find(id, "MODULE"); }
    @GetMapping("/modules/{id}/requirements") public List<Item> requirements(@PathVariable UUID id) {
        return module(id).getChildren().stream().filter(s -> s.getKind().equals("MODULE_COMPLETION")).flatMap(s -> s.getItems().stream()).toList();
    }
    @GetMapping("/sessions") public List<Section> sessions() { return reader.sections("SESSION"); }
    @GetMapping("/sessions/{id}") public Section session(@PathVariable UUID id) { return reader.find(id, "SESSION"); }
    @GetMapping("/sessions/{id}/topics") public List<Item> topics(@PathVariable UUID id) { return session(id).getItems(); }
    @GetMapping("/final-competencies") public Section finalCompetencies() { return reader.sections("FINAL_COMPETENCIES").getFirst(); }
    @PatchMapping("/items/{id}/progress") public Progress update(@PathVariable UUID id, @Valid @RequestBody UpdateProgress request) { return progress.update(id, request); }
}
