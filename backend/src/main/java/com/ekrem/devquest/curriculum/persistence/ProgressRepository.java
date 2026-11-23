package com.ekrem.devquest.curriculum.persistence;

import com.ekrem.devquest.curriculum.domain.ItemProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ProgressRepository extends JpaRepository<ItemProgress, UUID> { }
