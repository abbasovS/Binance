package com.spring.security.pricems.service;

import com.spring.security.pricems.dao.dto.model.WatchList;
import com.spring.security.pricems.exception.AlreadyExistsException;
import com.spring.security.pricems.exception.SymbolNotFoundException;
import com.spring.security.pricems.repository.WatchListRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WatchListService {

    private final WatchListRepository watchListRepository;
    private final BinanceService binanceService;

    @Transactional
    public void addWatchListSymbol(String symbol, String userEmail) {
        String sym = symbol.trim().toUpperCase();

        if (watchListRepository.existsBySymbolAndUserEmail(sym, userEmail)) {
            throw new AlreadyExistsException(sym + " already exists for this user");
        }

        if (!binanceService.isValidSymbol(sym)) {
            throw new SymbolNotFoundException(sym + " not found");
        }

        WatchList wl = new WatchList();
        wl.setSymbol(sym);
        wl.setUserEmail(userEmail);

        watchListRepository.save(wl);
        log.info("Added watchlist symbol {} for user {}", sym, userEmail);
    }

    public List<WatchList> getAllWatchlist(String userEmail) {
        return watchListRepository.findAllByUserEmail(userEmail);
    }

    @Transactional
    public void deleteWatchListSymbol(String symbol, String userEmail) {
        String sym = symbol.trim().toUpperCase();

        if (!watchListRepository.existsBySymbolAndUserEmail(sym, userEmail)) {
            throw new SymbolNotFoundException(sym + " not found for this user");
        }

        watchListRepository.deleteBySymbolAndUserEmail(sym, userEmail);
        log.info("Deleted watchlist symbol {} for user {}", sym, userEmail);
    }
}