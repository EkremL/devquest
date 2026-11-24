package com.ekrem.devquest.curriculum.application;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import java.nio.file.*;
import org.springframework.jdbc.core.JdbcTemplate;

@Component
public class CurriculumStartup implements ApplicationRunner {
    private final CurriculumImporter importer;
    private final Path source;
    private final JdbcTemplate jdbc;
    public CurriculumStartup(CurriculumImporter importer, JdbcTemplate jdbc, @Value("${devquest.curriculum.path:../curriculum/ROADMAP.md}") String path) {
        this.importer = importer;
        this.jdbc = jdbc;
        this.source = Path.of(path);
    }
    @Override public void run(ApplicationArguments args) throws Exception {
        // Once initialized, PostgreSQL's accepted revision is authoritative. Never reapply the seed file.
        if (jdbc.queryForObject("SELECT count(*) FROM devquest.curriculum", Integer.class) == 0)
            importer.importSource(Files.readAllBytes(source));
    }
}
