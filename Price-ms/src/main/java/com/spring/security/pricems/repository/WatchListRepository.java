package com.spring.security.pricems.repository;

import com.spring.security.pricems.dao.dto.model.WatchList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface WatchListRepository extends JpaRepository<WatchList, Long> {
    List<WatchList> findAllByUserEmail(String userEmail);

    boolean existsBySymbolAndUserEmail(String symbol, String userEmail);

    void deleteBySymbolAndUserEmail(String symbol, String userEmail);


    @Query("SELECT DISTINCT w.symbol FROM WatchList w")
    List<String> findDistinctSymbols();

}
