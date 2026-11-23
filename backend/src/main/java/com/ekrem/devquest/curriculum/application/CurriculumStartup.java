package com.ekrem.devquest.curriculum.application;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import java.nio.file.*;

@Component
public class CurriculumStartup implements ApplicationRunner {
    private final CurriculumImporter importer;
    private final Path source;
    public CurriculumStartup(CurriculumImporter importer, @Value("${devquest.curriculum.path:../curriculum/ROADMAP.md}") String path) {
        this.importer = importer;
        this.source = Path.of(path);
    }
    @Override public void run(ApplicationArguments args) throws Exception { importer.importSource(Files.readAllBytes(source)); }
}
