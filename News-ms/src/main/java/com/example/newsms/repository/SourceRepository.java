package com.example.newsms.repository;

import com.example.newsms.model.SourceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SourceRepository extends JpaRepository<SourceEntity, Long> {
}
