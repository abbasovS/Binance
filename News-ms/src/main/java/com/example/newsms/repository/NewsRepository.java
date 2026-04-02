package com.example.newsms.repository;

import com.example.newsms.model.NewsEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface NewsRepository extends JpaRepository<NewsEntity, Long> {

    boolean existsBySourceUrl(String sourceUrl);

    List<NewsEntity> findByGlobalTrueOrderByCreatedAtDesc(Pageable pageable);

    List<NewsEntity> findByGlobalFalseAndSymbolInOrderByCreatedAtDesc(
            List<String> symbols, Pageable pageable
    );

    List<NewsEntity> findBySymbolInOrderByCreatedAtDesc(List<String> symbols, Pageable pageable);

    List<NewsEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
